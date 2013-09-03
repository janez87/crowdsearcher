
// Load libraries
var _ = require('underscore');
var util = require('util');
var domain = require('domain');

// Import a child logger
var log = common.log.child( { component: 'Like operation' } );


// Import the Annotation model
var Annotation = GLOBAL.common.models.annotation;
var MicroTask = GLOBAL.common.models.microtask;

// Create the LikeError class
var CSError = require('../../error');
// Create the LikeError class
var LikeError = function( id, message ) {
  LikeError.super_.call( this, id, message);
};
// Make it subclass Error
util.inherits( LikeError, CSError );
LikeError.prototype.name = 'LikeError';

// Custom errors
LikeError.LIKE_BAD_FORMAT = 'LIKE_BAD_FORMAT';



function checkData( data, operation ) {
  log.debug( 'Checking %j', data );

  // Empty data sent, no object liked.. everything ok
  if( !_.isObject( data ) )
    return;

  // Data sent but in wrong format
  if( !_.isArray( data ) )
    return new LikeError( LikeError.LIKE_BAD_FORMAT, 'Data not sent as array' );
}




// Return an Annotation Object
function create( data, operation, callback ) {
  log.debug( 'Creating annotation' );
  
  var annotations = [];
  // Create an annotation for each 
  _.each( data, function( obj ) {
    var annotation = new Annotation( {
      operation: operation,
      object: obj.objectId
    } );
    
    annotations.push( annotation );
  } );

  return callback( null, annotations );
}


// Define the Operation Object
var Like = {
  checkData: checkData,
  create: create
};


// Export the Operation Object
module.exports = exports = Like;