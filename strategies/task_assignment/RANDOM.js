
// Load libraries
var _ = require('underscore');
var util = require('util');
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'Random assignment' } );


// Import CS models
var Task = CS.models.task;

// # Custom error
//
var CSError = require('../../core/error');
var RandomError = function( id, message ) {
  /* jshint camelcase: false */
  RandomError.super_.call( this, id, message);
};
util.inherits( RandomError, CSError );

// Error name
RandomError.prototype.name = 'RandomError';
// Custom error IDs
RandomError.NO_AVAILABLE_TASKS = 'NO_AVAILABLE_TASKS';


// # RoundRobin Strategy
//
// STRATEGY DESCRIPTION
var strategy = {
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
      if( size>0 ) {
        var selected = tasks[ _.random( 0, size-1 ) ]._id;
        return callback( null, selected );
      } else {
        return callback( new RandomError( RandomError.NO_AVAILABLE_TASKS, 'No available tasks' ) );
      }
    } );
  }
};

module.exports = exports = strategy;