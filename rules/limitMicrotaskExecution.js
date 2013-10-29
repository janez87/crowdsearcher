
// Load libraries
var domain = require( 'domain' );
var _ = require('underscore');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Limit MicroTask Execution' } );

// Models
var Execution = CS.models.execution;

var performRule = function( event, config, task, data, callback ) {
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
