'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );
let APIError = require( './error' );

// Constant declaration

// Module variables declaration
// let Task = CS.models.task;
let Microtask = CS.models.microtask;
let Execution = CS.models.execution;
let log = CS.log.child( {
  component: 'Post Answer'
} );

// Custom errors
class PostAnswerError extends APIError {}
PostAnswerError.ANSWER_NUMBER_MISMATCH = 'ANSWER_NUMBER_MISMATCH';
PostAnswerError.OPERATION_TYPE_INVALID = 'OPERATION_TYPE_INVALID';
PostAnswerError.BAD_FORMAT = 'BAD_FORMAT';
PostAnswerError.NOT_FOUND = 'NOT_FOUND';
PostAnswerError.EXECUTION_CLOSED = 'EXECUTION_CLOSED';

// Module functions declaration
function checkExecution( executionId ) {
  return Execution
  .findById( executionId )
  .then( execution => {
    // Check if execution is present
    if( !execution ) {
      let error = new PostAnswerError( PostAnswerError.NOT_FOUND, 'No execution retrieved' );
      return Promise.reject( error );
    }

    // Check if execution is not closed
    if( execution.closed ) {
      let error = new PostAnswerError( PostAnswerError.EXECUTION_CLOSED, 'Execution already closed' );
      return Promise.reject( error );
    }

    return execution;
  } )
}
function addAnnotations( answers, execution ) {
  return execution
  .createAnnotations( answers )
  .return( execution );
}
function saveExecution( execution ) {
  // let taskId = execution.task;
  let microtaskId = execution.microtask;

  // TODO must add also the task check like task.closed || microtask.closed

  return Microtask
  .findById( microtaskId )
  .select( 'status' )
  .lean()
  .exec()
  .then( microtask => {
    if( microtask.status==='CLOSED' ) { // Andrea Mauri PhD
      return execution.makeInvalid();
    } else {
      return execution.close();
    }
  } )
  .return( execution );
}
function postAnswer( req, res, next ) {
  let executionId = req.params.id;
  log.trace( 'Posting answer for %s', executionId );

  // Check data field
  let answers = req.body.data;
  if( _.isUndefined( answers ) ) {
    let error = new PostAnswerError( PostAnswerError.BAD_FORMAT, 'The response must be a json containing a "data" field', APIError.BAD_REQUEST );
    return next( error );
  }

  let runAddAnnotations = _.curry( addAnnotations );

  return checkExecution( executionId )
  .then( runAddAnnotations( answers ) )
  .then( saveExecution )
  .then( execution => {
    let objExecution = execution.toObject( {
      getters: true,
    } );
    // Return the updated executoin
    return res.json( objExecution );
  } )
  .catch( next ); // Handle errors
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  url: 'answer/:id',
  method: 'POST',
  logic: postAnswer,
};