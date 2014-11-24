// Load libraries
var CS = require( '../core' );
var request = require( 'request' );
var async = require( 'async' );

// Create a child logger
var log = CS.log.child( {
  component: 'push object'
} );

// Models
var Execution = CS.models.execution;
var ObjectModel = CS.models.object;

function notifyEndpoint( id, endpoint, callback ) {

  log.trace( endpoint );
  var object = {
    id: id
  };

  var options = {
    json: true,
    body: object
  };

  return request.post( endpoint, options, callback );
}

function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule' );

  var executionId = data.executionId;

  Execution
    .findById( executionId )
    .exec( function( err, execution ) {
      if ( err ) return callback( err );

      var annotations = execution.annotations;

      var checkAnnotations = function( annotation, cb ) {

        var response = annotation.response;
        var objectId = annotation.object;

        return ObjectModel
          .findById( objectId )
          .exec( function( err, object ) {
            if ( err ) return cb( err );

            log.trace( response );
            if ( response === 'si' ) {
              return notifyEndpoint( object.data.id, params.endpoint + '/approve', cb );
            } else if ( response === 'no' ) {
              return notifyEndpoint( object.data.id, params.endpoint + '/reject', cb );
            } else {
              return notifyEndpoint( object.data.id, params.endpoint + '/highlight', cb );
            }
          } );

      };

      return async.each( annotations, checkAnnotations, callback );
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
  params: {
    endpoint: 'string'
  }
};

module.exports = exports = rule;