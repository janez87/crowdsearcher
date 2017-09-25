
'use strict';
var util = require('util');
let _ = require( 'lodash' );

var log = CS.log.child( { component: 'Aggregate Majority' } );

// Models
var CSError = require('../../error');
// Custom error
var CheckSpammerError = function( id, message) {
  CheckSpammerError.super_.call( this, id, message);
};

util.inherits( CheckSpammerError, CSError );

// Error name
CheckSpammerError.prototype.name = 'CheckSpammerError';

CheckSpammerError.BAD_PARAMETER = 'BAD_PARAMETER';

var createMetadata = function(task,performer){

  var label = 'spammer_'+task.id+'_';

  var count = performer.getMetadata(label+'count');
  if(_.isUndefined(count)){
    performer.setMetadata(label+'count',0);
  }

  var right = performer.getMetadata(label+'rigth');
  if(_.isUndefined(right)){
    performer.setMetadata(label+'right',0);
  }

  var wrong = performer.getMetadata(label+'wrong');
  if(_.isUndefined(wrong)){
    performer.setMetadata(label+'wrong',0);
  }

  var spammer = performer.getMetadata(label+'spammer');
  if(_.isUndefined(spammer)){
    performer.setMetadata(label+'spammer',true);
  }


};

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var execution = data.execution;
  var microtask = data.microtask;
  var performer = execution.performer;

  if(_.isUndefined(performer)){
    log.trace('The performer is anonymous');
    return callback();
  }

  createMetadata(data.task,performer);

  microtask.populate('operations',function(err,microtask){
    if (err) return callback(err);

    var operation = _.findWhere(microtask.operation, {label:config.operation});

  });

};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

var params = {
  threshold:'numeric',
  operation:'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;