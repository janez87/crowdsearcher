

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
var log = CS.log.child( { component: 'Post Task' } );

// Generate custom error `PostTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostTaskError = function( id, message, status ) {
  PostTaskError.super_.call( this, id, message, status );
};
util.inherits( PostTaskError, APIError );

PostTaskError.prototype.name = 'PostTaskError';
// Custom error IDs
PostTaskError.WRONG_JOB_ID = 'WRONG_JOB_ID';


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskData'
  ],

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postTask( req, res, next ) {
  log.trace( 'Task poster' );

  // Avoid pollution of the original object
  var rawTask = _.clone( req.body );

  // Temp trick to add the objects later
  var alias = rawTask.alias;
  var objects = rawTask.objects;
  var operations = rawTask.operations;
  var platforms = rawTask.platforms;
  delete rawTask.alias;
  delete rawTask.objects;
  delete rawTask.operations;
  delete rawTask.platforms;

  var task = new Task( rawTask );

  var createAndSavePlatforms = function( callback ) {
    Platform
    .create( platforms, req.wrap( function( err ) {
      if( err )  return callback( err );

      task.platforms = _.toArray( arguments ).slice( 1 );

      return callback();
    } ) );
  };

  var createAndSaveOperations = function( callback ) {
    Operation
    .create( operations, req.wrap( function( err ) {
      if( err )  return callback( err );

      task.operations = _.toArray( arguments ).slice( 1 );

      return callback();
    } ) );
  };

  var createJob = function( callback ) {
    var rawJob = {
      name: task.name + ' Job',
      alias: alias
    };

    var job = new Job( rawJob );
    log.trace( 'Creating job %s with alias %s', job.name, job.alias );

    log.trace( 'Type of job.save', typeof job.save );

    req.wrap( 'save', job )( function( err, job ) {
      if( err ) return callback( err );

      log.trace( 'Job %s created!', job.id );

      // Save the `Job` in the request.
      req.job = job;

      // Assign the job to the task
      task.job = job._id;

      return callback();
    } );
  };

  var getJob = function( callback ) {
    if( !_.isUndefined( rawTask.job ) ) {
      log.trace( 'Retrieving the job for the Task' );
      Job
      .findById( rawTask.job )
      .exec( req.wrap( function( err, job ) {
        if( err ) return callback( err );

        if( !job ) return callback( new PostTaskError( PostTaskError.WRONG_JOB_ID, 'Wrong Job id', APIError.BAD_REQUEST ) );

        // Save the `Job` in the request.
        req.job = job;

        // Assign the job to the task
        task.job = job.id;

        return callback();
      } ) );
    } else {
      log.trace( 'Creating Job for Task' );
      return createJob( callback );
    }
  };

  var saveTask = function( callback ) {
    log.trace( 'Creating Task' );
    req.wrap( 'save', task )( callback );
  };
  var addTaskToJob = function( callback ) {
    req.job.addTask( task, req.wrap( callback ) );
  };

  var addObjectsToTask = function( callback ) {
    if( objects && objects.length>0 ) {
      task.addObjects( objects, req.wrap( callback ) );
    } else {
      return callback();
    }
  };

  // Run the functions in series
  async.series( [
    getJob,
    createAndSavePlatforms,
    createAndSaveOperations,
    saveTask,
    addTaskToJob,
    addObjectsToTask
  ], function( err ) {
    if( err ) return next( err );

    // Trigger the ADD_TASK event
    CRM.execute( 'ADD_TASK', { task: task }, function( err ) {
      if( err ) return next( err );

      return res.json( {
        task: task.id,
        job: task.job
      } );
    } );

  } );
};


// Export the API object
exports = module.exports = API;