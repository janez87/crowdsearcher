
'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var request = require( 'request' );
var util = require('util');
var domain = require( 'domain' );


var log = CS.log.child( { component: 'Redundant Splitting Strategy' } );


// Custom error
var CSError = require('../../../error');
var RedundantError = function( id, message) {
    RedundantError.super_.call( this, id, message);
};
util.inherits( RedundantError, CSError );

// Error name
RedundantError.prototype.name = 'RedundantError';
// Custom error IDs
RedundantError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
RedundantError.NO_OBJECTS = 'NO_OBJECTS';


// Import Models
var MicroTask = CS.models.microtask;

var getNRandom = function(array,number){

  var result = [];

  while(number>0){
    var element = array[_.random(array.length-1)];
    if(!_.contains(result,element)){
     log.trace('Selecting the object %s',element);
     result.push(element);
     number--;
    }
  }

  return result;
};

var performStrategy = function( data, params, callback  ) {
  log.trace( 'Performing strategy');

  var task = data.task;
  // Get the configuration
  var objectsPerMicroTask = params.objectsNumber;
  var redundancy = params.redundancy;
  var shuffle = params.shuffle;


  // Get the object list as a copy.
  var objects = _.clone( task.objects );

  // Shuffle objects if needed
  if( shuffle )
    objects = _.shuffle( objects );

  // If we have 0 objects then we cannot perform this strategy.
  var numObjects = objects.length;
  if( numObjects===0 )
    return callback( new RedundantError( RedundantError.NO_OBJECTS, 'The Task have 0 objects' ) );

  // List of microtasks to create
  var microTaskList = [];

  // Cycle over the objects
  var i;
  for( i=0; i<objects.length; i+=objectsPerMicroTask ) {
    var microTaskObjects = objects.slice( i, i+objectsPerMicroTask );

    // Reached the end of object list.
    // Get `objectsPerMicroTask` elements from the bottom of the list.
    // *WARNING* possible overlap!
    if( microTaskObjects.length!==objectsPerMicroTask )
      microTaskObjects = objects.slice( -objectsPerMicroTask );

    log.trace( 'Assigning objects from %s to %s to the %s microtask', i, i+objectsPerMicroTask, microTaskList.length );

    var rawMicroTask = {
      platforms: task.platforms,
      objects: microTaskObjects,
      operations: task.operations,
      task: task._id
    };

    // Add to the list of `MicroTask` to save.
    for( var j=0; j<redundancy; j++ )
      microTaskList.push( rawMicroTask );
  };

  // Create domain
  var d = domain.create();
  d.on( 'error', callback );


  /*
  for (var i = 0; i < redundancy; i++) {
    var objectsCopy = task.objects.slice();

    while(objectsCopy.length>=objectsPerMicroTask){
      var objectsToAdd = getNRandom(objectsCopy,objectsPerMicroTask);

      log.trace('adding %s objects to the microtask', objectsToAdd.length);
      log.trace(objectsToAdd);

      objectsCopy = _.difference(objectsCopy,objectsToAdd);

      log.trace('%s objects remaining', objectsCopy.length);
      log.trace(objectsCopy);


      var rawMicroTask = {
        platforms: task.platforms,
        objects: objectsToAdd,
        operations: task.operations,
        task: task._id
      };

      microTaskList.push( rawMicroTask );
    }

    //TODO: fare in modo che tutti i microtask abbiano lo stesso numero di oggetti
    if(objectsCopy.length>0){
      log.trace('Assigning the rest of the objects');

      var newMicroTask = {
        platforms: task.platforms,
        objects: objectsCopy,
        operations: task.operations,
        task: task._id
      };

      microTaskList.push( newMicroTask );
    }

  }
  */

  var saveMicroTasks = function( callback ) {
    log.trace( 'Creating %s microtasks', microTaskList.length );
    MicroTask.create( microTaskList, d.bind( callback ) );
  };

  var updateTask = function( /* microtask, microtask, ..., callback */ ) {
    // Get all the microtasks from the arguments
    var microtasks = _.toArray( arguments );
    // The last argument is the callback
    var callback = microtasks.pop();

    log.trace( 'Adding %s microtasks to the task', microtasks.length );
    task.addMicrotasks( microtasks, d.bind( callback ) );
  };

  async.waterfall( [
    saveMicroTasks,
    updateTask
  ], callback );
};

var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  if( !_.isNumber( params.objectsNumber ) )
    return callback( new RedundantError( RedundantError.CONFIGURATION_MISMATCH,'Missing objectsNumber parameter' ) );

  if( !_.isNumber( params.redundancy ) )
    return callback( new RedundantError( RedundantError.CONFIGURATION_MISMATCH,'Missing redundancy parameter' ) );

  if( params.objectsNumber<=0 )
    return callback( new RedundantError( RedundantError.CONFIGURATION_MISMATCH,'objectsNumber parameter must be > 0' ) );

  if( params.redundancy<=0 )
    return callback( new RedundantError( RedundantError.CONFIGURATION_MISMATCH,'redundancy parameter must be > 0' ) );

  // Everything went better then expected...
  return callback();
};

var triggerOn = [
  'OPEN_TASK',
  'ADD_OBJECT'
];

// ## Parameters
// Parameters needed by the strategy
var params = {
  // Number of objects per Microtask
  objectsNumber: 'number',
  redundancy: 'number',
  shuffle: 'boolean'
};

module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;