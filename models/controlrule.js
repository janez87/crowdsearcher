// Load libraries
var _  = require('underscore');
var mongo = require('mongoose');

// Create a child logger
var log = common.log.child( { component: 'ControlRule model' } );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;

// # ControlRule definition
// The controlrule represent a rule that is triggered by an event.

// ## Schema
//
// Mongoose schema for the controlrule entity.
var ControlRuleSchema = new Schema( {
  // The event that will trigger this rule.
  'event': {
    type: String,
    required: true,
    index: true,
    uppercase: true
  },

  // The name of the rule file to load. **Only** available when type is set to `CUSTOM`.
  action: {
    type: String,
    required: true,
    trim: true
  },

  // The type of rule to load.
  // Each type identifies a different folder for loading the rule.
  // **Note**:
  // The following represents the default valies, folders can be customized
  // by changing the `rules` node in the configuration file.
  type: {
    type: String,
    trim: true,
    uppercase: true,
    index: true,
    // The possible values for `type` are:
    'enum': [
      // Represents a script contained into the **rules** folder.
      'CUSTOM',

      // The 'rule' lo load is the Task's splitting strategy.
      'SPLITTING',

      // The 'rule' lo load is the Task's assignment strategy.
      'ASSIGNMENT',

      // The 'rule' lo load is the Task's implementation strategy.
      'IMPLEMENTATION',

      // The 'rule' lo load is the Task's invitation strategy.
      'INVITATION',
    ],
    'default': 'CUSTOM'
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
ControlRuleSchema.path( 'action' ).validate( function validateAction( action ) {
  var action = this.rule;
  return !!action;
}, 'Not present' );

// Validate control rule parameters.
ControlRuleSchema.path( 'params' ).validate( function validateParams( params, done ) {
  var rule = this.rule;

  // Create an empty function to use in case of missing check function
  function empty( p, d ) { return d( true ); }

  // If the `check` function is available then use it, otherwise retur true.
  var check = rule? rule.check : empty;

  // use default check function if not available.
  check = check || empty;

  // If the rule is available then call its check function.
  return check( params, done );
}, 'Not valid' );






// # ControlRule calculated fields
//
// Get the rule instance.
ControlRuleSchema.virtual( 'rule' ).get( function() {
  var container;
  if( this.type==='CUSTOM' ) {
    container = 'rules';
  } else {
    container = this.type.toLowerCase();
  }
  return common[ container ][ this.action ];
} );








// # ControlRule instance methods
//
// Run the selected rule.
ControlRuleSchema.methods.run = function ( task, callback ) {

}


// Export the schema.
exports = module.exports = ControlRuleSchema;