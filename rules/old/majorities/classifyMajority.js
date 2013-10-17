
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = common.log.child( { component: 'ClassifyMajority rule' } );

// Import the model
var ObjectModel = common.models.object;
var ObjectStatuses = require( '../../../config/constants' ).ObjectStatuses;


var CSError = require('../../../error');
// Custom error
var ClassifyMajorityError = function( id, message) {
  ClassifyMajorityError.super_.call( this, id, message);
};

util.inherits( ClassifyMajorityError, CSError );

// Error name
ClassifyMajorityError.prototype.name = 'ClassifyMajorityError';

var prefix = 'maj';

var performRule = function( data, operation, config, callback ) {

  var domain = require( 'domain' ).create();

  domain.on('error', callback );

  var label = prefix +'_'+ operation.id + '_';
  var categories = operation.params.categories;

  var numberOfAnswers = config.numberOfAnswer;
  var agreements = config.agreement;

  log.trace('Nubmer of answer array %s',numberOfAnswers);
  log.trace('Agreements array %s',agreements);

  var annotations = _.filter(data.execution.annotations,function(annotation){
    return annotation.operation.equals(operation._id);
  });

  log.trace('Found %s annotations for the operation %s',annotations.length,operation._id);

  var applyMajority = function(annotation,callback){
    ObjectModel.findById(annotation.object,domain.bind(function(err,object){


      // Create the metadata if they don't exist
      if(!object.hasMetadata(label+'result')){
        object.setMetadata(label+'result',undefined);
      }
      if(!object.hasMetadata(label+'count')){
        object.setMetadata(label+'count',0);
      }
      if(!object.hasMetadata(label+'status')){
        object.setMetadata(label+'status',ObjectStatuses.OPENED);
      }
      _.each(categories,function(category){
        if(!object.hasMetadata(label+category)){
          object.setMetadata(label+category,0);
        }
      });

      // Updating the metadata
      var status = object.getMetadata(label+'status');
      var count = object.getMetadata(label+'count');

      count = count+1;
      object.setMetadata(label+'count',count);

      var selectedCategoryCount = object.getMetadata(label+annotation.response);
      object.setMetadata(label+annotation.response,selectedCategoryCount+1);

      // Checking the majority
      if(status!==ObjectStatuses.CLOSED){

        var numberOfAnswer,agreement;

        // I need to select the correct parameter
        // I need to take the p = min(numberOfAnswers) such that count < p
        // I suppose that numberOfAnswers is ordered
        var p = _.filter(numberOfAnswers,function(n){
          return n>count;
        });

        if (!_.isArray(p)){
          p = [p];
        }

        log.trace('Current number of answer %s',count);
        log.trace('Possible parameters %s',p);

        if(p.length === 0){
          numberOfAnswer = numberOfAnswers[numberOfAnswers.length-1];
          agreement = agreements[agreements.length-1];
        }else{
          numberOfAnswer = p[0];
          agreement = agreements[numberOfAnswers.indexOf(numberOfAnswer)];
        }

        log.trace('Number of answer %s',numberOfAnswer);
        log.trace('Agreement %s',agreement);

        var categoriesMetadata = [];
        _.each(categories,function(category){
          //categoriesMetadata.push(object.getMetadata(label+category));
          var count = {
            category:category,
            count: object.getMetadata(label+category)
          };
          categoriesMetadata.push(count);
        });

        var max = _.max(categoriesMetadata,function(categoryCount){
          return categoryCount.count;
        });

        var otherMax = _.where(categoriesMetadata,{count:max.count});

        if(otherMax.length>1){
          object.setMetadata(label+'result',undefined);
        }else{
          object.setMetadata(label+'result',max.category);
        }

        // Checking if I should close the object
        // If numberOfAnswer is equal to 0 I ignore the parameter
        if(count===numberOfAnswer || numberOfAnswer === 0){
          if(max.count >= agreement){
            log.trace('Closing the object %s',object.id);
            object.setMetadata(label+'status',ObjectStatuses.CLOSED);
            object.setMetadata(label+'executionNeeded',count);
          }else{
            log.trace('Agreement not reached');
          }
        }else{
          log.trace('Not enough answers');
        }

      }

      log.trace('Saving the object');
      return object.save(domain.bind(callback));

    }));
  };

  return async.eachSeries(annotations,domain.bind(applyMajority),callback);
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