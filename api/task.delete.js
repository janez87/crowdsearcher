

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
  var id = req.query.task;
  log.trace( 'Removing task %s', id );

  var Task = CS.models.task;
  Task
  .findById( id )
  .remove()
  .exec( req.wrap( function( err ) {
    if( err ) return next( err );

    res.json( {
      message: 'Good by task... we will miss you...'
    } );
  } ) );
};


// Export the API object
exports = module.exports = API;