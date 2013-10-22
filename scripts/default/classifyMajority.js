
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = common.log.child( { component: 'Classify Majority' } );

// Models
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;
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
         
        var result = controlmart['result'];

        var evaluations = controlmart['evaluations'];
        if(!evaluations){
          evaluations = 0;
        }else
        var categoriesCount = {};
        _.each(operation.params.categories,function(category){
          var count = controlmart[category];
        });


      });
    };


  }));

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

// So che non esiste questo tipo.. tu pero volevi un esempio.
var params = {
  operation: 'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;