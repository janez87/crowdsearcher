/* global stats, Highcharts */
function toUTC( dateString ) {
  var date = new Date( dateString );

  return -date.getTimezoneOffset() * 60000 + Date.UTC( date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds() );

}

var colors = {
  'CLOSED': '#5cb85c',
  'INVALID': '#d9534f',
  'CREATED': '#5bc0de',
  'ACTIVE': 'lightgray'
};

function drawPerformers( performers ) {
  var ids = $.map( performers, function( p ) {
    return p.id;
  } );

  var created = $.map( performers, function( p ) {
    return p.executions - p.invalidExecutions - p.closedExecutions;
  } );
  var closed = $.map( performers, function( p ) {
    return p.closedExecutions;
  } );
  var invalid = $.map( performers, function( p ) {
    return p.invalidExecutions;
  } );
  $( '#performers' ).highcharts( {
    chart: {
      type: 'column'
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'Top 15 performers'
    },
    xAxis: {
      categories: ids,
      labels: {
        overflow: 'justify',
        //rotation: -90,
        formatter: function() {
          return '<span title="' + this.value + '">' + this.value.slice( 0, 10 ) + '...</span>';
        }
      }
    },
    yAxis: {
      min: 0,
      title: {
        text: 'Total number of executions'
      },
      stackLabels: {
        enabled: true,
        style: {
          fontWeight: 'bold',
          color: 'black',
          textShadow: '0px 1px 2px lightgray',
        }
      }
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        dataLabels: {
          enabled: true,
          formatter: function() {
            return ( this.y > 0 ) ? this.y : '';
          },
          style: {
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0px 1px 2px black',
          }
        }
      }
    },
    series: [ {
      name: 'Created',
      data: created,
      color: colors[ 'CREATED' ]
    }, {
      name: 'Closed',
      data: closed,
      color: colors[ 'CLOSED' ]
    }, {
      name: 'Invalid',
      data: invalid,
      color: colors[ 'INVALID' ]
    } ]
  } );
}

function drawActiveVsClosed( activeExecutions, closedObjects ) {

  var startExecutionColor = Highcharts.getOptions().colors[ 0 ];
  var endExecutionColor = Highcharts.Color( startExecutionColor ).setOpacity( 0 ).get( 'rgba' );

  var startObjectsColor = colors[ 'CLOSED' ];
  var endObjectsColor = Highcharts.Color( startObjectsColor ).setOpacity( 0 ).get( 'rgba' );

  $( '#executions' ).highcharts( {
    chart: {
      zoomType: 'x'
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'Active executions and closed objects'
    },
    xAxis: {
      type: 'datetime',
      min: toUTC( stats.start ),
      //max: toUTC( stats.end ),
      plotLines: [ {
        //value: toUTC( stats.end ),
        color: 'red',
        width: 2,
        label: {
          text: 'Closed date',
          style: {
            color: 'black'
          }
        }
      }, {
        value: toUTC( stats.start ),
        color: 'green',
        width: 2,
        label: {
          text: 'Open date',
          style: {
            color: 'black'
          }
        }
      } ]
    },
    yAxis: [ {
      title: {
        text: 'Active executions (#)'
      },
      minTickInterval: 1,
      min: 0
    }, {
      title: {
        text: 'Closed objects (#)'
      },
      //tickInterval: 1,
      opposite: true,
      gridLineWidth: 0,
      min: 0
    } ],
    series: [ {
      name: 'Active executions',
      data: activeExecutions,
      type: 'area',
      fillColor: {
        linearGradient: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 1
        },
        stops: [
          [ 0, startExecutionColor ],
          [ 1, endExecutionColor ]
        ]
      },
      marker: {
        enabled: false
      },
      zIndex: 1,
      yAxis: 0
    }, {
      name: 'Closed objects',
      data: closedObjects,
      type: 'area',
      marker: {
        enabled: false
      },
      color: colors[ 'CLOSED' ],
      zIndex: 0,
      yAxis: 1,
      fillColor: {
        linearGradient: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 1
        },
        stops: [
          [ 0, startObjectsColor ],
          [ 1, endObjectsColor ]
        ]
      },
    } ]
  } );
}


