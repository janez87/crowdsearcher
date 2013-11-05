

// Load libraries
var util = require( 'util' );
var CS = require( '../core' );
var async = require( 'async' );

// Use a child logger
var log = CS.log.child( { component: 'Post MicroTask' } );


// Import the required Models
var MicroTask = CS.models.microtask;

// Generate custom error `PostMicroTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostMicroTaskError = function( id, message, status ) {
  /* jshint camelcase: false */
  PostMicroTaskError.super_.call( this, id, message, status );
};
util.inherits( PostMicroTaskError, APIError );

PostMicroTaskError.prototype.name = 'PostMicroTaskError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId',
    'checkObjects'
  ],


  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'microtask',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postMicroTask( req, res, next ) {
  log.trace( 'MicroTask poster' );

  var rawMicrotask = req.body;

  log.trace( 'Task is %s', req.task );
  log.trace( 'The objects to set are %s', req.objects.length );

  var microtask = new MicroTask( rawMicrotask );
  microtask.task = req.task;

  var addMicrotaskToTask = function( callback  ) {
    req.task.addMicrotasks( microtask, req.wrap(callback) );
  };

  var saveMicrotask = function( callback ) {
    microtask.save( req.wrap( callback ) );
  };

  async.series( [
    addMicrotaskToTask,
    saveMicrotask
  ], function( err ) {
    if( err ) return next( err );

    // Return the microtask Id
    return res.json( {
      microtask: microtask.id
    } );
  } );
};

// Export the API object
exports = module.exports = API;