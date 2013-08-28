// Load libraries
var _  = require('underscore');
var nconf = require( 'nconf' );
var glob = require( 'glob' );


// Configure Operations
// ---
function configOperations( callback ) {
  // Import the log, cannot be imported before because is not available
  var log = common.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring operation list' );

    // Get the configuration object
    var operationConfiguration = nconf.get( 'operations' );

    // Compose the operation base directory
    var opBaseDir = operationConfiguration.path;


    // Options for `glob`.
    var options = {
      cwd: opBaseDir
    };

    // Read all the files inside the `opBaseDir` asynchronusly
    glob( '*', options, function( err, files ) {
      if( err ) return callback( err );

      if( !files ) return callback();

      var operations = {};

      _.each( files, function( file ) {
        //var platform = file.slice( 0, -3 );
        var operation = file;

        file = '../'+opBaseDir + '/' + file;
        log.trace( 'Loading %s operation', operation );


        operations[ operation ] = require( file );
      } );

      GLOBAL.common.operations = operations;
      return callback();
    });

  } catch( err ) {
    console.error( 'Operations configuration error', err );
    return callback( err );
  }

}



// Export configuration function
exports = module.exports = configOperations;