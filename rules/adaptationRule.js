'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Adaptation rule' } );


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


function parseRule( task, info, rule, callback ) {
  var scope = rule.scope;
  var type = rule.type;
  var action = rule.do? rule.do.action : 'none';
  var params = rule.do? rule.do.params : { };
  var conditionList = rule.when || [ ];

  var result;

  log.trace( 'Parsing %s rule for %s', type, scope );

  for (var j = 0; j < conditionList.length; j++) {
    var conditionObject = conditionList[ j ];
    var value = conditionObject.value;
    var operator = conditionObject.operator;
    var condition = conditionObject.condition;
    var conditionParts = condition.split( '.' );
    var logicOperator = conditionObject.logicOperator;

    var dataValue = info;
    for( var i=0; i<conditionParts.length; i++ ) {
      dataValue = dataValue[ conditionParts[ i ] ];
    }

    log.trace( 'Computing condition %d', j );

    var partialResult;
    switch( operator ) {
      case '>':
        partialResult = dataValue>value;
        break;
      case '<':
        partialResult = dataValue<value;
        break;
      case '<=':
        partialResult = dataValue<=value;
        break;
      case '>=':
        partialResult = dataValue>=value;
        break;
      case '==':
        partialResult = dataValue===value;
        break;
      case '!=':
        partialResult = dataValue!==value;
        break;
    }
    log.trace( '%s[%s] %s %s -> %s', condition, dataValue, operator, value, partialResult );

    if( logicOperator ) {
      logicOperator = logicOperator.toUpperCase();

      if( logicOperator==='AND' ) {
        result = result && partialResult;
      } else if( logicOperator==='OR' ) {
        result = result || partialResult;
      } else {
        return callback( new Error( 'Logic operator "'+logicOperator+'" not supported' ) );
      }
    } else {
      result = partialResult;
    }

    log.trace( 'Result by now %s', result );
  }


  log.trace( 'The action should be triggered? %s', result );
  if( result ) {
    log.trace( 'Triggering the action: %s with ', action, params );

    var actionFn = _.bind( task[ action ], task ); // Make scope dependent

    if( _.isFunction( actionFn ) ) {
      if( actionFn.length===2 ) {
        return actionFn( params, callback );
      } else {
        return actionFn( callback );
      }
    } else {
      log.warn( 'Action not present' );
    }

    return callback();
  } else {
    log.trace( 'NOT triggering the action' );

    return callback();
  }
}

function onEndExecution( params, task, data, callback ) {
  var ruleList = params;

  // Get all the info from the task
  task.getInfo( function( err, info ) {
    if( err ) {
      return callback( err );
    }

    // Pre apply the task info and the task itself
    var fn = _.partial( parseRule, task, info );

    async.each( ruleList, fn, function( err ) {
      if( err ) {
        return callback( err );
      }

      log.debug( 'Adaptation completed' );
      return callback();
    } );

  } );

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
  params: { },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {

    return done( true );
  },
};

module.exports = exports = rule;