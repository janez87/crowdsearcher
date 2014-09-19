// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Comment operation'
} );


// Import the Annotation model
var Annotation = CS.models.annotation;

// Create the CommentError class
var CSError = CS.error;
// Create the CommentError class
var CommentError = function( id, message ) {
  /* jshint camelcase: false */
  CommentError.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( CommentError, CSError );
CommentError.prototype.name = 'CommentError';


function check( data, operation ) {
  log.debug( 'Checking %j', data );
}

// Return an array of Annotation Object
function create( data, operation, callback ) {
  log.debug( 'Creating annotation' );

  var annotation = new Annotation( {
    response: data.response,
    object: data.object,
    operation: operation,
    creationDate: data.date
  } );

  return callback( null, [ annotation ] );
}


// Define the Operation Object
var Comment = {
  name: 'Comment',
  description: 'Write a comment',
  image: null,

  checkData: check,
  create: create,
  params: {}
};


// Export the Operation Object
module.exports = exports = Comment;