
// Load libraries
var domain = require( 'domain' );
var _ = require('underscore');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Limit Task Execution' } );

// Models
var Execution = CS.models.execution;

var performRule = function( event, config, task, data, callback ) {
  var d = domain.create();
  d.on( 'error', callback );

  var maxExecution = config.maxExecution;

  Execution
  .find()
  .where( 'task', task._id )
  .where( 'status', 'CLOSED' )
  .count()
  .exec( d.bind( function( err, count ) {
    if( err ) return callback( err );

    // Max reached, close Microtask
    if( count===maxExecution )
      return task.close( d.bind( callback ) );

    // No problem, go ahead
    return callback();
  } ) );
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
