'use strict';
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'ActiveJobs model'
} );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// # ActiveJobs definition
// This schema store the information about the jobs that are active for a particular task on a given platform

// ## Schema
//
// Mongoose schema for the ActiveJobs entity.
var ActiveJobSchema = new Schema( {

    platform: {
      type: ObjectId,
      ref: 'platform'
    },
    microtask: {
      type: ObjectId,
      ref: 'microtask'
    },

    // ### Time data
    //
    // Creation date of the entity. By default it will be the first save of the object.
    createdDate: {
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
    autoIndex: process.env.PRODUCTION ? false : true
  } );








// ## Plugins to add to the ActiveJobs model.
//
// Add the `metadata` fileld to the entity.
ActiveJobSchema.plugin( require( './plugins/metadataPlugin' ) );




// Export the schema.
exports = module.exports = ActiveJobSchema;