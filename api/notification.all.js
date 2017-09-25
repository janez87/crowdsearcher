
'use strict';
let _ = require( 'lodash' );
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Notification API' } );

// Import models
var Task = CS.models.task;
var Platform = CS.models.platform;

// Generate custom error `NotificationError` that inherits
// from `APIError`
var APIError = require( './error' );
var NotificationError = function( id, message, status ) {
  /* jshint camelcase: false */
  NotificationError.super_.call( this, id, message, status );
};
util.inherits( NotificationError, APIError );

NotificationError.prototype.name = 'NotificationError';
// Custom error IDs
//NotificationError. = '';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: ':task/notification/:platform',

  // The API method to implement.
  method: 'ALL'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function notificationAPI( req, res, next ) {
  var taskId = req.params.task;
  var platform = req.params.platform;
  var method = req.method;

  log.trace( 'Got %s notification for %s task %s', method, platform, taskId );

  var platform = CS.platforms[ platform ];
  if( !platform ) {
    log.warn( 'Platform not implemented' );
    return res.send( 'BAD_PLATFORM' );
  }

  if( !_.isFunction( platform.notify ) ) {
    log.warn( 'Platform notification handler not implemented' );
    return res.send( 'BAD_PLATFORM_HANDLER' );
  }

  Task
  .findById( taskId )
  .exec( req.wrap( function ( err, task ) {
    if( err ) {
      log.error( err );
      return res.send( 'ERROR' );
    }

    if( !task ) {
      log.warn( 'No task retrieved for id %s', taskId );
      return res.send( 'BAD_TASK_ID' );
    }

    // Pass the task to the request.
    req.task = task;

    // Give the control over the response to the notify handler.
    return platform.notify( req, res, next );
  } ) );
};


// Export the API object
exports = module.exports = API;