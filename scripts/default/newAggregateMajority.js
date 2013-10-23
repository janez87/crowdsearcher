
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = common.log.child( { component: 'Aggregate Majority' } );

// Models
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;
var ControlMart = common.models.controlmart;
var CSError = require('../../error');

// Custom error
var AggregateMajorityError = function( id, message) {
  AggregateMajorityError.super_.call( this, id, message);
};

util.inherits( AggregateMajorityError, CSError );

// Error name
AggregateMajorityError.prototype.name = 'AggregateMajorityError';

AggregateMajorityError.BAD_PARAMETER = 'BAD_PARAMETER';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var microtask = data.microtask;

  var mode = config.mode;

  var evaluateMajority = function(object,callback){

    log.trace('Evaluating the majority');
    if(object.status === ObjectStatuses.CLOSED){
      log.trace('Object %s already closed',object._id);
      return callback();
    }

    ControlMart
    .get({object:object._id,name:'status'},function(err,controlmart){
      if( err ) return callback( err );
      
      var closed = _.where(controlmart,{data:'closed'});

      log.trace('%s operations are closed',closed.length);
      log.trace('%s mode selected',mode);
      if(mode==='ONE'){
        if(closed.length >= 1){
          log.trace('Closing object %s',object._id);
          return object.close(callback);
        }else{
          return callback();
        }
      }
      if(mode==='ALL'){
        if(closed.length === microtask.operations.length){
          log.trace('Closing object %s',object._id);
          return object.close(callback);
        }else{
          return callback;
        }
      }
      if(mode==='SPECIFIC'){
        var ops = config.operations;

        if(!_.isArray(ops)){
          ops = [ops];
        }

        var closed = 0;

        _.each(ops,function(op){
          var opId = _.where(microtask.operations,{label:op});
          opId = opId._id;

          var statusMart = _.filter(controlmart,function(mart){
            mart.operation.equals(opId);
          });

          statusMart = statusMart[0];

          if(statusMart.data === 'closed'){
            closed++;
          }

        });

        if(closed === ops.length){
          return object.close(callback);
        }else{
          return callback();
        }
      }

      log.trace('Not supported mode selected');
      return callback();
    });

  };

  microtask.populate('objects operations',domain.bind(function(err,microtask){
    if(err) return callback(err);

    log.trace('Microtask %s populated', microtask.id);
    return async.eachSeries(microtask.objects,evaluateMajority,callback);
  }));

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

// So che non esiste questo tipo.. tu pero volevi un esempio.
var params = {
  mode:{
    type: 'enum',
    values: ['ALL','ONE','SPECIFIC']
  },
  operations: ['string']
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;