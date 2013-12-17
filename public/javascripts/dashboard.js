/* globals d3, baseUrl, _ */
var parts = location.pathname.split( '/' );
var taskId = parts[ parts.length - 2 ];

var drawPieChart = function( label, sample, status ) {

  var data = [];
  for ( var i = 0; i < status.length; i++ ) {
    data.push( [ status[ i ], sample[ i ] ] );
  }

  data = _.sortBy( data, function( d ) {
    return d[ 0 ];
  } );


  $( '<div class="donutChart" id="' + label.toLowerCase() + '_donut" >' ).appendTo( '#graphs' )
    .highcharts( {
      exporting: {
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
      colors: [
        '#d9534f',
        '#f0ad4e',
        '#5bc0de'
      ],
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

$.getJSON( baseUrl + 'api/task/' + taskId + '/stats?raw=true' )
  .done( function( stats ) {

    var executions = stats.executions;
    var closedExecutions = stats.closedExecutions;
    var invalidExecutions = stats.invalidExecutions;
    var createdExecutions = executions - closedExecutions - invalidExecutions;
    var executionStatuses = [ 'CREATED', 'CLOSED', 'INVALID' ];

    drawPieChart( 'Executions', [ createdExecutions, closedExecutions, invalidExecutions ], executionStatuses );

  } );