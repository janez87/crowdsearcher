'use strict';
let _ = require( 'lodash' );
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Highlight TT'
} );


// Create the Highlight class
var CSError = CS.error;
// Create the Highlight class
var Highlight = function( id, message ) {
  /* jshint camelcase: false */
  Highlight.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( Highlight, CSError );
Highlight.prototype.name = 'Highlight';
// Custom errors
//Highlight.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


// Define the Operation Object
var TaskType = {
  name: 'Highlight',
  description: 'Categorize each object with 1 category.',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  image: 'https://cdn3.iconfinder.com/data/icons/abstract-1/512/Classification-128.png',
  defaults: {
    name: '$name$',
    description: '$description$',
    'private': '$private$',
    operations: [ {
      label: 'mainClassify',
      name: 'classify',
      params: {
        categories: '$categories$',
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
      name: 'RANDOM',
    },
    controlrules: [ {
      name: 'classifyMajority',
      params: {
        operation: 'mainClassify',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'aggregateMajority',
      params: {
        mode: 'SPECIFIC',
        operations: 'mainClassify'
      }
    }, {
      name: 'pushHighlightedObject',
      params: {
        endpoint: '$endpoint$'
      }
    }, {
      name: 'closeMicroTaskOnObjectStatus'
    } ]
  },
  useCases: [ 'Classification', 'Ranking' ],
  params: {
    name: {
      type: 'string',
      'default': 'Single Classification name'
    },
    description: 'text',
    categories: {
      type: [ 'string' ],
      'default': 'yes,no'
    },
    'private': 'boolean',
    objectsNumber: {
      type: 'number',
      'default': 7
    },
    answers: {
      type: 'number',
      default: 1
    },
    agreement: {
      type: 'number',
      default: 1
    },
    endpoint: {
      type: 'string'
    }
  }
};

// Export the Operation Object
module.exports = exports = TaskType;