// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import the required Models
var Task = CS.models.task;

// Use a child logger
var log = CS.log.child( {
  component: 'Post Task'
} );

// Generate custom error `PostTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostTaskError = function( id, message, status ) {
  PostTaskError.super_.call( this, id, message, status );
};
util.inherits( PostTaskError, APIError );

PostTaskError.prototype.name = 'PostTaskError';
// Custom error IDs
PostTaskError.WRONG_JOB_ID = 'WRONG_JOB_ID';


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
  var data = req.body;

  //TRICK FOR TESTING
  var job = '52ea5803596b8cdd6500000f';

  log.trace( 'Retrieving the task type %s', data.name );

  var taskTypeImpl = CS.taskTypes[ data.name ];

  var defaultValues = taskTypeImpl[ 'defaults' ];

  var objects = data.objects;
  var platforms = data.platforms;
  var params = data.params;

  defaultValues = JSON.stringify( defaultValues );

  //in order to use the "$  $" simbol as delimiter
  var delimiter = /"\$(\w+)\$"/;

  _.templateSettings = {
    interpolate: delimiter
  };

  var template = _.template( defaultValues );

  //trick 
  for ( var k in params ) {
    if ( params.hasOwnProperty( k ) ) {
      params[ k ] = JSON.stringify( params[ k ] );
    }
  }

  var rawTask = JSON.parse( template( params ) );

  //add the job
  rawTask.job = job;

  var operations = rawTask.operations;
  delete rawTask.operations;

  var task = new Task( rawTask );

  var actions = [
    _.bind( task.addPlatforms, task, platforms ),
    _.bind( task.addOperations, task, operations ),
    _.bind( task.addObjects, task, objects )
  ];

  async.series( actions, function( err, results ) {
    if ( err ) return next( err );

    log.trace( 'Results are: %j', results );
    res.json( task );
  } );

};


// Export the API object
exports = module.exports = API;