/* globals d3, baseUrl, _ */
var parts = location.pathname.split( '/' );
var taskId = parts[ parts.length - 2 ];
$.getJSON( baseUrl + 'api/task/' + taskId + '/stats?raw=true' )
  .done( function( stats ) {

    var data = stats.raw;
    //$( '#graphs' ).html( '<pre>' + JSON.stringify( data, null, 2 ) + '</pre>' );

    var WIDTH = 1140;
    var HEIGHT = 480;
    var margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50
    };
    var width = WIDTH - margin.left - margin.right;
    var height = HEIGHT - margin.top - margin.bottom;
    /*
    var data = [ {
      date: new Date( 2010, 1, 2 ),
      label: 'sdasd'
    }, {
      date: new Date( 2013, 1, 2 ),
      label: 'asdadswertertert'
    }, {
      date: new Date( 2010, 10, 2 ),
      label: 'hjkhkjhjk'
    }, {
      date: new Date( 2012, 1, 20 ),
      label: 'yuiuiyiyiyui'
    }, {
      date: new Date( 2010, 10, 20 ),
      label: 'nm,n,n,mm,n'
    } ];

    var data = [ {
      date: new Date( 2010, 1, 2 ),
      number: 5
    }, {
      date: new Date( 2013, 1, 2 ),
      number: 25
    }, {
      date: new Date( 2010, 10, 2 ),
      number: 90
    }, {
      date: new Date( 2012, 4, 20 ),
      number: 30
    }, {
      date: new Date( 2010, 10, 20 ),
      number: 45
    } ];

    data = data.sort( function( d1, d2 ) {
      return d3.ascending( d1.date, d2.date);
    } );
    */

    var parseDate = d3.time.format.iso.parse;

    _.each( data, function( d ) {
      d.createdDate = parseDate( d.createdDate );
      d.closedDate = d.closedDate ? parseDate( d.closedDate ) : null;
      d.invalidDate = d.invalidDate ? parseDate( d.invalidDate ) : null;
    } );

    var x = d3.time.scale()
      .range( [ 0, width ] );

    var y = d3.scale.ordinal()
      .range( [ 0, height ] );

    var xAxis = d3.svg.axis()
      .scale( x )
      .orient( 'bottom' );

    var yAxis = d3.svg.axis()
      .scale( y )
      .orient( 'left' );

    /*
    var line = d3.svg.line()
      .x( function( d ) {
        return x( d.date );
      } )
      .y( function( d ) {
        return y( d.number );
      } );
    */

    var svg = d3.select( '#graphs' )
      .append( 'svg:svg' )
      .attr( 'width', width + margin.left + margin.right )
      .attr( 'height', height + margin.top + margin.bottom )
      .append( 'svg:g' )
      .attr( 'transform', 'translate(' + margin.left + ',' + margin.top + ')' );



    function getPerfID( d ) {
      return d.performer ? d.performer.username : 'Guest';
    }
    // Compute x and y domain extents
    var xMin = d3.min( data, function( d ) {
      return d.createdDate;
    } );
    var xMax = d3.max( data, function( d ) {
      return d.closedDate || d.invalidDate || d.createdDate;
    } );
    x.domain( [ xMin, xMax ] );
    var performers = _.uniq( _.map( data, getPerfID ) );

    y.domain( performers );


    // Add x Axis
    svg.append( 'svg:g' )
      .attr( 'class', 'x axis' )
      .attr( 'transform', 'translate(0,' + height + ')' )
      .call( xAxis );

    // Add y Axis
    svg.append( 'svg:g' )
      .attr( 'class', 'y axis' )
      .call( yAxis )
      .append( 'svg:text' )
      .attr( 'transform', 'rotate(-90)' )
      .attr( 'y', 6 )
      .attr( 'dy', '.71em' )
      .style( 'text-anchor', 'end' )
      .text( 'Performer' );

    // Add the path
    svg.selectAll( 'rect' )
      .data( data )
      .enter()
      .append( 'svg:rect' )
      .attr( 'class', 'rect' )
      .attr( 'x', function( d ) {
        return x( d.createdDate );
      } )
      .attr( 'y', function( d ) {
        console.log();
        return y( getPerfID( d ) );
      } )
      .attr( 'height', 5 )
      .attr( 'width', function( d ) {
        var w = x( d.closedDate || d.invalidDate || d.createdDate ) - x( d.createdDate );
        return w;
      } )
      .attr( 'fill', '#2d578b' );


  } );