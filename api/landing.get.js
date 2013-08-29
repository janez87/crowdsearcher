// Load libraries
var util = require( 'util' );
var nconf = require( 'nconf' );
var querystring = require( 'querystring' );
var Showdown = require('showdown');
var converter = new Showdown.converter();

// Use a child logger
var log = common.log.child( { component: 'Landing page' } );

// Import Models
var Task = common.models.task;
var Job = common.models.job;

// Generate custom error `GetLandingPageError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetLandingPageError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetLandingPageError.super_.call( this, id, message, status );
};
util.inherits( GetLandingPageError, APIError );

GetLandingPageError.prototype.name = 'GetLandingPageError';
// Custom error IDs
GetLandingPageError.NO_DATA = 'NO_DATA';
GetLandingPageError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


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
  url: 'landing',

  // The API method to implement.
  method: 'GET'
};


// API core function logic. If this function is executed then each check is passed.
API.logic = function getLanding( req, res, next ) {
  log.trace( 'Landing page for %j', req.query );

  var taskId = req.query.task;
  var jobId = req.query.job;
  var alias = req.query.alias;

  if( !taskId && !jobId && !alias )
    return next( new GetLandingPageError( GetLandingPageError.MISSING_PARAMETERS, 'All the parameter are undefined',APIError.BAD_REQUEST ) );

  var showLandingPage = function( err, objModel ) {
    if( err ) return next( err );

    if( !objModel )
      return next( new GetLandingPageError( GetLandingPageError.NO_DATA, 'No data retrieved from the DB', APIError.NOT_FOUND ) );

    var landing = objModel.landing || objModel.description;

    // Generate *run* url
    var url = req.query.baseUrl;
    delete req.query.baseUrl;

    // Check if the buttons must be removed
    var showLink = true;
    if( req.query.show ) {
      // If false set to false, otherwise pass the value as is.
      // E.G. used when `show` is `bottom`
      showLink = req.query.show==='false'? false : req.query.show;
      delete req.query.show;
    }

    // If the url is not specified then retrieve the CS url from the configuration.
    if( !url || url.length===0 ) {
      url = nconf.get( 'webserver:externalAddress' )+'api/run';
    }
    // Append the query string poarameters
    url += '?'+querystring.stringify( req.query );


    // Generate *landing* page
    if( landing )
      landing = converter.makeHtml( landing );

    var data = {
      content: landing,
      link: url,
      data: objModel,
      showLink: showLink,
      lang: req.query.lang
    };

    res.format( {
      json: function() {
        res.json( data );
      },
      html: function() {
        res.render( 'landing', data );
      }
    } );
  };

  var query;

  if( taskId ) {
    query = Task.findById( taskId );
  } else if( jobId ) {
    query = Job.findById( jobId );
  } else if( alias ) {
    query = Job.findByAlias( alias );
  }

  query
  .exec( req.wrap( showLandingPage ) );
};


// Export the API object
exports = module.exports = API;