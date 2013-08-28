// Load libraries
var _  = require('underscore');
var util  = require('util');

// Import a child Logger
var log = common.log.child( { component: 'Get Answer' } );

// Import Models
var Execution = common.models.execution;

// Generate custom error `GetAnswersError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetAnswersError = function( id, message, status ) {
  GetAnswersError.super_.call( this, id, message, status );
};
util.inherits( GetAnswersError, APIError );
// Custom error IDS
GetAnswersError.prototype.name = 'GetAnswersError';
GetAnswersError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    job: false,
    task: false,
    microtask: false,
    execution: false
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'answer',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getAnswer( req, res, next ) {
  log.trace( 'Get answer' );

  // At least one the parameters must be passed
  if( _.isUndefined(req.query.job) && _.isUndefined(req.query.task) && _.isUndefined(req.query.microtask) && _.isUndefined(req.query.execution) ){
    log.error('At least one parameter must be specified');
    return next( new GetAnswersError(
      GetAnswersError.MISSING_PARAMETERS,
      'All the parameter are undefined',
      APIError.BAD_REQUEST ) );
  }


  var filter = {};
  if( req.query.task )
    filter.task = req.query.task;
  if( req.query.microtask )
    filter.microtask = req.query.microtask;
  if( req.query.job )
    filter.job = req.query.job;
  if( req.query.execution )
    filter._id = req.query.execution;

  req.queryObject = Execution.find( filter ).sort( 'creationDate' );
  //.populate( 'performer platform annotations.operation' )
  return next();

  /*
  .exec( req.wrap( function( err, executions ) {
    if( err ) return next( err );

    log.trace( 'Found %s executions', executions.length );

    //var annotations = _.pluck( executions, 'annotations' );
    //annotations = _.flatten( annotations, true );
    //log.trace( 'Returning %s annotations', annotations.length );


    return res.json( executions );
  } ) );
  */
};


// Export the API object
exports = module.exports = API;