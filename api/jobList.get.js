

// Load libraries
var util = require( 'util' );

// Use a child logger
var log = common.log.child( { component: 'Get Job List' } );

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
  var Job = common.models.job;
  Job.find().lean().exec( req.wrap( function( err, jobs ) {
    if( err ) return next( err );
    res.json( jobs );
  } ) );
};


// Export the API object
exports = module.exports = API;