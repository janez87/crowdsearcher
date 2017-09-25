'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let Redis = require( 'ioredis' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function configRedis() {
  let log = CS.log;
  // Configure mongo

  let redisConfig = this.get( 'redis' );
  redisConfig = _.assign( {}, redisConfig, {
    lazyConnect: true,
  } );

  log.trace( 'Configuring redis with: ', redisConfig );
  let redis = new Redis( redisConfig );

  CS.redis = redis;

  return redis.connect();
}


// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = configRedis;
