
// Load libraries
var _ = require('underscore');
var util = require('util');

var log = common.log.child( { component: 'DisableHit' } );

var CSError = require('../../error');
// Custom error
var DisableHitError = function( id, message) {
  DisableHitError.super_.call( this, id, message);
};

util.inherits( DisableHitError, CSError );

// Error name
DisableHitError.prototype.name = 'DisableHitError';


var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var microtask = data.microtask;

  var hitId = microtask.getMetadata('hit');

  if(_.isUndefined(hitId)){
    return callback();
  }

  var conf = {
    url: config.url,
    receptor: { port: 3000, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    amount: config.price,
    duration: config.duration
  };

  var mturk = require('mturk')(conf);
  var HIT = mturk.HIT;

  log.trace('Disabling the hit %s',hitId);

  HIT.disable(hitId,function(err){
    if (err) return callback(err);

    log.trace('Hit %s successfully disabled',hitId);

    return callback();
  });
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
