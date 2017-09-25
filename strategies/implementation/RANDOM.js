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
  component: 'Random implementation'
} );

// Custom errors
class RandomImplementationError extends CSError {}
RandomImplementationError.NO_AVAILABLE_PLATFORMS = 'NO_AVAILABLE_PLATFORMS';

// Module functions declaration
function performStrategy( event, params, task, data, callback ) {
  // Get one enabled, execution-enabled platform
  log.trace( 'Get random execution platform' );

  let Platform = CS.models.platform;

  return Platform
    .aggregate()
    .match( {
      enabled: true,
      execution: true,
      task: task._id
    } )
    .project( '_id' )
    .sample( 1 )
    .exec()
    .spread( platform => {
      if ( !platform ) {
        let error = new RandomImplementationError( RandomImplementationError.NO_AVAILABLE_PLATFORMS, 'No available execution platforms' );
        return Promise.reject( error );
      }

      return platform._id;
    } )
    .asCallback( callback );
}
// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  perform: performStrategy,
};