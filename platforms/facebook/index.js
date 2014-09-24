// Load libraries
var nconf = require( 'nconf' );
var async = require( 'async' );
var _ = require( 'underscore' );
var FB = require( 'fb' );
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( {
  component: 'Facebook'
} );

function execute( params, task, data, callback ) {
  log.trace( 'wat' );

  return callback();

}

function invite( params, task, data, callback ) {

  if ( !this.invitation ) {
    return callback();
  }

  // Task url
  var url = nconf.get( 'webserver:externalAddress' ) + nconf.get( 'api:urlPath' ) + '/landing?task=' + task._id;

  // Make customizable
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

function parseObject( data ) {
  var string = '';

  for ( var k in data ) {
    string += k + ': ';
    string += data[ k ] + '\n';
  }

  return string;
}

function onAddMicroTask( params, task, data, callback ) {
  log.trace( 'Add microtasks' );

  if ( !this.execution ) {
    return callback();
  }

  var createComment = function( postId, object, cb ) {
    log.trace( 'Creating the comment for the object %s on the post %s', object.id, postId );
    log.trace( '/' + postId + '/comments' );
    FB.api( '/' + postId + '/comments', 'post', {
      message: parseObject( object.data ),
      access_token: params.token
    }, function( res ) {
      if ( res.error ) return cb( new Error( JSON.stringify( res.error ) ) );

      log.trace( 'Comment posted' );
      return cb();
    } );
  };

  var createPost = function( microtask, cb ) {

    FB.api( 'me/feed', 'post', {
      name: task.name,
      caption: 'CrowdSearcher application',
      description: task.description,
      picture: 'http://upload.wikimedia.org/wikipedia/it/b/be/Logo_Politecnico_Milano.png',
      access_token: params.token
    }, function( res ) {
      if ( res.error ) return cb( new Error( JSON.stringify( res.error ) ) );

      var postId = res.id;

      async.eachSeries( microtask.objects, _.partial( createComment, postId ), function( err ) {
        if ( err ) return cb( err );

        log.trace( 'Post successfully created' );
        microtask.setMetadata( 'postId', postId );
        return microtask.save( cb );
      } );
    } );
  };

  var performAction = function( microtask, cb ) {
    return microtask
      .populate( 'objects', function( err, microtask ) {
        if ( err ) return cb( err );

        return createPost( microtask, cb );
      } );

  };
  var microtasks = data.microtasks;

  return async.each( microtasks, performAction, callback );
}


var Platform = {
  name: 'facebook',
  description: 'Post on your wall an invitation to the task.',
  image: 'http://www.africawildtruck.com/upload/in_evidenza/facebook-icon.png',
  invite: invite,
  execute: execute,
  hooks: {
    'OPEN_TASK': invite,
    'ADD_MICROTASKS': onAddMicroTask
  },

  params: {
    //clientID: 'string',
    //clientSecret: 'string',
    token: {
      type: 'password',
      'default': ''
    }
  }
};

module.exports = exports = Platform;