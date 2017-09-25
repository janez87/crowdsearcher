'use strict';
let _ = require( 'lodash' );
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Score TT'
} );


// Create the Score class
var CSError = CS.error;
// Create the Score class
var Score = function( id, message ) {
  /* jshint camelcase: false */
  Score.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( Score, CSError );
Score.prototype.name = 'Score';
// Custom errors
//Score.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


// Define the Operation Object
var TaskType = {
  name: 'Score',
  description: 'Rate an object by giving a score',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  image: 'http://icons.iconarchive.com/icons/oxygen-icons.org/oxygen/256/Actions-rating-icon.png',
  defaults: {
    name: '$name$',
    description: '$description$',
    operations: [ {
      label: 'score',
      name: 'classify',
      params: {
        categories: '$categories$'
      }
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
    categories: {
      type: [ 'string' ],
      'default': '1,2,3,4,5'
    },
    objectsNumber: {
      type: 'number',
      'default': 1
    },
    maxExecutions: 'number'
  }
};

// Export the Operation Object
module.exports = exports = TaskType;