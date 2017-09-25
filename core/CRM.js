'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration
const STRATEGIES_LIST = [
  'splitting',
  'assignment',
  'implementation',
  'invitation',
];

// Module variables declaration
let log = CS.log.child( {
  component: 'CRM'
} );

// Errors
class ContinuableError extends Error {}

// Module functions declaration
function checkTask( eventName, taskId ) {
  let Task = CS.models.task;

  log.trace( 'Check id task(%s) is siutable', taskId );
  return Task
  .findById( taskId )
  .select( '-objects -microtasks' ) // Remove possibly big objects
  .populate( 'platforms', { lean: true } ) // Populate only stricly required fields
  .populate( 'operations' ) // Populate only stricly required fields
  // .lean()
  .exec()
  .then( task => {
    if( !task ) {
      let message = `Task ${taskId} not found`;
      throw new ContinuableError( message );
    }
    if( task.created || (task.closed && eventName!=='END_TASK') ) {
      let message = `Task cannot trigger rule/hook, status is ${task.status}`;
      throw new ContinuableError( message );
    }
    log.trace( 'Task(%s) is siutable', taskId );

    return task;
  } );
}
function isFunctionHook( eventName ) {
  // Keep only functions for the required hook
  return data => _.isFunction( data? data[ eventName ] : null );
}
function triggerPlatformRules( eventName, task ) {
  // Triggers all the platform rules for the current task+event,
  // find all platforms with hooks on the triggered event.

  let hooks = _( task.platforms )
  .map( 'platform.implementation.hooks' )
  .filter( isFunctionHook( eventName ) )
  .value();

  log.trace( 'Found %d platforms hooks to run', hooks.length );
  log.trace( 'Hook list', hooks );

  // Create a resolved promise
  let promise = Promise.resolve();
  if( hooks.length!==0 ) {
    promise = Promise.each( hooks );
  }

  log.debug( 'Executing the platform hooks' );
  return promise
  .then( () => {
    log.debug( '"%s" triggered all platform hooks, no error were rised', eventName );
  }, err => {
    log.warn( err, 'Error on triggering platform hooks, continue', err );
  } )
  .return( task );
}
function executeHook( hook, params, task, data, eventName ) {
  // Create a resolved promise for all the failing cases
  let promise = Promise.resolve();

  let noop = (a,b,c,cb) => cb();
  hook = hook || noop;
  // hook = noop;

  if( _.isFunction( hook ) && hook!==noop ) {
    // Check if task is still good to use...
    log.trace( 'Running hook' );

    let promisifiedHook = Promise.promisify( hook );

    promise = checkTask( eventName, task.id )
    .then( freshTask => [ params, freshTask, data ] )
    .spread( promisifiedHook );
  }

  return promise;
}
function runStrategyHook( eventName, data, task, strategy ) {
  // Create a resolved promise for all the failing cases
  let promise = Promise.resolve();

  let strategyData = task[ `${strategy}Strategy` ];
  log.debug( 'Running event[%s] on strategy[%s]', eventName, strategy );

  if( strategyData ) { // If hooks are not available just use the resolved promise
    let params = strategyData.params;
    let implementation = task[ `${strategy}StrategyImplementation` ];
    let hooks = implementation.hooks || {};
    let eventHook = hooks[ eventName ];

    promise = executeHook( eventHook, params, task, data, eventName );
  }

  // Use the promise
  return promise
  .catch( ContinuableError, err => {
    log.warn( 'Task not siutable for event[%s] and strategy[%s]', eventName, strategy, err );
  } )
  .tap( () => {
    log.debug( 'Completed event[%s] on strategy[%s]', eventName, strategy );
  } );
}
function triggerStrategyRules( eventName, data, task ) {
  // Triggers all the strategy rules for the current task+event,
  // find all platforms with hooks on the triggered event.

  log.debug( 'Triggering strategy hooks' );
  let fnStrategyHook = _.partial( runStrategyHook, eventName, data, task );

  return Promise
  .each( STRATEGIES_LIST, fnStrategyHook )
  .then( () => {
    log.debug( '"%s" triggered all strategy hooks, no error were rised', eventName );
  }, err => {
    log.warn( err, 'Error on triggering strategy hooks, continue', err );
  } )
  .return( task );
}
function runControlRule( eventName, data, task, rule ) {
  let hook = _.get( rule, 'rule.hooks.'+eventName );
  let params = rule.params;

  log.debug( 'Running control rule (%s)', rule.name );

  return executeHook( hook, params, task, data, eventName )
}
function triggerControlRules( eventName, data, task ) {
  // Triggers all the control rules for the current task+event,
  // find all controlrules with hooks on the triggered event.

  let rules = _( task.controlrules )
  .filter( rule => {
    let hook = _.get( rule, 'rule.hooks.'+eventName );
    return _.isFunction( hook );
  } )
  .value();

  log.trace( 'Found %d control rules to run', rules.length );
  log.trace( 'Rule list: ', _.map( rules, 'name' ) );

  // Create a resolved promise
  let promise = Promise.resolve();
  if( rules.length!==0 ) {
    let fnControlRule = _.partial( runControlRule, eventName, data, task );

    promise = Promise
    .each( rules, fnControlRule );
  }

  log.debug( 'Executing the control rules' );
  return promise
  .then( () => {
    log.debug( '"%s" triggered all control rule hooks, no error were rised', eventName );
  }, err => {
    log.warn( 'Error on triggering control rule hooks, continue', err );
  } )
  .return( task );
}

function trigger( eventName, data, callback ) {
  // This method is in charge of triggering the `event`
  // in the system and calling `callback` when the event is completed.
  // **Note**:
  // Only task with status either `OPENED` or `FINALIZED`
  // can trigger events.

  // The task id must be available in the data object
  let taskId = data.task._id ? data.task._id : data.task;
  if ( !taskId ) {
    return callback( new Error( 'Task id must be specified' ) );
  }

  let start = new Date();
  log.debug( 'Triggering event "%s" for taskId %s', eventName, taskId );
  return checkTask( eventName, taskId )
  .then( _.partial( triggerPlatformRules, eventName ) )
  .then( _.partial( triggerStrategyRules, eventName, data ) )
  .then( _.partial( triggerControlRules, eventName, data ) )
  .then( () => {
    let end = new Date();
    log.debug( 'Event "%s" done, took %d ms', eventName, end-start );
  } )
  .catch( ContinuableError, err => {
    log.warn( err.message, err );
  } )
  .asCallback( callback );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports.trigger = trigger;