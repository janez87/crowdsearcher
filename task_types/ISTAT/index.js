'use strict';
// let _ = require( 'lodash' );
var fs = require( 'fs' );
var util = require( 'util' );
var path = require( 'path' );
var CS = require( '../../core' );

// Import a child logger

// Create the IstatError class
var CSError = CS.error;
// Create the IstatError class
var IstatError = function( id, message ) {
  IstatError.super_.call( this, id, message ); // eslint-disable-line no-underscore-dangle
};
// Make it subclass Error
util.inherits( IstatError, CSError );
IstatError.prototype.name = 'IstatError';
// Custom errors
//IstatError.CLASSIFY_BAD_CATEGORIES = 'CLASSIFY_BAD_CATEGORIES';


// Define the Operation Object
var TaskType = {
  name: 'ISTAT',
  description: 'ISTAT use case.',
  template: fs.readFileSync( path.join( __dirname, '/template.hbs' ), 'utf8' ),
  image: 'http://www.istat.it/img/istat.png',
  defaults: {
    name: '$name$',
    description: '$description$',
    'private': true,
    operations: [ {
      label: 'mainClassify',
      name: 'classify',
      params: {
        categories: [ 'yes', 'no', 'offline' ],
      }
    } ],
    splittingStrategy: {
      name: 'ISTAT_EQUI_SPLIT',
      params: {
        field: '$field$',
        objectsNumber: '$objectsNumber$',
      }
    },
    assignmentStrategy: {
      name: 'RANDOM'
    },
    implementationStrategy: {
      name: 'RANDOM',
    },
    controlrules: [
      {
        name: 'classifyMajority',
        params: {
          operation: 'mainClassify',
          answers: '$answers$',
          agreement: '$agreement$'
        }
      },
      {
        name: 'aggregateMajority',
        params: {
          mode: 'SPECIFIC',
          operations: 'mainClassify'
        }
      },
      { name: 'closeMicroTaskOnObjectStatus' },
    ]
  },
  useCases: [ 'ISTAT' ],
  params: {
    name: {
      type: 'string',
      'default': 'ISTAT'
    },
    description: 'text',
    field: {
      type: 'string',
      'default': 'CODICE_AZIENDA'
    },
    objectsNumber: {
      type: 'number',
      'default': 3,
    },
    answers: {
      type: 'number',
      default: 1,
    },
    agreement: {
      type: 'number',
      default: 1,
    },
  }
};

// Export the Operation Object
module.exports = exports = TaskType;