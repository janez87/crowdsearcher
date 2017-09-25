'use strict';
let _ = require( 'lodash' );
var fs = require( 'fs' );
var util = require( 'util' );
var CS = require( '../../core' );

// Import a child logger
var log = CS.log.child( {
  component: 'Moderate TT'
} );


// Create the Moderate class
var CSError = CS.error;
// Create the Moderate class
var Moderate = function( id, message ) {
  /* jshint camelcase: false */
  Moderate.super_.call( this, id, message );
};
// Make it subclass Error
util.inherits( Moderate, CSError );
Moderate.prototype.name = 'Moderate';
// Custom errors
//Moderate.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


// Define the Operation Object
var TaskType = {
  name: 'Moderate',
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
      name: 'pushObject',
      params: {
        task: '$task$',
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
      'default': 10
    },
    answers: {
      type: 'number',
      default: 1
    },
    agreement: {
      type: 'number',
      default: 1
    },
    task: {
      type: 'string'
    },
    endpoint: {
      type: 'string'
    }
  }
};

// Export the Operation Object
module.exports = exports = TaskType;