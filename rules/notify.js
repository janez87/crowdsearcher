
// Load libraries
var request = require( 'request' );
var domain = require('domain');
var _ = require('underscore');

var log = common.log.child( { component: 'Notify rule' } );


var performRule = function( event, config, task, data, callback ) {
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
