
// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );

// Use a child logger
var log = common.log.child( { component: 'Get API' } );

// Generate custom error `GetError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetError.super_.call( this, id, message, status );
};
util.inherits( GetError, APIError );

GetError.prototype.name = 'GetError';
// Custom error IDs
GetError.BAD_ID = 'BAD_ID';
GetError.BAD_ENTITY_NAME = 'BAD_ENTITY_NAME';
GetError.BAD_ENTITY_PROPERTY = 'BAD_ENTITY_PROPERTY';
GetError.OBJECT_NOT_FOUND = 'OBJECT_NOT_FOUND';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: ':entity/:property?',

  // The API method to implement.
  method: 'GET'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function getApi( req, res, next ) {
  var entity = req.params.entity;
  entity = entity==='performer'? 'user' : entity;
  var property = req.params.property;

  log.trace( 'Getting %s for %s ', property || 'all properties', entity );

  // Get the model based on the `entity` parameter.
  var model = common.models[ entity ];

  if( _.isUndefined( model ) )
    return next( new GetError( GetError.BAD_ENTITY_NAME, 'Unable to retrieve the entity "'+entity+'"', APIError.BAD_REQUEST ) );

  if( !_.isUndefined( property ) ) {
    var pathInfo = model.schema.path( property );
    var pathType = model.schema.pathType( property );
    if( _.isUndefined( pathInfo ) && pathType!=='nested' )
      return next( new GetError( GetError.BAD_ENTITY_PROPERTY, 'The entity "'+entity+'" has no "'+property+'" property', APIError.BAD_REQUEST ) );
  }

  var entityId = req.query[ entity ];
  if( _.isUndefined( entityId ) )
    return next( new GetError( GetError.BAD_ID, 'You must specify a "'+entity+'" query parameter', APIError.BAD_REQUEST ) );

  var query = model.findById( entityId );

  if( property )
    query.select( property );

  req.queryObject = query;
  return next();
};


// Export the API object
exports = module.exports = API;