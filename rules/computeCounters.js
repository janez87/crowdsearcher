// ClassifyMajority rule
// ---
// Rule that implements the majority for a single classify operation


// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Classify Majority'
} );

// Models
var ControlMart = CS.models.controlmart;
var Execution = CS.models.execution;



function onOpenTask( params, task, data, callback ) {
  // In the open task the rule creates the controlmart

  log.trace( 'Creating the control mart at the OPEN_TASK' );

  var objects = task.objects;
  var microtasks = task.microtasks;

  var createTaskStats = function() {


  };

  var createMicroTaskStats = function() {

  };

  var createObjectStats = function() {

  };

  var actions = [ createTaskStats, createMicroTaskStats, createObjectStats ];
  return async.series( actions, callback );

}

function onAddObjects( params, task, data, callback ) {

  log.trace( 'Creating the control mart at the ON_ADD_OBJECTS' );

  var objects = data.objectIds;

  return createMart( task, objects, params, callback );
}

function onEndTask( params, task, data, callback ) {
  // body...

  return callback();
}

function onAddMicrotasks( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndMicrotask( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule' );


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
    'OPEN_TASK': onOpenTask,
    // Description of what the rule does in this specific event.
    'END_TASK': onEndTask,
    // Description of what the rule does in this specific event.
    'ADD_MICROTASKS': onAddMicrotasks,
    // Description of what the rule does in this specific event.
    'END_MICROTASK': onEndMicrotask,
    // Description of what the rule does in this specific event.
    'END_EXECUTION': onEndExecution,
    'ON_ADD_OBJECTS': onAddObjects
  },


  // ## Parameters
  //
  //
  params: {

  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {

    return done( true );
  },
};

module.exports = exports = rule;