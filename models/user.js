// Load libraries
var _  = require('underscore');
var mongo = require('mongoose');
var crypto = require('crypto');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'User model' } );

// Import Mongoose Classes and Objects
var MongoError = mongo.Error;
var Schema = mongo.Schema;
var Account = require( './account' );

// Import the CRM for handling User events.
//var CRM = require( '../scripts/controlRuleManager' );

// # User definition
// The User can be either a Performer or a CS manager.

// ## Schema
//
// Mongoose schema for the User entity.
var UserSchema = new Schema( {
  // ### User data
  //
  // Username.
  username: {
    type: String,
    index: true,
    trim: true,
    required: true,
    unique: true
  },

  // Password hash, password must be set using the password virtual field.
  hashedPassword: {
    type: String
  },
  // Salt of the password
  salt: {
    type: String
  },


  // #### Additional user data.
  // Name of the user.
  name: {
    type: String,
    trim: true
  },
  // Surname of the user.
  surname: {
    type: String,
    trim: true
  },
  // Birthday
  birthday: {
    type: Date
  },
  // Image
  image: {
    type: String,
    trim: true
  },

  accounts: {
    type: [Account],
    'default': []
  },


  // ### Status
  //
  // Current status of the User.
  // The status changes how the User behave to some events/requests.
  status: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
    'enum': [
      // The User has been created.
      'CREATED',
    ],
    'default': 'CREATED'
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
  autoIndex: process.env.PRODUCTION? false : true
} );











// ## Plugins to add to the User model.
//
// Add the `metadata` fileld to the entity.
UserSchema.plugin( require( './plugins/metadataPlugin' ) );







// # User virtual fields
//
// ## Password setter
UserSchema.virtual( 'password' ).set( function( password ) {
  this.salt = this.makeSalt();
  this.hashedPassword = this.encryptPassword( password );
} );





// ## User calculated fields
//
// Boolean indicating if the User is created.
UserSchema.virtual( 'created' ).get( function() {
  return this.status==='CREATED';
} );








// # User instance methods
//
// ## Password related methods
// Methods to create and validate password
UserSchema.methods.encryptPassword = function( password ) {
  return crypto.createHmac( 'sha1', this.salt ).update(password).digest('hex');
};
UserSchema.methods.makeSalt = function() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
};
UserSchema.methods.validPass = function( pass ) {
  return this.encryptPassword( pass )===this.hashedPassword;
};

// ## Events
//
// Shortcut for triggering events using the given data as payload.
UserSchema.methods.fire = function( event, data, callback ) {
  throw new Error( 'Not implemented' );
  /*
  if( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }
  return CRM.trigger( event, _.defaults( {
    user: this._id
  }, data ), callback );
  */
};

// ## Account methods
//
// Add an account
UserSchema.methods.addAccount = function( accountName, data ){
  log.trace( 'Adding %s account for %s', accountName, this._id );

  // Create the `Account` entity
  var Account = this.model( 'account' );
  var account = new Account( data );

  // Fix some fields.
  account.uid = data.id;
  account.image = data.photos? data.photos[0].value : null;
  account.provider = accountName;

  this.accounts.push( account );
  return;
};


// # User model methods
//
// Retrieve user by username
UserSchema.statics.findByUsername = function( username, callback ) {
  log.trace( 'Searching for %s in users', username );

  this
  .findOne()
  .where( 'username', username )
  .exec( function( err, user ) {
    if( err ) return callback( err );

    if( !user )
      return callback( new MongoError( 'No user retrieved' ) );

    return callback( null, user );
  } );
};

// Get a user by Account information.
UserSchema.statics.findByAccountId = function( accountName, accountId, callback ){
  log.trace('Searching for a user with account %s (%s)', accountId, accountName );

  this
  .findOne()
  .where( 'accounts.provider', accountName )
  .where( 'accounts.uid', accountId )
  .exec( function( err, user ) {
    if( err ) return callback( err );

    /*
    if( !user )
      return callback( new MongoError( 'No user retrieved' ) );
    */

    return callback( null, user );
  } );
};

// Creates a user based un Account data.
UserSchema.statics.createWithAccount = function( accountName, data ){
  log.trace( 'Creating a new user for %s', accountName );

  var User = this;
  var user = new User( data );

  // Fix some parametes
  user.email = data.emails? data.emails[0].value : null;
  user.username = data.username || user.email;

  // Adding account to the user.
  user.addAccount( accountName, data );

  // Return the user.
  return user;
};

exports = module.exports = UserSchema;


/*

// aLoad libraries
var mongo = require('mongoose');
var crypto = require('crypto');
var log = CS.log.child( { component: 'User model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;



// Import models
var AccountSchema = require( './account' );

// Import plugins
var metadataPlugin = require( './plugins/metadata' );


// User schema
var UserSchema = new Schema( {

  // Username
  username: {
    type: String,
    index: true
  },

  // Password hash, password must be set using the password virtual field.
  hashedPassword: {
    type: String
  },
  // salt of the password
  salt: {
    type: String
  },

  // Name of the user, use fullname for better representation
  name: String,

  // Email
  email: {
    type: String,
    lowercase: true
  },
  // Birthday
  birthday: {
    type: Date
  },
  // Image
  image: String,

  // User connected accounts
  accounts: {
    type: [AccountSchema]
  },

  // Log related data
  _failedAttempts: {
    type: 'number',
    'default': 0
  },
  _lastAccess: {
    type: Date,
    'default': Date.now
  },


  creationDate: {
    type: Date,
    'default': Date.now
  }
} );

UserSchema.plugin( metadataPlugin );


// Methods to create and validate password
UserSchema.methods.encryptPassword = function( password ) {
  return crypto.createHmac( 'sha1', this.salt ).update(password).digest('hex');
};
UserSchema.methods.makeSalt = function() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
};
UserSchema.methods.validPass = function( pass ) {
  return this.encryptPassword( pass )===this.hashedPassword;
};

UserSchema.methods.addAccount = function( accountName, data ){

  log.trace( 'Adding an account', data );

  // Create the `Account` entity
  var Account = this.model( 'account' );
  var account = new Account( data );

  account.uid = data.id;
  account.image = data.photos? data.photos[0].value : null;
  account.provider = accountName;

  this.accounts.push( account );
};

// ## Virtual fields

// Password, present only as a setter
UserSchema
.virtual( 'password' )
.set( function( password ) {
  //this._password = password;
  this.salt = this.makeSalt();
  this.hashedPassword = this.encryptPassword( password );
});

// Display name
UserSchema
.virtual( 'displayName' )
.get( function() {
  return this.name;
} );

// Static methods

// Retrieve user by username
UserSchema.statics.findByUsername = function( username, callback ) {
  this
  .findOne( {
    username: username.toLowerCase()
  } )
  .exec( callback );
};

UserSchema.statics.findByAccountId = function( accountName, accountId, callback ){
  log.trace('Searching a user with account %s (%s)', accountId, accountName );

  this
  .findOne()
  .where( 'accounts.provider', accountName )
  .where( 'accounts.uid', accountId )
  .exec( callback );
};


UserSchema.statics.createWithAccount = function( accountName, data ){
  log.trace( 'Creating a new user with the account %s (%s)', data.id, accountName );

  log.trace( 'Creating the user', user );
  var User = this;
  var user = new User( data );

  user.email = data.emails? data.emails[0].value : null;
  user.username = data.username || user.email;
  user.name = user.displayName || data.displayName;

  // Adding account
  user.addAccount( accountName, data );
  return user;
};


exports = module.exports = UserSchema;
*/