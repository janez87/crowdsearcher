// Load libraries
var _ = require('underscore');
var domain = require( 'domain' );
var url = require('url');
var util = require('util');

// Create a custom logger
var log = common.log.child( { component: 'TEF platform' } );


// Custom error
// ---
var CSError = require('../../error');
var TefPlatformError = function( id, message ) {
  /* jshint camelcase: false */
  TefPlatformError.super_.call( this, id, message);
};

util.inherits( TefPlatformError, CSError );

// Error name
TefPlatformError.prototype.name = 'TefPlatformError';

// Custom error IDs
TefPlatformError.MISSING_PARAMETERS = ' MISSING_PARAMETERS';
TefPlatformError.WRONG_PARAMETERS = ' WRONG_PARAMETERS';



function execute( task, microtask, execution, platform, callback ) {
  var params = platform.params;
  log.trace( 'Executing %s with params: %j', execution.id, params );

  // Create a domain to handle errors
  var d = domain.create();
  d.on( 'error', callback );

  // Create the full TEF url to call
  var tefInterface = params.interface || 'default';
  var tefUrl = url.resolve( params.url, tefInterface )+'/index.html';
  tefUrl += '?execution='+execution.id;

  log.trace( 'Computed TEF url: %s', tefUrl );

  return callback( null, tefUrl );
}

function create( task, microtask, config, callback ) {
  log.trace( 'Creating TEF ????' );

  return callback();
}


function check( config, callback ) {
  log.trace( 'Checking TEF parameters' );

  if( !_.isObject( config ) )
    return callback( new TefPlatformError( TefPlatformError.MISSING_PARAMETERS, 'Missing "params" object' ) );

  if( !_.isString( config.url ) )
    return callback( new TefPlatformError( TefPlatformError.WRONG_PARAMETERS, 'Missing or wrong "url" parameter' ) );

  return callback();
}

var Platform = {
  execute: execute,
  check: check,

  params: {
    url: {
      type: 'url',
      'default': '$baseUrl$'
    },
    'interface': 'string'
  }
};


module.exports = exports = Platform;