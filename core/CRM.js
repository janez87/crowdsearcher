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
  var taskId = data.task._id? data.task._id : data.task;

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

  function retrieveTask( id, cb ) {
    // Populate the task, this object will be passed to the rule.
    Task
    .findById( id )
    // Populate all the refs, exclude objects for performance.
    .populate( 'job platforms operations microtasks' )
    .exec( function( err, task ) {
      if( err ) return cb( err );

      // Check if a task was found.
      if( !task )
        return cb( new Error( 'No task found for '+id ) );

      // Check if the task can trigger events.
      if( task.status==='CREATED' || ( task.status==='CLOSED' && event!=='END_TASK' ) ) {
        log.warn( 'Task cannot trigger events, status is %s', task.status );
        return cb();
      }

      return cb( null, task );
    } );
  }

  // Function that wraps each function into a 'secure' domain.
  function executeRule( rule, cb ) {
    // First wrap into a domain.
    var run = rule.run;
    run = d.bind( run.bind( rule ) );

    return retrieveTask( taskId, function( err, task ) {
      if( err ) return cb( err );

      return run( event, task, data, cb );
    } );
  }


  // Retrieve the control rules list
  Task
  .findById( taskId )
  //.lean()
  .select( 'controlrules' )
  .exec( function( err, rawTask ) {
    log.trace( 'CRM will trigger %s', event );

    // Find all rules that
    var rules = _.where( rawTask.controlrules, { event: event } );

    log.trace( 'Found %s rules to run', rules.length );

    // Exit in case of no rules.
    if( rules.length===0 )
      return callback();

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


// Export the CRM.
module.exports = exports = ControlRuleManager;