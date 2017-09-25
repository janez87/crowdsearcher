'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Count likes'
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
      object: objectId,
      name: 'likes',
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
  log.trace( 'Executing the rule' );

  var domain = require( 'domain' ).create();
  domain.on( 'error', callback );

  var execution = data.execution;
  var annotations = execution.annotations;
  var microtask = execution.microtask;
  var taskId = task._id;

  var updateEvaluations = function( tuple, cb ) {
    return ControlMart.insert( tuple, cb );
  };

  var updateLike = function( annotation, cb ) {

    var objectId = annotation.object;
    var query = {
      task: taskId,
      object: objectId,
      name: 'likes',
      microtask: microtask._id
    };


    ControlMart.get( query, function( err, tuples ) {
      if ( err ) return cb( err );

      var tuple = tuples[ 0 ];

      tuple.data++;

      log.trace( 'Object %s has %s likes', objectId, tuple.data );
      return updateEvaluations( tuple, cb );
    } );

  };

  return async.each( annotations, updateLike, callback );

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


  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {
    log.trace( 'Checking parameters' );

    // Everything went better then expected...
    return done( true );
  },
};

module.exports = exports = rule;