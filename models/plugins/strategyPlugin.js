'use strict';
var mongo = require('mongoose');
var CS = require( '../../core' );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;

// Create child logger
var log = CS.log.child( { component: 'Strategy plugin' } );



// # Strategy plugin
//
// The strategy plugins implementa all the logic needed to set/check/run the task strategies.
module.exports = exports = function ( schema, options ) {
  var strategy = options.strategy;
  var method = options.method;
  var required = options.required || false;

  // Create an empty JS object to hold the strategy field definition.
  var field = {};

  // The field name is composed by the passed strategy and 'Strategy'
  // (like splittingStrategy, assignmentStrategy, etc).
  field[ strategy+'Strategy' ] = {
    type: {
      name: {
        type: String,
        required: required,
        trim: true
      },
      params: {
        type: Mixed,
        'default': {}
      }
    },
    required: required
  };

  // Add the field to the schema.
  schema.add( field );


  // Add the field to the schema.
  schema.virtual( strategy+'StrategyImplementation' ).get( function() {
    var container = CS[ strategy ];
    var field = this[ strategy+'Strategy' ];

    if( !container || !field )
      return null;

    return container[ field.name ];
  } );

  // ## Schema methods
  schema.methods[ method ] = function executeStrategy( data, callback ) {
    data = data || {};
    var strategyName = this[ strategy+'Strategy' ].name;
    log.trace( 'Performing %s strategy %s', strategy, strategyName );

    var script = this[ strategy+'StrategyImplementation' ];
    if( !script || !script.perform )
      return callback( new Error( 'Strategy not found' ) );

    var params = this[ strategy+'Strategy' ].params;
    return script.perform( data.event, params, this, data, callback );
  };
};