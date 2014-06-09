// Load libraries
var CS = require( '../core' );
var async = require( 'async' );
var _ = require( 'underscore' );

// Create a child logger
var log = CS.log.child( {
  component: 'Check GroundTruth'
} );

var Execution = CS.models.execution;
var ControlMart = CS.models.controlmart;

var createMart = function( params, task, data, callback ) {

  var martToBeCreated = [];

  var operations = task.operations;
  var objects = task.objects;

  for ( var i = 0; i < operations.length; i++ ) {
    var op = operations[ i ];

    for ( var j = 0; j < objects.length; j++ ) {
      var o = objects[ j ];

      var right = {
        task: task._id,
        operation: op,
        object: o,
        name: 'gt_right',
        data: 0
      };

      martToBeCreated.push( right );

      var wrong = {
        task: task._id,
        operation: op,
        object: o,
        name: 'gt_wrong',
        data: 0
      };

      martToBeCreated.push( wrong );

      var evaluations = {
        task: task._id,
        operation: op,
        object: o,
        name: 'gt_evaluations',
        data: 0
      };

      martToBeCreated.push( evaluations );
    }
  }

  return ControlMart.insert( martToBeCreated, callback );

};

function onOpenTask( params, task, data, callback ) {
  log.trace( 'Creating the mart' );
  return createMart( params, task, data, callback );
}

function onAddObbjects( params, task, data, callback ) {
  return createMart( params, task, data, callback );
}

function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule' );

  var executionId = data.executionId;

  Execution
    .findById( executionId )
    .exec( function( err, execution ) {
      if ( err ) return callback( err );

      if ( !execution )
        return callback( new Error( 'No execution found' ) );

      var annotations = execution.annotations;

      var checkGT = function( annotation, callback ) {
        var response = annotation.response;

        var tuple = {
          task: task._id,
          operation: annotation.operation,
          object: annotation.object
        };
        ControlMart.select( tuple, [ 'gt_value', 'gt_evaluations', 'gt_wrong', 'gt_right' ], function( err, tuples ) {
          if ( err ) return callback( err );

          if ( tuples.length === 0 ) {
            log.trace( 'No tuples found' );
            return callback();
          }

          var gt = _.findWhere( tuples, {
            name: 'gt_value'
          } );

          if ( _.isUndefined( gt ) || _.isUndefined( gt.data ) ) {
            log.trace( 'No ground truth specfied for the object %s', annotation.object );
            return callback();
          }

          var evaluations = _.findWhere( tuples, {
            name: 'gt_evaluations'
          } );

          var right = _.findWhere( tuples, {
            name: 'gt_right'
          } );

          var wrong = _.findWhere( tuples, {
            name: 'gt_wrong'
          } );

          evaluations.data = evaluations.data + 1;

          if ( gt.data === response ) {
            right.data++;
          } else {
            wrong.data++;
          }

          log.trace( evaluations );
          log.trace( right );
          log.trace( wrong );

          var updatedTuples = [ evaluations, right, wrong ];

          return ControlMart.insert( updatedTuples, callback );


        } );
      };

      return async.each( annotations, checkGT, callback );
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
    'END_EXECUTION': onEndExecution,
    'OPEN_TASK': onOpenTask,
    'ADD_OBJECTS': onAddObbjects
  }
};

module.exports = exports = rule;