// Load Libraries
var path = require( 'path' );
var fs  = require('fs');
var _  = require('underscore');
var nconf = require( 'nconf' );
var Logger = require('bunyan');
var cluster = require( 'cluster' );

function configLogger( callback ) {
  // Configure logger
  try {
    console.log( 'Configuring logger' );
    var loggerConfig = nconf.get( 'logger' );

    // create dir if missing
    var logPath = path.join( __dirname, '..', loggerConfig.path );
    if( !fs.existsSync( logPath ) ) {
      console.log( 'Creating log folder' );
      fs.mkdirSync( logPath );
    }


    var streams = [];
    _.each( loggerConfig.streams, function( stream, name ) {

      // Do not pollute the config file
      stream = _.clone( stream );
      if( name==='console' )
        stream.stream = process.stdout;
      if( name==='file' ) {
        var filePath = path.join( logPath, stream.filename );
        stream.path = filePath;
      }

      streams.push( stream );
    } );
    var loggerName = 'CrowdSearcher';
    if( cluster.isWorker )
      loggerName += ' Worker '+cluster.worker.id;

    var log = Logger.createLogger( {
      name: loggerName,
      streams: streams,
      serializers: {
        err: Logger.stdSerializers.err
      }
    } );


    log.debug( 'Logger started' );
    // Add the logger to the common shortcuts
    common.log = log;

    callback();
  } catch( err ) {
    console.error( 'Logger configuration error', err );
    callback( err );
  }
}


// Export configuration function
exports = module.exports = configLogger;