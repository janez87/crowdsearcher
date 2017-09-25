

'use strict';
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Get Job List' } );

// Import CS models
var Job = CS.models.job;

// Generate custom error `GetJobListError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetJobListError = function( id, message, status ) {
  GetJobListError.super_.call( this, id, message, status );
};
util.inherits( GetJobListError, APIError );

GetJobListError.prototype.name = 'GetJobListError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'jobs',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getJob( req, res, next ) {
  log.trace( 'Getting all the Jobs' );

  Job
  .find()
  .lean()
  .exec( req.wrap( function( err, jobs ) {
    if( err ) return next( err );

    return res.json( jobs );
  } ) );
};


// Export the API object
exports = module.exports = API;
