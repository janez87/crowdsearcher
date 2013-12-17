/* globals d3, baseUrl, _ */
var parts = location.pathname.split( '/' );
var taskId = parts[ parts.length - 2 ];

var drawPieChart = function( label, sample, status ) {

  var colors = {
    'CLOSED': '#d9534f',
    'INVALID': '#f0ad4e',
    'CREATED': '#5bc0de'
  };

  var data = [];
  for ( var i = 0; i < status.length; i++ ) {
    if ( sample[ i ] > 0 ) {
      data.push( {
        name: status[ i ],
        y: sample[ i ],
        color: colors[ status[ i ] ]
      } );
    }
  }

  data = data.sort( function( a, b ) {
    return a[ 0 ] - b[ 0 ];
  } );


  $( '<div class="donutChart" id="' + label.toLowerCase() + '_donut" >' ).appendTo( '#graphs' )
    .highcharts( {
      exporting: {
        enabled: false
      },
      credits: {
        enabled: false
      },
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: 0,
        plotShadow: false,
        width: 300,
        height: 250,
        spacing: [ 0, 0, 0, 0 ]
      },
      title: {
        text: label,
        align: 'center',
        verticalAlign: 'middle',
        y: 25
      },
      plotOptions: {
        pie: {
          dataLabels: {
            enabled: true,
            distance: -15,
            formatter: function() {
              return this.point.y;
            },
            style: {
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0px 1px 2px black',
            }
          },
          startAngle: -90,
          endAngle: 90,
          center: [ '50%', '75%' ]
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



function drawLineChart( activeExecutions, activeObjects ) {
  $( '#other' ).highcharts( {
    chart: {
      zoomType: 'x',
      type: 'spline'
    },
    title: {
      text: 'Executions'
    },
    xAxis: {
      type: 'datetime'
    },
    yAxis: [ {
      title: {
        text: 'Active executions (#)'
      },
      tickInterval: 1,
      min: 0
    }, {
      title: {
        text: 'Active objects (#)'
      },
      tickInterval: 1,
      opposite: true,
      min: 0
    } ],
    series: [ {
      name: 'Active executions',
      data: activeExecutions,
      yaxis: 0
    }, {
      name: 'Active objects',
      data: activeObjects,
      yaxis: 1
    } ]
  } );
}

$.getJSON( baseUrl + 'api/task/' + taskId + '/stats?raw=true' )
  .done( function( stats ) {

    var executions = stats.executions;
    var closedExecutions = stats.closedExecutions;
    var invalidExecutions = stats.invalidExecutions;
    var createdExecutions = executions - closedExecutions - invalidExecutions;
    var executionStatuses = [ 'CREATED', 'CLOSED', 'INVALID' ];

    drawPieChart( 'Executions', [ createdExecutions, closedExecutions, invalidExecutions ], executionStatuses );

    var objects = stats.objects;
    var closedObjects = stats.closedObjects;
    var createdObjects = objects - closedObjects;
    var objectStatuses = [ 'CREATED', 'CLOSED' ];

    drawPieChart( 'Objects', [ createdObjects, closedObjects ], objectStatuses );

    var microtasks = stats.microtasks;
    var closedMicrotasks = stats.closedMicrotasks;
    var createdMicrotasks = microtasks - closedMicrotasks;
    var microtaskStatuses = [ 'CREATED', 'CLOSED' ];

    drawPieChart( 'Microtasks', [ createdMicrotasks, closedMicrotasks ], microtaskStatuses );

    var execList = stats.raw;
    var activeExecutions = [];

    function toUTC( dateString ) {
      var date = new Date( dateString );
      return Date.UTC( date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds() );
      //return date;
    }

    $.each( execList, function() {
      var exec = this;
      activeExecutions.push( {
        date: toUTC( exec.createdDate ),
        value: 1
      } );

      if ( exec.status !== 'CREATED' ) {
        activeExecutions.push( {
          date: toUTC( exec.closedDate || exec.invalidDate ),
          value: -1
        } );
      }

    } );

    activeExecutions.sort( function( a, b ) {
      return a.date - b.date;
    } );

    var val = 0;
    activeExecutions = $.map( activeExecutions, function( exec ) {
      val += exec.value;
      return {
        x: exec.date,
        y: val,
        marker: {
          enabled: false
        }
      };
    } );

    var activeObjects = [];
    drawLineChart( activeExecutions, activeObjects );
  } );