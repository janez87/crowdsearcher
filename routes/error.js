

// Load libraries
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'Error Routes' } );


exports.error = function( err, req, res, next ){
  log.error( err );

  res.status( 500 );
  var errorData = {
    error: err,
    stack: err.stack.split( '\n' )
  };
  res.format( {
    html: function() {
      res.render( 'error', errorData );
    },
    json: function() {
      res.json( errorData );
    }
  } );
};
