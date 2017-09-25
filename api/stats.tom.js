'use strict';
let _ = require( 'lodash' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( {
  component: 'Stats TOM'
} );

// Import Models
var Execution = CS.models.execution;
var Microtask = CS.models.microtask;
var Task = CS.models.task;
var OBJECT = CS.models.object;
var Platform = CS.models.platform;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetStatsError = function( id, message, status ) {
  GetStatsError.super_.call( this, id, message, status );
};
util.inherits( GetStatsError, APIError );
// Custom error IDS
GetStatsError.prototype.name = 'GetStatsError';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: ':entity/:id/stats',

  // The API method to implement.
  method: 'PUT'
};

// API core function logic. If this function is executed then each check is passed.
//TODO:
API.logic = function getStats( req, res, next ) {
  var entity = req.params.entity;
  var filter = {};
  filter[ entity ] = req.params.id;

  log.trace( 'Stats for %s with id %s', entity, req.params.id );

  //a list of utility function for calculation

  /*
    For a non-closed microTask, get its latest execution time
     */
  var getLatestExcutionTime = function( Mid, callback ) {
    Execution
      .find( {
        'microtask': Mid,
        'status': 'CLOSED'
      }, {
        'closedDate': 1
      } )
      .sort( {
        'closedDate': -1
      } )
      .limit( 1 )
      .exec( function( err, executions ) {
        callback( null, executions[ 0 ][ 'closedDate' ] );
      } );
  }
  /*
    For a non-closed microTask, get its latest microTask time
     */
  var getLatestMicroTaskTime = function( Tid, callback ) {
    Microtask
      .find( {
        'task': Tid
      } )
      .exec( req.wrap( function( err, microtasks ) {
        var time = 0,
          arr = [];
        for ( var i = 0; i < microtasks.length; i++ ) {
          if ( microtasks[ i ].status === 'CLOSED' && microtasks[ i ].closedDate > time ) {
            time = microtasks[ i ].closedDate;
          } else {
            arr.push( microtasks[ i ][ '_id' ] );
          }
        }
        async.map( arr, getLatestExcutionTime, function( err, results ) {
          _.each( results, function( result ) {
            if ( result > time ) {
              time = result;
            }
          } );
          callback( null, time );
        } );
      } ) );
  }


  /*
    sum up the value of array, array's value should be a number
     */
  var sumUpArray = function( array ) {
    var result = 0;
    _.each( array, function( value ) {
      result += value;
    } );
    return result;
  }


  /*
    for array consists of objects, combine them into one object
    e.g. [{'id':123},{'name','CrowdSearcher'}]-->
          {'id':123,'name':'CrowdSeacher'}
     */
  var combineObject = function( array ) {
    var result = {};
    _.each( array, function( obj ) {
      for ( var key in obj ) {
        result[ key ] = obj[ key ];
      }
    } );
    return result;
  }
  /*
    for array of numbers, calculate its average and variance
     */
  var getAverageAndVariance = function( array ) {
    var average = sumUpArray( array ) / array.length;
    var variance = 0;
    _.each( array, function( value ) {
      variance += ( value - average ) * ( value - average );
    } );
    return [ average, variance ];
  }
  /*
    check if a object is closed by its Id,
    callback: 1 means closed, 0 means open.
     */
  var isObjectClosed = function( objectId, callback ) {
    OBJECT
      .find( {
        '_id': objectId
      } )
      .exec( req.wrap( function( err, objects ) {
        if ( objects == null ) callback( err );
        var isClosed = ( objects[ 0 ].closedDate ) ? 1 : 0;
        callback( null, isClosed );
      } ) );
  }


  /*
      for a list of executions, return
      #total execution
      #closed execution
      #invalid execution
      */
  var numberOfExecutionsStatus = function( executions ) {
    var totalExecutions = 0,
      closedExecutions = 0,
      invalidExecutions = 0;
    _.each( executions, function( execution ) {
      totalExecutions++;
      if ( execution.status === 'CLOSED' ) {
        closedExecutions++
      };
      if ( execution.status === 'INVALID' ) {
        invalidExecutions++
      };
    } );
    return {
      'executions': totalExecutions,
      'closedExecutions': closedExecutions,
      'invalidExecutions': invalidExecutions
    }
  }


  /*
    for a given microTask, get its duration time
     */
  var getDurationByMT = function( microtask, callback ) {
    var microtaskId = microtask[ '_id' ],
      closedDate;
    var next = function() {
      var duration = ( closedDate - microtask.createdDate ) / SECOND;
      callback( null, duration );
    }
    if ( microtask.status === 'CREATED' ) {
      getLatestExcutionTime( microtaskId, function( err, result ) {
        closedDate = result;
        next();
      } );
    } else if ( microtask.status === 'CLOSED' ) {
      closedDate = microtask.closedDate;
      next();
    }
  }
  /*
    for a given microTask, get the number of executions
     */
  var getExectuionsByMT = function( microtask, callback ) {
    var microtaskId = microtask[ '_id' ];
    var anFilter = {
      'microtask': microtaskId
    };
    Execution
      .find( anFilter )
      .exec( req.wrap( function( err, executions ) {
        callback( null, executions.length );
      } ) );
  }
  /*
    filter executions by performer Id
     */
  var getExecutionsByPerformer = function( Pid, executions ) {
    var result = new Array();
    _.each( executions, function( execution ) {
      if ( execution.performer.toString() === Pid || execution.performer === Pid ) {
        result.push( execution );
      };
    } );
    return result;
  }
  /*
    for given list of microTasks, calculate their average duration and variance
     */
  var microtaskDuration = function( microtasks, callback ) {
    async.map( microtasks, getDurationByMT, function( err, executionDuration ) {
      var result = getAverageAndVariance( executionDuration );
      var microtaskStats = {
        'avgDuration': result[ 0 ],
        'varDuration': result[ 1 ]
      };
      callback( null, microtaskStats );
    } );
  }
  /*
    for a given list of microTasks, calculate the average number of executions and variance
     */
  var microtaskExecutions = function( microtasks, callback ) {
    async.map( microtasks, getExectuionsByMT, function( err, executionTimes ) {
      var result = getAverageAndVariance( executionTimes );
      var microtaskStats = {
        'avgExecutions': result[ 0 ],
        'varExecutions': result[ 1 ]
      };
      callback( null, microtaskStats );
    } );
  }
  /*
    for given list of executions, calculate total time, average duration and its variance
     */
  var getExecutionDetail = function( executions ) {
    var durationArray = [],
      result;
    _.each( executions, function( execution ) {
      if ( execution.status === 'CLOSED' ) {
        durationArray.push( ( execution.closedDate - execution.createdDate ) / SECOND );
      }
    } );
    result = getAverageAndVariance( durationArray );
    return {
      'duration': sumUpArray( durationArray ),
      'avgDuration': result[ 0 ],
      'varDuration': result[ 1 ]
    };
  }
  /*
    retrieve task basic information, including
      id
      name
      description
      start time
      end time
      and duration (if not end, equals to latest execution time minus start time)
     */
  var taskBasic = function( taskId, callback ) {
    Task
      .find( {
        '_id': taskId
      } )
      .exec( req.wrap( function( err, tasks ) {
        var task = tasks[ 0 ],
          resultCB = {};

        resultCB.id = taskId;
        resultCB.name = task.name;
        resultCB.description = task.description;
        resultCB.start = task.createdDate;
        resultCB.end = task.closedDate;
        //get the duration for task by getting the latest execution closedDate
        if ( task.status === 'CLOSED' ) {
          resultCB.duration = ( task.closedDate - task.createdDate ) / SECOND;
          callback( null, resultCB );
        } else {
          getLatestMicroTaskTime( taskId, function( err, time ) {
            resultCB.duration = ( time - task.createdDate ) / SECOND;
            callback( null, resultCB );
          } );
        }
      } ) );
  }
  /*
    for a task, retrieve its overall microTask stats, including
    #microTask
    #microTaskClosed
    average and variance of microTask executions(times)
    average and variance of microTask duration (time)
     */
  var microtaskStatsOfTask = function( taskId, callback ) {
    Microtask
      .find( {
        'task': taskId
      } )
      .exec( req.wrap( function( err, microtasks ) {
        var closedMicrotasks = 0,
          resultCB = {};
        _.each( microtasks, function( microtask ) {
          if ( microtask.status === 'CLOSED' ) {
            closedMicrotasks++;
          }
        } );
        resultCB.microtasks = microtasks.length;
        resultCB.closedMicrotasks = closedMicrotasks;
        async.parallel( [
          microtaskExecutions.bind( this, microtasks ),
          microtaskDuration.bind( this, microtasks )
        ], function( err, results ) {
          resultCB.microtask = combineObject( results );
          callback( null, resultCB );
        } );
      } ) );
  }
  /*
    for a task, retrieve its overall execution stats, including
    #executions
    #executionsClosed
    #executionsInvalid
    execution time (total, average, variance)
    -note that average and variance only consider the 'CLOSED' executions
     */
  var executionStatsOfTask = function( taskId, callback ) {
    Execution
      .find( {
        'task': taskId
      } )
      .exec( req.wrap( function( err, executions ) {
        var totalTime = 0,
          numberOfExecutionsDone = 0,
          invalidExecutions = 0,
          durationArray = new Array(),
          resultCB = {};
        tmp = numberOfExecutionsStatus( executions );

        resultCB.executions = tmp.executions;
        resultCB.closedExecutions = tmp.closedExecutions;
        resultCB.invalidExecutions = tmp.invalidExecutions;

        _.each( executions, function( execution ) {
          if ( execution.status === 'CLOSED' ) {
            durationArray.push( ( execution.closedDate - execution.createdDate ) / SECOND );
          };
        } );
        var result = getAverageAndVariance( durationArray );
        var executionStats = {
          'duration': sumUpArray( durationArray ),
          'avgDuration': result[ 0 ],
          'varDuration': result[ 1 ]
        };
        resultCB.execution = executionStats;
        callback( null, resultCB );
      } ) );
  }
  /*
    for a task, retrieve overall object stats, including
    #objects
    #objectsClosed
     */
  var objectStatsOfTask = function( taskId, callback ) {
    OBJECT
      .find( {
        'task': taskId
      } )
      .exec( req.wrap( function( err, objects ) {
        var closedObjects = 0,
          resultCB = {};

        _.each( objects, function( object ) {
          if ( object.status === 'CLOSED' ) {
            closedObjects++;
          };
        } );
        resultCB.objects = objects.length;
        resultCB.closedObjects = closedObjects;
        callback( null, resultCB );
      } ) );
  }
  /*
    for a microTask, retrieve performer stats, including
    average and variance of execution times
     */
  var performerStatsOfMT = function( Mid, callback ) {
    Execution
      .find( {
        'microtask': Mid
      } )
      .exec( req.wrap( function( err, executions ) {
        var performers = new Array(),
          aMicrotaskStats = new Array(),
          executionTimesArray = new Array();
        _.each( executions, function( execution ) {
          performers.push( execution.performer );
        } );
        //TODO: need check the duplication of performers array
        aMicrotaskStats.performers = performers.length;
        _.each( performers, function( Pid ) {
          var tmpExecution = getExecutionsByPerformer( Pid, executions );
          executionTimesArray.push( tmpExecution.length );
        } );
        var result = getAverageAndVariance( executionTimesArray );
        var performerStats = {};
        performerStats.avgExecutions = result[ 0 ];
        performerStats.varExecutions = result[ 1 ];
        aMicrotaskStats.performer = performerStats;
        callback( null, aMicrotaskStats );
      } ) );
  }
  /*
    for a task, retrieve overall performer stats, including
    average and variance of execution times
    average and variance of execution duration
     */
  var performerStatsOfTask = function( taskid, callback ) {
    Execution
      .find( {
        'task': taskid
      } )
      .exec( req.wrap( function( err, executions ) {
        var performers = [],
          executionTimesArray = [],
          durationArray = [],
          resultCB = {};

        _.each( executions, function( execution ) {
          performers.push( execution.performer.toString() );
        } );
        performers = _.uniq( performers );
        resultCB.performers = performers.length;

        _.each( performers, function( Pid ) {
          var totalDuration = 0,
            totalTime = 0,
            totalClosedExecutions = 0,
            duration,
            tmpExecutions = getExecutionsByPerformer( Pid, executions );

          _.each( tmpExecutions, function( tmpExecution ) {
            if ( tmpExecution.status === 'CLOSED' ) {
              duration = ( tmpExecution.closedDate - tmpExecution.createdDate ) / SECOND;
              durationArray.push( duration );
              totalClosedExecutions++;
            };
          } );
          executionTimesArray.push( tmpExecutions.length );
          totalTime += totalDuration;
        } );
        var result = getAverageAndVariance( executionTimesArray ),
          result2 = getAverageAndVariance( durationArray );

        var performerStats = {
          'avgExecutions': result[ 0 ],
          'varExecutions': result[ 1 ],
          'avgDuration': result2[ 0 ],
          'varDuration': result2[ 1 ]
        };
        resultCB.performer = performerStats;
        callback( null, resultCB );
      } ) );
  }
  /*
    for a microTask, retrieve executions stats, including
    #executions
    #executionsClosed
    #executionsInvalid
    total, average and variance of execution time
     */
  var executionStatsOfMT = function( Mid, callback ) {
    Execution
      .find( {
        'microtask': Mid
      } )
      .exec( req.wrap( function( err, executions ) {
        var aMicrotaskStats = {},
          result = [];
        result = numberOfExecutionsStatus( executions );
        aMicrotaskStats = {
          'executions': result.executions,
          'closedExecutions': result.closedExecutions,
          'invalidExecutions': result.invalidExecutions
        };
        aMicrotaskStats.execution = getExecutionDetail( executions );
        callback( null, aMicrotaskStats );
      } ) );
  }
  /*
    for a microTask, retrieve basic information, including
    id
    star time
    end time
    duration (if not closed, equals to latest execution time minus start time)
    #objects
    #objectsClosed
     */
  var microtaskBasicEach = function( microtaskId, callback ) {
    Microtask
      .find( {
        '_id': microtaskId
      } )
      .exec( req.wrap( function( err, microtasks ) {
        var microtask = microtasks[ 0 ],
          aMicrotaskStats = {};
        aMicrotaskStats.id = microtaskId;
        aMicrotaskStats.start = microtask.createdDate;
        aMicrotaskStats.end = microtask.closedDate;
        aMicrotaskStats.objects = microtask.objects.length;
        async.parallel( [

            function( otherCallback ) {
              async.map( microtask.objects, isObjectClosed, function( err, results ) {
                aMicrotaskStats.closedObjects = sumUpArray( results );
                otherCallback( null );
              } );
            },
            function( otherCallback ) {
              getDurationByMT( microtask, function( err, duration ) {
                aMicrotaskStats.duration = duration;
                otherCallback();
              } );
            }
          ],
          function() {
            callback( null, aMicrotaskStats );
          } );
      } ) );
  }
  /*
    for a task, retrieve each microTask detail stats
     */
  var microtaskList = function( taskId, callback ) {
    Task
      .find( {
        '_id': taskId
      } )
      .exec( req.wrap( function( err, tasks ) {
        var microtasksArray = tasks[ 0 ][ 'microtasks' ];
        async.map( microtasksArray, getEachMicrotaskDetail, function( err, results ) {
          var resultCB = {};
          resultCB.microtaskStats = results;
          callback( null, resultCB );
        } );
      } ) );
  }
  var getEachMicrotaskDetail = function( microtaskId, callback ) {
    async.parallel( [
      microtaskBasicEach.bind( this, microtaskId ),
      executionStatsOfMT.bind( this, microtaskId ),
      performerStatsOfMT.bind( this, microtaskId )
    ], function( err, results ) {
      var microtaskStats = combineObject( results );
      callback( null, microtaskStats );
    } );
  }
  /*
    for a task, retrieve each perform detail stats
     */
  var performerList = function( taskId, callback ) {
    Execution
      .distinct( 'performer', {
        'task': taskId
      } )
      .exec( req.wrap( function( err, performers ) {
        async.map( performers, getEachPerformerDetail( taskId ), function( err, results ) {
          var resultCB = {};
          resultCB.performerStats = results;
          callback( null, resultCB );
        } );
      } ) );
  }
  var getEachPerformerDetail = function( taskId ) {
    return function( Pid, callback ) {
      Execution
        .find( {
          'task': taskId,
          'performer': Pid
        } )
        .exec( req.wrap( function( err, executions ) {
          var performerStats = {},
            durationArray = [],
            keys = [],
            values = [],
            microtasks = {},
            executionsStatus = numberOfExecutionsStatus( executions );

          _.each( executions, function( execution ) {
            if ( execution.status === 'CLOSED' ) {
              durationArray.push( ( execution.closedDate - execution.createdDate ) / SECOND );
              var Mid = execution.microtask.toString();
              if ( Mid in microtasks ) {
                microtasks[ Mid ]++;
              } else {
                microtasks[ Mid ] = 1;
              }
            }
          } );
          for ( var key in microtasks ) {
            keys.push( key );
            values.push( microtasks[ key ] );
          }
          var result = getAverageAndVariance( values );
          var microtaskStats = {
            'avgExecutions': result[ 0 ],
            'varExecutions': result[ 1 ]
          };
          result = getAverageAndVariance( durationArray );

          performerStats.id = Pid;
          performerStats.executions = executionsStatus.executions;
          performerStats.closedExecutions = executionsStatus.closedExecutions;
          performerStats.invalidExecutions = executionsStatus.invalidExecutions;
          performerStats.avgDuration = result[ 0 ];
          performerStats.varDuration = result[ 1 ];
          performerStats.microtasks = keys.length;
          performerStats.microtask = microtaskStats;

          callback( null, performerStats );
        } ) );
    }
  }
  var getPlaftform = function( Plid, callback ) {
    Platform
      .find( {
        '_id': Plid
      }, {
        'enabled': 1,
        'execution': 1,
        'invitation': 1
      } )
      .exec( req.wrap( function( err, platforms ) {
        callback( null, platforms[ 0 ] );
      } ) );
  }
  /*
    for a task, retrieve overall platform stats, including
    #enalbedPlatforms
    #executionPlatforms
    #invitationPlatforms
     */
  var platformStatsOfTask = function( taskId, callback ) {
    Task
      .find( {
        '_id': taskId
      } )
      .exec( req.wrap( function( err, tasks ) {
        var Plids = tasks[ 0 ].platforms;

        async.map( Plids, getPlaftform, function( err, platforms ) {
          var result = {},
            enabledPlatforms = 0,
            executionPlatforms = 0,
            invitationPlatforms = 0;
          _.each( platforms, function( platform ) {
            if ( platform.enabled ) {
              enabledPlatforms++;
            }
            if ( platform.execution ) {
              executionPlatforms++;
            }
            if ( platform.invitation ) {
              invitationPlatforms++;
            }
          } );
          result = {
            'platforms': enabledPlatforms,
            'executionPlatforms': executionPlatforms,
            'invitationPlatforms': invitationPlatforms
          };
          callback( null, result );
        } );
      } ) );
  }
  /*
    for a task, retrieve each platform detail stats
     */
  var platformList = function( taskId, callback ) {
    Execution
      .distinct( 'platform', {
        'task': taskId
      } )
      .exec( req.wrap( function( err, platforms ) {
        async.map( platforms, getEachPlatformDetail( taskId ), function( err, results ) {
          var resultCB = {};
          resultCB.platformStats = results;
          callback( null, resultCB );
        } );
      } ) );
  }
  var getEachPlatformDetail = function( Tid ) {
    return function( Plid, callback ) {
      Execution
        .find( {
          'task': Tid,
          'platform': Plid
        } )
        .exec( req.wrap( function( err, executions ) {
          var performers = {},
            durationArray = [],
            keys = [],
            values = [],
            platformStats = {},
            executionsStatus = numberOfExecutionsStatus( executions );

          _.each( executions, function( execution ) {
            var Pid = execution.performer.toString();
            if ( execution.status === 'CLOSED' ) {
              var duration = ( execution.closedDate - execution.createdDate ) / SECOND;
              durationArray.push( duration );
            }
            if ( Pid in performers ) {
              performers[ Pid ]++;
            } else {
              performers[ Pid ] = 1;
            }
          } );
          for ( key in performers ) {
            keys.push( key );
            values.push( performers[ key ] );
          }
          var resultExecutions = getAverageAndVariance( values );
          var resultDuration = getAverageAndVariance( durationArray );
          platformStats.id = Plid;
          platformStats.executions = executionsStatus.executions;
          platformStats.closedExecutions = executionsStatus.closedExecutions;
          platformStats.invalidExecutions = executionsStatus.invalidExecutions;
          platformStats.performers = keys.length;
          platformStats.performer = {
            'avgExecutions': resultExecutions[ 0 ],
            'varExecutions': resultExecutions[ 1 ]
          };
          platformStats.execution = getExecutionDetail( executions );
          callback( null, platformStats );
        } ) );
    }
  }

  /*
    Data for visualization
     */
  var getExecutionRawData = function( Tid, callback ) {
    Execution
      .find( {
        'task': Tid
      } )
      .exec( req.wrap( function( err, executions ) {
        var result = new Array(),
          performers = new Array();
        _.each( executions, function( execution ) {
          var tuple = {},
            Pid;
          tuple.endDate = execution.closedDate;
          tuple.startDate = execution.createdDate;
          Pid = getPerformerId( execution );
          tuple.taskName = Pid;
          if ( !( _.contains( performers, Pid ) ) ) {
            performers.push( Pid );
          }
          if ( execution.status === 'CLOSED' ) {
            tuple.status = 'CLOSED';
          } else if ( execution.status === 'INVALID' ) {
            tuple.status = 'INVALID';
          } else if ( execution.status === 'CREATED' ) {
            tuple.status = 'CREATED';
          }
          result.push( tuple );
        } );
        var results = {
          'executions': result,
          'performers': performers
        };
        callback( null, results );
      } ) );
  }

  var getExecutions = function( Tid, callback ) {
    Execution
      .find( {
        'task': Tid
      }, {
        '_id': 1,
        'createdDate': 1,
        'closedDate': 1
      } )
      .sort( {
        'createdDate': 1
      } )
      .exec( req.wrap( function( err, executions ) {
        var results = {
          'executions': executions
        };
        callback( null, results );
      } ) );
  }

  /*---Entry point ---*/
  var time = new Date(),
    SECOND = 1000,
    tasksArray = [
      taskBasic.bind( this, filter.task ),
      objectStatsOfTask.bind( this, filter.task ),
      microtaskStatsOfTask.bind( this, filter.task ),
      executionStatsOfTask.bind( this, filter.task ),
      performerStatsOfTask.bind( this, filter.task ),
      platformStatsOfTask.bind( this, filter.task ),

      microtaskList.bind( this, filter.task ),
      performerList.bind( this, filter.task ),
      platformList.bind( this, filter.task ),
    ];
  async.parallel( tasksArray, function( err, results ) {
    var taskJSON = {};
    taskJSON = combineObject( results );
    log.trace( 'Done with stats calculation.' );
    console.log( 'Time costs--------->', ( new Date() - time ) );
    return res.json( taskJSON );
  } );

};

// Export the API object
exports = module.exports = API;