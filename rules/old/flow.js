
'use strict';
var util = require('util');
let _ = require( 'lodash' );
var async = require('async');
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'Task Flow' } );

// Models
var Task = CS.models.task;


var CSError = require('../../error');
// Custom error
var TaskFlowError = function( id, message) {
  /* jshint camelcase: false */
  TaskFlowError.super_.call( this, id, message);
};

util.inherits( TaskFlowError, CSError );

// Error name
TaskFlowError.prototype.name = 'TaskFlowError';

// Error IDs
TaskFlowError.INVALID_TASK_ID = 'INVALID_TASK_ID';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on( 'error', callback );

  var taskId = config.task;
  Task
  .findById( taskId )
  .exec( d.bind( function( err, task2 ) {
    if( err ) return callback( err );

    if( !task2 )
      return callback( new TaskFlowError( TaskFlowError.INVALID_TASK_ID, 'Invalid Task id' ) );

    // Task valid
    var objects = [];
    _.each( data.execution.annotations, function( annotation ) {
      log.trace( 'Adding annotation', annotation );
      objects.push( annotation.object );
    } );
    log.trace( 'Adding objects', objects );
    return task2.addObjectsByIds( objects, callback );
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