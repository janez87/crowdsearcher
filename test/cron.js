var fs = require('fs');
var mongo = require('mongoose');
var querystring = require('querystring');
// Test libraries
var should = require( "should" );
var schedule = require('node-schedule');

describe( 'Schedule job', function() {
  it( 'YEah', function( done ) {
    this.timeout(0);
    var job = schedule.scheduleJob( '* * * * *', done );
  } );
});