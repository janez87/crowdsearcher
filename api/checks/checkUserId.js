

'use strict';
var _  = require('underscore');
var util  = require('util');
var CS = require( '../../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Check User ID' } );

// Import the User Model
var User = CS.models.user;

// Generate custom error `CheckUserIdError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckUserIdError = function( id, message, status ) {
  /* jshint camelcase: false */
  CheckUserIdError.super_.call( this, id, message, status );
};
util.inherits( CheckUserIdError, APIError );

CheckUserIdError.prototype.name = 'CheckUserIdError';
// Custom error IDs
CheckUserIdError.USER_NOT_FOUND = 'USER_NOT_FOUND';
CheckUserIdError.INVALID_USER_ID = 'INVALID_USER_ID';



// Export middleware
exports = module.exports = function checkUserId( req, res, next ) {

  // Get the id from the query string
  var id = req.query.user;

  // Check id
  if( _.isUndefined( id ) || (id.length===0) )
    return next( new CheckUserIdError( CheckUserIdError.INVALID_USER_ID, 'Empty User ID', APIError.BAD_REQUEST ) );

  log.trace( 'Checking if user %s exists', id );
  // Create a promise and save it to `req.queryObject`
  req.queryObject = User.findById( id );

  return next();
  /*
  // Query the db for the User
  User.findById( id, req.wrap( function( err, user ) {
    if( err ) return next( err );

    if( !user )
      return next( new CheckUserIdError( CheckUserIdError.USER_NOT_FOUND, 'User not found', APIError.NOT_FOUND ) );

    log.trace( 'User %s ok', id );

    // Pass the retrieved User (cannot user `req.user` used by the login framework)
    req.apiUser = user;

    return next();
  } ) );
  */
};