// Load libraries
var mongo = require('mongoose');
var log = common.log.child( { component: 'Object model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// Import plugins

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
    'default': 10
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

// Export the Schema
exports = module.exports = ObjectSchema;