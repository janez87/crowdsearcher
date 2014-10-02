// Load libraries
var nconf = require( 'nconf' );
var async = require( 'async' );
var _ = require( 'underscore' );
var schedule = require( 'node-schedule' );
var FB = require( 'fb' );
var CS = require( '../../core' );
var Microtask = CS.models.microtask;
var ControlMart = CS.models.controlmart;
var Execution = CS.models.execution;

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
    string += data[ k ] + '\n';
  }

  return string;
}

function retrieveAnswers( microtask, platform ) {
  log.trace( 'Retrieving the answers for the microtask %s', microtask._id );
  FB.setAccessToken( platform.params.token );

  Microtask
    .findById( microtask._id )
    .populate( 'objects operations' )
    .exec( function( err, microtask ) {
      if ( err ) {
        return log.error( err );
      }

      var createCommentAnnotation = function( object, callback ) {
        log.trace( 'Retrieving comments' );

        var postId = object.getMetadata( 'postId' );

        FB
          .api( '/' + postId + '/comments', 'get', function( res ) {
            if ( res.error ) return callback( res.error );

            log.trace( 'Comments: %s', JSON.stringify( res.data ) );

            if ( _.isUndefined( res.data ) || res.data.length === 0 ) {
              log.trace( 'No comments' );
              return callback();
            }

            var tuple = {
              object: object._id,
              microtask: microtask._id,
              task: microtask.task,
              platform: platform._id,
              operation: microtask.operations[ 0 ]._id,
              name: 'fb_comments',
            };

            log.trace( '%j', tuple );

            ControlMart
              .findOne( tuple )
              .exec( function( err, mart ) {
                if ( err ) return callback( err );

                var oldComments = mart.data;

                var createExecution = function( comment, othercallback ) {

                  var rawExecution = {
                    task: microtask.task,
                    //job: task.job,
                    microtask: microtask._id,
                    operations: microtask.operations,
                    platform: platform._id,
                    annotations: []
                  };

                  rawExecution.annotations.push( {
                    object: object._id,
                    response: comment.message,
                    operation: microtask.operations[ 0 ]._id
                  } );

                  var execution = new Execution( rawExecution );

                  execution.setMetadata( 'commentId', comment.id );

                  return execution.save( function( err, execution ) {
                    if ( err ) return othercallback( err );

                    log.trace( 'Execution created' );
                    return execution.close( othercallback );
                  } );
                };

                var saveComment = function( comment, cb ) {
                  log.trace( 'Saving the comment' );

                  if ( oldComments.indexOf( comment.id ) !== -1 ) {
                    log.trace( 'Coment %s already saved', comment.id );
                    return cb();
                  }

                  return createExecution( comment, function( err ) {
                    if ( err ) return cb( err );

                    log.trace( 'Saving the comment %s in the mart', comment.id );
                    mart.data.push( comment.id );
                    mart.markModified( 'data' );
                    return mart.save( cb );
                  } );

                };

                return async.eachSeries( res.data, saveComment, callback );
              } );
          } );
      };


      var createLike = function( object, callback ) {
        log.trace( 'Retrieving likes' );

        var tuple = {
          task: microtask.task,
          object: object._id,
          name: 'fb_like',
          platform: platform._id,
        };

        var commentId = object.getMetadata( 'commentId' );

        ControlMart
          .findOne( tuple )
          .exec( function( err, mart ) {
            if ( err ) {
              log.error( err );
              return callback( err );
            }

            log.trace( '/' + commentId );
            var oldLike = mart.data;

            log.trace( 'Old likes: %s', oldLike );
            FB
              .api( '/' + commentId, function( res ) {
                if ( res.error ) {
                  log.error( JSON.stringify( res.error ) );
                  return callback( res.error );
                }

                var newLike = res.like_count;

                log.trace( 'Find %s likes', newLike );
                if ( newLike <= oldLike ) {
                  log.trace( 'No new like' );
                  return callback();
                }

                var delta = newLike - oldLike;

                log.trace( '%s new like', delta );


                var createExecution = function( cb ) {

                  log.trace( 'delta %s', delta );
                  delta = delta - 1;
                  log.trace( 'delta %s', delta );

                  var rawExecution = {
                    task: microtask.task,
                    //job: task.job,
                    microtask: microtask._id,
                    operations: microtask.operations,
                    platform: platform,
                    annotations: []
                  };

                  var annotation = {
                    object: object._id,
                    operation: microtask.operations[ 0 ]
                  };

                  rawExecution.annotations.push( annotation );
                  var execution = new Execution( rawExecution );

                  return execution.save( function( err, execution ) {
                    if ( err ) {
                      log.error( err );
                      return cb( err );
                    }

                    log.trace( 'Execution saved' );
                    return execution.close( cb );
                  } );


                };

                return async.whilst( function() {

                  if ( delta === 0 ) {
                    log.trace( 'Enough iteration for today' );
                  }

                  return delta !== 0;
                }, createExecution, function( err ) {
                  if ( err ) return callback( err );

                  log.trace( 'Execution created and closed' );
                  mart.data += ( newLike - oldLike );
                  return mart.save( callback );
                } );
              } );
          } );
      };


      var getAnswers = function( object, cb ) {

        if ( microtask.operations[ 0 ].name === 'like' ) {

          return createLike( object, cb );
        } else if ( microtask.operations[ 0 ].name === 'comment' ) {

          return createCommentAnnotation( object, cb );
        }
      };

      log.trace( 'Starting to do things' );
      return async.eachSeries( microtask.objects, getAnswers, function( err ) {
        if ( err ) return log.error( err );

        return log.trace( 'Answers retrieved' );
      } );

    } );
}

