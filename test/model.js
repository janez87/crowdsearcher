// Test libraries
var mongoose = require('mongoose');
var should = require( "should" );

// Test configuration
var db = mongoose.connect('mongodb://localhost/Test');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var CommentSchema = new Schema( {
  text: 'string'
} );
var PostSchema = new Schema( {
  comments: {
    type: [{
      type: ObjectId,
      ref: 'comment'
    }],
    unique: true
  }
} );

var Post = db.model( 'post', PostSchema );
var Comment = db.model( 'comment', CommentSchema );


describe( 'Mongo test', function() {
  var comment, post;

  // Cleanup everything
  before( function( done ) {
    Post.remove( function() {
      Comment.remove( done );
    } );
  } );


  it( 'Should create a Comment', function( done ) {
    comment = new Comment( {
      text: 'asd'
    } );
    var comments = [
      comment,
      {
        text: 'asde'
      }
    ];
    Comment.create( comments, done );
  });
  it( 'Comment should be there', function( done ) {
    Comment
    .find()
    .exec( function( err, comments ) {
      if( err ) throw err;

      comments.should.have.length( 2 );
      console.log( comments );
      done();
    });
  });

  it( 'Should create a Post', function( done ) {
    post = new Post( {
      comments: [ comment ]
    } );

    post.save( done );
  });

  it( 'Should be there', function( done ) {
    Post
    .findOne()
    .exec( function( err, post ) {
      if( err ) throw err;

      post.should.have.property( 'comments' );
      post.comments.should.have.length( 1 );

      done();
    });
  });
});