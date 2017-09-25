'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Job model'
} );


// Import Mongoose Classes and Objects
var Schema = mongo.Schema;

// # Job definition
// The job is a container for Tasks.

// ## Schema
//
// Mongoose schema for the job entity.
var JobSchema = new Schema( {
    // ### General data
    //
    // The name of the job.
    name: {
      type: String,
      required: true,
      trim: true
    },

    // Alias for the job.
    /*
    alias: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: /^[a-z\-0-9]+$/
    },
    */

    'private': {
      type: Boolean,
      'default': false
    },

    // ### Markdown-enabled fileds that contains text about the job.
    //
    // The description of the job.
    description: {
      type: String
    },
    // The landing page of the job, will be rendered using markdown.
    landing: {
      type: String
    },
    // The ending page of the job, will be rendered using markdown.
    ending: {
      type: String
    },

    // ### Time data
    //
    // Creation date of the job. By default it will be the first save of the job.
    createdDate: {
      required: true,
      type: Date,
      'default': Date.now
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









// ## Plugins to add to the job model.
//
// Add the `metadata` fileld to the entity.
JobSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
JobSchema.plugin( require( './plugins/accessKeyPlugin' ) );
// Load the plugin for handling different strategies
JobSchema.plugin( require( './plugins/strategyPlugin' ), {
  strategy: 'taskAssignment',
  method: 'assign'
} );









// ## Middlewares
//
// Handle alias creation.
JobSchema.pre( 'save', function( next ) {
  // If not preset add the alias
  if ( !this.alias )
    this.alias = _.kebabCase( this.name );

  return next();
} );

// Handle job removal, remove all tasks.
JobSchema.pre( 'remove', function( next ) {
  log.debug( 'Removing tasks' );

  function removeTask( task, cb ) {
    task.remove( cb );
  }

  var Task = CS.models.task;
  Task
    .find()
    .where( 'job', this._id )
    .exec( function( err, tasks ) {
      if ( err ) return next( err );

      async.each( tasks, removeTask, function( err ) {
        if ( err ) return next( err );

        log.debug( 'All tasks removed' );
        return next();
      } );
    } );
} );


// Export the schema.
exports = module.exports = JobSchema;