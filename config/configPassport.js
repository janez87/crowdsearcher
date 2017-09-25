'use strict';
// Load system modules

// Load modules
var _ = require( 'lodash' );
var async = require( 'async' );
var passport = require( 'passport' );

// Load my modules
var CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function linkAccountToUser( req, token, tokenSecret, profile, done ) {
  var log = CS.log;
  var User = CS.models.user;

  profile.token = token;
  profile.tokenSecret = tokenSecret;

  log.trace( 'Connecting provider %s (%s)', profile.provider, profile.id );
  log.trace( 'Profile data for (%s): %j', profile.username, profile );


  // This function is called last to login as the specified user
  var login = function( err, user ) {
    if ( err ) return done( err );


    // Log in the current user
    req.login( user, function( err ) {
      // If the `from` information is already present or is undefined then exit.
      if ( user.hasMetadata( 'from' ) || _.isUndefined( req.session.from ) ) {
        return done( err, user );
      } else {
        // Add the `from` information to the user.
        user.setMetadata( 'from', req.session.from );
        delete req.session.from;
        return req.wrap( 'save', user )( done );
      }
    } );
  };


  // Check if the account and/or the user is present and create it
  var checkAccount = function( loggedUser ) {

    log.trace( 'User is logged? %s', req.isAuthenticated() );

    var findAccount = function( callback ) {
      User
      .findByAccountId(
        profile.provider,
        profile.id,
        req.wrap( function( err, userForAccount ) {
          if( err ) return callback( err );

          if( !userForAccount ) return callback();

          if( loggedUser && !userForAccount._id.equals( loggedUser._id ) ) {
            return callback( new Error( 'Account belongs to another user!' ) );
          }

          loggedUser = userForAccount;

          return callback();
        } )
      );
    };


    var createUser = function( callback ) {

      if ( !loggedUser ) {
        // User not present, create one from the account information
        log.trace( 'Creating user from account' );

        // Create the user
        loggedUser = User.createWithAccount( profile.provider, profile );

        // Save user
        return req.wrap( 'save', loggedUser )( callback );
      } else {
        // User present, go on.
        return callback();
      }
    };

    var addAccount = function( callback ) {

      // Find the account for the user
      log.trace( 'User: %s', loggedUser._id );

      var account = _.findWhere( loggedUser.accounts, {
        provider: String( profile.provider ),
        uid: String( profile.id )
      } );

      log.trace( 'Account found? %s', !!account );

      if( !account ) {
        // Account not found for the user, add one.
        loggedUser.addAccount( profile.provider, profile );

        // Save user
        return req.wrap( 'save', loggedUser )( callback );
      } else {
        // Account present go on.
        return callback();
      }
    };

    var actions = [
      findAccount,
      createUser,
      addAccount
    ];

    async.series( actions, function( err ) {
      if ( err ) return login( err );

      log.trace( 'Operations completed' );
      return login( null, loggedUser );
    } );
  };

  // Check if the user is presest or must be added/created
  return checkAccount( req.user );
}

function configPassport() {
  try {

    var log = CS.log;
    var User = CS.models.user;

    var LocalStrategy = require( 'passport-local' ).Strategy;

    passport.serializeUser( function( user, done ) {
      log.trace( 'Serializing %s (%s)', user.username, user._id );
      return done( null, user._id );
    } );
    passport.deserializeUser( function( id, done ) {
      log.trace( 'Deserializing (%s)', id );
      User
        .findById( id )
        .exec( function( err, user ) {
          if ( err ) return done( err );

          return done( null, user );
        } );
    } );

    // Local
    var localAuthUser = function( req, username, password, done ) {
      log.trace( 'Autenticating with local credentials user %s', username );
      User
        .findOne()
        .where( 'username', username )
        .exec( function( err, user ) {
          if ( err ) return done( err );

          if ( !user ) {
            return done( null, false, {
              message: 'User not found.'
            } );
          }

          if ( !user.validPass( password ) ) {
            return done( null, false, {
              message: 'Incorrect credentials.'
            } );
          }

          return done( null, user );
        } );
    };

    passport.use( new LocalStrategy( {
      passReqToCallback: true
    }, localAuthUser ) );

    var baseURL = this.get( 'webserver.externalAddress' );


    // Load social-logins based on configured strategies
    CS.social = {};
    var socialMap = this.get( 'social' );
    _.each( socialMap, function( config, name ) {
      var packageName = config[ 'package' ] || 'passport-' + name;
      var strategyConfig = config.strategyConfig || {};
      var strategyProperty = config.strategyName || 'Strategy';

      strategyConfig = _.defaults( {
        callbackURL: baseURL + 'connect/' + name + '/callback',
        passReqToCallback: true
      }, strategyConfig );

      var Strategy = require( packageName )[ strategyProperty ];
      passport.use( new Strategy( strategyConfig, linkAccountToUser ) );

      // Add the socual network to the CS.
      CS.social[ name ] = config;
    } );

    return Promise.resolve();
  } catch ( err ) {
    console.error( 'Passport configuration error', err );
    return Promise.reject( err );
  }
}

// Module class declaration

// Module initialization (at first load)

// Entry point

// URL to update the Access Token
// https://graph.facebook.com/oauth/access_token
//  ?client_id=APP_ID
//  &client_secret=APP_SECRET
//  &grant_type=fb_exchange_token
//  &fb_exchange_token=OLD_TOKEN


// https://developers.facebook.com/docs/howtos/login/debugging-access-tokens/



// Export configuration function
exports = module.exports = configPassport;
