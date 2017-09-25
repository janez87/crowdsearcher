
'use strict';
var util = require('util');
let _ = require( 'lodash' );
var async = require('async');

var log = CS.log.child( { component: 'CreateRank' } );

// Models
var Execution = CS.models.execution;
var ObjectModel = CS.models.object;

var CSError = require('../../error');
// Custom error
var CreateRankError = function( id, message) {
  CreateRankError.super_.call( this, id, message);
};

util.inherits( CreateRankError, CSError );

// Error name
CreateRankError.prototype.name = 'CreateRankError';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var task = data.execution.task;

  var prefix = config.prefix + task.id +'_';

  var microtaskMap = {};

  _.each(task.microtasks,function(microtask){
    microtaskMap[microtask] = 0;
  });

  Execution
  .find({
    task:task.id,
    closed:true
  })
  .where('metadata.key').ne(prefix+'considered')
  .populate('microtask')
  .exec(domain.bind(function(err,executions){
    if (err) return callback(err);

    log.trace('Found %s executions',executions.length);

    _.each(executions,function(exe){
      var id = exe.microtask._id;

      if(_.isUndefined(microtaskMap[id])){
        microtaskMap[id] = 1;
      }else{
        microtaskMap[id] = microtaskMap[id] +1;
      }
    });

    var min = _.min(microtaskMap,function(value){
      return value;
    });

    log.trace('Each microtask has at least %s executions',min);

    if(min === 0){
      log.trace('More executions needed');
      return callback();
    }

    if(min>=1){
      log.trace('I can compute the rank!!');

      // i need the data structure microtask -> [executions]
      var mtasks = _.groupBy(executions,function(execution){
        return execution.microtask._id;
      });


      var computeScore = function(winner,loser,callback){

        ObjectModel
        .find()
        .where('_id')
        .in([winner,loser])
        .exec(domain.bind(function(err,objects){
          if(err) return callback(err);

          if( objects.length !== 2){
            log.error('Something went wrong');
            return callback(new Error('Retrieved more than 2 objects'));
          }

          var winnerObject = _.filter(objects,function(item){
            return item._id.equals(winner);
          });
          winnerObject = winnerObject[0];

          var loserObject = _.filter(objects,function(item){
            return item._id.equals(loser);
          });
          loserObject = loserObject[0];

          var winnerOldScore = winnerObject.getMetadata(prefix+'score');
          if(_.isUndefined(winnerOldScore)){
            winnerOldScore  = 0;
          }

          log.trace('Winner score %s', winnerOldScore+1);

          var loserOldScore = loserObject.getMetadata(prefix+'score');
          if(_.isUndefined(loserOldScore)){
            loserOldScore  = 0;
          }

          log.trace('Loser score %s', loserOldScore-1);

          winnerObject.setMetadata(prefix+'score',winnerOldScore+1);
          loserObject.setMetadata(prefix+'score',loserOldScore-1);

          winnerObject.save(function(err){
            if( err) return callback(err);

            loserObject.save(callback);
          });
        }));

      };

      var markAsConsidered = function(mtExecution,callback){
        log.trace('Marking the execution %s as already seen',mtExecution.id);
        mtExecution.setMetadata(prefix+'considered',true);
        mtExecution.save(callback);
      };

      var updateScore = function(microtaskId,callback){
        log.trace('Evaluating the microtask %s',microtaskId);
        var mtExecution = mtasks[ microtaskId];

        //if more the one executions are present I take the one closed first
        if(_.isArray(mtExecution) && mtExecution.length>1){
          var sorted = _.sortBy(mtExecution,function(execution){
            return execution.closedDate;
          });

          mtExecution = sorted[0];
        }else if(_.isArray(mtExecution)){
          mtExecution = mtExecution[0];
        }

        var microtask = mtExecution.microtask;
        log.trace('Updating the score based on the execution %s',mtExecution.id);

        var winner = mtExecution.annotations[0].object;

        log.trace('The winner is %s',winner);

        var loser = _.filter(microtask.objects,function(o){
          return !o.equals(winner);
        });

        loser = loser[0];

        log.trace('The loser is %s',loser);

        computeScore(winner,loser,_.partial(markAsConsidered,mtExecution,callback));
      };

      log.trace(_.keys(mtasks));
      async.eachSeries(_.keys(mtasks),updateScore,callback);
    }

  }));
};



var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
  prefix:{
    type:'string',
    'default':'rank_'
  }
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
