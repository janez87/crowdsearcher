'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
let mongoose = require( 'mongoose' );

// Load my modules
let CS = require( '../core' );
let APIError = require( './error' );

// Constant declaration

// Module variables declaration
let User = CS.models.user;
let Task = CS.models.task;
let Job = CS.models.job;
let Microtask = CS.models.microtask;
let Platform = CS.models.platform;
let Execution = CS.models.execution;
let ObjectId = mongoose.Types.ObjectId;
let log = CS.log.child( {
  component: 'Get Execution',
} );

// Custom errors
class RequireAuthError extends APIError {}
class GetExecutionError extends APIError {}
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

// Module functions declaration
function checkJob( jobId ) {
  log.trace( 'Check if job %s is good', jobId );

  return Job
    .findById( jobId )
    .select( '-task -objects' )
    .exec()
    .then( job => {
      // Check if task is available
      if ( !job ) {
        let error = new GetExecutionError( GetExecutionError.TASK_NOT_FOUND, 'No job retrieved' );
        return Promise.reject( error );
      }

      return job;
    } );
}

function assignTask( data ) {
  let job = data.job;
  let performerId = data.performer;

  log.trace( 'Assign task to performer %s from job %s', performerId, job._id );
  let assign = Promise.promisify( job.assign, {
    multiArgs: true,
    context: job,
  } );

  return assign( {
    performer: performerId,
  } );
}

function checkTask( taskId ) {
  log.trace( 'Check if task %s is good', taskId );

  return Task
    .findById( taskId )
    .select( '-microtasks -objects' )
    .exec()
    .then( task => {
      // Check if task is available
      if ( !task ) {
        let error = new GetExecutionError( GetExecutionError.TASK_NOT_FOUND, 'No task retrieved' );
        return Promise.reject( error );
      }

      // Check if task is closed
      if ( task.closed ) {
        let error = new GetExecutionError( GetExecutionError.CLOSED_TASK, 'Task closed, cannot get an execution' );
        return Promise.reject( error );
      }

      // Check if task is created
      if ( task.created ) {
        let error = new GetExecutionError( GetExecutionError.TASK_NOT_OPENED, 'Task not yet opened, cannot get an execution' );
        return Promise.reject( error );
      }

      return task;
    } )
}

function checkPerformer( performerId, task ) {
  if ( !task.private ) {
    return null;
  }

  // Check passed performerId
  if ( performerId instanceof ObjectId || ObjectId.isValid( performerId ) ) {
    return User
      .findById( performerId )
      .select( '_id' )
      .lean()
      .exec()
      .then( performer => {
        if ( !performer ) {
          let error = new GetExecutionError( GetExecutionError.USER_NOT_FOUND, 'No user retrieved' )
          return Promise.reject( error );
        }

        log.trace( 'Got performer %s', performer._id );
        return performer._id;
      } );
  }

  // Use performerId as generic string username
  // Check passed username
  let username = performerId;
  if ( username ) {
    // TODO
  }


  return Promise.reject( new RequireAuthError() );
}

function assignMicrotask( data ) {
  let task = data.task;
  let performerId = data.performer;

  log.trace( 'Assign microtask to performer %s from task %s', performerId, task._id );

  return task
    .isBanned( performerId )
    .then( isBanned => {
      if ( isBanned ) {
        let error = new GetExecutionError( GetExecutionError.USER_BANNED, 'The user is not allowed to perform this task', APIError.FORBIDDEN );
        return Promise.reject( error );
      }

      let assign = Promise.promisify( task.assign, {
        multiArgs: true,
        context: task,
      } )

      // Assign microtask
      return assign( {
        performer: performerId,
      } );
    } );
}

function checkMicrotask( microtaskId ) {
  log.trace( 'Check if microtask %s is good', microtaskId );

  return Microtask
    .findById( microtaskId )
    .select( '-objects' )
    .exec()
    .then( microtask => {
      // Check if microtask is available
      if ( !microtask ) {
        let error = new GetExecutionError( GetExecutionError.MICROTASK_NOT_FOUND, 'No microtask retrieved' );
        return Promise.reject( error );
      }

      // Check if microtask is closed
      if ( microtask.closed ) {
        let error = new GetExecutionError( GetExecutionError.CLOSED_MICROTASK, 'Microtask closed, cannot get an execution' );
        return Promise.reject( error );
      }

      return microtaskId;
    } )
}

function assignPlatform( data ) {
  let task = data.task;
  let performerId = data.performer;
  let microtaskId = data.microtask;

  let assign = Promise.promisify( task.implementation, {
    multiArgs: true,
    context: task,
  } )

  // Assign microtask
  return assign( {
    performer: performerId,
    microtask: microtaskId,
  } );
}

function checkPlatform( platformId ) {
  log.trace( 'Check if platform %s is good', platformId );

  return Platform
    .findById( platformId )
    .exec()
    .then( platform => {
      if ( !platform ) {
        let error = new GetExecutionError( GetExecutionError.PLATFORM_NOT_FOUND, 'No platform retrieved' );
        return Promise.reject( error );
      }

      if ( !platform.enabled ) {
        let error = new GetExecutionError( GetExecutionError.PLATFORM_NOT_ENABLED, 'Platform not enabled' );
        return Promise.reject( error );
      }

      if ( !platform.execution ) {
        let error = new GetExecutionError( GetExecutionError.PLATFORM_NOT_EXECUTABLE, 'Platform not enabled for execution' );
        return Promise.reject( error );
      }

      return platformId;
    } );
}

