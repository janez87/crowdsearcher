// Load libraries.
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../core' );

// Create a child logger.
var log = CS.log.child( { component: 'CRM' } );


// # Control Rule Manager
//
// Create the CRM object.
var ControlRuleManager = {};

// ## Methods
//
// ### Trigger
// This method is in charge of triggering the `event` in the system and
// calling `callback` when the event is completed.
// **Note**:
// Only task with status either `OPENED` or `FINALIZED` can trigger events.
ControlRuleManager.trigger = function( event, data, callback ) {
  // The task id must be available in the data object.
  var taskId = data.task;

  // Remove task data.
  delete data.task;

  // Import the Task mongoose model.
  var Task = CS.models.task;

  // Create a domain to wrap the function calls
  var d = domain.create();
  // Catch any strange error, log it and exit.
  d.on( 'error', function ( err ) {
    // Log the error
    log.error( err );

    // Clean exit.
    return callback();
  } );


  // Populate the task, this object will be passed to each 'listener'.
  Task
  .findById( taskId )
  // Populate all the refs, exclude objects for performance.
  .populate( 'job platforms operations microtasks' )
  .exec( function( err, task ) {
    if( err ) return callback( err );

    // Check if a task was found.
    if( !task )
      return callback( new Error( 'No task found for '+taskId ) );

    // Check if the task can trigger events.
    if( task.status==='CREATED' || ( task.status==='CLOSED' && event!=='END_TASK' ) ) {
      log.warn( 'Task cannot trigger events, status is %s', task.status );
      return callback();
    }

    log.trace( 'CRM will trigger %s', event );

    // Find all rules that
    var rules = _.where( task.controlrules, { event: event } );

    log.trace( 'Found %s rules to run', rules.length );

    // Exit in case of no rules.
    if( rules.length===0 )
      return callback();

    // Function that wraps each function into a 'secure' context.
    function executeRule( rule, cb ) {
      // First wrap into a domain.
      var run = rule.run;

      run = d.bind( run.bind( rule ) );
      return run( event, task, data, cb );
    }

    async.mapSeries( rules, executeRule, function ( err, results ) {
      // In case of error log it and exit.
      if( err ) {
        log.warn( 'Some error occurred during %s', event, err );
        return callback();
      }

      log.debug( '%s completed, no error were rised', event );
      return callback( null, results );
    } );
  } );
};

/*
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
        var customRule = GLOBAL.CS.customRules[ controlrule.action ];

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
*/

// Export the CRM.
module.exports = exports = ControlRuleManager;