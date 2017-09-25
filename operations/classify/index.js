'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../../core' );

// Constant declaration

// Module variables declaration
let Annotation = CS.models.annotation;
let CSError = CS.error;
let log = CS.log.child( {
  component: 'Classify operation'
} );

// Custom errors
class ClassifyError extends CSError {}
ClassifyError.CLASSIFY_BAD_FORMAT = 'CLASSIFY_BAD_FORMAT';
ClassifyError.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';

// Module functions declaration
function check( data, operation ) {
  var params = operation.params;
  log.debug( 'Checking %j', data );
  log.debug( 'Operation parametes: %j', params );


  if( !_.isArray( data ) ) {
    return new ClassifyError( ClassifyError.CLASSIFY_BAD_FORMAT, 'Data not sent as array' );
  }

  // Checking if the posted categories are correct.
  var categories = params.categories;
  // Add empty category
  categories.push( '' );

  log.trace( 'data: %j', data );
  for ( var i = data.length - 1; i >= 0; i-- ) {
    var answer = data[ i ];
    log.trace( 'answer: %j', answer );

    if ( !_.isArray( answer.value ) )
      answer.value = [ answer.value ];

    // Force conversion to string
    answer.value = _.map( answer.value, String );

    log.trace( 'Value: %j', answer.value );

    var wrongCategories = _.difference( answer.value, categories );
    log.trace( 'wrongCategories: %j', wrongCategories );

    if ( wrongCategories.length > 0 ) {
      return new ClassifyError( ClassifyError.CLASSIFY_BAD_CATEGORIES, 'The following categories do not exist:\n' + wrongCategories.join( ',' ) );
    }
  }
}
function create( data, operation, callback ) {
  log.debug( 'Creating annotation' );

  var annotation = new Annotation( {
    response: data.response,
    object: data.object,
    operation: operation,
    creationDate: data.date
  } );

  return Promise
  .resolve( [ annotation ] )
  .asCallback( callback );
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = {
  name: 'Classify',
  description: 'Select a category for each object.',
  image: null,

  checkData: check,
  create: create,
  params: {
    categories: {
      type: [ 'string' ],
      'default': 'yes,no'
    }
  }
};