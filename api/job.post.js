

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var CS = require( '../core' );

// Import the required Models
var Job = CS.models.job;

// Use a child logger
var log = CS.log.child( { component: 'Post Job' } );

// Generate custom error `PostJobError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostJobError = function( id, message, status ) {
  /* jshint camelcase: false */
  PostJobError.super_.call( this, id, message, status );
};
util.inherits( PostJobError, APIError );

PostJobError.prototype.name = 'PostJobError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'job',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postJob( req, res, next ) {
  log.trace( 'Job poster' );

  var rawJob = _.clone( req.body );
  log.trace('saving the job %j',rawJob);
  var job = new Job( rawJob );
  job.save( req.wrap( function( err, job ) {
    if( err ) return next( err );

    return res.json( {
      job: job.id
    } );
  } ) );
};


// Export the API object
exports = module.exports = API;