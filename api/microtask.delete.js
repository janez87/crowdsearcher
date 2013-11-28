// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( {
  component: 'Delete Microtask'
} );


// Mongo models

// Generate custom error `DeleteMicrotaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var DeleteMicrotaskError = function( id, message, status ) {
  DeleteMicrotaskError.super_.call( this, id, message, status );
};
util.inherits( DeleteMicrotaskError, APIError );

DeleteMicrotaskError.prototype.name = 'DeleteMicrotaskError';
// Custom error IDs
DeleteMicrotaskError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  params: {
    microtask: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'microtask',

  // The API method to implement.
  method: 'DELETE'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function removeTask( req, res, next ) {
  var id = req.query.microtask;
  log.trace( 'Removing microtask %s', id );

  var Microtask = CS.models.microtask;
  Microtask
    .findById( id )
    .exec( req.wrap( function( err, microtask ) {
      if ( err ) return next( err );

      if ( !microtask )
        return next( new DeleteMicrotaskError( DeleteMicrotaskError.NOT_FOUND, 'Microtask not found' ) );

      microtask.remove( function( err ) {
        if ( err ) return next( err );

        log.trace( 'Microtask removed' );
        return res.json( {
          message: 'Good by microtask... we will miss you...'
        } );
      } );
    } ) );
};


// Export the API object
exports = module.exports = API;