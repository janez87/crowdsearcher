// Load libraries
var CS = require( '../core' );
var async = require( 'async' );


// Configure Task Types
// ---
function configActiveJobs( callback ) {
  // Import the log, cannot be imported before because is not available
  var log = CS.log;

  var ActiveJob = CS.models.activeJob;
  // Wrap into a `try catch` to handle all errors


  ActiveJob
    .find()
    .populate( 'platform microtask' )
    .exec( function( err, activeJobs ) {
      if ( err ) return callback( err );

      var startJob = function( j, cb ) {

        var microtask = j.microtask;
        var platform = j.platform;

        log.trace( 'Recovering the job for the microtask %s', microtask );
        return CS.startJob( platform, microtask, cb );
      };

      async.each( activeJobs, startJob, callback );
    } );
}



// Export configuration function
exports = module.exports = configActiveJobs;