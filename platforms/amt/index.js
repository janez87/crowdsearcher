// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var fs = require('fs');
var nconf = require('nconf');
var AMT = require('amt');

// Import Models
//var Performer = common.models.user;
//var Execution = common.models.execution;
var Microtask = common.models.microtask;

// Create a child logger
var log = common.log.child( { component: 'AMT' } );

function execute( task, microtask, execution, platform, callback ) {
  log.trace( 'Executing the microtask %s', microtask.id );

  // TODO fix with param url
  var url = 'https://workersandbox.mturk.com/mturk/preview?groupId=';

  //Retrieving the hit type id for building the url
  var hitTypeMetadata = task.getMetadata('hitType');

  log.trace('Redirecting the performer to %s',url+hitTypeMetadata);

  return  callback(null,url+hitTypeMetadata);
}

/*
var createAnnotation = function(execution,annotations,operation,callback){

  log.trace('Creating the annotations for the operation %s',operation.label);
  var opImplementation = GLOBAL.common.operations[ operation.name ];

  var opAnnotations = _.filter(annotations,function(annotation){
    return operation._id == annotation.operation._id;
  });

  log.trace('Found %s answers for the operation %s',opAnnotations.length,operation.label);
  opImplementation.create(opAnnotations,operation,function(err,annotations){
    _.each(annotations,function(annotation){
      execution.annotations.push(annotation);
    });

    return callback();
  });

};
*/


function createResponse( task, microstask, assignment, callback ) {
  var accept = assignment.AcceptTime;
  var submit = assignment.SubmitTime;
  var answer = assignment.answer;
  log.trace( 'Data: ', assignment );

  return callback();
}
function remote( req, res ) {
  var task = req.task;
  log.trace( 'Task(%s): %s', task._id, task.name );

  var eventType = req.query[ 'Event.1.EventType' ];
  var hitTypeId = req.query[ 'Event.1.HITTypeId' ];
  var hitId = req.query[ 'Event.1.HITId' ];
  var assignmentId = req.query[ 'Event.1.AssignmentId' ];

  // Check for consistency
  var taskHitTypeId = task.getMetadata( 'hitType' );
  if( taskHitTypeId!==hitTypeId ) {
    log.error( 'HitTypeId mismatch (task!=notification): %s!=%s', taskHitTypeId, hitTypeId );
    return res.send( 'HITTYPE_MISMATCH' );
  }

  // Search for the microtask
  Microtask
  .findOne()
  .where( 'task', task._id )
  .elemMatch( 'metadata', {
    key: 'hit',
    value: hitId
  } )
  .populate( 'platforms operations' )
  .exec( req.wrap( function ( err, microtask ) {
    if( err ) {
      log.error( err );
      return res.send( 'QUERY_ERROR' );
    }

    if( !microtask ) {
      log.warn( 'No microtask selected' );
      return res.send( 'NO_MICROTASK' );
    }

    var platform = _.findWhere( microtask.platforms, { name: 'amt' } );
    if( !platform ) {
      log.warn( 'No AMT platform present' );
      return res.send( 'NO_PLATFORM' );
    }

    var platformParameters = platform.params;
    // Init the AMT wrapper
    var amt = new AMT( {
      key: platformParameters.accessKeyId,
      secret: platformParameters.secretAccessKey,
    } );
    var Assignment = amt.Assignment;

    // Retrieve the assignement
    Assignment.get( assignmentId, function ( err, assignment ) {
      if( err ) {
        log.error( err );
        return res.send( 'BAD_ASSIGNMENT' );
      }

      return createResponse( task, microtask, assignment, function ( err ) {
        if( err ) {
          log.error( err );
          return res.send( 'NO_RESPONSE' );
        }
        return res.send( 'OK' );
      } );

    } );
  } ) );
}

