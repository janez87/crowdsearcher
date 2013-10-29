
// Load libraries
var util = require('util');
var domain = require( 'domain' );

// Create a child logger
var log = CS.log.child( { component: 'PositionToOrderBatch' } );

// Models
var Task = CS.models.task;

var CSError = require('../../error');
// Custom error
var PositionToOrderBatchError = function( id, message) {
  /* jshint camelcase: false */
  PositionToOrderBatchError.super_.call( this, id, message);
};

util.inherits( PositionToOrderBatchError, CSError );

// Error name
PositionToOrderBatchError.prototype.name = 'PositionToOrderBatchError';

// Error IDs
PositionToOrderBatchError.INVALID_TASK_ID = 'INVALID_TASK_ID';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on( 'error', callback );

  var taskId = config.task;
  var task = data.task;

  if(data.event !== 'END_TASK'){
    log.warn('Wrong event');
    return callback();
  }

  Task
  .findById( taskId )
  .exec( d.bind( function( err, task2 ) {
    if( err ) return callback( err );

    if( !task2 )
      return callback( new PositionToOrderBatchError( PositionToOrderBatchError.INVALID_TASK_ID, 'Invalid Task id' ) );

    task.populate('objects',function(err,task){
      if(err) return callback(err);

      var objects = [];

      for (var i=0; i<task.objects.length; i++ ) {
        var object = task.objects[i];
        var result = object.getMetadata('maj_'+task.operations[0]._id+'_result');

        if( result==='end' ) continue;

        var newObject = {
          name: 'image',
          data: {
            scene: object.data.scene,
            position: result
          }
        };

        objects.push(newObject);
      }

      return task2.addObjects( objects, callback );
    } );
  } ) );
};



var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
  task: 'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;