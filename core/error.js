// # General error used in the *CrowdSearcher*
// Subclass it to generate Specific errors.


var util = require('util');

var CSError = function( id, message) {
  Error.captureStackTrace( this, CSError );

  this.id = id || 'GENERIC_ERROR';
  this.message = message || this.name;
};

// Make it subclass Error
util.inherits( CSError, Error );
CSError.prototype.name = 'CSError';
CSError.prototype.toString = function() {
  return this.name+' ('+this.id+')';
};

// Export the API error
module.exports = exports = CSError;