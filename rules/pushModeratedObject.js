'use strict';
let _ = require( 'lodash' );
var CS = require( '../core' );
var request = require( 'request' );
// Create a child logger
var log = CS.log.child( {
  component: 'push moderated object'
} );

// Models
var Task = CS.models.task;
var ObjectModel = CS.models.object;
var ControlMart = CS.models.controlmart;

function notifyEndpoint( id, answer, endpoint, callback ) {

  var object = {
    id: id,
    moderated: answer,
    data: 'asdasdasdasd'
  };

  var options = {
    json: true,
    body: object
  };

  log.trace( options );

  return request.post( endpoint, options, callback );
}

function onCloseObject( params, task, data, callback ) {
  log.trace( 'Performing the rule' );
  var objectId = data.objectId;

  var nextTaskId = params.task;

  if ( !nextTaskId ) {
    log.error( 'No next task configured' );
    return callback();
  }

  Task
    .findById( nextTaskId )
    .exec( function( err, nextTask ) {
      if ( err ) return callback( err );

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

                var newObject = {
                  name: object.name,
                  data: object.data
                };


                return nextTask.addObjects( newObject, function() {
                  return notifyEndpoint( object.data.id, result, params.endpoint + '/approve', callback );
                } );
              } );

          } else {
            log.trace( 'Object %s tagged as negative', objectId );
            ObjectModel
              .findById( objectId )
              .exec( function( err, object ) {
                if ( err ) return callback( err );

                return notifyEndpoint( object.data.id, result, params.endpoint + '/reject', callback );
              } );
          }
        } );

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
    task: 'string',
    endpoint: 'string'
  }
};

module.exports = exports = rule;