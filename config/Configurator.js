/* global -common */

// Module loading
var _  = require('underscore');
var fs  = require('fs');
var url = require('url');
var util  = require('util');
var path = require( 'path' );
var async = require('async');
var nconf = require( 'nconf' );


/*
var hotswap = require('hotswap');

hotswap.configure({
  extensions: {'.js': 'js', '.node': 'node'}
  //watch: true,
  //autoreload: true
});

hotswap.on( 'swap', function( file ) {
  console.log( '\n\n' );
  console.log( '-------------\t\tSTART SWAPPING MODULE\t\t-------------' );
  console.log( file );
  console.log( '-------------\t\tEND SWAPPING MODULE\t\t-------------' );
  console.log( '\n\n' );
});

*/
var EventEmitter = require( 'events' ).EventEmitter;

// Export global shortcuts
var common = {};
GLOBAL.common = common;


var Configurator = function( app ) {
  console.log( 'Called Configurator' );
  this.FILE = 'configuration.json';
  this.OVERRIDE = 'override.json';
  this.app = app;
};
util.inherits( Configurator, EventEmitter );

Configurator.prototype.load = function() {
  console.log( 'Loading configurations' );
  var _this = this;

  // Load all configuration
  async.series( [
    _.bind( this.configUnderscore, this ),
    _.bind( this.configNconf, this ),
    _.bind( this.configLogger, this ),
    _.bind( this.configMongo, this ),
    _.bind( this.configPassport, this ),
    _.bind( this.configCommonFunctions, this ),
    _.bind( this.configOperations, this ),
    _.bind( this.configPlatforms, this ),
    _.bind( this.configStrategies, this )
  ], function( err, results ) {
    if( err ) {
      _this.emit( 'error', err );
    } else {
      _this.emit( 'ready', results );
    }
  } );
};

Configurator.prototype.getPort = function() {
  return nconf.get( 'webserver:port' );
};


// Configuration functions
Configurator.prototype.configUnderscore = function( callback ) {
  console.log( 'Configuring underscore' );

  // underscore string
  _.str = require('underscore.string');
  _.mixin(_.str.exports());


  _.mixin( {
    isError: util.isError
  } );

  callback();
};

Configurator.prototype.configNconf = function( callback ) {
  var CONFIGURATION_FILE = path.join( __dirname, this.FILE );
  var OVERRIDE_FILE = path.join( __dirname, this.OVERRIDE );
  try {
    console.log( 'Configuring nconf' );
    // Load configuration with nconf
    nconf.argv();
    nconf.env();
    nconf.file( 'user', OVERRIDE_FILE );
    nconf.file( 'global', CONFIGURATION_FILE );

    // Fix external Applicaiton address
    var externalAddress = nconf.get( 'webserver:externalAddress' );
    if( !_.isString( externalAddress ) ) {
      externalAddress = _.clone( nconf.get( 'webserver' ) );
      externalAddress.protocol = 'http';

      nconf.set( 'webserver:externalAddress', url.format( externalAddress )+'/' );
    }
    console.log( 'External address:', nconf.get( 'webserver:externalAddress' ) );


    callback();
  } catch( err ) {
    console.error( 'Nconf configuration error', err );
    callback( err );
  }
};

Configurator.prototype.configCommonFunctions = function( callback ) {
  var log = common.log;
  var scriptConfig = nconf.get( 'scripts' );
  var scriptPath = path.join( __dirname, '..', scriptConfig.path );
  var defaultPath = path.join( scriptPath, scriptConfig[ 'default' ] );
  var userPath = path.join( scriptPath, scriptConfig.user || '' );

  common.getScript = function( name, user, callback ) {
    log.trace( 'Getting the script "%s"', name );

    log.trace( 'Try user (%s) script "%s"', user, name );

      // Try user
    var file = path.join( userPath, user, name )+'.js';
    log.trace( file );
    fs.readFile( file, function( err, data ) {
      if( err ) {
        log.debug( 'User script not found "%s", getting in default', name );

        // Fallback to default
        file = path.join( defaultPath, name )+'.js';
        log.trace( file );
        fs.readFile( file, callback );
      } else {
        log.trace( 'Returning user script' );
        callback( err, data );
      }
    } );
  };

  // Default script list
  common.getDefaultScripts = function( callback ) {
    var path = defaultPath;
    fs.readdir( path, callback );
  };

  // User script list
  common.getUserScripts = function( user, callback ) {
    var path = path.join( userPath, user );
    fs.readdir( path, callback );
  };

  callback();
};

// Load Configuration functions
Configurator.prototype.configLogger = require( './configLogger' );
Configurator.prototype.configMongo = require( './configMongo' );
Configurator.prototype.configPassport = require( './configPassport' );
Configurator.prototype.configOperations = require( './configOperations' );
Configurator.prototype.configStrategies = require( './configStrategies' );
Configurator.prototype.configPlatforms = require( './configPlatforms' );


// Export the webserver configuration
exports = module.exports = Configurator;