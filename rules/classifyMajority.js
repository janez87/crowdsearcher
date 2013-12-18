// ClassifyMajority rule
// ---
// Rule that implements the majority for a single classify operation


// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Classify Majority'
} );

// Models
var ControlMart = CS.models.controlmart;
var Execution = CS.models.execution;


function createMart( task, objects, params, callback ) {

  var operation = _.findWhere( task.operations, {
    label: params.operation
  } );

  var createControlMart = function( objectId, callback ) {
    log.trace( 'Creating the control mart for the object %s', objectId );
    var martToBeCreated = [];

    // Update the control mart
    var resultMart = {
      task: task._id,
      object: objectId,
      name: 'result',
      data: undefined,
      operation: operation._id
    };
    log.trace( 'Creating the mart for the result' );
    martToBeCreated.push( resultMart );

    var statustMart = {
      task: task._id,
      object: objectId,
      name: 'status',
      data: 'OPENED',
      operation: operation._id
    };
    log.trace( 'Creating the mart for the status' );
    martToBeCreated.push( statustMart );

    var evaluationtMart = {
      task: task._id,
      object: objectId,
      name: 'evaluations',
      data: 0,
      operation: operation._id
    };

    log.trace( 'Creating the mart for the evalutations' );
    martToBeCreated.push( evaluationtMart );

    _.each( operation.params.categories, function( category ) {
      log.trace( 'Creating the mart for the category %s', category );
      var categorytMart = {
        task: task._id,
        object: objectId,
        name: category,
        data: 0,
        operation: operation._id
      };
      martToBeCreated.push( categorytMart );
    } );

    return ControlMart.insert( martToBeCreated, callback );
  };


  return async.each( objects, createControlMart, callback );
}

function onOpenTask( params, task, data, callback ) {
  // In the open task the rule creates the controlmart

  log.trace( 'Creating the control mart at the OPEN_TASK' );

  var objects = task.objects;

  return createMart( task, objects, params, callback );

}

function onAddObjects( params, task, data, callback ) {

  log.trace( 'Creating the control mart at the ON_ADD_OBJECTS' );

  var objects = data.objectIds;

  return createMart( task, objects, params, callback );
}

function onEndTask( params, task, data, callback ) {
  // body...

  return callback();
}

function onAddMicrotasks( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndMicrotask( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule' );

  var executionId = data.executionId;
  var operationLabel = params.operation;

  Execution
    .findById( executionId )
    .exec( function( err, execution ) {
      if ( err ) return callback( err );

      if ( !execution )
        return callback( new Error( 'No execution retrieved' ) );

      var annotations = execution.annotations;
      var operation = _.findWhere( task.operations, {
        label: operationLabel
      } );

      log.trace( 'Performing the rule for the operation %s', operation.label );

      // Select only annotations of the current operation
      annotations = _.filter( annotations, function( annotation ) {
        log.trace( 'Operation (%s): %j', annotation.operation );
        log.trace( 'Operation: %j', annotation.operation );
        return annotation.operation.equals( operation._id );
      } );

      if ( annotations.length === 0 ) {
        log.trace( 'No annotations for this operation' );
        return callback();
      }

      // For each annotation (and objects) it checks the majority
      var checkMajority = function( annotation, callback ) {
        var objectId = annotation.object;
        var category = annotation.response;

        // Retrieves the control mart related to the object and operation
        ControlMart.get( {
          object: objectId,
          operation: annotation.operation

        }, function( err, controlmart ) {
          if ( err ) return callback( err );

          var result = _.findWhere( controlmart, {
            name: 'result'
          } ).data;

          var evaluations = _.findWhere( controlmart, {
            name: 'evaluations'
          } ).data;

          var categoryCount = {};
          _.each( operation.params.categories, function( category ) {
            var count = _.findWhere( controlmart, {
              name: category
            } );
            categoryCount[ category ] = count.data;
          } );

          var status = _.findWhere( controlmart, {
            name: 'status'
          } ).data;


          // Updating the various counters
          log.trace( 'Updating the count' );
          categoryCount[ category ] = categoryCount[ category ] + 1;
          evaluations++;

          // If the number of evaluations is equal to the required ones
          log.trace( 'Checking the majority' );
          if ( evaluations >= params.answers ) {

            // Get the category with the maximum count
            var maxCount = _.max( _.pairs( categoryCount ), function( p ) {
              return p[ 1 ];
            } );

            log.trace( 'The most selected category is %s', maxCount );

            // Verify if the maximum is unique
            var otherMax = _.where( _.pairs( categoryCount ), function( p ) {
              return p[ 1 ] === maxCount[ 1 ];
            } );

            // If it's unique it set the result
            if ( otherMax.length > 1 ) {
              result = undefined;
            } else {
              result = maxCount[ 0 ];
            }


            // If the max is greated or equal the agreement needed it close the object for this operation
            if ( maxCount[ 1 ] >= params.agreement ) {
              status = 'closed';
            }

          }

          var updatedMart = [];

          // Update the control mart
          var resultMart = {
            task: task._id,
            object: objectId,
            name: 'result',
            data: result,
            operation: operation._id
          };
          updatedMart.push( resultMart );

          var statustMart = {
            task: task._id,
            object: objectId,
            name: 'status',
            data: status,
            operation: operation._id
          };
          updatedMart.push( statustMart );

          var evaluationtMart = {
            task: task._id,
            object: objectId,
            name: 'evaluations',
            data: evaluations,
            operation: operation._id
          };
          updatedMart.push( evaluationtMart );

          _.each( operation.params.categories, function( category ) {
            log.trace( 'category %s', category );
            log.trace( 'count %s', categoryCount[ category ] );
            var categorytMart = {
              task: task._id,
              object: objectId,
              name: category,
              data: categoryCount[ category ],
              operation: operation._id
            };
            updatedMart.push( categorytMart );
          } );

          return ControlMart.insert( updatedMart, callback );
        } );
      };

      return async.each( annotations, checkMajority, callback );
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
    'OPEN_TASK': onOpenTask,
    // Description of what the rule does in this specific event.
    'END_TASK': onEndTask,
    // Description of what the rule does in this specific event.
    'ADD_MICROTASKS': onAddMicrotasks,
    // Description of what the rule does in this specific event.
    'END_MICROTASK': onEndMicrotask,
    // Description of what the rule does in this specific event.
    'END_EXECUTION': onEndExecution,
    'ON_ADD_OBJECTS': onAddObjects
  },


  // ## Parameters
  //
  //
  params: {
    // Label of the Operation
    operation: 'string',
    // Number of answers that triggers the majority
    answers: 'number',
    // Agreement will be reached here
    agreement: 'number'
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {
    if ( _.isUndefined( params.operation ) ) {
      log.error( 'The label of the operation must be specified' );
      return done( false );
    }

    if ( _.isUndefined( params.agreement ) || params.agreement <= 0 ) {
      log.error( 'The agreement must be an integer greater than 0' );
      return done( false );
    }

    if ( _.isUndefined( params.answers ) || params.answers <= 0 ) {
      log.error( 'The number of answers must be an integer greater than 0' );
      return done( false );
    }

    return done( true );
  },
};

module.exports = exports = rule;