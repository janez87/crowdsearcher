
// Load libraries
var util = require('util');
var _ = require('underscore');
var domain = require( 'domain' );

// Create a child logger
var log = common.log.child( { component: 'ActorToValidate' } );

// Models
var Task = common.models.task;
var Execution = common.models.execution;

var CSError = require('../../error');
// Custom error
var ActorToValidateError = function( id, message) {
  /* jshint camelcase: false */
  ActorToValidateError.super_.call( this, id, message);
};

util.inherits( ActorToValidateError, CSError );

// Error name
ActorToValidateError.prototype.name = 'ActorToValidateError';

// Error IDs
ActorToValidateError.INVALID_TASK_ID = 'INVALID_TASK_ID';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on( 'error', callback );

  var taskId = config.task;
  var microtask = data.microtask;

  if(data.event !== 'END_MICROTASK'){
    log.error('Wrong event');
    return callback();
  }

  Task
  .findById( taskId )
  .exec( d.bind( function( err, task2 ) {
    if( err ) return callback( err );

    if( !task2 )
      return callback( new ActorToValidateError( ActorToValidateError.INVALID_TASK_ID, 'Invalid Task id' ) );

    microtask
    .populate('objects',function(err,microtask){
      if(err) return callback(err);

      var negative = false;

      _.each(microtask.objects,function(object){
        var result = object.getMetadata('maj_'+microtask.operations[0]+'_result');

        if(result === 'no'){
          log.trace('The actor %s is not present',object.data.actor);
          negative = true;
          return;
        }
      });

      if(!negative){
        log.trace('All the actors are present');
        return callback();
      }

      var scene = microtask.objects[0].data.scene;

      var newObject = {
          name:'image',
          data:{
            scene:scene
          }
        };

      return task2.addObjects([newObject],callback);
    });

  }));
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