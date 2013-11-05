
// Load libraries
var _ = require('underscore');
var util = require('util');
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'EquiSplit Group By' } );


// Import Models.
var ObjectModel = CS.models.object;

// # Custom error
//
var CSError = require('../../core/error');
var GroupByEquiSplitError = function( id, message ) {
  /* jshint camelcase: false */
  GroupByEquiSplitError.super_.call( this, id, message);
};
util.inherits( GroupByEquiSplitError, CSError );

// Error name
GroupByEquiSplitError.prototype.name = 'GroupByEquiSplitError';

// Custom error IDs
GroupByEquiSplitError.ZERO_OBJECTS = 'ZERO_OBJECTS';
GroupByEquiSplitError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
GroupByEquiSplitError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// # EquiSplit Strategy
//
// STRATEGY DESCRIPTION
var strategy = {
  // ## Parameters
  //
  params: {
    // Number of object for each Microtask.
    field: 'string',
    // Number of object for each Microtask.
    objectsNumber: 'number',
    // The data must be shuffled?
    shuffle: 'boolean'
  },

  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performStrategy( event, params, task, data, callback ) {
    var field = params.field;

    // Find all non `closed` object for the current Task.
    ObjectModel
    .find()
    .where( 'task', task._id )
    .where( 'status' ).ne( 'CLOSED' )
    .lean()
    .exec( function( err, objects ) {
      if( err ) return callback( err );

      // Check object number.
      if( objects.length===0 ) {
        log.warn( 'No objects specified' );
        return callback();
      }

      var objectGroups = _.groupBy( objects, function( object ) {
        return object.data[ field ];
      } );

      // Shuffle the data if necessary
      if( params.shuffle ) {
        log.trace( 'Shuffling the objects' );
        _.each( objectGroups, function ( arr, key ) {
          objectGroups[ key ] = _.shuffle( arr );
        } );
      }

      log.trace( 'Got %s objects from the DB, will be grouped by %s in %s', objects.length, field, params.objectsNumber );

      // Will handle the list of raw microtask to create.
      var microtaskToCreate = [];

      // Split each array contained into `objectGroups` into smaller array,
      // each containing at most `objectsNumber` elements.
      _.each( objectGroups, function ( objectList ) {
        var i, j, subArray;
        for( i=0, j=objectList.length; i<j; i+=params.objectsNumber ) {
          var start = i;
          var end = start+params.objectsNumber;
          subArray = objectList.slice( start, end );
          //log.trace( 'Slice from %s to %s: %j', start, end, subArray );
          var rawMicrotask = {
            platforms: task.platforms,
            operations: task.operations,
            objects: subArray
          };
          //log.trace( 'Associating %s objects to a microtask: %j', subArray.length, subArray );

          microtaskToCreate.push( rawMicrotask );
        }
      } );
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