

// Load libraries
var mongo = require('mongoose');
//var log = common.log.child( { component: 'Account model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;

// Import plugins
var metadataPlugin = require( './plugins/metadata' );

// User schema
var ControlMartSchema = new Schema( {
  
  data: Schema.Types.Mixed
} );

ControlMartSchema.plugin( metadataPlugin );

exports = module.exports = ControlMartSchema;