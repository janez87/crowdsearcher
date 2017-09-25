

'use strict';
var util = require( 'util' );

// Use a child logger
//var log = CS.log.child( { component: 'Get Task' } );

// Generate custom error `GetTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetTaskError = function( id, message, status ) {
  GetTaskError.super_.call( this, id, message, status );
};
util.inherits( GetTaskError, APIError );

GetTaskError.prototype.name = 'GetTaskError';
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
  url: 'task',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getTask( req, res, next ) {
  return next();
  /*
  // The objects must be shuffled?
  var shuffle = !!req.query.shuffle;
  var task = req.task;

  var returnTask = function( task ) {
    var taskObject = task.toObject( {
      virtuals: true
    } );

    if( shuffle )
      taskObject.objects = _.shuffle( taskObject.objects );

    // Return the object
    res.json( taskObject );
  };

  if( req.query.populate ) {
    var populate = req.query.populate;

    if( !_.isArray( populate ) )
      populate = [ populate ];

    log.trace( 'Populate: %j', populate );

    task
    .populate( {
      path: populate.join( ' ' ),
      options: {
        lean: true
      }
    }, req.wrap( function( err, task ) {
      if( err ) return next( err );

      return returnTask( task );
    } ) );
  } else {
    returnTask( task );
  }
  */
};


// Export the API object
exports = module.exports = API;