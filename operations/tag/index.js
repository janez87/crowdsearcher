// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Tag operation'
} );


// Import the models
var Annotation = CS.models.annotation;

// Create the TagError class
var CSError = require( '../../core/error' );
// Create the TagError class
var TagError = function( id, message ) {
  TagError.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( TagError, CSError );
TagError.prototype.name = 'TagError';

// Custom errors
TagError.TAG_BAD_FORMAT = 'TAG_BAD_FORMAT';



function checkData( data, operation ) {
  var params = operation.params;
  log.debug( 'Checking %j', data );
  log.debug( 'Operation parametes: %j', params );

  if ( !_.isArray( data ) )
    return new TagError( TagError.TAG_BAD_FORMAT, 'Data not sent as array' );
}

// Return an Annotation Object
function create( data, operation, callback ) {
  log.debug( 'Creating annotation' );

  var annotations = [];
  _.each( data.response, function( tag ) {
    var annotation = new Annotation( {
      response: tag,
      object: data.object,
      operation: operation,
      creationDate: data.date
    } );
    annotations.push( annotation );
  } );

  return callback( null, annotations );
}


// Define the Operation Object
var Tag = {
  name: 'Tag',
  description: 'Add a set of tags to the object.',
  image: '',

  checkData: checkData,
  create: create
};


// Export the Operation Object
module.exports = exports = Tag;