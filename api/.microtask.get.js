

// Load libraries
var util  = require('util');

// Import a child Logger
//var log = common.log.child( { component: 'Get MicroTask' } );

// Generate custom error `GetMicroTaskError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetMicroTaskError = function( id, message, status ) {
  GetMicroTaskError.super_.call( this, id, message, status );
};
util.inherits( GetMicroTaskError, APIError );
// Custom error IDS
GetMicroTaskError.prototype.name = 'GetMicroTaskError';


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkMicroTaskId'
  ],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    microtask: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'microtask',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getMicroTask( req, res, next ) {
  return next();
  /*
  // The objects must be shuffled?
  var shuffle = !!req.query.shuffle;
  var microtask = req.microtask;

  log.trace( 'Query? %j', req.query );

  var returnMicrotask = function( microtask ) {
    var microtaskObject = microtask.toObject( {
      virtuals: true
    } );

    log.trace( 'Shuffle the objects? %s', shuffle );
    if( shuffle )
      microtaskObject.objects = _.shuffle( microtaskObject.objects );
    
    // Return the object
    res.json( microtaskObject );
  };

  if( req.query.populate ) {
    var populate = req.query.populate;

    if( !_.isArray( populate ) )
      populate = [ populate ];

    log.trace( 'Populate: %j', populate );
    
    microtask
    .populate( {
      path: populate.join( ' ' ),
      options: {
        lean: true
      }
    }, req.wrap( function( err, microtask ) {
      if( err ) return next( err );

      return returnMicrotask( microtask );
    } ) );
  } else {
    return returnMicrotask( microtask );
  }
  */
};


// Export the API object
exports = module.exports = API;