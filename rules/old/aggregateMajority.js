
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = CS.log.child( { component: 'Aggregate Majority' } );

// Models
var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;
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

    if(object.status === ObjectStatuses.CLOSED){
      log.trace('Object %s already closed',object._id);
      return callback();
    }

    var areClosed = [];
    _.each(microtask.operations,function(operation){
      var status = object.getMetadata('maj_'+operation.id+'_status');
      if(status === ObjectStatuses.CLOSED){
        log.trace('Operation %s (%s) is closed',operation.id,operation.label);
        areClosed.push(operation);
      }
    });

    log.trace('Mode selected %s',mode);
    log.trace('%s operations are closed for the object %s', areClosed.length,object.id);

    if(mode === 'ONE'){
      if(areClosed.length>0){
        log.trace('Closing the object %s',object.id);
        return object.close(domain.bind(callback));
      }else{
        return callback();
      }
    }else if(mode === 'ALL'){
      if(areClosed.length === microtask.operations.length){
        log.trace('Closing the object %s',object.id);
        return object.close(domain.bind(callback));
      }else{
        return callback();
      }
    }else if(mode === 'SPECIFIC'){
      log.trace('SPECIFIC mode selected');
      var selectedOps = [];

      var ops = config.operation;
      if(!_.isArray(ops)){
        ops = [ops];
      }

      _.each(ops,function(op){
        var selectedOp = _.findWhere(areClosed,{label:op});
        if(!_.isUndefined(selectedOp)){
          selectedOps.push(selectedOp);
        }
      });

      if(selectedOps.length === ops.length){
        log.trace('Closing the object %s',object.id);
        return object.close(domain.bind(callback));
      }else{
        return callback();
      }
    }else{
      return callback(new AggregateMajorityError(AggregateMajorityError.BAD_PARAMETER,'The selected mode does not exist'));
    }

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
  operation: ['string']
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;