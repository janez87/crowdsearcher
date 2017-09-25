'use strict';
let _ = require( 'lodash' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( {
  component: 'Start FB Job'
} );

// Generate custom error `StartFBError` that inherits
// from `APIError`
var APIError = require( './error' );
var StartFBError = function( id, message, status ) {
  StartFBError.super_.call( this, id, message, status );
};
util.inherits( StartFBError, APIError );

StartFBError.prototype.name = 'StartFBError';
// Custom error IDs
StartFBError.FB_NOT_CONFIGURED = 'FB_NOT_CONFIGURED';

// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],


  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {},

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'facebook',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
// This API manually start the cron to job that retreive the assignments on mechanical turk
API.logic = function StartFB( req, res, next ) {
  log.trace( 'Start FB Job' );

  var query = req.queryObject;

  query
    .populate( 'platforms microtasks' )
    .exec( req.wrap( function( err, task ) {
      if ( err ) return next( err );

      log.trace( 'Task %s retrieved', task._id );

      var facebook = _.findWhere( task.platforms, {
        name: 'facebook'
      } );

      //if FB is not configured for the task i can't schedule the job
      if ( _.isUndefined( facebook ) ) {
        return next( new StartFBError( StartFBError.FB_NOT_CONFIGURED, 'The task selected does not have the FB platform configured', APIError.BAD_REQUEST ) );
      }

      var microtasks = task.microtasks;


      async.each( microtasks, function( m, cb ) {
        return CS.startJob( facebook, m, cb );
      }, function( err ) {
        if ( err ) return res.json( err );

        log.trace( 'Jobs scheduled' );
        return res.json( {} );
      } );

    } ) );
};

// Export the API object
exports = module.exports = API;