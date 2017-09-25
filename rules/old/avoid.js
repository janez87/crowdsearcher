
'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var util = require('util');
var domain = require( 'domain' );

var log = CS.log.child( { component: 'avoid RULE' } );

// Models
var User = CS.models.user;

var CSError = require('../../error');
// Custom error
var AvoidError = function( id, message) {
  /* jshint camelcase:false */
  AvoidError.super_.call( this, id, message);
};

util.inherits( AvoidError, CSError );

// Error name
AvoidError.prototype.name = 'AvoidError';


var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');
  var d = domain.create();
  d.on( 'error', callback );

  var task = data.task; // pop
  var microtask = data.microtask; // pop
  var execution = data.execution;
  var performerId = execution.performer; // id

  User.findById( performerId, d.bind( function( err, performer ) {
    if( err ) return callback( err );

    var microtasksToAvoid = performer.getMetadata( 'microtasksToAvoid' );
    microtasksToAvoid = microtasksToAvoid || [];

    microtasksToAvoid.push( microtask._id );

    performer.setMetadata( 'microtasksToAvoid', microtasksToAvoid );
    if( microtasksToAvoid.length===task.microtasks.length ) {
      var tasksToAvoid = performer.getMetadata( 'tasksToAvoid' );
      tasksToAvoid = tasksToAvoid || [];

      tasksToAvoid.push( task._id );
    }

    return performer.save( d.bind( callback ) );
  }) );
};

var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
