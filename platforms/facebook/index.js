//module.change_code = true;

// Load libraries
var domain = require( 'domain' );
var nconf = require('nconf');

var FB = require('fb');

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

  var d = domain.createDomain();

  d.on('error',callback);

  var task = data.task;
  var strategyName = config.strategyName;
  var message = 'I just posted a task on CrowdSearcher';
  config.token = config.token;

  var token = config.token;

  var url = nconf.get('webserver:externalAddress') + nconf.get('api:urlPath') + '/landing?task='+task._id;

  if(strategyName === 'ANNOUNCEMENT'){
    FB.api('me/feed', 'post', {
      name: task.name,

      caption: 'CrowdSearcher Application',
      description: message,

      picture: 'http://upload.wikimedia.org/wikipedia/it/b/be/Logo_Politecnico_Milano.png',

      link: url,

      actions: [ {
        name: 'Execute',
        link: url
      } ],
       access_token: token
    }, function (res) {
      if( res.error ) return callback( new Error( res.error.message || res.error.code ) );

      log.trace('Invite sent');

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
    clientID:'string',
    clientSecret:'string',
    token: {
      type: 'string',
      'default': ''
    }
  }
};

module.exports = exports = Platform;