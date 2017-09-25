'use strict';
let _ = require( 'lodash' );
var util = require( 'util' );
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Random Task assignment'
} );


// Import CS models
var Task = CS.models.task;
var Execution = CS.models.execution;

// # Custom error
//
var CSError = require( '../../core/error' );
var RandomError = function( id, message ) {
  /* jshint camelcase: false */
  RandomError.super_.call( this, id, message );
};
util.inherits( RandomError, CSError );

// Error name
RandomError.prototype.name = 'RandomError';
RandomError.prototype.fake = true;
// Custom error IDs
RandomError.NO_AVAILABLE_TASKS = 'NO_AVAILABLE_TASKS';



var executed = function( performer, task, callback ) {
  Execution
    .find()
    .where( 'task', task )
    .where( 'performer', performer )
    .where( 'status', 'CLOSED' )
    .exec( function( err, data ) {
      if ( err ) return callback( err );

      console.log( data );
      if ( data.length === 0 ) {
        log.trace( 'CAN DOOOO' );
        return callback( true );
      } else {
        return callback( false );
      }
    } );
};
// # RoundRobin Strategy
//
// STRATEGY DESCRIPTION
var strategy = {
  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performStrategy( event, params, job, data, callback ) {

    var performer = data.performer;

    debugger;
    log.trace( performer );

    Task
      .find()
      .where( 'job', job._id )
      .where( 'status' ).ne( 'CLOSED' )
      .exec( function( err, tasks ) {
        if ( err ) return callback( err );

        if ( performer ) {
          return async.filter( tasks, _.partial( executed, performer ), function( selectedTasks ) {
            var size = selectedTasks.length;
            if ( size > 0 ) {
              var selected = selectedTasks[ _.random( 0, size - 1 ) ]._id;
              return callback( null, selected );
            } else {
              return callback( new RandomError( RandomError.NO_AVAILABLE_TASKS, 'No available tasks' ) );
            }

          } );
        }

        var size = tasks.length;
        if ( size > 0 ) {
          var selected = tasks[ _.random( 0, size - 1 ) ]._id;
          return callback( null, selected );
        } else {
          return callback( new RandomError( RandomError.NO_AVAILABLE_TASKS, 'No available tasks' ) );
        }
      } );
  }
};

module.exports = exports = strategy;