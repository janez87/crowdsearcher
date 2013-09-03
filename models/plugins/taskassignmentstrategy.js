

// Load libraries
var util = require('util');
var mongo = require('mongoose');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;

// Create a child logger
var log = common.log.child( { component: 'TaskAssignmentStrategy plugin' } );





// Cutom error
// ----
var CSError = require('../../error');
var TaskAssignmentStrategyError = function( id, message) {
  /* jshint camelcase: false */
  TaskAssignmentStrategyError.super_.call( this, id, message );
};

util.inherits( TaskAssignmentStrategyError, CSError );

// Error name
TaskAssignmentStrategyError.prototype.name = 'TaskAssignmentStrategyError';

// Custom error IDs
TaskAssignmentStrategyError.STRATEGY_NOT_FOUND = 'STRATEGY_NOT_FOUND';







// Task Assignment strategy
module.exports = exports = function taskAssignmentStrategyPlugin( schema ) {

  // Add the `taskAssignment` strategy field
  schema.add( {
    taskAssignmentStrategy: {
      name: {
        type: String,
        'default': 'SEQUENCE'
      },
      params:  {
        type: Mixed,
        'default': {}
      }
    }
  } );


  // Pre check done before saving.
  schema.pre('save', function( next ) {
    this.checkTaskAssignmentStrategy( next );
  } );

  schema.methods.checkTaskAssignmentStrategy = function( callback ) {
    var name = this.taskAssignmentStrategy.name;
    var params = this.taskAssignmentStrategy.params;

    // Load strategy to perform the check
    var strategy = common.strategies.taskAssignment[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new TaskAssignmentStrategyError( TaskAssignmentStrategyError.STRATEGY_NOT_FOUND,'The Task Assignment strategy '+name+' does not exist' ) );

    strategy.check( this, params, callback );
  };

  schema.methods.setTaskAssignmentStrategy = function( taskAssignmentStrategy, callback ) {
    // Associate the taskAssignmentStrategy
    this.taskAssignmentStrategy = taskAssignmentStrategy;
    // Save the task, this will trigger the `pre` middleware.
    this.save( callback );
  };

  schema.methods.performTaskAssigmentStrategy = function( data, callback ) {
    // Load the strategy configuration.
    var name = this.taskAssignmentStrategy.name;
    var params = this.taskAssignmentStrategy.params;
    log.trace( 'Performing Task Assignment Strategy %s', name );

    var strategy = common.strategies.taskAssignment[ name ];

    // Wrap the call to the strategy into a try catch to get possible errors in the strategy
    if( !strategy )
      return callback( new TaskAssignmentStrategyError( TaskAssignmentStrategyError.STRATEGY_NOT_FOUND,'The Task Assignment strategy '+name+' does not exist' ) );

    strategy.perform( data, params, callback );
  };
};