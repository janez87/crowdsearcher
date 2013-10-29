

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Delete Task' } );


// Mongo models

// Generate custom error `DeleteTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var DeleteTaskError = function( id, message, status ) {
  DeleteTaskError.super_.call( this, id, message, status );
};
util.inherits( DeleteTaskError, APIError );

DeleteTaskError.prototype.name = 'DeleteTaskError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  checks: [
    'checkTaskId'
  ],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task',

  // The API method to implement.
  method: 'DELETE'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function removeTask( req, res, next ) {
  log.trace( 'Removing Task %s', req.query.task );

  var query = req.queryObject;

  query
  .remove()
  .exec( req.wrap( function( err, task ) {
    if( err ) return next( err );

    log.trace( 'task %s (%s) removed', task._id, task.name );
    res.json( task );
  } ) );
};


// Export the API object
exports = module.exports = API;