// Test libraries
var mongoose = require('mongoose');
var should = require( "should" );

// Test configuration
var db = mongoose.connect('mongodb://localhost/Test');
var Schema = mongoose.Schema;



var CommentSchema = new Schema( {
  text: 'string'
} );
var PostSchema = new Schema( {
  title: 'string',
  text: 'string',
  comments: [CommentSchema]
}, {
  safe: false
} );

var Post = db.model( 'post', PostSchema );


describe( 'Mongo test', function() {
  // Cleanup everything
  before( function( done ) {
    Post.remove( done );
  } );


  it( 'Should create a Post', function( done ) {
    var post = new Post( {
      title: 'TEST!!!',
      text: 'lorem ispum...'
    } );

    post.save( done );
  });

  it( 'Should be there', function( done ) {
    Post
    .findOne()
    .exec( function( err, post ) {
      if( err ) return done( err );

      post.should.have.property( 'title', 'TEST!!!' );
      post.should.have.property( 'text', 'lorem ispum...' );

      post.should.have.property( 'comments' );
      post.comments.should.have.length( 0 );

      done();
    });
  });

  it( 'Add comment', function( done ) {
    Post
    .findOne()
    .exec( function( err, post ) {
      if(err) return done( err );

      post.comments.push( {
        text: 'Comment 1'
      } );
      post.comments.push( {
        text: 'Comment 2'
      } );


      post.save( done );
    } );
  } );

  it( 'Comment should be there', function( done ) {
    Post
    .findOne()
    .exec( function( err, post ) {
      if(err) return done( err );
      
      post.comments.should.have.length( 2 );

      var comment1 = post.comments[0];
      comment1.should.have.property( 'text', 'Comment 1' );

      done();
    } );
  } );
});