// Load libraries.
var nconf = require( 'nconf' );
var mongo = require( 'mongoose' );
var request = require( 'request' );


// Create a child logger
var log = common.log.child( { component: 'Manger route' } );


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
  r( baseUrl+'configuration?taskAssignmentStrategies=true', function ( err, resp, conf ) {
    if( err ) return next( err );

    res.render( 'manage/newJob', {
      title: 'Create job',
      taskAssignmentStrategies: conf
    } );
  } );
};


// ## Task handlers
//
exports.newTask = function( req, res, next ) {
  res.send( 'new Task' );
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