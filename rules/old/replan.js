
'use strict';
let _ = require( 'lodash' );

var TaskStatuses = require( '../../config/constants' ).TaskStatuses;
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;
var Microtask = CS.models.microtask;

var log = CS.log.child( { component: 'Replan custom rule' } );


var performRule = function( data, config, callback ) {

  log.trace('Executing the rule Replan');
  var domain = require('domain').create();
  domain.on('error',callback);

  var _task = data.task;
  var platform = config.platform;


  _task.populate('microtasks objects',function(err,task){

    if (err) return callback(err);

    log.trace('Retrieving all the open microtasks');
    var openMicrotasks = _.findWhere(task.microtasks, {status:TaskStatuses.OPENED});

    if(!_.isUndefined(openMicrotasks) && !_.isArray(openMicrotasks)){
      openMicrotasks =[openMicrotasks];
    }

    if (!_.isUndefined(openMicrotasks) && openMicrotasks.length > 0){
      log.trace('%s microtasks are still open', openMicrotasks.length);
      log.trace('A replan is not needed');
      return callback();
    }

    log.trace('Retrieving all the open objects');
    var openObjects = _.findWhere(task.objects,{status:ObjectStatuses.OPENED});

    if(!_.isUndefined(openObjects) && !_.isArray(openObjects)){
      openObjects = [openObjects];
    }

    if(_.isUndefined(openObjects) || openObjects.length === 0){
      log.trace('All the objects are closed');
      return callback();
    }

    log.trace('Replanning the objects on the platform: %s',platform);

    var platormImpl = _.findWhere(task.platforms, {name:platform});
    platormImpl.params.inactive = false;

    task.set('implementationStrategy.platform',platform);
    task.markModified('implementationStrategy');

    task.save(function(err){
      if (err) return callback(err);

      log.trace('New platform 2 %s', task.implementationStrategy.platform);
      var objectIds = openObjects.map(function(object){
        return object.id;
      });

      if(!_.isArray(platform)){
        platform = [platform];
      }

      log.trace('Creating the microtask with objects %s', objectIds);
      var microTask = new Microtask({platforms:platform,objects:objectIds});
      microTask.task = task;

      microTask.save(function(err){
        if(err) return callback(err);

        log.trace('Microtask %s created',microTask.id);
        task.addMicrotasks(microTask,domain.bind(callback));
      });
    });

  });
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


var params = {
  platform: 'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
