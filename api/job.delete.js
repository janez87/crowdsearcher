

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Delete Job' } );


// Mongo models

// Generate custom error `DeleteJobError` that inherits
// from `APIError`
var APIError = require( './error' );
var DeleteJobError = function( id, message, status ) {
  /* jshint camelcase: false */
  DeleteJobError.super_.call( this, id, message, status );
};
util.inherits( DeleteJobError, APIError );

DeleteJobError.prototype.name = 'DeleteJobError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
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
  var id = req.query.job;
  log.trace( 'Removing Job %s', id );

  var Job = CS.models.job;
  Job
  .findById( id )
  .remove()
  .exec( req.wrap( function( err ) {
    if( err ) return next( err );

    res.json( {
      message: 'Good by job... we will miss you...'
    } );
  } ) );
};


// Export the API object
exports = module.exports = API;