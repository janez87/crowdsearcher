

// Load libraries
var util = require( 'util' );

// Use a child logger
var log = common.log.child( { component: 'Delete Job' } );


// Mongo models

// Generate custom error `DeleteJobError` that inherits
// from `APIError`
var APIError = require( './error' );
var DeleteJobError = function( id, message, status ) {
  DeleteJobError.super_.call( this, id, message, status );
};
util.inherits( DeleteJobError, APIError );

DeleteJobError.prototype.name = 'DeleteJobError';
// Custom error IDs


// API object returned by the file
// -----
var API = {


  checks: [
    'checkJobId'
  ],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    job: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'job',

  // The API method to implement.
  method: 'DELETE'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function deleteJob( req, res, next ) {
  log.trace( 'Removing Job %s', req.query.job );

  var query = req.queryObject;

  query
  .remove()
  .exec( req.wrap( function( err, job ) {
    if( err ) return next( err );

    log.trace( 'Job %s (%s) removed', job._id, job.name );
    res.json( job );
  } ) );
};


// Export the API object
exports = module.exports = API;