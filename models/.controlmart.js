

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

//Return the data value of the ControlMart tuple that exactly match the input rawTuple
ControlMartSchema.statics.select = function(rawTuple,callback){

  log.trace('Retrieving the controlmart tuple of %j', rawTuple);

  this.find(rawTuple,function(err,controlMartTuples){
    if(err) return callback(err);
    
    log.trace('%s retrieved',controlMartTuples);

    return callback(null,controlMartTuples);
  });

};

//Returns all the tuples matching the condition
ControlMartSchema.statics.get = function(rawTuple,callback){

  if(_.isUndefined(rawTuple.name)){
    return callback(new Error('The name is required'));
  }

  //Need to force the undefined values
  var tupleToSearch = {
    job: rawTuple.job,
    task: rawTuple.task,
    operation: rawTuple.operation,
    microtask: rawTuple.microtask,
    object: rawTuple.object,
    name:rawTuple.name,
    platform: rawTuple.platform
  };

  log.trace('Retrieving the controlmart tuple of %j', tupleToSearch);

  this.findOne(tupleToSearch,function(err,controlMartTuple){
    if(err) return callback(err);
    
    log.trace('%s retrieved',controlMartTuple);

    if(controlMartTuple && !_.isUndefined(controlMartTuple)){
      return callback(null,controlMartTuple.data);
    }

    return callback();
  });
 
};


exports = module.exports = ControlMartSchema;