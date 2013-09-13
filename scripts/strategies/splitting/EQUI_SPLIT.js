

// Load libraries
var _ = require('underscore');
var util = require('util');
var async = require( 'async' );
var domain = require( 'domain' );

var ObjectStatuses = require('../../../config/constants.js').ObjectStatuses;

var log = common.log.child( { component: 'EquiSplit Splitting Strategy' } );


// Import Models
var MicroTask = common.models.microtask;

// Custom error
// ---
var CSError = require('../../../error');
var EquiSplitError = function( id, message ) {
    EquiSplitError.super_.call( this, id, message);
};

util.inherits( EquiSplitError, CSError );

// Error name
EquiSplitError.prototype.name = 'EquiSplitError';

// Custom error IDs
EquiSplitError.ZERO_OBJECTS = 'ZERO_OBJECTS';
EquiSplitError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
EquiSplitError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';

// # Strategy logic
// DESCRIPTION
var performStrategy = function( data, params, callback ) {
  log.trace( 'Performing strategy on "%s" event', data.event );

  var d = domain.create();
  d.on( 'error', callback );
  
  // Get the configuration
  var objectsPerMicroTask = params.objectsNumber;
  var shuffle = params.shuffle;

  var event = data.event;
  var task = data.task;
  task.populate('objects',d.bind(function(err,task){
    if(err) return callback(err);
    
    var objects = [];
    
    if( event==='ADD_OBJECTS' ) {
      var newObjects = data.objects;

      log.trace('Retrieving the array of pending objects');
      var pendingObjects = task.getMetadata('pendingObjects');

      if(_.isUndefined(pendingObjects)){
        pendingObjects = [];
      }

      for (var i = 0; i < newObjects.length; i++) {
        pendingObjects.push(newObjects[i]);
      }

      log.trace('%s pending objects',pendingObjects.length);

      if(pendingObjects.length<objectsPerMicroTask){
        log.trace('Not enough objects');
        
        // Updating the metadata
        task.setMetadata('pendingObjects',pendingObjects);
        
        return task.save(d.bind(function(err){
          if(err) return callback(err);

          return callback(null,[]);
        }));
      }

      objects = pendingObjects;
      task.setMetadata('pendingObjects',[]);
    }else if(event === 'OPEN_TASK'){
      // Handling the OPEN_TASK event
   
      // Get the object list as a copy.
      objects = _.clone( task.objects );
   
      // Select only the open objects
      objects = _.filter(objects,function(object){
        return object.status !== ObjectStatuses.CLOSED;
      });
   
      // Shuffle objects if needed
      if( shuffle ){
        objects = _.shuffle( objects );
      }
    }

    // If we have 0 objects then we cannot perform this strategy.
    var numObjects = objects.length;
    if( numObjects===0 )
      return callback( null, [] );
      //return callback( new EquiSplitError( EquiSplitError.NO_OBJECTS, 'The Task have 0 open objects' ) );

    // List of microtasks to create
    var microTaskList = [];

    // Cycle over the objects
    var i;
    for( i=0; i<objects.length; i+=objectsPerMicroTask ) {
      var microTaskObjects = objects.slice( i, i+objectsPerMicroTask );
      log.trace( 'Assigning objects from %s to %s to the %s microtask', i, i+objectsPerMicroTask, microTaskList.length );

      var rawMicroTask = {
        platforms: task.platforms,
        objects: microTaskObjects,
        operations: task.operations,
        task: task._id
      };

      // Add to the list of `MicroTask` to save
      microTaskList.push( rawMicroTask );
    }

    var remaning = task.objects.length-i;
    log.warn( 'Remaining %s objects', remaning );

    //TODO: better manage edge cases
    //TODO: missing full control

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
  'ADD_OBJECTS'
];

// ## Parameters

// Parameters needed by the strategy
var params = {
  objectsNumber: 'number',
  shuffle: 'boolean'
};


// Check the passed parameters
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  log.trace( 'Data:', params );

  if( !_.isNumber( params.objectsNumber ) )
    return callback( new EquiSplitError( EquiSplitError.MISSING_PARAMETERS, 'Missing parameter objectsNumber' ) );

  if( params.objectsNumber<=0 )
    return callback( new EquiSplitError( EquiSplitError.CONFIGURATION_MISMATCH, 'Parameter objectsNumber is empty' ) );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;
