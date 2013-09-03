
// Load libraries
var util = require( 'util' );

var CSError = require('../../error');
// Create the APIError class
var APIError = function( id, message, status ) {
  APIError.super_.call( this, id, message);
  this.status = status || APIError.SERVER_ERROR;
};
// Make it subclass Error
util.inherits( APIError, CSError );
APIError.prototype.name = 'APIError';
APIError.prototype.toString = function() {
  return this.name+' ('+this.id+')';
};


// List of available error response
// ---

// REQUEST ERRORS
APIError.BAD_REQUEST = 400;
APIError.UNAUTHORIZED = 401;
APIError.FORBIDDEN = 403;
APIError.NOT_FOUND = 404;
APIError.METHOD_NOT_ALLOWED = 405;

// HAHAHA
APIError.TEAPOT = 418;

// SERVER ERRORS
APIError.SERVER_ERROR = 500;
APIError.NOT_IMPLEMENTED = 501;



// Export the API error
module.exports = exports = APIError;
