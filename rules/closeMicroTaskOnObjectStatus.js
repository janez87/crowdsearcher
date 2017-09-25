'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration
let Microtask = CS.models.microtask;
let log = CS.log.child( {
  component: 'Close Microtask on object status'
} );

// Module functions declaration
function onCloseObject( params, task, data, callback ) {
  log.trace( 'Check if we must close the microtask upon object close event' );

  let objectId = data.object;
  let taskId = task._id;

  return Microtask
  .where( 'task', taskId ) // Related to the current task
  .where( 'status' ).ne( 'CLOSED' ) // Not closed
  .where( 'objects', objectId ) // With the current object in the list
  .populate( {
    path: 'objects',
    options: {
      lean: true,
    }
  } )
  .exec()
  .then( microtasks => {
    // If no microtasks then go on
    if( !microtasks || microtasks.length===0 ) return null;

    // Get microtask map
    let microtaskMap = _.keyBy( microtasks, '_id' );

    // Get all the microtask to close as an array of ids
    let microtasksToClose = _( microtaskMap )
    .mapValues( m => {

      let total = m.objects.length;
      let closed = _( m.objects )
      .map( 'status' )
      .map( status => _.startsWith( status, 'CLOSED' ) ? 1 : 0 )
      .sumBy();

      return total===closed;
    } )
    // Now we have an object as { microtaskId: true|false }
    // we keep only the microtasks to close (where value is true)
    .toPairs() // [ "microtaskId", true ], [], ...
    .filter( 1 ) // Filter by second field (true|false)
    .map( 0 ) // Map by first field (microtaskId)
    .value();

    return Promise
    .each( microtasksToClose, microtaskId => {
      let microtask = microtaskMap[ microtaskId ];

      if( microtask ) {
        return microtask.close();
      }
    } );
  } )
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
