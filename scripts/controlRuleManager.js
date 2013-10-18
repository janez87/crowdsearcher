// Control Rule Manager
// ---
// Is in charge of reacting to the control rules for each Task.


// Load the `EventEmitter` class
var EventEmitter = require('events').EventEmitter;

// Add shortcuts to the libraries.
var _ = require('underscore');
var util = require('util');
var async = require('async');
var TaskStatuses = require( '../config/constants' ).TaskStatuses;

var log = common.log.child( { component: 'ControlRuleManager' } );

function ControlRuleManager() {
  // Call the constructor of the parent.
  EventEmitter.call( this );
}
// Inherith from `EventEmitter` class.
util.inherits( ControlRuleManager, EventEmitter );


// ## Methods for the `ControlRuleManager` class
ControlRuleManager.prototype.execute = function( event, data, callback ) {
  try {

    log.debug( 'CRM recieved a notification for %s', event );

    // Add event to the data object passed to the rules.
    data.event = event;

    var task = data.task;
    if( task.status<TaskStatuses.OPENED )
      return callback();


    var matchingRules = _.where( task.controlrules, { 'event': event } );
    log.trace( 'Found %s matching rules to execute', matchingRules.length );

    // Create a domain for the event
    var domain = require( 'domain' ).create();

    var rulesToExecute = [];
    var addToExecutionList = function( task, fnName ) {
      // Add the rule to the list
      rulesToExecute.push(
        // bind the function to the current domain.
        domain.bind(
          // Bind the function to the task.
          _.bind( task[ fnName ], task, data )
        )
      );
    };

    for( var i=0; i<matchingRules.length; i++ ) {
      var controlrule = matchingRules[ i ];
      log.trace( 'Executing rule %s %s (%s)', controlrule.event, controlrule.action, controlrule.type );


      switch( controlrule.type ) {
      case 'SPLITTING':
        addToExecutionList( task, 'performSplittingStrategy' );
          //addToExecutionList( task.performSplittingStrategy );
        break;
      case 'MICROTASK_ASSIGN':
        addToExecutionList( task, 'performMicroTaskAssigmentStrategy' );
        //addToExecutionList( task.performMicroTaskAssigmentStrategy );
        break;
      case 'IMPLEMENTATION':
        addToExecutionList( task, 'performImplementationStrategy' );
        //addToExecutionList( task.performImplementationStrategy );
        break;
      case 'INVITATION':
        addToExecutionList( task, 'performInvitationStrategy' );
        //addToExecutionList( task.performInvitationStrategy );
        break;
      case 'CUSTOM':
        var customRule = GLOBAL.common.customRules[ controlrule.action ];

        if( !_.isUndefined( customRule ) ) {
          // Add the rule to the list
          rulesToExecute.push(
            // bind the function to the current domain.
            domain.bind(
              // Bind the function to the task.
              _.bind( customRule.perform, customRule, data, controlrule.params )
            )
          );
        } else {
          log.error( 'Unable to add the custom control rule "%s"', controlrule.action );
        }
        break;
      default:
        log.warn( 'The rule type "%s" does not correspond to any strategy', controlrule.type );
      }
    }

    // Ohh snap, we got an error!
    domain.on( 'error', function( err ) {
      log.error( 'Error while executiong %s event', event );
      log.error( 'Task %s', task.id );
      return callback( err );
    });



    log.trace( 'Executing %s rules', rulesToExecute.length );
    // Execute all the rules in order and
    async.series( rulesToExecute, function( err, results ) {
      log.debug( 'Executed all the control rules for the event %s', event );
      return callback( err, results );
    } );


  } catch( err ) {
    return callback( err );
  }
};

// Export as a Singletone
module.exports = exports = new ControlRuleManager();