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
      name: 'checkSpammer',
      params: {
        answers: '$nanswers$',
        threshold: '$threshold$'
      }
    }, {
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
      name: 'checkGroundTruth',
    }, {
      name: 'closeMicroTaskOnObjectStatus'
    }, {
      name: 'closeTaskOnObjectStatus',
    }, {
      name: 'computeAlfa',
    }, {
      name: 'pushObject'
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
    // possono essere calcolate in base al numero di classi?
    answers: {
      type: 'number',
      default: 1
    },
    agreement: {
      type: 'number',
      default: 1
    },
    nanswers: {
      type: 'number',
      default: 10
    },
    threshold: {
      type: 'number',
      default: 0.5
    }
  }
};

// Export the Operation Object
module.exports = exports = TaskType;