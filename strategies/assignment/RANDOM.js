'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../../core' );
let CSError = require( '../../core/error' );

// Constant declaration

// Module variables declaration
let log = CS.log.child( {
  component: 'Random assignment'
} );

// Custom errors
class RandomAssignmentError extends CSError {}
RandomAssignmentError.NO_AVAILABLE_MICROTASKS = 'NO_AVAILABLE_MICROTASKS';

// Module functions declaration
function performStrategy( event, params, task, data, callback ) {
  // Get one non-closed microtask
  log.trace( 'Get random microtask strategy' );

  let Microtask = CS.models.microtask;

  return Microtask
    .aggregate()
    .match( {
      status: 'CREATED',
      task: task._id
    } )
    .project( '_id' )
    .sample( 1 )
    .exec()
    .spread( microtask => {
      if ( !microtask ) {
        let error = new RandomAssignmentError( RandomAssignmentError.NO_AVAILABLE_MICROTASKS, 'No available microtasks' );
        return Promise.reject( error );
      }

      return microtask._id;
    } )
    .asCallback( callback );


}
// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  perform: performStrategy,
};