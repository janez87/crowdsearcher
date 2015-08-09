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
  name: 'Accessibility classify Step C',
  description: 'Categorize each object with 1 category.',
  template: fs.readFileSync( __dirname + '/template.hbs', 'utf8' ),
  image: 'https://cdn3.iconfinder.com/data/icons/abstract-1/512/Classification-128.png',
  defaults: {
    name: '$name$',
    description: '$description$',
    'private': '$private$',
    operations: [ {
      label: 'Is there a sidewalk?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does it have potholes?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ]
      }
    }, {
      label: 'Does it have bumps?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Is the surface made of cobbles?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Is the surface made of ghiaia?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Is it narrow?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does it have gratings?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does it have drains?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Can you encounter obstacles a chain?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Can you encounter obstacles a dissuasore?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does it have a dropped kerb?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Is it positioned correctly with respect to the zebra?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Is the surface neat?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does it have the proper inclination?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'Does it have high curbsides?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Is the surface made of cobbles?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Is the surface made of ghiaia?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Is it narrow?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Does it have gratins?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Does it have drains',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Can you encounter a chain?',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no' ],
      }
    }, {
      label: 'NO_Can you encounter a dissuasore?',
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
        operation: 'Is there a sidewalk?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does it have bumps?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Is the surface made of cobbles?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Is the surface made of ghiaia?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Is it narrow?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does it have gratings?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does it have drains?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Can you encounter a chain:',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Can you encounter a dissuasore:',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does it have dropped kerb?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Is it positioned correctly with respect to the zebra?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Is the surface neat?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does it have a proper inclination?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'Does it have high curbsides?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Is the surface made of cobbles?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Is the surface made of ghiaia?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Is is narrow?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Does it have gratings?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Does it have drains?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Can you encounter a dissuasore?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'classifyMajority',
      params: {
        operation: 'NO_Can you encounter a chain?',
        answers: '$answers$',
        agreement: '$agreement$'
      }
    }, {
      name: 'aggregateMajority',
      params: {
        mode: 'ALL'
      }
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