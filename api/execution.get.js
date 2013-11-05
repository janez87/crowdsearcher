
// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var nconf = require( 'nconf' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Get Execution' } );

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
  var executionId = req.query.execution;
  var performerId = req.query.performer;

  var data = {};

  // At least one the parameters must be passed
  if( !alias && !jobId && !taskId && !executionId )
    return next ( new GetExecutionError( GetExecutionError.MISSING_PARAMETERS,'All the parameter are undefined',APIError.BAD_REQUEST ) );

  // # Get Execution
  //
  // Get the execution based on the passed query parameter

  // ## From Job
  //
  // ### Get Job by `alias`
  //
  if( jobId || alias ) {
    var jobQuery = Job.findOne();

    if( jobId )
      jobQuery.where( '_id', jobId );

    if( alias )
      jobQuery.where( 'alias', alias );

    // Retrieve the job
    return jobQuery.exec( req.wrap( function( err, job ) {
      if( err ) return next( err );

      if( !job )
        return next( new Error( 'No job found' ) );

      // Now we have the id of the Task, proceed as if we got th task id
      // from the query parameter.
      job.assign( null, function( err, id ) {
        if( err ) return next( err );

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
      if( err ) return callback( err );

      if( !task )
        return callback( new Error( 'No task retrieved' ) );

      if( task.closed )
        return callback( new Error( 'Task closed, cannot get an execution' ) );

      if( task.created )
        return callback( new Error( 'Task not yet opened, cannot get an execution' ) );

      execution.task = task;
      data.task = task;
      return callback();
    } ) );
  }

  function checkPerformer( callback ) {
    var task = data.task;
    if( !task.private )
      return callback();

    if( req.isAuthenticated() ) {
      execution.performer = req.user._id;
      return callback();
    }

    // Must check the passed performer.
    if( performerId ) {
      return User
      .findById( performerId )
      .exec( req.wrap( function( err, user ) {
        if( err ) return callback( err );

        if( !user )
          return callback( new Error( 'No user retrieved' ) );

        execution.performer = user;
        data.user = user;
        return callback();
      } ) );
    }

    // Otherwise must require the user to login.
    req.session.destination = req.originalUrl.slice(1);

    // Save in session the provenance of the user
    req.session.from = req.query.from;

    // Exit and request login
    return res.format( {
      html: function() {
        var baseURL = nconf.get( 'webserver:externalAddress' );
        return res.redirect( baseURL+'login' );
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
    task.assign( {
      performer: execution.performer
    }, req.wrap( function( err, id ) {
      if( err ) return callback( err );

      execution.microtask = id;
      return callback();
    } ) );
  }

  function checkMicrotask( callback ) {
    Microtask
    .findById( execution.microtask )
    .exec( req.wrap( function( err, microtask ) {
      if( err ) return callback( err );

      if( !microtask )
        return callback( new Error( 'No microtask retrieved' ) );

      if( microtask.closed )
        return callback( new Error( 'Microtask closed, cannot get an execution' ) );

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
      if( err ) return callback( err );

      execution.platform = id;
      return callback();
    } ) );
  }

  function checkPlatform( callback ) {
    Platform
    .findById( execution.platform )
    .exec( req.wrap( function( err, platform ) {
      if( err ) return callback( err );

      if( !platform )
        return callback( new Error( 'No platform retrieved' ) );

      if( !platform.enabled )
        return callback( new Error( 'Platform not enabled' ) );

      if( !platform.execution )
        return callback( new Error( 'Platform not enabled for execution' ) );

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

  function doActions() {
    async.series( actions, function( err ) {
      if( err ) return next( err );

      log.debug( 'Got execution %s', execution._id );
      return res.json( execution.toObject( { getters: true } ) );
    } );
  }

  if( executionId ) {
    req.queryObject = Execution.findById( executionId );
    return next();
  } else {
    return doActions();
  }
};


// Export the API object
exports = module.exports = API;