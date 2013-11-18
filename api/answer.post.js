

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Post Answer' } );

// Import CS antities
var Execution = CS.models.execution;
var Operation = CS.models.operation;

// Generate custom error `PostAnswerError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostAnswerError = function( id, message, status ) {
  /* jshint camelcase: false */
  PostAnswerError.super_.call( this, id, message, status );
};
util.inherits( PostAnswerError, APIError );

PostAnswerError.prototype.name = 'PostAnswerError';
// Custom error IDs
PostAnswerError.ANSWER_NUMBER_MISMATCH = 'ANSWER_NUMBER_MISMATCH';
PostAnswerError.OPERATION_TYPE_INVALID = 'OPERATION_TYPE_INVALID';

PostAnswerError.BAD_FORMAT = 'BAD_FORMAT';
PostAnswerError.NOT_FOUND = 'NOT_FOUND';
PostAnswerError.EXECUTION_CLOSED = 'EXECUTION_CLOSED';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'answer/:id',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postAnswer( req, res, next ) {
  var executionId = req.params.id;
  log.trace( 'Posting answer for %s', executionId );


  // In the body of the POST request I expect a JSON structured as follows:
  //
  // ```
  // {
  //   data: [ answer1, answer2, answer3, ..., answerN ]
  // }
  // ```
  //
  // Each `answer` element must contain the id of the operation and the object it refers to:
  //
  // ```
  // {
  //   operation: ""
  //   object: ""
  //   response:
  // }
  // ```
  var answers = req.body.data;
  var data = {};

  if( _.isUndefined( answers ) )
    return next( new PostAnswerError( PostAnswerError.BAD_FORMAT, 'The response must be a json containing a "data" field', APIError.BAD_REQUEST ) );


  function checkExecution( callback ) {
    Execution
    .findById( executionId )
    .populate( 'microtask platform task' )
    .exec( req.wrap( function( err, execution ) {
      if( err ) return callback( err );

      if( !execution )
        return callback( new PostAnswerError( PostAnswerError.NOT_FOUND, 'No execution retrieved' ) );

      if( execution.closed )
        return callback( new PostAnswerError( PostAnswerError.EXECUTION_CLOSED, 'Execution already closed' ) );

      data.execution = execution;
      data.task = execution.task;

      execution.microtask
      .populate( 'operations', req.wrap( function( err, microtask ) {
        if( err ) return callback( err );

        data.microtask = microtask;
        return callback();
      } ) );
    } ) );
  }



  function addAnnotations( callback ) {
    var execution = data.execution;
    var microtask = data.microtask;

    function createAnnotations( item, cb ) {
      var operationId = item.operation;

      microtask.getOperationById( operationId, function( err, operation ) {
        if( err ) return cb( err );

        var implementation = operation.implementation;
        if( implementation && implementation.create ) {
          return implementation.create( item, operation, function( err, annotations ) {
            if( err ) return cb( err );

            log.trace( 'Annotations(%s): %j', annotations.length, annotations );
            // Add the annotations to the execution object.
            _.each( annotations, function ( annotation ) {
              log.trace( 'Annotation: %j', annotation );
              execution.annotations.push( annotation );
            } );
            return cb();
          } );
        } else {
          log.warn( 'Operation %s does not have an implementation', operation.name );
          return cb();
        }
      } );
    }

    //var answerByOperation = _.groupBy( answers, 'operation' );

    async.each( answers, createAnnotations, callback );
  }

  function saveExecution( callback ) {
    var execution = data.execution;
    var task = data.task;

    if( task.closed ) {
      execution.makeInvalid( req.wrap( callback ) );
    } else {
      execution.close( req.wrap( callback ) );
    }
  }

  var actions = [
    checkExecution,
    addAnnotations,
    saveExecution
  ];

  // Execute each action
  async.series( actions, function( err ) {
    if( err ) return next( err );

    // ... and return the execution
    var execution = data.execution;
    return res.json( execution.toObject( { getters: true } ) );
  } );
};

// Export the API object
exports = module.exports = API;