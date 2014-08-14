// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var nconf = require( 'nconf' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( {
  component: 'Get Execution'
} );

// Import models
var Job = CS.models.job;
var Task = CS.models.task;
var Microtask = CS.models.microtask;
var Platform = CS.models.platform;
var Execution = CS.models.execution;
var User = CS.models.user;

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
GetExecutionError.CLOSED_TASK = 'CLOSED_TASK';
GetExecutionError.TASK_NOT_OPENED = 'TASK_NOT_OPENED';
GetExecutionError.JOB_NOT_FOUND = 'JOB_NOT_FOUND';
GetExecutionError.TASK_NOT_FOUND = 'TASK_NOT_FOUND';
GetExecutionError.MICROTASK_NOT_FOUND = 'MICROTASK_NOT_FOUND';
GetExecutionError.CLOSED_MICROTASK = 'CLOSED_MICROTASK';
GetExecutionError.USER_NOT_FOUND = 'USER_NOT_FOUND';
GetExecutionError.USER_BANNED = 'USER_BANNED';
GetExecutionError.PLATFORM_NOT_FOUND = 'PLATFORM_NOT_FOUND';
GetExecutionError.PLATFORM_NOT_ENABLED = 'PLATFORM_NOT_ENABLED';
GetExecutionError.PLATFORM_NOT_EXECUTABLE = 'PLATFORM_NOT_EXECUTABLE';
GetExecutionError.MISSING_USER_PLATFORM = 'MISSING_USER_PLATFORM';


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
  log.trace( 'Getting execution' );

  // Get the passed ids
  var alias = req.query.alias;
  var jobId = req.query.job;
  var taskId = req.query.task;
  var microTaskId = req.query.microtask;
  var executionId = req.query.execution;
  var performerId = req.query.performer;
  var username = req.query.username;

  var data = {};

  // At least one the parameters must be passed
  if ( !alias && !jobId && !taskId && !microTaskId && !executionId )
    return next( new GetExecutionError( GetExecutionError.MISSING_PARAMETERS, 'All the parameter are undefined', APIError.BAD_REQUEST ) );

  // # Get Execution
  //
  // Get the execution based on the passed query parameter

  // ## From Job
  //
  // ### Get Job by `alias`
  //
  if ( jobId || alias ) {
    var jobQuery = Job.findOne();

    if ( jobId )
      jobQuery.where( '_id', jobId );

    if ( alias )
      jobQuery.where( 'alias', alias );

    // Retrieve the job
    return jobQuery.exec( req.wrap( function( err, job ) {
      if ( err ) return next( err );

      if ( !job )
        return next( new GetExecutionError( GetExecutionError.JOB_NOT_FOUND, 'No job found' ) );

      // Now we have the id of the Task, proceed as if we got th task id
      // from the query parameter.
      job.assign( null, function( err, id ) {
        if ( err ) return next( err );

        taskId = id;
        return doActions();
      } );
    } ) );
  }


  // ## Normal flow
  //
  // Entry point for performing the get execution flow.
  var execution = new Execution( {} );

  function checkTask( callback ) {
    Task
      .findById( taskId )
      .exec( req.wrap( function( err, task ) {
        if ( err ) return callback( err );

        if ( !task )
          return callback( new GetExecutionError( GetExecutionError.TASK_NOT_FOUND, 'No task retrieved' ) );

        if ( task.closed )
          return callback( new GetExecutionError( GetExecutionError.CLOSED_TASK, 'Task closed, cannot get an execution' ) );

        if ( task.created )
          return callback( new GetExecutionError( GetExecutionError.TASK_NOT_OPENED, 'Task not yet opened, cannot get an execution' ) );

        execution.task = task;
        data.task = task;
        return callback();
      } ) );
  }

  function checkPerformer( callback ) {
    var task = data.task;
    if ( !task.private )
      return callback();

    if ( req.isAuthenticated() ) {
      execution.performer = req.user._id;
      return callback();
    }

    // Must create a User based on the username + platform combination
    if( username ) {
      // Try to find the user by username
      return User
      .findByUsername( username, function( err, user ) {
        // if not found create one
        if( err ) {
          var platform = req.query.platform;
          if( !platform )
            return callback( new GetExecutionError( GetExecutionError.MISSING_USER_PLATFORM, 'Cannot create new user without a platform parameter' ) );

          var newUser = User.createWithAccount( platform, {
            username: username
          } );

          return req.wrap( 'save', newUser )( function( err, savedUser ) {
            if( err ) return callback( err );

            execution.performer = savedUser;
            data.user = savedUser;
            return callback();
          } );
        // otherwise return it
        } else {
          execution.performer = user;
          data.user = user;
          return callback();
        }
      } );
    }

    // Must check the passed performer.
    if ( performerId ) {
      return User
        .findById( performerId )
        .exec( req.wrap( function( err, user ) {
          if ( err ) return callback( err );

          if ( !user )
            return callback( new GetExecutionError( GetExecutionError.USER_NOT_FOUND, 'No user retrieved' ) );

          execution.performer = user;
          data.user = user;
          return callback();

        } ) );
    }

    // Otherwise must require the user to login.
    req.session.destination = req.originalUrl.slice( 1 );

    // Save in session the provenance of the user
    req.session.from = req.query.from;

    // Exit and request login
    return res.format( {
      html: function() {
        var baseURL = nconf.get( 'webserver:externalAddress' );
        return res.redirect( baseURL + 'login' );
      },
      json: function() {
        return res.json( APIError.UNAUTHORIZED, {
          id: 'UNAUTHORIZED',
          message: 'A user must be provided for this Task',
          requestedUrl: req.session.destination
        } );
      }
    } );
  }

  function assignMicrotask( callback ) {
    var task = data.task;

    task.isBanned( execution.performer, function( err, banned ) {
      if ( err ) return callback( err );

      if ( banned ) return callback( new GetExecutionError( GetExecutionError.USER_BANNED, 'The user is not allowed to perform this task', APIError.FORBIDDEN ) );

      // Give the selected microtask or assign a new one
      if( execution.microtask ) {
        return callback();
      } else {
        task.assign( {
          performer: execution.performer
        }, req.wrap( function( err, id ) {
          if ( err ) return callback( err );

          execution.microtask = id;
          return callback();
        } ) );
      }

    } );
  }

  function checkMicrotask( callback ) {
    Microtask
      .findById( execution.microtask )
      .exec( req.wrap( function( err, microtask ) {
        if ( err ) return callback( err );

        if ( !microtask )
          return callback( new GetExecutionError( GetExecutionError.MICROTASK_NOT_FOUND, 'No microtask retrieved' ) );

        if ( microtask.closed )
          return callback( new GetExecutionError( GetExecutionError.CLOSED_MICROTASK, 'Microtask closed, cannot get an execution' ) );

        data.microtask = microtask;
        return callback();
      } ) );
  }

  function assignPlatform( callback ) {
    var task = data.task;
    task.implementation( {
      microtask: execution.microtask,
      performer: execution.performer
    }, req.wrap( function( err, id ) {
      if ( err ) return callback( err );

      execution.platform = id;
      return callback();
    } ) );
  }

  function checkPlatform( callback ) {
    Platform
      .findById( execution.platform )
      .exec( req.wrap( function( err, platform ) {
        if ( err ) return callback( err );

        if ( !platform )
          return callback( new GetExecutionError( GetExecutionError.PLATFORM_NOT_FOUND, 'No platform retrieved' ) );

        if ( !platform.enabled )
          return callback( new GetExecutionError( GetExecutionError.PLATFORM_NOT_ENABLED, 'Platform not enabled' ) );

        if ( !platform.execution )
          return callback( new GetExecutionError( GetExecutionError.PLATFORM_NOT_EXECUTABLE, 'Platform not enabled for execution' ) );

        data.platform = platform;
        return callback();
      } ) );
  }

  function saveExecution( callback ) {
    req.wrap( 'save', execution )( callback );
  }

  var actions = [
    checkTask,
    checkPerformer,
    assignMicrotask,
    checkMicrotask,
    assignPlatform,
    checkPlatform,
    saveExecution
  ];



  // ## From Microtask
  if( microTaskId ) {

    // Save the microtask ID
    execution.microtask = microTaskId;

    // Get the task Id from the microtask
    return Microtask
    .findById( microTaskId )
    .populate( 'task' )
    .exec( req.wrap( function( err, microtask ) {
      if( err ) return next( err );

      if( !microtask )
        return next( new GetExecutionError( GetExecutionError.MICROTASK_NOT_FOUND, 'No microtask retrieved' ) );

      taskId = microtask.task._id;//.toJSON(); // Convert to hex string

      // Proceed normally
      return doActions();
    } ) );
  }

  function doActions() {
    async.series( actions, function( err ) {
      if ( err ) return next( err );

      log.debug( 'Got execution %s', execution._id );
      return res.json( execution.toObject( {
        getters: true
      } ) );
    } );
  }

  if ( executionId ) {
    log.debug( 'with id %s', executionId );
    req.queryObject = Execution.findById( executionId );
    return next();
  } else {
    return doActions();
  }
};


// Export the API object
exports = module.exports = API;