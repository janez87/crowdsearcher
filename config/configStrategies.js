'use strict';
// Load system modules
let path = require( 'path' );

// Load modules
let _ = require( 'lodash' );
let glob = require( 'glob' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function loadFromFolder( folder ) {
  let log = CS.log;
  let options = {
    cwd: folder
  };

  return glob( '*.js', options )
  .then( function( files ) {
    if ( !files ) return null;

    var requireFolder = path.join( '..', folder );

    var mapping = {};
    // Require each retrieved file.
    _.each( files, function( file ) {
      // Use the file name without extesion as the key.
      var key = file.slice( 0, -3 );
      // ... and load the file as the value.
      log.trace( 'Loading strategy %s', file );
      mapping[ key ] = require( path.join( requireFolder, file ) );
    } );

    return mapping;
  } );
}
function loadStrategies() {
  var log = CS.log;
  // Clone so the original wont be modified.
  var config = _.clone( this.get( 'strategies' ) );

  // retrieve the base path and remove it fom the object so we ca cycle over
  // the keys and load the strategies.
  var basePath = config.path;
  delete config.path;


  log.debug( 'Config: %j', config );
  log.debug( 'Config pairs: %j', _.toPairs( config ) );
  let pairs = _.toPairs( config );

  return Promise
  .map( pairs, ( data )=>{
    var container = data[ 0 ];
    var folder = path.join( basePath, data[ 1 ] );

    return loadFromFolder( folder )
    .then( ( strategies )=> {
      log.trace( '%s have %s strategies in %s: %j', container, _.size( strategies ), folder, strategies );
      // Add to the corresponding container in the `CS` global variable.
      CS[ container ] = strategies;
    })
  } )
}
function loadCustomRules() {
  var log = CS.log;
  var rulesPath = this.get( 'rules.path' );

  return Promise
  .bind( this )
  .return( rulesPath )
  .then( loadFromFolder )
  .then( function( mapping ) {
    // Make the rules public, under the `rules` key.
    CS.rules = mapping;
    log.trace( 'Rules: %j', mapping );
  } );
}
function configStrategies() {
  // Import the log, cannot be imported before because is not available.
  var log = CS.log;

  log.debug( 'Loading strategies and custom rules' );
  return Promise
  .all( [
    loadStrategies.call( this ),
    loadCustomRules.call( this ),
  ] )
  .then( ()=>{
    log.debug( 'Strategy and custom rules loading complete' );
  } )
}

// Module class declaration

// Module initialization (at first load)
glob = Promise.promisify( glob );

// Module exports
exports = module.exports = configStrategies;