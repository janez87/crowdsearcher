

// Load libraries
var util = require( 'util' );

// Use a child logger
var log = common.log.child( { component: 'Post Replan' } );

// Generate custom error `Replan` that inherits
// from `APIError`
var APIError = require( './error' );
var Replan = function( id, message, status ) {
  Replan.super_.call( this, id, message, status );
};
util.inherits( Replan, APIError );

Replan.prototype.name = 'Replan';
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
  url: 'replan',

  // The API method to implement.
  method: 'POST'
};


// API core function logic. If this function is executed then each check is passed.
// In the request you can pass a new splitting strategy (passing a splitting object)
API.logic = function invite( req, res, next ) {
  log.trace( 'Replan post' );

  // Get the new invitatin strategy from the request
  var newSplittingStrategy = req.body.splittingStrategy;
  var platformName = req.body.platform;

  log.trace('New invitation strategy: %j',newSplittingStrategy);
  log.trace('Selected platform %s',platformName);

  // Retrieve the task promise from the request setted by the check
  var Task = req.queryObject;

  Task
  .exec(req.wrap(function(err,task){
    if (err) return next(err);

    log.trace('Task %s retrieved',task.id);
    task.replan(newSplittingStrategy,platformName,function(err){
      if(err) return next(err);

      res.status(200);
      res.json({});
    });
  }));

};


// Export the API object
exports = module.exports = API;