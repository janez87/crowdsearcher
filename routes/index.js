// Load libraries
var nconf = require( 'nconf' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Index Routes' } );

// Load mongo Models
var UserSchema = CS.models.user;


// Render the home page.
exports.index = function( req, res ) {
  res.render( 'index' );
};


// Authorization routes
// ---
// Check if the user is logged
exports.checkAuth = function( req, res, next ) {
  log.trace( 'Checking if user is authenticated' );
  if( !req.isAuthenticated() ) {
    var baseURL = nconf.get( 'webserver:externalAddress' );

    req.session.destination = req.originalUrl.slice(1);

    return res.redirect( baseURL+'login' );
  } else {
    return next();
  }
};
// Handler for registering a new user
exports.postRegister = function( req, res, next ) {
  var rawUser = req.body;

  // Create the Mongoose document
  log.trace( 'Registering new user %s', rawUser.username );
  var user = new UserSchema( rawUser );

  // Check if the `from` field is present in session
  if( req.session.from ) {
    // add the `from` information to the user.
    user.setMetadata( 'from', req.session.from );
    delete req.session.from;
  }

  // Save user
  log.trace( 'Saving user information' );
  req.wrap( 'save', user )( function( err, user ) {
    if( err) return next( err );

    log.trace( 'User saved, login' );
    req.login( user, next );
  } );
};
exports.register = function( req, res ) {
  res.render( 'register' );
};
exports.login = function( req, res ) {
  // save into the session the destination Url
  req.session.destination = req.query.continueTo || req.session.destination;
  req.session.from = req.query.from || req.session.from;

  var errors = req.flash( 'error' );

  res.render( 'login', {
    errors: errors,
    socialMap: CS.social
  } );
};
exports.logout = function( req, res ) {
  req.logout();
  var baseURL = nconf.get( 'webserver:externalAddress' );
  res.redirect( baseURL );
};
