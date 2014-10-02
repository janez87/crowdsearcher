// # Core
//
// Just a placeholder for storing all the data of the CS
var schedule = require( 'node-schedule' );
var _ = require( 'underscore' );
var CS = {};


CS.title = 'CrowdSearcher';
CS.error = require( './error' );
CS.activeJobs = {};

CS.startJob = function( platform, microtask, callback ) {

  var cronJob = schedule.scheduleJob( platform.implementation.timed.expression, _.partial( platform.implementation.timed.onTick, microtask, platform ) );
  CS.activeJobs[ microtask._id ] = cronJob;

  return callback();

};

CS.endJob = function( microtask, callback ) {
  var cronJob = CS.activeJobs[ microtask._id ];
  cronJob.cancel();
  delete CS.activeJobs[ microtask._id ];

  return callback();
};

module.exports = exports = CS;