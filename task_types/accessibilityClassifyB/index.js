// Load libraries
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
  name: 'Accessibility classify Step B',
  description: 'Categorize each object with 1 category.',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  image: 'https://cdn3.iconfinder.com/data/icons/abstract-1/512/Classification-128.png',
  defaults: {
    name: '$name$',
    description: '$description$',
    'private': '$private$',
    operations: [ {
      label: 'What elements can be encountered?',
      name: 'classify',
      params: {
        categories: [ 'One zebra and possibly sidewalks', 'Two zebras and possibly sidewalks', 'No zebra' ],
      }
    }, {
      label: 'Does the street have potholes?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ]
      }
    }, {
      label: 'Does the street have tramlines?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does the street have bumps?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Are there any traffic lights?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Is there an intersection?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
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
        operation: 'What elements can be encountered?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does the street have potholes?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does the street have tramlines?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does the street have bumps?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Are there any traffic lights?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Is there an intersection?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'aggregateMajority',
      params: {
        mode: 'ALL'
      }
    }, {
      name: 'checkGroundTruth',
    }, {
      name: 'closeMicroTaskOnObjectStatus'
    }, {
      name: 'closeTaskOnObjectStatus',
    } ]
  },
  useCases: [ 'Classification', 'Ranking' ],
  params: {
    name: {
      type: 'string',
      'default': 'Single Classification name'
    },
    description: 'text',
    'private': 'boolean',
    objectsNumber: {
      type: 'number',
      'default': 1
    },
    answers: {
      type: 'number',
      default: 1
    },
    agreement: {
      type: 'number',
      default: 1
    }
  }
};

// Export the Operation Object
module.exports = exports = TaskType;