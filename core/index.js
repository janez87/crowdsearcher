'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let schedule = require( 'node-schedule' );

// Load my modules
let CSError = require( './error' );

// Constant declaration

// Module variables declaration
let CS = {};

// Module functions declaration
function createJob( platform, microtask, callback ) {

  var cronJob = schedule.scheduleJob( platform.implementation.timed.expression, _.partial( platform.implementation.timed.onTick, microtask, platform ) );
  CS.activeJobs[ microtask._id ] = cronJob;

  var ActiveJob = CS.models.activeJob;

  var job = {
    microtask: microtask._id,
    platform: platform._id
  };

  return ActiveJob.collection.insert( job, callback );
}
function startJob( platform, microtask, callback ) {

  var cronJob = schedule.scheduleJob( platform.implementation.timed.expression, _.partial( platform.implementation.timed.onTick, microtask, platform ) );
  CS.activeJobs[ microtask._id ] = cronJob;

  return callback();
}
function endJob( microtask, callback ) {
  var cronJob = CS.activeJobs[ microtask._id ];
  cronJob.cancel();
  delete CS.activeJobs[ microtask._id ];

  var ActiveJob = CS.models.activeJob;

  ActiveJob
    .findOne( {
      microtask: microtask._id
    } )
    .exec( function( err, job ) {
      if ( err ) return callback( err );

      return job.remove( callback );
    } );
}
// Module class declaration

// Module initialization (at first load)
CS.title = 'CrowdSearcher';
CS.error = CSError;
// Jobs related globals
CS.activeJobs = {};
CS.createJob = createJob;
CS.startJob = startJob;
CS.endJob = endJob;


// Module exports
module.exports = CS;