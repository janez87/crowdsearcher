

// Load libraries
var _  = require('underscore');
var util  = require('util');
var CS = require( '../../core' );

// Import a child Logger
//var log = CS.log.child( { component: 'Check Objects' } );

// Import the ObjectModel
var ObjectModel = CS.models.object;

// Generate custom error `CheckObjectError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckObjectError = function( id, message, status ) {
  CheckObjectError.super_.call( this, id, message, status );
};
util.inherits( CheckObjectError, APIError );

CheckObjectError.prototype.name = 'CheckObjectError';
// Custom error IDs
CheckObjectError.OBJECT_NOT_FOUND = 'OBJECT_NOT_FOUND';
CheckObjectError.INVALID_OBJECT_ID = 'INVALID_OBJECT_ID';



// Export middleware
exports = module.exports = function checkObjects( req, res, next ) {
  // Get the object from the querystring
  var id = req.query.object;

   // Check id
  if( _.isUndefined( id ) || (id.length===0) )
    return next( new CheckObjectError( CheckObjectError.INVALID_OBJECT_ID, 'Empty object ID', APIError.BAD_REQUEST ) );

  // Create a Query and save it to `req.queryObject`
  req.queryObject = ObjectModel.findById( id );

  return next();

  /*
  log.trace( 'Checking if object %s exists', id );
  // Query the db for the Object
  ObjectModel.findById( id, req.wrap( function( err, object ) {
    if( err ) return next( err );

    if( !object )
      return next( new CheckObjectError( CheckObjectError.OBJECT_NOT_FOUND, 'Object not found', APIError.NOT_FOUND ) );

    log.trace( 'Object %s ok', id );

    // Pass the retrieved Object
    req.object = object;

    return next();
  } ) );
  */
};