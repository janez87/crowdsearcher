'use strict';
// Load system modules

// Load modules
let Promise = require( 'bluebird' );

// Load my modules
var CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function startJob( job, cb ) {
  var log = CS.log;
  var microtask = job.microtask;
  var platform = job.platform;

  log.trace( 'Recovering the job for the microtask %s', microtask );
  return CS.startJob( platform, microtask, cb );
}
function configActiveJobs() {
  var ActiveJob = CS.models.activeJob;
  // Wrap into a `try catch` to handle all errors

  return ActiveJob
  .find()
  .populate( 'platform microtask' )
  .exec()
  .then( function( activeJobs ) {
    return Promise.each( activeJobs, startJob )
  } );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
exports = module.exports = configActiveJobs;