

// Load libraries
var util = require( 'util' );

// Use a child logger
var log = common.log.child( { component: 'Get Task List' } );

// Generate custom error `GetTaskListError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetTaskListError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetTaskListError.super_.call( this, id, message, status );
};
util.inherits( GetTaskListError, APIError );

GetTaskListError.prototype.name = 'GetTaskListError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    job: true
  },
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'tasks',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getJob( req, res, next ) {
  var jobID = req.query.job;
  log.trace( 'Getting all the tasks for the job: %s', jobID );


  var Task = common.models.task;
  Task
  .find( { job: jobID } )
  .lean()
  .exec( req.wrap( function( err, tasks ) {
    if( err ) return next( err );

    res.json( tasks );
  } ) );
};


// Export the API object
exports = module.exports = API;