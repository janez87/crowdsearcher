

// Load libraries
var util = require('util');

// Create child logger
var log = common.log.child( { component: 'ImplementationStrategy plugin' } );


var TaskStatuses = require( '../../config/constants' ).TaskStatuses;

// Custom error
// ----
var CSError = require('../../error');
var ImplementationStrategyError = function( id, message) {
  ImplementationStrategyError.super_.call( this, id, message );
};

util.inherits( ImplementationStrategyError, CSError );

// Error name
ImplementationStrategyError.prototype.name = 'ImplementationStrategyError';

// Custom error IDs
ImplementationStrategyError.STRATEGY_NOT_FOUND = 'STRATEGY_NOT_FOUND';



// Implementation strategy
module.exports = exports = function implementationStrategyPlugin( schema ) {

  // Add the `implementationStrategy` field
  schema.add( {
    implementationStrategy: {
      type: {
        name: {
          type: String,
          required: true,
          'default': 'RANDOM'
        },

        params: {
          type: 'mixed',
          'default': {}
        }
      },
      select: false
    }
  } );


  // Pre check done before saving.
  schema.pre('save', function( next ) {
    this.checkImplementationStrategy( next );
  } );

  schema.methods.checkImplementationStrategy = function( callback ) {
    var name = this.implementationStrategy.name;
    var params = this.implementationStrategy.params;

    // Load strategy to perform the check
    var strategy = common.strategies.implementation[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new ImplementationStrategyError( ImplementationStrategyError.STRATEGY_NOT_FOUND,'The Implementation strategy '+name+' does not exist' ) );

    strategy.check( this, params, callback );
  };

  schema.methods.canSetImplementationStrategy = function() {
    return this.status<TaskStatuses.OPENED;
  };

  schema.methods.setImplementationStrategy = function( implementationStrategy, callback ) {
    if( this.canSetImplementationStrategy() ) {
      // Associate the implementationStrategy
      this.set( 'implementationStrategy', implementationStrategy );
      // Save the task, this will trigger the `pre` middleware.
      this.save( callback );
    } else {
      return callback( new Error( 'Cannot set ImplementationStrategy for the task, status is: '+this.status ) );
    }
  };

  schema.methods.performImplementationStrategy = function( data, callback ) {
    // Load the strategy configuration.
    var name = this.implementationStrategy.name;
    var params = this.implementationStrategy.params;
    log.trace( 'Performing Implementation Strategy %s', name );

    var strategy = common.strategies.implementation[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new ImplementationStrategyError( ImplementationStrategyError.STRATEGY_NOT_FOUND,'The Implementation strategy '+name+' does not exist' ) );

    strategy.perform( data, params, callback );
  };
};