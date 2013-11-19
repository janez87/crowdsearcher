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
        url: 'http://131.175.59.94:8100/'
      }
    }
    /*
    {
      name: 'amt',
      enabled: true,
      invitation: false,
      execution: true,
      params: {
        accessKeyId: 'AKIAIJEW5UG5SRI2TUQA',
        secretAccessKey: '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',
        price: 10
      }
    }
    */
  ];
  var operations = [
    {
      name: 'like',
      label: 'asderf'
    },{
      name: 'classify',
      label: 'asde',
      params: {
        categories: [ 'red', 'green', 'blue' ]
      }
    }
  ];
  var controlrules = [
    {
      type: 'SPLITTING',
      action: 'EQUI_SPLIT',
      params: {
        objectsNumber: 1,
        shuffle: true
      }
    },
    /*
    {
      type: 'CUSTOM',
      action: 'limitMicrotaskExecution',
      params: {
        maxExecution: 1
      }
    },
    {
      type: 'CUSTOM',
      action: 'limitTaskExecution',
      params: {
        maxExecution: 5
      }
    }
    */
    {
      type: 'CUSTOM',
      action: 'closeTaskOnObjectStatus'
    },
    {
      type: 'CUSTOM',
      action: 'closeMicroTaskOnObjectStatus'
    }
  ];
  var objects = [
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    { data: 'Numero: '+Math.random() },
    /*
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
    */
  ];

  /*
  var job = new Job( {
    name: 'Test Job',
    description: '# Hello\n## moto\n`var volo="io"`'
  } );
  job.save();
  */

  var rawTask = {
    name: 'Test',
    //private: true,
    description: '# Hello\n## description\n`var volo="Io"`',
    job: '5289fbfed92edb9814000010',
    //job: job,
    controlrules: controlrules,
    assignmentStrategy: {
      name: 'RANDOM'
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
    _.bind( task.open, task )
    //_.bind( task.addObjects, task, objects ),
  ];

  async.series( actions, function ( err, results ) {
    if( err ) return next( err );

    log.trace( 'Results are: %j', results );
    res.send( 'ok' );
  } );
};


// Export the API object
exports = module.exports = API;