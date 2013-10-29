
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = CS.log.child( { component: 'CreateMetadata rule' } );

// Import the model
var ObjectModel = CS.models.object;
var Metadata = CS.models.metadata;

var CSError = require('../../error');
// Custom error
var CreateMetadataError = function( id, message) {
  CreateMetadataError.super_.call( this, id, message);
};

util.inherits( CreateMetadataError, CSError );

// Error name
CreateMetadataError.prototype.name = 'CreateMetadataError';
CreateMetadataError.OPERATION_NOT_SUPPORTED = 'OPEATION_NOT_SUPPORTED';




var performRule = function( data, config, callback ) {
  log.trace( 'Performing the rule' );

  var task = data.task;

  var operations = task.types;
  var objects = task.objects;

  var createClassifyMetadata = function(task,object,opParams,callback){

    var domain = require( 'domain' ).create();

    domain.on('error',function(err){
      return callback(err);
    });

    ObjectModel.findById(object,function(err,object){
      //var object = annotation.object;
      var metadata = object.metadata;
      var metadataToAdd = [];

      var m = _.findWhere(metadata,{name:'_classifyResult_'+index});
      if(_.isUndefined(m)){
        log.trace('Creating the metadata _result');
        var resultMetadata = new Metadata({name:'_classifyResult_'+index,value:undefined});
        metadataToAdd.push(resultMetadata);
      }

      m = _.findWhere(metadata,{name:'_classifyCount_'+index});
      if(_.isUndefined(m)){
        log.trace('Creating the metadata _count');
        var answersMetadata = new Metadata({name:'_classifyCount_'+index,value:0});
        metadataToAdd.push(answersMetadata);
      }

      var categories = opParams.categories;

      _.each(categories,function(category){
        m = _.findWhere(metadata,{name:category+'_'+index});
        if(_.isUndefined(m)){
          log.trace('Creating the metadata %s',category);
          var statusMetadata = new Metadata({name:category+'_'+index,value:0});
          metadataToAdd.push(statusMetadata);
        }
      });

      object.update(
        {$addToSet:{
          metadata: {
              $each: metadataToAdd
            }
          }
        },domain.bind(function(err){
            if(err) return callback(err);

            return callback();
          }));

    });

  };

  var createLikeMetadata = function(task,object,opParams,index,callback){
    var domain = require( 'domain' ).create();

    domain.on('error',function(err){
      return callback(err);
    });

    ObjectModel.findById(object,function(object){
      var metadata = object.metadata;
      var metadataToAdd = [];

      var m = _.findWhere(metadata,{name:'_likeCount_'+index});
      if(_.isUndefined(m)){
        log.trace('Creating the metadata _likeCount');
        var resultMetadata = new Metadata({name:'_likeCount_'+index,value:0});
        metadataToAdd.push(resultMetadata);
      }

      object.update(
          {$addToSet:{
            metadata: {
              $each: metadataToAdd
              }
            }
          },domain.bind(function(err,object){
            if (err) return callback(err);

            //I create a metadata to store the objectId of the object with more like

            var taskMetadata = task.metadata;

            var m = _.findWhere(taskMetadata,{name:'_likeResult_'+index});

            if(_.isUndefined(m)){
              log.trace('Creating the metadata _likeResult');
              var resultMetadata = new Metadata({name:'_likeResult_'+index,value:undefined});

              task.update(
              {$addToSet:{
                  metadata: {
                    $each: [resultMetadata]
                  }
                }

              },domain.bind(function(err){
                  if (err) return callback(err);

                  return callback();
                }));
            }else{
              return callback();
            }
          }));
    });
  };





  var createMetadata = function(operation,object, callback){
    log.trace('Creating the metadata for the operation %s',opName);
    var opName = operation.name;
    var opParams = operation.params;

    switch(opName){
    case 'classify':
      createClassifyMetadata(task,object,opParams,callback);
      break;
    case 'like':
      createLikeMetadata(task,object,opParams,callback);
      break;
    default:
      return callback(new CreateMetadataError(CreateMetadataError.OPERATION_NOT_SUPPORTED),'The operation '+opName+' is not supported by this rule');
    }
  };

  var index = 0;
  var createOperationMetadata = function(operation,callback){

    //I need this to differentiate operations with the same type
    async.each(objects,_.partial(createMetadata,operation),function(err){
      if(err) return callback(err);

      index++;
      return callback();
    });
  };

  async.each(operations,createOperationMetadata,callback);

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};


var params = {};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;