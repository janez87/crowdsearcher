
// Load libraries
var mongo = require('mongoose');
//var log = common.log.child( { component: 'Annotation model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var Mixed = Schema.Types.Mixed;

var metadataPlugin = require( './plugins/metadata' );

// AnnotationSchema
// ------
// The Annotation schema represents
var AnnotationSchema = new Schema( {
  response: {
    type: Mixed,
    'default': null
  },

  object: {
    required: true,
    type: ObjectId,
    ref: 'object'
  },

  operation: {
    required: true,
    type: ObjectId,
    ref: 'operation'
  },

  creationDate: {
    type: Date,
    'default': Date.now
  }
}, {
  // Allow to add random properties to this Entity.
  strict: false
} );

// Use plugins
AnnotationSchema.plugin( metadataPlugin );

exports = module.exports = AnnotationSchema;