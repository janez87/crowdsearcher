'use strict';
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
var async = require( 'async' );
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Execution model'
} );

// Import Mongoose Classes and Objects
var MongoError = mongo.Error;
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var Annotation = require( './annotation' );

// Import the CRM for handling Execution events.
var CRM = require( '../core/CRM' );

// # Execution definition
// The Execution is an instance of the Microtask for a Performer.

// ## Schema
//
// Mongoose schema for the Execution entity.
var ExecutionSchema = new Schema( {
    // ### Status
    //
    // Current status of the Execution.
    // The status changes how the Execution behave to some events/requests.
    status: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      'enum': [
        // The Execution has been created.
        'CREATED',

        // The Execution has been closed, it will not accept any `Object` and `Execution`s.
        // Setting the state to `CLOSED` will trigger the `END_Execution` event and set the `closedDate`
        // field to the current date.
        'CLOSED',

        // The Execution has been closed but the results must be considered as invalid.
        'INVALID'
      ],
      'default': 'CREATED'
    },

    // ### References
    //
    // The parent Task of this Execution.
    task: {
      required: true,
      index: true,
      type: ObjectId,
      ref: 'task'
    },

    // The parent Microtask of this Execution.
    microtask: {
      required: true,
      index: true,
      type: ObjectId,
      ref: 'microtask'
    },

    // The Platform of this Execution.
    platform: {
      required: true,
      index: true,
      type: ObjectId,
      ref: 'platform'
    },

    // The Performer of this Execution.
    performer: {
      //required: true,
      index: true,
      type: ObjectId,
      ref: 'user'
    },


    // ### Annotations
    //
    annotations: {
      type: [ Annotation ],
      'default': []
    },


    // ### Time data
    //
    // Creation date of the entity. By default it will be the first save of the object.
    createdDate: {
      required: true,
      type: Date,
      'default': Date.now
    },

    // Closed date of the entity. Will be available only after **closing** the Execution.
    closedDate: {
      type: Date,
      'default': null
    },

    // Closed date of the entity. Will be available only after **closing** the Execution.
    invalidDate: {
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









// ## Plugins to add to the Execution model.
//
// Add the `metadata` fileld to the entity.
ExecutionSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
ExecutionSchema.plugin( require( './plugins/accessKeyPlugin' ) );








// # Execution calculated fields
//
// Boolean indicating if the Execution is created.
ExecutionSchema.virtual( 'created' ).get( function() {
  return this.status === 'CREATED';
} );
// Boolean indicating if the Execution is closed.
ExecutionSchema.virtual( 'closed' ).get( function() {
  return this.status === 'CLOSED';
} );
// Boolean indicating if the Execution is invalid.
ExecutionSchema.virtual( 'invalid' ).get( function() {
  return this.status === 'INVALID';
} );
// Boolean indicating if the Execution is editable.
ExecutionSchema.virtual( 'editable' ).get( function() {
  return this.created;
} );








// # Execution instance methods
//

// ## Events
//
// Shortcut for triggering events using the given data as payload.
// The payload **always** have a `task` key containing the id of the current task
// and a `microtask` containing the current Microtask id and a
// `execution` key containing the current Execution id.
ExecutionSchema.methods.fire = function( event, data, callback ) {
  if ( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }

  return CRM
  .trigger( event, _.defaults( {
    task: this.task._id ? this.task._id : this.task,
    microtask: this.microtask._id ? this.microtask._id : this.microtask,
    execution: this._id
  }, data ) )
  .asCallback( callback );
};

// Closes the current Execution. The `END_EXECUTION` event will be triggered **after** setting the
// status field to `CLOSED`.
ExecutionSchema.methods.close = function( callback ) {
  let promise = Promise.resolve();

  // Skip if not editable.
  if( !this.editable ) {
    let error = new MongoError( `Execution not editable, status is "${this.status}"` );
    promise = Promise.reject( error );
  }

  return promise
  .then( () => {
    log.debug( 'Closing execution', this._id );

    this.set( 'status', 'CLOSED' );
    this.set( 'closedDate', Date.now() );

    return this.save();
  } )
  .then( () => {
    return this.fire( 'END_EXECUTION' );
  } )
  .asCallback( callback );
};

// Invalidates the current Execution. The `END_EXECUTION` event will be triggered **after** setting the
// status field to `INVALID`.
ExecutionSchema.methods.makeInvalid = function( callback ) {
  let promise = Promise.resolve();

  // Skip if not editable.
  if( this.invalid ) {
    let error = new MongoError( 'The Execution is already invalid' );
    promise = Promise.reject( error );
  }

  return promise
  .then( () => {
    log.debug( 'Invalidating execution', this._id );

    this.set( 'status', 'INVALID' );
    this.set( 'invalidDate', Date.now() );

    return this.save();
  } )
  .asCallback( callback );
};



// Create annotation based on a array of responses.
ExecutionSchema.methods.createAnnotations = function( responses, callback ) {
  log.trace( 'Creating annotations' );
  let Operation = CS.models.operation;

  return Promise
  .each( responses, response => {
    let operationId = response.operation;

    return Operation
    .findById( operationId )
    .exec()
    .then( operation => {
      if( !operation ) {
        log.warn( 'Cannot find operation "%s"', operationId );
        return [];
      }

      let implementation = operation.implementation;
      if( implementation && implementation.create ) {
        return implementation.create( response, operation );
      } else {
        log.warn( 'Operation %s does not have an implementation', operation.name );
        return [];
      }
    } )
    .then( annotations => {
      log.trace( 'Adding %d annotations to the execution', annotations.length );
      for( let annotation of annotations ) {
        this.annotations.push( annotation );
      }
    } );
  } )
  .asCallback( callback );
};



ExecutionSchema.statics.getExecutionsInfo = function( task, callback ) {
  return this
  .aggregate()
  .match( {
    task: task._id
  } )
  .group( {
    _id: '$status',
    number: {
      $sum: 1
    }
  } )
  .exec( function( err, results ) {
    if( err ) return callback( err );

    results = _.indexBy( results, '_id' );

    var executions = {};
    executions.created = results[ 'CREATED' ]? results[ 'CREATED' ].number : 0;
    executions.closed = results[ 'CLOSED' ]? results[ 'CLOSED' ].number : 0;
    executions.invalid = results[ 'INVALID' ]? results[ 'INVALID' ].number : 0;
    executions.total = executions.created+executions.closed+executions.invalid;

    return callback( null, executions );
  } );
};
ExecutionSchema.statics.getAnswersCount = function( task, callback ) {
  return this
  .count()
  .where( 'task', task._id )
  .where( 'annotations._id' ).exists()
  .exec( function( err, results ) {
    if( err ) return callback( err );

    //var number = results.length? results[0].number : 0;
    //return callback( null, number );
    return callback( null, results );
  } );
};
ExecutionSchema.statics.getClosedCount = function( task, callback ) {
  return this
  .find()
  .where( 'task', task._id || task )
  .where( 'status', 'CLOSED' )
  .count()
  .exec( callback );
};
ExecutionSchema.statics.getClosed = function( task, callback ) {
  return this
  .find()
  .where( 'task', task._id || task )
  .where( 'status', 'CLOSED' )
  .exec( callback );
};

ExecutionSchema.statics.getInvalidCount = function( task, callback ) {
  return this
  .find()
  .where( 'task', task._id || task )
  .where( 'status', 'INVALID' )
  .count()
  .exec( callback );
};
ExecutionSchema.statics.getInvalid = function( task, callback ) {
  return this
  .find()
  .where( 'task', task._id || task )
  .where( 'status', 'INVALID' )
  .exec( callback );
};

ExecutionSchema.statics.getAllExecutionCount = function( task, callback ) {
  return this
  .find()
  .where( 'task', task._id || task )
  .count()
  .exec( callback );
};
ExecutionSchema.statics.getAllExecution = function( task, callback ) {
  return this
  .find()
  .where( 'task', task._id || task )
  .exec( callback );
};




exports = module.exports = ExecutionSchema;