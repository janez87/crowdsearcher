

// Load libraries
var mongo = require('mongoose');
var log = common.log.child( { component: 'Platform model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;

// User schema
var PlatformSchema = new Schema( {
  name: {
    type: 'string',
    lowercase: true,
    required: true
  },
  params: {
    type: 'mixed',
    'default': null
  },

  enabled: {
    type: 'boolean',
    required: true
  },
  invitation: {
    type: 'boolean',
    required: true
  },
  execution: {
    type: 'boolean',
    required: true
  }
} );

PlatformSchema.pre( 'remove', function( next ) {
  log.trace( 'Removing platform %s', this.name );
  next();
} );
PlatformSchema.post( 'remove', function() {
  log.trace( 'Removed platform %s', this.name );
} );

exports = module.exports = PlatformSchema;