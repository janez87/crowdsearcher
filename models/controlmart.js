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
// Return the tuple matching the condition in a 'user friendly' format
ControlMartSchema.statics.select = function( rawTuple, callback ) {

  log.trace( 'Retrieving the controlmart tuple of %j', rawTuple );

  // Retrieves the instance
  this
    .find( rawTuple )
  // Retrieves pure javascript objects
  .lean()
    .exec( function( err, controlMartTuples ) {
      if ( err ) return callback( err );

      log.trace( '%s tuples retrieved', controlMartTuples.length );

      // Output variable
      var output = {};

      // Keys in hierarchical order
      var keys = [
        'name',
        'job',
        'task',
        'microtask',
        'performer',
        'operation',
        'object',
        'platform',
        'data'
      ];

      var transformedTuples = [];
      // Transform each tuple in a javascript object organized in a hiearchy imposed by the order of the `keys` array
      _.each( controlMartTuples, function( tuple ) {
        var path = {};
        var existing = [];

        // Get only the keys present in the tuple
        _.each( keys, function( key ) {
          if ( !_.isUndefined( tuple[ key ] ) ) {
            existing.push( key );
          }
        } );

        // Pointer to the last position
        var temp = path;
        _.each( existing, function( key ) {
          if ( key === 'data' ) {
            // In case of the `data` key I need to set the value
            temp[ key ] = tuple[ key ];
          } else {
            temp[ tuple[ key ] ] = {};
            temp = temp[ tuple[ key ] ];
          }
        } );

        transformedTuples.push( path );

      } );

      // It recursively merge all the transformed tuple
      var merge = function( obj1, obj2 ) {
        var result = {};

        for ( var i in obj1 ) {
          result[ i ] = obj1[ i ];
          if ( ( i in obj2 ) && ( typeof obj1[ i ] === 'object' ) && ( i !== null ) ) {
            result[ i ] = merge( obj1[ i ], obj2[ i ] );
          }
        }

        for ( var i in obj2 ) {
          if ( i in result ) { //conflict
            continue;
          }
          result[ i ] = obj2[ i ];
        }
        return result;
      };

      _.each( transformedTuples, function( tuple ) {
        output = merge( output, tuple );
      } );

      return callback( null, output );
    } );

};

// Return the tuple matching the condition in its original format
ControlMartSchema.statics.get = function( rawTuple, callback ) {
  log.trace( 'Retrieving the controlmart tuple of %j', rawTuple );

  this
    .find( rawTuple )
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
        log.trace( 'The tuple already exists' );
        controlmart.data = tuple.data;
      } else {
        // Create a new tuple
        log.trace( 'New tuple' );
        var ControlMart = _this.model( 'controlmart' );
        controlmart = new ControlMart( tuple );
      }

      log.trace( 'Saving the tuple' );
      return controlmart.save( callback );
    } );
  };

  return async.eachSeries( rawTuples, insertOrUpdate, callback );
};


exports = module.exports = ControlMartSchema;