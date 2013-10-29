
// Load libraries
var util = require('util');
var domain = require('domain');

var log = CS.log.child( { component: 'Close MicroTask' } );

var JobStatuses = require( '../../config/constants' ).JobStatuses;
var TaskStatuses = require( '../../config/constants' ).TaskStatuses;

// Import Models
var Task = CS.models.task;



var CSError = require('../../error');
// Custom error
var CloseJobError = function( id, message) {
  /* jshint camelcase: false */
  CloseJobError.super_.call( this, id, message);
};

util.inherits( CloseJobError, CSError );

// Error name
CloseJobError.prototype.name = 'CloseJobError';
// ERROR IDs
CloseJobError.BAD_PARAMETER = 'BAD_PARAMETER';




var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();ù
  d.on( 'error', callback );

  var execution = data.execution;

  Task
  .where( 'job', execution.job )
  .where( 'status', TaskStatuses.OPENED )
  .count()
  .exec( d.bind( function( err, count ) {
    if( err ) return callback( err );

    log.trace( 'We have %s tasks OPENED', count );
    return callback();
  }) );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
