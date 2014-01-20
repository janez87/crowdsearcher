/* jshint camelcase: false */

// Load libraries
var nconf = require( 'nconf' );
var Twit = require( 'twit' );
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( {
  component: 'Facebook'
} );


function invite( task, platform, callback ) {
  var params = platform.params;

  // Task url
  var url = nconf.get( 'webserver:externalAddress' ) + nconf.get( 'api:urlPath' ) + '/landing?task=' + task._id;

  var message = 'I just posted a task on CrowdSearcher\n' + url;

  var twit = new Twit( {
    consumer_key: params.clientID,
    consumer_secret: params.clientSecret,
    access_token: params.token,
    access_token_secret: params.tokenSecret
  } );

  twit.post( 'statuses/update', {
    status: message,
    includes_entities: true
  }, function( err ) {
    if ( err ) return callback( err );

    log.trace( 'Message posted on twitter' );
    return callback();
  } );
}

var Platform = {
  name: 'Twitter',
  description: 'Tweet on your timeline.',
  image: null,

  invite: invite,
  params: {
    clientID: {
      type: 'string',
      'default': ''
    },
    clientSecret: {
      type: 'string',
      'default': ''
    },
    token: {
      type: 'string',
      'default': ''
    },
    tokenSecret: {
      type: 'string',
      'default': ''
    }
  }
};

module.exports = exports = Platform;