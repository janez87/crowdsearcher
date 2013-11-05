

// Load libraries
var _  = require('underscore');
var util  = require('util');
var CS = require( '../../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Check Task ID' } );

// Import the Task Model
var Task = CS.models.task;

// Generate custom error `CheckTaskIdError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckTaskIdError = function( id, message, status ) {
  CheckTaskIdError.super_.call( this, id, message, status );
};
util.inherits( CheckTaskIdError, APIError );

CheckTaskIdError.prototype.name = 'CheckTaskIdError';
// Custom error IDs
CheckTaskIdError.TASK_NOT_FOUND = 'TASK_NOT_FOUND';
CheckTaskIdError.INVALID_TASK_ID = 'INVALID_TASK_ID';



// Export middleware
exports = module.exports = function checkTaskId( req, res, next ) {

  // Get the id from the query string
  var id = req.query.task;

  // Check id
  if( _.isUndefined( id ) || (id.length===0) )
    return next( new CheckTaskIdError( CheckTaskIdError.INVALID_TASK_ID, 'Empty Task ID', APIError.BAD_REQUEST ) );

  log.trace( 'Checking if task %s exists', id );

  // Create a promise and save it to `req.queryObject`
  req.queryObject = Task.findById( id );

  return next();
  /*
  , req.wrap( function( err, task ) {
    if( err ) return next( err );

    if( !task )
      return next( new CheckTaskIdError( CheckTaskIdError.TASK_NOT_FOUND, 'Task not found', APIError.NOT_FOUND ) );

    log.trace( 'Task %s ok', id );

    // Pass the retrieved Task
    req.task = task;

    return next();
  } ) );
  */
};