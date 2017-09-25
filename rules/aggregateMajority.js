'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration
let Microtask = CS.models.microtask;
let log = CS.log.child( {
  component: 'Aggregate Majority'
} );
let redis = CS.redis;

// Module functions declaration
function getRedisKey( taskId, operationId, objectId) {
  let key = `${taskId}:${objectId}`;
  return key;
}
function evaluateMajority( task, microtask, params, object ) {
  // For each object it evaluate the status of the majorities
  log.trace( 'Evaluating the majority for object %s', object._id );
  let taskId = task._id;
  let objectId = object._id;
  let operations = microtask.operations;

  // If the object is already close do nothing
  if( object.closed ) {
    log.debug( 'Object is already closed' );
    return Promise.resolve();
  }

  // Retrieve the control mart related to the status of the object
  let key = getRedisKey( taskId, '*', objectId );
  return Promise
  .props( {
    [key]: redis.hgetall( key ),
  } )
  /*
  return redis
  .keys( keyPrefix+key )
  .then( keysMatched => {
    log.trace( 'Matched %d keys', keysMatched.length );

    let props = _( keysMatched )
    .map( k => k.substring( keyPrefix.length ) ) // Remove prefix
    .keyBy() // Create an object
    .mapValues( k => redis.hgetall( k ) ) // Map value as a promise
    .value();

    return Promise
    .props( props );
  } )
  */
  .then( values => {
    // Create a resolved promise to use as standard exit value
    let promise = Promise.resolve();
    log.trace( 'Values', values );

    let mode = _.toUpper( params.mode );
    let closed = _.filter( values, { status: 'CLOSED' } );
    log.trace( 'Found %d closed operations', closed.length );
    log.trace( 'Mode is: %s', mode );

    if( mode==='ONE' && closed.length===1 ) {
      // Close the object if at least 1 operation is closed
      log.trace( 'Closing object %s', object._id );
      promise = object.close();

    } else if( mode==='ALL' && (closed.length===operations.length) ) {
      // Close the object if all the operation are closed
      log.trace( 'Closing object %s', object._id );
      promise = object.close();

    } else if( mode==='SPECIFIC' ) {
      let selectedOperations = params.operations;
      if( !_.isArray( selectedOperations ) ) {
        selectedOperations = [ selectedOperations ];
      }

      log.trace( 'The operations required to close the object are: %s', selectedOperations );
      let closedOperations = _.reduce( selectedOperations, ( sum, opLabel ) => {
        let operation = _.find( task.operations, {
          label: opLabel,
        } );

        if( !operation ) return sum;

        let operationId = operation._id;
        let martKey = getRedisKey( taskId, operationId, objectId );
        let mart = values[ martKey ];
        let martStatus = mart.status;

        if( martStatus==='CLOSED' ) {
          return sum + 1;
        } else {
          return sum;
        }
      }, 0 );

      // TODO check also >= and > ???
      if( closedOperations===selectedOperations.length ) {
        log.trace( 'Closing object %s', object._id );
        promise = object.close();
      }

    } else {
      log.warn( 'Not supported mode selected' );
    }

    return promise;
  } )
  .tap( () => log.trace( 'Done evaluating majority for object %s', objectId ) )
  ;
}
function onEndExecution( params, task, data, callback ) {
  let runEvaluateMajority = _.curry( evaluateMajority );
  let microtaskId = data.microtask;

  return Microtask
  .findById( microtaskId )
  .populate( 'objects' )
  .exec()
  .then( microtask => {
    if( !microtask ) {
      let error = new Error( 'No microtask retrieved' );
      return Promise.reject( error );
    }

    let objects = microtask.objects;
    log.trace( 'Microtask %s have %d objects', microtask._id, objects.length );

    return Promise
    .each( objects, runEvaluateMajority( task, microtask, params ) )
    .tap( () => log.trace( 'Done evaluating majority' ) )
    ;
  } )
  .asCallback( callback );
}
function checkParams( params, done ) {
  let mode = params.mode;

  if( _.isUndefined( mode ) ) {
    log.error( 'A mode must be specified' );
    return done( false );
  }

  if( mode!=='ALL' && mode!=='ONE' && mode!=='SPECIFIC' ) {
    log.error( 'Unsupported mode is specified (%s)', mode );
    return done( false );
  }

  if( mode==='SPECIFIC' ) {
    let operations = params.operations;

    if( _.isUndefined( operations ) ) {
      log.error( 'The operations must be specified for the SPECIFIC mode' );
      return done( false );
    }
  }

  // Everything went better then expected...
  return done( true );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  hooks: {
    'END_EXECUTION': onEndExecution
  },
  params: {
    mode: {
      type: 'enum',
      values: [ 'ALL', 'ONE', 'SPECIFIC' ]
    },
    operations: [ 'string' ]
  },
  check: checkParams,
};