
// Load libraries
var _ = require('underscore');
var util = require('util');

var log = CS.log.child( { component: 'Close MicroTask' } );

// Models
var Microtask = CS.models.microtask;

var CSError = require('../../error');
// Custom error
var CloseMicroTaskError = function( id, message) {
  CloseMicroTaskError.super_.call( this, id, message);
};

util.inherits( CloseMicroTaskError, CSError );

// Error name
CloseMicroTaskError.prototype.name = 'CloseMicroTaskError';

CloseMicroTaskError.BAD_PARAMETER = 'BAD_PARAMETER';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',function(err){
    return callback(err);
  });

  var execution = data.execution;

  // Ensuring the rule is called on the right event
  if(_.isUndefined(execution)){
    log.warn('Execution undefined, this rule can be called only on execution end');
    return callback();
  }

  Microtask.findById(execution.microtask,function(err,microtask){
    if (err) return callback(err);

    // Populating the objects
    microtask.populate('objects',function(err,microtask){

      log.trace('%s objects retrieved',microtask.objects.length);
      var objects = microtask.objects;

      var closed = 0;
      _.each(objects,function(object){

        log.trace('Retrieving the status of the object %s',object.id);

        var status = _.findWhere(object.metadata,{name:'_status'});

        if(!_.isUndefined(status) && status.value === 'closed'){
          log.trace('Object %s is closed',object.id);
          closed++;
        }
      });

      log.trace('Found %s closed objects',closed);

      if(closed === objects.length){

        log.trace('Closing the microtask %s',microtask.id);
        microtask.closeMicroTask(domain.bind(callback));
      }else{

        log.trace('%s need to be evaluated',objects.length-closed);
        return callback();
      }

    });
  });

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
