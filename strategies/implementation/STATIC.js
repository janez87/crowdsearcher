
'use strict';
let _ = require( 'lodash' );
var util = require('util');
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'Static implementation' } );


// # Custom error
//
var CSError = require('../../core/error');
var StaticError = function( id, message ) {
  /* jshint camelcase: false */
  StaticError.super_.call( this, id, message);
};
util.inherits( StaticError, CSError );

// Error name
StaticError.prototype.name = 'StaticError';
// Custom error IDs
StaticError.NO_AVAILABLE_PLATFORMS = 'NO_AVAILABLE_PLATFORMS';

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
        execution: true,
        name: {
          $in: params.platforms
        }
      }
    }, function( err, task ) {
      if( err ) return callback( err );

      var size = task.platforms.length;

      if( size>0 ) {
        var selected = task.platforms[ 0 ]._id;
        return callback( null, selected );
      } else {
        return callback( new StaticError( StaticError.NO_AVAILABLE_PLATFORMS, 'No available platforms' ) );
      }
    } );
  }
};

module.exports = exports = strategy;