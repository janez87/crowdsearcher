 
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = common.log.child( { component: 'CreateControlMart' } );

// Models
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;
var ControlMart = common.models.controlmart;

var CSError = require('../../error');
// Custom error
var CreateControlMartError = function( id, message) {
  CreateControlMartError.super_.call( this, id, message);
};

util.inherits( CreateControlMartError, CSError );

// Error name
CreateControlMartError.prototype.name = 'CreateControlMartError';

CreateControlMartError.BAD_PARAMETER = 'BAD_PARAMETER';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var task = data.task;
  var operation = _.findWhere(task.operations,{label:config.operation});

  var categories = operation.params.categories;
  var rawControlMarts = [];

  var objects  = task.objects;

  _.each(objects,function(object){
      
      // Status of the single operation
      var status = {
        object:object,
        task:task._id,
        name:'status',
        data:ObjectStatuses.OPEN,
        operation:operation._id
      };

      rawControlMarts.push(status);

      // Count of each category
      _.each(categories,function(category){
          var cat = {
            object:object,
            task:task._id,
            name:category,
            data:0,
            operation:operation._id
          };

          rawControlMarts.push(cat);
        });

      //Evaluation count

      var evaluations = {
        object:object,
        task:task._id,
        name:'evaluations',
        data:0,
        operation:operation._id
      };

      rawControlMarts.push(evaluations);

      //Needed evaluations to close the object
      var neededEvaluations = {
        object:object,
        task:task._id,
        name:'neededEvaluations',
        data:0,
        operation:operation._id
      };

      rawControlMarts.push(neededEvaluations);

    });

  ControlMart.create(rawControlMarts,callback);
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

var params = {
  operation: 'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;