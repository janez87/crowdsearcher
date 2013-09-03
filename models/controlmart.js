

// Load libraries
var mongo = require('mongoose');
var log = common.log.child( { component: 'ControlMart model' } );
var _ = require('underscore');

// Import Mongo Classes and Objects
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

// User schema
var ControlMartSchema = new Schema( {
  
  
  name:{
    type:String,
    required:true
  },

  job:{
    type:ObjectId,
    ref:'job'
  },

  task:{
    type:ObjectId,
    ref:'task'
  },

  microtask:{
    type:ObjectId,
    ref:'microtask'
  },

  operation:{
    type:ObjectId,
    ref:'operation'
  },

  platform:{
    type:ObjectId,
    ref:'platform'
  },

  object:{
    type:ObjectId,
    ref:'object'
  },

  data: Schema.Types.Mixed
} );

ControlMartSchema.statics.get = function(rawTuple,callback){

  if(_.isUndefined(rawTuple.name)){
    return callback(new Error('The name is required'));
  }

  log.trace('Retrieving the controlmart tuple of %j', rawTuple);

  this.findOne(rawTuple,function(err,controlMartTuple){
    if(err) return callback(err);

    if(!controlMartTuple){
      log.trace('No control mart tuple found');
      return callback();
    }
    
    log.trace('%s retrieved',controlMartTuple.data);

    return callback(null,controlMartTuple.data);
  });

};

exports = module.exports = ControlMartSchema;