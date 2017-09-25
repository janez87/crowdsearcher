'use strict';
var nconf = require( 'nconf' );
var nodemailer = require( 'nodemailer' );
var async = require( 'async' );
var CS = require( '../../core' );

// Create a custom logger
var log = CS.log.child( {
  component: 'Email'
} );




function invite( task, platform, callback ) {
  var params = platform.params;

  // Parameters
  var service = params.service;
  var host = params.host;
  var port = params.port;
  var user = params.user;
  var password = params.password;
  var secure = params.secure;
  var from = params.from;
  var emails = params.emails;

  // init SMTP
  var smtp;
  if ( service && service.trim() !== '' ) {
    log.trace( 'Creating the smtp connection to the service %s', service );

    smtp = nodemailer.createTransport( service, {
      auth: {
        user: user,
        pass: password
      }
    } );

  } else {
    log.trace( 'Creating the smtp connection to the host %s', host );

    smtp = nodemailer.createTransport( 'SMTP', {
      hostname: host,
      secureConnection: secure,
      port: port,
      auth: {
        user: user,
        pass: password
      }
    } );
  }

  // Generate URL
  var url = nconf.get( 'webserver:externalAddress' );
  url += 'api/landing?task=' + task.id;

  // The actual Sandmail
  function send( email, cb ) {

    // Create mail object
    var mail = {
      from: from,
      to: email,
      html: '<p>I posted a task on the CrowdSearcher</p></br><p>Click <a href="' + url + '"  >here</a> to execute it</p>',
      subject: 'CrowdSearcher task'
    };

    smtp.sendMail( mail, function( err, status ) {
      if ( err ) {
        log.error( err );
        return cb();
      }

      log.trace( 'Mail to %s sent: %s', email, status.message );
      return cb();
    } );
  }

  async.each( emails, send, function( err ) {
    if ( err ) return callback( err );
    smtp.close();
    return callback();
  } );
}

var Platform = {
  name: 'E-mail',
  description: 'Invite by sending an e-mail to performers.',
  image: 'http://www.goevolve.co.uk/cms/wp-content/uploads/2010/11/gmail.png',

  invite: invite,
  params: {
    emails: [ 'string' ],
    service: {
      type: 'string',
      'default': 'gmail'
    },
    host: 'string',
    port: 'number',
    user: 'string',
    password: 'password',
    secure: 'boolean',
    from: 'string'
  }
};
module.exports = exports = Platform;