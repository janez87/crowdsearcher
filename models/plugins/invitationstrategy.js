// Load libraries
var util = require('util');
var mongo = require('mongoose');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;


// Create a child logger
var log = common.log.child( { component: 'InvitationStrategy plugin' } );


var TaskStatuses = require( '../../config/constants' ).TaskStatuses;



// Cutom error
// ----
var CSError = require('../../error');
var InvitationStrategyError = function( id, message) {
  /* jshint camelcase: false */
  InvitationStrategyError.super_.call( this, id, message);
};

util.inherits( InvitationStrategyError, CSError );

// Error name
InvitationStrategyError.prototype.name = 'InvitationStrategyError';

// Custom error IDs
InvitationStrategyError.STRATEGY_NOT_FOUND = 'STRATEGY_NOT_FOUND';








// Invitation strategy
module.exports = exports = function invitationStrategyPlugin( schema ) {

  // Add the `invitationStrategy` field
  schema.add( {
    invitationStrategy: {
      name:  {
        type: String
      },
      params: {
        type: Mixed,
        'default': {}
      }
    }
  } );


  // Pre check done before saving.
  schema.pre('save', function(next) {
    this.checkInvitationStrategy( next );
  } );

  schema.methods.checkInvitationStrategy = function( callback ) {
    var name = this.invitationStrategy.name;
    var params = this.invitationStrategy.params;

    // if the name is not present then ok
    if( !name )
      return callback();

    // Load strategy to perform the check
    var strategy = common.strategies.invitation[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new InvitationStrategyError( InvitationStrategyError.STRATEGY_NOT_FOUND,'The Invitation strategy '+name+' does not exist' ) );

    strategy.check( this, params, callback );
  };


  schema.methods.canSetInvitationStrategy = function() {
    return this.status<=TaskStatuses.OPENED;
  };

  schema.methods.setInvitationStrategy = function( invitationStrategy, callback ) {
    if( this.canSetInvitationStrategy() ) {
      // Associate the invitationStrategy
      this.set( 'invitationStrategy', invitationStrategy );
      // Save the task, this will trigger the `pre` middleware.
      this.save( callback );
    } else {
      return callback( new Error( 'Cannot set InvitationStrategy for the task, status is: '+this.status ) );
    }
  };

  schema.methods.performInvitationStrategy = function( data, callback ) {
    // Load the strategy configuration.
    var name = this.invitationStrategy.name;
    var params = this.invitationStrategy.params;
    log.trace( 'Performing Invitation Strategy %s', name );

    var strategy = common.strategies.invitation[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new InvitationStrategyError( InvitationStrategyError.STRATEGY_NOT_FOUND,'The invitation strategy '+name+' does not exist' ) );

    strategy.perform( data, params, callback );
  };
};