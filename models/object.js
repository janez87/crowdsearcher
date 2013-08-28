// Load libraries
var mongo = require('mongoose');
var log = common.log.child( { component: 'Object model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var ObjectStatuses = require( '../config/constants' ).ObjectStatuses;

// Import plugins
var metadataPlugin = require( './plugins/metadata' );

// ObjectSchema
// ------
// The Object schema represents
var ObjectSchema = new Schema( {

  // Object name
  name: {
    type: String,
    required: true
  },

  // Job that owns this object
  job: {
    required: true,
    type: ObjectId,
    ref: 'job'
  },

  status: {
    type: Number,
    'default': ObjectStatuses.OPENED
  },

  closedDate: {
    type: 'date',
    'default':null
  },
  data: Schema.Types.Mixed
},
// Set the options fot this Schema
{
  // Do not allow to add random properties to the Model
  strict: true
} );
ObjectSchema.plugin( metadataPlugin );


// Pre middlewares
// ---
ObjectSchema.pre( 'save', function( next ) {
  log.trace( 'PRE Object save' );
  next();
} );
ObjectSchema.pre( 'remove', function( next ) {
  log.trace( 'PRE Object remove' );
  next();
} );

// Post middlewares
// ---
ObjectSchema.post( 'save', function() {
  log.trace( 'POST Object save' );
} );
ObjectSchema.post( 'remove', function() {
  log.trace( 'POST Object remove' );
} );

ObjectSchema.methods.close = function(callback){
  log.trace('Closing the object');

  this.set('status',ObjectStatuses.CLOSED);
  this.set('closedDate',Date.now());

  this.save(callback);
};

// Export the Schema
exports = module.exports = ObjectSchema;