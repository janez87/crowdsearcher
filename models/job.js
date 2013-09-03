

// Load libraries
var _  = require('underscore');
var domain = require('domain');
var mongo = require('mongoose');
var async = require('async');
var log = common.log.child( { component: 'Job model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// Import  plugins
var metadataPlugin = require( './plugins/metadata' );
var taskAssignmentStrategyPlugin = require( './plugins/taskassignmentstrategy' );


// JobSchema
// ------
// The Job schema represents
var JobSchema = new Schema( {

  // Job name
  name: {
    type: String,
    required: true
  },

  description: String,
  landing: String,
  ending: String,

  alias: {
    type: String,
    lowercase: true,
    unique: true,
    index: true,
    match: /^[a-z\-0-9]+$/,
    'default': function() {
      return _.slugify( this.name );
    }
  },

  // List of Task associated with this Job
  tasks: [ {
    type: ObjectId,
    ref: 'task',
    unique: true
  } ],

  objects: [ {
    type: ObjectId,
    ref: 'object',
    unique: true
  } ]
},
// Set the options for this Schema
{
  // Do not allow to add random properties to the Model
  strict: true
} );


// Use plugin
JobSchema.plugin( metadataPlugin );
JobSchema.plugin( taskAssignmentStrategyPlugin );



// Pre middlewares
// ---
JobSchema.pre( 'remove', function( next ) {
  log.trace( 'PRE Job remove' );

  var thisJob = this;

  var removeObj = function( obj, callback ) {
    obj.remove( callback );
  };

  var removeTask = function( callback ) {
    log.trace( 'Removing all the tasks of the job' );
 
    thisJob
    .model( 'task' )
    .find()
    .where( '_id' )
    ['in']( thisJob.tasks )
    .exec( function( err, tasks ) {
      if( err ) return callback( err );

      async.each( tasks, removeObj, callback );
    } );

  };
  var removeObjects = function( callback ) {
    log.trace( 'Removing all the objects of the job' );

    thisJob
    .model( 'object' )
    .find()
    .where( '_id' )
    ['in']( thisJob.objects )
    .exec( function( err, objects ) {
      if( err ) return callback( err );

      async.each( objects, removeObj, callback );
    } );
  };

  async.series( [
    removeTask,
    removeObjects
  ], next );
} );

// Post middlewares
// ---
JobSchema.post( 'save', function() {
  log.trace( 'POST Job save' );
} );
JobSchema.post( 'remove', function() {
  log.trace( 'POST Job remove' );
} );


// Static methods
// ---
JobSchema.statics.findByAlias = function( alias, callback ) {
  // Create the query
  var query = this
  .findOne()
  .where( 'alias', alias );

  if( _.isFunction( callback ) ) {
    return query.exec( callback );
  } else {
    return query;
  }
};

// Methods
// ---
JobSchema.methods.addTask = function( task, callback ) {
  this.tasks.addToSet( task );
  this.save( callback );
};

JobSchema.methods.addObjects = function( objects, callback ) {

  log.trace( 'Adding objects to Job %s', this._id );

  // Keep a pointer to the job document, for later use
  var thisJob = this;

  var objectsCreated = function( err ) {
    if( err ) return callback( err );

    var objectList = _.toArray( arguments ).slice( 1 );
    log.trace( 'Bulk create ok, adding %s objects to the job %s', objectList.length, thisJob._id );

    // Now add the created objects to the job
    _.each( objectList, function( object ) {
      thisJob.objects.addToSet( object );
    } );

    thisJob.save( function( err ) {
      return callback( err, objectList );
    } );
  };

  // Add the Job property to each Object
  _.each( objects, function( object ) {
    object.job = thisJob;
  } );

  // Create and save multiple instance at once
  this.model( 'object' ).create( objects, objectsCreated );
};


// Export the Schema
exports = module.exports = JobSchema;