
// Load libraries
var async = require( 'async' );
var util = require('util');
var _ = require('underscore');

var log = common.log.child( { component: 'MajorityLoop rule' } );

// Import the model

var CSError = require('../../error');
// Custom error
var MajorityLoopError = function( id, message) {
  MajorityLoopError.super_.call( this, id, message);
};

util.inherits( MajorityLoopError, CSError );

// Error name
MajorityLoopError.prototype.name = 'MajorityLoopError';


var performRule = function( data, config, callback ) {
  log.trace( 'Performing the rule' );
  var task = data.task;
  var domain = require( 'domain' ).create();

  domain.on('error',function(err){
    return callback(err);
  });

  var invalid = data.execution.getMetadata('invalid');

  // I don't consider the execution if it was marked as invalid by some previous rule
  if(!_.isUndefined(invalid) && invalid === true){
    log.trace('The execution %s is invalid',data.execution.id);
    return callback();
  }

  if(_.isUndefined(config.numberOfAnswer) || _.isUndefined(config.agreement) || config.numberOfAnswer.length === 0 || config.agreement.length === 0){
    log.error('Missing parameters');
    return callback();
  }

  // TRICK: casting the parameter to integer
  config.numberOfAnswer =  config.numberOfAnswer.map(function(p){
    return parseInt(p,10);
  });

  config.agreement =  config.agreement.map(function(p){
    return parseInt(p,10);
  });

  task
  .populate('operations',domain.bind( function(err,task){
    if( err ) return callback( err );

    var operations = task.operations;

    var callMajority = function( operation, callback ) {
      log.trace('Executing the majority for %s of type %s',operation.label,operation.name);

      var majorityFunction;
      try {
        log.trace('Searching for file %s','./majorities/'+operation.name+'Majority.js');

        majorityFunction = require('./majorities/'+operation.name+'Majority.js');

      } catch( err ) {
        log.warn(err);
        log.warn( 'Majority not found for %s', operation.name );
        return callback();
      }

      return majorityFunction.perform( data, operation, config, callback );
    };

    return async.eachSeries( operations, callMajority , callback );
  } ) );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};


var params = {
  agreement: ['string'],
  numberOfAnswer: ['string'],
  spread:'numeric'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;