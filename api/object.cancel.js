'use strict';
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( {
  component: 'Cancel Object API'
} );

// Generate custom error `CancelObjectError` that inherits
// from `APIError`
var APIError = require( './error' );
var CancelObjectError = function( id, message, status ) {
  CancelObjectError.super_.call( this, id, message, status );
};
util.inherits( CancelObjectError, APIError );

CancelObjectError.prototype.name = 'CancelObjectError';
// Custom error IDs
CancelObjectError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'object/:id/cancel',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function CancelObject( req, res, next ) {
  var id = req.params.id;
  log.trace( 'Cancelling the object %s', id );

  var ObjectModel = CS.models.object;
  ObjectModel
    .findById( id )
    .exec( req.wrap( function( err, object ) {
      if ( err ) return next( err );

      if ( !object )
        return next( new CancelObjectError( CancelObjectError.NOT_FOUND, 'Object not found' ) );

      object.cancel( req.wrap( function( err ) {
        if ( err ) return next( err );

        log.debug( 'Object %s Canceled', id );
        res.json( {
          object: object
        } );
      } ) );
    } ) );
};


// Export the API object
exports = module.exports = API;