function onAddMicroTask( params, task, data, callback ) {
  log.trace( 'Add microtasks ' );

  if ( !this.execution ) {
    return callback();
  }

  var _this = this;
  var createMart = function( object, cb ) {

    var tuple = {
      task: task._id,
      object: object._id,
      name: 'fb_like',
      platform: _this._id,
      data: 0
    };

    return ControlMart.collection.insert( tuple, cb );
  };


  var createComment = function( postId, object, cb ) {
    log.trace( 'Creating the comment for the object %s on the post %s ', object.id, postId );
    FB.api( '/' + postId + '/comments', 'post', {
      message: parseObject( object.data ),
      can_comment: true,
      access_token: params.token
    }, function( res ) {
      if ( res.error ) return cb( new Error( JSON.stringify( res.error ) ) );

      log.trace( 'Comment posted %s', res.id );
      object.setMetadata( 'commentId', res.id );

      return object.save( function( err ) {
        if ( err ) return callback( err );

        return createMart( object, cb );
      } );
    } );
  };

  var createLikePost = function( microtask, cb ) {

    FB.api( 'me/feed', 'post', {
        name: task.name,
        caption: 'CrowdSearcher application',
        description: task.description,
        picture: 'http://upload.wikimedia.org/wikipedia/it/b/be/Logo_Politecnico_Milano.png',
        access_token: params.token
      },
      function( res ) {
        if ( res.error ) return cb( new Error( JSON.stringify( res.error ) ) );

        var postId = res.id;

        async.eachSeries( microtask.objects, _.partial( createComment, postId ), function( err ) {
          if ( err ) return cb( err );

          log.trace( 'Post successfully created' );
          microtask.setMetadata( 'postId', postId );
          return microtask.save( function( err, microtask ) {
            if ( err ) return cb( err );

            log.trace( 'Starting the job for the microtask %s', microtask._id );
            return CS.startJob( _this, microtask, callback );
          } );
        } );
      } );
  };

  var createCommentPost = function( microtask, cb ) {

    var startJob = function( microtask, cb ) {

      log.trace( 'Starting the job for the task %s', microtask._id );
      return CS.startJob( _this, microtask, cb );

    };


    var createPost = function( object, cb ) {

      var rawPost = {
        name: task.description,
        caption: 'CrowdSearcher application',
        description: parseObject( object.data ),
        picture: 'http://upload.wikimedia.org/wikipedia/it/b/be/Logo_Politecnico_Milano.png',
        access_token: params.token
      };

      FB
        .api( 'me/feed', 'post', rawPost, function( res ) {
          if ( res.error ) return cb( new Error( JSON.stringify( res.error ) ) );

          var postId = res.id;

          object.setMetadata( 'postId', postId );

          return object.save( function( err, object ) {
            if ( err ) return cb( err );

            var tuple = {
              object: object._id,
              microtask: microtask._id,
              task: task._id,
              platform: _this._id,
              operation: microtask.operations[ 0 ]._id,
              name: 'fb_comments',
              data: []
            };

            return ControlMart.collection.insert( tuple, cb );
          } );
        } );
    };


    return async.eachSeries( microtask.objects, createPost, function( err ) {
      if ( err ) return cb( err );

      return startJob( microtask, cb );
    } );
  };

  var performAction = function( microtask, cb ) {
    return microtask
      .populate( 'objects operations', function( err, microtask ) {
        if ( err ) return cb( err );

        if ( microtask.operations[ 0 ].name === 'like' ) {
          return createLikePost( microtask, cb );
        } else if ( microtask.operations[ 0 ].name === 'comment' ) {
          return createCommentPost( microtask, cb );
        }
      } );

  };
  var microtasks = data.microtasks;

  return async.each( microtasks, performAction, callback );
}

var onCloseMicrotask = function( params, task, data, callback ) {

  log.trace( 'Stopping the job for the microtask %s', data.microtask._id );

  return CS.endJob( data.microtask, callback );
};

var Platform = {
  name: 'facebook',
  description: 'Post on your wall an invitation to the task.',
  image: 'http://www.africawildtruck.com/upload/in_evidenza/facebook-icon.png',
  invite: invite,
  execute: execute,
  hooks: {
    'OPEN_TASK': invite,
    'ADD_MICROTASKS': onAddMicroTask,
    'END_MICROTASK': onCloseMicrotask
  },
  timed: {
    expression: '* * * * *',
    onTick: retrieveAnswers
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