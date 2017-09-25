'use strict';
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );
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

    volo: {
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

    "ciamba": String,

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
        // The object is assigned to a microtask
        'ASSIGNED',

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

  return CRM
    .trigger( event, _.defaults( {
      task: this.task._id ? this.task._id : this.task,
      object: this._id
    }, data ) )
    .asCallback( callback );
};

// Closes the current object. The `CLOSE_OBJECT` event will be triggered **after** setting the
// status field to `CLOSED`.
ObjectSchema.methods.close = function( bad, callback ) {
  let promise = Promise.resolve();

  if ( arguments.length === 0 ) {
    bad = false;
  } else if ( _.isFunction( bad ) ) {
    callback = bad;
    bad = false;
  }

  // Skip if already closed.
  if ( this.closed ) {
    let error = new MongoError( 'Already closed' );
    promise = Promise.reject( error );
  }

  return promise
    .then( () => {
      log.debug( 'Closing object', this._id );

      // Set close-related fields
      if ( bad ) {
        this.set( 'status', 'CLOSED_BAD' );
      } else {
        this.set( 'status', 'CLOSED_GOOD' );
      }
      this.set( 'closedDate', Date.now() );

      return this.save();
    } )
    .then( () => {
      return this.fire( 'CLOSE_OBJECT' );
    } )
    .asCallback( callback );
};

ObjectSchema.methods.cancel = function( callback ) {
  log.trace( 'Cancelling the object' );

  return this.close( true, callback );

};

ObjectSchema.methods.redo = function( callback ) {
  log.trace( 'Redoing the object %s', this._id );

  var clone = _.pick( this, [ 'data' ] );
  var _this = this;
  log.trace( 'Clone %j', clone );

  _this.model( 'task' )
    .findOne()
    .where( 'objects', this._id )
    .exec( function( err, task ) {
      if ( err ) return callback( err );

      if ( !task ) return callback( new Error( 'Task not found' ) );

      task.addObjects( clone, function( err ) {
        if ( err ) return callback( err );

        return _this.close( true, callback );
      } );
    } );

  /*this.close( true, function( err ) {
    if ( err ) return callback( err );

    _this.model( 'task' )
      .findOne()
      .where( 'objects', _this._id )
      .exec( function( err, task ) {
        if ( err ) return callback( err );

        if ( !task ) return callback( new Error( 'Task not found' ) );

        log.trace( clone );
        return task.addObjects( clone, callback );
      } );
  } );*/
};







ObjectSchema.statics.getObjectsInfo = function( task, callback ) {
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
      if ( err ) return callback( err );

      results = _.indexBy( results, '_id' );

      var objects = {};
      objects.created = results[ 'CREATED' ] ? results[ 'CREATED' ].number : 0;
      var closed = 0;
      closed += results[ 'CLOSED' ] ? results[ 'CLOSED' ].number : 0;
      closed += results[ 'CLOSED_BAD' ] ? results[ 'CLOSED_BAD' ].number : 0;
      closed += results[ 'CLOSED_GOOD' ] ? results[ 'CLOSED_GOOD' ].number : 0;
      objects.closed = closed;
      objects.total = objects.created + objects.closed;

      return callback( null, objects );
    } );
};

// Export the schema.
exports = module.exports = ObjectSchema;