
var log = common.log.child( { component: 'Account Routes' } );

exports.index = function( req, res ) {
  log.trace( 'Render account view' );
  res.render( 'account', {
    title: 'Account'
  } );
};


/*
exports.application = function( req, res, next ) {
  res.render( 'application' );
};
exports.postApplication = function( req, res, next ) {
  var Application = common.model.application;
  log.trace( 'Send application %j', req.body );

  var key = uuid.v4();
  var data = req.body;
  data.key = key;
  log.trace( 'Generated key for application %s', key );

  
  log.trace( 'Saving application "%s"', data.name );
  var app = new Application( data );
  app.user = req.user;

  app.save( function( err, application ) {
    if( err ) return next( err );

    log.trace( 'Application "%s" saved!', application.name );

    
    log.trace( 'Updating user "%s" information', req.user.username );
    req.user.applications.push( application );
    req.user.save( function( err, user ) {
      if( err ) return next( err );

      log.trace( 'User "%s" updated', req.user.username );
      
      res.format( {
        html: function() {
          res.send( 'Application created' );
        },
        json: function() {
          res.json( application );
        }
      } );

    } );
    
  } );
};
*/