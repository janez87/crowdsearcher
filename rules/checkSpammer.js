// CheckSpammer rule
// ---
// Rule that check if a user is a spammer for an operation


// Load libraries
var _ = require( 'underscore' );
var CS = require( '../core' );
var async = require( 'async' );

// Create a child logger
var log = CS.log.child( {
  component: 'CheckSpammer'
} );

// Models
var ControlMart = CS.models.controlmart;
var Execution = CS.models.execution;


function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule' );



  var firstTime = false;
  var executionId = data.executionId;

  log.trace( 'Retrieving the execution' );
  Execution
    .findById( executionId )
    .exec( function( err, execution ) {

      if ( err ) return callback( err );

      if ( !execution.performer || _.isUndefined( execution.performer ) ) {
        log.trace( 'No performer for execution %s', executionId );
        return callback();
      }

      var performer = execution.performer;
      log.trace( 'Retrieving the mart for the performer %s', performer );
      ControlMart
        .find( {
          task: task._id,
          performer: performer
        } )
        .exec( function( err, mart ) {
          if ( err ) return callback( err );

          var evaluations = _.findWhere( mart, {
            name: 'evaluations'
          } );

          var right = _.findWhere( mart, {
            name: 'right'
          } );

          var wrong = _.findWhere( mart, {
            name: 'wrong'
          } );

          var spammer = _.findWhere( mart, {
            name: 'spammer'
          } );

          if ( !evaluations ) {
            firstTime = true;
            evaluations = {
              name: 'evaluations',
              task: task._id,
              performer: performer,
              data: 0
            };
          }

          if ( !right ) {
            right = {
              name: 'right',
              task: task._id,
              performer: performer,
              data: 0
            };
          }

          if ( !wrong ) {
            wrong = {
              name: 'wrong',
              task: task._id,
              performer: performer,
              data: 0
            };
          }

          if ( !spammer ) {
            spammer = {
              name: 'spammer',
              task: task._id,
              performer: performer,
              data: false
            };
          }

          log.trace( evaluations, right, wrong, spammer );

          var checkAnnotation = function( annotation, cb ) {

            var category = annotation.response;

            ControlMart
              .find( {
                task: task._id,
                name: 'gt_value',
                object: annotation.object,
                operation: annotation.operation
              } )
              .exec( function( err, mart ) {
                if ( err ) return cb( err );

                if ( _.isUndefined( mart ) || !mart ) {
                  log.trace( 'No gt value for object %s', annotation.object );
                  return cb();
                }

                evaluations.data++;

                if ( category === mart[ 0 ].data ) {
                  right.data++;
                } else {
                  wrong.data++;
                }

                if ( wrong.data / evaluations.data < params.threshold && evaluations.data >= params.answers ) {
                  spammer.data = true;
                }

                return cb();
              } );
          };


          var annotations = execution.annotations;

          return async.each( annotations, checkAnnotation, function( err ) {
            if ( err ) return callback( err );

            if ( firstTime ) {
              log.trace( 'Creaing the mart' )
              return ControlMart.create( [ evaluations, right, wrong, spammer ], callback );
            } else {
              log.trace( 'Updating the mart' );
              return ControlMart.insert( [ evaluations, right, wrong, spammer ], callback );
            }
          } );
        } );
    } );

}

var rule = {

  hooks: {
    'END_EXECUTION': onEndExecution
  },

  check: function checkParams( params, done ) {
    log.trace( 'Checking parameters' );


    if ( _.isUndefined( params.threshold ) || params.threshold <= 0 ) {
      log.error( 'The threshold must be an integer greater than 0' );
      return done( false );
    }

    if ( _.isUndefined( params.answers ) || params.answers <= 0 ) {
      log.error( 'The number of answers must be an integer greater than 0' );
      return done( false );
    }

    return done( true );
  },

  params: {
    answers: 'number',
    threshold: 'number'
  }
};


module.exports = exports = rule;