'use strict';
let _ = require( 'lodash' );
var util = require('util');
var async = require( 'async' );

var ObjectStatuses = require('../../../config/constants.js').ObjectStatuses;

var log = CS.log.child( { component: 'HotOrNot Splitting Strategy' } );


// Import Models
var MicroTask = CS.models.microtask;

// Custom error
// ---
var CSError = require('../../../error');
var HotOrNotError = function( id, message ) {
  HotOrNotError.super_.call( this, id, message);
};

util.inherits( HotOrNotError, CSError );

// Error name
HotOrNotError.prototype.name = 'HotOrNotError';

// Custom error IDs
HotOrNotError.NOT_ENOUGH_OBJECTS = 'NOT_ENOUGH_OBJECTS';
HotOrNotError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
HotOrNotError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// # Strategy logic
// DESCRIPTION
var performStrategy = function( data, params, callback ) {
  log.trace( 'Performing strategy on "%s" event', data.event );

  var domain = require('domain').createDomain();
  domain.on('error',callback);

  var task = data.task;

  var objects = _.clone( task.objects );

  // Select only the open objects
  objects = _.filter(objects,function(object){
    return object.status !== ObjectStatuses.CLOSED;
  });

  if(objects.length <= 1){
    return callback( new HotOrNotError( HotOrNotError.NOT_ENOUGH_OBJECTS, 'The Task does not have enough open objects' ) );
  }


  objects = _.shuffle( objects);

  // Creating the raw microtasks
  var microTaskList = [];
  for (var i = 0; i < objects.length; i++) {
    for (var k = i+1; k < objects.length; k++) {
      log.trace('Generating the comparison for the object %s with %s',objects[i],objects[k]);

      var couple = [objects[i],objects[k]];

      var rawMicroTask = {
        platforms: task.platforms,
        objects: couple,
        operations: task.operations,
        task: task
      };

      microTaskList.push(rawMicroTask);

    }
  }

  var saveMicroTasks = function( callback ) {
    log.trace( 'Creating %s microtasks', microTaskList.length );
    MicroTask.create( microTaskList, domain.bind( callback ) );
  };

  var updateTask = function( /* microtask, microtask, ..., callback */ ) {
    // Get all the microtasks from the arguments
    var microtasks = _.toArray( arguments );
    // The last argument is the callback
    var callback = microtasks.pop();

    log.trace( 'Adding %s microtasks to the task', microtasks.length );
    task.addMicrotasks( microtasks, domain.bind( callback ) );
  };

  async.waterfall( [
    saveMicroTasks,
    updateTask
  ], callback );


};


// ## Events
// This strategy will be triggered on these CS events

var triggerOn = [
  'OPEN_TASK'
];




// Check the passed parameters
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );
  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.triggerOn = exports.triggerOn = triggerOn;
