// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( {
  component: 'Winner'
} );

// Import Models
var ControlMart = CS.models.controlmart;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetWinnerErro = function( id, message, status ) {
  GetWinnerErro.super_.call( this, id, message, status );
};
util.inherits( GetWinnerErro, APIError );
// Custom error IDS
GetWinnerErro.prototype.name = 'GetWinnerErro';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'mart/winner',

  // The API method to implement.
  method: 'GET'
};

// API core function logic. If this function is executed then each check is passed.
//TODO:
API.logic = function getStats( req, res, next ) {
  var objectId = req.query.object;
  var operationId = req.query.operation;

  log.trace( 'Retreving the winner asnwer for object %s and operation %s', objectId, operationId )
  var query = {};

  query.object = objectId;
  query.operation = operationId;
  query.name = 'result';

  log.trace( query );

  ControlMart
    .get( query, function( err, mart ) {
      if ( err ) return next( err );

      res.json( mart );
    } );
};


// Export the API object
exports = module.exports = API;