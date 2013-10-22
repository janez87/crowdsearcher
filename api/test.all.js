// Load libraries
var _  = require('underscore');
var util  = require('util');

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
  var platforms = [ {
    name: 'tef',
    enabled: true,
    invitation: false,
    execution: true
  } ];
  var operations = {
    name: 'like',
    label: 'asderf'
  };
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
      action: 'test',
      type: 'CUSTOM'
    },
    {
      event: 'END_TASK',
      action: 'test',
      type: 'CUSTOM'
    }
  ];
  var rawTask = {
    name: 'Test',
    job: '52654aca6b976e1403000007',
    controlrules: controlrules
  };
  var task = new Task( rawTask );

  task.addPlatforms( platforms, function( err ) {
    if( err ) return next( err );

    task.addOperations( operations, function( err ) {
      if( err ) return next( err );

      task.open( function( err ) {
        if( err ) return next( err );

        task.close( function( err ) {
          if( err ) return next( err );

          res.send( 'ok' );
        } );
      });
    } );
  });
};


// Export the API object
exports = module.exports = API;