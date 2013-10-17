
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = common.log.child( { component: 'TestMajority rule' } );

// Import the model

var ControlMart = common.models.controlmart;
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;

var CSError = require('../../error');
// Custom error
var TestMajorityError = function( id, message) {
  TestMajorityError.super_.call( this, id, message);
};

util.inherits( TestMajorityError, CSError );

// Error name
TestMajorityError.prototype.name = 'TestMajorityError';


var performRule = function( data, config, callback ) {
  log.trace( 'Performing the rule' );

  var domain = require( 'domain' ).create();

  domain.on('error',function(err){
    return callback(err);
  });


  var execution = data.execution;
  var annotations = execution.annotations;

  var applyMajority = function(annotation,callback){
    var object = annotation.object;
    var response = annotation.response;

    var rawObject = {
      object:object,
    };

    ControlMart.select(rawObject,function(err,control){
      if(err) return callback(err);

      log.trace('Control variable of object %s',object);
      log.trace(control);

      var selectedCategory = _.filter(control,function(item){
        return item.name === response && item.task === data.task;
      });

      log.trace('Selected category %s', selectedCategory);

      selectedCategory.data = selectedCategory.data+1;
      selectedCategory.save(callback);
    });
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