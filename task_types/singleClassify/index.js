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
  defaults: {
    name: '$name$',
    description: '$description$',
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
      event: 'END_EXECUTION',
      params: {
        operation: 'mainClassify',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'aggregateMajority',
      event: 'END_EXECUTION',
      params: {
        mode: 'SPECIFIC',
        operations: 'mainClassify'
      }
    }, {
      name: 'checkGroundTruth',
      event: 'END_EXECUTION'
    }, {
      name: 'closeMicroTaskOnObjectStatus',
      event: 'CLOSE_OBJECT'
    }, {
      name: 'closeTaskOnObjectStatus',
      event: 'CLOSE_OBJECT'
    } ]
  },
  useCases: [ 'Classification', 'Ranking' ],
  params: {
    name: 'string',
    description: 'string',
    categories: {
      type: [ 'string' ],
      'default': 'yes,no'
    },
    objectsNumber: {
      type: 'number',
      'default': 1
    },
    // possono essere calcolate in base al numero di classi?
    answers: 'number',
    agreement: 'number'
  }
};

// Export the Operation Object
module.exports = exports = TaskType;