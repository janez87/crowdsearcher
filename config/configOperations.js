'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let glob = require( 'glob' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function configOperations() {
  // Import the log, cannot be imported before because is not available
  var log = CS.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring operation list' );

    // Get the configuration object
    var operationConfiguration = this.get( 'operations' );

    // Compose the operation base directory
    var opBaseDir = operationConfiguration.path;


    // Options for `glob`.
    var options = {
      cwd: opBaseDir
    };

    // Read all the files inside the `opBaseDir` asynchronusly
    return glob( '*', options )
    .then( function( files ) {
      if( !files ) return;

      var operations = {};

      _.each( files, function( file ) {
        //var platform = file.slice( 0, -3 );
        var operation = file;

        file = '../' + opBaseDir + '/' + file;
        log.trace( 'Loading %s operation', operation );


        operations[ operation ] = require( file );
        if ( !operations[ operation ].name ) {
          operations[ operation ].name = operation;
        }

      } );

      CS.operations = operations;
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
exports = module.exports = configOperations;