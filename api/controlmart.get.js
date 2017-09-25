'use strict';
var util = require( 'util' );
var mongo = require( 'mongoose' );

var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var CS = require( '../core' );
var log = CS.log.child( {
  component: 'get control mart'
} );
// Use a child logger
//var log = CS.log.child( { component: 'Get Task' } );

// Generate custom error `GetTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetTaskError = function( id, message, status ) {
  GetTaskError.super_.call( this, id, message, status );
};
util.inherits( GetTaskError, APIError );

GetTaskError.prototype.name = 'GetTaskError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {},

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'controlmart',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getMart( req, res, next ) {

  var ControlMart = CS.models[ 'controlmart' ];

  var params = [
    'task', 'performer', 'operation', 'name', 'object'
  ];

  var query = {};

  log.trace( req.query );

  for ( var i = 0; i < params.length; i++ ) {
    var p = params[ i ];
    log.trace( p );

    if ( req.query[ p ] ) {
      log.trace( '%s : %s', p, req.query[ p ] );

      query[ p ] = req.query[ p ];

    }
  }

  log.trace( query );
  ControlMart
    .find( query )
    .exec( function( err, mart ) {
      if ( err ) return next( err );

      return res.json( mart );
    } );



};


// Export the API object
exports = module.exports = API;