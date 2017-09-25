'use strict';
let _ = require( 'lodash' );
var util = require( 'util' );
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( {
  component: 'Get Configuration'
} );



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
  url: 'configuration/:property?',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getConfiguration( req, res ) {
  var property = req.params.property;

  var force = !property;
  var data = {};

  log.trace( 'Getting %s from configuration', force ? 'all properties' : property );

  // Compute and return the platforms
  if ( property === 'platforms' || force ) {
    var platforms = {};

    _.each( CS.platforms, function( platform, name ) {
      platforms[ name ] = _.clone( platform );
      platforms[ name ].invitation = _.isFunction( platform.invite );
      platforms[ name ].execution = _.isFunction( platform.execute );
      platforms[ name ].enabled = !! platform.enabled;
    } );
    if ( force ) {
      data.platforms = platforms;
    } else {
      data = platforms;
    }
  }


  // Compute and return the invitation strategies
  if ( property === 'invitation' || force ) {
    var invitation = [];
    _.each( CS.invitation, function( strategy, name ) {
      invitation.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
    if ( force ) {
      data.invitation = invitation;
    } else {
      data = invitation;
    }
  }

  // Compute and return the splitting strategies
  if ( property === 'splitting' || force ) {
    var splitting = [];
    _.each( CS.splitting, function( strategy, name ) {
      splitting.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
    if ( force ) {
      data.splitting = splitting;
    } else {
      data = splitting;
    }
  }

  // Compute and return the Microtask assignment strategies
  if ( property === 'taskAssignment' || force ) {
    var taskAssignments = [];
    _.each( CS.taskAssignment, function( strategy, name ) {
      taskAssignments.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
    if ( force ) {
      data.taskAssignments = taskAssignments;
    } else {
      data = taskAssignments;
    }
  }

  // Compute and return the Microtask assignment strategies
  if ( property === 'assignment' || force ) {
    var assignment = [];
    _.each( CS.assignment, function( strategy, name ) {
      assignment.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
    if ( force ) {
      data.assignment = assignment;
    } else {
      data = assignment;
    }
  }

  // Compute and return the implementation strategies
  if ( property === 'implementation' || force ) {
    var implementation = [];
    _.each( CS.implementation, function( strategy, name ) {
      implementation.push( {
        name: name,
        params: strategy.params,
        triggerOn: strategy.triggerOn
      } );
    } );
    if ( force ) {
      data.implementation = implementation;
    } else {
      data = implementation;
    }
  }


  // Compute and return the task types
  if ( property === 'operations' || force ) {
    var operations = CS.operations;
    if ( force ) {
      data.operations = operations;
    } else {
      data = operations;
    }
  }


  // Compute and return the object control strategies
  if ( property === 'objectControlStrategies' || force ) {
    var objectControlStrategies = [];

    //TODO: FIx temp hack
    objectControlStrategies.push( {
      name: 'Check object status',
      actions: [ {
        name: 'closeMicroTaskOnObjectStatus',
      }, {
        name: 'closeTaskOnObjectStatus',
      }, ]
    } );


    if ( force ) {
      data.objectControlStrategies = objectControlStrategies;
    } else {
      data = objectControlStrategies;
    }
  }

  // Compute and return the performer control strategies
  if ( property === 'performerControlStrategies' || force ) {
    var performerControlStrategies = [];
    if ( force ) {
      data.performerControlStrategies = performerControlStrategies;
    } else {
      data = performerControlStrategies;
    }

    //TODO: FIx temp hack
    /*
    data.performerControlStrategies.push( {
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
  if ( property === 'taskControlStrategies' || force ) {
    var taskControlStrategies = [];
    if ( force ) {
      data.taskControlStrategies = taskControlStrategies;
    } else {
      data = taskControlStrategies;
    }

    //TODO: FIx temp hack
    /*
    data.taskControlStrategies.push( {
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
  if ( property === 'events' || force ) {
    data.events = [
      'OPEN_TASK',
      'EOF_TASK',
      'END_TASK',

      'ADD_OBJECTS',
      'CLOSE_OBJECT',

      'ADD_MICROTASKS',
      'END_MICROTASK',

      'END_EXECUTION'
    ];
  }


  // Compute and return the Task Types
  if ( property === 'taskTypes' || force ) {
    var taskTypes = [];
    var useCases = {};
    _.each( CS.taskTypes, function( taskType, name ) {
      taskTypes.push( taskType );

      _.each( taskType.useCases, function( useCase ) {
        useCases[ useCase ] = useCases[ useCase ] || [];
        useCases[ useCase ].push( name );
      } );
    } );
    if ( force ) {
      data.taskTypes = taskTypes;
      data.useCases = useCases;
    } else {
      data = {
        taskTypes: taskTypes,
        useCases: useCases
      };
    }
  }


  // Compute and return the list of available custom control rules
  if ( property === 'rules' || force ) {
    data.rules = [];
    _.each( CS.rules, function( customRule, name ) {
      data.rules.push( {
        name: name,
        params: customRule.params
      } );
    } );
  }

  res.json( data );
};


// Export the API object
exports = module.exports = API;