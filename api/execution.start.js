'use strict';
// Load system modules
let url = require( 'url' );

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );
let APIError = require( './error' );
let getExecutionAPI = require( './execution.get' );

// Constant declaration

// Module variables declaration
let RequireAuthError = getExecutionAPI.authError;
let Execution = CS.models.execution;
let log = CS.log.child( {
  component: 'Start Execution'
} );

// Custom Errors
class StartExecutionError extends APIError {}
StartExecutionError.NO_EXECUTION = 'NO_EXECUTION';
StartExecutionError.INVALID_URL = 'INVALID_URL';

// Module functions declaration
function getExecution( config ) {
  log.trace( 'Fake GET execution call' );

  // Make the fake call
  return getExecutionAPI
  .promiseLogic( config )
  .get( '_id' );
}
function populateExecution( executionId ) {
  log.trace( 'Populating execution %s', executionId );

  return Execution
  .findById( executionId )
  .populate( 'platform' )
  .populate( 'microtask', '-objects' )
  .populate( 'task', '-objects -microtasks' )
  .exec()
  .then( execution => {
    if( !execution ) {
      let error = new StartExecutionError( StartExecutionError.NO_EXECUTION, 'Missing execution' );
      return Promise.reject( error );
    }

    return execution;
  } );
}
function startImplementation( execution ) {
  log.trace( 'Starting implementation for execution %s', execution._id );
  // Data
  let microtask = execution.microtask;
  let task = execution.task;

  // Import the platform implementation
  let platform = execution.platform;
  let platformImplementation = platform.implementation;

  let executePromise = Promise.promisify( platformImplementation.execute, {
    multiArgs: true,
    context: platformImplementation,
  } );

  return executePromise( task, microtask, execution, platform );
}
function startExecution( req, res, next ) {
  log.trace( 'Starting execution' );

  // Create config object
  let config = _.assign( {}, req.query );
  if( req.isAuthenticated() ) {
    // If user is authenticated then use its id
    let performerId = req.user._id;
    config.performer = performerId;
  }

  return getExecution( config )
  .then( populateExecution )
  .then( startImplementation )
  .spread( executionUrl => {
    if( !executionUrl ) {
      let error = new StartExecutionError( StartExecutionError.INVALID_URL, 'The platform did not provide a valid url' );
      return Promise.reject( error );
    }

    let urlObj = url.parse( executionUrl, true );
    urlObj.search = null;
    executionUrl = url.format( urlObj );

    return res.format( {
      // Send an HTML redirect
      html: () => res.redirect( executionUrl ),
      // Send a JSON with the url to contact
      json: () => res.json( { url: executionUrl } ),
    } );
  } )
  .catch( RequireAuthError, err => {
    log.debug( 'This task requires authentication', err );

    // Ok, require auth
    req.session.destination = req.originalUrl.slice( 1 );
    // Save in session the provenance of the user
    req.session.from = req.query.from;

    return res.format( {
      html: () => res.redirect( CS.config.externalAddress+'login' ),
      json: () => res.json( APIError.UNAUTHORIZED, { id: 'UNAUTHORIZED', message: 'A user must be provided for this Task', requestedUrl: req.session.destination } ),
    } );
  } )
  .catch( next );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  url: 'run',
  method: 'GET',
  logic: startExecution,
}