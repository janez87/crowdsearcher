
// Load libraries
var _ = require('underscore');
var util = require('util');
var domain = require('domain');
var TaskStatuses = require('../../../config/constants').TaskStatuses;


// Child logger
var log = common.log.child( { component: 'SequenceTaskAssignmentStrategy' } );


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





// Sequence Task Assignment Strategy
var performStrategy = function( data, params, callback ) {
  var job = data.job;

  // Create a domain to handle mongoose errors
  var d = domain.create();
  d.on( 'error', callback );

  var index = params.index;
  var selectedTask;

  job
  .populate( {
    path: 'tasks',
    match: {
      status: TaskStatuses.OPENED
    }
  }, d.bind( function( err, job ){
    if( err ) return callback( err );

    var tasks = job.tasks;
    var size = tasks.length;

    // check if there are some available Task
    if( _.isUndefined( tasks ) || size===0 )
      return callback( new StaticTaskAssignmentError(
        StaticTaskAssignmentError.NO_AVAILABLE_MICROTASKS,
        'No available tasks' ) );


    // If not set or out of bound
    if( _.isUndefined( index ) || index===( size-1 ) ){
      // Reset the index
      index = 0;
      selectedTask = tasks[ index ];
    } else {
      index = index+1;
      if( index>=size )
        index = 0;
      selectedTask = tasks[ index ];
    }


    log.trace( 'Selecting the task in position %s (%s)', index, selectedTask._id );
    // Setting the new value of the index
    job.taskAssignmentStrategy.params.index = index;
    job.markModified( 'taskAssignmentStrategy.params' );

    job.save( d.bind( function( err ) {
      if( err ) return callback( err );
      log.trace( 'Updating the index %s', index );

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