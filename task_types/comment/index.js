'use strict';
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
  image: 'https://lh6.googleusercontent.com/-twnar3yX1zA/AAAAAAAAAAI/AAAAAAAAAA0/8Nsc4Txh4kI/photo.jpg',
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
      name: 'limitMicrotaskExecution',
      event: 'END_EXECUTION',
      params: {
        maxExecution: '$maxExecutions$'
      }
    }, {
      name: 'closeTaskOnMicrotaskStatus',
      event: 'END_MICROTASK'
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