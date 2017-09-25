'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
let async = require( 'async' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration
let ControlMart = CS.models.controlmart;
let Execution = CS.models.execution;
let log = CS.log.child( {
  component: 'Classify Majority'
} );

// Module functions declaration
function createMart( task, objects, params, callback ) {
  // Get specified operation
  let operationLabel = params.operation;
  let operation = _.find( task.operations, {
    label: operationLabel
  } );

  if( !operation ) {
    let error = new Error( `Operation "${operationLabel}" not found` );
    return Promise.reject( error ).asCallback( callback );
  }

  // Create initial mart objects
  let initialMartObjects = [
    { name: 'result', data: undefined },
    { name: 'status', data: 'OPENED' },
    { name: 'evaluations', data: 0 },
  ];
  // Add categories counts
  _.each( operation.params.categories, category => {
    initialMartObjects.push( {
      [category]: 0,
    } )
  } );

  // Get ids from object
  let taskId = task._id;
  let operationId = operation._id;



  // Add mart object for each object
  let martData = [];
  _.each( objects, objectId => {
    _.each( initialMartObjects, data => {
      martData.push( _.assign( {}, data, {
        task: taskId,
        operation: operationId,
        object: objectId,
      } ) );
    } );
  } );

  let numOperations = objects.length*initialMartObjects.length;
  log.trace( 'Bulk ready with %d operations', numOperations );

  // Create promise
  let promise;
  if( numOperations===0 ) {
    log.trace( 'No operation todo, bye' );
    promise = Promise.resolve();
  } else {
    let collection = ControlMart.collection;

    // Create groups of 10 bulk operations
    let bulks = _( martData )
    .chunk( numOperations/10 )
    .map( md => {
      // Create bulk object
      let bulk = collection.initializeUnorderedBulkOp();
      // Add to bulk
      _.each( md, m => bulk.insert( m ) );
      return bulk
    } )
    .invokeMap( 'execute' )
    .value();

    promise = Promise
    .all( bulks );
  }


  return promise
  .then( () => {
    log.trace( 'Added %d mart elements', numOperations );
  } )
  .asCallback( callback );
}

function onOpenTask( params, task, data, callback ) {
  // In the open task the rule creates the controlmart

  log.trace( 'Creating the control mart at the OPEN_TASK' );

  var Task = CS.models.task;

  Task
    .findById( task._id )
    .select( 'objects' )
    .exec( function( err, t2 ) {
      if ( err ) return callback( err );

      var objects = t2.objects;
      return createMart( task, objects, params, callback );
    } );
}

function onAddObjects( params, task, data, callback ) {

  log.trace( 'Creating the control mart at the ON_ADD_OBJECTS' );

  var objects = data.objectIds;

  return createMart( task, objects, params, callback );
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

      if ( !operation ) {
        log.warn( 'No operation with label %s found', operationLabel );
        return callback();
      }

      log.trace( 'Performing the rule for the operation %s', operation.label );

      // Select only annotations of the current operation
      annotations = _.filter( annotations, function( annotation ) {
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
          } );

          var evaluations = _.findWhere( controlmart, {
            name: 'evaluations'
          } );

          var categoryCount = [];
          _.each( operation.params.categories, function( category ) {
            var count = _.findWhere( controlmart, {
              name: category
            } );
            categoryCount.push( count );
          } );

          var status = _.findWhere( controlmart, {
            name: 'status'
          } );


          // Updating the various counters
          log.trace( 'Updating the count' );
          //categoryCount[ category ].data = categoryCount[ category ].data + 1;
          _.findWhere( categoryCount, {
            name: category
          } ).data++;
          evaluations.data++;


          // Keeping track of who is currently winning
          // Get the category with the maximum count
          var maxCount = _.max( categoryCount, function( p ) {
            return p.data;
          } );

          log.trace( 'The most selected category is %s', maxCount.name );

          // Verify if the maximum is unique
          var otherMax = _.where( categoryCount, function( p ) {
            return p.data === maxCount.data;
          } );

          result.data = maxCount.name;

          // If the number of evaluations is equal to the required ones
          log.trace( 'Checking the majority' );
          if ( evaluations.data >= params.answers ) {

            // Get the category with the maximum count
            var maxCount = _.max( categoryCount, function( p ) {
              return p.data;
            } );

            log.trace( 'The most selected category is %s', maxCount.name );

            // Verify if the maximum is unique
            var otherMax = _.where( categoryCount, function( p ) {
              return p.data === maxCount.data;
            } );

            // If it's unique it set the result
            if ( otherMax.length > 1 ) {
              result.data = undefined;
            } else {
              result.data = maxCount.name;
            }


            // If the max is greated or equal the agreement needed it close the object for this operation
            if ( maxCount.data >= params.agreement ) {
              status.data = 'closed';
            }

          }

          var updatedMart = [ status, result, evaluations ].concat( categoryCount );

          return ControlMart.insert( updatedMart, callback );
        } );
      };

      return async.each( annotations, checkMajority, callback );
    } );
}
function checkParams( params, done ) {
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
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  hooks: {
    'OPEN_TASK': onOpenTask,
    'END_EXECUTION': onEndExecution,
    'ADD_OBJECTS': onAddObjects
  },
  params: {
    operation: 'string',
    answers: 'number',
    agreement: 'number'
  },

  check: checkParams,
};