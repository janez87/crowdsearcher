
// Load libraries
var _ = require('underscore');
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Close MicroTask' } );

// Models
var Microtask = CS.models.microtask;

var performRule = function( event, config, task, data, callback ) {
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

        var status = object.status;

        if(status === 'CLOSED'){
          log.trace('Object %s is closed',object.id);
          closed++;
        }
      });

      log.trace('Found %s closed objects',closed);

      if(closed === objects.length){

        log.trace('Closing the microtask %s',microtask.id);
        return microtask.closeMicroTask(domain.bind(callback));
      }else{

        log.trace('%s need to be evaluated',objects.length-closed);
        return callback();
      }

    });
  });

};

var checkParameters = function( params, done ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return done(true);
};


module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
