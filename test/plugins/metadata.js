

'use strict';
let _ = require( 'lodash' );


module.exports = exports = function metadataPlugin( schema ) {

  schema.add( {
    metadata: {
      type: [{
        key: {
          type: 'string',
          required: true
        },
        value: 'mixed'
      } ]
    }
  } );


  // We need to disable verisioning because
  //schema.set( 'versionKey', false );

  schema.methods.haveMetadata = function( key ) {
    return this.getMetadata( key )? true : false;
  };
  schema.methods.setMetadata = function( key, value ) {

    // Generate a `Metadata` object
    var metadataObj = {
      key: key,
      value: value
    };

    // Check if the key is already present
    var index = -1;
    _.find( this.metadata, function( obj, idx ) {
      if( obj.key===key ) {
        index = idx;
        return true;
      } else {
        return false;
      }
    } );

    if( index!==-1 ) {
      // if the key is found then update the object
      this.metadata.set( index, metadataObj );
    } else {
      // if the key is *NOT* found then add a new metadata object
      this.metadata.push( metadataObj );
    }

    return;
  };
  schema.methods.getMetadata = function( key ) {
    return _.findWhere( this.metadata, { key: key } );
  };
  schema.methods.removeMetadata = function( key ) {
    var metadataObj = this.getMetadata( key );
    this.metadata.remove( metadataObj._id );
    return;
  };
};