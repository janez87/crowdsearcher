
// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var AMT = require( 'amt' );
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'Expire HIT' } );

var CSError = require('../../error');
// Custom error
var ExpireHITError = function( id, message) {
  /* jshint camelcase:false */
  ExpireHITError.super_.call( this, id, message);
};

util.inherits( ExpireHITError, CSError );

// Error name
ExpireHITError.prototype.name = 'ExpireHITError';
ExpireHITError.NO_AMT_PLATFORM = 'NO_AMT_PLATFORM';


var performRule = function( data, params, callback ) {
  log.trace( 'Performing the rule' );

  var d = domain.create();
  d.on( 'error', callback );

  var microtask = data.microtask;
  // Get the hit from the microtask
  var hitId = microtask.getMetadata( 'hit' );

  if( !hitId ) {
    log.warn( 'The microtask does not have a AMT "hit" metadata' );
    return callback();
  }

  microtask
  .populate( 'platforms', d.bind( function( err, microtask ) {
    if( err ) return callback( err );

    var platform = _.findWhere( microtask.platforms, { name: 'amt' } );
    if( !platform ) {
      log.error( 'No AMT platform present in the microtask %s', microtask._id );
      return callback( new ExpireHITError( ExpireHITError.NO_AMT_PLATFORM, 'The microtask does not have an AMT platform' ) );
    }

    var platformParameters = platform.params;
    // Init the AMT wrapper
    var amt = new AMT( {
      key: platformParameters.accessKeyId,
      secret: platformParameters.secretAccessKey,
    } );

    log.trace( 'Expiring the hit %s', hitId );
    amt.expireHIT( hitId, function( err ) {
      if( err ) return callback( err );

      log.trace( 'Hit %s successfully expired', hitId );

      return callback();
    } );
  } ) );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
