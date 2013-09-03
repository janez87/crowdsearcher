

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var schedule = require('node-schedule');
// Use a child logger
var log = common.log.child( { component: 'Start AMT Job' } );

// Generate custom error `StartAMTJobError` that inherits
// from `APIError`
var APIError = require( './error' );
var StartAMTJobError = function( id, message, status ) {
  StartAMTJobError.super_.call( this, id, message, status );
};
util.inherits( StartAMTJobError, APIError );

StartAMTJobError.prototype.name = 'StartAMTJobError';
// Custom error IDs
StartAMTJobError.AMT_NOT_CONFIGURED = 'AMT_NOT_CONFIGURED';

// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],


  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'amt',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
// This API manually start the cron to job that retreive the assignments on mechanical turk
API.logic = function StartAMTJob( req, res, next ) {
  log.trace( 'Start AMT Job' );

  var query = req.queryObject;

  query
  .populate('platforms microtasks')
  .exec(req.wrap(function(err,task){
    if(err) return next(err);

    log.trace('Task %s retrieved',task._id);

    var amt = _.findWhere(task.platforms, {name:'amt'});

    //if amt is not configured for the task i can't schedule the job
    if(_.isUndefined(amt)){
      return next(new StartAMTJobError(StartAMTJobError.AMT_NOT_CONFIGURED,'The task selected does not have the amt platform configured',APIError.BAD_REQUEST));
    }

    var platformImplementation = common.platforms[amt.name];

    var microtasks = task. microtasks;

    _.each(microtasks,function(microtask){
      log.trace('Scheduling the job for the microtask %s',microtask._id);
      var cronJob;

      var tickFunction = function() {

        platformImplementation.timed.onTick( task, microtask, amt, cronJob );

      };

      // Schedule the job and start it!
      var cronExpression = platformImplementation.timed.expression;
      cronJob = schedule.scheduleJob( cronExpression, tickFunction );
    });

    log.trace('Jobs scheduled');
    res.json({});
  }));
};

// Export the API object
exports = module.exports = API;