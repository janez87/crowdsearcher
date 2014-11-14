// Load libraries
var CS = require( '../core' );
var request = require( 'request' );
// Create a child logger
var log = CS.log.child( {
  component: 'push hihglited object'
} );

// Models
var ObjectModel = CS.models.object;
var ControlMart = CS.models.controlmart;

function notifyEndpoint( id, answer, endpoint, callback ) {

  var object = {
    id: id,
    hihglited: answer
  };

  var options = {
    json: true,
    body: JSON.stringify( object )
  };

  return request.post( options, callback );
}

function onCloseObject( params, task, data, callback ) {
  log.trace( 'Performing the rule' );

  var objectId = data.objectId;

  ControlMart
    .findOne( {
      object: objectId,
      task: task,
      name: 'result'
    } )
    .exec( function( err, mart ) {
      if ( err ) return callback( err );

      if ( !mart ) {
        log.error( 'no mart retrieved' );
        return callback();
      }

      var result = mart.data;

      if ( result === 'si' ) {
        log.trace( 'Object %s tagged as positive', objectId );
        ObjectModel
          .findById( objectId )
          .exec( function( err, object ) {
            if ( err ) return callback( err );

            return notifyEndpoint( object.data.id, result, params.endpoint + '/hihglited', callback );
          } );

      } else {
        log.trace( 'Object %s tagged as negative', objectId );

        return callback();
      }
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
    'CLOSE_OBJECT': onCloseObject
  },
  params: {
    endpoint: 'string'
  }
};

module.exports = exports = rule;