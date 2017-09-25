
'use strict';

var Microtask = CS.models.microtask;
var log = CS.log.child( { component: 'Close  MicroTask after execution' } );



var performRule = function( data, config, callback ) {

  var execution = data.execution;

  var domain = require('domain').create();

  domain.on('error',callback);

  Microtask.findById(execution.microtask,function(err,microtask){
    if (err) return callback(err);

    microtask.closeMicroTask(callback);

  });

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;