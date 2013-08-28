

// aLoad libraries
var mongo = require('mongoose');
var crypto = require('crypto');
var log = common.log.child( { component: 'User model' } );

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
    type: 'string',
    index: true
  },

  // Password hash, password must be set using the password virtual field.
  hashedPassword: {
    type: 'string',
    select: false
  },
  // salt of the password
  salt: {
    type: 'string',
    select: false
  },

  // Name of the user, use fullname for better representation
  name: 'string',

  // Email
  email: {
    type: 'string',
    lowercase: true,
    select: false
  },
  // Birthday
  birthday: {
    type: 'date',
    select: false
  },
  // Image
  image: 'string',

  // User connected accounts
  accounts: {
    type: [AccountSchema],
    select: false
  },

  // Log related data
  _failedAttempts: {
    type: 'number',
    'default': 0
  },
  _lastAccess: {
    type: 'date',
    'default': Date.now
  },


  creationDate: {
    type: 'date',
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

  log.trace('Adding an account');

  var Account = this.model( 'account' );
  var account = new Account();

  account.uid = data.id;
  account.image = data.photos? data.photos[0].value : null;
  account.provider = accountName;
  account.token = data.token;
  account.secretToken = data.secretToken;
  account.email = data.email;

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
UserSchema.statics.findByUsername = function( username, cb ) {
  this
  .findOne( {
    username: username.toLowerCase()
  })
  .exec( cb );
};

UserSchema.statics.findByAccountId = function(accountName,accountId,callback){

  log.trace('Searching a user with account %s (%s)', accountId, accountName );

  this
  .findOne()
  .where('accounts.provider', accountName )
  .where('accounts.uid', accountId )
  .exec(callback);

};


UserSchema.statics.createWithAccount = function(accountName,data,callback){
  log.trace('Creating a new user with the account %s (%s)',data.id,accountName);

  var User = this;
  var user = new User(data);

  user.email = data.emails? data.emails[0].value : null;
  user.username = user.email || data.username;

  log.trace('Creating the user');
  user.addAccount( accountName, data );
  log.trace('Added Account');
  log.trace('Save User');
  user.save( callback );
};


exports = module.exports = UserSchema;