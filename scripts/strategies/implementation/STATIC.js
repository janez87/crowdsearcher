// Load libraries
var _ = require('underscore');
var util = require( 'util' );
var domain = require( 'domain' );

// Child logger
var log = common.log.child( { component: 'STATIC implementation' } );


// Custom error
// ---
var CSError = require('../../../error');
var StaticImplementationError = function( id, message ) {
  /* jshint camelcase: false */
  StaticImplementationError.super_.call( this, id, message);
};
util.inherits( StaticImplementationError, CSError );

// Error name
StaticImplementationError.prototype.name = 'StaticImplementationError';

// Custom error IDs
StaticImplementationError.MISSING_PARAMETERS = ' MISSING_PARAMETERS';
StaticImplementationError.TASK_PLATFORM_NOT_AVAILABLE = 'TASK_PLATFORM_NOT_AVAILABLE';


var performStrategy = function( data, config, callback ) {
  log.debug( 'Running strategy' );

  var microtask = data.microtask;

  // Select the platform
  var selectedPlatform = config.platform;
  log.debug( 'Selected platform: %s', selectedPlatform );

  // Domain
  var d = domain.create();
  d.on( 'error', callback );

  microtask
  .populate( 'platforms', d.bind( function( err, microtask ) {

    // Check if we can find the selected platform
    var platform = _.find( microtask.platforms, function( p ) {
      return p.name===selectedPlatform;
    } );

    // if not then throw an error
    if( !platform )
      return callback( new StaticImplementationError(
        StaticImplementationError.TASK_PLATFORM_NOT_AVAILABLE,
        'Platform "'+selectedPlatform+'" not available' )
      );

    // Everything ok, return platform
    return callback( null, platform );
  } ) );
};




var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  if( !_.isString( params.platform ) )
    return callback( new StaticImplementationError(
      StaticImplementationError.MISSING_PARAMETERS,
      'Missing parameter "platform"' )
    );

  // Domain
  var d = domain.create();
  d.on( 'error', callback );

  task
  .populate( 'platforms', d.bind( function( err, task ) {

    // Check if we can find the selected platform
    var platform = _.find( task.platforms, function( p ) {
      return p.name===params.platform;
    } );

    // if not then throw an error
    if( !platform )
      return callback( new StaticImplementationError(
        StaticImplementationError.TASK_PLATFORM_NOT_AVAILABLE,
        'Platform "'+params.platform+'" not available' )
      );

    // Everything ok...
    return callback();
  } ) );
};

var params = {
  platform: {
    type: 'platform',
    'default': 'tef'
  }
};

module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;