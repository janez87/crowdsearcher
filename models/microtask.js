// Load libraries
var mongo = require('mongoose');

// Create child Logger
var log = common.log.child( { component: 'MicroTask model' } );


var CRM = require( '../scripts/controlRuleManager' );
var MicroTaskStatuses = require( '../config/constants' ).MicroTaskStatuses;

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var Mixed = Schema.Types.Mixed;

// Import the plugins
var metadataPlugin = require( './plugins/metadata' );

// Import the CRM
var CRM = require( '../scripts/controlRuleManager' );

// Plugins

// MicroTaskSchema
// ------
// The Microtask schema represents
var MicroTaskSchema = new Schema( {
  // Task that owns this `Microtask`
  task: {
    required: true,
    type: ObjectId,
    ref: 'task'
  },

  // List of objects belonging to the `Microtask`
  objects: [ {
    type: ObjectId,
    ref: 'object',
    unique: true
  } ],

  // Array that contains the `Operation`s
  operations: {
    type: [ {
      type: ObjectId,
      ref: 'operation'
    } ],
    required: true
  },

  platforms: {
    type: [{
      type: ObjectId,
      ref: 'platform'
    }],
    required: true
  },


  // Useful timed data
  creationDate: {
    type: Date,
    'default': Date.now
  },

  closedDate: {
    type: Date,
    'default': null
  },

  lastResponse: {
    type: Date
  },

  status: {
    type: Number,
    index: true,
    'default': MicroTaskStatuses.OPENED
  }

}, {
  strict: false
} );


MicroTaskSchema.plugin( metadataPlugin );


// Methods
// ---
MicroTaskSchema.methods.closeMicroTask = function( callback ) {
  var thisMicroTask = this;

  log.trace( 'Closing microtask', this.id );

  this.set( 'status', MicroTaskStatuses.CLOSED );
  this.set('closedDate', Date.now());

  this.save( function( err ) {
    if( err ) return callback( err );

    // Trigger the `END_MICROTASK` event
    // The signature of the event requires a `task`, so we grab it from the db
    var Task = thisMicroTask.model( 'task' );

    Task
    .findById( thisMicroTask.task )
    .exec( function( err, task ) {
      CRM.execute( 'END_MICROTASK', {
        task: task,
        microtask: thisMicroTask
      }, callback );
    } );
  } );
};



exports = module.exports = MicroTaskSchema;