

'use strict';
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Close object' } );

// Generate custom error `CloseObjectError` that inherits
// from `APIError`
var APIError = require( './error' );
var CloseObjectError = function( id, message, status ) {
  CloseObjectError.super_.call( this, id, message, status );
};
util.inherits( CloseObjectError, APIError );

CloseObjectError.prototype.name = 'CloseObjectError';
// Custom error IDs
CloseObjectError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'object/:id/close',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function closeObject( req, res, next ) {
  var id = req.params.id;
  log.trace( 'Closing object %s', id );

  var ObjectModel = CS.models.object;
  ObjectModel
  .findById( id )
  .exec( req.wrap( function( err, object ) {
    if( err ) return next( err );

    if( !object )
      return next( new CloseObjectError( CloseObjectError.NOT_FOUND, 'Object not found' ) );

    object.close( req.wrap( function( err ) {
      if( err ) return next( err );

      log.debug( 'Object %s closed', id );
      res.json( object );
    } ) );
  } ) );
};


// Export the API object
exports = module.exports = API;