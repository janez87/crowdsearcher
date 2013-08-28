
// Load libraries
var util = require('util');
var domain = require( 'domain' );

var log = common.log.child( { component: 'Limit Task Execution' } );

// Models
var Execution = common.models.execution;

var CSError = require('../../error');
// Custom error
var LimitTaskExecutionError = function( id, message) {
  LimitTaskExecutionError.super_.call( this, id, message);
};

util.inherits( LimitTaskExecutionError, CSError );

// Error name
LimitTaskExecutionError.prototype.name = 'LimitTaskExecutionError';
// Error id list
LimitTaskExecutionError.BAD_PARAMETER = 'BAD_PARAMETER';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on('error', callback );

  var maxExecution = config.maxExecution;
  var task = data.task;

  Execution
  .find()
  .where( 'task', task._id )
  .exec( d.bind( function( err, count ) {
    if( err ) return callback( err );

    // No problem, go ahead
    if( count<maxExecution )
      return callback();

    // Max reached, close task
    task.closeTask( d.bind( callback ) );
  }) );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


var params = {
  maxExecution: 'number'
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
