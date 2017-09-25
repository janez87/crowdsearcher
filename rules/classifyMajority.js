'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration
let Execution = CS.models.execution;
let log = CS.log.child( {
  component: 'Classify Majority'
} );
let redis = CS.redis;

// Module functions declaration
function getRedisKey( taskId, operationId, objectId) {
  let key = `${taskId}:${objectId}`;
  return key;
}
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
  let initialMartObjects = {
    result: undefined,
    status: 'OPENED',
    evaluations: 0,
  };
  // Add categories counts
  let categories = operation.params.categories;
  _.each( categories, category => {
    initialMartObjects[ category ] = 0;
  } );

  // Get ids from object
  let taskId = task._id;
  let operationId = operation._id;


  let numOperations = objects.length*(categories.length+3);
  log.trace( 'Bulk ready with %d operations', numOperations );

  // Create promise
  let promise;
  if( numOperations===0 ) {
    log.trace( 'No operation todo, bye' );
    promise = Promise.resolve();
  } else {
    promise = Promise
    .each( objects, objectId => {
      let key = getRedisKey( taskId, operationId, objectId );
      return redis.hmset( key, initialMartObjects );
    } );
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

  return Task
  .findById( task._id )
  .select( 'objects' )
  .lean()
  .exec()
  .then( t => createMart( task, t.objects, params ) )
  .asCallback( callback );
}

function onAddObjects( params, task, data, callback ) {

  log.trace( 'Creating the control mart at the ON_ADD_OBJECTS' );

  var objects = data.objectIds;

  return createMart( task, objects, params, callback );
}
function checkMajority( taskId, operationId, params, annotation ) {
  let objectId = annotation.object;
  let category = annotation.response;
  let minAnswers = params.answers;
  let agreement = params.agreement;

  let key = getRedisKey( taskId, operationId, objectId );
  return redis
  .hgetall( key )
  .then( data => {
    let status = data.status;
    let result = data.result;
    let evaluations = Number( data.evaluations );

    let categoriesCount = _( data )
    .omit( [
      'status',
      'result',
      'evaluations',
    ] )
    .mapValues( Number )
    .value();
    log.trace( 'Categories counts: ', categoriesCount );

    log.trace( 'Updating the category(%s) count', category );
    categoriesCount[ category ] += 1;
    evaluations += 1;

    // Check if we met the minimum number of evaluations
    if( evaluations>=minAnswers ) {
      log.trace( 'Reached threshold for majority check' );

      // Get winning category
      let sortedCategoriesPairs = _( categoriesCount )
      .toPairs()
      .orderBy( 1, 'desc' )
      .value();

      // In case of a unique winner
      if( sortedCategoriesPairs[0][1]!==sortedCategoriesPairs[1][1] ) {
        let winCategory = {
          category: sortedCategoriesPairs[ 0 ][ 0 ],
          value: sortedCategoriesPairs[ 0 ][ 1 ],
        };

        result = winCategory.category;

        // If the max is greated or equal the agreement needed it close the object for this operation
        if( winCategory.value>=agreement ) {
          status = 'CLOSED';
        }
      }

    }

    // Get updated object
    let newData = _.assign( {}, {
      status,
      result,
      evaluations,
    }, categoriesCount );

    // Update the mart
    return redis
    .hmset( key, newData );
  } )
  .tap( () => log.trace( 'Check majority done for annotation %s', annotation._id ) )
  ;
}
function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule' );

  let taskId = task._id;
  let executionId = data.execution;
  let operationLabel = params.operation;

  // Check operation
  let operationId;
  let operation = _.find( task.operations, {
    label: operationLabel,
  } );

  let promise;
  if( !operation ) {
    let error = new Error( `Operation "${operationLabel}" not found` );
    promise = Promise.reject( error );
  } else {
    operationId = operation._id;
    promise = Execution
    .findById( executionId )
    .exec();
  }

  // Curry the funnction so i can pre apply come params
  let currCheckMajority = _.curry( checkMajority );

  return promise
  .then( execution => {
    if( !execution ) {
      let error = new Error( `Execution not found` );
      return Promise.reject( error );
    }

    log.trace( 'Performing the rule for the operation %s', operationLabel );

    // Select only annotations of the current operation
    let annotations = _.filter( execution.annotations, annotation => {
      return annotation.operation.equals( operation._id );
    } );

    if( annotations.length===0 ) {
      let error = new Error( `No annotations for operation "${operationLabel}"` );
      return Promise.reject( error );
    }

    return annotations;
  } )
  .each( currCheckMajority( taskId, operationId, params ) )
  .tap( () => log.trace( 'Rule done' ) )
  .asCallback( callback );
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