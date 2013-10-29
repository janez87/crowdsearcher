// Load libraries
var _  = require('underscore');
var mongo = require('mongoose');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Annotation model' } );

// Import Mongoose Classes and Objects
var MongoError = mongo.Error;
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var Mixed = Schema.Types.Mixed;

// # Execution definition
// The Execution is an instance of the Microtask for a Performer.

// ## Schema
//
// Mongoose schema for the Execution entity.
var AnnotationSchema = new Schema( {
  // ### Response
  //
  // The response of the Performer, siutable for the operation.
  response: {
    type: Mixed,
    index: true
  },

  // ### References
  //
  // The Object reference for this Annotation.
  object: {
    required: true,
    index: true,
    type: ObjectId,
    ref: 'object'
  },

  // The reference Operation for this Annotation.
  operation: {
    required: true,
    index: true,
    type: ObjectId,
    ref: 'operation'
  },


  // ### Time data
  //
  // Creation date of the entity. By default it will be the first save of the object.
  creationDate: {
    required: true,
    type: Date,
    'default': Date.now
  }
},

/// ## Schema options
//
{
  // Do not allow to add random properties to the model.
  strict: true,
  // Disable index check in production.
  autoIndex: process.env.PRODUCTION? false : true
} );











// ## Plugins to add to the Execution model.
//
// Add the `metadata` fileld to the entity.
AnnotationSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
AnnotationSchema.plugin( require( './plugins/accessKeyPlugin' ) );







exports = module.exports = AnnotationSchema;