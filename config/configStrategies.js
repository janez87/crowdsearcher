// Load libraries
var _  = require('underscore');
var path = require( 'path' );
var nconf = require( 'nconf' );
var async = require( 'async' );
var glob = require('glob');


// Configure Operations
// ---
function configOperations( callback ) {
  // Import the log, cannot be imported before because is not available
  var log = common.log;

  // Wrap into a `try catch` to handle all errors
  try {
    log.trace( 'Configuring Strategy list' );

    // Get the configuration object
    var scriptConfiguration = nconf.get( 'scripts' );


    function findStrategies( callback ) {
      // Compose the strategies base directory
      var scriptBaseDir = path.join( scriptConfiguration.path, 'strategies' );


      var options = {
        cwd: scriptBaseDir
      };
      glob( '*/*.js', options, function( err, files ) {
        if( err ) return callback( err );

        if( !files ) return callback();

        var strategies = {};

        _.each( files, function( file ) {
          var match = file.match( /(.*)\/(.*)\.js/i );

          // something went wrong with the match
          if( !match ) return;

          // First match will contain the *underscored* folder name.
          var strategyContainer = match[1];
          // Convert `this_string` into `ThisString`
          strategyContainer = _.classify( strategyContainer );
          // lowercase the first letter
          strategyContainer = strategyContainer[ 0 ].toLowerCase()+strategyContainer.slice(1);

          // Second match will contain the strategy name.
          var strategyName = match[2];

          log.trace( 'Loading %s into %s', strategyName, strategyContainer );
          file = '../'+scriptBaseDir + '/' + file;

          var container = strategies[ strategyContainer ] || {};
          container[ strategyName ] = require( file );

          strategies[ strategyContainer ] = container;
        } );

        // Create the global container for the strategies
        GLOBAL.common.strategies = strategies;

        // return
        return callback();
      } );
    }

    function findCustomRules( callback ) {
      // Compose the custom rules base directory
      var customRuleBaseDir = path.join( scriptConfiguration.path, 'default' );


      var options = {
        cwd: customRuleBaseDir
      };
      glob( '*.js', options, function( err, files ) {
        if( err ) return callback( err );

        if( !files ) return callback();

        var customRules = {};

        _.each( files, function( file ) {
          var match = file.match( /(.*)\.js/i );

          // something went wrong with the match
          if( !match ) return;

          var customRuleName = match[1];

          log.trace( 'Loading custom rule "%s"', customRuleName );
          file = '../'+customRuleBaseDir + '/' + file;

          customRules[ customRuleName ] = require( file );
        } );

        // Create the global container for the strategies
        GLOBAL.common.customRules = customRules;

        // return
        return callback();
      } );
    }


    async.parallel( [
      findStrategies,
      findCustomRules
    ], callback );

    /*
    // Mapping from the prpperty name to the folder containing
    // the corresponding strategy
    var mapping = {
      executionAssignment: 'execution_assignment',
      taskAssignment: 'task_assignment',
      microtaskAssignment: 'microtask_assignment',
      splitting: 'splitting',
      implementation: 'implementation',
      invitation: 'invitation'
    };

    // For each strategy folder load the files and add the logic
    // into the global strategies object (in the right place).
    _.each( mapping, function( folderName, propertyName ) {

      // Add the property to the strategy list
      strategies[ propertyName ] = {};

      // Load each file in the folder
      var strategyList = fs.readdirSync( path.join( scriptBaseDir, folderName ) );

      var strategyMatch = /^([a-z]\w*)\.js$/i;
      _.each( strategyList, function( strategyFile ) {

        if( !strategyFile.match( strategyMatch ) ) {
          log.trace( 'Skip strategy from file: %s', strategyFile );
        } else {
          log.trace( 'Loading %s strategy from file: %s', propertyName, strategyFile );

          var strategyFullPath = path.join( '..', scriptBaseDir, folderName, strategyFile );

          var match = strategyFile.match( strategyMatch );

          strategies[ propertyName ][ match[1] ] = require( strategyFullPath );
        }
      } );
    } );
    */
  } catch( err ) {
    console.error( 'Strategies configuration error', err );
    callback( err );
  }
}



// Export configuration function
exports = module.exports = configOperations;