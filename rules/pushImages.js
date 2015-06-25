// Load libraries
var CS = require( '../core' );
var async = require( 'async' );
var _ = require( 'underscore' );

// Create a child logger
var log = CS.log.child( {
  component: 'push moderated object'
} );

// Models
var Task = CS.models.task;
var ObjectModel = CS.models.object;
var ControlMart = CS.models.controlmart;

var pushObject = function( previousTask, object, taskId, callback ) {
  Task
    .findById( taskId )
    .exec( function( err, nextTask ) {
      if ( err ) return callback( err );

      if ( !nextTask )
        return callback( new Error( 'Invalid task' ) );


      ControlMart
        .findOne( {
          object: object,
          task: previousTask,
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
            log.trace( 'Object %s tagged as positive', object );
            ObjectModel
              .findById( object )
              .exec( function( err, object ) {
                if ( err ) return callback( err );

                var newObject = {
                  name: object.name,
                  data: object.data
                };


                return nextTask.addObjects( newObject, callback );
              } );

          } else {
            return callback();
          }
        } );

    } );
};

function onCloseObject( params, task, data, callback ) {
  log.trace( 'Performing the rule' );
  var objectId = data.objectId;

  var taskB = params.taskB;
  var taskC = params.taskC;

  if ( !taskC ) {
    log.error( 'No next task configured' );
    return callback();
  }
  if ( !taskB ) {
    log.error( 'No next task configured' );
    return callback();
  }

  return async.each( [ taskC, taskB ], _.partial( pushObject, task, objectId ), callback );


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
    taskB: 'string',
    taskC: 'string'
  }
};

module.exports = exports = rule;