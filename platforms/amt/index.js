// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var fs = require( 'fs' );
var nconf = require( 'nconf' );
var AMT = require( 'amt' );
var moment = require( 'moment' );
var CS = require( '../../core' );

// Import Models
//var Performer = CS.models.user;
var Execution = CS.models.execution;
var Microtask = CS.models.microtask;

// Create a child logger
var log = CS.log.child( {
  component: 'AMT'
} );

function execute( task, microtask, execution, platform, callback ) {
  var params = platform.params;

  var url = ( params.sandbox ) ? 'https://workersandbox.mturk.com/' : 'https://www.mturk.com/';
  url += 'mturk/preview?groupId=';

  // TODO: save the hitType in the control Mart?
  var hitTypeMetadata = task.getMetadata( 'hitType' );

  return callback( null, url + hitTypeMetadata );
}

function createExecution( task, microtask, platform, assignment, callback ) {
  var accept = assignment.AcceptTime;
  var submit = assignment.SubmitTime;
  var worker = assignment.WorkerId;

  log.trace( 'Creating execution' );


  var operations = microtask.operations;

  var rawExecution = {
    task: task,
    microtask: microtask,
    job: task.job,
    //performer: amtPerformer, // TODO fix
    platform: platform,
    createdDate: accept
  };

  var execution = new Execution( rawExecution );

  // Parse each answer
  var amtAnswers = assignment.answer.QuestionFormAnswers.Answer;
  var responses = [];

  if ( !_.isArray( amtAnswers ) )
    amtAnswers = [ amtAnswers ];


  // Create response object for each AMT answer
  for ( var i = amtAnswers.length - 1; i >= 0 && assignment.status === 'Submitted'; i-- ) {
    var answer = amtAnswers[ i ];

    // Get the objectId and operationId identifiers
    var identifiers = answer.QuestionIdentifier.split( '_' );
    var objectId = identifiers[ 0 ];
    var operationId = identifiers[ 1 ];

    var operation = _.find( operations, function( op ) {
      return op._id.equals( operationId );
    } );

    if ( !operation ) {
      log.warn( 'Invalid operation ID (%s) skipping...', operationId );
      continue;
    }

    // Creating the data for the operation
    var response = {
      date: submit,
      object: objectId,
      operation: operationId
    };

    // retrieve the value based on the operation type
    if ( operation.name === 'classify' ) {
      var category = answer.SelectionIdentifier;
      response.response = category;

    } else if ( operation.name === 'tag' ) {
      var tags = answer.FreeText;
      tags = tags.match( /[^,\s][^\,]*[^,\s][^\s,]*/ig );
      response.response = tags;

    } else if ( operation.name === 'comment' ) {
      var comment = answer.FreeText;
      response.response = comment;

    } else if ( operation.name === 'like' ) {
      var likedObject = answer.SelectionIdentifier;
      response.object = likedObject;

      // Object not liked
      if ( !likedObject )
        continue;
    } else {
      log.warn( 'Operation %s not supported by AMT', operation.name );
      // Do not add to responses array.
      continue;
    }

    responses.push( response );
  }

  execution.setMetadata( 'assignment', assignment.id );
  execution.setMetadata( 'worker', worker ); // TODO: FIX

  execution.save( function( err, execution ) {
    if ( err ) return callback( err );

    if ( responses.length === 0 || assignment.status !== 'Submitted' )
      return callback();

    execution.createAnnotations( responses, function( err ) {
      if ( err ) return callback( err );

      log.trace( 'SubmitTime: %s', submit );
      log.trace( 'Is after closed? %s', moment( submit ).isAfter( task.closedDate ) );

      if ( submit && moment( submit ).isAfter( task.closedDate ) ) {
        // Assignment submitted after the task was closed.
        return execution.makeInvalid( callback );

      } else {
        // Assignment ok.
        return execution.close( callback );
      }
    } );
  } );
}




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
      description: params.description || task.description || 'CrowdSearcher Task',
      Keywords: ( params.keywords || [] ).join( ',' ),
      reward: reward,
      duration: duration
    } );

    return hitType.create( cb );
  }

  function addNotification( hitType, cb ) {
    hitTypeId = hitType.id;

    log.trace( 'Setting notification to hitType %s', hitTypeId );

    var destination = nconf.get( 'webserver:externalAddress' );
    destination += 'api/' + task._id + '/notification/amt';
    log.trace( 'Destination is: %s', destination );

    var notification = new Notification( {
      destination: destination,
      transport: 'REST',
      events: [ 'AssignmentAbandoned', 'AssignmentReturned', 'AssignmentSubmitted' ]
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
    if ( _.isString( params.questionFile ) && params.questionFile.trim().length > 0 )
      question = fs.readFileSync( __dirname + '/custom/' + params.questionFile, 'utf8' );
    else
      question = fs.readFileSync( __dirname + '/question.xml', 'utf8' );

    // Create a renderer for the file
    var render = _.template( question );

    // Generate the final XML question file
    var questionXML = render( {
      microtask: microtask,
      task: task
    } );

    //require( 'fs' ).writeFileSync( 'd:\\test.xml', questionXML );

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
    microtask
      .populate( 'objects', function( err, microtask ) {
        if ( err ) return cb( err );

        var actions = [
          _.partial( generateQuestionXML, microtask ),
          createHit,
          _.partial( saveMicrotask, microtask )
        ];

        return async.waterfall( actions, cb );
      } );
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
    if ( err ) return callback( err );

    hit.expire( callback );
  } );
}






