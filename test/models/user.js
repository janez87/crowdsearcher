

// aLoad libraries
var mongo = require('mongoose');
var crypto = require('crypto');
var _ = require('underscore');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;


var AccountSchema = require('./account');

// Import models
var Account = mongo.model('account');

// Import plugins
var metadataPlugin = require( '../plugins/metadata' );


// User schema
var UserSchema = new Schema( {

  // Username
  username: {
    type: 'string',
    index: true
  },

  // Password hash, password must be set using the password virtual field.
  hashedPassword: 'string',
  // salt of the password
  salt: 'string',

  // Name of the user, use fullname for better representation
  name: {
    first: 'string',
    last: 'string'
  },

  // Email
  email: {
    type: 'string',
    lowercase: true
  },
  // Birthday
  birthday: 'date',
  // Image
  image: 'string',

  // User connected accounts
  accounts: [AccountSchema],

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

UserSchema.methods.addAccount = function(accountName,data,callback){

  var _this = this;
  this.model('user').findByAccountId(accountName,data.id,function(err,retrievedUser){
    if(err) return callback(err);

    // A social account can be added  to only 1 user
    if(retrievedUser){
      return callback(new Error('Account already present'));
    }

    var account = new Account();

    account.uid = data.id;
    account.image = data.photos? data.data[0].value : null;
    account.provider = accountName;
    account.token = data.token;
    account.secretToken = data.secretToken;
    account.email = data.email;

    _this.accounts.push(account);

    _this.save(function(err,user){
      if(err) return callback(err);


      return callback(null,user);
    });
  });

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
  return this.fullname;
} )
.set( function( fullname ) {
  this.fullname = fullname;
} );

// Fullname
UserSchema
.virtual( 'fullname' )
.get( function() {
  var fullname = '';
  if (this.name) {
    fullname = this.name.last + ' ' + this.name.first;
  }
  return fullname;
} ).set( function( fullname ) {
  var parts = fullname.split(' ');
  this.name = {
    first: parts[0],
    last: parts.slice(1).join( ' ' )
  };
} );

// Static methods

// Retrive user by username
UserSchema.statics.findByUsername = function( username, cb ) {
  this
  .findOne( {
    username: username.toLowerCase()
  })
  .exec( cb );
};

UserSchema.statics.findByAccountId = function(accountName,accountId,callback){

  this
  .findOne({})
  .where('accounts').elemMatch(function(account){
    account.where('provider',accountName);
    account.where('uid',accountId);
  })
  .exec(callback);

};


UserSchema.statics.createWithAccount = function(accountName,data,callback){

  this.findByAccountId(accountName,data.id,function(err,retrievedUser){
    if(err) return callback(err);

     // A social account can be added  to only 1 user
    if(retrievedUser){
      return callback(new Error('Account already present'));
    }

    var User = mongo.model('user');

    var user = new User(data);
    user.email = data.email;
    user.username = data.email;

    user.addAccount(accountName,data,function(err,user){
      if(err) return callback(err);

      return callback(null,user);
    });
  });
};


exports = module.exports = UserSchema;