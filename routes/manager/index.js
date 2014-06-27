// Load libraries.
var nconf = require( 'nconf' );
var _ = require( 'underscore' );
var mongo = require( 'mongoose' );
var querystring = require( 'querystring' );
var request = require( 'request' );
var CS = require( '../../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Manger route'
} );


// Create a general requester
var baseUrl = nconf.get( 'webserver:externalAddress' );
baseUrl += 'api/';
var r = request.defaults( {
  json: true,
  strictSSL: false
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
  r( baseUrl + 'jobs', function( err, resp, json ) {
    if ( err ) return next( err );

    res.render( 'manage/jobs', {
      title: 'Job list',
      jobs: json || []
    } );
  } );
};

exports.job = function( req, res, next ) {
  r( baseUrl + 'job/?job=' + req.params.id, function( err, resp, job ) {
    if ( err ) return next( err );

    r( baseUrl + 'tasks/?job=' + req.params.id, function( err, resp, tasks ) {
      if ( err ) return next( err );

      res.render( 'manage/job', {
        title: job.name,
        job: job || [],
        tasks: tasks || []
      } );
    } );
  } );
};

exports.newJob = function( req, res, next ) {
  r( baseUrl + 'configuration/taskAssignment', function( err, resp, strategies ) {
    if ( err ) return next( err );

    res.render( 'manage/newJob', {
      title: 'Create Job',
      assignments: strategies
    } );
  } );
};
/*
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
*/

// ## Task handlers
//
exports.newTask = function( req, res, next ) {
  r( baseUrl + 'configuration', function( err, resp, config ) {
    if ( err ) return next( err );

    res.render( 'manage/newTask', {
      title: 'Create Task',
      config: config
    } );
  } );
};
/*
exports.postTask = function( req, res, next ) {
  r( {
    url: baseUrl+'task',
    method: 'POST',
    encoding: 'utf8',
    json: req.body
  }, function ( err, resp, task ) {
    if( err ) return next( err );

    res.json( task );
  } );
};
*/

exports.task = function( req, res, next ) {
  r( baseUrl + 'task/?populate=microtasks&populate=objects&populate=platforms&populate=operations&task=' + req.params.id, function( err, resp, task ) {
    if ( err ) return next( err );

    res.render( 'manage/task', {
      title: task.name,
      task: task
    } );
  } );
};

// ## Microtask handlers
//
exports.microtask = function( req, res, next ) {
  r( baseUrl + 'microtask/?populate=objects&populate=platforms&populate=operations&microtask=' + req.params.id, function( err, resp, microtask ) {
    if ( err ) return next( err );

    res.render( 'manage/microtask', {
      title: 'Microtask ' + microtask._id,
      microtask: microtask
    } );
  } );
};



// ## Object handlers
//
exports.object = function( req, res, next ) {
  r( baseUrl + 'object/?object=' + req.params.id, function( err, resp, object ) {
    if ( err ) return next( err );

    res.render( 'manage/object', {
      title: 'Object ' + object._id,
      object: object
    } );
  } );
};


// ## Answers handler
//
exports.answers = function( req, res, next ) {
  var qs = querystring.stringify( _.defaults( {
    populate: [ 'platform', 'performer', 'annotations.operation' ],
  }, req.query ) );
  r( baseUrl + 'answer?' + qs, function( err, resp, answers ) {
    if ( err ) return next( err );

    res.render( 'manage/answers', {
      title: 'Answers',
      answers: answers
    } );
  } );
};

// # Dashboard handler
//
exports.dashboard = function( req, res, next ) {
  var url = baseUrl + req.params.entity + '/' + req.params.id + '/stats?raw=true';
  r( url, function( err, resp, stats ) {
    if ( err ) return next( err );

    res.render( 'manage/dashboard', {
      title: 'Dashboard for ' + req.params.id,
      stats: stats
    } );
  } );
};

// # Control Mart handler
//
exports.controlmart = function( req, res, next ) {
  var url = baseUrl + req.params.entity + '/' + req.params.id + '/mart';
  r( url, function( err, resp, mart ) {
    if ( err ) return next( err );

    res.render( 'manage/mart', {
      title: 'Control Mart for ' + req.params.id,
      mart: mart
    } );
  } );
};

// # Flows handler
//
exports.flows = function( req, res, next ) {
  res.render( 'manage/flows', {
    title: 'Task Flows for job ' + req.params.id,
    jobId: req.params.id
  } );
};




// # Wizard
//
var pageMap = {
  'object_declaration': 'Object declaration',
  'task_type': 'Task Type',
  'gt_declaration': 'GT Declaration',
  'add_operations': 'Add operations',
  'invitation': 'Invitation',
  'execution': 'Execution',
  'adaptation': 'Adaptation',
  'review': 'Review'
};
var pageList = [
  'object_declaration',
  'task_type',
  'gt_declaration',
  //'add_operations',
  'execution',
  'invitation',
  'adaptation',
  'review'
];

exports.wizard = function( req, res, next ) {
  var page = req.params.page;

  if ( !req.session.wizard )
    req.session.wizard = {};


  try {
    req.session.wizard[ req.body.name ] = JSON.parse( req.body.data );
  } catch ( e ) {
    req.session.wizard[ req.body.name ] = undefined;
  }


  var idx = _.indexOf( pageList, page );
  var nextPage = pageList[ idx + 1 ];
  var prevPage = pageList[ idx - 1 ];
  if ( page === 'add_operations' ) {
    prevPage = 'task_type';
    nextPage = 'execution';
  }


  r( baseUrl + 'configuration', function( err, resp, config ) {
    if ( err ) return next( err );

    var accounts = {};
    if ( req.user ) {
      var userAccounts = req.user.accounts;
      _.each( userAccounts, function( account ) {
        accounts[ account.provider ] = account;
      } );
    }

    res.render( 'manage/wizard/' + page, {
      title: pageMap[ page ],
      config: config,

      pageList: pageList,
      pageMap: pageMap,
      index: idx,
      nextPage: nextPage,
      prevPage: prevPage,

      status: req.session.wizard,
      accounts: accounts
    } );
  } );
};