'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
var glob = require( 'glob' );
let Promise = require( 'bluebird' );

// Load my modules
var CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function configPlatforms() {
  // Import the log, cannot be loaded before because is not available.
  var log = CS.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring platforms' );

    // Get the configuration object
    var platformConfiguration = this.get( 'platforms' );

    // Compose the operation base directory
    var platformsBaseDir = platformConfiguration.path;


    //
    var options = {
      cwd: platformsBaseDir
    };

    // Read all the files inside the `platformsBaseDir` asynchronusly
    return glob( '*', options )
    .then( function( files ) {

      if ( !files ) return;

      var platforms = {};

      _.each( files, function( file ) {
        //var platform = file.slice( 0, -3 );
        var platform = file;

        file = '../' + platformsBaseDir + '/' + file;
        log.trace( 'Loading: %s', file );


        platforms[ platform ] = require( file );
        if( !platforms[ platform ].name ) {
          platforms[ platform ].name = platform;
        }
      } );

      CS.platforms = platforms;
      // files is an array of filenames.
    } );

  } catch ( err ) {
    console.error( 'Operations configuration error', err );
    return Promise.reject( err );
  }
}

// Module class declaration

// Module initialization (at first load)
glob = Promise.promisify( glob );

// Module exports
exports = module.exports = configPlatforms;