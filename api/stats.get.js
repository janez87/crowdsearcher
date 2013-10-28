// Load libraries
var _  = require('underscore');
var util  = require('util');
var async = require('async');

// Import a child Logger
var log = common.log.child( { component: 'Stats' } );

// Import Models
var Execution = common.models.execution;
var Microtask = common.models.microtask;
var Task      = common.models.task;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetStatsError = function( id, message, status ) {
  GetStatsError.super_.call( this, id, message, status );
};
util.inherits( GetStatsError, APIError );
// Custom error IDS
GetStatsError.prototype.name = 'GetStatsError';
GetStatsError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: false,
    microtask: false,
    execution: false
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'stats', //

  // The API method to implement.
  method: 'GET'
};

// API core function logic. If this function is executed then each check is passed.
//TODO:
API.logic = function getStats( req, res, next ) {
  log.trace( 'Get stats' );

  // At least one the parameters must be passed
  if(_.isUndefined(req.query.task) && _.isUndefined(req.query.microtask) && _.isUndefined(req.query.execution) ){
    log.error('At least one parameter must be specified');
    return next( new GetStatsError(
      GetStatsError.MISSING_PARAMETERS,
      'All the parameter are undefined',
      APIError.BAD_REQUEST ) );
  }

  var filter={};
  if( req.query.task ){
    filter.task = req.query.task;
    //TODO:
  }

  if( req.query.microtask ){
    filter.microtask = req.query.microtask;
    //TODO:
  }

  if( req.query.execution ){
    filter.execution= req.query.execution;
    //TODO:
  }




  //@param taskId
    var taskLevelStats =function(taskId,callback){
      Task
      .find({"_id":taskId})
      .exec( req.wrap( function (err,tasks){
        if(err) callback(err);
        if(tasks.length==0) {
          log.warning("No task found for Id"+taskId);
          callback();
        }
        var task = tasks[0]

        var numberOfMicrotask=task["microtasks"].length;
        var numberOfObject =task["objects"].length;
        var taskStats={};
        taskStats.numberOfMicrotasks=numberOfMicrotask;
        taskStats.numberOfObjects=numberOfObject;

        var creationDate= task["creationDate"];
        var closedDate;
        //get the closedDate for task, if not exists recursive to microtask level
        if (task["closedDate"]!=null) {
          closedDate=task["closedDate"];
          var totalTaskTime=(closedDate-creationDate)/1000;
          taskStats.totalTaskTime=totalTaskTime;

          var result=["taskStats",taskStats]
          callback(null,result);
        }
        else{
            Execution
            .find({"task":taskId,"closedDate":{$ne:null}},{"closedDate":1,"_id":0})
            .sort({"closedDate":-1})
            .limit(1)
            .exec(function (err, execution){
              closedDate=execution[0]["closedDate"];
              var totalTaskTime=(closedDate-creationDate)/1000;
              taskStats.totalTaskTime=totalTaskTime;

              var result=["taskStats",taskStats]
              callback(null,result);
            });
        }
      }));
    }

    //@param taskId
    var microtaskLevelStats = function(taskId,callback){
      Microtask
      .find({"task":taskId})
      .exec(req.wrap(function (err,microtasks){
          var numberOfMicrotask=microtasks.length;
          var numberOfMicrotaskClosed=0;
          var totalMicrotaskTime=0;

          _.each(microtasks,function(microtask){
            var closedDate;
            if (microtask["closedDate"]==null){
              closedDate=Date.now();
            }
            else{
              closedDate=microtask["closedDate"];
              numberOfMicrotaskClosed++;
            }
            var creationDate=microtask["creationDate"];
            totalMicrotaskTime+=closedDate-creationDate;
          });

          microtaskStats={};
          microtaskStats.totalMicrotaskTime=totalMicrotaskTime;
          microtaskStats.averageMicrotaskTime=totalMicrotaskTime/numberOfMicrotask;
          microtaskStats.numberOfMicrotasksClosed=numberOfMicrotaskClosed;
          microtaskStats.numberOfMicrotasks=microtasks.length;

          var result=["microtaskStats",microtaskStats]
          callback(null,result);
      }));
    }


    //@param taskId
    //TODO:get time from microtask not execution
    var executionStatsOfTaskLevel = function(taskId,callback){
      Execution
      .find({"task":taskId})
      .exec( req.wrap( function ( err, executions) {
        var totalExecutionTime=0;
        var totalExecutioncounterDone=0;

        for(var i=0;i<executions.length;i++){
          var tmpExecution=executions[i];
          if (tmpExecution['closed']){
            var closedDate = tmpExecution['closedDate'];
            var creationDate = tmpExecution['creationDate'];
            totalExecutionTime += closedDate-creationDate;
            totalExecutioncounterDone++;
          }
        }

        executionStatsOfTask={};
        executionStatsOfTask.totalExecutionTime=totalExecutionTime;
        executionStatsOfTask.averageExecutionTime=totalExecutionTime/totalExecutioncounterDone;
        executionStatsOfTask.numberOfExecutions=executions.length;
        executionStatsOfTask.numberOfExecutionsDone=totalExecutioncounterDone;

        var result=["executionStatsOfTask",executionStatsOfTask];
        callback(null,result);
      }));

    }


    //@param filter=microtaskId
    var  executionStatsOfMicrotask= function(microtaskId,callback){
      Execution
      .find({"microtask":microtaskId})
      .exec( req.wrap( function ( err,executions){
          var totalExecutionTimePerMicrotask = 0;
          var numberOfExecutionDonePerMicrotask  = 0;
          var numberOfExecutionPerMicrotask =0;

          _.each(executions,function(execution){
            numberOfExecutionPerMicrotask++;
            if(execution["closed"]){
              var closedDate = execution["closedDate"];
              var creationDate = execution["creationDate"];
              totalExecutionTimePerMicrotask += closedDate-creationDate;
              numberOfExecutionDonePerMicrotask++;
            }
          });
          var executionOfMicrotask={};
          //executionOfMicrotask.microtaskId=microtaskId;
          executionOfMicrotask.totalExecutionTime=totalExecutionTimePerMicrotask/1000;
          executionOfMicrotask.averageExecutionTime=totalExecutionTimePerMicrotask/(numberOfExecutionDonePerMicrotask*1000);
          executionOfMicrotask.numberOfExecutionsPerMicrotask=numberOfExecutionPerMicrotask;
          executionOfMicrotask.numberOfExecutionsDonePerMicrotask=numberOfExecutionDonePerMicrotask;

          var str1=microtaskId.toString();
          var str2="microtaskId:";
          var key = str2.concat(str1);

          var result=[key,executionOfMicrotask];
          callback(null,result);
      }));
    }

      //@param taskId
    var executionStatsOfMicrotaskLevel = function(taskId,callback){
      Task
      .find({"_id":taskId})
      .exec(req.wrap(function(err,tasks){
        if(tasks.length>1) console.log("Exists duplicated task!");
        var task=tasks[0];
        var microtasksArray=task["microtasks"];
        var executionStatsPerMicrotask=[];

        async.map(microtasksArray,executionStatsOfMicrotask,function(err,results){

          var result=["executionStatsPerMicrotask",results];
          callback(null,result);
        //  callback(null,"executionStatsPerMicrotask",results);
        });
      }));

    }

    //@param taskId
  var performerStats = function(taskId,callback){
      Execution
      .find({"task":taskId},{"metadata":1,"_id":0})
      .exec(req.wrap(function (err,executions){
        var performers=new Array();

        _.each(executions,function(executionMetadata){
          var metadata=executionMetadata["metadata"];
          _.each(metadata,function(data){
            if(data["key"]=="worker"){
              var performerId=data["value"];
              if(!(_.contains(performers,performerId))){
                performers.push(performerId);
              }
            }
          })
        });
        performerStats={}
        performerStats.numberOfPerformers=performers.length;
        performerStats.executionsPerPerform=executions.length/performers.length;

        var result=["performerStats",performerStats];
        callback(null,result);
      }));
    }


    //TODO:number of performers for each microtask
    //average number of performers for each microtask

    //object stats
    /*
    number of objects
    number of objects actived
    average time for each object
    */
    var json = {};
    var microtaskId="5252d536d47267a82b00040e";

    //---entry points of different stats calculation tasks---

    var tasksArray=[taskLevelStats.bind(this,filter.task),
                    executionStatsOfMicrotask.bind(this,microtaskId),
                    performerStats.bind(this,filter.task),
                    microtaskLevelStats.bind(this,filter.task),
                    executionStatsOfTaskLevel.bind(this,filter.task),
                    executionStatsOfMicrotaskLevel.bind(this,filter.task)
                    ];

    async.parallel(tasksArray,function (err,results){
      if(err) {
        log.error(err);
      }

      _.each(results,function(data){
        var key=data[0];
        var value=data[1];

        if(key=="executionStatsPerMicrotask"){
          json["executionStatsPerMicrotask"]=[];
          _.each(value,function(tmpdata){
            var tmpObject={};
            var tmpkey=tmpdata[0];
            var tmpvalue=tmpdata[1];
            tmpObject[tmpkey]=tmpvalue;
            json["executionStatsPerMicrotask"].push(tmpObject);
          });
        }
        else{
          json[key]=value;
        }

      });
      log.trace("Done with stats calculation.");

      return res.json(json);
    });
/*Just for test
taskId:5252cd49d47267a82b0002c7;
microtaskId:5252d536d47267a82b00040e;
*/

};


// Export the API object
exports = module.exports = API;