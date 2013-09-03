

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );

// Use a child logger
var log = common.log.child( { component: 'Post Answer' } );

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
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkExecutionId'
  ],


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

  var answerData = req.body.data;
  var query = req.queryObject;
  log.trace( 'Answer posted: %j', answerData );

  if( _.isUndefined( answerData ) )
    return next( new PostAnswerError( PostAnswerError.BAD_FORMAT, 'The response must be a json containing a "data" field', APIError.BAD_REQUEST ) );



  /*
  function checkObjectIds() {
    // Get the array of `objectIds`.
    var objectIds = _.pluck( data, 'objectId' );


    // Create a domain to handle Mongoose errors
    var d = domain.create();
    d.on( 'error', callback );

    MicroTask
    .findById( execution.microtask )
    .select( 'objects' )
    .lean()
    .exec( d.bind( function( err, microtask ) {
      if( err ) return callback( err );


      var microtaskObjectIds = _.invoke( microtask.objects, 'toString' );

      log.trace( 'Passed ids', objectIds );
      log.trace( 'Microtask ids', microtaskObjectIds );

      var wrongIds = _.difference( objectIds, microtaskObjectIds );
      log.trace( 'Found %s wrong ids: %j', wrongIds.length, wrongIds );

      if( wrongIds.length>0 )
        return callback( new LikeError( LikeError.LIKE_BAD_OBJECTIDS, 'The following ids does not belong to the current microtask\n'+wrongIds.join() ) );

      return callback();
    } ) );
  };
  */

  // Perform the stored query to retrieve the execution object.
  var retrieveExecution = function( callback ) {
    query
    .populate( 'operations' )
    .exec( req.wrap( function( err, executionObj ) {
      // Error if the execution is closed
      if( executionObj.closed )
        return next( new PostAnswerError( PostAnswerError.EXECUTION_CLOSED, 'The execution is already closed', APIError.FORBIDDEN ) );

      var data = {
        execution: executionObj
      };
      callback( null, data );
    } ) );
  };

  // Now check if the answer is posted correctly and create the annotations.
  function createAnnotations( data, callback ) {
    var operation = data.operation;
    var answer = data.answer;

    log.trace( 'Creating Answer for %s with data %j', operation.label, answer );

    // Import `Operation` implementation
    var opImplementation = common.operations[ operation.name ];

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

    // Associate each operation with a the response posted.
    var answerListObj = [];
    _.each( execution.operations, function( operation, index ) {
      answerListObj.push( {
        operation: operation,
        answer: answerData[ index ] || null
      } );
    } );

    // For each response create and an array of Annotations.
    async.map( answerListObj, createAnnotations, function( err, arrayOfAnnotations ) {
      if( err ) return next( err );

      // Transform an array of array into a simple array (Eg: `[[a,b],[c]] -> [a,b,c]`)
      var annotations = _.flatten( arrayOfAnnotations );
      data.annotations = annotations;
      return callback( null, data );
    } );
  };


  var actions = [
    retrieveExecution,
    //checkObjectIds,
    initAnswers,
    closeExecution
  ];

  // Execute each action
  async.waterfall( actions, function( err, annotations, results ) {
    if( err ) return next( err );

    // ... and return the `Annotation`s.
    return res.json( {
      annotations: annotations,
      data: results
    } );
  } );
};

// Export the API object
exports = module.exports = API;