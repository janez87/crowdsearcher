// Load libraries
var _  = require('underscore');
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Test' } );

// Import Models
var Execution = CS.models.execution;
var Job = CS.models.job;
var Task = CS.models.task;
var Microtask = CS.models.microtask;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetAnswersError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetAnswersError.super_.call( this, id, message, status );
};
util.inherits( GetAnswersError, APIError );
// Custom error IDS
GetAnswersError.prototype.name = 'GetAnswersError';
GetAnswersError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// API object returned by the file
// -----
var API = {
  url: 'test',
  method: 'all'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function ( req, res, next ) {
  var platforms = [
    {
      name: 'tef',
      enabled: true,
      invitation: false,
      execution: true,
      params: {
        url: 'http://localhost:8100/'
      }
    }
  ];
  var operations = [
    {
      name: 'like',
      label: 'asderf'
    },{
      name: 'classify',
      label: 'asde',
      params: {
        categories: [ 'reb', 'green', 'blue' ]
      }
    }
  ];
  var controlrules = [
    {
      event: 'OPEN_TASK',
      action: 'testParam',
      type: 'CUSTOM',
      params: {
        name: 'as',
        number: 1
      }
    },
    {
      event: 'OPEN_TASK',
      action: 'EQUI_SPLIT',
      type: 'SPLITTING',
      params: {
        objectsNumber: 2,
        shuffle: true
      }
    },
    {
      event: 'END_TASK',
      action: 'test',
      type: 'CUSTOM'
    }
  ];
  var objects = [
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() }
  ];

  /*
  var job = new Job( {
    name: 'Test Job',
    description: '# Hello\n## moto\n`var volo=culo`'
  } );
  job.save();
  */

  var rawTask = {
    name: 'Test',
    description: '# Hello\n## description\n`var volo=figo`',
    job: '526e8a2d1e671c641a000010',
    //job: job,
    controlrules: controlrules,
    assignmentStrategy: {
      name: 'ROUND_ROBIN'
    },
    implementationStrategy: {
      name: 'RANDOM'
    }
  };
  var task = new Task( rawTask );

  var actions = [
    _.bind( task.addPlatforms, task, platforms ),
    _.bind( task.addOperations, task, operations ),
    _.bind( task.addObjects, task, objects ),
    _.bind( task.open, task ),
    _.bind( task.addObjects, task, objects ),
  ];

  async.series( actions, function ( err, results ) {
    if( err ) return next( err );

    log.trace( 'Results are: %j', results );
    res.send( 'ok' );
  } );
};


// Export the API object
exports = module.exports = API;