

// Load libraries
var mongo = require('mongoose');
//var log = common.log.child( { component: 'Account model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;

// Import plugins
var metadataPlugin = require( '../plugins/metadata' );

// User schema
var AccountSchema = new Schema( {
  provider: {
    type: 'string',
    index: true
  },

  uid: {
    type: 'string',
    index: true
  },

  image: 'string',
  displayName: 'string',

  name: {
    familyName: 'string',
    givenName: 'string',
    middleName: 'string'
  },

  token: 'string',
  tokenSecret: 'string',

  /*
  emails: [{
    value: 'string',
    type: 'string'
  }],
  */

  _creationDate: {
    type: 'date',
    'default': Date.now
  }
} );

AccountSchema.plugin( metadataPlugin );

exports = module.exports = AccountSchema;