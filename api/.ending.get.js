// Load libraries
var util = require( 'util' );
var Showdown = require('showdown');
var converter = new Showdown.converter();

// Use a child logger
var log = CS.log.child( { component: 'Ending page' } );

// Import Models
var Task = CS.models.task;
var Job = CS.models.job;

// Generate custom error `GetEndingPageError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetEndingPageError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetEndingPageError.super_.call( this, id, message, status );
};
util.inherits( GetEndingPageError, APIError );

GetEndingPageError.prototype.name = 'GetEndingPageError';
// Custom error IDs
GetEndingPageError.NO_DATA = 'NO_DATA';
GetEndingPageError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    task: false,
    job: false
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'ending',

  // The API method to implement.
  method: 'GET'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function startExecution( req, res, next ) {
  log.trace( 'Ending page for %j', req.query );

  var taskId = req.query.task;
  var jobId = req.query.job;

  if( !taskId && !jobId )
    return next( new GetEndingPageError( GetEndingPageError.MISSING_PARAMETERS, 'All the parameter are undefined',APIError.BAD_REQUEST ) );

  var showEndingPage = function( err, objModel ) {
    if( err ) return next( err );

    if( !objModel )
      return next( new GetEndingPageError( GetEndingPageError.NO_DATA, 'No data retrieved from the DB', APIError.NOT_FOUND ) );

    var ending = objModel.ending;

    // Generate *ending*
    if( ending )
      ending = converter.makeHtml( ending );

    res.render( 'ending', {
      content: ending,
      data: objModel,
      lang: req.query.lang
    } );
  };

  var query;

  if( taskId ) {
    query = Task.findById( taskId );
  } else if( jobId ) {
    query = Job.findById( jobId );
  }

  query
  .exec( req.wrap( showEndingPage ) );
};


// Export the API object
exports = module.exports = API;