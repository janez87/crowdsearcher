
// Load libraries
var util = require('util');
var domain = require( 'domain' );

var log = CS.log.child( { component: 'Limit MicroTask Execution' } );

// Models
var Execution = CS.models.execution;

var CSError = require('../../error');
// Custom error
var LimitMicrotaskExecutionError = function( id, message) {
  LimitMicrotaskExecutionError.super_.call( this, id, message);
};

util.inherits( LimitMicrotaskExecutionError, CSError );

// Error name
LimitMicrotaskExecutionError.prototype.name = 'LimitMicrotaskExecutionError';
// Error id list
LimitMicrotaskExecutionError.BAD_PARAMETER = 'BAD_PARAMETER';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on('error', callback );

  var maxExecution = config.maxExecution;
  var microtask = data.microtask;

  Execution
  .find()
  .where( 'microtask', microtask._id )
  .count()
  .exec( d.bind( function( err, count ) {
    if( err ) return callback( err );

    log.trace( 'Found %s executions of %s max', count, maxExecution );

    // Max reached, close Microtask
    if( count===maxExecution )
      return microtask.closeMicroTask( d.bind( callback ) );

    // No problem, go ahead
    return callback();
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
