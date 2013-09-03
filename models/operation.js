

// Load libraries
var mongo = require('mongoose');
var log = common.log.child( { component: 'Operation model' } );

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