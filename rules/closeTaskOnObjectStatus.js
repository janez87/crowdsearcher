'use strict';
// Load system modules

// Load modules
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration
let ObjectModel = CS.models.object;
let log = CS.log.child( {
  component: 'Close Task on object status'
} );

// Module functions declaration
function onCloseObject( params, task, data, callback ) {
  let promise = Promise.resolve();
  log.trace( 'Check if we must close the task upon object close event' );

  if( !task.closed ) {
    // Not closed, count the number of available objects
    promise = ObjectModel
    .where( 'task', task._id )
    .where( 'status' ).in( [
      'CREATED',
      'ASSIGNED',
    ] )
    .count()
    .exec()
    .then( numOpened => {
      if( numOpened===0 ) {
        log.debug( 'All objects are closed, close task' );
        return task.close();
      }
    } );
  }

  return promise
  .asCallback( callback );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  hooks: {
    'CLOSE_OBJECT': onCloseObject
  }
};