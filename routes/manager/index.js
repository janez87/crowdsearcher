'use strict';
// Load system modules
let url = require( 'url' );
let querystring = require( 'querystring' );

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
let mongo = require( 'mongoose' );
let request = require( 'request' );

// Load my modules
let CS = require( '../../core' );

// Constant declaration
const CONFIG = CS.config;
const pageMap = {
  'object_declaration': 'Objects',
  'task_type': 'Task',
  'gt_declaration': 'Ground Truth',
  'add_operations': 'Add operations',
  'invitation': 'Invitation',
  'execution': 'Execution',
  'adaptation': 'Adaptation',
  'review': 'Review'
};
const pageList = [
  'task_type',
  'object_declaration',
  //'gt_declaration',
  //'add_operations',
  'execution',
  'invitation',
  'adaptation',
  'review'
];


// Module variables declaration
let ObjectId = mongo.Types.ObjectId;
let log = CS.log.child( {
  component: 'Manger route'
} );
let r = Promise.promisifyAll( request.defaults( {
  json: true,
  strictSSL: false
} ), { multiArgs: true } );


// Module functions declaration
function baseUrl() {
  let csBaseUrl = url.format( {
    protocol: 'http',
    hostname: 'localhost',
    port: CONFIG.port,
    pathname: '/api/'
  } );
  return csBaseUrl;
}
function getEntities( collection, filter, limit ) {
  limit = limit || 20;

  return collection
  .find( filter )
  .limit( limit )
  .toArray();
}
function getEntitiesStats( collection, filter ) {
  var pipeline = [];

  pipeline.push( {
    $match: filter,
  } );
  pipeline.push( {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
    }
  } );

  return collection
  .aggregate( pipeline, {
    allowDiskUse: true,
  } )
  .toArray()
  .then( result => {

    var data = _( result )
    .keyBy( '_id' )
    .mapValues( 'count' )
    .value();

    var total = _( data ).map().sum();

    return {
      open: data.CREATED,
      closed: total-data.CREATED,
      total: total,
      data: data,
    };
  } );
}
function getMicrotasks( filter, limit ) {
  limit = limit || 20;
  var Microtask = CS.models.microtask;
  log.trace( 'Get %d microtasks for %s', limit, filter );

  return getEntities( Microtask.collection, filter, limit );
}
function getObjects( filter, limit ) {
  limit = limit || 20;
  var Objects = CS.models.object;
  log.trace( 'Get %d objects for %s', limit, filter );

  return getEntities( Objects.collection, filter, limit );
}
function getMicrotasksStats( filter ) {
  log.trace( 'Get microtask stats for %s', filter );
  var Microtask = CS.models.microtask;
  return getEntitiesStats( Microtask.collection, filter );
}
function getObjectsStats( filter ) {
  log.trace( 'Get objects stats for %s', filter );
  var Objects = CS.models.object;
  return getEntitiesStats( Objects.collection, filter );
}
function getData( csUrl ) {
  return r.getAsync( csUrl )
  .spread( ( resp, data )=> data );
}

