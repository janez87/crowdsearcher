// Test libraries
var mongoose = require('mongoose');
var should = require( 'should' );

// Test configuration
var db = mongoose.connect('mongodb://localhost/Test');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;



var Control = new Schema( {
  test: Mixed
} );
var PostSchema = new Schema( {
  controls: [Control]
} );


var count = 0;
Control.path( 'test' ).validate( function ( value, done ) {
  count += 1;
  return done( true );
}, 'Invalid test' );

var Post = db.model( 'post', PostSchema );


describe( 'Mongo test', function() {
  // Cleanup everything
  before( function( done ) {
    Post.remove( done );
  } );


  it( 'Should create a Post', function( done ) {
    var post = new Post( {
      controls: [{
        test: {
          number: -1,
          string: 'asd'
        }
      },
      {
        test: {
          number: -1,
          string: 'asd'
        }
      }]
    } );

    post.save( done );
  });

  it( 'Count should be 1', function ( done ) {
    count.should.be.eql( 1 );
    console.log( count );
    done();
  } );
});