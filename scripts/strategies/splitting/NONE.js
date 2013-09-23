

// Load libraries
var util = require('util');

var log = common.log.child( { component: 'EquiSplit Splitting Strategy' } );


// Import Models

// Custom error
// ---
var CSError = require('../../../error');
var EquiSplitError = function( id, message ) {
    EquiSplitError.super_.call( this, id, message);
};

util.inherits( EquiSplitError, CSError );

// Error name
EquiSplitError.prototype.name = 'EquiSplitError';

// Custom error IDs
EquiSplitError.ZERO_OBJECTS = 'ZERO_OBJECTS';
EquiSplitError.CONFIGURATION_MISMATCH = 'CONFIGURATION_MISMATCH';
EquiSplitError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';

// # Strategy logic
// DESCRIPTION
var performStrategy = function( data, params, callback ) {
  log.trace( 'Performing strategy on "%s" event', data.event );

  return callback();

};


// ## Events
// This strategy will be triggered on these CS events

var triggerOn = [
  'OPEN_TASK',
  'ADD_OBJECTS',
  'ON_EOF'
];

// ## Parameters

// Parameters needed by the strategy
var params = {
};


// Check the passed parameters
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;
