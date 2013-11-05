

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
PostAnswerError.EXECUTION_CLOSED = 'EXECUTION_CLOSED';
PostAnswerError.BAD_FORMAT = 'BAD_FORMAT';

// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    execution: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'answer',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postAnswer( req, res, next ) {
  log.trace( 'Posting answer' );

  var answers = req.body.data;
  var executionId = req.query.execution;
  var data = {};

  if( _.isUndefined( answers ) )
    return next( new PostAnswerError( PostAnswerError.BAD_FORMAT, 'The response must be a json containing a "data" field', APIError.BAD_REQUEST ) );

  function checkExecution( callback ) {
    Execution
    .findById( executionId )
    .populate( 'microtask platform' )
    .exec( req.wrap( function( err, execution ) {
      if( err ) return callback( err );

      if( !execution )
        return callback( new Error( 'No execution retrieved' ) );

      if( execution.closed )
        return callback( new Error( 'Execution already closed' ) );

      data.execution = execution;

      Operation
      .populate( execution.microtask, {
        path: 'operations'
      }, req.wrap( function( err, microtask ) {
        if( err ) return callback( err );

        data.microtask = microtask;
        return callback();
      } ) );
    } ) );
  }

  function addAnnotations( callback ) {
    var execution = data.execution;
    var microtask = data.microtask;

    // `answers` is an ordered array of answer.
    // The position of each answer corresponds to the operation in the `microtask`
    // at the same index. THIS WILL CHANGE SOON
    var answerOperationList = [];
    _.each( microtask.operations, function( operation, index ) {
      answerOperationList.push( {
        operation: operation,
        answers: answers[ index ] || []
      } );
    } );

    function createAnnotations( item, cb ) {
      var operationAnswers = item.answers;
      var operation = item.operation;

      log.trace( 'Operation: %j', operation );
      log.trace( 'Operation answers: %j', operationAnswers );

      var implementation = operation.implementation;
      return implementation.create( operationAnswers, operation, function( err, annotations ) {
        if( err ) return callback( err );

        _.each( annotations, function ( annotation ) {
          execution.annotations.push( annotation );
        } );
        return cb();
      } );
    }

    async.each( answerOperationList, createAnnotations, callback );
  }

  function closeExecution( callback ) {
    var execution = data.execution;
    execution.close( req.wrap( callback ) );
  }

  /*

  // Now check if the answer is posted correctly and create the annotations.
  function createAnnotations( data, callback ) {
    var operation = data.operation;
    var answer = data.answer;

    log.trace( 'Creating Answer for %s with data %j', operation.label, answer );

    // Import `Operation` implementation
    var opImplementation = CS.operations[ operation.name ];

    // Check if there is an error in the data sent.
    var error = opImplementation.checkData( answer, operation );
    if( error ) return callback( error );

    // Delegate the creation of the `Annotation`s to the operations `create` method.
    opImplementation.create( answer, operation, callback );
  }

  var closeExecution = function( data, callback ) {
    var annotations = data.annotations;
    var execution = data.execution;

    log.trace( 'Post answer success, created %s annotations', annotations.length );

    // Add each `Annotation` to the `Execution`
    _.each( annotations, function( annotation ) {
      execution.annotations.push( annotation );
    } );

    // Close the execution
    execution.close( req.wrap( function( err, results ) {
      if( err ) return callback( err );

      // ... and return the `Annotation`s.
      return callback( null, annotations, results );
    } ) );
  };

  var initAnswers = function( data, callback ) {
    var execution = data.execution;


    // For each response create and an array of Annotations.
    async.map( answerListObj, createAnnotations, function( err, arrayOfAnnotations ) {
      if( err ) return next( err );

      // Transform an array of array into a simple array (Eg: `[[a,b],[c]] -> [a,b,c]`)
      var annotations = _.flatten( arrayOfAnnotations );
      data.annotations = annotations;
      return callback( null, data );
    } );
  };
  */


  var actions = [
    checkExecution,
    addAnnotations,
    closeExecution
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