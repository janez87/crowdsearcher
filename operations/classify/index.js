
// Load libraries
var _ = require('underscore');
var util = require('util');
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( { component: 'Classify operation' } );


// Import the Annotation model
var Annotation = CS.models.annotation;

// Create the ClassifyError class
var CSError = require('../../core/error');
// Create the ClassifyError class
var ClassifyError = function( id, message ) {
  /* jshint camelcase: false */
  ClassifyError.super_.call( this, id, message);
};
// Make it subclass Error
util.inherits( ClassifyError, CSError );
ClassifyError.prototype.name = 'ClassifyError';

// Custom errors
ClassifyError.CLASSIFY_BAD_FORMAT = 'CLASSIFY_BAD_FORMAT';
ClassifyError.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


function check( data, operation ) {
  var params = operation.params;
  log.debug( 'Checking %j', data );
  log.debug( 'Operation parametes: %j', params );


  if( !_.isArray( data ) )
    return new ClassifyError( ClassifyError.CLASSIFY_BAD_FORMAT, 'Data not sent as array' );

  // Checking if the posted categories are correct.
  var categories = params.categories;
  // Add empty cate
  categories.push( '' );

  log.trace( 'data: %j', data );
  for (var i=data.length-1; i>=0; i-- ) {
    var answer = data[i];
    log.trace( 'answer: %j', answer );

    if( !_.isArray( answer.value ) )
      answer.value = [ answer.value ];

    // Force conversion to string
    answer.value = _.map( answer.value, String );

    log.trace( 'Value: %j', answer.value );

    var wrongCategories = _.difference(answer.value,categories);
    log.trace( 'wrongCategories: %j', wrongCategories );

    if( wrongCategories.length>0 ){
      return new ClassifyError(ClassifyError.CLASSIFY_BAD_CATEGORIES,'The following categories do not exist:\n'+ wrongCategories.join( ',' ));
    }
  }
}

// Return an array of Annotation Object
function create( data, operation, callback ) {
  log.debug( 'Creating annotations' );

  var annotations = [];

  // For each data recieved
  _.each( data, function( answer ) {
    if( !_.isArray( answer.value ) )
      answer.value = [ answer.value ];

    // Iterate over the categories selected
    _.each( answer.value, function( category ) {
      var annotation = new Annotation( {
        response: category,
        object: answer.objectId,
        operation: operation,
        creationDate: answer.date
      } );

      annotations.push( annotation );
    } );
  } );

  return callback( null, annotations );
}


// Define the Operation Object
var Classify = {
  checkData: check,
  create: create,
  params: {
    categories: {
      type: ['string'],
      'default': 'yes,no'
    }
  }
};


// Export the Operation Object
module.exports = exports = Classify;