function handleNotification( req, res ) {
  var task = req.task;
  var index = 1;

  log.debug( 'Got notification' );

  function test() {
    return _.isUndefined( req.query[ 'Event.' + index + '.EventType' ] );
  }

  function parseParam( callback ) {
    // Generate base name
    var base = 'Event.' + index + '.';
    log.trace( 'Event #: %s', index );

    // Increment the index
    index++;

    var eventType = req.query[ base + 'EventType' ];

    log.trace( 'Event type: %s', eventType );

    // Skip if not supported
    if ( eventType !== 'AssignmentAbandoned' &&
      eventType !== 'AssignmentReturned' &&
      eventType !== 'AssignmentSubmitted' )
      return callback();

    var hitTypeId = req.query[ base + 'HITTypeId' ];
    var hitId = req.query[ base + 'HITId' ];
    var assignmentId = req.query[ base + 'AssignmentId' ];
    var taskHitTypeId = task.getMetadata( 'hitType' );

    /*
    log.trace( 'hitTypeId: %s', hitTypeId );
    log.trace( 'taskHitTypeId: %s', taskHitTypeId );
    log.trace( 'hitId: %s', hitId );
    log.trace( 'assignmentId: %s', assignmentId );
    */

    // Check for consistency
    if ( taskHitTypeId !== hitTypeId ) {
      log.error( 'HitTypeId mismatch (task!=notification): %s!=%s', taskHitTypeId, hitTypeId );
      return callback();
    }

    // Find the corresponding Microtask
    Microtask
      .findOne()
    // Same Task id
    .where( 'task', task._id )
    // Must have a metadata with the specified hitId
    .elemMatch( 'metadata', {
      key: 'hit',
      value: hitId
    } )
      .populate( 'operations' )
    // Only the AMT platform is needed
    .populate( {
      path: 'platforms',
      match: {
        name: 'amt'
      }
    } )
      .exec( req.wrap( function( err, microtask ) {
        if ( err ) return callback( err );

        if ( !microtask ) return callback( new CS.error( 'No microtask retrieved' ) );

        var amtPlatform = microtask.platforms[ 0 ];
        if ( !amtPlatform ) return callback( new CS.error( 'No amt platform present' ) );

        var params = amtPlatform.params;

        var amt = new AMT( {
          sandbox: params.sandbox,
          key: params.accessKeyId,
          secret: params.secretAccessKey,
        } );

        var Assignment = amt.Assignment;
        // Retrieve the assignment
        Assignment.get( assignmentId, function( err, assignment ) {
          if ( err ) return callback( err );

          return createExecution( task, microtask, amtPlatform, assignment, callback );
          //return callback();
        } );

      } ) );

  }




  // Parse each Event parameter passed
  async.until( test, parseParam, function( err ) {
    if ( err ) return log.error( err );

    log.debug( 'Notification handling finished' );

    return res.send( 'OK' );
  } );
}


var Platform = {
  name: 'Amazon Mechanical Turk',
  description: 'AMT platform',
  image: 'amt.jpg',

  hooks: {
    'OPEN_TASK': onOpenTask,
    'END_TASK': onEndTask,
    'ADD_MICROTASKS': onAddMicrotasks,
    'END_MICROTASK': onEndMicrotask
  },

  execute: execute,
  notify: handleNotification,

  params: {
    questionFile: {
      type: 'string'
    },
    sandbox: {
      type: 'boolean',
      'default': true
    },
    accessKeyId: {
      type: 'pass',
      'default': ''
    },
    secretAccessKey: {
      type: 'pass',
      'default': ''
    },
    price: {
      type: 'number',
      'default': 0.01
    },
    duration: {
      type: 'number',
      'default': 60
    },
    keywords: {
      type: [ 'string' ]
    },
    description: {
      type: 'string'
    },
    maxAssignments: {
      type: 'number'
    },
    lifeTimeInSeconds: {
      type: 'number',
      'default': 3600 * 24 * 5
    }
  }
};




module.exports = exports = Platform;