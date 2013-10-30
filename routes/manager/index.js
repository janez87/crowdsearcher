// Load libraries.
var nconf = require( 'nconf' );
var _ = require( 'underscore' );
var mongo = require( 'mongoose' );
var querystring = require( 'querystring' );
var request = require( 'request' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( { component: 'Manger route' } );


// Create a general requester
var baseUrl = nconf.get( 'webserver:externalAddress' );
baseUrl += 'api/';
var r = request.defaults( {
  json: true,
} );

// Mongoose Classes and Objects
//var MongoError = mongo.MongoError;


// # Manger route handler
//

// Render the `manage` home page.
exports.index = function( req, res ) {
  res.render( 'manage/index' );
};


// ## Job apis
//
exports.jobs = function( req, res, next ) {
  r( baseUrl+'jobs', function ( err, resp, json ) {
    if( err ) return next( err );

    res.render( 'manage/jobs', {
      title: 'Job list',
      jobs: json || []
    } );
  } );
};

exports.job = function( req, res, next ) {
  r( baseUrl+'job/?job='+req.params.id, function ( err, resp, job ) {
    if( err ) return next( err );

    r( baseUrl+'tasks/?job='+req.params.id, function ( err, resp, tasks ) {
      if( err ) return next( err );

      res.render( 'manage/job', {
        title: job.name,
        job: job || [],
        tasks: tasks || []
      } );
    });
  } );
};

exports.newJob = function( req, res, next ) {
  r( baseUrl+'configuration/taskAssignment', function ( err, resp, strategies ) {
    if( err ) return next( err );

    res.render( 'manage/newJob', {
      title: 'Create Job',
      taskAssignmentStrategies: strategies
    } );
  } );
};
exports.postJob = function( req, res, next ) {
  r( {
    url: baseUrl+'job',
    method: 'POST',
    encoding: 'utf8',
    json: req.body
  }, function ( err, resp, job ) {
    if( err ) return next( err );

    res.json( job );
  } );
};


// ## Task handlers
//
exports.newTask = function( req, res, next ) {
  r( baseUrl+'configuration', function ( err, resp, config ) {
    if( err ) return next( err );

    res.render( 'manage/newTask', {
      title: 'Create Task',
      config: config
    } );
  } );
};
exports.postTask = function( req, res, next ) {
  r( {
    url: baseUrl+'job',
    method: 'POST',
    encoding: 'utf8',
    json: req.body
  }, function ( err, resp, task ) {
    if( err ) return next( err );

    res.json( task );
  } );
};

exports.task = function( req, res, next ) {
  r( baseUrl+'task/?populate=microtasks&populate=objects&populate=platforms&populate=operations&task='+req.params.id, function ( err, resp, task ) {
    if( err ) return next( err );

    res.render( 'manage/task', {
      title: task.name,
      task: task
    });
  } );
};

// ## Microtask handlers
//
exports.microtask = function( req, res, next ) {
  r( baseUrl+'microtask/?populate=objects&populate=platforms&populate=operations&microtask='+req.params.id, function ( err, resp, microtask ) {
    if( err ) return next( err );

    res.render( 'manage/microtask', {
      title: 'Microtask '+microtask._id,
      microtask: microtask
    });
  } );
};



// ## Object handlers
//
exports.object = function( req, res, next ) {
  r( baseUrl+'object/?object='+req.params.id, function ( err, resp, object ) {
    if( err ) return next( err );

    res.render( 'manage/object', {
      title: 'Object '+object._id,
      object: object
    });
  } );
};


// ## Answers handler
//
exports.answers = function( req, res, next ) {
  var qs = querystring.stringify( _.defaults( {
    populate: [ 'platform', 'performer' ]
  }, req.query ) );
  r( baseUrl+'answer?'+qs, function ( err, resp, answers ) {
    if( err ) return next( err );

    res.render( 'manage/answers', {
      title: 'Answers',
      answers: answers
    });
  } );
};