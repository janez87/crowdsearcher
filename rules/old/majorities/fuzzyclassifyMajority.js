
'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var util = require('util');

var log = CS.log.child( { component: 'FuzzyClassifyMajority rule' } );

// Import the model
var ObjectModel = CS.models.object;
var ObjectStatuses = require( '../../../config/constants' ).ObjectStatuses;


var CSError = require('../../../error');
// Custom error
var FuzzyClassifyMajorityError = function( id, message) {
  /* jshint camelcase: false */
  FuzzyClassifyMajorityError.super_.call( this, id, message);
};

util.inherits( FuzzyClassifyMajorityError, CSError );

// Error name
FuzzyClassifyMajorityError.prototype.name = 'FuzzyClassifyMajorityError';

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

  var spread = config.spread;

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

      var selectedCategory = annotation.response;
      var selectedCategoryIndex = operation.params.categories.indexOf(selectedCategory);

      _.each(operation.params.categories,function(category){
        var index = operation.params.categories.indexOf(category);
        var distance = Math.abs(index - selectedCategoryIndex);

        var inc;

        if(distance === 0){
          inc=1;
        }else{
          inc=1 - (distance/spread);
          if(inc<0){
            inc = 0;
          }
        }

        var score = object.getMetadata(label+category);
        object.setMetadata(label+category,score+inc);

      });


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
          var count = {
            category:category,
            count: object.getMetadata(label+category)
          };
          categoriesMetadata.push(count);
        });

        var max = _.max(categoriesMetadata,function(categoryCount){
          return categoryCount.count;
        });

        var otherMax = _.where(categoriesMetadata,{value:max.count});

        if(otherMax.length>1){
          object.setMetadata(label+'result',undefined);
        }else{
          object.setMetadata(label+'result',max.category);
        }

        //Checking if I should close the object
        log.trace('Max %s',max.count);
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

      object.save(domain.bind(callback));


    }));
  };

  async.eachSeries(annotations,domain.bind(applyMajority),callback);
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