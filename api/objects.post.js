// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var CS = require( '../core' );

// Use a child logger
//var log = CS.log.child( { component: 'POST Objects' } );

// Generate custom error `PostObjectsError` that inherits
// from `APIError`
var APIError = require( './error' );
var PostObjectsError = function( id, message, status ) {
  /* jshint camelcase: false */
  PostObjectsError.super_.call( this, id, message, status );
};
util.inherits( PostObjectsError, APIError );

PostObjectsError.prototype.name = 'PostObjectsError';
// Custom error IDs
PostObjectsError.MISSING_OBJECTS = 'MISSING_OBJECTS';
PostObjectsError.OBJECTS_NOT_ARRAY = 'OBJECTS_NOT_ARRAY';
PostObjectsError.OBJECTS_NOT_PROVIDED = 'OBJECTS_NOT_PROVIDED';


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
  url: 'objects',

  // The API method to implement.
  method: 'POST'
};



// API core function logic. If this function is executed then each check is passed.
API.logic = function postObjects( req, res, next ) {

  var rawData = _.clone( req.body );

  if ( _.isUndefined( rawData.objects ) )
    return next( new PostObjectsError( PostObjectsError.MISSING_OBJECTS, 'The required field objects is missing', APIError.BAD_REQUEST ) );

  if ( !_.isArray( rawData.objects ) )
    return next( new PostObjectsError( PostObjectsError.OBJECTS_NOT_ARRAY, 'The objects field is not an Array', APIError.BAD_REQUEST ) );

  if ( rawData.objects.length === 0 )
    return next( new PostObjectsError( PostObjectsError.OBJECTS_NOT_PROVIDED, 'No objects present in the object field', APIError.BAD_REQUEST ) );

  //TODO: make dependent on the passed id, Job or Task

  req.queryObject.exec( function( err, task ) {
    if ( err ) return next( err );

    task.addObjects( rawData.objects, function( err, objects ) {
      if ( err ) return next( err );

      // return only the ids of the objects
      var objectIds = _.map( objects, function( obj ) {
        return obj.id;
      } );

      //TODO: trigger event ADD_OBJECT
      return res.json( {
        objects: objectIds
      } );
    } );

  } );
};


// Export the API object
exports = module.exports = API;