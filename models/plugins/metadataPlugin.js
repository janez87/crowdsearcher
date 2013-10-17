// Load libraries
var _ = require('underscore');
var util  = require('util');
var mongo = require('mongoose');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;


// Create child logger
var log = common.log.child( { component: 'Metadata plugin' } );




// # Metadata plugin
//
// Mongoose plugin for adding metadata field to a mongoose model.
module.exports = exports = function ( schema ) {

  // Add to the schema the metadta field.
  // This field is an array of key->value pairs for storing any type of data associated to the
  // entity they belong to.
  schema.add( {
    metadata: [ {
      key: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      value: {
        type: Mixed,
        'default': null
      }
    } ]
  } );

  // ## Methods
  //
  // Add to the schema a method to check if the given key is present.
  schema.methods.hasMetadata = function( key ) {
    return _.isUndefined( this.getMetadata( key ) )? false: true;
  };

  // Add to the schema a method to set the `key` metadata to `value`.
  // This method can add/update a given `key` to the metadata list.
  schema.methods.setMetadata = function( key, value ) {
    // If the key is not defined just exit.
    if( _.isUndefined( key ) )
      return;

    // Create a plain JS object containing the data.
    var rawObject = {
      key: key,
      value: value
    };

    // Check if the key is already present, if so get the index.
    var index = _.reduce( this.metadata, function( memo, metadata, i ){
      return ( metadata.key===key )? i : memo;
    }, -1 );

    // If the key was found then update the metadata in position `index`.
    if( index!==-1 ) {
      log.trace( 'Key found @ %s, setting %s', index, key );

      this.metadata.set( index, rawObject );

    // If the key is missing then add it to the array.
    } else {
      log.trace( 'Key not found, pushing' );

      this.metadata.push( rawObject );
    }
  };

  // Get the metadata identified by `key`.
  schema.methods.getMetadata = function( key ) {
    var metadata = _.findWhere( this.metadata, { key: key } );
    return metadata? metadata.value : undefined;
  };

  // Removes the metadata identified by `key`.
  schema.methods.removeMetadata = function( key ) {
    var metadata = _.findWhere( this.metadata, { key: key } );
    if( metadata )
      this.metadata.remove( metadata._id );
  };
};