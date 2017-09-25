'use strict';
let _ = require( 'lodash' );
var domain = require( 'domain' );
var async = require('async');

var Performer = CS.models.user;

var log = CS.log.child( { component: 'Invitation Strategy ALL' } );

var performStrategy = function( data, config, callback ) {
  log.debug( 'Running strategy' );

  var d = domain.createDomain();

  d.on('error',callback);

  // Retrieving the selected platforms
  var platforms = config.platform;
  var task = data.task;

  if(!_.isArray( platforms )){
    platforms = [ platforms ];
  }

  var invite = function(platformName,callback){
    log.trace('Selected platform %s',platformName);

    var platform = _.findWhere(task.platforms,{name:platformName});

    var platformConfig = platform.params;
    // Retrieving the platform implementation
    var platformImpl = CS.platforms[ platformName ];

    // The platform need to now wich strategy is called
    platformConfig.strategyName = 'ALL';

    platformImpl.invite(data,platformConfig,callback);

  };

  Performer.find({},d.bind(function(err,performers){
    if (err) return callback(err);

    if(performers.length === 0){
      return callback();
    }

    if(!_.isArray(performers)){
      performers = [performers];
    }

    log.trace('found %s performers',performers.length);
    data.performers = performers;
    async.each(platforms,invite,callback);

  }));


};

var checkParameters = function( task, params, callback ) {
  log.debug( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};


var params = {
  platform: {
    type: ['string'],
    'default': 'facebook'
  }
};

var triggerOn = [
  'OPEN_TASK'
];


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;
