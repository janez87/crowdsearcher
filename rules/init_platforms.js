
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var schedule = require('node-schedule');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Init platforms' } );


var Microtask = CS.models.microtask;

var performRule = function( event, config, task, data, callback ) {
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
    var platformImplementation = CS.platforms[ platform.name ];

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
    // Import the platform implementation
    var platformImplementation = CS.platforms[ platform.name ];

    // If the platform is not enabled then just return
    if( !platform.enabled ) return callback();


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

  Microtask
  .find()
  .where( '_id' ).in( microtasks )
  .exec( d.bind( function( err, microtasks ) {
    if( err ) return callback( err );

    return async.eachSeries( microtasks, getPlatforms, callback );
  } ) );
};


module.exports.perform = exports.perform = performRule;