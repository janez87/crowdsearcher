'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
var Promise = require( 'bluebird' );
let glob = require( 'glob' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function configTaskTypes() {
  // Import the log, cannot be imported before because is not available
  var log = CS.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring task type list' );

    // Get the configuration object
    var taskTypesConfiguration = this.get( 'taskTypes' );

    // Compose the taskType base directory
    var TTBaseDir = taskTypesConfiguration.path;


    // Options for `glob`.
    var options = {
      cwd: TTBaseDir
    };

    // Read all the files inside the `TTBaseDir` asynchronusly
    return glob( '*', options )
    .then( function( files ) {
      if ( !files ) return;

      var taskTypes = {};

      _.each( files, function( file ) {
        var taskType = file;

        file = '../' + TTBaseDir + '/' + file;
        log.trace( 'Loading %s Task Type', taskType );

        taskTypes[ taskType ] = require( file );
        taskTypes[ taskType ].id = taskType;
      } );

      CS.taskTypes = taskTypes;
    } );

  } catch ( err ) {
    console.error( 'Task Types configuration error', err );
    return Promise.reject( err );
  }

}

// Module class declaration

// Module initialization (at first load)
glob = Promise.promisify( glob );

// Module exports
exports = module.exports = configTaskTypes;