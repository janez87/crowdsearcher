'use strict';
var mongo = require('mongoose');
var CS = require( '../../core' );

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.Types.ObjectId;


// Create child logger
var log = CS.log.child( { component: 'AccessKey plugin' } );



// # AccessKey plugin
//
// Mongoose plugin for adding accesskey field to a mongoose model.
module.exports = exports = function ( schema ) {

  // Add to the schema the accesskey field.
  // This field holds the application key that generated this task.
  // Future modifications to this task can only7 be done by this key..
  schema.add( {
    accessKey: {
      type: ObjectId,
      ref: 'application',
      //required: true
    },
  } );

  // ## Methods
  //
  // Add to the schema a method to check if the given key is valid.
  schema.methods.checkAccess = function( key ) {
    return this.accessKey.equals( key );
  };
};