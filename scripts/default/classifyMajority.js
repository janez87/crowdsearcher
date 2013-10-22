
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = common.log.child( { component: 'Classify Majority' } );

// Models
var ControlMart = common.models.controlmart;

var CSError = require('../../error');
// Custom error
var ClassifyMajorityError = function( id, message) {
  ClassifyMajorityError.super_.call( this, id, message);
};

util.inherits( ClassifyMajorityError, CSError );

// Error name
ClassifyMajorityError.prototype.name = 'ClassifyMajorityError';

ClassifyMajorityError.BAD_PARAMETER = 'BAD_PARAMETER';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');
  log.trace('%s',config.params);

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var task = data.task;
  var execution = data.execution;
  var operationLabel = config.operation;

  task.populate('operations',domain.bind(function(err,task){
    if (err) return callback(err);

    var annotations = execution.annotations;
    var operation = _.findWhere(task.operations,{label:operationLabel});
    
    annotations = _.filter(annotations, function(annotation){
      return annotation.operation.equals(operation._id);
    });

    if(annotations.length === 0){
      return callback();
    }

    var checkMajority = function(annotation,callback){
      var objectId = annotation.object;
      var category = annotation.response;

      ControlMart.select({
        object:objectId,
        operation:annotation.operation

      },function(err,controlmart){
        if( err ) return callback( err );
         
        var result;
        if(_.has(controlmart,'result')){
          result = controlmart['result'][task._id][operation._id][objectId].data;
        }

        var evaluations = 0;
        if(_.has(controlmart,'evaluations')){
          evaluations = controlmart['evaluations'][task._id][operation._id][objectId].data;
        }

        var categoryCount = {};
        _.each(operation.params.categories,function(category){
          if(_.has(controlmart,category)){
            categoryCount[category] = controlmart[category][task._id][operation._id][objectId].data;
          }else{
            categoryCount[category] = 0;
          }
        });

        var status = 'open';
        if(_.has(controlmart,'status')){
          status = controlmart['status'][task._id][operation._id][objectId].data;
        }

        if(status === 'closed'){
          log.trace('Object already closed');
          return callback();
        }

        log.trace('Updating the count');
        categoryCount[category] = categoryCount[category]+1;
        evaluations++;

        log.trace('Checking the majority');
        if(evaluations>=config.answers){
          var maxCount = _.max(_.pairs(categoryCount),function(p){
            return p[1];
          });

          log.trace('The most selected category is %s',maxCount);
          
          var otherMax = _.where(_.pairs(categoryCount),function(p){
            return p[1] === maxCount[1];
          });

          if(otherMax.length > 1){
            result = undefined;
          }else{
            result = maxCount[0];
          }

          if(maxCount[1] >= config.agreement){
            status = 'closed';
          }

        }

        var updatedMart = [];

        var resultMart = {
          task:task._id,
          object:objectId,
          name:'result',
          data:result,
          operation:operation._id
        };
        updatedMart.push(resultMart);

        var statustMart = {
          task:task._id,
          object:objectId,
          name:'status',
          data:status,
          operation:operation._id
        };
        updatedMart.push(statustMart);

        var evaluationtMart = {
          task:task._id,
          object:objectId,
          name:'evaluations',
          data:evaluations,
          operation:operation._id
        };
        updatedMart.push(evaluationtMart);

        _.each(operation.params.categories,function(category){
          log.trace('category %s',category);
          log.trace('count %s',categoryCount[category]);
          var categorytMart = {
            task:task._id,
            object:objectId,
            name:category,
            data:categoryCount[category],
            operation:operation._id
          };
          updatedMart.push(categorytMart);
        });

        return ControlMart.insert(updatedMart,callback);
      });
    };

    return async.each(execution.annotations,checkMajority,callback);
  }));

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

// So che non esiste questo tipo.. tu pero volevi un esempio.
var params = {
  operation: 'string',
  answers:'number',
  agreement:'number'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;