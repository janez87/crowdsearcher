
'use strict';
var request = require( 'request' );
var domain = require('domain');
let _ = require( 'lodash' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Notify rule' } );


// Import CS models
var Execution = CS.models.execution;

var performRule = function( event, config, task, data, callback ) {
  var d = domain.create();
  d.on( 'error', callback );

  var method = config.method;
  var url = config.url;
  var executionId = data.execution;

  Execution
  .findById( executionId )
  .populate( 'annotations.object' )
  .exec( d.bind( function( err, execution ) {
    if( err ) return callback( err );

    if( !execution )
      return callback( new Error( 'Execution not found' ) );

    return request( {
      method: method,
      url: url,
      json: execution.toObject( { getters: true } )
    }, function( err, response, json ) {
      return callback( err, json );
    });
  } ) );
};

var checkParameters = function( params, done ) {
  log.trace( 'Checking parameters' );

  var url = params.url;


  if(_.isUndefined(url)){
    log.error('An url must be defined');
    return done(false);
  }

  var method = params.method;

  if(_.isUndefined(method)){
    log.error('A method must be defined');
    return done(false);
  }
  // Everything went better then expected...
  return done(true);
};

var params = {
  url: 'string',
  method: {
    type: 'string',
    'default': 'POST'
  }
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
