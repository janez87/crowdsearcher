// Load libraries
var _ = require( 'underscore' );
var mongo = require( 'mongoose' );
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Task model'
} );

// Import Mongoose Classes and Objects
var MongoError = mongo.Error;
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// Import mongoose schemata.
var ControlRule = require( './controlrule' );

// Import the CRM for handling task events
var CRM = require( '../core/CRM' );

// # Task definition
// The task is the core component of the CS.

// ## Schema
//
// Mongoose schema for the Task entity.
var TaskSchema = new Schema( {
    // ### General data
    //
    // The name of the task.
    name: {
      index: true,
      type: String,
      required: true,
      trim: true
    },
    // The `private` attribute is a flag that states if a user **must** be present for each `Execution`.
    'private': {
      type: Boolean,
      'default': false
    },


    // ### Markdown-enabled fileds that contains text abount the task.
    //
    // The description of the Task.
    description: {
      type: String
    },
    // The landing page of the Task, will be rendered using markdown.
    landing: {
      type: String
    },
    // The ending page of the Task, will be rendered using markdown.
    ending: {
      type: String
    },


    // ### Status
    //
    // Current status of the Task.
    // The status changes how the Task behave to some events/requests.
    status: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      'enum': [
        // The Task has been posted to the CS, no event/rule will be triggered in this state
        'CREATED',

        // The Task has been **activated**, this means that all the events can now be triggered.
        // Setting the state to `OPENED` will trigger the `OPEN_TASK` event.
        'OPENED',

        // The Task will no longer accept incoming objects from any source.
        // Setting the state to `FINALIZED` will trigger the `EOF_TASK` event.
        'FINALIZED',

        //'WAIT',
        //'SUSPENDED',

        // The Task has been closed, it will not accept any `Object`/`Microtask` and `Execution`s.
        // Setting the state to `CLOSED` will trigger the `END_TASK` event and set the `closedDate`
        // field to the current date.
        'CLOSED'
      ],
      'default': 'CREATED'
    },

    // Ordered list of control rules for the Task.
    // See `ControlRule` model.
    controlrules: [ ControlRule ],


    // ### References
    //
    // Reference to the `Job` container for this Task.
    job: {
      index: true,
      required: true,
      type: ObjectId,
      ref: 'job'
    },

    // Unique list of `Object`s of the Task.
    objects: {
      type: [ {
        type: ObjectId,
        ref: 'object'
      } ],
      'default': []
    },


    // Unique list of `Microtask`s of the Task. Each microtask is a *reference* to a `Microtask` model.
    microtasks: {
      type: [ {
        type: ObjectId,
        ref: 'microtask'
      } ],
      'default': []
    },


    // ### Time data
    //
    // Creation date of the object. By default it will be the first save of the object.
    createdDate: {
      required: true,
      type: Date,
      'default': Date.now
    },

    // Closed date of the object. Will be available only after **closing** the task.
    openedDate: {
      type: Date,
      'default': null
    },

    // Closed date of the object. Will be available only after **closing** the task.
    finalizedDate: {
      type: Date,
      'default': null
    },

    // Closed date of the object. Will be available only after **closing** the task.
    closedDate: {
      type: Date,
      'default': null
    }
  },

  /// ## Schema options
  //
  {
    // Do not allow to add random properties to the model.
    strict: true,
    // Disable index check in production.
    autoIndex: process.env.PRODUCTION ? false : true
  } );









// ## Plugins to add to the Task model.
//
// Add the `metadata` fileld to the entity.
TaskSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
TaskSchema.plugin( require( './plugins/accessKeyPlugin' ) );
// Add the `operations` plugin.
TaskSchema.plugin( require( './plugins/operationsPlugin' ) );
// Add the `platforms` plugin.
TaskSchema.plugin( require( './plugins/platformsPlugin' ) );
// Load the plugin for handling different strategies
TaskSchema.plugin( require( './plugins/strategyPlugin' ), {
  strategy: 'splitting',
  method: 'split'
} );
TaskSchema.plugin( require( './plugins/strategyPlugin' ), {
  strategy: 'assignment',
  method: 'assign'
} );
TaskSchema.plugin( require( './plugins/strategyPlugin' ), {
  strategy: 'implementation',
  method: 'implementation'
} );
TaskSchema.plugin( require( './plugins/strategyPlugin' ), {
  strategy: 'invitation',
  method: 'invite'
} );






