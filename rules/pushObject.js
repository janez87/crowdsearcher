// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( {
  component: 'Close Microtask'
} );

// Models
var Task = CS.models.task;
var ObjectModel = CS.models.object;
var ControlMart = CS.models.controlmart;

function onCloseObject( params, task, data, callback ) {
  var objectId = data.objectId;

  var nextTaskId = params.task;

  if ( !nextTaskId ) {
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

          if ( result === 'yes' ) {
            log.trace( 'Object %s tagged as positive', objectId );
            ObjectModel
              .findById( objectId )
              .exec( function( err, object ) {
                if ( err ) return callback( err );

                var newObject = {
                  name: object.name,
                  data: object.data
                };

                return nextTask.addObjects( newObject, callback );
              } );

          } else {
            log.trace( 'Object %s tagged as negative' );
            return callback();
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
    task: 'string'
  }
};

module.exports = exports = rule;