

// Load libraries
var _ = require('underscore');
var util  = require('util');
var mongo = require('mongoose');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;


// Create child logger
var log = common.log.child( { component: 'Metadata plugin' } );



// Custom error
// ----
var CSError = require('../../error');
var MetadataError = function( id, message) {
  /* jshint camelcase: false */
  MetadataError.super_.call( this, id, message );
};

util.inherits( MetadataError, CSError );

// Error name
MetadataError.prototype.name = 'MetadataError';

// Custom error IDs






module.exports = exports = function metadataPlugin( schema ) {

  schema.add( {
    metadata: [ {
      key: {
        type: String,
        required: true
      },
      value: Mixed
    } ]
  } );


  schema.methods.hasMetadata = function( key ) {
    return _.isUndefined( this.getMetadata( key ) )? false: true;
  };
  schema.methods.setMetadata = function( key, value ) {

    // Generate a `Metadata` object
    var metadataObj = {
      key: key,
      value: value
    };

    // Check if the key is already present, cannot use `hasMetadata`
    // because we need the index
    var index = -1;
    //log.trace( 'Searching for %s in %j', key, this.metadata );
    _.find( this.metadata, function( obj, idx ) {
      if( obj.key===key ) {
        index = idx;
        return true;
      } else {
        return false;
      }
    } );
    log.trace( 'Key "%s" found in position %s', key, index );

    if( index!==-1 ) {
      log.trace( 'Key found, setting @%s', index );
      // if the key is found then update the object
      this.metadata.set( index, metadataObj );
    } else {
      log.trace( 'Key not found, pushing' );
      // if the key is *NOT* found then add a new metadata object
      this.metadata.push( metadataObj );
    }

    return;
  };
  schema.methods.getMetadata = function( key ) {
    var data = _.findWhere( this.metadata, { key: key } );
    return data? data.value : undefined;
  };
  schema.methods.removeMetadata = function( key ) {
    var metadataObj = this.getMetadata( key );
    this.metadata.remove( metadataObj._id );
    return;
  };
};