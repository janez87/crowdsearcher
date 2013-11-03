

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import the CRM
var CRM = require( '../core/CRM' );

// Import the required Models
var Task = CS.models.task;
var Job = CS.models.job;
var Operation = CS.models.operation;
var Platform = CS.models.platform;

// Use a child logger
var log = CS.log.child( { component: 'Finalize Task' } );

// Generate custom error `FinalizeTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var FinalizeTaskError = function( id, message, status ) {
  FinalizeTaskError.super_.call( this, id, message, status );
};
util.inherits( FinalizeTaskError, APIError );

FinalizeTaskError.prototype.name = 'FinalizeTaskError';
// Custom error IDs
FinalizeTaskError.WRONG_JOB_ID = 'WRONG_JOB_ID';


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],

  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'finalize',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function finalizeTask( req, res, next ) {
  log.trace( 'Task poster' );

  var Task = req.queryObject;

  Task
  .exec(req.wrap(function(err,task){
    if (err) return next(err);

    log.trace('Task %s retrieved',task.id);
    task.finalizeTask(function(err){
      if(err) return next(err);

      res.status(200);
      res.json({});
    });
  }));
};


// Export the API object
exports = module.exports = API;