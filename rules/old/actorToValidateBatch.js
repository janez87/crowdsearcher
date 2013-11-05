
// Load libraries
var util = require('util');
var _ = require('underscore');
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'ActorToValidateBatch' } );

// Models
var Task = CS.models.task;
var Microtask = CS.models.microtask;
var ObjectModel = CS.models.object;
var Execution = CS.models.execution;

var CSError = require('../../error');
// Custom error
var ActorToValidateBatchError = function( id, message) {
  /* jshint camelcase: false */
  ActorToValidateBatchError.super_.call( this, id, message);
};

util.inherits( ActorToValidateBatchError, CSError );

// Error name
ActorToValidateBatchError.prototype.name = 'ActorToValidateBatchError';

// Error IDs
ActorToValidateBatchError.INVALID_TASK_ID = 'INVALID_TASK_ID';

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
      return callback( new ActorToValidateBatchError( ActorToValidateBatchError.INVALID_TASK_ID, 'Invalid Task id' ) );

    // Task valid

    var rawObjects = [];

    Execution
    .find()
    .where('microtask')
    .equals(microtask)
    .populate('annotations.object')
    .exec(d.bind(function(err,executions){
      if(err) return callback(err);

      log.trace('Retrieved %s executions',executions.length);

      var actors = [];
      var img = executions[0].annotations[0].object.data.scene;

      _.each(executions,function(execution){
        _.each(execution.annotations,function(annotation){

          actors.push(annotation.response);

        });

      });

      actors = _.uniq(actors);

      log.trace(actors);

      _.each(actors,function(actor){

        var object = {
          name:'image',
          job: data.task.job,
          data:{
            actor:actor,
            scene:img
          }
        };

        rawObjects.push( object );
      } );


      task2.addObjects( rawObjects, d.bind( function ( err, objects ) {
        if( err ) return callback( err );

        var microtaskToCreate = new Microtask( {
          task: task2,
          objects: objects,
          operations: task2.operations,
          platforms: task2.platforms
        } );


        d.bind( microtaskToCreate.save.bind( microtaskToCreate ) )( function ( err, m ) {
          if( err ) return callback( err );

          return task2.addMicrotasks( m, d.bind( callback ) );
        } );
      } ) );

    } ) );

  } ) );
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