

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );

var MongoError = require( 'mongoose' ).Error;


// Use a child logger
var log = common.log.child( { component: 'Put SplittingStrategy' } );

// Generate custom error `PutSplittingStrategyError` that inherits
// from `APIError`
var APIError = require( './error' );
var PutSplittingStrategyError = function( id, message, status ) {
  PutSplittingStrategyError.super_.call( this, id, message, status );
};
util.inherits( PutSplittingStrategyError, APIError );

PutSplittingStrategyError.prototype.name = 'PutSplittingStrategyError';
// Custom error IDs
PutSplittingStrategyError.MISSING_SPLITTINGSTRATEGY = 'MISSING_SPLITTINGSTRATEGY';
PutSplittingStrategyError.MISSING_SPLITTINGSTRATEGY_NAME = 'MISSING_SPLITTINGSTRATEGY_NAME';
PutSplittingStrategyError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],

   // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'splittingstrategy',

  // The API method to implement.
  method: 'PUT'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function putSplittingStrategy( req, res, next ) {
  log.trace( 'SplittingStrategy put' );

  // Get the task from the request body
  var splittingStrategy = req.body;

  if( _.isUndefined( splittingStrategy ) )
    return next( new PutSplittingStrategyError( PutSplittingStrategyError.MISSING_SPLITTINGSTRATEGY, 'No splitting strategy', APIError.BAD_REQUEST ) );

  if( _.isEmpty( splittingStrategy ) )
    return next( new PutSplittingStrategyError( PutSplittingStrategyError.MISSING_SPLITTINGSTRATEGY, 'No splitting strategy', APIError.BAD_REQUEST ) );

  if( _.isUndefined( splittingStrategy.name ) || splittingStrategy.name.length===0 )
    return next( new PutSplittingStrategyError( PutSplittingStrategyError.MISSING_SPLITTINGSTRATEGY_NAME, 'Splitting strategy name missing', APIError.BAD_REQUEST ) );

  // Get the task from the request
  var task = req.task;

  task.setSplittingStrategy( splittingStrategy, req.wrap( function( err ) {

    if( err instanceof MongoError )
      return next( err );

    if( err )
      return next( new PutSplittingStrategyError( err.id, err.message, APIError.BAD_REQUEST ) );
    res.status( 200 );
    res.json( {} );
  } ) );
};


// Export the API object
exports = module.exports = API;