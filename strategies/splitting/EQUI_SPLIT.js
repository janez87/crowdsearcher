
// Load libraries
var _ = require('underscore');
var util = require('util');
var async = require( 'async' );
var domain = require( 'domain' );


// Create a child logger
var log = common.log.child( { component: 'EquiSplit Splitting' } );


// Import Models.
var ObjectModel = common.models.object;

// # Custom error
//
var CSError = require('../../error');
var EquiSplitError = function( id, message ) {
  /* jshint camelcase: false */
  EquiSplitError.super_.call( this, id, message);
};
util.inherits( EquiSplitError, CSError );

// Error name
EquiSplitError.prototype.name = 'EquiSplitError';

// Custom error IDs
EquiSplitError.ZERO_OBJECTS = 'ZERO_OBJECTS';
EquiSplitError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
EquiSplitError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// # EquiSplit Strategy
//
// STRATEGY DESCRIPTION
var strategy = {
  // ## Parameters
  //
  params: {
    // Number of object for each Microtask.
    objectsNumber: 'number',
    // The data must be shuffled?
    shuffle: 'boolean'
  },

  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performStrategy( event, params, task, data, callback ) {

    // Find all non `closed` object for the current Task.
    ObjectModel
    .find()
    .where( 'task', task._id )
    .where( 'status' ).ne( 'CLOSED' )
    .select( '_id' )
    .lean()
    .exec( function( err, objects ) {
      if( err ) return callback( err );

      // Check object number.
      if( objects.length===0 ) {
        log.warn( 'No objects specified' );
        return callback();
      }

      // Shuffle the data if necessary
      if( params.shuffle ) {
        log.trace( 'Shuffling the objects' );
        objects = _.shuffle( objects );
      }

      log.trace( 'Got %s objects from the DB, will be grouped in %s', objects.length, params.objectsNumber );

      // Will handle the list of raw microtask to create.
      var microtaskToCreate = [];

      // Split the array into smaller array, each containing `objectsNumber` elements.
      var i, j, subArray;
      for( i=0, j=objects.length; i<j; i+=params.objectsNumber ) {
        var start = i;
        var end = start+params.objectsNumber;
        subArray = objects.slice( start, end );
        //log.trace( 'Slice from %s to %s: %j', start, end, subArray );
        var rawMicrotask = {
          platforms: task.platforms,
          operations: task.operations,
          objects: subArray
        };
        //log.trace( 'Associating %s objects to a microtask: %j', subArray.length, subArray );

        microtaskToCreate.push( rawMicrotask );
      }
      log.debug( 'Creating %s microtasks', microtaskToCreate.length );

      return task.addMicrotasks( microtaskToCreate, callback );
    } );
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {

    log.trace( 'Checking number of objects per microtask' );
    if( params.objectsNumber<1 )
      return done( false );

    return done( true );
  },
};

module.exports = exports = strategy;