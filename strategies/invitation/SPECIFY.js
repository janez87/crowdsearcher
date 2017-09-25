
'use strict';
let _ = require( 'lodash' );
var async = require('async');
var util = require('util');
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'SPECIFY invitation' } );


// # Custom error
//
var CSError = require('../../core/error');
var SpecifyInvitationError = function( id, message ) {
  /* jshint camelcase: false */
  SpecifyInvitationError.super_.call( this, id, message);
};
util.inherits( SpecifyInvitationError, CSError );

// Error name
SpecifyInvitationError.prototype.name = 'SpecifyInvitationError';
// Custom error IDs


// # Random Strategy
//
// STRATEGY DESCRIPTION
var strategy = {
  // ## Parameters
  //
  params: {
    // The platforms to use for the invitation.
    platforms: ['string']
  },

  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performStrategy( event, params, task, data, callback ) {

    task
    .populate( {
      path: 'platforms',
      match: {
        enabled: true,
        invitation: true,
        name: {
          $in: params.platforms
        }
      }
    }, function( err, task ) {
      if( err ) return callback( err );

      function invite( platform, cb ) {
        var implementation = platform.implementation;

        implementation.invite( task, platform, cb );

      }

      async.each( task.platforms, invite, callback );
    } );
  }
};

module.exports = exports = strategy;