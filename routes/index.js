'use strict';
// Load system modules

// Load modules

// Load my modules
let CS = require( '../core' );

// Constant declaration
let CONFIG = CS.config;

// Module variables declaration
let log = CS.log.child( {
  component: 'Index Routes'
} );
let UserSchema = CS.models.user;

// Module functions declaration
function index( req, res ) {
  res.render( 'index' );
}

function checkAuth( req, res, next ) {
  log.trace( 'Checking if user is authenticated' );
  if ( !req.isAuthenticated() ) {
    log.trace( 'User is NOT authenticated' );
    let baseURL = CONFIG.get( 'webserver.externalAddress' );

    req.session.destination = req.originalUrl.slice( 1 );

    return res.redirect( baseURL + 'login' );
  } else {
    log.trace( 'IS authenticated' );
    return next();
  }
}
// Handler for registering a new user
function postRegister( req, res, next ) {
  let rawUser = req.body;

  // Create the Mongoose document
  log.trace( 'Registering new user %s', rawUser.username );

  let user = new UserSchema( rawUser );

  // Check if the `from` field is present in session
  if ( req.session.from ) {
    // add the `from` information to the user.
    user.setMetadata( 'from', req.session.from );
    delete req.session.from;
  }

  // Save user
  log.trace( 'Saving user information' );
  req.wrap( 'save', user )( function( err, savedUser ) {
    if ( err ) return next( err );

    log.trace( 'User saved, login' );
    req.login( savedUser, next );
  } );
}

function register( req, res ) {
  res.render( 'register' );
}

function login( req, res ) {
  // save into the session the destination Url
  req.session.destination = req.query.continueTo || req.session.destination;
  req.session.from = req.query.from || req.session.from;

  log.trace( 'Destination: %s', req.session.destination );
  log.trace( 'From: %s', req.session.from );
  //log.trace( req, 'Request' );

  let errors = req.flash( 'error' );

  res.render( 'login', {
    errors: errors,
    socialMap: CS.social
  } );
}

function logout( req, res ) {
  req.logout();
  let baseURL = CONFIG.get( 'webserver.externalAddress' );
  res.redirect( baseURL );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports.index = index;
module.exports.checkAuth = checkAuth;
module.exports.postRegister = postRegister;
module.exports.register = register;
module.exports.login = login;
module.exports.logout = logout;