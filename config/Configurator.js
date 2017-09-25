'use strict';
// Load system modules
let url = require( 'url' );
let path = require( 'path' );

// Load modules
let _ = require( 'lodash' );
let mkdirp = require( 'mkdirp' );
let Promise = require( 'bluebird' );
let Logger = require( 'bunyan' );

// Load my modules
let CS = require( '../core' );

// Constant declaration
const CONFIG = require( './configuration.json' );
const LOG_FILE_NAME = 'cs_volog.jlog';

// Module variables declaration

// Module functions declaration

// Module class declaration
class Configurator {
  constructor( app ) {
    console.log( 'Called Configurator' );

    this.app = app;
    this.config = CONFIG;

    // Import methods
    this._initMongo = require( './configMongo' );
    this._initRedis = require( './configRedis' );
    this._initPassport = require( './configPassport' );
    this._initOperations = require( './configOperations' );
    this._initTaskTypes = require( './configTaskTypes' );
    this._initStrategies = require( './configStrategies' );
    this._initPlatforms = require( './configPlatforms' );
    this._initActiveJobs = require( './configActiveJobs' );
  }


  load() {
    console.log( 'Loading configurations' );

    // Use override if present
    try {
      let override = require( './override.json' );
      this.config = _.assign( {}, CONFIG, override );
    } catch( e ) {
      console.log( 'Override file not present' )
    }

    let externalAddress = this.externalAddress;
    // if we don't have an external address use the server address
    if ( !_.isString( externalAddress ) ) {
      externalAddress = url.format( this.webserver ) + '/';
      this.config.webserver.externalAddress = externalAddress;
    }
    console.log( 'External address: %s', this.externalAddress );

    return Promise
    .bind( this )
    .then( this._initLogger )
    .then( this._initMongo )
    .then( this._initRedis )
    .then( this._initPassport )
    .then( this._initOperations )
    .then( this._initPlatforms )
    .then( this._initStrategies )
    .then( this._initTaskTypes )
    .then( this._initActiveJobs )
    ;
  }


  _initLogger() {
    console.log( 'Configuring logger' );
    let loggerConfig = this.get( 'logger' );

    let logPath = path.resolve( __dirname, '..', loggerConfig.path || 'logs' );

    return mkdirp
    // Crete folder if missing
    .mkdirpAsync( logPath )
    .then( ()=> {
      let logFile = path.resolve( logPath, LOG_FILE_NAME );
      let streams = [
        // Console logger
        {
          stream: process.stdout,
          level: 'trace',
        },
        // File logger
        {
          type: 'rotating-file',
          path: logFile,
          period: '1d',
          count: 5,
          level: 'trace',
        },
      ];

      let log = Logger.createLogger( {
        name: 'CrowdSearcher',
        streams: streams,
        serializers: {
          err: Logger.stdSerializers.err
        }
      } );


      return log;
    } )
    .then( log=> {
      log.debug( 'Logger started' );
      // Add the logger to the CS shortcuts
      CS.log = log;
    } )
    ;
  }

  // Get configuration
  get( prop ) {
    return _.get( this.config, prop );
  }
  // "Getters" and getters
  getPort() {
    return this.port;
  }
  get port() {
    return this.get( 'webserver.port' );
  }
  getProtocol() {
    return this.protocol;
  }
  get protocol() {
    return this.get( 'webserver.protocol' );
  }
  getExternalAddress() {
    return this.externalAddress;
  }
  get externalAddress() {
    return this.get( 'webserver.externalAddress' );
  }
  get webserver() {
    return this.get( 'webserver' );
  }
}

// Module initialization (at first load)
mkdirp = Promise.promisifyAll( mkdirp, { multiArgs: true } );

// Module exports
exports = module.exports = Configurator;