// # Task calculated fields
//
// Boolean indicating if the task is created.
TaskSchema.virtual( 'created' )
  .get( function() {
    return this.status === 'CREATED';
  } );
// Boolean indicating if the task is opened.
TaskSchema.virtual( 'opened' )
  .get( function() {
    return this.status === 'OPENED';
  } );
// Boolean indicating if the task is finalized.
TaskSchema.virtual( 'finalized' )
  .get( function() {
    return this.status === 'FINALIZED';
  } );
// Boolean indicating if the task is closed.
TaskSchema.virtual( 'closed' )
  .get( function() {
    return this.status === 'CLOSED';
  } );
// Boolean indicating if the task is editable.
TaskSchema.virtual( 'editable' )
  .get( function() {
    return this.opened || ( this.status === 'CREATED' );
  } );







// # Task instance methods
//
// ## Checks
//
// Checks if the current task can be opened.
TaskSchema.methods.canOpen = function( callback ) {
  // The Task can be opened only if is in the `CREATED` state.
  if ( this.status !== 'CREATED' )
    return callback( new MongoError( 'Status is not "CREATED"' ) );

  // Must have at least a `Platform`.
  if ( this.platforms.length === 0 )
    return callback( new MongoError( 'No platforms specified' ) );

  // Must have at least an `Operation`.
  if ( this.operations.length === 0 )
    return callback( new MongoError( 'No operations specified' ) );

  // Everything ok
  return callback();
};


// ## Events
//
// Shortcut for triggering events using the given data as payload.
// The payload **always** have a `task` key containing the id of the current task.
TaskSchema.methods.fire = function( event, data, callback ) {
  if ( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }
  return CRM.trigger( event, _.defaults( {
    task: this._id
  }, data ), callback );
};

// Opens the current task. The `OPEN_TASK` event will be triggered **after** setting the
// status field to `OPENED`.
TaskSchema.methods.open = function( callback ) {
  var _this = this;
  // Skip if already opened.
  if ( this.opened || this.finalized || this.closed )
    return callback( new MongoError( 'Already opened' ) );

  // Checks if the task can be opened.
  this.canOpen( function( err ) {
    if ( err ) return callback( err );

    log.debug( 'Opening task %s', _this._id );

    _this.set( 'status', 'OPENED' );
    _this.set( 'openedDate', Date.now() );

    _this.save( function( err ) {
      if ( err ) return callback( err );

      _this.fire( 'OPEN_TASK', callback );
    } );
  } );
};

// Closes the current task. The `EOF_TASK` event will be triggered **after** setting the
// status field to `FINALIZED`.
TaskSchema.methods.finalize = function( callback ) {
  var _this = this;

  // Skip if already finalized or closed.
  if ( this.finalized || this.closed )
    return callback( new MongoError( 'Already finalized' ) );

  log.debug( 'Finalizing task', this._id );

  this.set( 'status', 'FINALIZED' );
  this.set( 'finalizedDate', Date.now() );

  this.save( function( err ) {
    if ( err ) return callback( err );

    _this.fire( 'EOF_TASK', callback );
  } );
};

// Closes the current task. The `END_TASK` event will be triggered **after** setting the
// status field to `CLOSED`.
// **Note*:**
// This function ensures that the task is first finalized. If not the function will first call
// the `finalize` method and then the actual close method.
TaskSchema.methods.close = function( callback ) {
  var _this = this;

  // Skip if already closed.
  if ( this.closed )
    return callback( new MongoError( 'Already closed' ) );

  // If the task is not finalized, then first finalize it.
  if ( !this.finalized ) {
    return this.finalize( function( err ) {
      if ( err ) return callback( err );
      _this.close( callback );
    } );
  }

  // Close the task.
  log.debug( 'Closing task', this._id );


  function closeTask( err ) {
    if ( err ) return callback( err );
    _this.set( 'status', 'CLOSED' );
    _this.set( 'closedDate', Date.now() );

    _this.save( function( err ) {
      if ( err ) return callback( err );

      _this.fire( 'END_TASK', callback );
    } );
  }

  // Close all the microtasks
  var microtaskIds = this.populated( 'microtasks' ) || this.microtasks;
  var Microtask = this.model( 'microtask' );
  Microtask
    .find()
    .where( '_id' )
    . in ( microtaskIds )
    .where( 'status' )
    .ne( 'CLOSED' )
    .exec( function( err, microtasks ) {
      if ( err ) return callback( err );

      function closeMicrotask( microtask, cb ) {
        return microtask.close( cb );
      }

      async.each( microtasks, closeMicrotask, closeTask );
    } );
};


