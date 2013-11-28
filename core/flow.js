// Load libraries.
var _ = require( 'underscore' );
var async = require( 'async' );
var domain = require( 'domain' );
var CS = require( '../core' );

// Create a child logger.
var log = CS.log.child( {
  component: 'FlowManager'
} );


// # Flow Manager
//
// Create the `FlowManager` object.
var FlowManager = {};

// ## Methods
//

// Export the `FlowManager`.
module.exports = exports = FlowManager;