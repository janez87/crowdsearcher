// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var fs = require('fs');
var nconf = require('nconf');
var AMT = require('amt');

// Import Models
//var Performer = common.models.user;
var Execution = common.models.execution;
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

function createAnnotation( data, callback ) {
  var answerData = data[ 0 ];
  var operation = data[ 1 ];

  var opImplementation = common.operations[ operation.name ];
  if( opImplementation ) {
    return opImplementation.create( [answerData], operation, callback );
  } else {
    log.warn( 'Operation %s implementation not found', operation.name );
    return callback();
  }
}

function createExecution( task, microtask, platform, assignment, callback ) {
  var accept = assignment.AcceptTime;
  var submit = assignment.SubmitTime;
  var worker = assignment.WorkerId;


  var operations = microtask.operations;

  var rawExecution = {
    task: task,
    microtask: microtask,
    job: task.job,
    //performer: amtPerformer, // TODO fix
    operations: _.clone( operations ),
    platform: platform,
    creationDate: accept
  };

  var execution = new Execution( rawExecution );

  // Parse each answer
  var amtAnswers = assignment.answer.QuestionFormAnswers.Answer;
  var dataList = [];

  if( !_.isArray( amtAnswers ) )
    amtAnswers = [ amtAnswers ];

  for (var i=amtAnswers.length-1; i>=0; i-- ) {
    var answer = amtAnswers[i];
    // Get the objectId and operationId identifiers
    var identifiers = answer.QuestionIdentifier.split( '_' );
    var objectId = identifiers[0];
    var operationId = identifiers[1];

    var operation = _.find( operations, function ( op ) {
      return op._id.equals( operationId );
    } );

    if( !operation ) {
      log.warn( 'Invalid operation ID (%s) skipping...', operationId );
      continue;
    }

    // Creating the data for the operation
    var answerData = {
      date: submit,
      objectId: objectId,
      operation: operationId
    };

    // retrieve the value based on the operation type
    if( operation.name==='classify' || operation.name==='fuzzyclassify' ) {
      var category = answer.SelectionIdentifier;
      answerData.value = category;
    } else if( operation.name==='tag' ) {
      var tags = answer.FreeText;
      tags = tags.split( ',' );
      answerData.value = tags;
    } else if( operation.name==='comment' ) {
      var comment = answer.FreeText;
      answerData.value = comment;
    } else {
      log.warn( 'Operation %s not supported', operation.name );
      continue;
    }

    dataList.push( [ answerData, operation ] );
  }

  log.trace( 'Creating annotations for %s objects', dataList.length );

  async.map( dataList, createAnnotation, function ( err, annotations ) {
    if( err ) return callback( err );

    annotations = _.flatten( annotations );

    log.trace( '%s Annotations created', annotations.length );
    for (var i = annotations.length - 1; i >= 0; i--) {
      execution.annotations.push( annotations[i] );
    }
    execution.setMetadata( 'assignment', assignment.id );
    execution.setMetadata( 'worker', worker );

    // Closing the Execution
    execution.close( callback );
  } );
}
function remote( req, res ) {
  var task = req.task;
  log.trace( 'Task(%s): %s', task._id, task.name );

  //var eventType = req.query[ 'Event.1.EventType' ];
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

      return createExecution( task, microtask, platform, assignment, function ( err ) {
        if( err ) {
          log.error( err );
          return res.send( 'NO_RESPONSE_CREATED' );
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


  function populateMicrotask( cb ) {
    microtask
    .populate( 'operations objects', function ( err, popMicrotask ) {
      if( err ) return cb( err );

      microtask = popMicrotask;
      return cb();
    } );
  }
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
    var question;
    try {
      if( params.questionFile )
        question = fs.readFileSync( __dirname+'/custom/'+params.questionFile, 'utf8' );

    } catch( ex ) {
      question = fs.readFileSync( __dirname+'/question.xml', 'utf8' );
    }

    // Create a renderer for the file
    var render = _.template( question );
    // Generate the final XML question file
    var questionXML = render( {
      microtask: microtask,
      task: task
    } );

    return cb( null, hitTypeIdPassed, questionXML );
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

  actions.unshift( populateMicrotask );

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
      'default': 'position.xml'
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
      'default': ''
    },
    secretAccessKey:{
      type:'pass',
      'default': ''
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