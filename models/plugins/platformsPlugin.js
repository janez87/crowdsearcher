'use strict';
let _ = require( 'lodash' );
var mongo = require('mongoose');
var CS = require( '../../core' );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.Types.ObjectId;
var MongoError = mongo.Error;

// Create child logger
var log = CS.log.child( { component: 'Platforms plugin' } );



// # Platforms plugin
//
// Mongoose plugin for adding platforms field to a mongoose model.
module.exports = exports = function ( schema ) {

  // Add to the schema the platforms field.
  schema.add( {
    // List of `Platform`s of the schema. Each platform is a *reference* to a platform model.
    platforms: {
      type: [ {
        type: ObjectId,
        ref: 'platform'
      } ],
      'default': []
    }
  } );





  // ## Methods
  //
  // ### Setters
  //
  // Add a platform to the document.
  schema.methods.addPlatforms = function( platforms, callback ) {
    log.trace( 'Adding platforms: %j', platforms );
    var _this = this;

    // Check if the document is editable.
    if( !this.editable )
      return callback( new MongoError( 'Not editable, status: '+this.status ) );

    // Convert into array
    if( !_.isArray( platforms ) )
      platforms = [ platforms ];

    var Platform = this.model( 'platform' );
    Platform.create( platforms, function( err, plats ) {
      if( err ) return callback( err );

      log.trace( 'Added platforms: %j', plats );

      // Add the platform to the list, unique
      _this.platforms.addToSet.apply( _this.platforms, plats );

      return _this.save( callback );
    } );
  };
  // With or without the 's'.
  schema.methods.addPlatform = schema.methods.addPlatforms;
  // ### Getters
  //
  // Find a platform by name.
  schema.methods.getPlatformByName = function( name, callback ) {
    var populated = this.populated( 'platforms' );

    if( _.isUndefined( populated ) ) {
      return this.populate( 'platforms', function( err, entity ) {
        if( err ) return callback( err );
        entity .getPlatformByName( name, callback );
      } );
    }

    log.trace( 'Find platform by name (%s)', name );

    var platform = _.findWhere( this.platforms, { name: name } );
    return callback( null, platform );
  };
  // Find a platform by id.
  schema.methods.getPlatformById = function( id, callback ) {
    var Platform = CS.models.platform;

    return Platform
    .findById( id )
    .exec( callback );
  };
};