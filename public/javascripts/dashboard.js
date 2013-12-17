/* globals baseUrl, _, Highcharts */
var parts = location.pathname.split( '/' );
var taskId = parts[ parts.length - 2 ];

var drawNumber = function( label, number ) {

  console.log( number );
  $( '<div id="number" class="' + label.toLowerCase() + '_number">' ).appendTo( '#graphs' )
    .highcharts( {
      title: {
        text: label
      },
      chart: {
        width: 250,
        height: 250,
        style: {
          'margin-left': 'auto',
          'margin-right': 'auto'
        }
      }
    }, function( chart ) {
      chart.renderer.text( 3, 125, 125 )
        .css( {
          'font-size': 50,
          'text-align': 'center'
        } )
        .add();
    } );

  /* var image = new Highcharts.Chart( {
    chart: {
      renderTo: 'number',
      title: {
        text: 'label'
      },
      events: {
        load: function() {
          var renderer = this.renderer;

          renderer.text( number, 200, 200 );
        }
      }
    }
  } );*/

};

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


  data = _.sortBy( data, function( d ) {
    return d.name;
  } );


  $( '<div class="donutChart" id="' + label.toLowerCase() + '_donut" >' ).appendTo( '#donut' )
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

    var performers = stats.performers;

    drawNumber( 'Performers', performers );



  } );