

'use strict';
var _  = require('underscore');
var util  = require('util');
var CS = require( '../../core' );

// Import a child Logger
//var log = CS.log.child( { component: 'Check Execution' } );

// Import the Execution
var Execution = CS.models.execution;

// Generate custom error `CheckExecutionError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckExecutionError = function( id, message, status ) {
  CheckExecutionError.super_.call( this, id, message, status );
};
util.inherits( CheckExecutionError, APIError );

CheckExecutionError.prototype.name = 'CheckExecutionError';
// Custom error IDs
CheckExecutionError.EXECUTION_NOT_FOUND = 'EXECUTION_NOT_FOUND';
CheckExecutionError.INVALID_EXECUTION_ID = 'INVALID_EXECUTION_ID';



// Export middleware
exports = module.exports = function checkExecution( req, res, next ) {
  // Get the execution list from the request body
  var id = req.query.execution;

   // Check id
  if( _.isUndefined( id ) || (id.length===0) )
    return next( new CheckExecutionError( CheckExecutionError.INVALID_EXECUTION_ID, 'Empty execution ID', APIError.BAD_REQUEST ) );

  // Create a Query and save it to `req.queryObject`
  req.queryObject = Execution.findById( id );

  return next();
  /*
  log.trace( 'Checking if execution %s exists', id );
  // Query the db for the Execution
  Execution
  .findById( id )
  .populate( 'operations' )
  .exec( req.wrap( function( err, execution ) {
    if( err ) return next( err );

    if( !execution )
      return next( new CheckExecutionError( CheckExecutionError.EXECUTION_NOT_FOUND, 'Execution not found', APIError.NOT_FOUND ) );

    log.trace( 'Execution %s ok', id );

    // Pass the retrieved Execution
    req.execution = execution;

    return next();
  } ) );
  */
};