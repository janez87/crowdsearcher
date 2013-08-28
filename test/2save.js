// Test libraries
var mongoose = require('mongoose');
var should = require( "should" );

// Test configuration
var db = mongoose.connect('mongodb://localhost/Test');
var Schema = mongoose.Schema;



var DataSchema = new Schema( {
  key: 'string',
  value: 'mixed'
} );

var PostSchema = new Schema( {
  title: 'string',
  text: 'string',
  array: [DataSchema]
} );

var Post = db.model( 'post', PostSchema );


describe( 'Mongo test', function() {
  // Cleanup everything
  before( function( done ) {
    Post.remove( done );
  } );


  it( 'Should double save', function( done ) {
    var post = new Post( {
      title: 'TEST!!!',
      text: 'lorem ispum...',
      array: [
        {
          key: 'asd',
          value: 'asdasdasdkjhasdhas'
        },
        {
          key: 'asd23',
          value: 'ano'
        }
      ]
    } );

    post.save( function( err, post ) {
      if( err ) return done( err );

      post.array.set( 0, {
        key: 'asd1',
        value: 'asddasdasdasdasd'
      } );

      post.save( function( err, post ) {
        if( err ) return done( err );

        post.array.set( 1, {
          key: 'asd2',
          value: 'asddasdasdasdasd'
        } );

        post.increment();
        
        post.save( done );
      } );
    } );
  } );
  
  it( 'Should be correctly saved', function( done ) {
    Post
    .findOne( function( err, post ) {
      if( err ) return done( err );

      post.array[0].should.have.property( 'key', 'asd1' );
      post.array[0].should.have.property( 'value', 'asddasdasdasdasd' );
      post.array[1].should.have.property( 'key', 'asd2' );
      post.array[1].should.have.property( 'value', 'asddasdasdasdasd' );

      done();
    } );
  } );
});