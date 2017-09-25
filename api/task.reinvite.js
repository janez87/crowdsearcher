'use strict';
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( {
  component: 'Reinvite task'
} );

// Generate custom error `ReinviteError` that inherits
// from `APIError`
var APIError = require( './error' );
var ReinviteError = function( id, message, status ) {
  ReinviteError.super_.call( this, id, message, status );
};
util.inherits( ReinviteError, APIError );

ReinviteError.prototype.name = 'ReinviteError';
// Custom error IDs
ReinviteError.NOT_FOUND = 'NOT_FOUND';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'task/:id/reinvite',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function reinvite( req, res, next ) {
  var id = req.params.id;
  var platforms = req.body.platforms || [];
  log.trace( 'Reinviting task %s', id );

  var Task = CS.models.task;
  Task
    .findById( id )
    .exec( req.wrap( function( err, task ) {
      if ( err ) return next( err );

      if ( !task )
        return next( new ReinviteError( ReinviteError.NOT_FOUND, 'Task not found' ) );

      task.reinvite( platforms, req.wrap( function( err ) {
        if ( err ) return next( err );

        log.debug( 'Reinvitation done', id );
        res.json( {
          data: 'Reinvitation done'
        } );
      } ) );
    } ) );
};


// Export the API object
exports = module.exports = API;