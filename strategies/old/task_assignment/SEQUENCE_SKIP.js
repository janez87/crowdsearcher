
// Load libraries
var _ = require('underscore');
var util = require('util');
var domain = require('domain');
var TaskStatuses = require('../../../config/constants').TaskStatuses;


// Child logger
var log = CS.log.child( { component: 'SequenceSkipTaskAssignmentStrategy' } );

// Import Models
var Task = CS.models.task;
var User = CS.models.user;

// Custom error
// ---
var CSError = require('../../../error');
var StaticTaskAssignmentError = function( id, message) {
  /* jshint camelcase: false */
  StaticTaskAssignmentError.super_.call( this, id, message );
};

util.inherits( StaticTaskAssignmentError, CSError );
// Error name
StaticTaskAssignmentError.prototype.name = 'StaticTaskAssignmentError';
// Custom error IDs
StaticTaskAssignmentError.NO_AVAILABLE_TASKS = 'NO_AVAILABLE_TASKS';
StaticTaskAssignmentError.NO_TASK_SELECTED = 'NO_TASK_SELECTED';





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
        return callback( new StaticTaskAssignmentError(
          StaticTaskAssignmentError.NO_TASK_SELECTED,
          'No task selected' ) );

      return callback( null, selectedTask );
    } ) );
  }

  // Perform user query only if the performer is present
  User.findById( performerId, d.bind( function( err, performer ) {
    if( err ) return callback( err );

    var line = performer.getMetadata( 'line' );
    var area = performer.getMetadata( 'area' );

    taskQuery
    .where( 'name' ).ne( performer.name || '' )
    .exec( d.bind( function( err, tasks ) {
      if( err ) return callback( err );

      var size = tasks.length;

      // check if there are some available Task
      if( _.isUndefined( tasks ) || size===0 )
        return callback( new StaticTaskAssignmentError(
          StaticTaskAssignmentError.NO_AVAILABLE_TASKS,
          'No available tasks' ) );

      var tasksByLine = [];
      var tasksByArea = [];
      _.each( tasks, function( task ) {
        if( task.getMetadata( 'line' )===line )
          tasksByLine.push( task );
        if( task.getMetadata( 'area' )===area )
          tasksByArea.push( task );
      } );

      // Task by Line
      if( tasksByLine.length>0 ) {
        selectedTask = tasksByLine[ _.random( tasksByLine.length-1 ) ];
      } else if( tasksByArea.length>0 ) {
        selectedTask = tasksByArea[ _.random( tasksByArea.length-1 ) ];
      } else {
        selectedTask = tasks[ _.random( tasks.length-1 ) ];
      }

      if( !selectedTask )
        return callback( new StaticTaskAssignmentError(
          StaticTaskAssignmentError.NO_TASK_SELECTED,
          'No task selected' ) );

      // Task
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