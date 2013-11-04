
// Load libraries
var _ = require('underscore');
var util = require('util');
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'RoundRobin assignment' } );


// # Custom error
//
var CSError = require('../../core/error');
var RoundRobinError = function( id, message ) {
  /* jshint camelcase: false */
  RoundRobinError.super_.call( this, id, message);
};
util.inherits( RoundRobinError, CSError );

// Error name
RoundRobinError.prototype.name = 'RoundRobinError';
// Custom error IDs


// # RoundRobin Strategy
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
    task
    .populate( {
      path: 'tasks',
      match: {
        status: 'CREATED'
      }
    }, function( err, task ) {
      if( err ) return callback( err );

      var microtasks = task.microtasks;

      var size = microtasks.length;
      var selected = microtasks[ _.random( 0, size-1 ) ];

      return callback( null, selected );
    } );
  }
};

module.exports = exports = strategy;