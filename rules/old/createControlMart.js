
// Load libraries

var log = common.log.child( { component: 'CreateControlMart' } );
var async = require('async');
var ControlMart = common.models.controlmart;

var performRule = function( data, config, callback ) {

  var domain = require('domain').create();

  domain.on('error',callback);

  var objects = data.task.objects;
  
  var createControlMartTuple = function(object,callback){

    var rawMart = {
      name:'yes',
      data:0,
      task:data.task._id,
      object:object
    };

    log.trace('Creating the tuple %j',rawMart);
    ControlMart.create(rawMart,callback);
  };

  return async.eachSeries(objects,createControlMartTuple,callback);

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;