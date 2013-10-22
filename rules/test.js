// Load libraries
var _ = require( 'underscore' );

// Create a child logger
var log = common.log.child( { component: 'Test rule' } );


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