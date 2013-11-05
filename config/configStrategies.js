// Load libraries
var _  = require('underscore');
var path = require( 'path' );
var nconf = require( 'nconf' );
var async = require( 'async' );
var glob = require('glob');
var CS = require( '../core' );


// # Configure the strategies and custom rules
//
// This configurator loads all the rules/strategies and expose them in the `CS` global variable.
function configStrategies( callback ) {
  // Import the log, cannot be imported before because is not available.
  var log = CS.log;

  function loadFromFolder( folder, cb ) {
    var options = {
      cwd: folder
    };
    glob( '*.js', options, function( err, files ) {
      if( err ) return cb( err );

      if( !files ) return cb();

      var requireFolder = path.join( '..', folder );

      var mapping = {};
      // Require each retrieved file.
      _.each( files, function ( file ) {
        // Use the file name without extesion as the key.
        var key = file.slice( 0, -3 );
        // ... and load the file as the value.
        mapping[ key ] = require( path.join( requireFolder, file ) );
      } );

      return cb( null, mapping );
    } );
  }


  function loadStrategies( cb ) {
    // Clone so the original wont be modified.
    var config = _.clone( nconf.get( 'strategies' ) );

    // retrieve the base path and remove it fom the object so we ca cycle over
    // the keys and load the strategies.
    var basePath = config.path;
    delete config.path;

    async.map( _.pairs( config ), function ( data, cb ) {
      var container = data[ 0 ];
      var folder = path.join( basePath, data[ 1 ] );

      loadFromFolder( folder, function( err, strategies ) {
        if( err ) return cb( err );


        log.trace( '%s have %s strategies in %s: %j', container, _.size( strategies ), folder, strategies );
        // Add to the corresponding container in the `CS` global variable.
        CS[ container ] = strategies;

        return cb();
      } );
    }, cb );
  }

  function loadCustomRules( cb ) {
    var path = nconf.get( 'rules:path' );
    loadFromFolder( path, function( err, mapping ) {
      if( err ) return cb( err );

      // Make the rules public, under the `rules` key.
      CS.rules = mapping;
      log.trace( 'Rules: %j', mapping );

      return cb();
    } );
  }

  async.parallel( [
    loadStrategies,
    loadCustomRules
  ], function ( err ) {
    if( err ) return callback( err );

    log.debug( 'Strategy and custom rules loading complete' );
    return callback();
  } );
}



// Export configuration function
exports = module.exports = configStrategies;