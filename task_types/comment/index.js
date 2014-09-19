// Load libraries
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Comment TT'
} );


// Create the Like class
var CSError = CS.error;
// Create the Like class
var Like = function( id, message ) {
  /* jshint camelcase: false */
  Like.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( Like, CSError );
Like.prototype.name = 'Comment';
// Custom errors


// Define the Operation Object
var TaskType = {
  name: 'Comment',
  description: 'Write a comment to the object.',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  image: 'http://icons.iconarchive.com/icons/pixelkit/gentle-edges/128/Comment-2-icon.png',
  defaults: {
    name: '$name$',
    description: '$description$',
    operations: [ {
      label: 'Comment',
      name: 'comment'
    } ],
    splittingStrategy: {
      name: 'EQUI_SPLIT',
      params: {
        objectsNumber: '$objectsNumber$',
        shuffle: true
      }
    },
    assignmentStrategy: {
      name: 'RANDOM'
    },
    implementationStrategy: {
      name: 'RANDOM'
    },
    controlrules: [ {
      name: 'limitObjectEvaluations',
      event: 'END_EXECUTION',
      params: {
        maxExecutions: '$maxExecutions$'
      }
    }, {
      name: 'closeMicroTaskOnObjectStatus',
      event: 'CLOSE_OBJECT'
    }, {
      name: 'closeTaskOnObjectStatus',
      event: 'CLOSE_OBJECT'
    } ]
  },
  useCases: [ 'Comment' ],
  params: {
    name: 'string',
    description: 'string',
    objectsNumber: {
      type: 'number',
      'default': 1
    },
    maxExecutions: 'number'
  }
};

// Export the Operation Object
module.exports = exports = TaskType;