// Load libraries
var _ = require( 'underscore' );
var nconf = require( 'nconf' );
var glob = require( 'glob' );
var CS = require( '../core' );

// Configure Task Types
// ---
function configTaskTypes( callback ) {
  // Import the log, cannot be imported before because is not available
  var log = CS.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring task type list' );

    // Get the configuration object
    var taskTypesConfiguration = nconf.get( 'taskTypes' );

    // Compose the taskType base directory
    var TTBaseDir = taskTypesConfiguration.path;


    // Options for `glob`.
    var options = {
      cwd: TTBaseDir
    };

    // Read all the files inside the `TTBaseDir` asynchronusly
    glob( '*', options, function( err, files ) {
      if ( err ) return callback( err );

      if ( !files ) return callback();

      var taskTypes = {};

      _.each( files, function( file ) {
        var taskType = file;

        file = '../' + TTBaseDir + '/' + file;
        log.trace( 'Loading %s Task Type', taskType );

        taskTypes[ taskType ] = require( file );
        taskTypes[ taskType ].id = taskType;
      } );

      CS.taskTypes = taskTypes;
      return callback();
    } );

  } catch ( err ) {
    console.error( 'Task Types configuration error', err );
    return callback( err );
  }

}



// Export configuration function
exports = module.exports = configTaskTypes;