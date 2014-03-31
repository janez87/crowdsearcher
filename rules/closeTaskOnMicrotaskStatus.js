// Load libraries
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Close Task'
} );

// Models
var Microtask = CS.models.microtask;

function onCloseMicrotask( params, task, data, callback ) {

  if ( task.closed )
    return callback();

  var microtasksNumber = task.microtasks.length;

  Microtask
    .find()
    .where( 'task', task._id )
    .where( 'status', 'CLOSED' )
    .count()
    .exec( function( err, count ) {
      if ( err ) return callback( err );

      log.trace( 'Found %s closed microtasks', count );
      if ( count === microtasksNumber )
        return task.close( callback );

      return callback();
    } );
}

// # Rule definition
//
// Description of the rule.
var rule = {
  // # Hooks
  //
  // Description of what the rule does in general.
  hooks: {
    // Description of what the rule does in this specific event.
    'END_MICROTASK': onCloseMicrotask
  }
};

module.exports = exports = rule;