// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import the required Models
var Task = CS.models.task;
var Job = CS.models.job;

// Use a child logger
var log = CS.log.child( {
  component: 'Post Task Type'
} );

// Generate custom error `PostTaskTypeError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostTaskTypeError = function( id, message, status ) {
  PostTaskTypeError.super_.call( this, id, message, status );
};
util.inherits( PostTaskTypeError, APIError );

PostTaskTypeError.prototype.name = 'PostTaskTypeError';
// Custom error IDs
PostTaskTypeError.WRONG_JOB_ID = 'WRONG_JOB_ID';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'tasktype',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function postTask( req, res, next ) {
  /* jshint camelcase: false */
  var data = req.session.wizard;


  var taskType = data.task_type;
  var name = taskType.name;
  var params = taskType.params;
  var objects = _.map( data.object_declaration.data, function( val, i ) {
    return {
      name: val.id || 'Object ' + i,
      data: val
    };
  } );

  var platforms = [];
  if ( !_.isEmpty( data.execution ) ) {
    var execution = data.execution;
    execution.execution = true;
    execution.invitation = false;
    execution.enabled = true;
    platforms.push( execution );
  }
  if ( !_.isEmpty( data.invitation ) ) {
    _.each( data.invitation, function( val ) {
      val.execution = false;
      val.invitation = true;
      val.enabled = true;
      platforms.push( val );
    } );
  }
  //var adaptation = data.adaptation;



  log.trace( 'Retrieving the task type %s', name );
  var taskTypeImpl = CS.taskTypes[ name ];
  var defaultValues = taskTypeImpl.defaults;
  defaultValues = JSON.stringify( defaultValues );

  //in order to use the "$  $" simbol as delimiter
  var delimiter = /"\$(\w+)\$"/;

  _.templateSettings = {
    interpolate: delimiter
  };

  var template = _.template( defaultValues );

  // Stringify every value in the object
  function stringify( params ) {
    for ( var k in params ) {
      if ( params.hasOwnProperty( k ) ) {
        params[ k ] = JSON.stringify( params[ k ] );
      }
    }

    return params;
  }

  var rawTask = JSON.parse( template( stringify( params ) ) );

  //TRICK FOR TESTING
  var job = new Job( {
    name: rawTask.name
  } );

  job.save( function( err, job ) {
    if ( err ) return next( err );
    //add the job
    rawTask.job = job.id;

    var operations = rawTask.operations;
    delete rawTask.operations;

    var task = new Task( rawTask );

    var actions = [
      _.bind( task.addPlatforms, task, platforms ),
      _.bind( task.addOperations, task, operations ),
      _.bind( task.addObjects, task, objects )
    ];

    async.series( actions, function( err ) {
      if ( err ) return next( err );

      res.json( task );
    } );
  } );


};


// Export the API object
exports = module.exports = API;