// Method that return a clone of the task.
// The object returned is a plan JavaScript object containing the same properties of
// the original task a part from the microtasks and the metadata.
// The objects are cloned
TaskSchema.methods.clone = function( callback ) {

  log.trace( 'Cloning the task %s', this._id );

  var attributes = [ 'name',
    'description',
    'controlrules',
    'operations',
    'objects',
    'platforms',
    'assignmentStrategy',
    'implementationStrategy',
    'invitationStrategy',
    'splittingStrategy',
    'job'
  ];

  this
    .populate( 'platforms objects operations', function( err, task ) {
      if ( err ) return callback( err );

      var clonedTask = {};

      // Cloning the plain attributes
      clonedTask = _.pick( task, attributes );

      log.trace( 'Removing the mongo stuff from the rules' );

      for ( var i = 0; i < clonedTask.controlrules.length; i++ ) {
        log.trace( 'i=%s', i );
        var rule = clonedTask.controlrules[ i ];
        clonedTask.controlrules[ i ] = _.pick( rule, [ 'name', 'params' ] );
      }


      log.trace( 'Removing the mongo stuff from the operations' );

      for ( var i = 0; i < clonedTask.operations.length; i++ ) {
        log.trace( 'i=%s', i );
        var operation = clonedTask.operations[ i ];
        clonedTask.operations[ i ] = _.pick( operation, [ 'name', 'params', 'label' ] );
      }


      log.trace( 'Removing the mongo stuff from the platforms' );

      for ( var i = 0; i < clonedTask.platforms.length; i++ ) {
        log.trace( 'i=%s', i );
        var platform = clonedTask.platforms[ i ];
        clonedTask.platforms[ i ] = _.pick( platform, [ 'name', 'params', 'execution', 'enabled', 'invitation' ] );
      }

      log.trace( 'Removing the mongo stuff from the objects' );

      for ( var i = 0; i < clonedTask.objects.length; i++ ) {
        log.trace( 'i=%s', i );
        var object = clonedTask.objects[ i ];
        clonedTask.objects[ i ] = _.pick( object, 'data' );
      }

      log.trace( '%j', clonedTask );

      return callback( null, clonedTask );


    } );
};

// ## Object
//

// Handy method for adding objects to the task.
// The objects can be either instances of the `Object` entity or plain JS objects.
// After calling this method the `ADD_OBJECTS` event will be triggered.
TaskSchema.methods.addObjects = function( objects, callback ) {
  var _this = this;

  var ObjectModel = this.model( 'object' );

  // Check if the task can accept new objects.
  if ( !this.editable )
    return callback( new MongoError( 'Task not editable, status: ' + this.status ) );

  // Normalize behaviour.
  if ( !_.isArray( objects ) )
    objects = [ objects ];

  // Filter invalid object and add the task parameter to all the elements in
  // the array, so they became valid `Object` entities.
  var objects = _.filter( objects, function( object ) {
    if ( ( object instanceof ObjectModel ) || _.isObject( object ) ) {
      object.task = _this._id;
      return true;
    } else {
      return false;
    }
  } );

  // If no object will be added then exit.
  if ( objects.length === 0 )
    return callback();

  log.debug( 'Adding %s objects to the task %s', objects.length, _this._id );

  // Bulk create `Object` entities using mongoose create method.
  ObjectModel.create( objects, function( err ) {
    if ( err ) return callback( err );

    // Convert into plain array.
    var args = _.toArray( arguments );
    // Remove the `err` param and get all the created objects.
    args.shift();

    // Add all the objects to the current task.
    _this.objects.addToSet.apply( _this.objects, args );

    // Persist the changes.
    _this.save( function( err ) {
      if ( err ) return callback( err );

      // Send the Ids
      var objectIds = _.map( args, function( object ) {
        return object._id;
      } );

      // Once all the changes are saved trigger the `ADD_OBJECTS`.
      _this.fire( 'ADD_OBJECTS', {
        objects: objectIds
      }, callback );
    } );
  } );
};




