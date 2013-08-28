/* global define,it should,describe */

// Test libraries
var mongoose = require('mongoose');
var should = require( "should" );
var async = require( "async" );
var _ = require( "underscore" );

// Test configuration
var db = mongoose.connect('mongodb://localhost/Test');
var Schema = mongoose.Schema;

var TIMES = 15000;

var PostSchema = new Schema( {
  performer: 'string',
  object: 'string',
  job: 'string',
  task: 'string',
  microtask: 'string',
  execution: 'string',
  annotation: 'string',
  operation: 'string',

  label: 'string',

  data: 'mixed'
} );

PostSchema.pre( 'save', function( next ) {
  //console.log( 'Pre save' );
  next();
} );
PostSchema.post( 'save', function() {
  //console.log( 'Post save' );
} );

var Post = db.model( 'post', PostSchema );


describe( 'Mongo test', function() {
  // Cleanup everything
  before( function( done ) {
    Post.remove( done );
  } );


  it( 'Should save', function( done ) {
    var post = new Post( {
      performer: 'volox',
      data: 15
    } );

    post.save( done );
  } );

  it( 'Should not crash', function( done ) {
    this.timeout(0);
    var arr = [];
    _.times( TIMES, function( i ) {
      arr.push( function( cb ) {
        Post.findOne( function( err, post ) {
          if( err ) return cb( err );

          post.data = _.random( -100, 100 );
          post.markModified( 'data' );

          post.save( cb );
        } );
      });

    });

    async.parallel( arr, done );
  } );

  it( 'Should be there', function( done ) {
    Post.findOne( function( err, post ) {
      if( err ) return done( err );

      console.log( post.data );

      done();
    } );
  } );
});