function saveExecution( data ) {
  let execution = new Execution( data );

  return execution.save();
}

function getExecutionById( executionId ) {
  log.trace( 'Get by id: %s', executionId );

  let query = Execution.findById( executionId );
  return Promise.resolve( {
    queryObject: query
  } );
}

function getExecutionPromise( data ) {
  let promise = Promise.resolve();

  let taskId = data.task;
  let jobId = data.job;
  let microtaskId = data.microtask;
  let executionId = data.execution;
  let performerId = data.performer;

  debugger;
  // Check query parameters
  if ( !taskId && !microtaskId && !executionId && !jobId ) {
    let error = new GetExecutionError( GetExecutionError.MISSING_PARAMETERS, 'All the parameter are undefined', APIError.BAD_REQUEST );
    promise = Promise.reject( error );
  }

  let rawExecution = {};
  if ( jobId ) {
    promise =
      checkJob( jobId )
      .tap( job => rawExecution.job = job )
      .then( job => [ performerId, job ] )
      .spread( checkPerformer )
      .tap( myPerformerId => rawExecution.performer = myPerformerId )
      .return( rawExecution )
      .then( assignTask )
      .spread( checkTask )
      .tap( task => rawExecution.task = task ) // Associate task to execution
      // performer
      .then( task => [ performerId, task ] )
      .spread( checkPerformer )
      .tap( myPerformerId => rawExecution.performer = myPerformerId ) // Associate performer to execution
      // Microtask
      .return( rawExecution )
      .then( assignMicrotask )
      .then( checkMicrotask )
      .tap( myMicrotaskId => rawExecution.microtask = myMicrotaskId ) // Associate microtask to execution
      // Platform
      .return( rawExecution )
      .then( assignPlatform )
      .then( checkPlatform )
      .tap( platformId => rawExecution.platform = platformId ) // Associate platform to execution
      // Execution
      .return( rawExecution )
      .then( saveExecution );


  }
  // Create execution based on task
  else if ( taskId ) {
    promise = checkTask( taskId )
      .tap( task => rawExecution.task = task ) // Associate task to execution
      // Performer
      .then( task => [ performerId, task ] )
      .spread( checkPerformer )
      .tap( myPerformerId => rawExecution.performer = myPerformerId ) // Associate performer to execution
      // Microtask
      .return( rawExecution )
      .then( assignMicrotask )
      .then( checkMicrotask )
      .tap( myMicrotaskId => rawExecution.microtask = myMicrotaskId ) // Associate microtask to execution
      // Platform
      .return( rawExecution )
      .then( assignPlatform )
      .then( checkPlatform )
      .tap( platformId => rawExecution.platform = platformId ) // Associate platform to execution
      // Execution
      .return( rawExecution )
      .then( saveExecution );


  } else if ( microtaskId ) {
    promise = checkMicrotask( microtaskId )
      .tap( myMicrotaskId => rawExecution.microtask = myMicrotaskId ) // Associate microtask to execution
      .tap( myMicrotaskId => {
        // Get task from microtask
        return Microtask
          .findById( myMicrotaskId )
          .select( 'task' )
          .populate( 'task', '-objects -microtasks' )
          .get( 'task' )
          .then( task => rawExecution.task = task )
      } )
      // Platform
      .return( rawExecution )
      .then( assignPlatform )
      .then( checkPlatform )
      .tap( platformId => rawExecution.platform = platformId ) // Associate platform to execution
      // Execution
      .return( rawExecution )
      .then( saveExecution );


  } else if ( executionId ) {
    promise = getExecutionById( executionId )
      .then( obj => [ obj, true ] );
  }

  return promise;
}

function getExecution( req, res, next ) {
  log.trace( 'Getting execution' );

  let config = _.assign( {}, req.query );

  if ( req.isAuthenticated() ) {
    // If user is authenticated then use its id
    let performerId = req.user._id;
    config.performer = performerId;
  }


  return getExecutionPromise( config )
    .spread( ( data, isQuery ) => {
      if ( isQuery ) {
        log.debug( 'Got execution from', req.query.execution );
        req.queryObject = data.queryObject;
        return next();
      } else {
        log.debug( 'Got execution %s', data._id );
        let executionObj = data.toObject( {
          getters: true,
        } );

        return res.json( executionObj );
      }
    } )
    .catch( RequireAuthError, err => {
      log.debug( 'This task requires authentication', err );

      // Ok, require auth
      req.session.destination = req.originalUrl.slice( 1 );
      // Save in session the provenance of the user
      req.session.from = req.query.from;

      return res.format( {
        html: () => res.redirect( CS.config.externalAddress + 'login' ),
        json: () => res.json( APIError.UNAUTHORIZED, {
          id: 'UNAUTHORIZED',
          message: 'A user must be provided for this Task',
          requestedUrl: req.session.destination
        } ),
      } );
    } )
    .catch( next );
}
// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  params: {
    job: false,
    alias: false,
    task: false,
    execution: false,
    performer: false
  },
  url: 'execution',
  method: 'GET',
  promiseLogic: getExecutionPromise,
  logic: getExecution,
  authError: RequireAuthError,
};