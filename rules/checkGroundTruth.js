'use strict';
var CS = require( '../core' );
var async = require( 'async' );
let _ = require( 'lodash' );

// Create a child logger
var log = CS.log.child( {
  component: 'Check GroundTruth'
} );

var Execution = CS.models.execution;
var ControlMart = CS.models.controlmart;

var createMart = function( params, task, data, callback ) {

  var operations = task.operations;
  var objects = task.objects;

  var bulk = ControlMart.collection.initializeUnorderedBulkOp();
  var numInsertOperation = 0;
  for ( var i = 0; i < operations.length; i++ ) {
    var op = operations[ i ];

    op = op._id;
    for ( var j = 0; j < objects.length; j++ ) {
      var o = objects[ j ];

      var right = {
        task: task._id,
        operation: op,
        object: o,
        name: 'gt_right',
        data: 0
      };
      bulk.insert( right ); numInsertOperation++;

      var wrong = {
        task: task._id,
        operation: op,
        object: o,
        name: 'gt_wrong',
        data: 0
      };

      bulk.insert( wrong ); numInsertOperation++;

      var evaluations = {
        task: task._id,
        operation: op,
        object: o,
        name: 'gt_evaluations',
        data: 0
      };

      bulk.insert( evaluations ); numInsertOperation++;
    }
  }

  log.trace( 'Creating %d elements in the mart', numInsertOperation );

  bulk.execute( function( err, result ) {
    if ( err ) return callback( err );

    log.trace( 'Added %d mart elements', result.nInserted );
    return callback();
  } );
  /*
  return ControlMart.collection.insert( martToBeCreated, function( err ) {
    if ( err ) return callback( err );

    log.trace( 'Mart elements added' );
    return callback();
  } );
  */
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

      var checkGT = function( annotation, cb ) {
        var response = annotation.response;

        var tuple = {
          task: task._id,
          operation: annotation.operation,
          object: annotation.object
        };
        ControlMart.select( tuple, [ 'gt_value', 'gt_evaluations', 'gt_wrong', 'gt_right' ], function( err, tuples ) {
          if ( err ) return cb( err );

          if ( tuples.length === 0 ) {
            log.trace( 'No tuples found' );
            return cb();
          }

          var gt = _.findWhere( tuples, {
            name: 'gt_value'
          } );

          if ( _.isUndefined( gt ) || _.isUndefined( gt.data ) ) {
            log.trace( 'No ground truth specfied for the object %s', annotation.object );
            return cb();
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

          /*
          log.trace( evaluations );
          log.trace( right );
          log.trace( wrong );
          */

          var updatedTuples = [ evaluations, right, wrong ];

          return ControlMart.insert( updatedTuples, cb );


        } );
      };

      return async.eachSeries( annotations, checkGT, callback );
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