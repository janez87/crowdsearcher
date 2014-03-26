// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( {
  component: 'Redo Object API'
} );

// Generate custom error `RedoObjectError` that inherits
// from `APIError`
var APIError = require( './error' );
var RedoObjectError = function( id, message, status ) {
  RedoObjectError.super_.call( this, id, message, status );
};
util.inherits( RedoObjectError, APIError );

RedoObjectError.prototype.name = 'RedoObjectError';
// Custom error IDs
RedoObjectError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'object/:id/redo',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function redoObject( req, res, next ) {
  var id = req.params.id;
  log.trace( 'Redoing the object %s', id );

  var CrowObject = CS.models.object;
  CrowObject
    .findById( id )
    .exec( req.wrap( function( err, object ) {
      if ( err ) return next( err );

      if ( !object )
        return next( new RedoObjectError( RedoObjectError.NOT_FOUND, 'Object not found' ) );

      object.redo( req.wrap( function( err ) {
        if ( err ) return next( err );

        log.debug( 'Object %s Redoed', id );
        res.json( {
          object: object
        } );
      } ) );
    } ) );
};


// Export the API object
exports = module.exports = API;