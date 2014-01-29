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
    description: '$description$'
    operation: {
      name: 'classify',
      params: {
        categories: '$categories$',
        label: 'mainClassify'
      }
    },
    splitting: {
      name: 'EQUI_SPLIT',
      params: {
        objectsNumber: '$objectsNumber$',
        shuffle: true
      }
    },
    assignment: {
      name: 'RANDOM'
    },
    execution: {
      name: 'RANDOM',
    },
    rules: [ {
        name: 'classifyMajority',
        event: 'END_EXECUTION'.
        params: {
          operation: 'mainClassify',
          answers: '$asnwers$',
          agreement: '$agreement$'
        },
        {
          name: 'aggregateMajority',
          event: 'END_EXECUTION',
          params: {
            mode: 'SPECIFIC',
            operations: 'mainClassify'
          }

        }
      }

    ]
  },
  useCases: [ 'Classification', 'Ranking' ],
  params: {
    name: 'string',
    description: 'string'
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