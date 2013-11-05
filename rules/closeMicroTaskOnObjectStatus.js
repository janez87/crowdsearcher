
// Load libraries
var _ = require('underscore');
var async = require('async');
var CS = require( '../core' );
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'Close Microtask' } );

// Models
var Microtask = CS.models.microtask;
var ObjectModel = CS.models.object;

var performRule = function( event, config, task, data, callback ) {
  var d = domain.create();
  d.on( 'error', callback );

  var objectId = data.object;

  Microtask
  .find()
  .where( 'task', task._id )
  .where( 'status' ).ne( 'CLOSED' )
  .where( 'objects' ).in( [ objectId ] )
  .populate( 'objects' )
  .exec( d.bind( function( err, microtasks ) {
    if( err ) return callback( err );

    // Ok go on
    if( !microtasks )
      return callback();

    // Get all the non-closed objects
    ObjectModel
    .populate( microtasks, {
      path: 'objects',
      match: {
        status: {
          $ne: 'CLOSED'
        }
      }
    }, d.bind( function( err, microtasks ) {
      if( err ) return callback( err );

      var selected = _.filter( microtasks, function( microtask ) {
        return microtask.objects.length===0;
      } );

      function closeMicrotask( microtask, cb ) {
        return microtask.close( d.bind( cb ) );
      }

      return async.each( selected, closeMicrotask, callback );
    } ) );
  } ) );
};

module.exports.perform = exports.perform = performRule;