
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = CS.log.child( { component: 'CheckExecution' } );

// Models
var User = CS.models.user;

var CSError = require('../../error');
// Custom error
var CheckExecutionError = function( id, message) {
  /* jshint camelcase: false */
  CheckExecutionError.super_.call( this, id, message);
};

util.inherits( CheckExecutionError, CSError );

// Error name
CheckExecutionError.prototype.name = 'CheckExecutionError';
// Error IDs
CheckExecutionError.BAD_OPERATION_LABEL = 'BAD_OPERATION_LABEL';


var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();
  domain.on('error',callback);

  var microtask = data.microtask;
  var annotations = data.execution.annotations;
  var performer = data.execution.performer;
  var execution = data.execution;
  var task = data.task;

  microtask.populate('operations',domain.bind(function(err,microtask){
    if(err) return callback(err);

    var operation = _.findWhere(microtask.operations,{label:config.operation});

    if(_.isUndefined(operation)){
      log.error('Invalidating operation (%s) not present',config.operation);
      return callback( new CheckExecutionError( CheckExecutionError.BAD_OPERATION_LABEL, 'Invalidating operation not present' ) );
    }

    var consideredAnnotations = _.filter(annotations,function(annotation){
      return annotation.operation.equals(operation._id);
    });

    // The performer didn't select any invalidating category
    if(consideredAnnotations.length === 0){
      log.trace('The performer know what he is doing..');
      return callback();
    }



    // I need to cycle over the annotation in order to add the task to the not-saw list of the performer (if needed)
    // Only 1 notSaw annotatin is needed in order to add the task to the ignore list
    var checkAnnotations = function(callback){

      if( _.isUndefined(performer) ){
        log.trace('The performer is anonymous');
        return callback();
      }

      // I need the user object for using the metadata
      User.findById( performer, domain.bind(function(err,performer){
        if(err) return callback(err);

        for( var i=0; i<consideredAnnotations.length; i++ ) {
          var annotation = consideredAnnotations[i];
          var category = annotation.response;
          log.trace('The performer selected the category "%s"',category);
          if( category === config.notSaw ) {
            var taskId = task._id;
            log.trace('Adding the task %s to the task to be avoided', taskId );
            var tasksToAvoid = performer.getMetadata('tasksToAvoid') || [];
            tasksToAvoid.push( taskId );
            performer.setMetadata( 'tasksToAvoid', tasksToAvoid );
            // Exit from the loop
            return performer.save( domain.bind( callback ) );
          }
        }
        /*
        _.each(consideredAnnotations,function(annotation){
            var category = annotation.response;
            log.trace('The performer selected %s',category);
            if(category === config.notSaw){
              var taskId = data.task.id;
              var tasksToAvoid = performer.getMetadata('tasksToAvoid');
              log.trace('Adding the task %s to the task to be avoided',taskId);
              if(_.isUndefined(tasksToAvoid)){
                tasksToAvoid = [taskId];
              }else{
                tasksToAvoid.push(taskId);
              }

              return performer.save(callback);
            }
          });
        */
        return callback();
      }));
    };

    var invalidExecution = function(callback){
      log.trace('Invalidating the execution %s',execution.id);
      execution.setMetadata('invalid',true);
      execution.save( domain.bind( callback ) );
    };

    var actions = [
      invalidExecution,
      checkAnnotations
    ];

    async.series(actions,callback);
  }));
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
  operation:'string',
  notSaw:'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
