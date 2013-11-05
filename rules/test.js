// Load libraries
var _ = require( 'underscore' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Test rule' } );


// # Rule definition
//
// Description of the rule.
var rule = {
  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performRule( event, params, task, data, callback ) {
    log.trace( 'Performing' );
    return callback();
  },
};

module.exports = exports = rule;