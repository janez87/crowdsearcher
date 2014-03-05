// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( {
  component: 'Close Microtask'
} );

// Models
var Microtask = CS.models.microtask;
var ObjectModel = CS.models.object;

function onCloseObject( params, task, data, callback ) {
  var objectId = data.objectId;

  Microtask
    .find()
    .where( 'task', task._id )
    .where( 'status' ).ne( 'CLOSED' )
    .where( 'objects' ). in ( [ objectId ] )
    .populate( 'objects' )
    .exec( function( err, microtasks ) {
      if ( err ) return callback( err );

      // Ok go on
      if ( !microtasks )
        return callback();

      // Get all the non-closed objects for each microtask
      ObjectModel
        .populate( microtasks, {
          path: 'objects',
          match: {
            status: {
              $nin: [ 'CLOSED', 'CLOSED_GOOD', 'CLOSED_BAD' ]
            }
          }
        }, function( err, microtasks ) {
          if ( err ) return callback( err );

          var selected = _.filter( microtasks, function( microtask ) {
            return microtask.objects.length === 0;
          } );

          function closeMicrotask( microtask, cb ) {
            return microtask.close( cb );
          }

          return async.each( selected, closeMicrotask, callback );
        } );
    } );

  return callback();
}

// # Rule definition
//
// Description of the rule.
var rule = {
  // # Hooks
  //
  // Description of what the rule does in general.
  hooks: {
    // Description of what the rule does in this specific event.
    'CLOSE_OBJECT': onCloseObject
  }
};

module.exports = exports = rule;