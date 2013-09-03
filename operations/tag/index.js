
// Load libraries
var _ = require('underscore');
var util = require('util');

// Import a child logger
var log = common.log.child( { component: 'Tag operation' } );


// Import the models
var Annotation = common.models.annotation;

// Create the TagError class
var CSError = require('../../error');
// Create the TagError class
var TagError = function( id, message ) {
  TagError.super_.call( this, id, message);
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

  if( !_.isArray( data ) )
    return new TagError( TagError.TAG_BAD_FORMAT, 'Data not sent as array' );
}

// Return an Annotation Object
function create( data, operation, callback ) {
  log.debug( 'Creating annotations' );
  var annotations = [];

  _.each( data, function( answer ) {
    if( !_.isArray( answer.value ) )
      answer.value = [ answer.value ];

    log.trace( 'Values: %j', answer.value );
    _.each( answer.value, function( tag ) {
      log.trace( 'Creating annotation' );
      var annotation = new Annotation( {
        response: tag,
        object: answer.objectId,
        operation: operation
      } );
      annotations.push( annotation );
    } );
  } );

  return callback( null, annotations );
}


// Define the Operation Object
var Tag = {
  checkData: checkData,
  create: create
};


// Export the Operation Object
module.exports = exports = Tag;