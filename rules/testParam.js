// Load libraries
var _ = require( 'underscore' );

// Create a child logger
var log = common.log.child( { component: 'Test rule with params' } );


// # Rule definition
//
// Description of the rule.
var rule = {
  // ## Parameters
  //
  params: {
    // Parameter description
    name: 'string',
    // Parameter description
    surname: 'string'
  },
  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performRule( task, controlRule, callback ) {
    return callback();
  },
  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {
    return done( true );
  },
};

module.exports = exports = rule;