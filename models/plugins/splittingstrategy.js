

// Load libraries
var util  = require('util');

// Create a child logger
var log = common.log.child( { component: 'SplittingStrategy plugin' } );

var TaskStatuses = require( '../../config/constants' ).TaskStatuses;



// Cutom error
// ----
var CSError = require('../../error');
var SplittingStrategyError = function( id, message) {
  /* jshint camelcase: false */
  SplittingStrategyError.super_.call( this, id, message );
};

util.inherits( SplittingStrategyError, CSError );

// Error name
SplittingStrategyError.prototype.name = 'SplittingStrategyError';

// Custom error IDs
SplittingStrategyError.STRATEGY_NOT_FOUND = 'STRATEGY_NOT_FOUND';






// Splitting strategy
module.exports = exports = function splittingStrategyPlugin( schema ) {

  // Add the `splittingStrategy` field
  schema.add( {
    splittingStrategy: {
      name: {
        type: String,
        required: true
      },

      params: {
        type: 'mixed',
        'default': {},
      }
    }
  } );


  // Pre check done before saving.
  schema.pre('save', function( next ) {
    // Check before save
    this.checkSplittingStrategy( next );
  });

  schema.methods.checkSplittingStrategy = function( callback ) {
    var name = this.splittingStrategy.name;
    var params = this.splittingStrategy.params;

    // Load strategy to perform the check
    var strategy = common.strategies.splitting[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new SplittingStrategyError( SplittingStrategyError.STRATEGY_NOT_FOUND,'The Splitting strategy '+name+' does not exist' ) );

    strategy.check( this, params, callback );
  };

  schema.methods.canSetSplittingStrategy = function() {
    return this.status<=TaskStatuses.OPENED;
  };

  schema.methods.setSplittingStrategy = function( splittingStrategy, callback ) {
    if( this.canSetSplittingStrategy() ) {
      // Associate the splittingStrategy
      this.set( 'splittingStrategy', splittingStrategy );
      // Save the task, this will trigger the `pre` middleware.
      this.save( callback );
    } else {
      return callback( new Error( 'Cannot set SplittingStrategy for the task, status is: '+this.status ) );
    }
  };

  schema.methods.performSplittingStrategy = function( data, callback ) {
    // Load the strategy configuration.
    var name = this.splittingStrategy.name;
    var params = this.splittingStrategy.params;
    log.trace( 'Performing Splitting Strategy %s', name );

    var strategy = common.strategies.splitting[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new SplittingStrategyError( SplittingStrategyError.STRATEGY_NOT_FOUND,'The Splitting strategy '+name+' does not exist' ) );

    strategy.perform( data, params, callback );
  };
};