// ## Microtask
//
// Handy method for adding microtasks to the task.
// After calling this method the `ADD_MICROTASKS` event will be triggered.
TaskSchema.methods.addMicrotasks = function( microtasks, callback ) {
  var _this = this;

  var Microtask = this.model( 'microtask' );

  // Check if the task can accept new microtasks.
  if ( this.closed || this.finalized )
    return callback( new MongoError( 'Status is "' + this.status + '"' ) );

  // Normalize behaviour.
  if ( !_.isArray( microtasks ) )
    microtasks = [ microtasks ];

  log.debug( 'Adding %s microtasks to the task %s', microtasks.length, this._id );

  // Add the application key and the Task reference to each microtask.
  _.each( microtasks, function( microtask ) {
    microtask.applicationKey = _this.applicationKey;
    microtask.task = _this._id;
  } );

  // Bulk create the tasks
  Microtask.create( microtasks, function( err ) {
    if ( err ) return callback( err );

    // Convert into plain array.
    var args = _.toArray( arguments );
    // Remove the `err` param and get all the created microtasks.
    args.shift();

    // Add all the microtasks to the current task.
    _this.microtasks.addToSet.apply( _this.microtasks, args );

    // Persist the changes
    _this.save( function( err ) {
      if ( err ) return callback( err );

      // Send the Ids
      var microtaskIds = _.map( args, function( microtask ) {
        return microtask._id;
      } );

      _this.fire( 'ADD_MICROTASKS', {
        microtasks: microtaskIds
      }, callback );
    } );
  } );
};



// # Middlewares
//
// ## Pre-remove middleware
// Removes all the data associated with this task, including microtasks, objects and executions.
TaskSchema.pre( 'remove', function( next ) {
  var _this = this;

  function remove( entity, cb ) {
    entity.remove( cb );
  }

  function removeMicrotasks( callback ) {
    log.debug( 'Removing microtasks' );

    var Microtask = CS.models.microtask;
    Microtask
      .find()
      .where( 'task', _this._id )
      .exec( function( err, microtasks ) {
        if ( err ) return callback( err );

        async.each( microtasks, remove, function( err ) {
          if ( err ) return callback( err );

          log.debug( 'All microtasks removed' );
          return callback();
        } );
      } );
  }

  function removePlatforms( callback ) {
    log.debug( 'Removing platforms' );

    var Platform = CS.models.platform;
    Platform
      .find()
      .where( '_id' )[ 'in' ]( _this.platforms )
      .exec( function( err, platforms ) {
        if ( err ) return callback( err );

        async.each( platforms, remove, function( err ) {
          if ( err ) return callback( err );

          log.debug( 'All platforms removed' );
          return callback();
        } );
      } );
  }

  function removeOperations( callback ) {
    log.debug( 'Removing operations' );

    var Operation = CS.models.operation;
    Operation
      .find()
      .where( '_id' )[ 'in' ]( _this.operations )
      .exec( function( err, operations ) {
        if ( err ) return callback( err );

        async.each( operations, remove, function( err ) {
          if ( err ) return callback( err );

          log.debug( 'All operations removed' );
          return callback();
        } );
      } );
  }

  function removeObjects( callback ) {
    log.debug( 'Removing objects' );

    var ObjectModel = CS.models.object;
    ObjectModel
      .find()
      .where( '_id' )[ 'in' ]( _this.objects )
      .exec( function( err, objects ) {
        if ( err ) return callback( err );

        async.each( objects, remove, function( err ) {
          if ( err ) return callback( err );

          log.debug( 'All objects removed' );
          return callback();
        } );
      } );
  }

  function removeControlMart( callback ) {
    log.debug( 'Removing control mart' );
    //log.debug( 'All control mart data removed' );
    return callback();
  }

  var actions = [
    removeMicrotasks,
    removePlatforms,
    removeOperations,
    removeObjects,
    removeControlMart
  ];

  async.series( actions, function( err ) {
    if ( err ) return next( err );

    log.debug( 'Task removed' );
    return next();
  } );

} );









