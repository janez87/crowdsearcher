// AggregateMajorty rule
// ---
// Rule that aggregate the results of the majorities in order to close the object

// Load libraries
var _ = require('underscore');
var async = require( 'async' );

var log = common.log.child( { component: 'Aggregate Majority' } );

// Models
//var ObjectStatuses = require( '../../config/constants' ).ObjectStatuses;
var ControlMart = common.models.controlmart;

var performRule = function(event, config, task, data, callback ) {
  log.trace('Performing the rule');

  // Error handler
  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var microtask = data.microtask;

  var mode = config.mode;

  // For each object it evaluate the status of the majorities
  var evaluateMajority = function(object,callback){

    // If the object is already close do nothing
    log.trace('Evaluating the majority');
    if(object.status === 'CLOSED'){
      log.trace('Object %s already closed',object._id);
      return callback();
    }

    // Retrieve the control mart related to the status of the object
    ControlMart
    .get({object:object._id,name:'status'},function(err,controlmart){
      if( err ) return callback( err );
      
      log.trace('controlmart: %j',controlmart);

      // Select only the closed operations
      var closed = _.where(controlmart,{data:'closed'});

      log.trace('%s operations are closed',closed.length);
      log.trace('%s mode selected',mode);
      if(mode==='ONE'){
        // Close the object if at least 1 operation is closed
        if(closed.length >= 1){
          log.trace('Closing object %s',object._id);
          return object.close(callback);
        }else{
          return callback();
        }
      }
      if(mode==='ALL'){
        // Close the object if all the operation are closed
        if(closed.length === microtask.operations.length){
          log.trace('Closing object %s',object._id);
          return object.close(callback);
        }else{
          return callback();
        }
      }
      if(mode==='SPECIFIC'){
        // Close the object if the specified operation are closed
        var ops = config.operations;

        if(!_.isArray(ops)){
          ops = [ops];
        }

        log.trace('The operations required to the close are: [%s]', ops);
        var completed = true;


        for(var i=0;i<ops.length;i++){

          var opId = _.findWhere(microtask.operations,{label:ops[i]});
          var mart = _.filter(closed,function(mart){
            return opId._id.equals(mart.operation);
          });

          // If at least 1 operation of the required one is not closed it sets  completed to false
          if(_.isUndefined(mart) || mart.length === 0){
            completed = false;
            break;
          }
        }

        // If it's completed, close the object
        if(completed){
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

var checkParameters = function( params, done ) {
  log.trace( 'Checking parameters' );

  var mode = params.mode;

  if(_.isUndefined(mode)){
    log.error('A mode must be specified');
    return done(false);
  }

  if(mode!=='ALL' && mode!=='ONE' && mode!=='SPECIFIC'){
    log.error('Unsupported mode is specified (%s)',mode);
    return done(false);
  }

  if(mode==='SPECIFIC'){
    var operations = params.operations;

    if(_.isUndefined(operations)){
      log.error('The operations must be specified for the SPECIFIC mode');
      return done(false);
    }
  }

  // Everything went better then expected...
  return done(true);
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