'use strict';
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Close Task'
} );

// Models
var ObjectModel = CS.models.object;

function onCloseObject( params, task, data, callback ) {
  if( task.closed ) return callback();

  ObjectModel
  .find()
  .where( 'task', task._id )
  .or( [
    { status: 'CREATED' },
    { status: 'ASSIGNED' }
  ] )
  .count()
  .exec( function( err, objectsNumber ) {
    if( err ) return callback( err );

    if( objectsNumber===0 ) {
      return task.close( callback );
    }

    return callback();
  } );


  /*
  ObjectModel
  .aggregate()
  .match( {
    task: task._id
  } )
  .project( 'status -_id' )
  .group( {
    _id: '$status',
    count: { $sum: 1 }
  } )
  .allowDiskUse( true )
  .exec( function( err, result ) {
    if ( err ) return callback( err );
    var doneNumber = 0;
    doneNumber += result[ 'CLOSED' ];
    doneNumber += result[ 'CLOSED_GOOD' ];
    doneNumber += result[ 'CLOSED_BAD' ];

    var objectsNumber = doneNumber;
    objectsNumber += result[ 'CREATED' ];
    objectsNumber += result[ 'ASSIGNED' ];

    log.trace( 'Found %s closed objects', count );
    if( count === objectsNumber )
      return task.close( callback );

    return callback();
  } );
  */

  /*
  var objectsNumber = task.objects.length;

  .find()
  .where( 'task', task._id )
  .where( 'status' ).nin( [ 'CLOSED', 'CLOSED_GOOD', 'CLOSED_BAD' ] )
  .count()
  .exec( function( err, objectsNumber ) {
    if ( err ) return callback( err );
  } );



  ObjectModel
    .find()
    .where( 'task', task._id )
    .where( 'status' ).in( [ 'CLOSED', 'CLOSED_GOOD', 'CLOSED_BAD' ] )
    .count()
    .exec( function( err, count ) {
      if ( err ) return callback( err );

      log.trace( 'Found %s closed objects', count );
      if ( count === objectsNumber )
        return task.close( callback );

      return callback();
    } );
    */
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