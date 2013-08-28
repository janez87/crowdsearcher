// Test libraries
var mongoose = require('mongoose');
var should = require( "should" );

// Test configuration
var db = mongoose.connect('mongodb://localhost/Test');
var Schema = mongoose.Schema;



var PostSchema = new Schema( {
  title: {
    type: 'string',
    //select: true
  },
  text: 'string'
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

  it( 'Should not crash', function( done ) {
    Post
    .findOne()
    .select( '+text -title' )
    .exec( function( err, post ) {
      if( err ) return done( err );

      post.should.have.property( 'text', 'lorem ispum...' );
      post.should.have.property( 'title', 'TEST!!!' );

      done();
    });
  });
});