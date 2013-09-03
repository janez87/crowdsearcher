

// Load libraries
var util = require( 'util' );

// Use a child logger
//var log = common.log.child( { component: 'Get Job' } );

// Generate custom error `GetJobError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetJobError = function( id, message, status ) {
  GetJobError.super_.call( this, id, message, status );
};
util.inherits( GetJobError, APIError );

GetJobError.prototype.name = 'GetJobError';
// Custom error IDs


// API object returned by the file
// -----
var API = {
  // List of checks to perform. Each file is execute
  // *in order* as an express middleware.
  checks: [
    'checkJobId'
  ],
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    job: true
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'job',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getJob( req, res, next ) {
  return next();
  /*
  // The objects must be shuffled?
  var shuffle = !!req.query.shuffle;
  var job = req.job;

  var returnJob = function( job ) {
    var jobObject = job.toObject( {
      virtuals: true
    } );

    if( shuffle )
      jobObject.objects = _.shuffle( jobObject.objects );
    
    // Return the object
    res.json( jobObject );
  };

  if( req.query.populate ) {
    var populate = req.query.populate;

    if( !_.isArray( populate ) )
      populate = [ populate ];

    log.trace( 'Populate: %j', populate );
    
    job
    .populate( {
      path: populate.join( ' ' ),
      options: {
        lean: true
      }
    }, req.wrap( function( err, job ) {
      if( err ) return next( err );

      return returnJob( job );
    } ) );
  } else {
    returnJob( job );
  }
  */
};


// Export the API object
exports = module.exports = API;