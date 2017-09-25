'use strict';
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
let mongo = require( 'mongoose' );
let async = require( 'async' );
let domain = require( 'domain' );
let moment = require( 'moment' );
let CS = require( '../core' );

// Create a child logger
let log = CS.log.child( {
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


    // Task Type
    taskType: {
      type: String,
      trim: true
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
  let promise = Promise.resolve();

  // The Task can be opened only if is in the `CREATED` state.
  if( this.status!=='CREATED' ) {
    let error = new MongoError( 'Status is not "CREATED"' );
    promise = Promise.reject( error );
  }

  // Must have at least a `Platform`.
  if( this.platforms.length===0 ) {
    let error = new MongoError( 'No platforms specified' );
    promise = Promise.reject( error );
  }

  // Must have at least an `Operation`.
  if( this.operations.length===0 ) {
    let error = new MongoError( 'No operations specified' );
    promise = Promise.reject( error );
  }

  // Everything ok
  return promise
  .asCallback( callback );
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

  return CRM
  .trigger( event, _.defaults( {
    task: this._id
  }, data ) )
  .asCallback( callback );
};

// Opens the current task. The `OPEN_TASK` event will be triggered **after** setting the
// status field to `OPENED`.
TaskSchema.methods.open = function( callback ) {
  let promise = Promise.resolve();

  // Skip if already opened.
  if( this.opened || this.finalized || this.closed ) {
    let error = new MongoError( `Already opened (${this.status})` );
    promise = Promise.reject( error );
  } else {
    // Checks if the task can be opened.
    promise = this.canOpen();
  }

  return promise
  .then( () => {
    log.debug( 'Opening task %s', this._id );

    this.set( 'status', 'OPENED' );
    this.set( 'openedDate', Date.now() );

    log.trace( 'Saving task' );
    return this.update( {
      status: this.status,
      openedDate: this.openedDate,
    } );
  } )
  .then( () => {
    log.trace( 'Triggering OPEN_TASK' );
    return this.fire( 'OPEN_TASK' );
  } )
  .asCallback( callback );
};

// Closes the current task. The `EOF_TASK` event will be triggered **after** setting the
// status field to `FINALIZED`.
TaskSchema.methods.finalize = function( callback ) {
  let promise = Promise.resolve();

  // Skip if already finalized or closed.
  if( this.finalized || this.closed ) {
    let error = new MongoError( 'Already finalized' );
    promise = Promise.reject( error );
  }

  return promise
  .then( () => {
    log.debug( 'Finalizing task', this._id );

    this.set( 'status', 'FINALIZED' );
    this.set( 'finalizedDate', Date.now() );

    return this.save();
  } )
  .then( () => {
    return this.fire( 'EOF_TASK' );
  } )
  .asCallback( callback );
};

// Closes the current task. The `END_TASK` event will be triggered **after** setting the
// status field to `CLOSED`.
// **Note*:**
// This function ensures that the task is first finalized. If not the function will first call
// the `finalize` method and then the actual close method.
TaskSchema.methods.close = function( callback ) {
  let promise = Promise.resolve();

  // Skip if already closed.
  if( this.closed ) {
    let error = new MongoError( 'Already closed' );
    promise = Promise.reject( error );
  // If the task is not finalized, then first finalize it.
  } else if( !this.finalized ) {
    promise = this.finalize();
  }

  return promise
  .then( () => {
    // Find all the microtasks to close
    let microtaskIds = this.populated( 'microtasks' ) || this.microtasks;
    let Microtask = this.model( 'microtask' );

    return Microtask
    .find()
    .where( '_id' ).in( microtaskIds )
    .where( 'status' ).ne( 'CLOSED' )
    .exec();
  } )
  .then( microtasks => {
    // Close all the microtasks
    return Promise
    .each( microtasks, microtask => microtask.close() );
  } )
  .then( () => {
    // Close the task.
    log.debug( 'Closing task', this._id );

    this.set( 'status', 'CLOSED' );
    this.set( 'closedDate', Date.now() );

    return this.save();
  } )
  .then( () => {
    return this.fire( 'END_TASK' );
  } )
  .asCallback( callback );
};


// Method that return a clone of the task.
// The object returned is a plan JavaScript object containing the same properties of
// the original task a part from the microtasks and the metadata.
// The objects are cloned
TaskSchema.methods.clone = function( callback ) {
  log.trace( 'Cloning the task %s', this._id );

  var attributes = [
    'name',
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
  let ObjectModel = this.model( 'object' );

  // Check if the task can accept new objects.
  if( !this.editable ) {
    let error = new MongoError( `Task not editable, status: ${this.status}` );
    return Promise.reject( error ).asCallback( callback );
  }

  // Normalize behaviour.
  if( !_.isArray( objects ) ) {
    objects = [ objects ];
  }

  // Filter invalid object and add the task parameter to all the elements in
  // the array, so they became valid `ObjectModel` entities.
  objects = _.filter( objects, object => {
    if ( (object instanceof ObjectModel) || _.isObject( object ) ) {
      return true;
    } else {
      return false;
    }
  } );

  // If no object will be added then exit.
  if( objects.length===0 ) {
    return Promise.resolve().asCallback( callback );
  }

  let collection = ObjectModel.collection;
  let bulk = collection.initializeUnorderedBulkOp();

  // debugger;
  // Add each object to the bulk, make them mongoose-like objects
  log.debug( 'Convet objects to mongoose-like documents' );
  _.each( objects, o => {
    o.task = this._id;
    o.metadata = [];
    o.status = 'CREATED';
    o.closedDate = null;
    o.createdDate = new Date();
    o.__v = 0;

    // Add to the bulk operation
    bulk.insert( o );
  } );

  // Bulk create the objects
  log.debug( 'Adding %d objects to the task %s', objects.length, this._id );
  return Promise
  .resolve( bulk.execute() )
  .then( res => {
    let ids = res.getInsertedIds();
    log.trace( 'Objects saved to DB' );

    log.trace( 'Inserted %d ids', ids.length );
    return ids;
  } )
  .tap( ids => {
    return this.update( {
      $push: {
        objects: {
          $each: ids,
        },
      },
    } )
    .exec();
  } )
  .then( ids => {
    log.trace( 'Objects added to the task' );

     // Once all the changes are saved trigger the `ADD_OBJECTS`.
    return this.fire( 'ADD_OBJECTS', {
      objects: ids,
    } );
  } )
  .asCallback( callback );
};


TaskSchema.methods.isBanned = function( performer, callback ) {
  let redis = CS.redis;

  let key = `${this._id}:${performer}`;

  return redis
  .hget( key, 'banned' )
  .then( isBanned => {
    return isBanned==='true';
  } )
  .asCallback( callback );
};


// ## Microtask
//
// Handy method for adding microtasks to the task.
// After calling this method the `ADD_MICROTASKS` event will be triggered.
TaskSchema.methods.addMicrotasks = function( microtasks, callback ) {
  let Microtask = this.model( 'microtask' );

  // Check if the task can accept new microtasks.
  if( this.closed || this.finalized ) {
    let error = new MongoError( `Cannot add microtasks, status: ${this.status}` );
    return Promise.reject( error ).asCallback( callback );
  }

  // Normalize behaviour.
  if( !_.isArray( microtasks ) ) {
    microtasks = [ microtasks ];
  }

  // If no microtasks will be added then exit.
  if( microtasks.length===0 ) {
    log.trace( 'No microtasks to create, go on' );
    return Promise.resolve().asCallback( callback );
  }

  let collection = Microtask.collection;
  let bulk = collection.initializeUnorderedBulkOp();

  // debugger;
  // Add each object to the bulk, make them mongoose-like objects
  log.trace( 'Convet microtasks to mongoose-like documents' );
  _.each( microtasks, m => {
    m.task = this._id;
    m.metadata = [];
    m.status = 'CREATED';
    m.closedDate = null;
    m.createdDate = new Date();
    m.__v = 0;

    // Add to the bulk operation
    bulk.insert( m );
  } );

  // Bulk create the microtasks
  log.debug( 'Adding %d microtasks to the task %s', microtasks.length, this._id );
  return Promise
  .resolve( bulk.execute() )
  .then( res => {
    let ids = res.getInsertedIds();
    log.trace( 'Microtasks saved to DB' );

    log.trace( 'Inserted %d ids', ids.length );
    return ids;
  } )
  .tap( ids => {
    return this.update( {
      $push: {
        microtasks: {
          $each: ids,
        },
      },
    } )
    .exec();
  } )
  .then( ids => {
    log.trace( 'Microtasks added to the task' );

    // Once all the changes are saved trigger the `ADD_MICROTASKS`.
    return this.fire( 'ADD_MICROTASKS', {
      microtasks: ids,
    } );
  } )
  .asCallback( callback );
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

    var ControlMart = CS.models.controlmart;
    ControlMart
      .find()
      .where( 'task', _this._id )
      .exec( function( err, rows ) {
        if ( err ) return callback( err );

        async.each( rows, remove, function( err ) {
          if ( err ) return callback( err );

          log.debug( 'All control mart data removed' );
          return callback();
        } );
      } );
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



TaskSchema.methods.reinvite = function( platformNames, callback ) {
  log.trace( 'Reinviting the performer for the task %s', this._id );

  if ( _.isUndefined( platformNames ) ) {
    callback = platformNames;
  } else if ( !_.isArray( platformNames ) ) {
    platformNames = [ platformNames ];
  }

  var platforms = this.platforms;

  var _this = this;
  var getPlatform = function( id, cb ) {
    var Platform = _this.model( 'platform' );

    Platform
      .findById( id )
      .exec( function( err, platform ) {
        if ( err ) return cb( err );
        if ( !platform ) return cb( new Error( 'Not platform found' ) );

        if ( platformNames.length > 0 && platformNames.indexOf( platform.name ) === -1 ) {
          log.trace( 'Platform %s not selected', platform.name );
          return cb();
        }

        if ( platform.enabled && platform.invitation ) {
          var implementation = CS.platforms[ platform.name ];

          log.trace( 'Reinviting the user on %s', platform.name );
          return implementation.invite( platform.params, _this, {}, function( err ) {
            if ( err ) return cb( err );

            log.trace( 'bla' );

            return cb();
          } );
        } else {
          log.trace( '%s not a valid platform for the invitation', platform.name );
          return cb();
        }

      } );
  };


  return async.each( platforms, getPlatform, callback );


};






// OLD METHODS, rewrite

// ### Useful methods
// Perform the invitation strategy.
// If no data is passed then it performs the current strategy
// Otherwise it will use the new strategy passed in the strategy object

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






// # Info methods
//
// ## getInfo
// Get the specified information about the task.
// name can be one of `executions`, `answers`, `objects`, `lifecycle` and `quality`

TaskSchema.methods.getInfo = function( name, callback ) {
  var doAll = false;
  if ( arguments.length === 1 ) {
    callback = name;
    doAll = true;
    log.trace( 'Getting all info for task %s', this._id );
  }

  if ( arguments.length === 2 ) {
    name = name.toLowerCase();
    log.trace( 'Getting "%s" info for task %s', name, this._id );
  }



  var fields = [];

  if ( doAll || name === 'executions' )
    fields.push( 'executions' );
  if ( doAll || name === 'answers' )
    fields.push( 'answers' );
  if ( doAll || name === 'objects' )
    fields.push( 'objects' );
  if ( doAll || name === 'lifecycle' )
    fields.push( 'lifecycle' );

  var ControlMart = CS.models.controlmart;

  ControlMart.select( {
    task: this._id
  }, fields, function( err, controlmart ) {
    if ( err ) return callback( err );

    var output = {};
    _.each( controlmart, function( v ) {
      output[ v.name ] = v.data;
    } );

    return callback( err, output );
  } );
};

TaskSchema.methods.getQuality = function( callback ) {
  return callback( new Error( 'Not implemented' ) );
};
TaskSchema.methods.getExecutionsInfo = function( callback ) {
  var Execution = CS.models.execution;

  Execution
    .getExecutionsInfo( this, callback );
};
TaskSchema.methods.getAnswersCount = function( callback ) {
  var Execution = CS.models.execution;

  Execution
    .getAnswersCount( this, callback );
};
TaskSchema.methods.getObjectsInfo = function( callback ) {
  var ObjectModel = CS.models.object;

  ObjectModel
    .getObjectsInfo( this, callback );
};
TaskSchema.methods.getLifecycleInfo = function( callback ) {
  var Execution = CS.models.execution;
  var _this = this;

  Execution
    .findOne()
    .where( 'task', this._id )
    .sort( '-invalidDate -closedDate -createdDate' )
    .select( 'closedDate invalidDate createdDate' )
    .lean()
    .exec( function( err, data ) {
      if ( err ) return callback( err );

      if ( !data )
        return callback( null, {
          active: 0,
          idle: 0
        } );

      var creationDate = moment( _this.get( 'createdDate' ) );
      var endDate = data.invalidDate || data.closedDate || data.createdDate;
      // Last activity or closedDate or createdDate
      var lastActivity = moment( endDate || _this.get( 'closedDate' ) || _this.get( 'createdDate' ) );
      var taskEnd = moment( _.max( [
        _this.get( 'closedDate' ),
        lastActivity.toDate()
      ] ) );

      var lifecycle = {};
      lifecycle.active = lastActivity.diff( creationDate, 'seconds' );
      lifecycle.idle = taskEnd.diff( lastActivity, 'seconds' );

      return callback( null, lifecycle );
    } );
};


// ## updateInfo
//
// Updates the info in the control mart. This function is likely to be called on each event.
TaskSchema.methods.updateInfo = function( name, callback ) {
  var doAll = false;
  if ( arguments.length === 1 ) {
    callback = name;
    doAll = true;
    log.trace( 'Updating all infos for task %s', this._id );
  }

  if ( arguments.length === 2 ) {
    name = name.toLowerCase();
    log.trace( 'Updating %s for task %s', name, this._id );
  }


  // Add the first function
  var actions = [

    function passData( cb ) {
      return cb( null, {} );
    }
  ];

  var _this = this;

  if ( doAll || name === 'executions' ) {
    log.trace( 'Updating execution' );
    actions.push( function( data, cb ) {
      log.trace( 'Getting execution info' );

      _this
        .getExecutionsInfo( function( err, results ) {
          if ( err ) return cb( err );

          data.executions = results;
          return cb( null, data );
        } );
    } );
  }

  if ( doAll || name === 'answers' ) {
    log.trace( 'Updating answers' );
    actions.push( function( data, cb ) {
      log.trace( 'Getting answers info' );

      _this
        .getAnswersCount( function( err, results ) {
          if ( err ) return cb( err );

          data.answers = results;
          return cb( null, data );
        } );
    } );
  }

  if ( doAll || name === 'objects' ) {
    log.trace( 'Updating objects' );
    actions.push( function( data, cb ) {
      log.trace( 'Getting objects info' );

      _this
        .getObjectsInfo( function( err, results ) {
          if ( err ) return cb( err );

          data.objects = results;
          return cb( null, data );
        } );
    } );
  }

  if ( doAll || name === 'lifecycle' ) {
    log.trace( 'Updating lifecycle' );
    actions.push( function( data, cb ) {
      log.trace( 'Getting lifecycle info' );

      _this
        .getLifecycleInfo( function( err, results ) {
          if ( err ) return cb( err );

          data.lifecycle = results;
          return cb( null, data );
        } );
    } );
  }

  function updateMart( data, cb ) {
    var ControlMart = CS.models.controlmart;

    var tuples = [];
    _.each( data, function( v, k ) {
      var tuple = {
        task: _this._id,
        name: k,
        data: v
      };
      tuples.push( tuple );
    } );

    ControlMart.insert( tuples, function( err ) {
      if ( err ) return cb( err );

      return cb( null, data );
    } );
  }

  actions.push( updateMart );

  return async.waterfall( actions, callback );
};

// Export the schema.
exports = module.exports = TaskSchema;