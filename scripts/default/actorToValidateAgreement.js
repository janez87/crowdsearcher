
// Load libraries
var util = require('util');
var _ = require('underscore');
var domain = require( 'domain' );

// Create a child logger
var log = common.log.child( { component: 'ActorToValidateAgreement' } );

// Models
var Task = common.models.task;
var Microtask = common.models.microtask;
var Execution = common.models.execution;

var CSError = require('../../error');
// Custom error
var ActorToValidateAgreementError = function( id, message) {
  /* jshint camelcase: false */
  ActorToValidateAgreementError.super_.call( this, id, message);
};

util.inherits( ActorToValidateAgreementError, CSError );

// Error name
ActorToValidateAgreementError.prototype.name = 'ActorToValidateAgreementError';

// Error IDs
ActorToValidateAgreementError.INVALID_TASK_ID = 'INVALID_TASK_ID';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var d = domain.create();
  d.on( 'error', callback );

  var taskId = config.task;
  var agreement = config.agreement;

  var microtask = data.microtask;

  if(data.event !== 'END_MICROTASK'){
    log.error('Wrong event');
    return callback();
  }

  Task
  .findById( taskId )
  .exec( d.bind( function( err, task2 ) {
    if( err ) return callback( err );

    if( !task2 )
      return callback( new ActorToValidateAgreementError( ActorToValidateAgreementError.INVALID_TASK_ID, 'Invalid Task id' ) );

    // Task valid

    var rawObjects = [];

    Execution
    .find()
    .where('microtask')
    .equals(microtask)
    .populate('annotations.object')
    .exec(d.bind(function(err,executions){
      if(err) return callback(err);

      log.trace('Retrieved %s executions',executions.length);

      var actors = [];
      var img = executions[0].annotations[0].object.data.scene;

      _.each(executions,function(execution){
        _.each(execution.annotations,function(annotation){

          actors.push(annotation.response);

        });

      });

      var countActors = _.countBy(actors);
      var actorToBeCreated = [];

      _.each(countActors,function(count,key){
        if(count>=agreement){
          actorToBeCreated.push(key);
        }
      });


      log.trace(actorToBeCreated);

      _.each(actorToBeCreated,function(actor){

        var object = {
          name:'image',
          job: data.task.job,
          data:{
            actor:actor,
            scene:img
          }
        };

        rawObjects.push( object );
      } );


      task2.addObjects( rawObjects, d.bind( function ( err, objects ) {
        if( err ) return callback( err );

        var microtaskToCreate = new Microtask( {
          task: task2,
          objects: objects,
          operations: task2.operations,
          platforms: task2.platforms
        } );


        d.bind( microtaskToCreate.save.bind( microtaskToCreate ) )( function ( err, m ) {
          if( err ) return callback( err );

          return task2.addMicrotasks( m, d.bind( callback ) );
        } );
      } ) );

    } ) );

  } ) );
};



var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
  task: 'string',
  agreement:'number'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;