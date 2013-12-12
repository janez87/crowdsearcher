$.getJSON( baseUrl + 'api/task/529c6a7be3d5ffde0300005e/stats' )
  .done( function( data ) {

    console.log( data );
    return;

    //data for drawing donut chart
    var microtasks = data.raw.microtasks,
      executions = data.raw.executions,
      objects = data.raw.objects,
      task = data.raw.task;

    var executionDonut = {},
      microtaskDonut = {},
      objectDonut = {},
      performerDonut = {};

    var result = [],
      statusLabels = [],
      statsData = [],
      performersId = [];

    _.each( executions, function( execution ) {
      performersId.push( execution.performer );
    } );
    performersId = _.uniq( performersId );
    performerDonut = {
      "label": "Performer",
      "total": performersId.length,
      "pct": [ 2, 1 ],
      "status": [ "VALID", "INVALID" ]
    };
    /*
  Execution donut
   */
    result = _.groupBy( executions, "status" );
    for ( key in result ) {
      statusLabels.push( key );
      statsData.push( result[ key ].length );
    }
    executionDonut = {
      "label": "Executions",
      "pct": statsData,
      "total": executions.length,
      "status": statusLabels
    };
    /*
  Microtask donut
   */
    statsData = [];
    statusLabels = [];
    result = _.groupBy( microtasks, "status" );
    for ( key in result ) {
      statusLabels.push( key );
      statsData.push( result[ key ].length );
    }
    microtaskDonut = {
      "label": "Microtasks",
      "pct": statsData,
      "total": microtasks.length,
      "status": statusLabels
    };
    /*
  Object donut
   */
    statsData = [];
    statusLabels = [];
    result = _.groupBy( objects, "status" );
    for ( key in result ) {
      statusLabels.push( key );
      statsData.push( result[ key ].length );
    }
    objectDonut = {
      "label": "Objects",
      "pct": statsData,
      "total": objects.length,
      "status": statusLabels
    };

    donutChart( executionDonut.pct, executionDonut.label, executionDonut.status );
    donutChart( microtaskDonut.pct, microtaskDonut.label, microtaskDonut.status );
    donutChart( objectDonut.pct, objectDonut.label, objectDonut.status );
    donutChart( performerDonut.pct, performerDonut.label, performerDonut.status );

    /*
  Gantt chart
   */
    //TODO: need consider time format for different cases
    var tasks = [],
      taskNames = performersId,
      format = "%H:%M",
      taskStatus = {
        "INVALID": "bar-failed",
        "CLOSED": "bar-succeeded",
      };
    _.each( executions, function( execution ) {
      //only collect useful data for drawing, take care of unclosed execution
      var tmp = {};
      tmp.startDate = new Date( execution.createdDate );
      if ( execution.closedDate === null ) {
        execution.closedDate = execution.createdDate;
      };
      tmp.endDate = new Date( execution.closedDate );
      tmp.taskName = execution.performer;
      tmp.status = execution.status;
      tasks.push( tmp );
    } );
    var gantt = ganttChart().taskTypes( taskNames ).taskStatus( taskStatus ).tickFormat( format ).startDate( new Date( task.createdDate ) ).width( 900 ).height( 300 ).timeDomainMode( "fit" );
    console.log( gantt );
    gantt( tasks );

    /*
  Line chart
   */
    var executionLine = [];
    _.each( executions, function( execution ) {
      if ( execution.closedDate !== null ) {
        var tmp = [];
        tmp[ 0 ] = new Date( execution.createdDate );
        tmp[ 1 ] = new Date( execution.closedDate );
        executionLine.push( tmp );
      };
    } );
    var getActiveExecutionsDateSet = function( executions ) {

      var addTime = function( date, time ) {
        return new Date( date.getTime() + time );
      };
      var getMaxTime = function( array ) {
        array.sort( function( a, b ) {
          return a[ 1 ] - b[ 1 ];
        } );
        return array[ array.length - 1 ][ 1 ];
      };
      var getMinTime = function( array ) {
        array.sort( function( a, b ) {
          return a[ 0 ] - b[ 0 ];
        } );
        return array[ 0 ][ 0 ];
      };
      //sample frequency
      var FREQUENCE = 10,
        SECOND = 1000,
        minTime = getMinTime( executions ),
        maxTime = getMaxTime( executions );
      timeInterval = ( maxTime - minTime ) / FREQUENCE;
      var timeArray = [],
        timeStamp = [];
      for ( var i = 0; i <= FREQUENCE; i++ ) {
        var tmpTime = addTime( minTime, timeInterval * i );
        timeArray.push( tmpTime );
        timeStamp.push( addTime( tmpTime, timeInterval / 2 ) );
      }
      //remove the last element
      timeStamp.pop();
      var findIntersectedRanges = function( range, executions ) {
        var result = 0;
        executions.forEach( function( execution ) {
          if ( !( range[ 0 ] >= execution[ 1 ] || range[ 1 ] <= execution[ 0 ] ) ) {
            result++;
          }
        } );
        return result;
      }
      var getMaxValue = function( array ) {
        var max = 0;
        array.forEach( function( value ) {
          if ( value > max ) {
            max = value;
          }
        } );
        return max;
      }
      var activeExecution = [];
      for ( var i = 0; i < timeArray.length - 1; i++ ) {
        var range = [ timeArray[ i ], timeArray[ i + 1 ] ];
        var count = findIntersectedRanges( range, executions );
        activeExecution.push( count );
      };
      var maxActive = getMaxValue( activeExecution );
      var data = [];
      for ( var i = 0; i < timeStamp.length; i++ ) {
        var result = {
          "time": timeStamp[ i ],
          "count": activeExecution[ i ]
        }
        data.push( result );
      }
      return data;
    }
    var activeExecutions = getActiveExecutionsDateSet( executionLine );
    lineChart( activeExecutions, "Active execution vs Time" );

    var objectLine = [];
    _.each( objects, function( object ) {
      if ( object.status === "CLOSED" ) {
        var tmp = [];
        tmp[ 0 ] = new Date( object.createdDate );
        tmp[ 1 ] = new Date( object.closedDate );
        objectLine.push( tmp );
      };
    } );
    var getClosedObjects = function( objects ) {
      var count = 0,
        result = [];
      objects.sort( function( a, b ) {
        return a[ 1 ] - b[ 1 ]
      } );
      _.each( objects, function( object ) {
        var tuple = {
          "time": new Date( object[ 1 ] ),
          "count": ++count
        }
        result.push( tuple );
      } );
      return result;
    };
    var closedObjects = getClosedObjects( objectLine );
    lineChart( closedObjects, "Active objects vs Time" );
    /*
  Stacked-bar chart
   */
    var data = [];
    for ( var i = 0; i < 10; i++ ) {
      var id = Math.floor( Math.random() * 100000 );
      var correct = Math.floor( Math.random() * 40 );
      var wrong = Math.floor( Math.random() * 10 );
      var invalid = Math.floor( Math.random() * 5 );
      var total = correct + wrong + invalid;
      var result = {
        "id": id,
        "correct": correct,
        "wrong": wrong,
        "invalid": invalid,
        "total": total
      };
      data.push( result );
    }
    data.sort( function( a, b ) {
      return b.total - a.total;
    } );

    StackedBarChart( data );
  } );