// Routes
function index( req, res ) {
  res.render( 'manage/index' );
}
function jobs( req, res, next ) {
  let csUrl = baseUrl() + 'jobs';
  log.trace( 'Requesting jobs to: %s', csUrl );

  return getData( csUrl )
  .then( jobList => {
    res.render( 'manage/jobs', {
      title: 'Job list',
      jobs: jobList || []
    } );
  } )
  .catch( next );
}
function job( req, res, next ) {
  let id = req.params.id;
  let jobUrl = baseUrl() + 'job/?job='+id;
  let tasksUrl = baseUrl() + 'tasks/?job='+id;

  return Promise
  .props( {
    job: getData( jobUrl ),
    tasks: getData( tasksUrl ),
  } )
  .then( data => {
    let dbJob = data.job;
    let tasks = data.tasks;
    res.render( 'manage/job', {
      title: dbJob.name,
      job: dbJob || {},
      tasks: tasks || []
    } );
  } )
  .catch( next );
}
function newJob( req, res, next ) {
  r( baseUrl() + 'configuration/taskAssignment', function( err, resp, strategies ) {
    if ( err ) return next( err );

    res.render( 'manage/newJob', {
      title: 'Create Job',
      assignments: strategies
    } );
  } );
}
function postJob( req, res, next ) {
  r( {
    url: baseUrl()+'job',
    method: 'POST',
    encoding: 'utf8',
    json: req.body
  }, function ( err, resp, job ) {
    if( err ) return next( err );

    res.json( job );
  } );
}
function newTask( req, res, next ) {
  r( baseUrl() + 'configuration', function( err, resp, config ) {
    if ( err ) return next( err );

    res.render( 'manage/newTask', {
      title: 'Create Task',
      config: config
    } );
  } );
}
function postTask( req, res, next ) {
  r( {
    url: baseUrl()+'task',
    method: 'POST',
    encoding: 'utf8',
    json: req.body
  }, function ( err, resp, task ) {
    if( err ) return next( err );

    res.json( task );
  } );
}
function task( req, res, next ) {
  let id = req.params.id;
  let taskUrl = baseUrl()+'task/?populate=platforms&populate=operations&task='+id;

  let filter = {
    task: ObjectId( id ),
  };

  let props = {
    task: getData( taskUrl ),
    // Get objects stats and sample
    objectsSample: getObjects( filter ),
    objectsStats: getObjectsStats( filter ),
    // Get microtasks stats and sample
    microtasksSample: getMicrotasks( filter ),
    microtasksStats: getMicrotasksStats( filter ),
  }

  Promise
  .props( props )
  .then( results => {
    res.render( 'manage/task', {
      title: results.task.name,
      task: results.task,
      objects: results.objectsSample,
      objectsStats: results.objectsStats,
      microtasks: results.microtasksSample,
      microtasksStats: results.microtasksStats,
    } );
  } )
  .catch( next );
}
function microtask( req, res, next ) {
  let id = req.params.id;
  let microtaskUrl = baseUrl()+'microtask/?populate=objects&populate=platforms&populate=operations&microtask='+id;

  return getData( microtaskUrl )
  .then( data => {
    res.render( 'manage/microtask', {
      title: 'Microtask '+data._id,
      microtask: data,
    } );
  } )
  .catch( next );
}
function object( req, res, next ) {
  let id = req.params.id;
  let objectUrl = baseUrl()+'object/?object='+id;

  return getData( objectUrl )
  .then( data => {
    res.render( 'manage/object', {
      title: 'Object '+data._id,
      object: data,
    } );
  } )
  .catch( next );
}
function answers( req, res, next ) {
  var qs = querystring.stringify( _.defaults( {
    populate: [ 'platform', 'performer', 'annotations.operation' ],
    limit: 50,
  }, req.query ) );

  let answerUrl = baseUrl()+'answer?'+qs;

  return getData( answerUrl )
  .then( data => {
    res.render( 'manage/answers', {
      title: 'Answers',
      answers: data
    } );
  } )
  .catch( next );
}
function dashboard( req, res, next ) {
  let id = req.params.id;
  let entity = req.params.entity;

  var dashboardUrl = baseUrl()+entity+'/'+id+'/stats?raw=true';

  return getData( dashboardUrl )
  .then( stats => {
    res.render( 'manage/dashboard', {
      title: 'Dashboard for '+id,
      stats: stats
    } );
  } )
  .catch( next );
}
function controlmart( req, res, next ) {
  let id = req.params.id;
  let entity = req.params.entity;

  var controlmartUrl = baseUrl()+entity+'/'+id+'/mart';

  return getData( controlmartUrl )
  .then( mart => {
    res.render( 'manage/mart', {
      title: 'Control Mart for '+id,
      mart: mart,
    } );
  } )
  .catch( next );
}
function flows( req, res, next ) {
  let id = req.params.id;

  res.render( 'manage/flows', {
    title: 'Task Flows for job '+id,
    jobId: req.params.id
  } );
}
// Wizard
function wizard( req, res, next ) {
  let page = req.params.page;

  if( !req.session.wizard ) {
    req.session.wizard = {};
  }


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
    nextPage = 'gt_declaration';
  }

  if ( page === 'gt_declaration' ) {
    prevPage = 'object_declaration';
    nextPage = 'invitation';
  }

  let configUrl = baseUrl()+'configuration';
  return getData( configUrl )
  .then( config => {
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
  } )
  .catch( next );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports.index = index;
module.exports.jobs = jobs;
module.exports.job = job;
module.exports.newJob = newJob;
// module.exports.postJob = postJob;
module.exports.newTask = newTask;
// module.exports.postTask = postTask;
module.exports.getEntities = getEntities;
module.exports.getMicrotasks = getMicrotasks;
module.exports.getObjects = getObjects;
module.exports.getEntitiesStats = getEntitiesStats;
module.exports.getMicrotasksStats = getMicrotasksStats;
module.exports.getObjectsStats = getObjectsStats;
module.exports.task = task;
module.exports.microtask = microtask;
module.exports.object = object;
module.exports.answers = answers;
module.exports.dashboard = dashboard;
module.exports.controlmart = controlmart;
module.exports.flows = flows;
module.exports.wizard = wizard;