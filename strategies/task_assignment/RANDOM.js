
// Load libraries
var _ = require('underscore');
var util = require('util');
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'RoundRobin assignment' } );


// Import CS models
var Task = CS.models.task;

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
  perform: function performStrategy( event, params, job, data, callback ) {
    Task
    .find()
    .where( 'job', job._id )
    .where( 'status' ).ne( 'CLOSED' )
    .exec( function( err, tasks ) {
      if( err ) return callback( err );

      var size = tasks.length;
      var selected = tasks[ _.random( 0, size-1 ) ]._id;
      return callback( null, selected );
    } );
  }
};

module.exports = exports = strategy;