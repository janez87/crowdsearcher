'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Limit Object Evaluations'
} );

// Models
var ObjectModel = CS.models.object;
var ControlMart = CS.models.controlmart;

function onAddMicrotasks( params, task, data, callback ) {

  var microtasks = data.microtasks;

  var createObjectMart = function( microtask, objectId, callback ) {


    var microtaskId = microtask._id;
    if ( microtask.populated( 'objects' ) ) {
      objectId = objectId._id;
    }

    var tuple = {
      task: task._id,
      microtask: microtaskId,
      object: objectId._id,
      name: 'evaluations',
      data: 0
    };

    log.trace( 'Creating the mart for the object %s in microtask %s', objectId, microtaskId );

    return ControlMart.collection.insert( tuple, callback );
  };

  var createMicroTaskMart = function( microtask, callback ) {
    log.trace( 'Creating the mart of the objects of the microtask %s', microtask.id );
    var objects = microtask.objects;

    return async.each( objects, _.partial( createObjectMart, microtask ), callback );
  };

  return async.each( microtasks, createMicroTaskMart, callback );
}

function onEndExecution( params, task, data, callback ) {
  log.trace( 'RETURN CALLBACK' );
  return callback();
  log.trace( 'Executing the rule' );

  var domain = require( 'domain' ).create();
  domain.on( 'error', callback );

  var maxExecutions = params.maxExecutions;
  var execution = data.execution;
  var microtask = execution.microtask;
  var taskId = task._id;

  var objectIds = microtask.objects;

  var closeObject = function( objectId, cb ) {

    log.trace( 'Retrieving the object %s', objectId );
    return ObjectModel.findById( objectId, function( err, object ) {
      if ( err ) return cb( err );

      if ( object.closed ) return cb();

      log.trace( 'Closing the object' );

      return object.close( cb );
    } );
  };

  var updateEvaluations = function( tuple, cb ) {
    return ControlMart.insert( tuple, cb );
  };

  var checkObject = function( objectId, cb ) {

    var query = {
      task: taskId,
      object: objectId,
      name: 'evaluations',
      microtask: microtask._id
    };


    ControlMart.get( query, function( err, tuple ) {
      if ( err ) return cb( err );

      tuple = tuple[ 0 ];
      tuple.data++;

      if ( tuple.data === maxExecutions ) {
        log.trace( 'Max executions reached for object %s', objectId );

        return async.series( [
          _.partial( updateEvaluations, tuple ), _.partial( closeObject, objectId )
        ], cb );

      } else {
        log.trace( 'Max executions (%s) not reached (%s)', maxExecutions, tuple.data );
        return updateEvaluations( tuple, cb );
      }
    } );

  };


  return async.each( objectIds, checkObject, callback );

}

// # Rule definition
//
// Description of the rule.
var rule = {
  // # Hooks
  //
  // Description of what the rule does in general.
  hooks: {
    // Description of what the rule does in this specific event.
    'END_EXECUTION': onEndExecution,
    'ADD_MICROTASKS': onAddMicrotasks
  },

  // ## Parameters
  //
  //
  params: {
    maxExecutions: 'number'
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {
    log.trace( 'Checking parameters' );

    if ( _.isUndefined( params.maxExecutions ) || params.maxExecutions < 0 ) {
      log.error( 'The maxExecution parameter must be an integer greater than 0' );
      return done( false );
    }

    // Everything went better then expected...
    return done( true );
  },
};

module.exports = exports = rule;