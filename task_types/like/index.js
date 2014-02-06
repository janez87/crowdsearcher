// Load libraries
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Like TT'
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
Like.prototype.name = 'Like';
// Custom errors


// Define the Operation Object
var TaskType = {
  name: 'Like',
  description: 'Rate an object by giving a Like',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  defaults: {
    name: '$name$',
    description: '$description$',
    operations: [ {
      label: 'Like',
      name: 'like'
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
  useCases: [ 'Ranking' ],
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