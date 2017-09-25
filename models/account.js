'use strict';
var _ = require('lodash');
var mongo = require('mongoose');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Account model' } );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;

// # Account definition
// The Account represent a User account on some social network.

// ## Schema
//
// Mongoose schema for the Account entity.
var AccountSchema = new Schema( {
  // ### Account data, stick to Passport profile information.
  //
  // Name of the provider (Eg facebook, twitter).
  provider: {
    type: String,
    index: true,
    required: true,
    lowercase: true,
    trim: true
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
  autoIndex: process.env.PRODUCTION? false : true
} );








// ## Plugins to add to the Account model.
//
// Add the `metadata` fileld to the entity.
AccountSchema.plugin( require( './plugins/metadataPlugin' ) );




// Export the schema.
exports = module.exports = AccountSchema;