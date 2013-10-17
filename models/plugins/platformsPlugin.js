// Load libraries
var _ = require('underscore');
var mongo = require('mongoose');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.Types.ObjectId;

// Create child logger
var log = common.log.child( { component: 'Platforms plugin' } );



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
    var _this = this;

    // Convert into array
    if( !_.isArray( platforms ) )
      platforms = [ platforms ];

    var Platform = this.model( 'platform' );
    Platform.create( platforms, function( err ) {
      if( err ) return callback( err );

      // Convert to plain Array.
      var platforms = _.toArray( arguments );
      // Remove the error argument.
      platforms.unshift();

      // Add the platform to the list, unique
      _this.platforms.addToSet.apply( _this.platforms, platforms );

      // Save the document.
      return _this.save( callback );
    } );
  };
  // With or without the 's'.
  schema.methods.addPlatform = schema.methods.addPlatforms;
  // ### Getters
  //
  // Find a platform by name.
  schema.methods.getPlatformByName = function( name, callback ) {
    var _this = this;
    var populated = this.populated( 'platforms' );


    if( !populated ) {
      return this.populate( 'platforms', function( err ) {
        if( err ) return callback( err );
        _this.getPlatformByName( name, callback );
      } );
    }

    log.trace( 'Find platform by name (%s)', name );

    var platform = _.findWhere( this.platforms, { name: name } );
    return callback( null, platform );
  };
  // Find a platform by id.
  schema.methods.getPlatformById = function( id, callback ) {
    // If the field is populated then use the original ids.
    var ids = this.populated( 'platforms' );
    if( !ids )
      // if is not populated use the ids from the list of platforms.
      ids = this.platforms;

    log.trace( 'Find platform by id (%s)', id );

    var platform = _.find( ids, function ( currentId ) {
      return currentId.equals( id );
    } );


    return callback( null, platform );
  };
};