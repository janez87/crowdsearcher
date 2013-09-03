
// Load libraries
var _ = require('underscore');
var util = require('util');

// Import a child logger
var log = common.log.child( { component: 'Fuzzy Classify operation' } );


// Import the Annotation model
var Annotation = common.models.annotation;

// Create the FuzzyClassifyError class
var CSError = require('../../error');
// Create the FuzzyClassifyError class
var FuzzyClassifyError = function( id, message ) {
  FuzzyClassifyError.super_.call( this, id, message);
};
// Make it subclass Error
util.inherits( FuzzyClassifyError, CSError );
FuzzyClassifyError.prototype.name = 'FuzzyClassifyError';

// Custom errors
FuzzyClassifyError.FUZZYCLASSIFY_BAD_FORMAT = 'FUZZYCLASSIFY_BAD_FORMAT';
FuzzyClassifyError.FUZZYCLASSIFY_BAD_CATEGORIES = 'FUZZYCLASSIFY_BAD_CATEGORIES';


function checkData( data, operation ) {
  var params = operation.params;
  log.debug( 'Checking %j', data );
  log.debug( 'Operation parametes: %j', params );


  if( !_.isArray( data ) )
    return new FuzzyClassifyError( FuzzyClassifyError.FUZZYCLASSIFY_BAD_FORMAT, 'Data not sent as array' );

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
      return new FuzzyClassifyError(FuzzyClassifyError.FUZZYCLASSIFY_BAD_CATEGORIES,'The following categories do not exist:\n'+ wrongCategories.join( ',' ));
    }
  }
}

// Return an array of annotation Annotation Object
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
        operation: operation
      } );

      annotations.push( annotation );
    } );
  } );

  return callback( null, annotations );
}


// Define the Operation Object
var FuzzyClassify = {
  checkData: checkData,
  create: create,
  params: {
    categories: {
      type: ['string'],
      'default': 'first,second,third'
    }
  }
};


// Export the Operation Object
module.exports = exports = FuzzyClassify;