// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var domain = require( 'domain' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Like operation'
} );


// Import the Annotation model
var Annotation = CS.models.annotation;
var MicroTask = CS.models.microtask;

// Create the LikeError class
var CSError = require( '../../core/error' );
// Create the LikeError class
var LikeError = function( id, message ) {
  LikeError.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( LikeError, CSError );
LikeError.prototype.name = 'LikeError';

// Custom errors
LikeError.LIKE_BAD_FORMAT = 'LIKE_BAD_FORMAT';



function checkData( data, operation ) {
  log.debug( 'Checking %j', data );

  // Empty data sent, no object liked.. everything ok
  if ( !_.isObject( data ) )
    return;

  // Data sent but in wrong format
  if ( !_.isArray( data ) )
    return new LikeError( LikeError.LIKE_BAD_FORMAT, 'Data not sent as array' );
}




// Return an Annotation Object
function create( data, operation, callback ) {
  log.debug( 'Creating annotation' );

  if( data.response ) {
    var annotation = new Annotation( {
      object: data.object,
      operation: operation,
      creationDate: data.date
    } );

    return callback( null, [ annotation ] );
  }

  return callback( null, [] );

}


// Define the Operation Object
var Like = {
  name: 'Like',
  description: 'Provide a preference on a set of objects',
  image: null,

  checkData: checkData,
  create: create
};


// Export the Operation Object
module.exports = exports = Like;