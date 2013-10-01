
// Load libraries
var util = require('util');
var _ = require('underscore');
var async = require('async');
var domain = require( 'domain' );

// Create a child logger
var log = common.log.child( { component: 'ActorToValidateStream' } );

// Models
var Task = common.models.task;
var MicroTask = common.models.microtask;
var ObjectModel = common.models.object;


var CSError = require('../../error');
// Custom error
var ActorToValidateStreamError = function( id, message) {
  /* jshint camelcase: false */
  ActorToValidateStreamError.super_.call( this, id, message);
};

util.inherits( ActorToValidateStreamError, CSError );

// Error name
ActorToValidateStreamError.prototype.name = 'ActorToValidateStreamError';

// Error IDs
ActorToValidateStreamError.INVALID_TASK_ID = 'INVALID_TASK_ID';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on( 'error', callback );

  var taskId = config.task;
  var execution = data.execution;

  Task
  .findById( taskId )
  .exec( d.bind( function( err, task2 ) {
    if( err ) return callback( err );

    if( !task2 )
      return callback( new ActorToValidateStreamError( ActorToValidateStreamError.INVALID_TASK_ID, 'Invalid Task id' ) );

    // Task valid
    var objects = [];

    execution.populate('annotations.object',d.bind(function(err,execution){
      if(err) return callback(err);

      _.each( execution.annotations, function( annotation ) {
        log.trace( 'Adding annotation', annotation );

        var object = {
          name:'image',
          job: data.task.job,
          data:{
            scene: annotation.object.data.scene,
            actor: annotation.response
          }
        };

        objects.push( object );

      } );


      log.trace('Creating %s objects',objects.length);

      ObjectModel.create(objects,d.bind(function(err){
        if(err) return callback(err);

        var objects = _.toArray(arguments);

        //Removing the first element (the error object)
        objects.shift();

        log.trace('Created %s ',objects);

        var rawMicroTask = {
          platforms: task2.platforms,
          objects: objects,
          operations: task2.operations,
          task: task2._id
        };

        log.trace('Creating the microtask');
        MicroTask.create(rawMicroTask,d.bind(function(err,microtask){
          if(err) return callback(err);

          log.trace('Adding the microtask to the task');
          return task2.addMicrotasks(microtask,d.bind(callback));
        }));

      }));


    }));

  }) );
};



var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
  task: 'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;