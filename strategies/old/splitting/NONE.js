
'use strict';
var log = CS.log.child( { component: 'NONE Splitting Strategy' } );


// # Strategy logic
var performStrategy = function( data, params, callback ) {
  log.trace( 'Performing strategy on "%s" event', data.event );

  log.trace( 'NONENONENONE' );

  return callback();

};


// ## Events
// This strategy will be triggered on these CS events
var triggerOn = [
  'OPEN_TASK',
  'ADD_OBJECTS',
  'ON_EOF'
];


// Check the passed parameters
var checkParameters = function( task, params, callback ) {
  log.trace( 'Checking' );

  return callback();
};


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.triggerOn = exports.triggerOn = triggerOn;