
// Load libraries
var util = require('util');
var domain = require( 'domain' );
var _ = require('underscore');

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

var performRule = function( event, config, task, data, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on('error', callback );

  var maxExecution = config.maxExecution;

  Execution
  .find()
  .where( 'task', task._id )
  .count()
  .exec( d.bind( function( err, count ) {
    if( err ) return callback( err );

    log.trace( 'Found %s executions of %s max', count, maxExecution );

    // Max reached, close task
    if( count===maxExecution )
      return task.closeTask( d.bind( callback ) );

    // No problem, go ahead
    return callback();
  }) );
};

var checkParameters = function( params, done ) {
  log.trace( 'Checking parameters' );

  if(_.isUndefined(params.maxExecution) || params.maxExecution<0){
    log.error('The maxExecution paramter must be an integer greater than 0');
    return done(false);
  }
  // Everything went better then expected...
  return done(true);
};


var params = {
  maxExecution: 'number'
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
