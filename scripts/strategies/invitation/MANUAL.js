// Load libraries
var _ = require('underscore');

var log = common.log.child({
  component: 'Invitation Strategy MANUAL'
});

var performStrategy = function(data, config, callback) {
  log.debug('Running strategy');

  return callback();

};

var checkParameters = function(task, params, callback) {
  log.debug('Checking parameters');

  // Everything went better then expected...
  return callback();
};


var params = {

};

var triggerOn = [
  'OPEN_TASK'
];


module.exports.perform = exports.perform = performStrategy;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
module.exports.triggerOn = exports.triggerOn = triggerOn;