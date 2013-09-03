
// Load libraries
var _ = require( 'underscore' );
var url = require( 'url' );
var util = require( 'util' );
var async = require( 'async' );

// Use a child logger
var log = common.log.child( { component: 'Start Execution' } );

// Import other APIs
var getExecutionAPI = require( './execution.get' );

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
    getExecutionAPI.logic( req, res, callback );
  };

  // From the id retrieve the Execution Object
  var populateExecution = function( callback ) {
    var query = req.queryObject;

    query
    .populate( 'task microtask operations platform' )
    .exec( req.wrap( callback ) );
  };

  var startImplementation = function( execution, callback ) {
    if( !execution )
      return callback( new StartExecutionError( StartExecutionError.NO_EXECUTION, 'Missing execution' ) );

    var platform = execution.platform;
    // Import the platform implementation
    var platformImplementation = common.platforms[ platform.name ];

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

    log.debug( 'Run execution complete' );
    var urlObj = url.parse( executionUrl, true );
    urlObj.search = null;
    var qs = _.extend( urlObj.query, req.query );

    log.trace( 'Params: %j', req.query );
    log.trace( 'qs: %j', qs );

    //urlObj.query = {};
    executionUrl = url.format( urlObj );
    log.trace( 'Redirect url is %s', executionUrl );

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