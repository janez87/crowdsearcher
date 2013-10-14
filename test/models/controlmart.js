

// Load libraries
var mongo = require('mongoose');
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

//Return all the control mart tuples matching the input
ControlMartSchema.statics.select = function(rawTuple,callback){

  console.log('Retrieving the controlmart tuple of %j', rawTuple);

  this.find(rawTuple,function(err,controlMartTuples){
    if(err) return callback(err);
    
    console.log('%s retrieved',controlMartTuples);

    return callback(null,controlMartTuples);
  });

};

//Return the data value of the ControlMart tuple that exactly match the input rawTuple
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

  console.log('Retrieving the controlmart tuple of %j', tupleToSearch);

  this.findOne(tupleToSearch,function(err,controlMartTuple){
    if(err) return callback(err);
    
    console.log('%s retrieved',controlMartTuple);

    if(controlMartTuple && !_.isUndefined(controlMartTuple)){
      return callback(null,controlMartTuple.data);
    }

  });
 
};

//Create a new ControlMart tuple
ControlMartSchema.statics.insert = function(rawTuple,callback){

  console.log('Trying to insert the tuple %s', rawTuple);

  var thisSchema = this;

  var tupleToSearch = {
    job: rawTuple.job,
    task: rawTuple.task,
    operation: rawTuple.operation,
    microtask: rawTuple.microtask,
    object: rawTuple.object,
    name:rawTuple.name,
    platform: rawTuple.platform
  };

  this.findOne(tupleToSearch,function(err,tuple){
    if(err) return callback(err);

    var tupleToCreate = {};
    if(tuple){
      console.log('The tuple already exists');
      tuple.data = rawTuple.data;
      console.log('Updating the value');
      tupleToCreate = tuple;
    }else{
      console.log('Creating the new tuple');
      var ControlMart = thisSchema.model('controlmart');
      tupleToCreate = new ControlMart(rawTuple);
    }

    console.log('Saving the tuple');
    return tupleToCreate.save(callback);
  });
 
};


exports = module.exports = ControlMartSchema;