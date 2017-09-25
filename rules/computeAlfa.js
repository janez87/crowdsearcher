'use strict';
var CS = require( '../core' );
let _ = require( 'lodash' );
var request = require( 'request' );

// Create a child logger
var log = CS.log.child( {
  component: 'Compute alfa'
} );

var Execution = CS.models.execution;
var ControlMart = CS.models.controlmart;

function onOpenTask( params, task, data, callback ) {
  return callback();
}

function onEndExecution( params, task, data, callback ) {
  log.trace( 'Performing the rule.' );
  Execution
    .find()
    .where( 'task', task._id )
    .where( 'status', 'CLOSED' )
    .exec( function( err, executions ) {
      if ( err ) return callback( err );

      // Grouping the execution by the performer in order to have performer -> executions
      var performerExecutions = _.groupBy( executions, 'performer' );

      // I need the structure performer -> [(object,response)]
      var performerAnnotations = _.map( performerExecutions, function( executions, performer ) {

        // Extract the annotations
        var annotations = _.map( executions, function( execution ) {
          return execution.annotations;
        } );

        annotations = _.flatten( annotations );

        return {
          performer: performer,

          // I need only the object id and the response
          annotations: _.map( annotations, function( annotation ) {
            return {
              object: annotation.object,
              label: annotation.response
            };
          } )
        };
      } );

      // Now I need to create the structure object -> [performer, response]
      var objectsAnnotations = {};
      var performers = [];
      _.each( performerAnnotations, function( pA ) {
        performers.push( pA.performer );
        _.each( pA.annotations, function( annotation ) {
          if ( !objectsAnnotations[ annotation.object ] ) {
            objectsAnnotations[ annotation.object ] = [];
          }

          objectsAnnotations[ annotation.object ].push( {
            performer: pA.performer,
            label: annotation.label
          } );

        } );
      } );

      var matrix = [];
      _.each( objectsAnnotations, function( annotations ) {
        var row = [];
        for ( var i = 0; i < performers.length; i++ ) {
          var p = performers[ i ];
          var response = _.findWhere( annotations, {
            performer: p
          } );

          if ( response ) {
            row.push( response.label );
          } else {
            row.push( 'null' );
          }
        }
        matrix.push( row );
      } );

      if ( matrix[ 0 ].length < 2 ) {
        log.trace( 'Not enough performers' );
        return callback();
      }

      matrix = JSON.stringify( matrix );
      log.trace( matrix );
      matrix = matrix.replace( /\"null\"/g, '' );
      log.trace( 'Resulting matrix %s', matrix );

      return request.post( 'http://localhost:8080/CSstats/kappa', {
        body: matrix
      }, function( err, res, body ) {

        if ( err ) log.error( err );

        log.trace( body );
        var tuple = {
          task: task._id,
          name: 'kappa_' + Date.now(),
          data: body
        };
        return ControlMart.create( tuple, callback );
      } );
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
    'END_EXECUTION': onEndExecution,
    'OPEN_TASK': onOpenTask
  }

};

module.exports = exports = rule;