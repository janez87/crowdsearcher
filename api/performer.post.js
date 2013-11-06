

// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var CS = require( '../core' );

// Import the required Models
var Performer = CS.models.user;

// Use a child logger
var log = CS.log.child( { component: 'Post Performer' } );

// Generate custom error `PostPerformerError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostPerformerError = function( id, message, status ) {
  /* jshint camelcase: false */
  PostPerformerError.super_.call( this, id, message, status );
};
util.inherits( PostPerformerError, APIError );

PostPerformerError.prototype.name = 'PostPerformerError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [],

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'performer|user',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postPerformer( req, res, next ) {
  log.trace( 'Performer poster' );

  var rawPerformer = req.body;
  var performer = new Performer( rawPerformer );

  req.wrap( 'save', performer )( function( err, performer ) {
    if( err ) return next( err );

    return res.json( performer.toObject( { getters: true } ) );
  } );
};


// Export the API object
exports = module.exports = API;