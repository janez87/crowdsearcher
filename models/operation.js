// Load libraries
var mongo = require( 'mongoose' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Operation model'
} );

// Import Mongoose Classes and Objects
var Schema = mongo.Schema;



// # Operation definition
// The operation is a representation of an available operation for the Task.

// ## Schema
//
// Mongoose schema for the Operation entity.
var OperationSchema = new Schema( {
    // ### General data.
    //
    // Operation name, must correspond to an available operation in the **CS**.
    name: {
      type: 'string',
      trim: true,
      required: true
    },
    // Operation label, a unique identifier of the operation within a Task.
    label: {
      type: 'string',
      trim: true,
      required: true
    },
    // Operation instance parameters.
    params: {
      type: 'mixed'
    },


    // ### Time data
    //
    // Creation date of the entity. By default it will be the first save of the object.
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
    autoIndex: process.env.PRODUCTION ? false : true
  } );





// # Validators
//
// Validate the operation name, must be a operation present in the **CS**.
OperationSchema.path( 'name' ).validate( function validateName( name ) {
  return !!( CS.operations[ name ] );
}, 'Not present' );






// # Operation calculated fields
//
// Get the implementation of the operation.
OperationSchema.virtual( 'implementation' ).get( function() {
  var operationImplementation = CS.operations[ this.name ];
  return operationImplementation;
} );









// ## Plugins to add to the operation model.
//
// Add the `metadata` fileld to the entity.
OperationSchema.plugin( require( './plugins/metadataPlugin' ) );
// Add the `accessKey` plugin.
OperationSchema.plugin( require( './plugins/accessKeyPlugin' ) );








// Export the schema.
exports = module.exports = OperationSchema;


/*
// Load libraries
var mongo = require('mongoose');
var log = CS.log.child( { component: 'Operation model' } );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;

// User schema
var OperationSchema = new Schema( {
  name: {
    type: 'string',
    lowercase: true,
    required: true
  },
  label: {
    type: 'string',
    required: true
  },
  params: {
    type: 'mixed',
    'default': null
  }
} );

OperationSchema.pre( 'remove', function( next ) {
  log.trace( 'Removing %s operation %s', this.name, this.label );
  next();
} );
OperationSchema.post( 'remove', function() {
  log.trace( 'Removed %s operation %s', this.name, this.label );
} );

exports = module.exports = OperationSchema;
*/