// Load libraries
var _ = require('underscore');
var mongo = require('mongoose');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Platform model' } );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;



// # Platform definition
// The platform is a representation of an available platform for the Task.

// ## Schema
//
// Mongoose schema for the platform entity.
var PlatformSchema = new Schema( {
  // ### General data.
  //
  // Platform name, must correspond to an available platform in the **CS**.
  name: {
    type: 'string',
    trim: true,
    required: true
  },
  // Platform instance parameters.
  params: {
    type: 'mixed',
    'default': {}
  },


  // ### Platform settings.
  //
  // The platform is enabled?
  enabled: {
    type: 'boolean',
    required: true
  },
  // The platform is used for invitation?
  invitation: {
    type: 'boolean',
    required: true
  },
  // The platform is used for execution?
  execution: {
    type: 'boolean',
    required: true
  },

  // ### Time data
  //
  // Creation date of the object. By default it will be the first save of the object.
  createdDate: {
    required: true,
    type: Date,
    'default': Date.now
  },
},

/// ## Schema options
//
{
  // Do not allow to add random properties to the model.
  strict: true,
  // Disable index check in production.
  autoIndex: process.env.PRODUCTION? false : true
} );





// # Validators
//
// Validate the platform name, must be a platform present in the **CS**.
PlatformSchema.path( 'name' ).validate( function validateName( name ) {
  return !!(CS.platforms[ name ]);
}, 'Not present' );






// # Platform calculated fields
//
// Get the implementation of the platform.
PlatformSchema.virtual( 'implementation' ).get( function() {
  var platformImplementation = CS.platforms[ this.name ];
  return platformImplementation;
} );


// # Middlewares
//
PlatformSchema.pre( 'save', function( next ) {
  var defaults = {};
  _.each( this.implementation.params, function( param, key ) {
    if( !_.isUndefined( param.default ) ) {
      defaults[ key ] = param.default;
    }
  });
  this.params = _.defaults( this.params, defaults );

  return next();
} );







// ## Plugins to add to the Platform model.
//
// Add the `metadata` fileld to the entity.
PlatformSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
PlatformSchema.plugin( require( './plugins/accessKeyPlugin' ) );







// Export the schema.
exports = module.exports = PlatformSchema;