function create( task, microtask, platform, callback ){
  log.trace( 'Creating the task inteface using AMT' );

  // Creating a domain for the mongoose queries
  var d = domain.create();
  d.on( 'error', callback );

  var params = platform.params;

  var amt = new AMT( {
    key: params.accessKeyId,
    secret: params.secretAccessKey,
  } );

  var HITType = amt.HITType;
  var HIT = amt.HIT;
  var Reward = amt.Reward;
  var Notification = amt.Notification;

  var hitTypeId = task.getMetadata( 'hitType' );

  function createHitType( cb ) {
    log.trace( 'Creating HitType' );
    var reward = new Reward( params.price );
    var duration = params.duration;

    var hitType = new HITType( {
      title: task.name,
      description: params.description || task.description,
      reward: reward,
      duration: duration
    } );

    return hitType.create( cb );
  }
  function addNotification( hitType, cb ) {
    log.trace( 'Setting notification to hitType' );

    var destination = nconf.get( 'webserver:externalAddress' );
    destination += 'api/'+task._id+'/notification/amt';
    log.trace( 'Destination is: %s', destination );

    var notification = new Notification( {
      destination: destination,
      transport: 'REST',
      events: [ 'AssignmentSubmitted' ]
    } );
    return hitType.setNotification( notification, function ( err ) {
      return cb( err, hitType.id );
    } );
  }
  function getQuestion( hitTypeIdPassed, cb ) {
    if( !_.isFunction( cb ) ) {
      cb = hitTypeIdPassed;
      hitTypeIdPassed = hitTypeId;
    }

    // TODO: change to something more async.. and controlled..
    var question = fs.readFileSync( __dirname+'/'+params.questionFile, 'utf8' );

    return cb( null, hitTypeIdPassed, question );
  }
  function createHit( hitTypeId, question, cb ) {
    var hit = new HIT( {
      hitTypeId: hitTypeId,
      question: question,
      life: params.lifeTimeInSeconds
    } );

    return hit.create( cb );
  }
  function saveTask( hitTypeId, cb ) {
    log.trace( 'Saving hitTypeId metadata' );

    task.setMetadata( 'hitType', hitTypeId );
    return d.bind( task.save.bind( task ) )( function ( err ) {
      if( err ) return cb( err );

      return cb( null, hitTypeId );
    } );
  }
  function saveMicroTask( hit, hitTypeId, cb ) {
    log.trace( 'Saving hit metadata' );

    microtask.setMetadata( 'hit', hit.id );
    return d.bind( microtask.save.bind( microtask ) )( cb );
  }


  var actions = [
    getQuestion,
    createHit,
    saveMicroTask
  ];
  if( _.isUndefined( hitTypeId ) ){
    log.trace( 'HitType not found, creating one' );
    actions.unshift( createHitType, addNotification, saveTask );
  }

  async.waterfall( actions, function( err ) {
    if( err ) return callback( err );

    log.trace( 'HIT created');
    return callback();
  } );
}


var Platform = {
  invite: undefined,
  remote: remote,
  /*
  timed: {
    expression: '* * * * *',
    onTick: retrieve
  },
  */
  execute: execute,
  init: create,
  params : {
    questionFile:{
      type:'string',
      'default':'position.xml'
    },
    url: {
      type:'enum',
      values: {
        'Mturk sandbox': 'https://mechanicalturk.sandbox.amazonaws.com',
        'Mturk': 'https://mechanicalturk.amazonaws.com'
      },
      'default': 'Mturk sandbox'
    },
    accessKeyId:{
      type:'pass',
      'default':''
    },
    secretAccessKey:{
      type:'pass',
      'default':''
    },
    price:{
      type:'number',
      'default':0.01
    },
    duration:{
      type:'number',
      'default': 60
    },
    keywords:{
      type:['string']
    },
    description:{
      type:'string'
    },
    maxAssignments:{
      type:'number'
    },
    lifeTimeInSeconds:{
      type:'number',
      'default':3600*24*5
    }
  }
};




module.exports = exports = Platform;