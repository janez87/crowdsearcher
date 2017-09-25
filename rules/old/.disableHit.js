
'use strict';
let _ = require( 'lodash' );
var util = require('util');
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'DisableHit' } );

// Import models
var Platform = CS.models.platform;

var CSError = require('../../error');
// Custom error
var DisableHitError = function( id, message) {
  /* jshint camelcase:false */
  DisableHitError.super_.call( this, id, message);
};

util.inherits( DisableHitError, CSError );

// Error name
DisableHitError.prototype.name = 'DisableHitError';


var performRule = function( data, params, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on('error',callback);

  var microtask = data.microtask;
  // Get the hit from the microtask
  var hitId = microtask.getMetadata('hit');

  if( _.isUndefined( hitId ) ) {
    log.warn( 'The microtask does not have a AMT hit data' );
    return callback();
  }

  microtask
  .populate( 'platforms', d.bind( function( err, microtask ) {
    if( err ) return callback( err );

    var amtPlatform = _.findWhere( microtask.platforms, { name: 'amt' } );
    log.trace( 'AMT found: %j', amtPlatform );

    if( !amtPlatform ) {
      log.warn( 'The microtask does not have an AMT platform' );
      return callback();
    }

    var config = amtPlatform.params;
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

    HIT.disable( hitId, function( err ) {
      if( err ) return callback( err );

      log.trace( 'Hit %s successfully disabled', hitId );

      return callback();
    });
  } ) );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
