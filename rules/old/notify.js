
// Load libraries
var request = require( 'request' );
var util = require('util');
var domain = require('domain');

var log = CS.log.child( { component: 'Notify rule' } );

// Error
var CSError = require('../../error');
// Custom error
var NotifyError = function( id, message) {
  /* jshint camelcase:false */
  NotifyError.super_.call( this, id, message);
};

util.inherits( NotifyError, CSError );

// Error name
NotifyError.prototype.name = 'NotifyError';


var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');
  var d = domain.create();
  d.on( 'error', callback );

  var method = config.method;
  var url = config.url;


  data.execution.populate( 'annotations.object', d.bind( function( err, execution ) {
    if( err ) return callback( err );

    request( {
      method: method,
      url: url,
      json: execution.toObject()
    }, function( err, response, json ) {
      return callback( err, json );
    });
  } ) );

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
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
