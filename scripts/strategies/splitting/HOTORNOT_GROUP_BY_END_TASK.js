// Load libraries
var _ = require('underscore');
var util = require('util');
var async = require( 'async' );

var ObjectStatuses = require('../../../config/constants.js').ObjectStatuses;

var log = common.log.child( { component: 'HOTORNOT_GROUP_BY END TASK' } );


// Import Models
var MicroTask = common.models.microtask;

// Custom error
// ---
var CSError = require('../../../error');
var HotOrNotGroupByError = function( id, message ) {
  HotOrNotGroupByError.super_.call( this, id, message);
};

util.inherits( HotOrNotGroupByError, CSError );

// Error name
HotOrNotGroupByError.prototype.name = 'HotOrNotGroupByError';

// Custom error IDs
HotOrNotGroupByError.NOT_ENOUGH_OBJECTS = 'NOT_ENOUGH_OBJECTS';
HotOrNotGroupByError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
HotOrNotGroupByError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// # Strategy logic
// DESCRIPTION
var performStrategy = function( data, params, callback ) {
  log.trace( 'Performing strategy on "%s" event', data.event );

  var d = require('domain').createDomain();
  d.on('error',callback);

  var event = data.event;

  var task = data.task;
  var objects = [];
  var pendingObjects = [];

  var groupingAttribute = params.groupingAttribute;

  task.populate('objects',d.bind(function(err,task){
    if(err) return callback(err);

    objects = _.clone( task.objects );

    // Select only the open objects
    objects = _.filter(objects,function(object){
      return object.status !== ObjectStatuses.CLOSED;
    } );

    var groupedObjects = _.groupBy(objects,function(object){
      return object.data[groupingAttribute];
    });

    // Creating the raw microtasks
    var microTaskList = [];

    var createRawMicroTask = function(object1,object2){
      log.trace('Generating the comparison for the object %s with %s',object1,object2);

      var couple = [object2,object1];

      var rawMicroTask = {
        platforms: task.platforms,
        objects: couple,
        operations: task.operations,
        task: task
      };

      microTaskList.push(rawMicroTask);
    };

    _.each( groupedObjects, function( objects ){
      for (var i = 0; i < objects.length; i++) {
        for (var k = i+1; k < objects.length; k++) {
          createRawMicroTask(objects[i],objects[k]);
        }
      }
    });

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

  }));


};


// ## Events
// This strategy will be triggered on these CS events

var triggerOn = [
  'ADD_OBJECTS'
];

var params = {
  groupingAttribute:'string'
};


// Check the passed parameters
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );
  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;
