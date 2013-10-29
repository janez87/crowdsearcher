// Load libraries
var _  = require('underscore');
var util  = require('util');
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Get Configuration' } );



// Generate custom error `GetConfigurationError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetConfigurationError = function( id, message, status ) {
  GetConfigurationError.super_.call( this, id, message, status );
};
util.inherits( GetConfigurationError, APIError );
// Custom error IDS
GetConfigurationError.prototype.name = 'GetConfigurationError';


// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'configuration',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getConfiguration( req, res ) {

  // If none is selected then return everything
  var force = _.isEmpty( req.query );

  var properties = req.query;


  log.trace( 'Returning %j', properties );
  var configuration = {};

  // Compute and return the platforms
  if( properties.platforms==='true' || force ) {
    configuration.platforms = [];
    _.each( CS.platforms, function( platform, name ) {
      configuration.platforms.push( {
        name: name,
        params: platform.params,
        invitation: _.isFunction( platform.invite ),
        execution: _.isFunction( platform.execute ),
        enabled: !!platform.enabled
      } );
    } );
  }


  // Compute and return the invitation strategies
  if( properties.invitationStrategies==='true' || force ) {
    configuration.invitationStrategies = [];
    _.each( CS.invitation, function( strategy, name ) {
      configuration.invitationStrategies.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
  }

  // Compute and return the splitting strategies
  if( properties.splittingStrategies==='true' || force ) {
    configuration.splittingStrategies = [];
    _.each( CS.splitting, function( strategy, name ) {
      configuration.splittingStrategies.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
  }

  // Compute and return the Microtask assignment strategies
  if( properties.taskAssignmentStrategies==='true' || force ) {
    configuration.taskAssignmentStrategies = [];
    _.each( CS.taskAssignment, function( strategy, name ) {
      configuration.taskAssignmentStrategies.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
  }

  // Compute and return the Microtask assignment strategies
  if( properties.assignmentStrategies==='true' || force ) {
    configuration.assignmentStrategies = [];
    _.each( CS.assignment, function( strategy, name ) {
      configuration.assignmentStrategies.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
  }

  // Compute and return the implementation strategies
  if( properties.executionStrategies==='true' || force ) {
    configuration.executionStrategies = [];
    _.each( CS.implementation, function( strategy, name ) {
      configuration.executionStrategies.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
  }

  // Return the field types... mmm not really necessary
  if( properties.fieldTypes==='true' || force ) {
    configuration.fieldTypes = [
      'STRING',
      'TEXT',
      'URL',
      'DATE',
      'IMAGE',
      'VIDEO',
      'BLOB',
      'NUMBER',
      'INT'
    ];
  }

  // Compute and return the task types
  if( properties.taskTypes==='true' || force ) {
    configuration.taskTypes = [];
    _.each( CS.operations, function( operation, name ) {
      configuration.taskTypes.push( {
        name: name,
        params: operation.params
      } );
    } );
  }


  // Compute and return the object control strategies
  if( properties.objectControlStrategies==='true' || force ) {
    configuration.objectControlStrategies = [];

    //TODO: FIx temp hack
    configuration.objectControlStrategies.push( {
      name: 'Majority',
      actions: [
        {
          action: 'loopMajority',
          mapping: {
            agreement: 'agreement',
            numberOfAnswer: 'numberOfAnswer'
          },
          events: [ 'END_EXECUTION' ]
        },
        {
          action: 'aggregateMajority',
          mapping: {
            mode: 'mode',
            operation: 'operation'
          },
          events: [ 'END_EXECUTION' ]
        },
      ],
      params: {
        agreement: [ 'string' ],
        numberOfAnswer: [ 'string' ],
        mode:{
          type: 'enum',
          values: ['ALL','ONE','SPECIFIC']
        },
        operation: ['string']
      }
    } );

    configuration.objectControlStrategies.push( {
      name: 'Check object status',
      actions: [
        {
          action: 'closeMicroTaskOnObjectStatus',
          events: [ 'END_EXECUTION' ]
        },
        {
          action: 'closeTaskOnObjectsStatus',
          events: [ 'END_EXECUTION' ]
        },
      ]
    } );
  }

  // Compute and return the performer control strategies
  if( properties.performerControlStrategies==='true' || force ) {
    configuration.performerControlStrategies = [];

    //TODO: FIx temp hack
    /*
    configuration.performerControlStrategies.push( {
      name: 'Check spammer',
      actions: [
        {
          action: 'create_performer_metadata',
          events: [ 'END_EXECUTION' ]
        },
        {
          action: 'update_score',
          events: [ 'END_EXECUTION' ]
        },
        {
          action: 'check_spammer',
          events: [ 'END_EXECUTION' ]
        }
      ],
      params: {
        threshold: 'number',
        minAnswers: 'number'
      }
    } );
    */
  }

  // Compute and return the task control strategies
  if( properties.taskControlStrategies==='true' || force ) {
    configuration.taskControlStrategies = [];

    //TODO: FIx temp hack
    /*
    configuration.taskControlStrategies.push( {
      name: 'Check Microtask',
      actions: [
        {
          action: 'check_completed',
          events: [ 'END_EXECUTION' ]
        }
      ],
      params: {
        percentage: 'number'
      }
    } );
    */
  }


  // Return the available events
  if( properties.events==='true' || force ) {
    configuration.events = [
      'ADD_TASK',
      'OPEN_TASK',
      'END_TASK',
      'EOF_TASK',

      'ADD_OBJECT',
      'CLOSE_OBJECT',

      'ADD_MICROTASK',
      'END_MICROTASK',

      'END_EXECUTION'
    ];

  }

  // Compute and return the list of available custom control rules
  if( properties.eventScripts==='true' || force ) {
    configuration.eventScripts = [];
    _.each( CS.rules, function( customRule, name ) {
      configuration.eventScripts.push( {
        name: name,
        params: customRule.params
      } );
    } );
  }

  res.json( configuration );
};


// Export the API object
exports = module.exports = API;