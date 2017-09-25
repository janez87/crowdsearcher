'use strict';
var CS = require( '../core' );

var log = CS.log.child( { component: 'Account Routes' } );

exports.index = function( req, res ) {
  log.trace( 'Render account view' );
  res.render( 'account', {
    title: 'Account',
    socialMap: CS.social
  } );
};