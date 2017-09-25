
'use strict';
var util = require('util');
var async = require('async');
let _ = require( 'lodash' );
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'ActorToValidateBatchTask' } );

// Models
var Task = CS.models.task;
var Microtask = CS.models.microtask;
var ObjectModel = CS.models.object;
var Execution = CS.models.execution;

var CSError = require('../../error');
// Custom error
var ActorToValidateBatchTaskError = function( id, message) {
  /* jshint camelcase: false */
  ActorToValidateBatchTaskError.super_.call( this, id, message);
};

util.inherits( ActorToValidateBatchTaskError, CSError );

// Error name
ActorToValidateBatchTaskError.prototype.name = 'ActorToValidateBatchTaskError';

// Error IDs
ActorToValidateBatchTaskError.INVALID_TASK_ID = 'INVALID_TASK_ID';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on( 'error', callback );

  var taskId = config.task;
  var task = data.task;

  if(data.event !== 'END_TASK'){
    log.error('Wrong event');
    return callback();
  }

  Task
  .findById( taskId )
  .exec( d.bind( function( err, task2 ) {
    if( err ) return callback( err );

    if( !task2 )
      return callback( new ActorToValidateBatchTaskError( ActorToValidateBatchTaskError.INVALID_TASK_ID, 'Invalid Task id' ) );

    // Task valid
    Execution
    .find()
    .where( 'task', task )
    .populate( 'annotations.object' )
    .exec( d.bind( function( err, executions ) {
      if( err ) return callback( err );

      log.trace( 'Retrieved %s executions',executions.length );

      var sceneMap = {};
      _.each(executions,function(execution){
        _.each(execution.annotations,function(annotation){
          var scene = annotation.object.data.scene;
          if( !sceneMap[ scene ] )
            sceneMap[ scene ] = [];

          sceneMap[ scene ].push( annotation.response );
        } );
      } );

      var dataList = _.map( sceneMap, function ( array, scene ) {
        return [ scene, _.uniq( array ) ];
      } );

      function createMicrotask( data, cb ) {
        // Create objects for microtask
        var scene = data[0];
        var actors = data[1];

        var rawObjects = _.map( actors, function ( actor ) {
          return {
            name: 'image',
            job: task.job,
            data: {
              actor: actor,
              scene: scene
            }
          };
        } );

        task2.addObjects( rawObjects, d.bind( function ( err, objects ) {
          if( err ) return cb( err );

          var microtaskToCreate = new Microtask( {
            task: task2,
            objects: objects,
            operations: task2.operations,
            platforms: task2.platforms
          } );

          d.bind( microtaskToCreate.save.bind( microtaskToCreate ) )( function ( err, m ) {
            if( err ) return cb( err );

            return task2.addMicrotasks( m, d.bind( cb ) );
          } );
        } ) );
      }

      return async.eachSeries( dataList, createMicrotask, callback );

      /*
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
      */

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