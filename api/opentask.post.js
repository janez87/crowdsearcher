

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Open task' } );

// Generate custom error `OpenTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var OpenTaskError = function( id, message, status ) {
  OpenTaskError.super_.call( this, id, message, status );
};
util.inherits( OpenTaskError, APIError );

OpenTaskError.prototype.name = 'OpenTaskError';
// Custom error IDs
OpenTaskError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required?
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task/open',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function openTask( req, res, next ) {
  var id = req.query.task;
  log.trace( 'Open task %s', id );

  var Task = CS.models.task;
  Task
  .findById( id )
  .exec( req.wrap( function( err, task ) {
    if( err ) return next( err );

    if( !task )
      return next( new OpenTaskError( OpenTaskError.NOT_FOUND, 'Task not found' ) );

    task.open( req.wrap( function( err ) {
      if( err ) return next( err );

      res.json( task );
    } ) );
  } ) );
};


// Export the API object
exports = module.exports = API;