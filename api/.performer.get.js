

// Load libraries
var util = require( 'util' );

// Use a child logger
//var log = CS.log.child( { component: 'Get Task' } );

// Generate custom error `GetPerformerError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetPerformerError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetPerformerError.super_.call( this, id, message, status );
};
util.inherits( GetPerformerError, APIError );

GetPerformerError.prototype.name = 'GetPerformerError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkUserId'
  ],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    user: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'performer',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function GetPerformer( req, res, next ) {
  return next();
  /*
  // It works thanks to the checkUserId check
  return res.json({
    performer: req.apiUser
  });
  */
};


// Export the API object
exports = module.exports = API;