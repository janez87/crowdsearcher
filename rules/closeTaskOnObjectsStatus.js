
// Load libraries
var CS = require( '../core' );
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'Close Task' } );

// Models
var ObjectModel = CS.models.object;

var performRule = function( event, config, task, data, callback ) {
  var d = domain.create();
  d.on( 'error', callback );

  var objectId = data.object;

  if( task.status==='CLOSED' )
    return callback();

  var objectsNumber = task.objects.length;

  ObjectModel
  .find()
  .where( 'task', task._id )
  .where( 'status', 'CLOSED' )
  .count()
  .exec( d.bind( function( err, count ) {
    if( err ) return callback( err );

    if( count===objectsNumber ) {
      return task.close( d.bind( callback ) );
    }

    return callback();
  } ) );
};

module.exports.perform = exports.perform = performRule;