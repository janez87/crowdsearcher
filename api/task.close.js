

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Close task' } );

// Generate custom error `CloseTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var CloseTaskError = function( id, message, status ) {
  CloseTaskError.super_.call( this, id, message, status );
};
util.inherits( CloseTaskError, APIError );

CloseTaskError.prototype.name = 'CloseTaskError';
// Custom error IDs
CloseTaskError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task/:id/close',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function closeTask( req, res, next ) {
  var id = req.params.id;
  log.trace( 'Closing task %s', id );

  var Task = CS.models.task;
  Task
  .findById( id )
  .exec( req.wrap( function( err, task ) {
    if( err ) return next( err );

    if( !task )
      return next( new CloseTaskError( CloseTaskError.NOT_FOUND, 'Task not found' ) );

    task.close( req.wrap( function( err ) {
      if( err ) return next( err );

      log.debug( 'Task %s closed', id );
      res.json( task );
    } ) );
  } ) );
};


// Export the API object
exports = module.exports = API;