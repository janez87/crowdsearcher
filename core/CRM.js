// Load libraries.
var _ = require( 'underscore' );
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../core' );

// Create a child logger.
var log = CS.log.child( {
  component: 'CRM'
} );


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
  var taskId = data.task._id ? data.task._id : data.task;

  log.debug( 'CRM event %s', event );

  if ( !taskId )
    return callback( new Error( 'Task id must be specified' ) );

  // Import the Task mongoose model.
  var Task = CS.models.task;
  var Microtask = CS.models.microtask;
  var Execution = CS.models.execution;
  var ObjectModel = CS.models.object;

  function retrieveData( cb ) {
    var retrieveActionList = [];
    var defaults = {
      event: event
    };

    defaults.taskId = taskId;

    retrieveActionList.push(
      _.partial( retrieveTask, defaults.taskId ),
      function( task, c ) {
        defaults.task = task;
        return c();
      }
    );

    if ( event === 'ADD_MICROTASKS' ) {
      defaults.microtaskIds = data.microtasks;

      retrieveActionList.push(
        _.partial( retrieveMicrotasks, defaults.microtaskIds ),
        function( microtasks, c ) {
          defaults.microtasks = microtasks;
          return c();
        }
      );
    } else if ( event === 'END_MICROTASK' ) {
      defaults.microtaskId = data.microtask;

      retrieveActionList.push(
        _.partial( retrieveMicrotasks, [ defaults.microtaskId ] ),
        function( microtasks, c ) {
          defaults.microtask = microtasks[ 0 ];
          return c();
        }
      );
    } else if ( event === 'ADD_OBJECTS' ) {
      defaults.objectIds = data.objects;

      retrieveActionList.push(
        _.partial( retrieveObjects, defaults.objectIds ),
        function( objects, c ) {
          defaults.objects = objects;
          return c();
        }
      );

    } else if ( event === 'CLOSE_OBJECT' ) {
      defaults.objectId = data.object;

      retrieveActionList.push(
        _.partial( retrieveObjects, [ defaults.objectId ] ),
        function( objects, c ) {
          defaults.object = objects[ 0 ];
          return c();
        }
      );
    } else if ( event === 'CLOSE_OBJECT' ) {
      defaults.executionId = data.execution;

      retrieveActionList.push(
        _.partial( retrieveExecution, defaults.executionId ),
        function( execution, c ) {
          defaults.execution = execution;
          return c();
        }
      );
    } else if ( event === 'END_EXECUTION' ) {
      defaults.executionId = data.execution;

      retrieveActionList.push(
        _.partial( retrieveExecution, defaults.executionId ),
        function( execution, c ) {
          defaults.execution = execution;
          return c();
        }
      );
    }

    async.waterfall( retrieveActionList, function( err ) {
      data = _.defaults( defaults, data );
      var task = data.task;

      return cb( err, task );
    } );
  }

  function retrieveTask( id, cb ) {
    // Populate the task, this object will be passed to the rule.
    Task
      .findById( id )
    // Populate all the refs, exclude objects for performance.
    .populate( 'job platforms operations microtasks' )
      .exec( function( err, task ) {
        if ( err ) return cb( err );

        // Check if a task was found.
        if ( !task )
          return cb( new Error( 'No task found for ' + id ) );

        return cb( null, task );
      } );
  }

  function retrieveMicrotasks( ids, cb ) {
    Microtask
      .find()
      .where( '_id' ). in ( ids )
      .populate( 'operations platforms' )
      .exec( function( err, microtasks ) {
        if ( err ) return cb( err );

        return cb( null, microtasks );
      } );
  }

  function retrieveExecution( id, cb ) {
    Execution
      .findById( id )
      .populate( 'platform microtask performer annotations.operation' )
      .exec( function( err, execution ) {
        if ( err ) return cb( err );

        // Check if an execution was found.
        if ( !execution )
          return cb( new Error( 'No execution found for ' + id ) );

        return cb( null, execution );
      } );
  }

  function retrieveObjects( ids, cb ) {
    ObjectModel
      .where( '_id' ). in ( ids )
      .exec( function( err, objects ) {
        if ( err ) return cb( err );

        return cb( null, objects );
      } );
  }

  // Function that wraps each function into a 'secure' domain.
  function executeRule( controlrule, cb ) {
    var hooks = controlrule.rule.hooks;
    return executeFunction( hooks, controlrule.params, cb );
  }


  // Retrieve the control rules list
  function triggerControlRules( task, cb ) {
    log.trace( 'CRM will trigger %s', event );

    // Find all rules that
    var rules = _.filter( task.controlrules, function( controlrule ) {
      return _.isFunction( controlrule.rule.hooks[ event ] );
    } );

    log.trace( 'Found %s rules to run', rules.length );

    // Exit in case of no rules.
    if ( rules.length === 0 )
      return cb();

    async.mapSeries( rules, executeRule, function( err, results ) {
      if ( err ) {
        log.warn( 'Error on triggering platform hooks', err );
        return cb( null, results );
      }

      log.debug( '%s completed, no error were rised', event );
      return cb( null, results );
    } );
  }

  // Function that wraps each function into a 'secure' domain
  // and provides a fresh version of the Task from the DB.
  function executeFunction( hooks, params, cb ) {
    if ( !hooks || !_.isFunction( hooks[ event ] ) ) {
      return cb();
    }

    var fn = hooks[ event ];
    // Create a domain to wrap the function calls
    var d = domain.create();
    // Catch any strange error, log it and exit.
    d.on( 'error', function( err ) {
      // Log the error
      log.error( err );

      // Clean exit.
      return cb();
    } );


    // Get a fresh Task from the DB
    return retrieveTask( taskId, function( err, task ) {
      if ( err ) {
        log.warn( 'Error while retrieving the Task', err );
        return cb();
      }

      // Check if the task can trigger events.
      if ( task.status === 'CREATED' || ( task.status === 'CLOSED' && event !== 'END_TASK' ) ) {
        log.warn( 'Task cannot trigger rule/hook, status is %s', task.status );
        return cb();
      }

      // Execute the passed function.
      d.bind( fn )( params, task, data, function( err ) {
        if ( err ) {
          log.warn( 'Error while execution a rule/hook', err );
        }
        // Exit the domain
        d.exit();

        // return.
        return cb();
      } );
    } );
  }


  function executeHook( platform, cb ) {
    var hooks = platform.implementation.hooks;
    return executeFunction( hooks, platform.params, cb );
  }

  function triggerPlatformRules( task, cb ) {
    // Find all platforms with hooks on the triggered event.
    var hooks = _.filter( task.platforms, function( platform ) {
      var platformHooks = platform.implementation.hooks;
      if ( platformHooks )
        return _.isFunction( platform.implementation.hooks[ event ] );
      else
        return false;
    } );

    log.trace( 'Found %s platforms hooks to run', hooks.length );

    // Exit in case of no hooks.
    if ( hooks.length === 0 )
      return cb( null, task );

    async.each( hooks, executeHook, function( err ) {
      if ( err ) {
        log.warn( 'Error on triggering platform hooks', err );
        return cb( null, task );
      }

      log.debug( '%s completed, no error were rised', event );
      return cb( null, task );
    } );
  }

  function executeStrategyHook( strategy, cb ) {
    var task = data.task;
    var strategyData = task[ strategy + 'Strategy' ];

    log.trace( 'Execute %s hook: %j', strategy, strategyData );
    // No strategy defined... no problem
    if ( !strategyData )
      return cb();

    var params = task[ strategy + 'Strategy' ].params;
    var implementation = task[ strategy + 'StrategyImplementation' ];
    var hooks = implementation.hooks;

    return executeFunction( hooks, params, cb );
  }

  function triggerStrategyRules( task, cb ) {
    var strategies = [
      'splitting',
      'assignment',
      'implementation',
      'invitation'
    ];

    async.each( strategies, executeStrategyHook, function( err ) {
      if ( err ) {
        log.warn( 'Error on triggering strategy hooks', err );
        return cb( null, task );
      }

      log.debug( '%s completed, no error were rised', event );
      return cb( null, task );
    } );
  }


  function checkTask( task, cb ) {
    // Check if the task can trigger events.
    if ( task.status === 'CREATED' || ( task.closed && event !== 'END_TASK' ) ) {
      log.warn( 'Task cannot trigger rule/hook, status is %s', task.status );
      return callback();
    }

    return cb( null, task );
  }


  var actions = [
    retrieveData,
    checkTask,
    triggerPlatformRules,
    triggerStrategyRules,
    triggerControlRules
  ];

  async.waterfall( actions, function( err ) {
    // In case of error log it and exit.
    if ( err )
      log.warn( 'Some error occurred during %s', event, err );

    log.trace( 'All triggers are triggered' );
    return callback();
  } );
};


// Export the CRM.
module.exports = exports = ControlRuleManager;