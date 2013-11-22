// Load libraries
var _  = require('underscore');
var async = require('async');
var mongo = require('mongoose');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Execution model' } );

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
  autoIndex: process.env.PRODUCTION? false : true
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
  return this.status==='CREATED';
} );
// Boolean indicating if the Execution is closed.
ExecutionSchema.virtual( 'closed' ).get( function() {
  return this.status==='CLOSED';
} );
// Boolean indicating if the Execution is invalid.
ExecutionSchema.virtual( 'invalid' ).get( function() {
  return this.status==='INVALID';
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
  if( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }
  return CRM.trigger( event, _.defaults( {
    task: this.task._id? this.task._id : this.task,
    microtask: this.microtask._id? this.microtask._id : this.microtask,
    execution: this._id
  }, data ), callback );
};

// Closes the current Execution. The `END_EXECUTION` event will be triggered **after** setting the
// status field to `CLOSED`.
ExecutionSchema.methods.close = function( callback ) {
  var _this = this;

  // Skip if not editable.
  if( !this.editable )
    return callback( new MongoError( 'Execution not editable, status is '+this.status ) );

  log.debug( 'Closing execution', this._id );

  this.set( 'status', 'CLOSED' );
  this.set( 'closedDate', Date.now() );

  this.save( function( err ) {
    if( err ) return callback( err );

    _this.fire( 'END_EXECUTION', callback );
  } );
};

// Invalidates the current Execution. The `END_EXECUTION` event will be triggered **after** setting the
// status field to `INVALID`.
ExecutionSchema.methods.makeInvalid = function( callback ) {
  // Skip if already `invalid`.
  if( this.invalid )
    return callback( new MongoError( 'The Execution is already invalid' ) );

  log.debug( 'Invalidating execution', this._id );

  this.set( 'status', 'INVALID' );
  this.set( 'invalidDate', Date.now() );

  this.save( function( err ) {
    if( err ) return callback( err );

    return callback();
  } );
};



// Create annotation based on a array of responses.
ExecutionSchema.methods.createAnnotations = function( responses, callback ) {
  var populated = this.populated( 'microtask' );

  if( _.isUndefined( populated ) ) {
    return this
    .populate( 'microtask', function( err, execution ) {
      if( err ) return callback( err );

      return execution.createAnnotations( responses, callback );
    } );
  }

  var _this = this;
  var microtask = this.microtask;

  function parseResponse( response, cb ) {
    var operationId = response.operation;

    microtask.getOperationById( operationId, function( err, operation ) {
      if( err ) return cb( err );

      var implementation = operation.implementation;
      if( implementation && implementation.create ) {
        return implementation.create( response, operation, function( err, annotations ) {
          if( err ) return cb( err );

          log.trace( 'Annotations(%s): %j', annotations.length, annotations );
          // Add the annotations to the execution object.
          _.each( annotations, function ( annotation ) {
            log.trace( 'Annotation: %j', annotation );
            _this.annotations.push( annotation );
          } );
          return cb();
        } );
      } else {
        log.warn( 'Operation %s does not have an implementation', operation.name );
        return cb();
      }
    } );
  }

  async.each( responses, parseResponse, callback );
};




exports = module.exports = ExecutionSchema;