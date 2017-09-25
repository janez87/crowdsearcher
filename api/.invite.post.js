

'use strict';
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
var log = CS.log.child( { component: 'Post Invite' } );

// Generate custom error `InviteError` that inherits
// from `APIError`
var APIError = require( './error' );
var InviteError = function( id, message, status ) {
  InviteError.super_.call( this, id, message, status );
};
util.inherits( InviteError, APIError );

InviteError.prototype.name = 'InviteError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkTaskId'
  ],

   // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'invite',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
// In the request you can pass a new invitation strategy (passing a invitationstrategy object)
API.logic = function invite( req, res, next ) {
  log.trace( 'Invite post' );

  // Get the new invitatin strategy from the request
  var newInvitationStrategy = req.body;

  log.trace('New invitation strategy: %j',newInvitationStrategy);
  // Retrieve the task promise from the request setted by the check
  var Task = req.queryObject;

  Task
  .populate('platforms')
  .exec(req.wrap(function(err,task){
    if (err) return next(err);

    log.trace('Task %s retrieved',task.id);
    task.invite(newInvitationStrategy,function(err){
      if(err) return next(err);

      res.status(200);
      res.json({});
    });
  }));

};


// Export the API object
exports = module.exports = API;