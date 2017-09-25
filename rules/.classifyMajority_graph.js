'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
let neo4j = require( 'neo4j' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration
let log = CS.log.child( {
  component: 'Classify Majority'
} );
let db = new neo4j.GraphDatabase( 'http://neo4j:demo@localhost:7474' );

// Module functions declaration
function createMartObject( taskId, operationId, objectId, categories ) {

  let martEntries = [
    { status: 'OPENED' },
    { evaluations: 0 },
    { result: null },
  ];
  _.each( categories, category => {
    martEntries.push( {
      ['category_'+category]: 0,
    } )
  } );

  let queries = _.map( martEntries, entry => {
    let query = `
      MATCH
      (t:Task { id: {taskId} } ),
      (op:Operation { id: {operationId} } )
      MERGE
      (ob:Object { id: {objectId} } )
      MERGE
      (n:Node { entry } ),
      (n)--(t)
      (n)--(op)
      (n)--(ob)
    `;

    return {
      query: query,
      params: {
        taskId,
        operationId,
        objectId,
        entry
      },
    };
  } );

  return db.cypherAsync( queries );
}
function createMart( taskId, operationId, objects ) {
  log.trace( 'Creating mart for %d objects', objects.length );

  let currCreateMartObject = _.curry( createMartObject );
  return Promise
  .each( objects, currCreateMartObject( taskId, operationId ) );
}
function createMainNodes( list ) {
  log.trace( 'Creating main nodes' );

  let nodes = _.map( list, node => {
    let type = node.type;
    let id = node.id.toString();

    let query = `MERGE (o:${type} {id:{id}} )`;
    return db.cypherAsync( {
      query,
      params: { id },
    } );
  } );

  return Promise
  .all( nodes );
}
function onOpenTask( params, task, data, callback ) {
  log.debug( 'Creating the control mart at the OPEN_TASK' );
  let taskId = task._id;

  // Get operation based on label
  let operationLabel = params.operation;
  let operation = _.find( task.operations, {
    label: operationLabel,
  } );
  let operationId;

  // Create resolved promise
  let promise = Promise.resolve();

  if( !operation ) {
    let error = new Error( `Operation with label "${operationLabel}" not found` );
    promise = Promise.reject( error );
  } else {
    operationId = operation._id;

    let list = [
      { type: 'Task', id: taskId },
      { type: 'Operation', id: operationId },
    ];

    promise = createMainNodes( list );
  }

  // Create main nodes
  return promise
  .then( () => {
    // Get the task objects
    let Task = CS.models.task;

    return Task
    .findById( task._id )
    .select( 'objects' )
    .lean()
    .exec();
  } )
  .get( 'objects' ) // Retrive objects
  .then( objects => {
    return createMart( taskId, operationId, objects );
  } )
  .asCallback( callback );
}
function onAddObjects( params, task, data, callback ) {
}
function onEndExecution( params, task, data, callback ) {
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
db = Promise.promisifyAll( db, { multiArgs: true } );

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