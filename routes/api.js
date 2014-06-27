// Load libraries
var _ = require( 'underscore' );
var fs = require( 'fs' );
var util = require( 'util' );
var path = require( 'path' );
var MongoError = require( 'mongoose' ).Error;
var nconf = require( 'nconf' );
var glob = require( 'glob' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( {
  component: 'API Routes'
} );

// Import the `APIError` Class to generate errors
var APIError = require( '../api/error' );

// HashMap used to store the params of each API. Data are saved
// in the format:
//      'apiID' -> params
var apiMapping = {};

// Function used to generate APIid
var getAPIid = function( method, endpoint ) {
  return method.toLowerCase() + '-' + endpoint;
};


// Custom Errors
// ---
// Generate custom error `MissingAPIError` that inherits
// from `APIError`
var MissingAPIError = function( id, message, status ) {
  /* jshint camelcase: false */
  MissingAPIError.super_.call( this, id, message, status );
};
util.inherits( MissingAPIError, APIError );

MissingAPIError.prototype.name = 'MissingAPIError';
// Custom error IDs
MissingAPIError.API_MISSING = 'API_MISSING';


// Generate custom error `MissingParameterError` that inherits
// from `APIError`
var MissingParameterError = function( id, message, status ) {
  /* jshint camelcase: false */
  MissingParameterError.super_.call( this, id, message, status );
};
util.inherits( MissingParameterError, APIError );
MissingParameterError.prototype.name = 'MissingParameterError';
MissingParameterError.MISSING_PARAMETERS = 'MISSING_PARAMETERS';


// Generate custom error `ObjectNotFoundError` that inherits
// from `APIError`
var ObjectNotFoundError = function( id, message, status ) {
  /* jshint camelcase: false */
  ObjectNotFoundError.super_.call( this, id, message, status );
};
util.inherits( ObjectNotFoundError, APIError );
ObjectNotFoundError.prototype.name = 'ObjectNotFoundError';
ObjectNotFoundError.OBJECT_NOT_FOUND = 'OBJECT_NOT_FOUND';








// Middlewares
// --
// Handle errors of the APIs
var errorHandler = function( err, req, res, next ) {
  // If the error is not coming from the API subpath,
  // then forward it to the next error handler
  if ( !/^\/api.*/i.test( req.path ) ) return next( err );

  // Handle API error
  if ( err instanceof APIError ) {
    log.error( 'Api Error', err );
    log.error( err, err.toString() );
    res.status( err.status || APIError.SERVER_ERROR );
    res.json( err );
    // Handle Mongoose errors
  } else if ( err instanceof MongoError ) {
    log.error( 'Mongo Error', err );
    log.error( err.stack );
    res.status( APIError.SERVER_ERROR );
    res.json( {
      message: err.message,
      id: err.name,
      stack: err.stack
    } );
    // Handle general Errors
  } else {
    log.error( 'General Error', err );
    log.error( err.stack );
    res.status( APIError.SERVER_ERROR );
    var message = err.name.length ? err.name + ': ' : '';
    message += err.message;
    res.json( {
      message: message,
      id: err.id || err.name,
      stack: err.stack
    } );
  }
};

// Middleware used to check the parameters for each API request
var checkParams = function( req, res, next ) {
  // Lookup API name
  var apiID = getAPIid( req.method, req.path );
  var params = apiMapping[ apiID ];

  if ( !_.isUndefined( params ) ) {
    for ( var param in params ) {
      var required = params[ param ];
      log.trace( 'Parameter %s is required? %s', param, required );

      if ( required && _.isUndefined( req.query[ param ] ) ) {
        var msg = 'Missing required parameter "' + param + '"';
        return next( new MissingParameterError( MissingParameterError.PARAMETER_MISSING, msg, APIError.BAD_REQUEST ) );
      }
    }
  }

  return next();
};


// Last middleware for operations, apply selectors/filters/population to the mongoose query
var apiOperations = function( req, res, next ) {
  var query = req.queryObject;

  // Must populate something?
  if ( req.query.populate ) {
    log.trace( 'Adding field population' );
    var populateFields = req.query.populate;

    if ( !_.isArray( populateFields ) )
      populateFields = [ populateFields ];


    // Join the array of fields to populate with a `space`.
    query
      .populate( populateFields.join( ' ' ) );
  }


  // Must select a subset of fields?
  if ( req.query.select ) {
    log.trace( 'Adding field selection' );
    var selectedFields = req.query.select;

    if ( !_.isArray( selectedFields ) )
      selectedFields = [ selectedFields ];

    log.trace( 'Selected fields: %j', selectedFields );
    // Join the array of fields to populate with a `space`.
    query
      .select( selectedFields.join( ' ' ) );
  }

  /*
  if ( req.bulk )
    query.lean();
  */
  
  query.exec( req.wrap( function( err, data ) {
    if ( err ) return next( err );

    if ( !data )
      return next( new ObjectNotFoundError( ObjectNotFoundError.OBJECT_NOT_FOUND, 'Object not fond in the db', APIError.SERVER_ERROR ) );


    // The suffling is not a mongoose operation so it must be done when the data is available.
    if ( req.query.shuffle && !req.bulk ) {
      log.trace( 'Shuffling data' );
      var shuffleFields = String( req.query.shuffle );

      // if not specified, shuffle the data field
      if ( shuffleFields === 'true' )
        shuffleFields = [ 'objects' ];

      if ( !_.isArray( shuffleFields ) )
        shuffleFields = [ shuffleFields ];

      // Shuffle each `shuffleFields`
      _.each( shuffleFields, function( field ) {
        if ( _.isArray( data[ field ] ) )
          data[ field ] = _.shuffle( data[ field ] );
      } );
    }

    if ( _.isArray( data ) ) {
      data = _.map( data, function( e ) {
        return e.toObject( {
          getters: true
        } );
      } );
      res.json( data );

    } else {
      res.json( data.toObject( {
        getters: true
      } ) );
    }
  } ) );
};


// Log API request
var logRequest = function( req, res, next ) {

  log.debug( 'Calling %s %s', req.method, req.path );
  log.trace( 'with parameters %j', req.query );

  next();
};

// API binding
// --
// Missing API function
var missingAPI = function( req, res, next ) {
  var msg = 'The endPoint ' + req.method + ' ' + req.path + ' does not exist';
  log.error( msg );
  return next( new MissingAPIError( MissingAPIError.API_MISSING, msg, APIError.NOT_IMPLEMENTED ) );
};

// Core function for binding the APIs
var bindApi = function( app ) {
  var apiUrlPath = nconf.get( 'api:urlPath' ) || 'api';
  var apiBasePath = nconf.get( 'api:path' ) || 'api';

  log.trace( 'API base path: %s', apiBasePath );
  log.trace( 'API base url: %s', apiUrlPath );

  // Load APIs from the `apiBasePath` directory
  var options = {
    cwd: apiBasePath,
    sync: true
  };
  glob( '*.js', options, function( err, apis ) {
    if ( err ) return log.error( err );

    if ( !apis ) return log.debug( 'No API loaded' );

    _.each( apis, function( apiFile ) {
      var match = apiFile.match( /(.*)\.js/i );

      // Grab the API name from the file name.
      var apiName = match[ 1 ];
      log.trace( 'Loading %s API', apiName );

      apiFile = path.join( __dirname, '..', apiBasePath, apiFile );

      // Load the API object
      var API = require( apiFile );

      // if not present then set to default some values
      API.checks = API.checks || [];
      API.params = API.params || {};
      API.url = API.url || apiName;
      API.method = API.method || 'GET';
      API.method = API.method.toLowerCase();


      // Default API middlewares
      var apiMiddlewares = [
        logRequest,
        checkParams
      ];

      // Additional API middlewares
      if ( API.checks ) {
        _.each( API.checks, function( checkName ) {
          var checkFile = path.join( __dirname, '..', apiBasePath, 'checks', checkName + '.js' );

          if ( !fs.existsSync( checkFile ) ) {
            log.error( 'Unable to load api check function "%s" for "%s %s", fileName: %s', checkName, API.method, apiName, checkFile );
            return; // skip current API check
          }

          // Load the API check
          var checkMiddleware = require( checkFile );
          log.trace( 'Adding %s check to %s', checkName, apiName );

          // Add to the middlewares
          apiMiddlewares.push( checkMiddleware );
        } );
      }

      // Generate API endpoint
      var apiUrl = '/' + apiUrlPath + '/' + API.url;
      log.debug( 'Adding api endPoint "%s %s" to %s', API.method, apiUrl, apiName );

      // Let the `app` listen to this endpoint
      app[ API.method ]( apiUrl, apiMiddlewares, API.logic, apiOperations );


      // Generate a unique API id.
      var apiID = getAPIid( API.method, apiUrl );
      // This mapping is used to reverse lookup the parameters in the function `checkParams`.
      apiMapping[ apiID ] = API.params;
    } );
  } );

  // Handle random call to the `api/*` endpoint
  app.all( '/' + apiUrlPath + '/*', missingAPI );

  // Error middleware used to handle API errors properly
  app.use( errorHandler );
};

// Export the webserver configuration
exports = module.exports = bindApi;