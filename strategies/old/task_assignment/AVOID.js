
// Load libraries
var _ = require('underscore');
var util = require('util');
var domain = require('domain');
var TaskStatuses = require('../../../config/constants').TaskStatuses;


// Child logger
var log = CS.log.child( { component: 'AvoidTaskAssignmentStrategy' } );


// Import Models
var Task = CS.models.task;
var User = CS.models.user;

// Custom error
// ---
var CSError = require('../../../error');
var AvoidTaskAssignmentError = function( id, message) {
  /* jshint camelcase: false */
  AvoidTaskAssignmentError.super_.call( this, id, message );
};

util.inherits( AvoidTaskAssignmentError, CSError );
// Error name
AvoidTaskAssignmentError.prototype.name = 'AvoidTaskAssignmentError';
// Custom error IDs
AvoidTaskAssignmentError.NO_AVAILABLE_TASKS = 'NO_AVAILABLE_TASKS';
AvoidTaskAssignmentError.NO_TASK_SELECTED = 'NO_TASK_SELECTED';




// Sequence Task Assignment Strategy
var performStrategy = function( data, params, callback ) {
  var job = data.job;
  var performerId = data.performer;

  // Create a domain to handle mongoose errors
  var d = domain.create();
  d.on( 'error', callback );

  var selectedTask;

  var taskQuery = Task
  .where( 'job', job._id )
  .where( 'status', TaskStatuses.OPENED );

  // just select one task
  if( !performerId ) {
    log.trace( 'No performer specified, returning a random task' );
    return taskQuery.exec( d.bind( function( err, tasks ) {
      if( err ) return callback( err );

      if( tasks )
        selectedTask = tasks[ _.random( tasks.length-1 ) ];

      if( !selectedTask )
        return callback( new AvoidTaskAssignmentError(
          AvoidTaskAssignmentError.NO_TASK_SELECTED,
          'No task selected' ) );

      log.trace( 'Got %s tasks, selected %s', tasks.length, selectedTask._id );

      return callback( null, selectedTask );
    } ) );
  }

  // Perform user query only if the performer is present
  User.findById( performerId, d.bind( function( err, performer ) {
    if( err ) return callback( err );

    var tasksToAvoid = performer.getMetadata( 'tasksToAvoid' );
    if( tasksToAvoid ) {
      taskQuery
      .where( '_id' ).nin( tasksToAvoid );
    }

    log.trace( 'Performer found with tasksToAvoid: %j', tasksToAvoid );

    taskQuery
    .exec( d.bind( function( err, tasks ) {
      if( err ) return callback( err );

      if( tasks )
        selectedTask = tasks[ _.random( tasks.length-1 ) ];

      if( !selectedTask )
        return callback( new AvoidTaskAssignmentError(
          AvoidTaskAssignmentError.NO_TASK_SELECTED,
          'No task selected' ) );

      log.trace( 'Got %s tasks, selected %s', tasks.length, selectedTask._id );

      return callback( null, selectedTask );
    } ) );
  } ) );
};


// Check parameters
// ---
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  // Everything went better then expected...
  return callback();
};

module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;