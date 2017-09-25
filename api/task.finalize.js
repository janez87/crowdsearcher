

'use strict';
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Finalize task' } );

// Generate custom error `FinalizeTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var FinalizeTaskError = function( id, message, status ) {
  FinalizeTaskError.super_.call( this, id, message, status );
};
util.inherits( FinalizeTaskError, APIError );

FinalizeTaskError.prototype.name = 'FinalizeTaskError';
// Custom error IDs
FinalizeTaskError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task/:id/finalize',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function finalizeTask( req, res, next ) {
  var id = req.params.id;
  log.trace( 'Finalizing task %s', id );

  var Task = CS.models.task;
  Task
  .findById( id )
  .exec( req.wrap( function( err, task ) {
    if( err ) return next( err );

    if( !task )
      return next( new FinalizeTaskError( FinalizeTaskError.NOT_FOUND, 'Task not found' ) );

    task.finalize( req.wrap( function( err ) {
      if( err ) return next( err );

      log.debug( 'Task %s finalized', id );
      res.json( task );
    } ) );
  } ) );
};


// Export the API object
exports = module.exports = API;