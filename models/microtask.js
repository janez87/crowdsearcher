// Load libraries
var _  = require('underscore');
var mongo = require('mongoose');
var MongoError = mongo.Error;

// Create a child logger
var log = common.log.child( { component: 'Microtask model' } );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// Import the CRM for handling microtask events.
var CRM = require( '../scripts/controlRuleManager' );

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

  // List of `Platform`s of the Microtask. Each platform is a *reference* to a Platform model.
  platforms: {
    type: [ {
      type: ObjectId,
      ref: 'platform'
    } ],
    'default': []
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
  // Creation date of the object. By default it will be the first save of the object.
  creationDate: {
    required: true,
    type: Date,
    'default': Date.now
  },

  // Closed date of the object. Will be available only after **closing** the microtask.
  closedDate: {
    type: Date,
    'default':null
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
  return this.status==='CREATED';
} );
// Boolean indicating if the microtask is closed.
MicrotaskSchema.virtual( 'closed' ).get( function() {
  return this.status==='CLOSED';
} );
// Boolean indicating if the microtask is editable.
MicrotaskSchema.virtual( 'editable' ).get( function() {
  return this.created;
} );








// # Microtask instance methods
//

// ## Events
//
// Shortcut for triggering events using the given data as payload.
// The payload **always** have a `task` key containing the id of the current task
// and a `microtask` key containing the current microtask id.
MicrotaskSchema.methods.fire = function( event, data, callback ) {
  if( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }
  return CRM.trigger( event, _.defaults( {
    task: this.task._id? this.task._id : this.task,
    microtask: this._id
  }, data ), callback );
};

// Closes the current microtask. The `END_MICROTASK` event will be triggered **after** setting the
// status field to `CLOSED`.
MicrotaskSchema.methods.close = function( callback ) {
  var _this = this;
  // Skip if already closed.
  if( this.closed )
    return callback( new MongoError( 'Already closed' ) );

  log.debug( 'Closing microtask', this._id );

  this.set( 'status', 'CLOSED' );
  this.set( 'closedDate', Date.now() );

  this.save( function( err ) {
    if( err ) return callback( err );

    _this.fire( 'END_MICROTASK', callback );
  } );
};


exports = module.exports = MicrotaskSchema;