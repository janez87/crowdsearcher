// Load libraries
var _ = require( 'underscore' );
var nconf = require( 'nconf' );
var glob = require( 'glob' );
var CS = require( '../core' );


// Configure Platforms
// ---
function configPlatforms( callback ) {
  // Import the log, cannot be loaded before because is not available.
  var log = CS.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring platforms' );

    // Get the configuration object
    var platformConfiguration = nconf.get( 'platforms' );

    // Compose the operation base directory
    var platformsBaseDir = platformConfiguration.path;


    //
    var options = {
      cwd: platformsBaseDir
    };

    // Read all the files inside the `platformsBaseDir` asynchronusly
    glob( '*', options, function( err, files ) {
      if ( err ) return callback( err );

      if ( !files ) return callback();

      var platforms = {};

      _.each( files, function( file ) {
        //var platform = file.slice( 0, -3 );
        var platform = file;

        file = '../' + platformsBaseDir + '/' + file;
        log.trace( 'Loading: %s', file );


        platforms[ platform ] = require( file );
        if ( !platforms[ platform ].name )
          platforms[ platform ].name = platform;
      } );

      CS.platforms = platforms;
      // files is an array of filenames.
      callback();
    } );

  } catch ( err ) {
    console.error( 'Operations configuration error', err );
    callback( err );
  }
}



// Export configuration function
exports = module.exports = configPlatforms;