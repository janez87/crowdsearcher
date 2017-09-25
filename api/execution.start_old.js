
'use strict';
let _ = require( 'lodash' );
var url = require( 'url' );
var util = require( 'util' );
var nconf = require( 'nconf' );
var async = require( 'async' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Start Execution' } );

// Import other APIs
var getExecutionAPI = require( './execution.get' );
var Execution = CS.models.execution;

// Generate custom error `StartExecutionError` that inherits
// from `APIError`
var APIError = require( './error' );
var StartExecutionError = function( id, message, status ) {
  /* jshint camelcase: false */
  StartExecutionError.super_.call( this, id, message, status );
};
util.inherits( StartExecutionError, APIError );

StartExecutionError.prototype.name = 'StartExecutionError';
// Custom error IDs
StartExecutionError.NO_EXECUTION = 'NO_EXECUTION';
StartExecutionError.INVALID_URL = 'INVALID_URL';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'run',

  // The API method to implement.
  method: 'GET'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function startExecution( req, res, next ) {
  // Fake API call to `GET /api/execution`
  var getExecution = function( callback ) {
    // Make the fake call
    getExecutionAPI.logic( req, {
      json: function( data ) {
        if( arguments.length===2 ) {
          return res.json( arguments[0], arguments[1] );
        } else {
          return callback( null, data );
        }
      },
      format: _.bind( res.format, res ),
      redirect: _.bind( res.redirect, res )
    }, next );
  };

  // From the id retrieve the Execution Object
  var populateExecution = function( execution, callback ) {
    Execution
    .findById( execution._id )
    .populate( 'task microtask platform' )
    .exec( req.wrap( callback ) );
  };

  var startImplementation = function( execution, callback ) {
    if( !execution )
      return callback( new StartExecutionError( StartExecutionError.NO_EXECUTION, 'Missing execution' ) );

    var platform = execution.platform;
    // Import the platform implementation
    var platformImplementation = platform.implementation;

    try {
      platformImplementation.execute(
        execution.task,
        execution.microtask,
        execution,
        platform,
        req.wrap( callback )
      );
    } catch( err ) {
      log.error( 'Execution error' );
      return callback( err );
    }
  };

  var actions = [
    getExecution,
    populateExecution,
    startImplementation
  ];

  async.waterfall( actions, function( err, executionUrl ) {
    if( err ) return next( err );

    if( !executionUrl )
      return next( new StartExecutionError( StartExecutionError.INVALID_URL, 'The platform did not provide a valid url' ) );

    var urlObj = url.parse( executionUrl, true );
    urlObj.search = null;
    executionUrl = url.format( urlObj );

    res.format( {
      html: function() {
        res.redirect( executionUrl );
      },
      json: function() {
        res.json( {
          url: executionUrl
        } );
      }
    } );
  } );
};


// Export the API object
exports = module.exports = API;