// Load libraries
var _  = require('underscore');
var util = require( 'util' );
var async = require( 'async' );

// Import a child Logger
var log = common.log.child( { component: 'Test' } );

// Import Models
var Execution = common.models.execution;
var Job = common.models.job;
var Task = common.models.task;
var Microtask = common.models.microtask;

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
      execution: true
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
    description: '# Hello\n ## moto\n`var volo=culo`'
  } );
  job.save();
  */

  var rawTask = {
    name: 'Test',
    job: '526903f7c67e801c0c00000a',
    //job: job,
    controlrules: controlrules,
    /*
    splittingStrategy: {
      name: 'EQUI_SPLIT',
      params: {
        objectsNumber: 2,
        shuffle: true
      }
    }
    */
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