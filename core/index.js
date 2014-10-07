// # Core
//
// Just a placeholder for storing all the data of the CS
var schedule = require( 'node-schedule' );
var _ = require( 'underscore' );
var CS = {};


CS.title = 'CrowdSearcher';
CS.error = require( './error' );
CS.activeJobs = {};

CS.createJob = function( platform, microtask, callback ) {

  var cronJob = schedule.scheduleJob( platform.implementation.timed.expression, _.partial( platform.implementation.timed.onTick, microtask, platform ) );
  CS.activeJobs[ microtask._id ] = cronJob;

  var ActiveJob = CS.models.activeJob;

  var job = {
    microtask: microtask._id,
    platform: platform._id
  };

  return ActiveJob.collection.insert( job, callback );

};

CS.startJob = function( platform, microtask, callback ) {

  var cronJob = schedule.scheduleJob( platform.implementation.timed.expression, _.partial( platform.implementation.timed.onTick, microtask, platform ) );
  CS.activeJobs[ microtask._id ] = cronJob;

  return callback();

};

CS.endJob = function( microtask, callback ) {
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
};

module.exports = exports = CS;