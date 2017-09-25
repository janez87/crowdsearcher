

'use strict';
var _  = require('underscore');
var util  = require('util');
var async  = require('async');
var CS = require( '../../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Check Task Data' } );

// Generate custom error `CheckTaskDataError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckTaskDataError = function( id, message, status ) {
  CheckTaskDataError.super_.call( this, id, message, status );
};
util.inherits( CheckTaskDataError, APIError );

CheckTaskDataError.prototype.name = 'CheckTaskDataError';
// Custom error IDs
CheckTaskDataError.TASK_NAME_MISSING = 'TASK_NAME_MISSING';

CheckTaskDataError.TASK_TYPE_MISSING = 'TASK_TYPE_MISSING';
CheckTaskDataError.TASK_TYPE_NOT_AVAILABLE = 'TASK_TYPE_NOT_AVAILABLE';

CheckTaskDataError.TASK_PLATFORM_MISSING = 'TASK_PLATFORM_MISSING';
CheckTaskDataError.TASK_PLATFORM_NOT_AVAILABLE = 'TASK_PLATFORM_NOT_AVAILABLE';

CheckTaskDataError.TASK_PLATFORM_NOT_AVAILABLE = 'TASK_PLATFORM_NOT_AVAILABLE';


// Export middleware
exports = module.exports = function checkTaskData( req, res, next ) {
  // Get the raw task object from the body request
  var task = req.body;

  log.trace( 'Checking task' );

  // Check the required `name` field.
  if( _.isUndefined( task.name ) )
    return next( new CheckTaskDataError( CheckTaskDataError.TASK_NAME_MISSING, 'Missing Task name', APIError.BAD_REQUEST ) );

  if(task.name.length===0)
    return next( new CheckTaskDataError( CheckTaskDataError.TASK_NAME_MISSING, 'Missing Task name', APIError.BAD_REQUEST ) );

  // ## Checks for the task `operations` field.
  if( !_.isObject( task.operations ) )
    return next( new CheckTaskDataError( CheckTaskDataError.TASK_TYPE_MISSING, 'Missing Task types', APIError.BAD_REQUEST ) );

  // Convert in array if a single object is passed
  if( !_.isArray( task.operations ) )
    task.operations = [ task.operations ];

  // Check if each `operation` of the task is available in the CS.
  var index;
  for( index=0; index<task.operations.length; index++ ) {
    var typeName = task.operations[ index ].name.toLowerCase();
    if( _.isUndefined( CS.operations[ typeName ] ) ) {
      return next( new CheckTaskDataError( CheckTaskDataError.TASK_TYPE_NOT_AVAILABLE, 'Task type "'+typeName+'" not available', APIError.BAD_REQUEST ) );
    }
  }

  // ## Checks for the `platforms` field.
  // Check the `platforms` field.
  if( !_.isObject( task.platforms ) )
    return next( new CheckTaskDataError( CheckTaskDataError.TASK_PLATFORM_MISSING, 'Missing platforms for Task', APIError.BAD_REQUEST ) );

  // Convert in array if a single object is passed
  if( !_.isArray( task.platforms ) )
    task.platforms = [ task.platforms ];

  // This array will hold the platform data for checking the parameters correctness.
  var platforms = [];
  // Check if each `types` of the task is available in the CS.
  for( index=0; index<task.platforms.length; index++ ) {
    var platform = task.platforms[ index ];

    // Add the platform to the list
    platforms.push( platform );

    // Check if the platform exists
    var platformName = platform.name.toLowerCase();
    if( _.isUndefined( CS.platforms[ platformName ] ) )
      return next( new CheckTaskDataError( CheckTaskDataError.TASK_PLATFORM_NOT_AVAILABLE, 'Platform "'+platformName+'" not available', APIError.BAD_REQUEST ) );
  }


  var checkPlatform = function( platformObj, callback ) {
    var platformImpl = CS.platforms[ platformObj.name ];
    var params = platformObj.params;

    // if the platform implementation have a `check` function then call it with the params
    if( _.isFunction( platformImpl.check ) ) {
      platformImpl.check( params, callback );
    } else {
    // .. else just return
      return callback();
    }
  };

  // Check if each platform have the right parameters.
  return async.each( platforms, checkPlatform, next );
};