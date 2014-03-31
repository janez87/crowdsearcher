// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'HotOrNot Splitting'
} );


// Import Models.
var ObjectModel = CS.models.object;

// # Custom error
//
var CSError = require( '../../core/error' );
var HotOrNotError = function( id, message ) {
  /* jshint camelcase: false */
  HotOrNotError.super_.call( this, id, message );
};
util.inherits( HotOrNotError, CSError );

// Error name
HotOrNotError.prototype.name = 'HotOrNotError';

// Custom error IDs
HotOrNotError.ZERO_OBJECTS = 'ZERO_OBJECTS';
HotOrNotError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
HotOrNotError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';



function onOpenTask( params, task, data, callback ) {
  var domain = require( 'domain' ).createDomain();
  domain.on( 'error', callback );


  ObjectModel
    .find()
    .where( 'task', task._id )
    .where( 'status', 'CREATED' )
    .select( '_id' )
    .lean()
    .exec( function( err, objects ) {
      if ( err ) return callback( err );


      if ( objects.length <= 1 ) {
        return callback( new HotOrNotError( HotOrNotError.NOT_ENOUGH_OBJECTS, 'The Task does not have enough open objects' ) );
      }

      objects = _.shuffle( objects );
      // Creating the raw microtasks
      var microTaskList = [];
      for ( var i = 0; i < objects.length; i++ ) {
        for ( var k = i + 1; k < objects.length; k++ ) {
          log.trace( 'Generating the comparison for the object %s with %s', objects[ i ].toString(), objects[ k ].toString() );

          var couple = [ objects[ i ], objects[ k ] ];

          var rawMicroTask = {
            platforms: task.platforms,
            objects: couple,
            operations: task.operations,
            task: task
          };

          microTaskList.push( rawMicroTask );

        }
      }

      return task.addMicrotasks( microTaskList, domain.bind( callback ) );

    } );

}

// # HOtOrNot Strategy
//
// STRATEGY DESCRIPTION
var strategy = {

  // # Hooks
  //
  // Description of what the strategy does in general.
  hooks: {
    'OPEN_TASK': onOpenTask
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {

    log.trace( 'Checking number of objects per microtask' );
    if ( params.objectsNumber < 1 )
      return done( false );

    return done( true );
  },
};

module.exports = exports = strategy;