
// Load libraries
var _ = require('underscore');
var util = require('util');
var domain = require('domain');
var MicroTaskStatuses = require('../../../config/constants').MicroTaskStatuses;


// Child logger
var log = CS.log.child( { component: 'AvoidMicroTaskAssignmentStrategy' } );


// Import Models
var Microtask = CS.models.microtask;
var User = CS.models.user;

// Custom error
// ---
var CSError = require('../../../error');
var AvoidMicroTaskAssignmentError = function( id, message) {
  /* jshint camelcase: false */
  AvoidMicroTaskAssignmentError.super_.call( this, id, message );
};

util.inherits( AvoidMicroTaskAssignmentError, CSError );
// Error name
AvoidMicroTaskAssignmentError.prototype.name = 'AvoidMicroTaskAssignmentError';
// Custom error IDs
AvoidMicroTaskAssignmentError.NO_AVAILABLE_MICROTASKS = 'NO_AVAILABLE_MICROTASKS';
AvoidMicroTaskAssignmentError.NO_MICROTASK_SELECTED = 'NO_MICROTASK_SELECTED';
AvoidMicroTaskAssignmentError.NO_PERFORMER = 'NO_PERFORMER';




// Sequence Task Assignment Strategy
var performStrategy = function( data, params, callback ) {
  var task = data.task;
  var performerId = data.performer;

  // Create a domain to handle mongoose errors
  var d = domain.create();
  d.on( 'error', callback );

  var selectedMicrotask;

  var microtaskQuery = Microtask
  .where( 'task', task._id )
  .where( 'status', MicroTaskStatuses.OPENED );

  // No performer specified
  if( !performerId )
    return callback( new AvoidMicroTaskAssignmentError(
          AvoidMicroTaskAssignmentError.NO_PERFORMER,
          'No performer speficied' ) );

  // Perform user query
  User.findById( performerId, d.bind( function( err, performer ) {
    if( err ) return callback( err );

    var microtasksToAvoid = performer.getMetadata( 'microtasksToAvoid' );
    if( microtasksToAvoid ) {
      microtaskQuery
      .where( '_id' ).nin( microtasksToAvoid );
    }

    log.trace( 'Performer found with microtasksToAvoid: %j', microtasksToAvoid );

    microtaskQuery
    .exec( d.bind( function( err, microtasks ) {
      if( err ) return callback( err );

      selectedMicrotask = microtasks[ _.random( microtasks.length-1 ) ];

      if( !selectedMicrotask )
        return callback( new AvoidMicroTaskAssignmentError(
          AvoidMicroTaskAssignmentError.NO_MICROTASK_SELECTED,
          'No microtask selected' ) );

      log.trace( 'Got %s microtasks, selected %s', microtasks.length, selectedMicrotask._id );

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