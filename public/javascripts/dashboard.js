/* global stats*/
function toUTC( dateString ) {
  var date = new Date( dateString );
  return Date.UTC( date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds() );
  //return date;
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
        value: toUTC( stats.end ),
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
      //tickInterval: 1,
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
      marker: {
        enabled: false
      },
      //color: '#AA4643',
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
      yAxis: 1
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

  data = data.sort( function( a, b ) {
    return a[ 0 ] - b[ 0 ];
  } );


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
val = 0;
// Sort performers
var performers = stats.performerStats;
performers.sort( function( a, b ) {
  return a.executions - b.executions;
} ).reverse();
var topPerformers = performers.slice( 0, 15 );

drawPerformers( topPerformers );