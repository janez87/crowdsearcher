

// Load libraries
var util = require('util');

// Create a child logger
var log = common.log.child( { component: 'MicroTaskAssignmentStrategy plugin' } );


// Cutom error
// ----
var CSError = require('../../error');
var MicroTaskAssigmentStrategyError = function( id, message) {
  /* jshint camelcase: false */
  MicroTaskAssigmentStrategyError.super_.call( this, id, message );
};

util.inherits( MicroTaskAssigmentStrategyError, CSError );

// Error name
MicroTaskAssigmentStrategyError.prototype.name = 'MicroTaskAssigmentStrategyError';

// Custom error IDs
MicroTaskAssigmentStrategyError.STRATEGY_NOT_FOUND = 'STRATEGY_NOT_FOUND';





// Micro TaskAssigment strategy
module.exports = exports = function microTaskAssignmentStrategyPlugin( schema ) {

  // Add the `microTaskAssignmentStrategy` field
  schema.add( {
    microTaskAssignmentStrategy: {
      type: {
        name: {
          type: 'string',
          required: true,
          'default': 'DYNAMIC_ROUNDROBIN'
        },

        params: {
          type: 'mixed',
          'default': {}
        }
      },
    }
  } );


  // Pre check done before saving.
  schema.pre('save', function( next ) {
    this.checkMicroTaskAssignmentStrategy( next );
  } );

  schema.methods.checkMicroTaskAssignmentStrategy = function( callback ) {
    var name = this.microTaskAssignmentStrategy.name;
    var params = this.microTaskAssignmentStrategy.params;

    // Load strategy to perform the check
    var strategy = common.strategies.microtaskAssignment[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new MicroTaskAssigmentStrategyError( MicroTaskAssigmentStrategyError.STRATEGY_NOT_FOUND,'The Microtask Assignment strategy '+name+' does not exist' ) );

    strategy.check( this, params, callback );
  };

  schema.methods.setMicroTaskAssignmentStrategy = function( microTaskAssignmentStrategy, callback ) {
    // Associate the microTaskAssignmentStrategy
    this.microTaskAssignmentStrategy = microTaskAssignmentStrategy;
    // Save the task, this will trigger the `pre` middleware.
    this.save( callback );
  };


  schema.methods.performMicroTaskAssigmentStrategy = function( data, callback ) {
     // Load the strategy configuration.
    var name = this.microTaskAssignmentStrategy.name;
    var params = this.microTaskAssignmentStrategy.params;
    log.trace( 'Performing Microtask Assignment Strategy %s', name );

    var strategy = common.strategies.microtaskAssignment[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new MicroTaskAssigmentStrategyError( MicroTaskAssigmentStrategyError.STRATEGY_NOT_FOUND,'The Microtask Assignment strategy '+name+' does not exist' ) );

    strategy.perform( data, params, callback );
  };
};