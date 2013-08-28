// Set the process name for the main process.
process.title = 'CrowdSearcher';


// Load the Cluster library.
var cluster = require( 'cluster' );
// Get the number of CPU (the logical cores),
// in order to launch one instance per core.
var numCPUs = require( 'os' ).cpus().length;

// Hask map containing the active workers.
// The key is the Worker id the value is an object
// and the value is an object containing the *Worker* (**worker**)
// and the *last callback* (**lastCb**)
var workers = {};


// Polling time, in *ms*, for checking the worker status.
var CHECK_WORKERS_INTERVAL = 5000;
// Max time of non response, in *ms*, before the worker is terminated.
var MAX_TIME = CHECK_WORKERS_INTERVAL*2;

// Delete the worker
// ----
var deleteWorker = function( pid ) {
  // If the worker *pid* exist
  if( workers.hasOwnProperty( pid )  ) {
    // ... then gracefully kill
    workers[ pid ].worker.disconnect();
    // and remove it from the available workers.
    delete workers[ pid ];
  }
};

// Create worker
// -----
var createWorker = function() {
  // Create a worker
  var worker = cluster.fork();
  console.log( 'Created worker with pid', worker.id );

  // add to the worker pool
  workers[ worker.id ] = {
    worker: worker,
    lastCb: Date.now()-CHECK_WORKERS_INTERVAL // Give the worker some time to start
  };


  // Now we need to handle message passing between the worker and the Master
  worker.on( 'message', function( mex ) {
    console.log( 'Message recieved by worker', mex.id );

    // Update last Callback time
    workers[ mex.id ].lastCb = Date.now();

    // Check memory usage
    /* TODO implement */
  } );

  // Manage worker events, not used.
  worker.on( 'online', function() {
    console.log( 'Worker', worker.id, 'online' );
  } );
  worker.on( 'disconnect', function() {
    console.log( 'Worker', worker.id, 'disconnected' );
  } );
  worker.on( 'listening', function( address ) {
    console.log( 'Worker listening @', address, 'disconnected' );
  } );
  worker.on( 'exit', function( code, signal ) {
    console.log( 'Worker ' + worker.id + ' killed by signal '+signal+'('+code+'). restarting...' );
  } );
};


// Function that checks all the Workers available.
var checkWorkers = function() {

  // For each worker
  for( var id in workers ) {
    // get current time
    var time = Date.now();

    // if the worker exists and its not responding then kill it!
    if( workers.hasOwnProperty( id ) &&
        (workers[ id ].lastCb+MAX_TIME)<time ) {

      // Nice log for a murder...
      console.log( 'Long running worker', id, 'detected, klling it' );

      // delete the worker
      deleteWorker( id );
      // ...and spawn a new one
      createWorker();
    }
  }
};

// We need to check each **Worker** every *CHECK_WORKERS_INTERVAL*
setInterval( checkWorkers, CHECK_WORKERS_INTERVAL );




// Setup the behaviour of the *cluster.fork()* method,
// specifing the script to fork.
cluster.setupMaster( {
  exec: 'cs.js'
} );

// Now we have defined all the required functions
// and checks, we are ready to **start the server cluster**!
for( var i=0; i<numCPUs; i++ ) {
  createWorker();
}
