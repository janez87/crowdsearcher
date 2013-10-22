
// Load libraries

var log = common.log.child( { component: 'TestControlMart' } );
var _ = require('underscore');
var ControlMart = common.models.controlmart;

var performRule = function( data, config, callback ) {

  var domain = require('domain').create();

  domain.on('error',callback);

  var annotations = data.execution.annotations;

  var mart = [];

  var taskMart = {
    task:data.task._id,
    name:'eval',
    data:3
  };

  mart.push(taskMart);


  _.each(annotations,function(annotation){
      var object = annotation.object;

      var objectMart = {
        task:data.task._id,
        object:object,
        name:'eval',
        data:1
      };

      mart.push(objectMart);

    });

  ControlMart.insert(mart,function(err){
    if( err ) return callback( err );
  
    ControlMart.select({task:data.task._id},function(err,mart){
      if( err ) return callback( err );
      
      log.trace(mart);
      return callback();
    });
  });
    
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;