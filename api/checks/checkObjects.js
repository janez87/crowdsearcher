

// Load libraries
var _  = require('underscore');
var util  = require('util');

// Import a child Logger
var log = common.log.child( { component: 'Check Objects' } );

// Import the ObjectModel
var ObjectModel = common.models.object;

// Generate custom error `CheckObjectsError` that inherits
// from `APIError`
var APIError = require( '../error' );
var CheckObjectsError = function( id, message, status ) {
  CheckObjectsError.super_.call( this, id, message, status );
};
util.inherits( CheckObjectsError, APIError );

CheckObjectsError.prototype.name = 'CheckObjectsError';
// Custom error IDs
CheckObjectsError.MISSING_OBJECTS = 'MISSING_OBJECTS';
//CheckObjectsError.NO_OBJECT_PASSED = 'NO_OBJECT_PASSED';



// Export middleware
exports = module.exports = function checkObjects( req, res, next ) {
  // Get the object list from the request body
  var objects = req.body.objects;

  if( _.isUndefined( objects ) )
    return next( new CheckObjectsError( CheckObjectsError.MISSING_OBJECTS, 'Missing objects', APIError.BAD_REQUEST ) );

  /*
  if(req.body.objects.length===0)
    return next( new CheckObjectsError( CheckObjectsError.NO_OBJECT_PASSED, 'No object passed', APIError.BAD_REQUEST ) );
  */

  // Translate into array if it is a single object
  if( !_.isArray( objects ) )
    objects = [ objects ];

  log.trace( 'Checking %s objects', objects );


  // Find all the object
  ObjectModel.find()
  // where id is in the set `objects`
  .where( '_id' )['in']( objects )
  // and output only the `id` and `job` fields
  .select( 'id job' )
  // Return plain objects, to optimize performance
  .lean()
  // execute
  .exec( req.wrap( function( err, results ) {
    if( err ) return next( err );

    log.trace( 'Results of the query', results );
    //TODO: add checks on the objects

    // Pass the objects retrieved
    req.objects = results;

    return next();
  } ) );
};