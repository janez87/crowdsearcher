

// Load libraries
var _  = require('underscore');
var util  = require('util');
var CS = require( '../../core' );

// Import a child Logger
//var log = CS.log.child( { component: 'Check MicroTask ID' } );

// Import the Job Model
var Microtask = CS.models.microtask;

// Generate custom error `CheckMicroTaskIdError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckMicroTaskIdError = function( id, message, status ) {
  CheckMicroTaskIdError.super_.call( this, id, message, status );
};
util.inherits( CheckMicroTaskIdError, APIError );

CheckMicroTaskIdError.prototype.name = 'CheckMicroTaskIdError';
// Custom error IDs
CheckMicroTaskIdError.MICROTASK_NOT_FOUND = 'MICROTASK_NOT_FOUND';
CheckMicroTaskIdError.INVALID_MICROTASK_ID = 'INVALID_MICROTASK_ID';



// Export middleware
exports = module.exports = function checkMicroTaskId( req, res, next ) {

  // Get the id from the query string
  var id = req.query.microtask;

  // Check id
  if( _.isUndefined( id ) || (id.length===0) )
    return next( new CheckMicroTaskIdError( CheckMicroTaskIdError.INVALID_MICROTASK_ID, 'Empty MicroTask ID', APIError.BAD_REQUEST ) );

  // Create a Query and save it to `req.queryObject`
  req.queryObject = Microtask.findById( id );

  return next();
  /*
  // Query the db for the Microtask
  MicroTask.findById( id, req.wrap( function( err, microtask ) {
    if( err ) return next( err );

    if( !microtask )
      return next( new CheckMicroTaskIdError( CheckMicroTaskIdError.MICROTASK_NOT_FOUND, 'MicroTask not found', APIError.NOT_FOUND ) );

    log.trace( 'MicroTask %s ok', id );

    // Pass the retrieved microtask
    req.microtask = microtask;

    return next();
  } ) );
  */
};