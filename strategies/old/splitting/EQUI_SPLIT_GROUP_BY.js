

'use strict';
let _ = require( 'lodash' );
var util = require('util');
var async = require( 'async' );
var domain = require( 'domain' );

var ObjectStatuses = require('../../../config/constants.js').ObjectStatuses;

var log = CS.log.child( { component: 'EquiSplitGroupBy Splitting Strategy' } );


// Import Models
var MicroTask = CS.models.microtask;

// Custom error
// ---
var CSError = require('../../../error');
var EquiSplitGroupByError = function( id, message ) {
    EquiSplitGroupByError.super_.call( this, id, message);
};

util.inherits( EquiSplitGroupByError, CSError );

// Error name
EquiSplitGroupByError.prototype.name = 'EquiSplitGroupByError';

// Custom error IDs
EquiSplitGroupByError.ZERO_OBJECTS = 'ZERO_OBJECTS';
EquiSplitGroupByError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
EquiSplitGroupByError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';

// # Strategy logic
// DESCRIPTION
var performStrategy = function( data, params, callback ) {
  log.trace( 'Performing strategy on "%s" event', data.event );

  var d = domain.create();
  d.on( 'error', callback );

  var objectsNumber = params.objectsNumber;
  var shuffle = params.shuffle;
  var groupingAttribute = params.groupingAttribute;

  var event = data.event;
  var task = data.task;

  var objects = [];
  var pendingObjects = [];

  task.populate('objects',d.bind(function(err,task){
    if(err) return callback(err);

    if(event === 'OPEN_TASK'){

      objects = _.clone(task.objects);

    }else if(event === 'ADD_OBJECTS' || event === 'ON_EOF'){

      var newObjects = data.objects;

      if(_.isUndefined(newObjects)){
        newObjects = [];
      }

      log.trace('Retrieving the array of pending objects');
      pendingObjects = task.getMetadata('pendingObjects');

      if(_.isUndefined(pendingObjects)){
        pendingObjects = [];
      }

      for (var i = 0; i < newObjects.length; i++) {
        pendingObjects.push(newObjects[i]);
      }

      log.trace('%s pending objects',pendingObjects.length);

      objects = pendingObjects;
    }

    // Select only the open objects
    objects = _.filter(objects,function(object){
      return object.status !== ObjectStatuses.CLOSED;
    });

    if(shuffle){
      objects = _.shuffle( objects );
    }

    var groupedObjects = _.groupBy(objects,function(object){
      return object.data[groupingAttribute];
    });

    var microTaskList = [];
    pendingObjects = [];

    _.each(groupedObjects,function(objects){
      if(objects.length >= objectsNumber || event !== 'ADD_OBJECTS'){

        for(var i=0; i<objects.length; i+=objectsNumber ) {
          var microTaskObjects = objects.slice( i, i+objectsNumber );
          log.trace( 'Assigning objects from %s to %s to the %s microtask', i, i+objectsNumber, microTaskList.length );

          var rawMicroTask = {
            platforms: task.platforms,
            objects: microTaskObjects,
            operations: task.operations,
            task: task._id
          };

          // Add to the list of `MicroTask` to save
          microTaskList.push( rawMicroTask );
        }

      }else{

        pendingObjects = _.union(pendingObjects,objects);
      }
    });

    task.setMetadata('pendingObjects',pendingObjects);

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
      task.addMicrotasks( microtasks, d.bind  ( function(err){
        if( err ) return callback( err );

        return callback(null,microtasks);
      } ) );
    };


    async.waterfall( [
      saveMicroTasks,
      updateTask
    ], function(err,microtasks){
        if(err) return callback(err);

        return callback(null,microtasks);
      });

  }));

};


// ## Events
// This strategy will be triggered on these CS events

var triggerOn = [
  'OPEN_TASK',
  'ADD_OBJECTS',
  'ON_EOF'
];

// ## Parameters

// Parameters needed by the strategy
var params = {
  objectsNumber: 'number',
  groupingAttribute: 'string',
  shuffle: 'boolean'
};


// Check the passed parameters
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  log.trace( 'Data:', params );

  if( !_.isNumber( params.objectsNumber ) )
    return callback( new EquiSplitGroupByError( EquiSplitGroupByError.MISSING_PARAMETERS, 'Missing parameter objectsNumber' ) );

  if( params.objectsNumber<=0 )
    return callback( new EquiSplitGroupByError( EquiSplitGroupByError.CONFIGURATION_MISMATCH, 'Parameter objectsNumber is empty' ) );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;
