// Load libraries
var _ = require( 'underscore' );
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'HotOrNot TT'
} );


// Create the HotOrNot class
var CSError = CS.error;
// Create the HotOrNot class
var HotOrNot = function( id, message ) {
  /* jshint camelcase: false */
  HotOrNot.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( HotOrNot, CSError );
HotOrNot.prototype.name = 'HotOrNot';

// Custom errors
//HotOrNot.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


// Define the Operation Object
var TaskType = {
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  defaults: {},
  params: {
    categories: {
      type: [ 'string' ],
      'default': 'yes,no'
    }
  }
};


// Export the Operation Object
module.exports = exports = TaskType;