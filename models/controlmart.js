// Load libraries
var mongo = require( 'mongoose' );
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'ControlMart model'
} );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// Control Mart
// ---
// It contains all the control parameters needed by the control rules

// ControlMart schema
var ControlMartSchema = new Schema( {


  name: {
    type: String,
    required: true
  },

  job: {
    type: ObjectId,
    ref: 'job'
  },

  task: {
    type: ObjectId,
    ref: 'task'
  },

  microtask: {
    type: ObjectId,
    ref: 'microtask'
  },

  operation: {
    type: ObjectId,
    ref: 'operation'
  },

  platform: {
    type: ObjectId,
    ref: 'platform'
  },

  performer: {
    type: ObjectId,
    ref: 'performer'
  },

  object: {
    type: ObjectId,
    ref: 'object'
  },

  data: Schema.Types.Mixed
} );

// ## Static methods for the `ControlMart` class
// ---


ControlMartSchema.statics.select = function( filter, names, callback ) {
  if ( !_.isArray( names ) )
    names = [ names ];

  // Just in case
  delete filter[ 'data' ];
  delete filter[ 'name' ];

  // If no names specified just call the get.
  if ( names.length === 0 )
    return this.get( filter, callback );

  this
    .find( filter )
    .where( 'name' ).in( names )
    .sort( '-_id' )
    .lean()
    .exec( function( err, controlmart ) {
      if ( err ) return callback( err );

      log.trace( '%s tuples selected', controlmart.length );

      return callback( null, controlmart );
    } );
};

// Return the tuple matching the condition in its original format
ControlMartSchema.statics.get = function( rawTuple, callback ) {
  log.trace( 'Retrieving the controlmart tuple of %j', rawTuple );

  this
    .find( rawTuple )
    .sort( '-_id' )
  // Pure javascript object
  .lean()
    .exec( function( err, controlmart ) {
      if ( err ) return callback( err );

      log.trace( '%s tuples retrieved', controlmart.length );

      return callback( null, controlmart );
    } );

};

// Insert or update (if exists) controlmart tuples
ControlMartSchema.statics.insert = function( rawTuples, callback ) {
  log.trace( 'Creating or updating the tuple' );
  var _this = this;

  if ( !_.isArray( rawTuples ) ) {
    rawTuples = [ rawTuples ];
  }

  var insertOrUpdate = function( tuple, callback ) {

    var tupleToSearch = _.clone( tuple );

    delete tupleToSearch[ 'data' ];

    // Verify if the tuple already exists
    _this.findOne( tupleToSearch, function( err, controlmart ) {
      if ( err ) return callback( err );

      if ( controlmart ) {
        // Update the data
        //log.trace( 'The tuple already exists' );
        controlmart.data = tuple.data;
      } else {
        // Create a new tuple
        //log.trace( 'New tuple' );
        var ControlMart = _this.model( 'controlmart' );
        controlmart = new ControlMart( tuple );
      }

      //log.trace( 'Saving the tuple' );
      return controlmart.save( callback );
    } );
  };

  return async.each( rawTuples, insertOrUpdate, callback );
};


exports = module.exports = ControlMartSchema;