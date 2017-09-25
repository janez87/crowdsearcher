'use strict';
let Promise = require( 'bluebird' );

const _ = require( 'lodash' );
const url = require( 'url' );
const co = require( 'co' );
const debug = require( 'debug' )( 'Benchmark' );
const request = require( 'request' );


const r = Promise.promisifyAll( request.defaults( { json: true } ), { multiArgs: true } );



const TASK_ID = '56b20ab4561e83b295c867a0';
const PERFORMER_ID = '56a4a8e764a4675e74ec2574';

const taskUrl = `http://localhost:2100/api/run?task=${TASK_ID}&performer=${PERFORMER_ID}`;
const execUrl = 'http://localhost:2100/api/execution?execution=';
const mictotaskUrl = 'http://localhost:2100/api/microtask?&populate%5B%5D=objects&populate%5B%5D=platforms&populate%5B%5D=operations&microtask=';
const postUrl = 'http://localhost:2100/api/answer/';
const numExecs = 200;

const RESPOS = [
  'yes',
  'no',
  'offline',
];

let create = [];
let getE = [];
let getM = [];
let postA = [];


function createResponse( objects, operation ) {
  debugger;

  return _( objects )
  .map( o => ({
    object: o.id,
    operation: operation,
    response: _.sample( RESPOS ),
  }) )
  .value();
}
function postAnswer( execId, data ) {
  let start = Date.now();

  debugger;

  debug( 'start "postAnswer"' );
  return r
  .postAsync( {
    url: postUrl+execId,
    body: {
      data: data,
    }
  } )
  .tap( () => {
    let duration = Date.now()-start;
    debug( 'postAnswer took %d ms', duration );
    postA.push( duration );
  } );
}
function getMt( mt, execId ) {
  let start = Date.now();

  debug( 'start "getMt"' );
  return r
  .getAsync( mictotaskUrl+mt )
  .tap( () => {
    let duration = Date.now()-start;
    debug( 'getMt took %d ms', duration );
    getM.push( duration );
  } )
  .spread( (re, d) => d )
  .then( mtData => {
    debugger;
    return [ execId, createResponse( mtData.objects, mtData.operations[0].id ) ];
  })
  .spread( postAnswer );
}
function getExecution( e ) {
  let execId = url.parse( e.url, true ).query.execution;
  let start = Date.now();

  debug( 'start "getExecution"' );
  return r
  .getAsync( execUrl+execId )
  .tap( () => {
    let duration = Date.now()-start;
    debug( 'getExecution took %d ms', duration );
    getE.push( duration );
  } )
  .spread( (re, d) => d )
  .get( 'microtask' )
  .then( mt => [ mt, execId ] )
  .spread( getMt );
}
function createExec( n ) {
  let start = Date.now();

  if( n<0 ) return Promise.resolve();

  debug( 'start "createExec"' );
  return r
  .getAsync( taskUrl )
  .tap( () => {
    let duration = Date.now()-start;
    debug( 'createExec took %d ms', duration );
    create.push( duration );
  } )
  .spread( (re, d) => d )
  .then( getExecution )
  .then( () => createExec( n-1 ) );
}

co( function*() {
  debug( 'Ready' );

  // preprare calls
  let calls = _( new Array( numExecs ) )
  .map( () => _.random( 1, 5 ) )
  .value();

  yield Promise
  .map( calls, createExec, {
    concurrency: 50,
  } );

  // Calc means
  let data = {
    create: create,
    execution: getE,
    microtask: getM,
    answers: postA,
  };
  let stats = _( data )
  .mapValues( arr => ({
    min: _.min( arr ),
    max: _.max( arr ),
    mean: _.mean( arr ),
  }) )
  .value();

  debug( 'create: ', create );
  debug( 'getE: ', getE );
  debug( 'getM: ', getM );
  debug( 'postA: ', postA );
  debug( 'Data: ', data );
  debug( 'Stats: ', stats );

  debug( 'Done' );
} )
.catch( err => {
  debug( 'FUUUUUUU', err.stack );
} )