
// Load libraries
var util = require('util');
var _ = require('underscore');
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'ActorToValidate' } );

// Models
var Task = CS.models.task;
var Execution = CS.models.execution;

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
  var task = data.task;

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

      var triggered = task.getMetadata( 'triggered_'+scene ) || 0;
      triggered = parseInt( triggered, 10 );
      if( triggered>3 )
        return callback();


      var newObject = {
          name:'image',
          data:{
            scene:scene
          }
        };

      return task2.addObjects([newObject], d.bind( function ( err ) {
        if( err ) return callback( err );

        task.setMetadata( 'triggered_'+scene, triggered+1 );
        d.bind( task.save.bind( task ) )( callback );
      } ) );
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