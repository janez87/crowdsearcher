

// Load libraries
var _ = require('underscore');
var util = require('util');
var domain = require('domain');
var MicroTaskStatuses = require('../../../config/constants').MicroTaskStatuses;


// Child logger
var log = common.log.child( { component: 'DynamicRoundrobinMicrotaskAssignmentStrategy' } );


// Custom error
// ---
var CSError = require('../../../error');
var DynamicRoundRobinMtaskAssignmentError = function( id, message) {
  /* jshint camelcase: false */
  DynamicRoundRobinMtaskAssignmentError.super_.call( this, id, message);
};

util.inherits( DynamicRoundRobinMtaskAssignmentError, CSError );
// Error name
DynamicRoundRobinMtaskAssignmentError.prototype.name = 'DynamicRoundRobinMtaskAssignmentError';
// Custom error IDs
DynamicRoundRobinMtaskAssignmentError.ZERO_OBJECTS = 'ZERO_OBJECTS';
DynamicRoundRobinMtaskAssignmentError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
DynamicRoundRobinMtaskAssignmentError.MISSING_PARAMETERS = ' MISSING_PARAMETERS';
DynamicRoundRobinMtaskAssignmentError.NO_AVAILABLE_MICROTASKS = 'NO_AVAILABLE_MICROTASKS';





// Sequence Task Assignment Strategy
var performStrategy = function( data, params, callback ) {
  log.trace( 'Running' );
  log.trace( 'Event: %s', data.event );
  log.trace( 'Task id: %s', data.task._id );
  log.trace( 'Parameters: %j', params );

  var d = domain.create();
  d.on( 'error', callback );

  var task = data.task;

  var index = params.index;
  var selectedMicrotask;

  task
  .select( '+microtasks' )
  .populate( {
    path: 'microtasks',
    match: {
      status: MicroTaskStatuses.OPENED
    }
  }, d.bind( function( err, task ){
    if( err ) return callback( err );

    var microtasks = task.microtasks;
    var size = microtasks.length;

    // no microtasks available
    if( _.isUndefined( microtasks ) || size===0 ){
      log.trace( 'No microtasks found' );
      return callback( new DynamicRoundRobinMtaskAssignmentError(
        DynamicRoundRobinMtaskAssignmentError.NO_AVAILABLE_MICROTASKS,
        'No available microtasks' ) );
    }

    // if it's the first time or the last assigned microtask is the last one
    log.trace( 'Current index %s', index );

    if( _.isUndefined( index ) || index===( size-1 ) ){
      // reset or initialize the index
      index = 0;
      selectedMicrotask = microtasks[ index ];
    } else {
      index = index+1;
      if( index>=size )
        index = 0;
      selectedMicrotask = microtasks[ index ];
    }

    log.trace( 'Selecting the microtask in position %s (%s)', index, selectedMicrotask._id );

    // Setting the new value of the index
    task.microTaskAssignmentStrategy.params.index = index;
    task.markModified( 'microTaskAssignmentStrategy.params' );

    task.save( d.bind( function( err ) {
      if( err ) return callback( err );
      log.trace( 'Updating the index %s', index );

      return callback( null, selectedMicrotask );
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