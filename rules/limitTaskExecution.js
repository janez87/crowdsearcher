
// Load libraries
var _ = require('underscore');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Limit Task Execution' } );

// Models
var Execution = CS.models.execution;

function onEndExecution( params, task, data, callback ) {
  var maxExecution = params.maxExecution;

  Execution
  .find()
  .where( 'task', task._id )
  .where( 'status', 'CLOSED' )
  .count()
  .exec( function( err, count ) {
    if( err ) return callback( err );

    // Max reached, close Task
    if( count===maxExecution )
      return task.close( callback );

    // No problem, go ahead
    return callback();
  } );
}

// # Rule definition
//
// Description of the rule.
var rule = {
  // # Hooks
  //
  // Description of what the rule does in general.
  hooks: {
    // Description of what the rule does in this specific event.
    'END_EXECUTION': onEndExecution
  },

  // ## Parameters
  //
  //
  params: {
    maxExecution: 'number'
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {
    log.trace( 'Checking parameters' );

    if( _.isUndefined( params.maxExecution ) || params.maxExecution<0 ){
      log.error( 'The maxExecution parameter must be an integer greater than 0' );
      return done( false );
    }

    // Everything went better then expected...
    return done( true );
  },
};

module.exports = exports = rule;