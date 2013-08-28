require( "should" );
var assert = require( "assert" );
var _ = require( 'underscore' );


describe( 'Task Model', function() {
  
  describe( '#indexOf()', function() {
    
    it( 'should return -1 when the value is not present', function() {

      [ 1, 2, 3 ].indexOf( 5 ).should.equal( -1 );
      [ 1, 2, 3 ].indexOf( 0 ).should.equal( -1 );

    });
  });
});