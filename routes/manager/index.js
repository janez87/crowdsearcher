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
var MongoError = mongo.MongoError;


// Import mongoose models.
var Job = common.models.job;
var Task = common.models.task;
var Microtask = common.models.microtask;

// Render the `manage` home page.
exports.index = function( req, res ) {
  res.render( 'manage/index' );
};


// job apis
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
  res.send( 'new Job' );
};


// task apis
exports.newTask = function( req, res, next ) {
  res.send( 'new Task' );
};

exports.task = function( req, res, next ) {
  r( baseUrl+'task/?populate=microtasks&task='+req.params.id, function ( err, resp, task ) {
    if( err ) return next( err );

    res.render( 'manage/task', {
      title: task.name,
      task: task
    });
  } );
};