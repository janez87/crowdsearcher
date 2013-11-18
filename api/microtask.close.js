

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Close microtask' } );

// Generate custom error `CloseMicrotaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var CloseMicrotaskError = function( id, message, status ) {
  CloseMicrotaskError.super_.call( this, id, message, status );
};
util.inherits( CloseMicrotaskError, APIError );

CloseMicrotaskError.prototype.name = 'CloseMicrotaskError';
// Custom error IDs
CloseMicrotaskError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'microtask/:id/close',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function closeMicrotask( req, res, next ) {
  var id = req.params.id;
  log.trace( 'Closing microtask %s', id );

  var Microtask = CS.models.microtask;
  Microtask
  .findById( id )
  .exec( req.wrap( function( err, microtask ) {
    if( err ) return next( err );

    if( !microtask )
      return next( new CloseMicrotaskError( CloseMicrotaskError.NOT_FOUND, 'Microtask not found' ) );

    microtask.close( req.wrap( function( err ) {
      if( err ) return next( err );

      log.debug( 'Microtask %s closed', id );
      res.json( microtask );
    } ) );
  } ) );
};


// Export the API object
exports = module.exports = API;