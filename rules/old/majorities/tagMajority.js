
'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var util = require('util');
var mongo = require('mongoose');

var log = CS.log.child( { component: 'TagMajority rule' } );

// Import the model
var ObjectModel = CS.models.object;
var ObjectStatuses = require( '../../../config/constants' ).ObjectStatuses;


var CSError = require('../../../error');
// Custom error
var TagMajorityError = function( id, message) {
  TagMajorityError.super_.call( this, id, message);
};

util.inherits( TagMajorityError, CSError );

// Error name
TagMajorityError.prototype.name = 'TagMajorityError';

var prefix = 'maj';

var performRule = function( data, operation, config, callback ) {

  var domain = require( 'domain' ).create();

  domain.on('error', callback );

  var label = prefix +'_'+ operation.id + '_';

  var numberOfAnswer = config.numberOfAnswer;

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

      // Updating the metadata
      var status = object.getMetadata(label+'status').value;
      var count = object.getMetadata(label+'count').value;

      count = count+1;
      object.setMetadata(label+'count',count);

      var selectedTag = annotation.response;

      if(object.hasMetadata(label+selectedTag)){
        // The tag was already present
        object.setMetadata(label+selectedTag,object.getMetadata(label+selectedTag).value+1);
      }else{

        //The tag is new
        object.setMetadata(label+selectedTag,1);
      }

      // Checking the majority
      if(status!==ObjectStatuses.CLOSED){

        if(count>=numberOfAnswer){

          var tagsMetadata = _.filter(object.metadata,function(meta){
            var value = meta.key.split('_');
            log.trace(value);
            return (value[0] === prefix && value[1] === operation.id && value[2]!=='result' && value[2]!=='count' && value[2]!=='status');
          });

          log.trace('Found %s tags',tagsMetadata.length);

          var max = _.max(tagsMetadata,function(tag){
            return tag.value;
          });

          log.trace('The tag with the greatest occurence is %s (%s)',max.key,max.value);

          var acceptedTags = _.filter(tagsMetadata,function(tag){
            var treshold = max.value*0.7;
            return tag.value > treshold;
          });

          log.trace('Found %s accepted tags',acceptedTags.length);

          var cleanedTag = [];

          _.each(acceptedTags,function(tag){
            var cleanTag = {};
            var count = tag.value;
            var name = tag.key.split('_');
            name = name[name.length-1];
            cleanTag[name] = count;
            log.trace(cleanTag);
            cleanedTag.push(cleanTag);
          });

          object.setMetadata(label+'result',cleanedTag);
          object.setMetadata(label+'status',ObjectStatuses.CLOSED);

        }else{
          log.trace('Not enough answers');
        }

      }

      object.save(domain.bind(callback));


    }));
  };

  async.eachSeries(annotations,applyMajority,callback);
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