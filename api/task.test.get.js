// Load libraries
var util = require( 'util' );
var mongo = require( 'mongoose' );

var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;
var CS = require( '../core' );
var log = CS.log.child( {
  component: 'Native get task'
} );
// Use a child logger
//var log = CS.log.child( { component: 'Get Task' } );

// Generate custom error `GetTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetTaskError = function( id, message, status ) {
  GetTaskError.super_.call( this, id, message, status );
};
util.inherits( GetTaskError, APIError );

GetTaskError.prototype.name = 'GetTaskError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'taskTest',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getTask( req, res, next ) {

  var model = CS.models[ 'task' ];
  var id = req.query.task;

  log.trace( id );
  model.collection.findOne( {

  }, function( err, task ) {
    if ( err ) return next( err );

    //log.trace( task );
    res.json( {} );
  } )


};


// Export the API object
exports = module.exports = API;