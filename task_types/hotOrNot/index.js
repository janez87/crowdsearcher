// Load libraries
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
  name: 'Hot or Not',
  description: 'Compare 2 objects at time.',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  defaults: {
    name: '$name$',
    description: '$description$',
    operations: [ {
      label: 'Like',
      name: 'like'
    } ],
    splittingStrategy: {
      name: 'HOTORNOT'
    },
    assignmentStrategy: {
      name: 'RANDOM'
    },
    implementationStrategy: {
      name: 'RANDOM'
    },
    controlrules: [ {
      name: 'countLikes'
    }, {
      name: 'limitMicrotaskExecution',
      params: {
        maxExecution: '$maxExecution$'
      }
    }, {
      name: 'closeTaskOnMicrotaskStatus'
    } ]
  },
  useCases: [ 'Ranking' ],
  params: {
    name: 'string',
    description: 'string',
    maxExecution: 'number'
  }
};


// Export the Operation Object
module.exports = exports = TaskType;