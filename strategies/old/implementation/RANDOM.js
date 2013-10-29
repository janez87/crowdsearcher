// Load libraries
var _ = require('underscore');
var util = require( 'util' );
var domain = require( 'domain' );

// Child logger
var log = CS.log.child( { component: 'RANDOM implementation' } );

// Custom error
// ---
var CSError = require('../../../error');
var RandomImplementationError = function( id, message ) {
  /* jshint camelcase: false */
  RandomImplementationError.super_.call( this, id, message);
};

util.inherits( RandomImplementationError, CSError );

// Error name
RandomImplementationError.prototype.name = 'RandomImplementationError';

// Custom error IDs
RandomImplementationError.NO_PLATFORM_AVAILABLE = 'NO_PLATFORM_AVAILABLE';


var performStrategy = function( data, config, callback ) {
  log.debug( 'Running strategy' );

  var microtask = data.microtask;

  var d = domain.create();
  d.on( 'error', callback );

  microtask
  .populate( 'platforms', d.bind( function( err, microtask ) {

    log.trace( 'Selecting from platform from: %j', microtask.platforms );

    var availablePlatforms = _.filter( microtask.platforms, function( platform ) {
      log.trace( 'Platform is active? %s', !platform.params.inactive );
      return !platform.params.inactive;
    } );

    log.trace( 'Using a random platform from: %j', availablePlatforms );

    if( availablePlatforms.length===0 )
      return callback( new RandomImplementationError( RandomImplementationError.NO_PLATFORM_AVAILABLE, 'No platform active available' ) );

    var randomIndex = Math.floor( Math.random()*availablePlatforms.length );
    var selectedPlatform = availablePlatforms[ randomIndex ];

    log.debug( 'Selected platform %s', selectedPlatform.name );
    return callback( null, selectedPlatform );
  } ) );
};




var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking RANDOM implementation' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;