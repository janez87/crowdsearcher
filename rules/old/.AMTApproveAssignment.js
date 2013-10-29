
// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var util = require('util');

var log = CS.log.child( { component: 'AMT Approve Assignment' } );

// Models
var Platform = CS.models.platform;

var CSError = require('../../error');
// Custom error
var AMTApproveAssignmentError = function( id, message) {
  AMTApproveAssignmentError.super_.call( this, id, message);
};

util.inherits( AMTApproveAssignmentError, CSError );

// Error name
AMTApproveAssignmentError.prototype.name = 'AMTApproveAssignmentError';


var performRule = function( data, params, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var execution = data.execution;
  var assignmentId = execution.getMetadata('assignment');
  var microtask = data.microtask;

  var hitId = microtask.getMetadata('hit');

  if(_.isUndefined(hitId) || _.isUndefined(assignmentId)){
    return callback();
  }

  // I need the platorm for its configuration
  Platform.findById(execution.platform,domain.bind(function(err,platform){
    if(err || !platform) return callback(err);

    log.trace('Platform retrieved %s', platform.name);

    var config = platform.params;

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

    log.trace('Retrieving the hit %s',hitId);
    HIT.get(hitId,function(err,hit){
      if(err) return callback(err);

      log.trace('Hit %s retrieved',hit.id);

      var approveAssignment = function(assignment,callback){

        if(assignmentId === assignment.id){
          log.trace('Approving assignment %s',assignment.id);
          return assignment.approve('good work!',callback);
        }

        return callback();
      };

      log.trace('Retrieving the assignment for the hit %s', hit.id);
      hit.getAssignments({assignmentStatus:'Submitted'},function(err,numResult,totalNumResult,pageNumber,assignments){

        log.trace('Found %s submitted assignments',assignments.length);
        return async.eachSeries(assignments, approveAssignment,callback);

      });
    });
  }));



};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...
  return callback();
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
