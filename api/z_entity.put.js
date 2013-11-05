
// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Import Mongo classed
var MongoError = mongo.Error;


// Use a child logger
var log = CS.log.child( { component: 'Set API' } );

// Generate custom error `SetError` that inherits
// from `APIError`
var APIError = require( './error' );
var SetError = function( id, message, status ) {
  /* jshint camelcase: false */
  SetError.super_.call( this, id, message, status );
};
util.inherits( SetError, APIError );

SetError.prototype.name = 'SetError';
// Custom error IDs
SetError.BAD_ID = 'BAD_ID';
SetError.BAD_ENTITY_NAME = 'BAD_ENTITY_NAME';
SetError.BAD_ENTITY_PROPERTY = 'BAD_ENTITY_PROPERTY';
SetError.OBJECT_NOT_FOUND = 'OBJECT_NOT_FOUND';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: ':entity/:property',

  // The API method to implement.
  method: 'PUT'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function setApi( req, res, next ) {
  var entity = req.params.entity;
  var property = req.params.property;
  var value = req.body.data;

  log.trace( 'Setting %s for %s ', property, entity );

  // Get the model based on the `entity` parameter.
  var model = CS.models[ entity ];


  // Validate the selected `entity`.
  if( _.isUndefined( model ) )
    return next( new SetError( SetError.BAD_ENTITY_NAME, 'Unable to retrieve the entity "'+entity+'"', APIError.BAD_REQUEST ) );

  // Validate the selected `property` field.
  var pathInfo = model.schema.path( property );
  var pathType = model.schema.pathType( property );
  //log.trace( 'Path info (%s): %j', pathType, pathInfo );
  if( _.isUndefined( pathInfo ) && pathType!=='nested' )
    return next( new SetError( SetError.BAD_ENTITY_PROPERTY, 'The entity "'+entity+'" has no "'+property+'" property', APIError.BAD_REQUEST ) );

  // Validate the `entity` id.
  var entityId = req.query[ entity ];
  if( _.isUndefined( entityId ) )
    return next( new SetError( SetError.BAD_ID, 'You must specify a "'+entity+'" query parameter', APIError.BAD_REQUEST ) );

  log.trace( '%s[%s] find %s', entity, property, entityId );
  log.trace( 'Setting %s to: %s', property, value );

  // We need to send the `find` command and then the `save` command to ensure
  // that all the middlewares are called correctly.
  model
  .findById( entityId )
  .exec( req.wrap( function( err, doc ) {
    if( err ) return next( err );

    if( !doc )
      return next( new SetError( SetError.OBJECT_NOT_FOUND, 'Object not fond in the db', APIError.SERVER_ERROR ) );

    doc.set( property, value );

    doc.save( req.wrap( function( err, data ) {
      if( err ) return next( err );
      return res.json( data );
    } ) );
  } ) );
};


// Export the API object
exports = module.exports = API;