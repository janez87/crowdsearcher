// Load libraries
var _ = require( 'underscore' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Test rule with params' } );


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
    number: 'number'
  },

  // ## Perform rule
  //
  // Description of what the perform rule does.
  perform: function performRule( event, params, task, data, callback ) {
    log.trace( 'Performing' );
    return callback();
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {

    log.trace( 'Checking name' );
    if( params.name==='asd' )
      return done( false );

    log.trace( 'Checking number' );
    if( params.number<0 )
      return done( false );

    log.trace( 'All good' );
    return done( true );
  },
};

module.exports = exports = rule;