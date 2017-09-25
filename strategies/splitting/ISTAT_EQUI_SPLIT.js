'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
let mongoose = require( 'mongoose' );

// Load my modules
let CS = require( '../../core' );
let CSError = require('../../core/error');

// Constant declaration

// Custom errors
class IstatEquiSplitError extends CSError {}
IstatEquiSplitError.ZERO_OBJECTS = 'ZERO_OBJECTS';
IstatEquiSplitError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
IstatEquiSplitError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';

// Module variables declaration
let ObjectId = mongoose.Types.ObjectId;
let ObjectModel = CS.models.object;
let log = CS.log.child( {
  component: 'ISTAT Group By'
} );

// Module functions declaration
function onOpenTask( params, task, data, callback ) {
  let fieldName = params.field;
  let taskId = task._id;
  let collection = ObjectModel.collection;

  let pipeline = [];
  pipeline.push( {
    $match: {
      task: ObjectId( taskId ),
      status: { $ne: 'CLOSED' },
    }
  } );
  pipeline.push( {
    $group: {
      _id: `$data.${fieldName}`,
      ids: {
        $push: '$_id',
      }
    }
  } );
  let promise = collection.aggregate( pipeline, {
    allowDiskUse: true,
  } ).toArray();

  log.trace( 'Running pipeline', pipeline );
  return Promise
  .resolve( promise ) // Convert to Bluebird
  .then( groupedObjects => {
    log.trace( 'Got %d different "%s"', groupedObjects.length, fieldName );
    let objectsPerMicrotask = params.objectsNumber;

    log.trace( 'Creating microtasks from each group of %d objects', objectsPerMicrotask );
    let microtasks = _( groupedObjects )
    .chunk( objectsPerMicrotask )
    .map( chunk => {
      let ids = _( chunk )
      .map( 'ids' )
      .flatten()
      .value()

      return {
        platforms: _.map( task.platforms, '_id' ),
        operations: _.map( task.operations, '_id' ),
        objects: ids,
      };
    } )
    .value();

    log.debug( 'Creating %d microtasks', microtasks.length );
    return task.addMicrotasks( microtasks );
  } )
  .then( () => {
    log.debug( 'Microtasks created' );
  } )
  .asCallback( callback );
}
function checkParams( params, done ) {
  log.trace( 'Checking number of objects per microtask' );
  if( params.objectsNumber<1 ) {
    return done( false );
  }

  return done( true );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  params: {
    field: 'string',
    objectsNumber: 'number',
  },
  hooks: {
    'OPEN_TASK': onOpenTask
  },
  check: checkParams,
};