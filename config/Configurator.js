// Module loading
var _ = require( 'underscore' );
var fs = require( 'fs' );
var url = require( 'url' );
var util = require( 'util' );
var path = require( 'path' );
var async = require( 'async' );
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
    _.bind( this.configOperations, this ),
    _.bind( this.configPlatforms, this ),
    _.bind( this.configTaskTypes, this ),
    _.bind( this.configStrategies, this ),
    _.bind( this.configActiveJobs, this )
  ], function( err, results ) {
    if ( err ) {
      _this.emit( 'error', err );
    } else {
      _this.emit( 'ready', results );
    }
  } );
};

Configurator.prototype.getPort = function() {
  return nconf.get( 'webserver:port' );
};
Configurator.prototype.getProtocol = function() {
  return nconf.get( 'webserver:protocol' );
};


// Configuration functions
Configurator.prototype.configUnderscore = function( callback ) {
  console.log( 'Configuring underscore' );

  // underscore string
  _.str = require( 'underscore.string' );
  _.mixin( _.str.exports() );

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
    nconf.argv()
      .env()
      .file( 'user', OVERRIDE_FILE )
      .file( 'global', CONFIGURATION_FILE );

    // Fix external Applicaiton address
    var externalAddress = nconf.get( 'webserver:externalAddress' );
    if ( !_.isString( externalAddress ) ) {
      externalAddress = _.clone( nconf.get( 'webserver' ) );
      //externalAddress.protocol = 'https';

      nconf.set( 'webserver:externalAddress', url.format( externalAddress ) + '/' );
    }
    console.log( 'External address:', nconf.get( 'webserver:externalAddress' ) );


    return callback();
  } catch ( err ) {
    console.error( 'Nconf configuration error', err );
    return callback( err );
  }
};


// Load Configuration functions
Configurator.prototype.configLogger = require( './configLogger' );
Configurator.prototype.configMongo = require( './configMongo' );
Configurator.prototype.configPassport = require( './configPassport' );
Configurator.prototype.configOperations = require( './configOperations' );
Configurator.prototype.configTaskTypes = require( './configTaskTypes' );
Configurator.prototype.configStrategies = require( './configStrategies' );
Configurator.prototype.configPlatforms = require( './configPlatforms' );
Configurator.prototype.configActiveJobs = require( './configActiveJobs' );


// Export the webserver configuration
exports = module.exports = Configurator;