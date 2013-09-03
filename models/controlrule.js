

// Load libraries
var _ = require('underscore');
var mongo = require('mongoose');
//var log = common.log.child( { component: 'ControlRule model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var Mixed = Schema.Types.Mixed;

// User schema
var ControlRuleSchema = new Schema( {
  'event': {
    type: String,
    uppercase: true,
    required: true
  },

  action: String,

  type: {
    type: String,
    'default': 'CUSTOM'
  },

  params: {
    type: Mixed
  }
} );

ControlRuleSchema.pre( 'save', function( next ) {

  if( this.type==='CUSTOM' && !_.isString( this.action ) )
    return next( new Error( 'No action specified for a CUSTOM rule' ) );

  next();
} );

exports = module.exports = ControlRuleSchema;