

// Load libraries
var _  = require('underscore');
var util  = require('util');
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( { component: 'Get Object' } );


// Import models
var ObjectModel = CS.models.object;


// Generate custom error `GetObjectError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetObjectError = function( id, message, status ) {
  /* jshint camelcase: false */
  GetObjectError.super_.call( this, id, message, status );
};
util.inherits( GetObjectError, APIError );
// Custom error IDS
GetObjectError.prototype.name = 'GetObjectError';


// API object returned by the file
// -----
var API = {
  // List of API parameters. In the format
  //      name: required
  // ... the required parameters will be verified automatically.
  params: {
    // Single object selection
    object: false,
    // multiple object selection
    objects: false
  },

  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: 'objects',

  // The API method to implement.
  method: 'GET'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function getObject( req, res, next ) {

  // Get the list of object id from the querystring
  var objects = req.query.object;
  // Add the object to the list
  if( !_.isArray( objects ) )
    objects = [ objects ];

  log.trace( 'Object list: %j', objects );

  req.queryObject = ObjectModel
   // Find all the object
  .find()
  // where id is in the set `objects`
  .where( '_id' )['in']( objects );
  /*
  // execute
  .exec( req.wrap( function( err, results ) {
    if( err ) return next( err );

    // Pass the objects retrieved
    res.json( results.length===1? results[0] : results );
  } ) );
  */

  return next();
};


// Export the API object
exports = module.exports = API;