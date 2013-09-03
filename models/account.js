

// Load libraries
var mongo = require('mongoose');
//var log = common.log.child( { component: 'Account model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;

// Import plugins
var metadataPlugin = require( './plugins/metadata' );

// User schema
var AccountSchema = new Schema( {
  provider: {
    type: String,
    index: true
  },

  uid: {
    type: String,
    index: true
  },

  image: String,
  displayName: String,
  profileUrl: String,

  name: {
    familyName: String,
    givenName: String,
    middleName: String
  },

  token: String,
  tokenSecret: String,

  _creationDate: {
    type: 'date',
    'default': Date.now
  }
} );

AccountSchema.plugin( metadataPlugin );

exports = module.exports = AccountSchema;