var drawPieChart = function( label, sample, status, selector ) {
  var total = 0;
  var data = [];
  for ( var i = 0; i < status.length; i++ ) {
    if ( sample[ i ] > 0 ) {
      total += sample[ i ];
      data.push( {
        name: status[ i ],
        y: sample[ i ],
        color: colors[ status[ i ] ]
      } );
    }
  }

  $( selector ).highcharts( {
    credits: {
      enabled: false
    },
    chart: {
      height: 250,
      spacing: [ 0, 0, 0, 0 ]
    },
    title: {
      text: label,
    },
    subtitle: {
      text: total,
      verticalAlign: 'middle',
      floating: true,
      y: 50,
      style: {
        fontWeight: 'bold',
        fontSize: '20px'
      }
    },
    plotOptions: {
      pie: {
        //allowPointSelect: true,
        dataLabels: {
          distance: -18,
          formatter: function() {
            return this.y;
          },
          style: {
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0px 1px 2px black',
          }
        },
        startAngle: -90,
        endAngle: 90,
        center: [ '50%', '72%' ]
      }
    },
    series: [ {
      type: 'pie',
      name: label,
      innerSize: '70%',
      data: data
    } ]
  } );
};



function drawAvgDistribution( config, selector ) {
  var rawData = config.data;
  var property = config.property;
  var average = config.average;
  var variance = config.variance;
  var title = config.title;

  if( !average ) return;

  var xLabel = config.xLabel;
  var xUnit = config.xUnit;
  var yLabel = config.yLabel;
  var yUnit = config.yUnit;

  var groups = config.groups || 10;
  var std = Math.sqrt( variance );

  var data = $.map( rawData, function( value ) {
    return value[ property ];
  } );

  var min = Math.min.apply( Math, data );
  var max = Math.max.apply( Math, data ) + 1;
  var step = ( max - min ) / groups;

  var values = [];
  for ( var i = 0; i < groups; i++ )
    values.push( 0 );

  $.each( data, function( i, duration ) {
    duration = duration - min;
    var index = Math.floor( duration / step );
    values[ index ]++;
  } );

  values = $.map( values, function( value, i ) {
    var y = value / data.length;
    var x = min + i * step + step / 2;
    return {
      x: x,
      y: y
    };
  } );

  $( selector ).highcharts( {
    chart: {
      inverted: true
    },
    credits: {
      enabled: false
    },
    plotOptions: {
      column: {
        pointWidth: 20
      }
    },
    xAxis: {
      min: min,
      max: max,
      labels: {
        rotation: 90,
        align: 'center',
        x: -15
      },
      title: {
        text: xLabel + ' (' + xUnit + ')',
        rotation: 90,
        x: -20
      },
      plotLines: [ {
        value: average,
        color: 'red',
        width: 2,
        label: {
          text: average.toFixed( 3 ) + xUnit,
          align: 'right'
        },
        zIndex: 4,
      } ],
      plotBands: [ {
        from: average - std / 2,
        to: average + std / 2,
        color: '#f9f2f4',
        //zIndex: 8
      } ]
    },
    yAxis: {
      min: 0,
      tickInterval: 0.25,
      max: 1,
      title: {
        text: yLabel + ' (' + yUnit + ')',
      }
    },
    title: {
      text: title,
    },
    tooltip: {
      shared: true,
      crosshairs: {
        width: 1,
        color: 'gray',
        dashStyle: 'shortdot'
      },
      formatter: function() {
        var s = '<b>' + xLabel + ': ' + this.x.toFixed( 0 ) + xUnit + '</b>';

        var point = this.points[ 0 ];
        s += '<br/>' + yLabel + ': ' + point.y.toFixed( 2 ) + yUnit;

        return s;
      },
    },
    subtitle: {
      text: '&#956;: ' + average.toFixed( 3 ) + xUnit + ' &#963;: ' + std.toFixed( 3 ) + xUnit,
      useHTML: true
    },
    legend: {
      enabled: false
    },
    series: [ {
      type: 'column',
      color: 'lightgray',
      data: values
    }, {
      type: 'spline',
      //color: 'lightgray',
      data: values
    } ]
  } );

}

var drawExecutionInfo = function() {
  var config = {
    average: stats.execution.avgDuration,
    variance: stats.execution.varDuration,
    data: stats.raw.executions,
    property: 'duration',
    title: 'Execution duration',
    xLabel: 'Duration',
    xUnit: 's',
    yLabel: 'Executions',
    yUnit: '%'
  };

  var selector = '#executionInfo';

  drawAvgDistribution( config, selector );
};

var drawMicrotaskInfo = function() {
  var config = {
    average: stats.microtask.avgDuration,
    variance: stats.microtask.varDuration,
    data: stats.microtaskStats,
    property: 'duration',
    title: 'Microtask duration',
    xLabel: 'Duration',
    xUnit: 's',
    yLabel: 'Microtasks',
    yUnit: '%'
  };

  console.log( 'Microtask duration',config );

  var selector = '#microtaskDuration';

  drawAvgDistribution( config, selector );


  var config1 = {
    average: stats.microtask.avgExecutions,
    variance: stats.microtask.varExecutions,
    data: stats.microtaskStats,
    property: 'executions',
    title: 'Microtask executions',
    xLabel: 'Execution',
    xUnit: '',
    yLabel: 'Microtasks',
    yUnit: '%'
  };

  console.log( 'Microtask executions',config1 );

  drawAvgDistribution( config1, '#microtaskExecutions' );
};

