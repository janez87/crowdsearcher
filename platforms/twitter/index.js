/* jshint camelcase: false */

// Load libraries
var domain = require( 'domain' );
var nconf = require('nconf');

var Twit = require('twit');

// Create a custom logger
var log = common.log.child( { component: 'Facebook' } );

function execute( task, microtask, execution, config, callback ) {
  return callback( new Error( 'Not implemented' ) );
}


function retrieve( task, microtask, config, cronJob ) {
  log.trace( 'Job running' );
  log.trace( 'Task: %s', task._id );
  log.trace( 'Microtask: %s', microtask._id );
  log.trace( 'Microtask metadata: %j', microtask.metadata );
  log.trace( 'Config: %j', config );
  log.trace( 'CronJob: %j', cronJob );

}


function create( task, microtask, config, callback ) {
  log.warn('Not implemented');
  return callback();
}

function invite(data, config, callback){
  log.trace('Using the configuration %j',config);

  var d = domain.createDomain();

  d.on('error',callback);

  var task = data.task;
  var strategyName = config.strategyName;


  // Task url
  var url = nconf.get('webserver:externalAddress') + nconf.get('api:urlPath') + '/landing?task='+task._id;

  var message = 'I just posted a task on CrowdSearcher\n'+url;

  if(strategyName === 'ANNOUNCEMENT'){

    var twit = new Twit({
      consumer_key: config.clientID,
      consumer_secret: config.clientSecret,
      access_token: config.token,
      access_token_secret: config.tokenSecret
    });

    twit.post('statuses/update', { status: message, includes_entities:true }, function(err, reply) {
      if (err) return callback(err);

      log.trace('Message posted on twitter');
      log.trace(reply);

      return callback();
    });

  }else{
    log.error('Strategy %s not supported yet', strategyName);
    return callback( new Error( 'Strategy not supported yet' ) );
  }

}

var Platform = {
  invite: invite,
  timed: {
    expression: '* * * * *',
    onTick: retrieve
  },
  execute: execute,
  create: create,
  params : {
    clientID:{
      type:'string',
      'default':''
    },
    clientSecret:{
      type:'string',
      'default':''
    },
    token: {
      type: 'string',
      'default': ''
    },
    tokenSecret:{
      type:'string',
      'default':''
    }
  }
};

module.exports = exports = Platform;