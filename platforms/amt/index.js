// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var fs = require('fs');
var nconf = require('nconf');
var AMT = require('amt');
var CS = require( '../../core' );

// Import Models
//var Performer = CS.models.user;
var Execution = CS.models.execution;
var Microtask = CS.models.microtask;

// Create a child logger
var log = CS.log.child( { component: 'AMT' } );

/*
function execute( task, microtask, execution, platform, callback ) {
  var params = platform.params;

  var url = ( params.sandbox )? 'https://workersandbox.mturk.com/' : 'https://www.mturk.com/';
  url += 'mturk/preview?groupId=';

  // TODO: save the hitType in the control Mart?
  var hitTypeMetadata = task.getMetadata('hitType');

  return  callback(null,url+hitTypeMetadata);
}

function createAnnotation( data, callback ) {
  var answerData = data[ 0 ];
  var operation = data[ 1 ];

  var opImplementation = CS.operations[ operation.name ];
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
    var objectId = identifiers[ 0 ];
    var operationId = identifiers[1];
    if( identifiers.length===1 ) {
      operationId = objectId;
      objectId = null;
    }

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
    } else if( operation.name==='like' ) {
      var like = answer.SelectionIdentifier;
      answerData.objectId = like;
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
*/




function onOpenTask( params, task, data, callback ) {
  log.debug( 'OPEN_TASK' );
  // Create Hit Type
  var amt = new AMT( {
    sandbox: params.sandbox,
    key: params.accessKeyId,
    secret: params.secretAccessKey,
  } );

  var HITType = amt.HITType;
  var Reward = amt.Reward;
  var Notification = amt.Notification;

  var hitTypeId;

  function createHitType( cb ) {
    log.trace( 'Creating HitType' );
    var reward = new Reward( params.price );
    var duration = params.duration;

    var hitType = new HITType( {
      title: task.name,
      description: params.description || task.description || '',
      Keywords: (params.keywords || []).join( ',' ),
      reward: reward,
      duration: duration
    } );

    return hitType.create( cb );
  }

  function addNotification( hitType, cb ) {
    hitTypeId = hitType.id;

    log.trace( 'Setting notification to hitType %s', hitTypeId );

    var destination = nconf.get( 'webserver:externalAddress' );
    destination += 'api/'+task._id+'/notification/amt';
    log.trace( 'Destination is: %s', destination );

    var notification = new Notification( {
      destination: destination,
      transport: 'REST',
      events: [ 'AssignmentSubmitted' ]
    } );
    return hitType.setNotification( notification, cb );
  }

  function saveTask( hitType, cb ) {
    task.setMetadata( 'hitType', hitTypeId );
    task.save( cb );
  }

  var actions = [
    createHitType,
    addNotification,
    saveTask
  ];
  return async.waterfall( actions, callback );
}

function onEndTask( params, task, data, callback ) {
  log.debug( 'END_TASK' );
  // expite hitType
  return callback();
}

function onAddMicrotasks( params, task, data, callback ) {
  log.debug( 'ADD_MICROTASKS' );

  var amt = new AMT( {
    sandbox: params.sandbox,
    key: params.accessKeyId,
    secret: params.secretAccessKey,
  } );

  var HIT = amt.HIT;
  var hitTypeId = task.getMetadata( 'hitType' );

  // Add HIT
  function generateQuestionXML( microtask, cb ) {

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

    return cb( null, questionXML );
  }
  function createHit( question, cb ) {
    var hit = new HIT( {
      hitTypeId: hitTypeId,
      question: question,
      life: params.lifeTimeInSeconds,
      MaxAssignments: params.maxAssignments
    } );

    return hit.create( cb );
  }

  function saveMicrotask( microtask, hit, hitTypeId, cb ) {
    log.trace( 'Saving hit metadata' );

    microtask.setMetadata( 'hit', hit.id );
    return microtask.save( cb );
  }


  function performActions( microtask, cb ) {
    var actions = [
      _.partial( generateQuestionXML, microtask ),
      createHit,
      _.partial( saveMicrotask, microtask )
    ];

    return async.waterfall( actions, cb );
  }

  var microtasks = data.microtasks;
  return async.each( microtasks, performActions, callback );
}

function onEndMicrotask( params, task, data, callback ) {
  log.debug( 'END_MICROTASK' );
  // expire HIT

  var amt = new AMT( {
    sandbox: params.sandbox,
    key: params.accessKeyId,
    secret: params.secretAccessKey,
  } );

  var HIT = amt.HIT;
  var microtask = data.microtask;
  var hitId = microtask.getMetadata( 'hit' );

  HIT.get( hitId, function( err, hit ) {
    if( err ) return callback( err );

    hit.expire( callback );
  } );
}


function handleNotification( req, res, next ) {
  var task = req.task;

  log.trace( 'Query: %j', req.query );

  var eventType = req.query[ 'Event.1.EventType' ];

  // Skip if not supported
  if( eventType!=='AssignmentSubmitted' )
    return res.send( 'LOVE U' );

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
  .populate( 'operations' )
  .populate( {
    path: 'platforms',
    match: {
      name: 'amt'
    }
  } )
  .exec( req.wrap( function ( err, microtask ) {
    if( err ) {
      log.error( err );
      return res.send( 'QUERY_ERROR' );
    }

    if( !microtask ) {
      log.warn( 'No microtask selected' );
      return res.send( 'NO_MICROTASK' );
    }

    var platform = microtask.platforms[0];
    if( !platform ) {
      log.warn( 'No AMT platform present' );
      return res.send( 'NO_PLATFORM' );
    }

    var platformParameters = platform.params;
    // Init the AMT wrapper
    var amt = new AMT( {
      sandbox: platformParameters.sandbox,
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


var Platform = {
  //notify: handleNotification,

  hooks: {
    'OPEN_TASK': onOpenTask,
    'END_TASK': onEndTask,
    'ADD_MICROTASKS': onAddMicrotasks,
    'END_MICROTASK': onEndMicrotask
  },

  params : {
    questionFile:{
      type:'string',
      'default': 'question.xml'
    },
    sandbox: {
      type: 'boolean',
      'default': true
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