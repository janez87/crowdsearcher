
// Load libraries
var mongo = require('mongoose');

// Create a child logger
var log = common.log.child( { component: 'Execution model' } );

// Import the Control Rule Manager
var CRM = require( '../scripts/controlRuleManager' );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var Annotation = require( './annotation' );

// Import plugins
var metadataPlugin = require( './plugins/metadata' );

// ExecutionSchema
// ------
// The Execution schema represents
var ExecutionSchema = new Schema( {
  // Reference to the job
  job: {
    required: false,
    type: ObjectId,
    ref: 'job'
  },

  // Reference to the Task
  task: {
    required: true,
    type: ObjectId,
    ref: 'task'
  },

  // Reference to the Microtask
  microtask: {
    required: true,
    type: ObjectId,
    ref: 'microtask'
  },

  // Reference to the Performer
  performer: {
    required: false,
    type: ObjectId,
    ref: 'user'
  },

  platform: {
    required: true,
    type: ObjectId,
    ref: 'platform'
  },

  // Results are saved into annotation objects
  annotations: {
    type: [Annotation],
    'default': []
  },


  operations: {
    type: [ {
      type: ObjectId,
      ref: 'operation'
    } ],
    required: true
  },

  closed: {
    type: 'boolean',
    'default': false
  },


  // Useful timed data
  lastModified: {
    type: 'date'
  },
  creationDate: {
    type: 'date',
    'default': Date.now
  },
  closedDate: {
    type: 'date',
    'default': null
  }

}, {
  strict: false
} );

ExecutionSchema.plugin( metadataPlugin );


// Pre middlewares
ExecutionSchema.pre( 'save', function( next ) {
  log.trace( 'PRE Execution save' );

  // Update last modified value
  this.lastModified = Date.now();

  // If closed set the closed date
  if( this.closed )
    this.closedDate = Date.now();

  next();
} );
ExecutionSchema.pre( 'remove', function( next ) {
  log.trace( 'PRE Execution remove' );
  //TODO: remove all the connected objects, metadata etc...
  next();
} );
// Post middlewares
ExecutionSchema.post( 'init', function() {
  log.trace( 'POST Execution init' );
} );
ExecutionSchema.post( 'save', function() {
  log.trace( 'POST Execution save' );
} );
ExecutionSchema.post( 'remove', function() {
  log.trace( 'POST Execution remove' );
} );





// Methods
// ---
ExecutionSchema.methods.close = function( callback ) {

  this.set( 'closed', true );

  this.save( function( err, execution ){
    if( err ) return callback( err );

    execution
    .populate( 'task microtask', function( err, execution ) {
      if( err ) return callback( err );

      CRM.execute( 'END_EXECUTION', {
        task: execution.task,
        microtask: execution.microtask,
        execution: execution
      }, function( err, results ){
          if( err ) return callback( err );

          log.trace('Execution %s closed', execution.id);
          return callback( null, results );
        }
      );
    } );
  } );
};


exports = module.exports = ExecutionSchema;