// OLD METHODS, rewrite

// ### Useful methods
// Perform the invitation strategy.
// If no data is passed then it performs the current strategy
// Otherwise it will use the new strategy passed in the strategy object
TaskSchema.methods.invite = function( strategy, callback ) {

  if ( !strategy || _.isUndefined( strategy ) || _.isEmpty( strategy ) ) {
    log.trace( 'Re-executiong the same invitation strategy' );

    var data = {};
    data.task = this;
    this.performInvitationStrategy( data, callback );

  } else {

    log.trace( 'A new strategy %j has been selected', strategy );
    var _this = this;

    var setNewStrategy = function( callback ) {
      log.trace( 'Setting the new strategy' );
      _this.setInvitationStrategy( strategy, callback );
    };

    var performStrategy = function( callback ) {
      log.trace( 'Performing the new strategy' );
      var data = {};
      data.task = _this;
      _this.performInvitationStrategy( data, callback );
    };

    var actions = [ setNewStrategy, performStrategy ];

    async.series( actions, callback );
  }


};

// Perform the splitting strategy and replan the task on other platform (if needed)
TaskSchema.methods.replan = function( strategy, platformName, callback ) {

  var _this = this;

  var d = domain.create();

  d.on( 'error', callback );

  var initCronJob = function( microtask, platform ) {
    log.trace( 'Scheduling CronJob' );

    // Create a `domain` to handle cron job exceptions
    var cronDomain = domain.create();
    cronDomain.on( 'error', function( err ) {
      log.error( 'CronJob', err );
    } );

    // Import the platform implementation
    var platformImplementation = CS.platforms[ platform.name ];

    var cronJob;
    var tickFunction = function() {
      microtask
        .populate( 'task operations platforms', cronDomain.bind( function( err, microtask ) {

          // call the tick function
          platformImplementation.timed.onTick( microtask.task, microtask, platform, cronJob );
        } ) );
    };

    // Schedule the job and start it!
    var cronExpression = platformImplementation.timed.expression;
    cronJob = schedule.scheduleJob( cronExpression, tickFunction );
  };

  // Set the new strategy (if passed)
  var setStrategy = function( callback ) {
    if ( _.isUndefined( strategy ) ) {
      log.trace( 'Using the old strategy' );
      return callback();
    }

    log.trace( 'Setting the new strategy' );
    _this.setSplittingStrategy( strategy, d.bind( function( err ) {
      if ( err ) {
        log.error( err );
        return callback( err );
      }

      return callback();
    } ) );
  };

  // Perform the splittig strategy
  var performStrategy = function( callback ) {
    log.trace( 'Performing the strategy' );
    var data = {};
    data.task = _this;
    _this.performSplittingStrategy( data, function( err, microtasks ) {
      if ( err ) return callback( err );

      return callback( null, microtasks );
    } );
  };

  // Init the platform
  var initPlatform = function( microtasks, callback ) {
    log.trace( 'Init the platform (if needed)' );

    log.trace( '%s microtasks were created', microtasks.length );

    if ( _.isEmpty( microtasks ) ) {
      log.trace( 'No microtasks were created' );
      return callback();
    }

    // I need the platform object
    _this.populate( 'platforms', function( err, task ) {
      if ( err ) return callback( err );

      var platform = _.findWhere( task.platforms, {
        name: platformName
      } );

      if ( _.isUndefined( platform ) ) {
        log.error( 'The selected platform (%s) was not configured', platformName );
        return callback( new Error( 'The selected platform was not configured' ) );
      }

      var platformImpl = CS.platforms[ platformName ];

      var postMicroTask = function( microtask, callback ) {
        log.trace( 'Initalazing the platform for the microtask %s', microtask.id );

        platformImpl.init( task, microtask, platform, function( err ) {
          if ( err ) return callback( err );

          if ( platformImpl.timed ) {
            initCronJob( microtask, platform );
          }

          return callback();
        } );
      };

      async.eachSeries( microtasks, postMicroTask, callback );

    } );
  };

  var actions = [ setStrategy, performStrategy, initPlatform ];

  async.waterfall( actions, callback );
};


// Export the schema.
exports = module.exports = TaskSchema;