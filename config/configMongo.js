// Load Libraries
var _ = require( 'underscore' );
var fs = require( 'fs' );
var path = require( 'path' );
var semver = require( 'semver' );
var nconf = require( 'nconf' );
var mongo = require( 'mongoose' );
var CS = require( '../core' );


function importModels() {
  var log = CS.log;
  var models = {};

  var modelsDir = nconf.get( 'mongo:modelsPath' );
  var modelList = fs.readdirSync( modelsDir );
  var modelMatch = /^([a-z]\w*)\.js$/i;

  _.each( modelList, function( modelName ) {

    if ( !modelName.match( modelMatch ) ) {
      log.trace( 'Skip model from file: %s', modelName );
    } else {
      log.trace( 'Loading model from file: %s', modelName );
      var modelFile = path.join( '..', modelsDir, modelName );
      var match = modelName.match( modelMatch );
      log.trace( 'Model File: %s', modelFile );
      models[ match[ 1 ] ] = require( modelFile );
    }
  } );


  return models;
}

function configMongo( callback ) {
  var log = CS.log;
  // Configure mongo
  try {
    /*
    var mongooseLog = log.child( { component: 'Mongoose' } );
    mongo.set('debug', function( collectionName, method, query ) {
      mongooseLog.trace( '%s on %s: %j', method, collectionName, query );
    } );
    */

    log.trace( 'Configuring mongodb using mongoose' );
    var mongoConfig = nconf.get( 'mongo' );

    var mongoUrl = mongoConfig.url;
    log.debug( 'Connecting to mongodb @ %s', mongoUrl );

    var db = mongo.createConnection( mongoUrl, {
      safe: true
    } );

    db.on( 'error', function mongoError( err ) {
      log.error( 'Mongo error!' );
      //TODO: ERROR, fix can be triggered anytime
      return callback( err );
    } );
    db.once( 'open', function mongoOpen() {
      log.debug( 'Connected to Mongo!' );

      var admin = new mongo.mongo.Admin( db.db );

      admin.buildInfo( function( err, info ) {
        log.trace( 'MongoDB info %j', info );
        log.trace( 'MongoDB version %s', info.version );
        CS.mongoVersion = info.version;
        if( semver.gt( CS.mongoVersion, '2.1.0' ) )
          log.trace( 'Aggregation framework enabled!' );
      } );

      db.removeAllListeners( 'error' );

      // Global shortcut
      CS.db = db;

      // Import models
      var models = importModels();
      CS.models = {};
      _.each( models, function( value, key ) {
        log.debug( 'Adding model %s', key );
        var model = db.model( key, value );

        CS.models[ key ] = model;
      } );

      return callback();
    } );

  } catch ( err ) {
    console.error( 'Mongo configuration error', err );
    return callback( err );
  }
}



// Export configuration function
exports = module.exports = configMongo;