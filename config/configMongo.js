
// Load Libraries
var _  = require('underscore');
var fs  = require('fs');
var path = require( 'path' );
var nconf = require( 'nconf' );
var mongo = require('mongoose');
//require( 'express-mongoose' );


function importModels() {
  var log = common.log;
  var models = {};

  var modelsDir = nconf.get( 'mongo:modelsPath' );

  var modelList = fs.readdirSync( modelsDir );

  var modelMatch = /^([a-z]\w*)\.js$/i;
  _.each( modelList, function( modelName ) {

    if( !modelName.match( modelMatch ) ) {
      log.trace( 'Skip model from file: %s', modelName );
    } else {
      log.trace( 'Loading model from file: %s', modelName );
      var modelFile = path.join( '..', modelsDir, modelName );
      var match = modelName.match( modelMatch );
      log.trace( 'Model File: %s', modelFile );
      models[ match[1] ] = require( modelFile );
    }
  } );

  return models;
}

function configMongo( callback ) {
  var log = common.log;
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

    // Check if mongo path exists
    var mongoPath = path.join( __dirname, '..', mongoConfig.path );
    if( !fs.existsSync( mongoPath ) ) {
      log.trace( 'Creating mongo data directory' );
      fs.mkdirSync( mongoPath );
    }

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

      db.removeAllListeners( 'error' );

      // Global shortcut
      common.db = db;

      // Import models
      var models = importModels();
      common.models = {};
      _.each( models, function( value, key ) {
        log.trace( 'Adding model %s', key );
        var model = db.model( key, value );
        common.models[ key ] = model;
      } );

      callback();
    } );

  } catch( err ) {
    console.error( 'Mongo configuration error', err );
    callback( err );
  }
}



// Export configuration function
exports = module.exports = configMongo;