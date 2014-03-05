// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Microtask model'
} );

// Import Mongoose Classes and Objects
var MongoError = mongo.Error;
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// Import the CRM for handling microtask events.
var CRM = require( '../core/CRM' );

// # Microtask definition
// The microtask is an instance of the Task.

// ## Schema
//
// Mongoose schema for the Microtask entity.
var MicrotaskSchema = new Schema( {
    // ### Status
    //
    // Current status of the Microtask.
    // The status changes how the Microtask behave to some events/requests.
    status: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      'enum': [
        // The Microtask has been created.
        'CREATED',

        // The Microtask has been closed, it will not accept any `Object` and `Execution`s.
        // Setting the state to `CLOSED` will trigger the `END_MICROTASK` event and set the `closedDate`
        // field to the current date.
        'CLOSED'
      ],
      'default': 'CREATED'
    },

    // ### References
    //
    // Tha parent Task of this Microtask.
    task: {
      required: true,
      type: ObjectId,
      ref: 'task'
    },

    // Unique list of `Object`s of the Microtask.
    objects: {
      type: [ {
        type: ObjectId,
        ref: 'object'
      } ],
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

    // Closed date of the entity. Will be available only after **closing** the microtask.
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









// ## Plugins to add to the Microtask model.
//
// Add the `metadata` fileld to the entity.
MicrotaskSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
MicrotaskSchema.plugin( require( './plugins/accessKeyPlugin' ) );
// Add the `operations` plugin.
MicrotaskSchema.plugin( require( './plugins/operationsPlugin' ) );
// Add the `platforms` plugin.
MicrotaskSchema.plugin( require( './plugins/platformsPlugin' ) );








// # Microtask calculated fields
//
// Boolean indicating if the microtask is created.
MicrotaskSchema.virtual( 'created' ).get( function() {
  return this.status === 'CREATED';
} );
// Boolean indicating if the microtask is closed.
MicrotaskSchema.virtual( 'closed' ).get( function() {
  return this.status === 'CLOSED';
} );
// Boolean indicating if the microtask is editable.
MicrotaskSchema.virtual( 'editable' ).get( function() {
  return this.created;
} );




// # Retro compatibility
// 
// add getters to changed attributes to normalize behaviour
MicrotaskSchema.path( 'createdDate' ).get( function( date ) {
  if ( this.toObject().creationDate )
    return this.toObject().creationDate;
  else
    return date;
} );
MicrotaskSchema.path( 'status' ).get( function( status ) {
  if ( status === '0' )
    return 'CREATED';
  else if ( status === '10' )
    return 'OPENED';
  else if ( status === '20' )
    return 'FINALIZED';
  else if ( status === '30' )
    return 'WAIT';
  else if ( status === '40' )
    return 'SUSPENDED';
  else if ( status === '50' )
    return 'CLOSED';
  else
    return status;
} );



// # Microtask instance methods
//

// ## Events
//
// Shortcut for triggering events using the given data as payload.
// The payload **always** have a `task` key containing the id of the current task
// and a `microtask` key containing the current microtask id.
MicrotaskSchema.methods.fire = function( event, data, callback ) {
  if ( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }
  return CRM.trigger( event, _.defaults( {
    task: this.task._id ? this.task._id : this.task,
    microtask: this._id
  }, data ), callback );
};

// Closes the current microtask. The `END_MICROTASK` event will be triggered **after** setting the
// status field to `CLOSED`.
MicrotaskSchema.methods.close = function( callback ) {
  var _this = this;
  // Skip if already closed.
  if ( this.closed )
    return callback( new MongoError( 'Already closed' ) );

  log.debug( 'Closing microtask', this._id );

  this.set( 'status', 'CLOSED' );
  this.set( 'closedDate', Date.now() );

  this.save( function( err ) {
    if ( err ) return callback( err );

    _this.fire( 'END_MICROTASK', callback );
  } );
};






// ## Middlewares
//
// Handle job removal, remove all tasks.
MicrotaskSchema.pre( 'remove', function( next ) {

  function removeExecution( execution, cb ) {
    execution.remove( cb );
  }

  var Execution = CS.models.execution;

  Execution
    .find()
    .where( 'task', this.task )
    .where( 'microtask', this._id )
    .exec( function( err, executions ) {
      if ( err ) return next( err );

      async.each( executions, removeExecution, function( err ) {
        if ( err ) return next( err );

        log.debug( 'Removed all executions' );
        return next();
      } );
    } );
} );

exports = module.exports = MicrotaskSchema;