

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
  url: 'performer',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postPerformer( req, res, next ) {
  log.trace( 'Performer poster' );

  var rawPerformers = _.clone( req.body );

  if( !_.isArray( rawPerformers ) )
    rawPerformers = [ rawPerformers ];


  Performer.create( rawPerformers, req.wrap( function( err ) {
    if( err ) return next( err );

    var argArray =  _.toArray( arguments );
    var performers = argArray.slice( 1 );
    var performerIds = _.map( performers, function( perf ) {
      return perf._id;
    } );

    log.trace('Performers created');
    return res.json( {
      performers: performerIds
    } );
  } ) );
};


// Export the API object
exports = module.exports = API;