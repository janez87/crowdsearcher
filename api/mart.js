// Load libraries
var _  = require('underscore');
var util  = require('util');
var async = require('async');
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Stats' } );

// Import Models
var ControlMart = CS.models.controlmart;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetStatsError = function( id, message, status ) {
  GetStatsError.super_.call( this, id, message, status );
};
util.inherits( GetStatsError, APIError );
// Custom error IDS
GetStatsError.prototype.name = 'GetStatsError';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: ':entity/:id/mart',

  // The API method to implement.
  method: 'GET'
};

// API core function logic. If this function is executed then each check is passed.
//TODO:
API.logic = function getStats( req, res, next ) {
  var entity = req.params.entity;
  var id = req.params.id;

  log.trace( 'Mart for %s with id %s', entity, id  );
  var query = {};

  query[ entity ] = id;

  ControlMart
  .get( query, function( err, mart ) {
    if( err ) return next( err );

    res.json( mart );
  } );
};


// Export the API object
exports = module.exports = API;