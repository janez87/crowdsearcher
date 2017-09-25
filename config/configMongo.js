'use strict';
// Load system modules
var fs = require( 'fs' );
var path = require( 'path' );

// Load modules
var _ = require( 'lodash' );
var Promise = require( 'bluebird' );
var mongoose = require( 'mongoose' );

// Load my modules
var CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function importModels() {
  var log = CS.log;
  var models = {};

  var modelsDir = this.get( 'mongo.modelsPath' );
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

function configMongo() {
  let log = CS.log;
  // Configure mongo
  try {
    mongoose.Promise = Promise;

    log.trace( 'Configuring mongodb using mongoose' );
    let mongoConfig = this.get( 'mongo' );

    let mongoUrl = mongoConfig.url;
    log.debug( 'Connecting to mongodb @ %s', mongoUrl );

    let db = mongoose.createConnection( mongoUrl, {
      safe: true,
      // promiseLibrary: Promise,
    } );

    let promise = new Promise( ( res, rej )=> {
      db.once( 'open', res );
      db.once( 'error', rej );
    } )

    return promise
    .then( ()=> {
      log.debug( 'Connected to Mongo!' );
      db.removeAllListeners( 'error' );
      db.removeAllListeners( 'open' );

      // Global shortcut
      CS.db = db;

      // Import models
      var models = importModels.call( this );
      CS.models = {};
      _.each( models, function( value, key ) {
        log.debug( 'Adding model %s', key );
        var model = db.model( key, value );

        CS.models[ key ] = model;
      } );
    } )
    ;
  } catch ( err ) {
    log.error( 'Mongo configuration error', err );
    return Promise.reject( err );
  }
}


// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = configMongo;
