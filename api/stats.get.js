// Load libraries
var _  = require('underscore');
var util  = require('util');

// Import a child Logger
var log = common.log.child( { component: 'Stats' } );

// Import Models
var Execution = common.models.execution;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetAnswersError = function( id, message, status ) {
  GetAnswersError.super_.call( this, id, message, status );
};
util.inherits( GetAnswersError, APIError );
// Custom error IDS
GetAnswersError.prototype.name = 'GetAnswersError';
GetAnswersError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    job: false,
    task: false,
    microtask: false,
    execution: false
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task', // asdasdasd

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getAnswer( req, res, next ) {
  log.trace( 'Get statas' );

  Execution
  .find()
  .populate( '' ) // insert fields
  .exec( req.wrap( function ( err, executions ) {
    var json = {};


    return res.json( json );
  }) );
};


// Export the API object
exports = module.exports = API;