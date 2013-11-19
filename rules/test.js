// Load libraries
var _ = require( 'underscore' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Test rule' } );


function onOpenTask( params, task, data, callback ) {
  // body...

  return callback();
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
  // body...

  return callback();
}

function onCloseObject( params, task, data, callback ) {
  // body...

  return callback();
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
    // Description of what the rule does in this specific event.
    'CLOSE_OBJECT': onCloseObject
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