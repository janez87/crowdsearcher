// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( {
  component: 'Flows'
} );

// Generate custom error `GetFlowsError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetStatsError = function( id, message, status ) {
  GetStatsError.super_.call( this, id, message, status );
};
util.inherits( GetStatsError, APIError );
// Custom error IDS
GetStatsError.prototype.name = 'GetStatsError';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'job/:id/flows',

  // The API method to implement.
  method: 'GET'
};

// API core function logic. If this function is executed then each check is passed.
//TODO:
API.logic = function getStats( req, res, next ) {

  var tasks = [
    'asd1',
    'asd2',
    'asd3',
    'asd4',
    'asd5',
    'asd6',
    'asd7',
  ];

  var flows = [ {
    source: 'asd1',
    destination: 'asd2'
  }, {
    source: 'asd1',
    destination: 'asd3'
  }, {
    source: 'asd1',
    destination: 'asd4'
  }, {
    source: 'asd4',
    destination: 'asd2'
  }, {
    source: 'asd3',
    destination: 'asd2'
  }, {
    source: 'asd5',
    destination: 'asd6'
  } ];

  res.json( {
    flows: flows,
    tasks: tasks
  } );
};


// Export the API object
exports = module.exports = API;