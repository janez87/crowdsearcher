
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var schedule = require('node-schedule');

var log = common.log.child( { component: 'Init platforms' } );


var Microtask = common.models.microtask;


var performRule = function( data, config, callback ) {
  log.trace( 'Running' );
  log.trace( 'event: %s', data.event );
  log.trace( 'task: %s', data.task._id );
  log.trace( 'Microtasks: %s', data.microtasks.length );

  var task = data.task;
  var microtasks = data.microtasks;

  // init CronJob for retrieving the data upon timed events
  var initCronjob = function( microtaskId, platform ) {
    log.trace( 'Scheduling CronJob' );

    // Create a `domain` to handle cron job exceptions
    var cronDomain = domain.create();
    cronDomain.on( 'error', function( err ) {
      log.error( 'CronJob', err );
    } );

    // Import the platform implementation
    var platformImplementation = common.platforms[ platform.name ];

    var cronJob;
    var tickFunction = function() {
      Microtask
      .findById( microtaskId )
      .populate( 'task operations platforms' )
      .exec( cronDomain.bind( function( err, microtask ) {

        // call the tick function
        platformImplementation.timed.onTick( microtask.task, microtask, platform, cronJob );
      } ) );
    };

    // Schedule the job and start it!
    var cronExpression = platformImplementation.timed.expression;
    cronJob = schedule.scheduleJob( cronExpression, tickFunction );
  };

  // Domain to wrap the errors
  var d = domain.create();
  d.on( 'error', callback );


  var initPlatform = function( microtask, platform, callback ) {
    var params = platform.params;

    // Import the platform implementation
    var platformImplementation = common.platforms[ platform.name ];

    // If the platform is inactive then just return
    if( params.inactive || !platform.enabled ) return callback();


    // this function checks if the `platform` requires a CronJob to run in background.
    var checkTimed = function( err ) {
      // If the platform implementation exposes a `timed` object
      // then start a CronJob to handle these *timed* events.
      if( platformImplementation.timed && !err )
        initCronjob( microtask._id, platform );

      return callback( err );
    };

    // otherwise init the platform by calling `init`.
    platformImplementation.init( task, microtask, platform, checkTimed );
  };

  var getPlatforms = function( microtask, callback ) {
    // Populate the platforms
    microtask
    .populate( 'platforms', d.bind( function( err, microtask ) {
      if( err ) return callback( err );

      // Pre apply some parameters
      var fn = _.partial( initPlatform, microtask );
      // Init each platform
      async.each( microtask.platforms, fn, callback );
    } ) );
  };

  // For each microtask
  async.eachSeries( microtasks, getPlatforms, callback );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
