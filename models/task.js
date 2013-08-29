// Load libraries
var _  = require('underscore');
var mongo = require('mongoose');
var async = require('async');
var domain = require('domain');
var schedule = require('node-schedule');

var log = common.log.child( { component: 'Task model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var ControlRule = require( './controlrule' );
var TaskStatuses = require( '../config/constants' ).TaskStatuses;

// Plugins to load
var splittingStrategyPlugin = require( './plugins/splittingstrategy' );
var microTaskAssignmentStrategyPlugin = require( './plugins/microtaskassignmentstrategy' );
var implementationStrategyPlugin = require( './plugins/implementationstrategy' );
var invitationStrategyPlugin = require( './plugins/invitationstrategy' );
var metadataPlugin = require( './plugins/metadata' );


// Import the CRM
var CRM = require( '../scripts/controlRuleManager' );

// TaskSchema
// ------
// The task schema repretassents
var TaskSchema = new Schema( {

  // The name of the task.
  name: {
    type: String,
    required: true
  },


  // Markdown enabled fileds containing the descriptions
  description: String,
  landing: {
    type: String,
    select: false
  },
  ending: {
    type: String,
    select: false
  },

  // Array that contains the `Operation` list
  operations: {
    type: [{
      type: ObjectId,
      ref: 'operation'
    }],
    required: true
  },

  // Array that contains the `Platform` list
  platforms: {
    type: [{
      type: ObjectId,
      ref: 'platform'
    }],
    required: true
  },

  // If the Task is private
  'private': {
    type: Boolean,
    'default': false
  },

  // Task status
  status: {
    type: Number,
    required: true,
    index: true,
    'default': TaskStatuses.CREATED
  },

  // Control Rules
  controlrules: [ControlRule],

  // Job that owns this task
  job: {
    required: true,
    type: ObjectId,
    ref: 'job'
  },

  // List of objects belonging to the task
  objects: [ {
    type: ObjectId,
    ref: 'object',
    unique: true
  } ],


  // Microtasks
  microtasks: [{
    type: ObjectId,
    ref: 'microtask',
    unique: true
  } ],

  // Useful timed data
  creationDate: {
    required: true,
    type: Date,
    'default': Date.now
  },

  closedDate: {
    type: Date,
    'default':null
  },

  lastResponse: {
    type: Date
  }

},// Set the options for this Schema
{
  // Do not allow to add random properties to the Model
  strict: true
} );


// Use plugins
TaskSchema.plugin( metadataPlugin );
TaskSchema.plugin( splittingStrategyPlugin );
TaskSchema.plugin( microTaskAssignmentStrategyPlugin );
TaskSchema.plugin( implementationStrategyPlugin );
TaskSchema.plugin( invitationStrategyPlugin );




// Handle property change
TaskSchema.path( 'status' ).set( function( value ) {
  if( this.status>value ) {
    return this.invalidate( 'status', 'Cannot set to a previous state' );
  }

  return value;
} );

// Pre middlewares
TaskSchema.pre( 'remove', function( next ) {
  log.trace( 'PRE Task remove' );

  var thisTask = this;

  var removeObj = function( obj, callback ) {
    obj.remove( callback );
  };

  var removePlatforms = function( callback ) {
    thisTask
    .model( 'platform' )
    .find()
    .where( '_id' )['in']( thisTask.platforms )
    .exec( function( err, platforms ) {
      if( err ) return callback( err );

      async.each( platforms, removeObj, callback );
    } );
  };
  var removeOperations = function( callback ) {
    log.debug( 'Removing %s operations from the task', thisTask.operations.length );

    thisTask
    .model( 'operation' )
    .find()
    .where( '_id' )['in']( thisTask.operations )
    .exec( function( err, operations ) {
      if( err ) return callback( err );

      async.each( operations, removeObj, callback );
    } );
  };

  var removeMicrotasks = function( callback ) {
    log.debug( 'Removing %s microtasks from the task', thisTask.microtasks.length );

    thisTask
    .model( 'microtask' )
    .find()
    .where( '_id' )['in']( thisTask.microtasks )
    .exec( function( err, microtasks ) {
      if( err ) return callback( err );

      async.each( microtasks, removeObj, callback );
    } );
  };

  var removeExecutions = function( callback ) {
    log.debug( 'Removing all executions of the task' );

    thisTask
    .model( 'execution' )
    .find()
    .where( 'task', thisTask._id )
    .exec( function( err, executions ) {
      if( err ) return callback( err );

      async.each( executions, removeObj, callback );
    } );
  };

  async.series( [
    removePlatforms,
    removeOperations,
    removeMicrotasks,
    removeExecutions
  ], next );
} );




// Methods
// ---
TaskSchema.methods.isPrivate = function() {
  return this.private;
};

TaskSchema.methods.addMicrotasks = function( microtasks, callback ) {
  // Transform into array in case of single object (normalize behaviour).
  if( !_.isArray( microtasks ) )
    microtasks = [ microtasks ];

  log.trace( 'Adding %s microtasks to the task', microtasks.length );

  var thisTask = this;

  _.each( microtasks, function( microtask ) {
    thisTask.microtasks.addToSet( microtask );
  } );

  this.save( function( err, task ) {
    if( err ) return callback( err );

    // Trigger the `ADD_MICROTASK` event
    CRM.execute( 'ADD_MICROTASK', {
      task: task,
      microtasks: microtasks
    }, callback );
  } );
};



// ### Task open
TaskSchema.methods.open = function( callback ) {
  var thisTask = this;
  log.trace( 'Opening task %s', this.id );

  // Trigger the OPEN_TASK event.
  CRM.execute( 'OPEN_TASK', { task: this }, function( err ) {
    if( err ) return callback( err );

    // Set the task as `OPENED`.
    thisTask.set( 'status', TaskStatuses.OPENED );

    thisTask.save( function( err ) {
      if( err ) return callback( err );
      log.trace( 'Task opened' );

      return callback();
    } );
  } );
};

// ### Task close
TaskSchema.methods.closeTask = function(callback) {
  var thisTask = this;

  log.trace( 'Closing task', this.id );

  this.set( 'status', TaskStatuses.CLOSED );
  this.set('closedDate', Date.now());

  this.save( function( err ) {
    if( err ) return callback( err );

    // Trigget the `END_TASK` event
    CRM.execute( 'END_TASK', { task: thisTask }, callback );
  });
};

// ### Objects handling
TaskSchema.methods.canAddObjects = function() {
  // If the Task is in one of these statuses then we are able to add objects,
  // otherwise we cannot
  return this.status<TaskStatuses.FINALIZED;
};
// Useful method to add objects to the Task
TaskSchema.methods.addObjects = function( objects, callback ) {

  log.trace( 'Adding objects to Task %s', this._id );

  // check if we can add objects to the task
  if( this.canAddObjects() ) {
    log.trace( 'Can add objects' );

    // Keep a pointer to the task document, to use later
    var thisTask = this;

    // First find the job
    var retrieveJob = function( callback ) {
      thisTask.model( 'job' ).findById( thisTask.job, callback );
    };

    // then add the objects to the job
    var addObjectsToJob = function( job, callback ) {
      if( !job ) return callback( new Error( 'Unable to find the job' ) );

      job.addObjects( objects, callback );
    };

    // eventually add the objects to the task
    var addObjectsToTask = function( objectList, callback ) {
      _.each( objectList, function( object ) {
        thisTask.objects.addToSet( object );
      } );

      thisTask.save( function( err ) {
        // Emit the event that notifies that we added a set of new objects
        //CRM.notify( 'ADD_OBJECTS', thisTask, objectList );
        // Pass the list of created objects
        return callback( err, objectList );
      } );
    };

    // Execute the function list
    async.waterfall( [
      retrieveJob,
      addObjectsToJob,
      addObjectsToTask
    ], callback );

  } else {
    // The task has already recieved the `EOF` signal, no more objects can be added
    log.debug( 'Unable to add objects to the task with status "%s"', this.status );
    return callback( new Error( 'Unable add objects to the task' ) );
  }
};

// ### Useful methods
// Perform the invitation strategy. 
// If no data is passed then it performs the current strategy
// Otherwise it will use the new strategy passed in the strategy object
TaskSchema.methods.invite = function(strategy,callback){

  if(!strategy || _.isUndefined(strategy) || _.isEmpty(strategy)){
    log.trace('Re-executiong the same invitation strategy');

    var data = {};
    data.task = this;
    this.performInvitationStrategy(data,callback);

  }else{

    log.trace('A new strategy %j has been selected',strategy);
    var _this = this;

    var setNewStrategy = function(callback){
      log.trace('Setting the new strategy');
      _this.setInvitationStrategy(strategy,callback);
    };

    var performStrategy = function(callback){
      log.trace('Performing the new strategy');
      var data = {};
      data.task = _this;
      _this.performInvitationStrategy(data,callback);
    };

    var actions = [setNewStrategy,performStrategy];

    async.series(actions,callback);
  }


};

// Perform the splitting strategy and replan the task on other platform (if needed)
TaskSchema.methods.replan = function(strategy,platformName,callback){

  var _this = this;

  var d = domain.create();

  d.on('error',callback);

  var initCronJob = function(microtask,platform){
    log.trace( 'Scheduling CronJob' );

    // Create a `domain` to handle cron job exceptions
    var cronDomain = domain.create();
    cronDomain.on( 'error', function( err ) {
      log.error( 'CronJob', err );
    } );

    // Import the platform implementation
    var platformImplementation = common.platforms[ platform.name ];

    var cronJob;
    var tickFunction = function() {
      microtask
      .populate( 'task operations platforms',cronDomain.bind( function( err, microtask ) {

        // call the tick function
        platformImplementation.timed.onTick( microtask.task, microtask, platform, cronJob );
      } ) );
    };

     // Schedule the job and start it!
    var cronExpression = platformImplementation.timed.expression;
    cronJob = schedule.scheduleJob( cronExpression, tickFunction );
  };

  // Set the new strategy (if passed)
  var setStrategy = function(callback){
    if(_.isUndefined(strategy)){
      log.trace('Using the old strategy');
      return callback();
    }

    log.trace('Setting the new strategy');
    _this.setSplittingStrategy(strategy,d.bind(function(err){
      if (err){
        log.error(err);
        return callback(err);
      }

      return callback();
    }));
  };

  // Perform the splittig strategy
  var performStrategy = function(callback){
    log.trace('Performing the strategy');
    var data = {};
    data.task = _this;
    _this.performSplittingStrategy(data,function(err,microtasks){
      if(err) return callback(err);

      return callback(null,microtasks);
    });
  };

  // Init the platform
  var initPlatform = function( microtasks,callback){
    log.trace('Init the platform (if needed)');

    log.trace('%s microtasks were created',microtasks.length);

    if(_.isEmpty(microtasks)){
      log.trace('No microtasks were created');
      return callback();
    }

    // I need the platform object
    _this.populate('platforms',function(err,task){
      if(err) return callback(err);

      var platform = _.findWhere(task.platforms,{name:platformName});

      if(_.isUndefined(platform)){
        log.error('The selected platform (%s) was not configured',platformName);
        return callback(new Error('The selected platform was not configured'));
      }

      var platformImpl = common.platforms[platformName];

      var postMicroTask = function(microtask,callback){
        log.trace('Initalazing the platform for the microtask %s',microtask.id);

        platformImpl.init(task,microtask,platform,function(err){
          if(err) return callback(err);

          if(platformImpl.timed){
            initCronJob(microtask,platform);
          }

          return callback();
        });
      };

      async.eachSeries(microtasks,postMicroTask,callback);

    });
  };

  var actions = [setStrategy,performStrategy,initPlatform];

  async.waterfall(actions,callback);
};


exports = module.exports = TaskSchema;