// Load libraries
var _ = require('underscore');
var domain = require( 'domain' );
var async = require('async');

var Performer = common.models.user;

var log = common.log.child( { component: 'Invitation Strategy SPECIFY' } );

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

  //Building the query
  var query = {};
  if(!_.isUndefined(config.username) && config.username!==''){
    query.username = config.username;
  }

  if(!_.isUndefined(config.email) && config.email!==''){
    query.email = config.email;
  }

  if(!_.isUndefined(config.firstname) && config.firstname!==''){
    query['name.first'] = config.firstname;
  }

  if(!_.isUndefined(config.lastname) && config.lastname!==''){
    query['name.last'] = config.lastname;
  }

  var invite = function(platformName,callback){
    log.trace('Selected platform %s',platformName);

    var platform = _.findWhere(task.platforms,{name:platformName});

    var platformConfig = platform.params;
    // Retrieving the platform implementation
    var platformImpl = GLOBAL.common.platforms[ platformName ];

    // The platform need to now wich strategy is called
    platformConfig.strategyName = 'SPECIFY';

    platformImpl.invite(data,platformConfig,callback);

  };

  log.trace('Searching the performers the fulfil ths condition %j',query);

  Performer
  .find(query)
  .exec(d.bind(function(err,performers){
    if (err) return callback(err);


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
  },
  username:'string',
  firstname:'string',
  lastname:'string',
  email:'string'
};

var triggerOn = [
  'OPEN_TASK'
];


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;
