'use strict';
var _ = require('lodash');
var mongo = require('mongoose');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'ControlRule model' } );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;

// # ControlRule definition
// The controlrule represent a rule that is triggered by an event.

// ## Schema
//
// Mongoose schema for the controlrule entity.
var ControlRuleSchema = new Schema( {
  // ### Rule data
  //

  // The name of the rule file to load. **Only** available when type is set to `CUSTOM`.
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Parameters for the control rule.
  params: {
    type: Mixed,
    'default': {}
  }
},

/// ## Schema options
//
{
  // Do not allow to add random properties to the model.
  strict: true,
  // Disable index check in production.
  autoIndex: process.env.PRODUCTION? false : true
} );











// ## Plugins to add to the ControlRule model.
//
// Add the `metadata` fileld to the entity.
ControlRuleSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
ControlRuleSchema.plugin( require( './plugins/accessKeyPlugin' ) );






// # Validators
//
// Validate the control rule action, must be a rule present in the **CS**.
ControlRuleSchema.path( 'name' ).validate( function validateAction( name ) {
  var ruleImpl = this.rule;
  return !!ruleImpl;
}, 'Invalid name' );

// Validate control rule parameters.
ControlRuleSchema.path( 'params' ).validate( function validateParams( params, done ) {
  var rule = this.rule;

  // No rule specified, continue.
  if( !rule ) return done( true );

  // No check specified, continue.
  if( !rule.check ) return done( true );

  // If the rule is available then call its check function.
  return rule.check( params, done );
}, 'Invalid parameters' );







// # ControlRule calculated fields
//
// Get the rule instance.
ControlRuleSchema.virtual( 'rule' ).get( function() {
  return CS.rules[ this.name ];
} );






// # Middlewares
ControlRuleSchema.pre( 'save', function( next ) {
  var defaults = {};
  _.each( this.rule.params, function( param, key ) {
    if( !_.isUndefined( param.default ) ) {
      defaults[ key ] = param.default;
    }
  });
  this.params = _.defaults( this.params, defaults );

  return next();
} );


// Export the schema.
exports = module.exports = ControlRuleSchema;