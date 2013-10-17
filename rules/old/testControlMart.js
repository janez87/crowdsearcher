
// Load libraries

var log = common.log.child( { component: 'TestControlMart' } );
var async = require('async');
var ControlMart = common.models.controlmart;

var performRule = function( data, config, callback ) {

  var domain = require('domain').create();

  domain.on('error',callback);

  var annotations = data.execution.annotations;

  var printControlMart = function(annotation,callback){

    var object = annotation.object;

    ControlMart.select({name:'test'},function(err,tuple){
      if(err) return callback(err);

      log.trace('The data is %s',tuple);

      return callback();
    });
    
  };

  async.eachSeries(annotations,printControlMart,callback);
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;