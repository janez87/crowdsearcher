/* jshint camelcase: false */

// Load libraries
var nconf = require( 'nconf' );
var Twit = require( 'twit' );
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( {
  component: 'Facebook'
} );

var request = require( 'request' );


function invite( params, task, data, callback ) {
  // Task url
  var url = nconf.get( 'webserver:externalAddress' ) + nconf.get( 'api:urlPath' ) + '/landing?task=' + task._id;

  var twit = new Twit( {
    consumer_key: params.consumerKey,
    consumer_secret: params.consumerSecret,
    access_token: params.token,
    access_token_secret: params.tokenSecret
  } );


  // Generate short url
  request( {
    url: 'http://is.gd/create.php',
    json: true,
    qs: {
      format: 'json',
      url: url
    }
  }, function( err, res, body ) {
    if ( err ) log.warn( err );

    url = body.shorturl || url;

    // Make configurable
    var message = 'I just posted a task on CrowdSearcher\n' + url;

    twit.post( 'statuses/update', {
      status: message,
      includes_entities: true
    }, function( err ) {
      if ( err ) return callback( err );

      log.trace( 'Message posted on twitter' );
      return callback();
    } );

  } );

}

var Platform = {
  name: 'Twitter',
  description: 'Tweet on your timeline.',
  image: 'http://www.videocv.org/wp-content/uploads/2012/01/Twitter256x2561-256x256.png',

  invite: invite,
  hooks: {
    'OPEN_TASK': invite
  },
  params: {
    consumerKey: {
      type: 'password',
      'default': ''
    },
    consumerSecret: {
      type: 'password',
      'default': ''
    },
    token: {
      type: 'password',
      'default': ''
    },
    tokenSecret: {
      type: 'password',
      'default': ''
    }
  }
};

module.exports = exports = Platform;