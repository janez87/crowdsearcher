// Load libraries
var nconf = require( 'nconf' );
var FB = require( 'fb' );
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( {
  component: 'Facebook'
} );


function invite( params, task, data, callback ) {

  // Task url
  var url = nconf.get( 'webserver:externalAddress' ) + nconf.get( 'api:urlPath' ) + '/landing?task=' + task._id;

  var message = 'I just posted a task on CrowdSearcher';

  FB.api( 'me/feed', 'post', {
    name: task.name,
    caption: 'CrowdSearcher Application',
    description: message,

    picture: 'http://upload.wikimedia.org/wikipedia/it/b/be/Logo_Politecnico_Milano.png',

    link: url,

    actions: [ {
      name: 'Execute',
      link: url
    } ],
    access_token: params.token
  }, function( res ) {
    if ( res.error )
      return callback( new Error( res.error.message || res.error.code ) );

    log.trace( 'Invite sent' );

    return callback();
  } );
}

var Platform = {
  name: 'facebook',
  description: 'Post on your wall an invitation to the task.',
  image: 'http://www.africawildtruck.com/upload/in_evidenza/facebook-icon.png',
  invite: invite,
  hooks: {
    'OPEN_TASK': invite
  },

  params: {
    //clientID: 'string',
    //clientSecret: 'string',
    token: {
      type: 'string',
      'default': ''
    }
  }
};

module.exports = exports = Platform;