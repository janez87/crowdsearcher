

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Post OpenTask' } );

// Generate custom error `PostOpenTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostOpenTaskError = function( id, message, status ) {
  PostOpenTaskError.super_.call( this, id, message, status );
};
util.inherits( PostOpenTaskError, APIError );

PostOpenTaskError.prototype.name = 'PostOpenTaskError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],

  // List of API parameters. In the format
  //      name: required?
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'opentask',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postTask( req, res, next ) {
  log.trace( 'Task open' );

  var query = req.queryObject;
  // Exec the query and open the task
  query.exec( req.wrap( function( err, task ) {
    if( err ) return next( err );

    task.open( req.wrap( function( err ) {
      if( err ) return next( err );
      res.json( {
        id: task._id
      } );
    } ) );
  } ) );

  /*
  req.task.open( req.wrap( function( err ) {
    if( err ) return next( err );

    log.info( 'Task %s opened', req.task.id );

    res.json( {} );
  } ) );
  */
};


// Export the API object
exports = module.exports = API;