'use strict';
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

// DONUTS
function drawPieChart( label, sample, status, selector ) {
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
}
function drawDonuts() {
  var executions = stats.executionStats;
  var closedExecutions = executions.closed;
  var createdExecutions = executions.open;
  var invalidExecutions = executions.total - closedExecutions - createdExecutions;
  var executionStatuses = [ 'CREATED', 'CLOSED', 'INVALID' ];
  drawPieChart( 'Executions', [ createdExecutions, closedExecutions, invalidExecutions ], executionStatuses, '#donut-executions' );


  var objects = stats.objectStats;
  if( objects ) {
    var closedObjects = objects.closed;
    var createdObjects = objects.total - closedObjects;
    var objectStatuses = [ 'CREATED', 'CLOSED' ];
    drawPieChart( 'Objects', [ createdObjects, closedObjects ], objectStatuses, '#donut-objects' );
  }

  var microtasks = stats.microtaskStats;
  if( microtasks ) {
    var closedMicrotasks = microtasks.closed;
    var createdMicrotasks = microtasks.total - closedMicrotasks;
    var microtaskStatuses = [ 'CREATED', 'CLOSED' ];
    drawPieChart( 'Microtasks', [ createdMicrotasks, closedMicrotasks ], microtaskStatuses, '#donut-microtasks' );
  }

  var performers = stats.performerStats;
  if( performers ) {
    drawPieChart( 'Performers', [ performers.total ], [ 'ACTIVE' ], '#donut-performers' );
  }
}
// Performers
function drawTopPerformers( performers, limit ) {
  limit = limit || 15;
  // Extract info
  var ids = performers.map( function( p ) { return p._id; } );
  var closed = performers.map( function( p ) { return p.closed; } );
  var invalid = performers.map( function( p ) { return p.invalid; } );
  var created = performers.map( function( p ) { return p.created; } );

  $( '#performers' ).highcharts( {
    chart: {
      type: 'column'
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'Top '+limit+' performers'
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
// Active execution
function drawActiveExecutions( start, executions ) {

  var startExecutionColor = Highcharts.getOptions().colors[ 0 ];
  var endExecutionColor = Highcharts.Color( startExecutionColor ).setOpacity( 0 ).get( 'rgba' );

  start = toUTC( start );

  $( '#executions' ).highcharts( {
    chart: {
      zoomType: 'x'
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'Active executions'
    },
    xAxis: {
      type: 'datetime',
      min: start,
      plotLines: [
        {
          value: start,
          color: 'green',
          width: 2,
          label: {
            text: 'Open date',
            style: {
              color: 'black'
            }
          }
        }
      ]
    },
    yAxis: {
      title: {
        text: 'Active executions (#)'
      },
      minTickInterval: 1,
      min: 0
    },
    series: [{
      name: 'Active executions',
      data: executions,
      turboThreshold: 0,
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
    }],
  } );
}
// asdasdasd
function drawAvgDistribution( config, selector ) {
  var rawData = config.data;
  var average = config.average;
  var variance = config.variance;
  var title = config.title;

  var xLabel = config.xLabel;
  var xUnit = config.xUnit;
  var yLabel = config.yLabel;
  var yUnit = config.yUnit;

  var groups = config.groups || 10;
  var std = Math.sqrt( variance );

  var data = rawData;

  var min = Math.min.apply( Math, data );
  var max = Math.max.apply( Math, data ) + 1;
  var step = ( max - min ) / groups;


  var values = [];
  var plotBands = [];
  var plotLines = [];
  var subtitle = '---';
  if( average ) {
    for( var i = 0; i < groups; i++ ) {
      values.push( 0 );
    }

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

    plotBands = [ {
      from: average - std / 2,
      to: average + std / 2,
      color: '#f9f2f4',
      //zIndex: 8
    } ];

    plotLines = [ {
      value: average,
      color: 'red',
      width: 2,
      label: {
        text: average.toFixed( 3 ) + xUnit,
        align: 'right'
      },
      zIndex: 4,
    } ];
    subtitle = '&#956;: ' + average.toFixed( 3 ) + xUnit + ' &#963;: ' + std.toFixed( 3 ) + xUnit;
  }


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
      plotLines: plotLines,
      plotBands: plotBands
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
      text: subtitle,
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
function drawExecutionInfo( avg, std, data ) {
  var config = {
    average: avg,
    variance: Math.pow( std, 2 ),
    data: data,
    property: 'duration',
    title: 'Execution duration',
    xLabel: 'Duration',
    xUnit: 's',
    yLabel: 'Executions',
    yUnit: '%'
  };
  drawAvgDistribution( config, '#executionInfo' );
}
function drawPerformerInfo( avg, std, data ) {
  var config = {
    average: avg,
    variance: Math.pow( std, 2 ),
    data: data,
    property: 'avgDuration',
    title: 'Performer duration',
    xLabel: 'Duration',
    xUnit: 's',
    yLabel: 'Performer',
    yUnit: '%'
  };
  drawAvgDistribution( config, '#performerDuration' );
}
function drawPerformerNumberInfo( avg, std, data ) {
  var config = {
    average: avg,
    variance: Math.pow( std, 2 ),
    data: data,
    property: 'executions',
    title: 'Performer executions',
    xLabel: 'Execution',
    xUnit: '#',
    yLabel: 'Performer',
    yUnit: '%'
  };
  drawAvgDistribution( config, '#performerExecutions' );
}
function drawMicrotaskInfo( avg, std, data ) {
  var config = {
    average: avg,
    variance: Math.pow( std, 2 ),
    data: data,
    property: 'duration',
    title: 'Microtask duration',
    xLabel: 'Duration',
    xUnit: 's',
    yLabel: 'Microtasks',
    yUnit: '%'
  };
  drawAvgDistribution( config, '#microtaskDuration' );
}


function drawInfo() {
  var executionStats = stats.executionStats;
  if( executionStats ) {
    drawExecutionInfo( executionStats.avg, executionStats.std, executionStats.durations );
  }

  var performerStats = stats.performerStats;
  if( performerStats ) {
    drawPerformerInfo( performerStats.avg, performerStats.std, performerStats.durations );
  }

  var performerExecutions = stats.performerExecutions;
  if( performerExecutions ) {
    drawPerformerNumberInfo( performerExecutions.avg, performerExecutions.std, performerExecutions.data );
  }

  var microtaskStats = stats.microtaskStats;
  if( microtaskStats ) {
    drawMicrotaskInfo( microtaskStats.avg, microtaskStats.std, microtaskStats.durations );
  }
}


// Entry point
drawDonuts();
drawTopPerformers( stats.topPerformers, 15 );
drawActiveExecutions( stats.start, stats.activeExecutions, stats.closedObjects );
drawInfo();