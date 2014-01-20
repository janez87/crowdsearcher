// Load libraries
var _ = require( 'underscore' );
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'SingleClassify TT'
} );


// Create the SingleClassify class
var CSError = CS.error;
// Create the SingleClassify class
var SingleClassify = function( id, message ) {
  /* jshint camelcase: false */
  SingleClassify.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( SingleClassify, CSError );
SingleClassify.prototype.name = 'SingleClassify';
// Custom errors
//SingleClassify.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


// Define the Operation Object
var TaskType = {
  name: 'Single classify',
  description: 'Categorize each object with 1 category.',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  defaults: {},
  useCases: [ 'Classification', 'Ranking' ],
  params: {
    categories: {
      type: [ 'string' ],
      'default': 'yes,no'
    }
  }
};


// Export the Operation Object
module.exports = exports = TaskType;