// Load libraries
var _ = require( 'underscore' );
var domain = require( 'domain' );
var url = require( 'url' );
var util = require( 'util' );
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( {
  component: 'TEF platform'
} );


// Custom error
// ---
var CSError = require( '../../core/error' );
var TefPlatformError = function( id, message ) {
  /* jshint camelcase: false */
  TefPlatformError.super_.call( this, id, message );
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
  var tefUrl = url.resolve( params.url, tefInterface ) + '/index.html';
  tefUrl += '?execution=' + execution.id;

  log.trace( 'Computed TEF url: %s', tefUrl );

  return callback( null, tefUrl );
}


function check( config, callback ) {
  log.trace( 'Checking TEF parameters' );

  if ( !_.isObject( config ) )
    return callback( new TefPlatformError( TefPlatformError.MISSING_PARAMETERS, 'Missing "params" object' ) );

  if ( !_.isString( config.url ) )
    return callback( new TefPlatformError( TefPlatformError.WRONG_PARAMETERS, 'Missing or wrong "url" parameter' ) );

  return callback();
}

var Platform = {
  name: 'TaskExecutionFramework',
  description: 'A *simple* web-server with default interfaces for executing simple Tasks.',
  image: 'http://4.bp.blogspot.com/-qefm4LTSo-U/T_0KBLMhrvI/AAAAAAAAASs/HazO-Emz5zI/s1600/Tasks.png',


  execute: execute,
  check: check,

  params: {
    url: {
      type: 'url',
      default: 'http://demo.search-computing.com/tef-demo/'
    },
    'interface': {
      type: 'string',
      default: ''
    }
  }
};


module.exports = exports = Platform;