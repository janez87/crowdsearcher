
// Load libraries
var _ = require('underscore');

var ObjectStatuses = require('../../config/constants.js').ObjectStatuses;
var TaskStatuses = require('../../config/constants.js').TaskStatuses;

var log = common.log.child( { component: 'Close Task' } );



var performRule = function( data, config, callback ) {
  log.trace('Performing the rule Close Task');

  var domain = require('domain').create();

  domain.on('error',callback);

  var task = data.task;

  if( task.status===TaskStatuses.CLOSED )
    return callback();

  task.populate('objects',function(err,task){
    if (err) callback(err);

    var objects = task.objects;

    var closedObjects = _.where(objects,{status:ObjectStatuses.CLOSED});

    log.trace('found %s closed objects',closedObjects.length);

    if(closedObjects.length === task.objects.length){
      return task.closeTask(callback);
    }else{

      log.trace('Some object need to be evaluated');

      return callback();
    }
  });

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
