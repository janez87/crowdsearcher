// Load libraries
var _ = require('underscore');
var mongo = require('mongoose');
var CS = require( '../../core' );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.Types.ObjectId;
var MongoError = mongo.Error;


// Create child logger
var log = CS.log.child( { component: 'Operations plugin' } );



// # Operations plugin
//
// Mongoose plugin for adding operations field to a mongoose model.
module.exports = exports = function ( schema ) {

  // Add to the schema the operations field.
  schema.add( {
    // List of `Operation`s of the schema. Each operation is a *reference* to an Operation model.
    operations: {
      type: [ {
        type: ObjectId,
        ref: 'operation'
      } ],
      'default': []
    }
  } );

  // ## Methods
  //
  // ### Setters
  // Add an operation to the document.
  schema.methods.addOperations = function ( operations, callback ) {
    var _this = this;

    // Check if the document is editable.
    if( !this.editable )
      return callback( new MongoError( 'Not editable, status: '+this.status ) );

    // Convert into array.
    if( !_.isArray( operations ) )
      operations = [ operations ];

    var Operation = this.model( 'operation' );
    Operation.create( operations, function( err ) {
      if( err ) return callback( err );

      // Convert to plain Array.
      var operations = _.toArray( arguments );
      // Remove the error argument.
      operations.shift();

      // Add the operation to the list, unique
      _this.operations.addToSet.apply( _this.operations, operations );

      return _this.save( callback );
    } );
  };
  // With or without the 's'.
  schema.methods.addOperation = schema.methods.addOperations;
  // ### Getters
  // Find an operation by label.
  schema.methods.getOperationByLabel = function( label, callback ) {
    var _this = this;
    var populated = this.populated( 'operations' );


    if( !populated ) {
      return this.populate( 'operations', function( err ) {
        if( err ) return callback( err );
        _this.getOperationByLabel( label, callback );
      } );
    }

    log.trace( 'Find operation by label (%s)', label );

    var operation = _.findWhere( this.operations, { label: label } );
    return callback( null, operation );
  };
  // Find an operation by id.
  schema.methods.getOperationById = function( id, callback ) {
    // If the field is populated then use the original ids.
    var ids = this.populated( 'operations' );
    if( !ids )
      // if is not populated use the ids from the list of operations.
      ids = this.operations;

    log.trace( 'Find operation by id (%s)', id );

    var operation = _.find( ids, function( currentId ) {
      return currentId.equals( id );
    } );


    return callback( null, operation );
  };
  // ### Bulk methods
  //
  // Find operations by type (classify, like, etc).
  schema.methods.getOperationsByType = function( type, callback ) {
    var _this = this;
    var populated = this.populated( 'operations' );

    if( !populated ) {
      return this.populate( 'operations', function( err ) {
        if( err ) return callback( err );
        _this.getOperationsByType( type, callback );
      } );
    }

    log.trace( 'Find operations by type (%s)', type );

    var operations = _.where( this.operations, { name: type } );
    return callback( null, operations );
  };
};