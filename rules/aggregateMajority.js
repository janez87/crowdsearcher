// AggregateMajorty rule
// ---
// Rule that aggregate the results of the majorities in order to close the object

// Load libraries
var _ = require( 'underscore' );
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'Aggregate Majority'
} );

// Models
var ControlMart = CS.models.controlmart;
var Microtask = CS.models.microtask;

function onOpenTask( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndTask( params, task, data, callback ) {
  // body...

  return callback();
}

function onAddMicrotasks( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndMicrotask( params, task, data, callback ) {
  // body...

  return callback();
}

function onEndExecution( params, task, data, callback ) {

  var microtask = data.microtask;

  var mode = params.mode;

  // For each object it evaluate the status of the majorities
  var evaluateMajority = function( microtask, object, cb ) {

    // If the object is already close do nothing
    log.trace( 'Evaluating the majority' );
    if ( object.closed ) {
      log.trace( 'Object %s already closed', object._id );
      return cb();
    }

    // Retrieve the control mart related to the status of the object
    ControlMart
      .get( {
        object: object._id,
        name: 'status'
      }, function( err, controlmart ) {
        if ( err ) return cb( err );

        log.trace( 'controlmart: %j', controlmart );

        // Select only the closed operations
        var closed = _.where( controlmart, {
          data: 'closed'
        } );

        log.trace( '%s operations are closed', closed.length );
        log.trace( '%s mode selected', mode );
        if ( mode === 'ONE' ) {
          // Close the object if at least 1 operation is closed
          if ( closed.length >= 1 ) {
            log.trace( 'Closing object %s', object._id );
            return object.close( cb );
          } else {
            return cb();
          }
        }
        if ( mode === 'ALL' ) {
          // Close the object if all the operation are closed
          if ( closed.length === microtask.operations.length ) {
            log.trace( 'Closing object %s', object._id );
            return object.close( cb );
          } else {
            return cb();
          }
        }
        if ( mode === 'SPECIFIC' ) {
          // Close the object if the specified operation are closed
          var ops = params.operations;

          if ( !_.isArray( ops ) ) {
            ops = [ ops ];
          }

          log.trace( 'The operations required to the close are: [%s]', ops );
          var completed = true;


          for ( var i = 0; i < ops.length; i++ ) {
            log.trace( 'ops[%s]: %j', i, ops[ i ] );
            var opId = _.findWhere( microtask.operations, {
              label: ops[ i ]
            } );
            var mart = _.filter( closed, function( mart ) {
              return opId._id.equals( mart.operation );
            } );

            // If at least 1 operation of the required one is not closed it sets  completed to false
            if ( _.isUndefined( mart ) || mart.length === 0 ) {
              completed = false;
              break;
            }
          }

          // If it's completed, close the object
          if ( completed ) {
            return object.close( cb );
          } else {
            return cb();
          }
        }

        log.trace( 'Not supported mode selected' );
        return cb();
      } );

  };

  Microtask
    .findById( microtask )
    .populate( 'objects operations' )
    .exec( function( err, microtask ) {
      if ( err ) return callback( err );

      if ( !microtask )
        return callback( new Error( 'No microtaskId retrieved' ) );

      log.trace( 'Microtask %s populated', microtask._id );

      var fn = _.partial( evaluateMajority, microtask );
      return async.eachSeries( microtask.objects, fn, callback );
    } );
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
    'OPEN_TASK': onOpenTask,
    // Description of what the rule does in this specific event.
    'END_TASK': onEndTask,
    // Description of what the rule does in this specific event.
    'ADD_MICROTASKS': onAddMicrotasks,
    // Description of what the rule does in this specific event.
    'END_MICROTASK': onEndMicrotask,
    // Description of what the rule does in this specific event.
    'END_EXECUTION': onEndExecution
  },


  // ## Parameters
  //
  //
  params: {
    mode: {
      type: 'enum',
      values: [ 'ALL', 'ONE', 'SPECIFIC' ]
    },
    operations: [ 'string' ]
  },

  // ## Check rule
  //
  // Description of the constraints of the rule parameters.
  check: function checkParams( params, done ) {
    var mode = params.mode;

    if ( _.isUndefined( mode ) ) {
      log.error( 'A mode must be specified' );
      return done( false );
    }

    if ( mode !== 'ALL' && mode !== 'ONE' && mode !== 'SPECIFIC' ) {
      log.error( 'Unsupported mode is specified (%s)', mode );
      return done( false );
    }

    if ( mode === 'SPECIFIC' ) {
      var operations = params.operations;

      if ( _.isUndefined( operations ) ) {
        log.error( 'The operations must be specified for the SPECIFIC mode' );
        return done( false );
      }
    }

    // Everything went better then expected...
    return done( true );
  },
};

module.exports = exports = rule;