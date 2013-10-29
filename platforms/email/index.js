//module.change_code = true;

// Load libraries
var _ = require('underscore');
var domain = require( 'domain' );
var nconf = require('nconf');
var nodemailer = require('nodemailer');
var async = require('async');
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( { component: 'Email' } );

function invite(data, config, callback){

  var d = domain.createDomain();

  d.on('error',callback);

  var task = data.task;

  var service = config.service;
  var host = config.host;
  var port = config.port;
  var user = config.user;
  var password = config.password;
  var secure = config.secure;
  var from = config.from;

  var smtp;

  if(!_.isUndefined(service) && service!==''){
    log.trace('Creating the smtp connection to the service %s', service);
    smtp = nodemailer.createTransport(service,{
      auth:{
        user:user,
        pass:password
      }
    });

  }else{
    log.trace('Creating the smtp connection to the host %s', host);
    smtp = nodemailer.createTransport('SMTP',{
      hostname:host,
      secureConnection:secure,
      port:port,
      auth:{
        user:user,
        pass:password
      }
    });

  }

  var strategyName = config.strategyName;
  var performers = data.performers;

  var url = nconf.get( 'webserver:externalAddress' );
  url += 'api/landing?task='+task.id;

  if(strategyName === 'ANNOUNCEMENT'){
    log.warn('The email does not support the ANNOUNCEMENT strategy');
    return callback();
  }


  var sendMail = function(performer,callback){
    log.trace('Composing the mail for the user %j',performer);

    if(_.isUndefined(performer.email)){
      log.trace('Performer %s does not have an email',performer.id);
      return callback();
    }

    var mail = {
      from:from,
      to:performer.email,
      html:'<p>I posted a task on the CrowdSearcher</p></br><p>Click <a href="'+url+'"  >here</a> to execute it</p>',
      subject:'crowdSearcher'
    };

    smtp.sendMail(mail,function(err,status){
      if (err){
        log.error(err.message);

        // I ignore the error and continue to send mails
        return callback();
      }

      log.trace(status.message);
      return callback();
    });

  };

  async.each(performers,sendMail,function(err){
    if (err) return callback(err);

    smtp.close();
    return callback();
  });

}

function create(task, microtask, config, callback){
  log.trace('Nothing to do here');
  return callback();
}

var Platform = {
  init: create,
  invite: invite,
  enabled: true,
  params: {
    service: {
      type: 'string',
      'default': 'gmail'
    },
    host: 'string',
    port: 'number',
    user: 'string',
    password: 'password',
    secure:'boolean',
    from:'string'
  }
};
module.exports = exports = Platform;