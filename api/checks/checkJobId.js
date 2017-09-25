

'use strict';
var _  = require('underscore');
var util  = require('util');
var CS = require( '../../core' );

// Import a child Logger
//var log = CS.log.child( { component: 'Check Job' } );

// Import the Job Model
var Job = CS.models.job;

// Generate custom error `CheckJobError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckJobError = function( id, message, status ) {
  CheckJobError.super_.call( this, id, message, status );
};
util.inherits( CheckJobError, APIError );

CheckJobError.prototype.name = 'CheckJobError';
// Custom error IDs
CheckJobError.JOB_NOT_FOUND = 'JOB_NOT_FOUND';
CheckJobError.INVALID_JOB_ID = 'INVALID_JOB_ID';



// Exported middleware
exports = module.exports = function checkJob(req, res, next) {

  // Get the job id from the query string
  var id = req.query.job;

  // Check id
  if( _.isUndefined( id ) || (id.length===0) )
    return next( new CheckJobError( CheckJobError.INVALID_JOB_ID, 'Empty Job ID', APIError.BAD_REQUEST ) );

  // Create a promise and save it to `req.queryObject`
  req.queryObject = Job.findById( id );

  return next();
  /*
  log.trace( 'Checking if job %s exists', id );
  // Query the db for the Job
  Job.findById( id, req.wrap( function( err, job ) {
    if( err ) return next( err );

    if( !job )
      return next( new CheckJobError( CheckJobError.JOB_NOT_FOUND, 'Job not found', APIError.NOT_FOUND ) );

    log.trace( 'Job %s ok', id );

    // Pass the retrieved microtask
    req.job = job;

    return next();
  } ) );
  */
};