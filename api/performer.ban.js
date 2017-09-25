'use strict';
var util = require( 'util' );
var CS = require( '../core' );
let _ = require( 'lodash' );

// Use a child logger
var log = CS.log.child( {
  component: 'Ban performer'
} );

// Generate custom error `BanPerformerError` that inherits
// from `APIError`
var APIError = require( './error' );
var BanPerformerError = function( id, message, status ) {
  BanPerformerError.super_.call( this, id, message, status );
};
util.inherits( BanPerformerError, APIError );

BanPerformerError.prototype.name = 'BanPerformerError';
// Custom error IDs
BanPerformerError.NOT_FOUND = 'NOT_FOUND';
BanPerformerError.MISSING_PARAMETER = 'MISSING_PARAMETER';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'performer/:id/ban',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function banPerformer( req, res, next ) {
  var id = req.params.id;
  var data = req.body;
  var taskId = data.task;

  if ( _.isUndefined( taskId ) ) {
    return next( new BanPerformerError( BanPerformerError.MISSING_PARAMETER, 'Missing task id in the body of the request', APIError.BAD_REQUEST ) );
  }

  var Performer = CS.models.user;
  log.trace( 'Banning the performer %s for the task %s', id, taskId );
  return Performer.ban( id, taskId, function( err ) {
    if ( err ) return next( err );

    log.trace( 'User %s succesfully banned from task $s', id, taskId );

    return res.json( {} );
  } );
};


// Export the API object
exports = module.exports = API;