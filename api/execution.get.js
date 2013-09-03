
// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var nconf = require( 'nconf' );

// Use a child logger
var log = common.log.child( { component: 'Get Execution' } );

// Import models
var Job = common.models.job;
var Task = common.models.task;
var Microtask = common.models.microtask;
var Execution = common.models.execution;
var Performer = common.models.user;

// Generate custom error `GetExecutionError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetExecutionError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetExecutionError.super_.call( this, id, message, status );
};
util.inherits( GetExecutionError, APIError );

GetExecutionError.prototype.name = 'GetExecutionError';
// Custom error IDs
GetExecutionError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';
GetExecutionError.CLOSED_MICROTASK = 'CLOSED_MICROTASK';
GetExecutionError.CLOSED_TASK = 'CLOSED_TASK';
GetExecutionError.CLOSED_JOB = 'CLOSED_JOB';


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    job: false,
    alias: false,
    task: false,
    microtask: false,
    execution: false,
    performer: false
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'execution',

  // The API method to implement.
  method: 'GET'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function getExecution( req, res, next ) {
  log.trace( 'Execution get' );

  // Get the passed ids
  var alias = req.query.alias;
  var jobId = req.query.job;
  var taskId = req.query.task;
  var microtaskId = req.query.microtask;
  var executionId = req.query.execution;
  var performer = req.query.performer;

  // At least one the parameters must be passed
  if( !alias && !jobId && !taskId && !microtaskId && !executionId )
    return next ( new GetExecutionError( GetExecutionError.MISSING_PARAMETERS,'All the parameter are undefined',APIError.BAD_REQUEST ) );

  // ## Functions

  // ### Execution
  // Create and save an `Execution` object.
  var createExecution = function( data, callback ) {
    log.trace( 'Create execution' );

    // Create execution
    var rawExecution = {
      job: data.task.job,
      task: data.task,
      microtask: data.microtask,
      platform: data.platform,
      performer: data.performer,
      operations: data.microtask.operations
    };

    // Create and save execution
    Execution.create( rawExecution, req.wrap( callback ) );
  };

  // ### Microtask
  // Used to retrieve the microtask given the ID.
  var retrieveMicroTask = function( id, callback ) {
    Microtask
    .findOne()
    .where( '_id', id )
    .where( 'status' ).ne( 50 ) //TODO: use constant
    .populate( 'task operations platforms' )
    .exec( req.wrap( function( err, microtask ) {
      if( err ) return callback( err );

      if( !microtask )
        return callback( new GetExecutionError( GetExecutionError.CLOSED_MICROTASK, 'Closed or unavailable microtask' ) );

      if( microtask.task.status===50 )
        return callback( new GetExecutionError( GetExecutionError.CLOSED_TASK, 'Task is closed' ) );

      var data = {
        microtask: microtask,
        task: microtask.task
      };
      return callback( null, data );
    } ) );
  };
  // Used to assign a `microtask` from a `task` by invoking the Microtask Assignment strategy.
  var assignMicroTask = function( data, callback ) {
    var task = data.task;
    var performer = data.performer;

    task
    .performMicroTaskAssigmentStrategy( {
      task: task,
      performer: performer
    }, req.wrap( function( err, microtask ) {
      // Add the microtask to the data object.
      data.microtask = microtask;
      return callback( err, data );
    } ) );
  };

  // ### Task
  // Used to retrieve the task given the ID.
  var retrieveTask = function( id, callback ) {

    Task
    .findOne()
    .where( '_id', id )
    .where( 'status' ).ne( 50 ) //TODO: use constant
    .exec( req.wrap( function( err, task ) {
      if( err ) return callback( err );

      if( !task )
        return callback( new GetExecutionError( GetExecutionError.CLOSED_TASK, 'Closed or unavailable task' ) );

      var data = {
        task: task
      };
      return callback( null, data );
    } ) );
  };
  // Used to assign a `task` from a `job` by invoking the Task Assignment strategy.
  var assignTask = function( data, callback ) {
    var job = data.job;

    job
    .performTaskAssigmentStrategy( {
      job: job,
      performer: performer
      //TODO: Put something here???
    }, req.wrap( function( err, task ) {
      // Add the task to the data object.
      data.task = task;
      return callback( err, data );
    } ) );
  };


  // ### Job
  var retrieveJob = function( id, callback ) {
    Job
    .findById( id )
    .where( 'status' ).ne( 50 ) // TODO: use constant
    .exec( req.wrap( function( err, job ) {
      if( err ) return callback( err );

      if( !job )
        return callback( new GetExecutionError( GetExecutionError.CLOSED_JOB, 'Closed or unavailable job' ) );

      var data = {
        job: job
      };
      return callback( null, data );
    } ) );
  };
  // Used to retrieve the job with an alias
  var retrieveAlias = function( alias, callback ) {
    log.trace( 'Searching job for alias %s', alias );

    Job
    .findByAlias( alias )
    .where( 'status' ).ne( 50 ) // TODO: use constant
    .exec( req.wrap( function( err, job ) {
      if( err ) return callback( err );

      if( !job )
        return callback( new GetExecutionError( GetExecutionError.CLOSED_JOB, 'Closed or unavailable job' ) );

      log.trace( 'Got job %s (%s)', job.name, job._id );

      var data = {
        job: job
      };

      return callback( null, data );
    } ) );
  };

  // ### Platform
  var assignPlatform = function( data, callback ) {
    var task = data.task;
    var microtask = data.microtask;
    var performer = data.performer;

    task
    .performImplementationStrategy( {
      task: task,
      microtask: microtask,
      performer: performer
    }, req.wrap( function( err, platform ) {
      // Pass to the following function in the chain
      // the `task`, `microtask` and the `platform`.

      // Add the task to the data object.
      data.platform = platform;
      return callback( err, data );
    } ) );
  };

  // ### Performer
  var getPerformer = function( data, callback ) {
    var task = data.task;

    // If task is public then skip `performer` check.
    if( !task.isPrivate() )
      return callback( null, data );

    // User already logged, pass the id..
    if( req.isAuthenticated() ) {
      data.performer = req.user;
      return callback( null, data );
    }


    // Performer passed as a parameter
    if( performer ) {

      // Get the performer from the DB
      return Performer
      .findById( performer )
      .exec( req.wrap( function( err, performer ) {
        if( err ) return callback( err );

        if( !performer ) return callback( new GetExecutionError( GetExecutionError.BAD_PERFORMER, 'Unable to find the specified performer' ) );

        data.performer = performer;

        delete req.query.performer;
        return callback( null, data );
      } ) );
    }

    // User not logged, save the url and redirect to login page. Remove the initial `/`.
    req.session.destination = req.originalUrl.slice(1);

    // Save in session the provenance of the user
    req.session.from = req.query.from;
    // Paramter used, remove it
    delete req.query.from;

    log.trace( 'User unauthorized, sending redirect' );
    res.format( {
      html: function() {

        // Break out of the async cycle and request a user login
        var baseURL = nconf.get( 'webserver:externalAddress' );
        return res.redirect( baseURL+'login' );
      },
      json: function() {
        return res.json( APIError.UNAUTHORIZED, {
          id: 'UNAUTHORIZED',
          message: 'A user must be provided while using a JSON request for a private Task',
          requestedUrl: req.session.destination
        } );
      }
    } );
  };


  // ## Main API logic
  // Empty placeholder for functions to execute.
  var actions = [
    assignPlatform,
    createExecution
  ];

  if( executionId ) {
    // We got an execution Id, so we just need to retrieve it from Mongo.
    req.queryObject = Execution.findById( executionId );

    delete req.query.execution;
    // Pass to the next middleware to hadle filters, population etc...
    return next();
  } else if( microtaskId ) {
    // In this case we need to get the task from the microtask first and then
    // create an execution.
    // *Note*: can casue some erroneous behavuoir in case of complex
    // Microtask Assignment strategies
    actions.unshift(
      _.partial( retrieveMicroTask, microtaskId ),
      getPerformer
    );
    delete req.query.microtask;
  } else if( taskId ) {
    // If the Task id was passed then we need to get a microtask using the
    // assigment strategy and create the execution.
    actions.unshift(
      _.partial( retrieveTask, taskId ),
      getPerformer,
      assignMicroTask
    );
    delete req.query.task;
  } else if( alias ) {
    // If the *alias* was passed then we need to get first the Task, then a
    // microtask using the assigment strategy and create the execution.
    actions.unshift(
      _.partial( retrieveAlias, alias ),
      assignTask,
      getPerformer,
      assignMicroTask
    );
    delete req.query.alias;
  } else if( jobId ) {
    // If the Job id was passed then we need to get a task using the
    // assigment strategy, and proceed like we have the task Id.
    actions.unshift(
      _.partial( retrieveJob, jobId ),
      assignTask,
      getPerformer,
      assignMicroTask
    );
    delete req.query.job;
  }

  async.waterfall( actions, function( err, execution ) {
    if( err ) return next( err );

    log.trace( 'Completed assignment chain, got execution %s', execution.id );

    req.queryObject = Execution.findById( execution.id );

    return next();
  } );
};


// Export the API object
exports = module.exports = API;