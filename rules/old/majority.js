
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var request = require( 'request' );
var util = require('util');

var log = CS.log.child( { component: 'Majority rule' } );

// Import the model
var ObjectModel = CS.models.object;
var Metadata = CS.models.metadata;
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;

var CSError = require('../../error');
// Custom error
var MajorityError = function( id, message) {
  MajorityError.super_.call( this, id, message);
};

util.inherits( MajorityError, CSError );

// Error name
MajorityError.prototype.name = 'MajorityError';


var performRule = function( data, config, callback ) {
  log.trace( 'Performing the rule' );

  var domain = require( 'domain' ).create();

  domain.on('error',function(err){
    return callback(err);
  });

  var execution = data.execution;
  var annotations = execution.annotations;


  var numberOfAnswer = config.numberOfAnswer;
  var agreement = config.agreement;

  // Creating the metadata (if they don't exist)
  // TODO: spostare in una regola a parte
  var createMetadata = function(callback){
    var create = function (item, callback) {
      ObjectModel.findById(item.object,function(err,object){
        //var object = annotation.object;
        var metadata = object.metadata;
        var metadataToAdd = [];

        var m = _.findWhere(metadata,{name:'_result'});
        if(_.isUndefined(m)){
          log.trace('Creating the metadata _result');
          var resultMetadata = new Metadata({name:'_result',value:undefined});
          metadataToAdd.push(resultMetadata);
        }

        m = _.findWhere(metadata,{name:'_count'});
        if(_.isUndefined(m)){
          log.trace('Creating the metadata _count');
          var answersMetadata = new Metadata({name:'_count',value:0});
          metadataToAdd.push(answersMetadata);
        }

        m = _.findWhere(metadata,{name:'_confidence'});
        if(_.isUndefined(m)){
          log.trace('Creating the metadata _count');
          var con//fidenceMetadata = new Metadata({name:'_confidence',value:0});
          metadataToAdd.push(confidenceMetadata);
        }

        var categories = _.findWhere(data.task.types,{name:'classify'}).params.categories;

        _.each(categories,function(category){
          m = _.findWhere(metadata,{name:category});
          if(_.isUndefined(m)){
            log.trace('Creating the metadata %s',category);
            var statusMetadata = new Metadata({name:category,value:0});
            metadataToAdd.push(statusMetadata);
          }
        });


        object.update(
          {$addToSet:{
            metadata: {
                $each: metadataToAdd
              }
            }
          },domain.bind(callback));

      });
    };

    log.trace('Creating the metadata');
    async.each(annotations,create,callback);
  };

  // Updating the metadata
  var updateCount = function(callback){
    var update = function(item,callback){
        ObjectModel.findById(item.object,function(err,object){

            log.trace('Updating the total count');
            var countMetadata = _.findWhere(object.metadata,{name:'_count'});
            countMetadata.value = countMetadata.value +1;
            log.trace('Count %s', countMetadata.value);

            log.trace('Updating the count for the category %s',item.response);
            var countCategory = _.findWhere(object.metadata,{name:item.response});
            countCategory.value = countCategory.value +1;
            log.trace('Count for category %s: %s', item.response,countCategory.value);

            object.save(domain.bind(callback));
          });
      };

    async.each(annotations,update,callback);
  };

  var checkMajority = function(callback){

    var check = function(item,callback){
      ObjectModel.findById(item.object,function(err,object){
        var status = object.status;

        if(status!==ObjectStatuses.CLOSED){

          var categories = [];
          var cats = _.findWhere(data.task.types,{name:'classify'}).params.categories;

          // Get all the metadata containing the count of each category
          _.each(cats,function(category){
            var meta = _.findWhere(object.metadata,{name:category});
            categories.push(meta);
          });

          // Retrieve the max
          var max = _.max(categories,function(category){
            return category.value;
          });

          // Verify that the max is unique
          var otherMax = _.where(categories,{value:max.value});

          // The value is not unique
          var result = _.findWhere(object.metadata,{name:'_result'});
          var count = _.findWhere(object.metadata,{name:'_count'});
          var confidence = _.findWhere(object.metadata,{name:'_confidence'});

          if(otherMax.length>1){

            result.value = undefined;
            confidence.value = 0;
          }else{

            result.value = max.name;
            // Should I close the object?
            if(count.value>=numberOfAnswer){
              if(max.value === agreement){
                log.trace('Closing the object %s',object.id);
                confidence.value = max.value / count.value;
                object.status = ObjectStatuses.CLOSED;
              }else{
                log.trace('Agreement (%s) not reached: %s',agreement,max.value);
              }
            }else{
              log.trace('Not enough number of answers %s',count.value);
            }
          }

          object.save(domain.bind(callback));
        }else{
          return callback();
        }
      });
    };

    async.each(annotations,check,callback);
  };

  var actions = [ createMetadata, updateCount, checkMajority ];

  async.series(actions,callback);
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


var params = {
  agreement: 'number',
  numberOfAnswer: 'number'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;