
// Load libraries

var log = common.log.child( { component: 'TestControlMart' } );
var ControlMart = common.models.controlmart;

var performRule = function( data, config, callback ) {

  var domain = require('domain').create();

  domain.on('error',callback);

  ControlMart.get({task:data.task,name:'test'},function(err,tuple){
    if(err) return callback(err);

    log.trace(tuple);

    return callback();
  });


};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;