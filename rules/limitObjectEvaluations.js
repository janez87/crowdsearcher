// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Limit Object Evaluations'
} );

// Models
var Execution = CS.models.execution;
var ObjectModel = CS.models.object;

function onEndExecution( params, task, data, callback ) {
  log.trace( 'Executing the rule' );

  var domain = require( 'domain' ).create();
  domain.on( 'error', callback );

  var maxExecution = params.maxExecution;
  var execution = data.execution;


  var objectIds = _.map( execution.annotations, function( annotation ) {
    return annotation.object;
  } );

  var checkObject = function( objectId, callback ) {
    Execution
      .find()
      .where( 'annotations.object', objectId )
      .count()
      .exec( domain.bind( function( err, count ) {
        if ( err ) return callback( err );

        log.trace( 'Found %s evaluations', count );

        // Max reached, close the object
        if ( count === maxExecution ) {
          log.trace( 'Limit reached, closing the object %s', objectId );
          ObjectModel.findById( objectId, domain.bind( function( err, object ) {
            if ( err ) return callback( err );

            return object.close( callback );
          } ) );
        } else {
          // No problem, go ahead
          return callback();
        }

      } ) );
  };

  return async.each( objectIds, checkObject, callback );
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

    if ( _.isUndefined( params.maxExecution ) || params.maxExecution < 0 ) {
      log.error( 'The maxExecution parameter must be an integer greater than 0' );
      return done( false );
    }

    // Everything went better then expected...
    return done( true );
  },
};

module.exports = exports = rule;