var drawPerformerInfo = function() {
  var config = {
    average: stats.performer.avgDuration,
    variance: stats.performer.varDuration,
    data: stats.performerStats,
    property: 'avgDuration',
    title: 'Performer duration',
    xLabel: 'Duration',
    xUnit: 's',
    yLabel: 'Performer',
    yUnit: '%'
  };
  console.log( 'Performer duration',config );

  var selector = '#performerDuration';

  drawAvgDistribution( config, selector );


  var config1 = {
    average: stats.performer.avgExecutions,
    variance: stats.performer.varExecutions,
    data: stats.performerStats,
    property: 'executions',
    title: 'Performer executions',
    xLabel: 'Execution',
    xUnit: '',
    yLabel: 'Performer',
    yUnit: '%'
  };
  console.log( 'Performer executions',config1 );

  drawAvgDistribution( config1, '#performerExecutions' );
};





// #############
// ENTRY POINT


var val;

// #############
// DONUTS
var executions = stats.executions;
var closedExecutions = stats.closedExecutions;
var invalidExecutions = stats.invalidExecutions;
var createdExecutions = executions - closedExecutions - invalidExecutions;
var executionStatuses = [ 'CREATED', 'CLOSED', 'INVALID' ];
drawPieChart( 'Executions', [ createdExecutions, closedExecutions, invalidExecutions ], executionStatuses, '#donut-executions' );

var objects = stats.objects;
var closedObjects = stats.closedObjects;
var createdObjects = objects - closedObjects;
var objectStatuses = [ 'CREATED', 'CLOSED' ];

drawPieChart( 'Objects', [ createdObjects, closedObjects ], objectStatuses, '#donut-objects' );

var microtasks = stats.microtasks;
var closedMicrotasks = stats.closedMicrotasks;
var createdMicrotasks = microtasks - closedMicrotasks;
var microtaskStatuses = [ 'CREATED', 'CLOSED' ];

drawPieChart( 'Microtasks', [ createdMicrotasks, closedMicrotasks ], microtaskStatuses, '#donut-microtasks' );

var execList = stats.raw.executions;
var entityObject = stats.raw.entity;
var performers = stats.performers;

drawPieChart( 'Performers', [ performers ], [ 'ACTIVE' ], '#donut-performers' );




var execList = stats.raw.executions;
var activeExecutions = [];
var closedObjectList = [];


// #############
// EXECUTIONS
val = 0;
$.each( execList, function() {
  var exec = this;
  //console.log( exec.createdDate );
  activeExecutions.push( {
    date: toUTC( exec.createdDate ),
    value: 1,
    perf: exec.performer
  } );

  if ( exec.status !== 'CREATED' ) {
    activeExecutions.push( {
      date: toUTC( exec.closedDate || exec.invalidDate ),
      value: -1,
      perf: exec.performer
    } );
  }

} );

activeExecutions.sort( function( a, b ) {
  return a.date - b.date;
} );
activeExecutions = $.map( activeExecutions, function( exec ) {
  val += exec.value;

  return {
    x: exec.date,
    y: val
  };
} );

// #############
// OBJECTS
val = 0;
closedObjectList = $.map( entityObject.objects, function( object ) {
  if ( object.status === 'CLOSED' ) {
    return {
      x: toUTC( object.closedDate )
    };
  }
  return undefined;
} );

closedObjectList.sort( function( a, b ) {
  return a.x - b.x;
} );
closedObjectList = $.map( closedObjectList, function( object, i ) {
  object.y = i + 1;
  return object;
} );

drawActiveVsClosed( activeExecutions, closedObjectList );



// #############
// PERFORMERS
if( stats.performerStats ) {
  val = 0;
  // Sort performers
  var performers = stats.performerStats;
  performers.sort( function( a, b ) {
    return a.executions - b.executions;
  } ).reverse();
  var topPerformers = performers.slice( 0, 15 );

  drawPerformers( topPerformers );
}
// #############
// INFO

if( stats.execution ) drawExecutionInfo( stats.execution );
if( stats.microtask ) drawMicrotaskInfo( stats.microtask );
if( stats.performer ) drawPerformerInfo( stats.performer );