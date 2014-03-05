// Load libraries
var _ = require( 'underscore' );
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Object model'
} );

// Import Mongoose Classes and Objects
var MongoError = mongo.Error;
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;


// Import the CRM for handling microtask events.
var CRM = require( '../core/CRM' );


// # Object definition
// The object is a representation of an available object for the Task.

// ## Schema
//
// Mongoose schema for the Object entity.
var ObjectSchema = new Schema( {
    // ### General data.
    //
    // The Object data.
    data: {
      type: 'mixed',
      //required: true
    },

    // ### References
    //
    // The parent Task of this object
    task: {
      index: true,
      required: true,
      type: ObjectId,
      ref: 'task'
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
        // The Object has been posted to the CS.
        'CREATED',

        // The Object has been closed, it will not accept any modification.
        'CLOSED',
        'CLOSED_GOOD',
        'CLOSED_BAD'
      ],
      'default': 'CREATED'
    },


    // ### Time data
    //
    // Creation date of the entity. By default it will be the first save of the object.
    createdDate: {
      required: true,
      type: Date,
      'default': Date.now
    },

    // Closed date of the entity. Will be available only after **closing** the object.
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





// ## Plugins to add to the object model.
//
// Add the `metadata` fileld to the entity.
ObjectSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
ObjectSchema.plugin( require( './plugins/accessKeyPlugin' ) );








// # Object calculated fields
//
// Boolean indicating if the object is created.
ObjectSchema.virtual( 'created' ).get( function() {
  return this.status === 'CREATED';
} );
// Boolean indicating if the object is closed.
ObjectSchema.virtual( 'closed' ).get( function() {
  return this.status === 'CLOSED' || this.status === 'CLOSED_GOOD' || this.status === 'CLOSED_BAD';
} );
// Boolean indicating if the object is editable.
ObjectSchema.virtual( 'editable' ).get( function() {
  return this.created;
} );




// # Object instance methods
//

// ## Events
//
// Shortcut for triggering events using the given data as payload.
// The payload **always** have a `task` key containing the id of the current task
// and a `object` key containing the current object id.
ObjectSchema.methods.fire = function( event, data, callback ) {
  if ( !_.isFunction( callback ) ) {
    callback = data;
    data = {};
  }
  return CRM.trigger( event, _.defaults( {
    task: this.task._id ? this.task._id : this.task,
    object: this._id
  }, data ), callback );
};

// Closes the current object. The `CLOSE_OBJECT` event will be triggered **after** setting the
// status field to `CLOSED`.
ObjectSchema.methods.close = function( bad, callback ) {
  var _this = this;

  if ( _.isFunction( bad ) ) {
    callback = bad;
    bad = false;
  }

  // Skip if already closed.
  if ( this.closed )
    return callback( new MongoError( 'Already closed' ) );

  log.debug( 'Closing object', this._id );

  if ( bad ) {
    this.set( 'status', 'CLOSED_BAD' );
  } else {
    this.set( 'status', 'CLOSED_GOOD' );
  }

  this.set( 'closedDate', Date.now() );

  this.save( function( err ) {
    if ( err ) return callback( err );

    _this.fire( 'CLOSE_OBJECT', callback );
  } );
};


// Export the schema.
exports = module.exports = ObjectSchema;