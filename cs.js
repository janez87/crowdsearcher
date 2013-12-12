process.title = 'CrowdSearcher';

Error.stackTraceLimit = process.env.PRODUCTION ? 15 : Infinity;

// Cluster related
var cluster = require( 'cluster' );

if ( cluster.isWorker ) {
  var REPORT_STATS_INTERVAL = 5000;
  var reportStats = function() {
    process.send( {
      cmd: 'stats',
      id: cluster.worker.id,
      memory: process.memoryUsage()
    } );
  };

  setInterval( reportStats, REPORT_STATS_INTERVAL );
}

// Get the Configurator class
var Configurator = require( './config' );


// # Create the Express Object
var express = require( 'express' );
// Create the express application
var app = express();

// Load libraries
var _ = require( 'underscore' );
var fs = require( 'fs' );
var url = require( 'url' );
var path = require( 'path' );
var flash = require( 'connect-flash' );
var nconf = require( 'nconf' );
var domain = require( 'domain' );
var passport = require( 'passport' );
var moment = require( 'moment' );
var markdown = require( 'markdown' ).markdown;
var CS = require( './core' );

// Configure the Express app
// ---
// Directories
var publicPath = path.join( __dirname, 'public' );
var viewsPath = path.join( __dirname, 'views' );
var uploadPath = path.join( __dirname, 'uploads' );

// Create upload path if not exists
if ( !fs.existsSync( uploadPath ) )
  fs.mkdirSync( uploadPath );

// Use JADE as template engine
app.set( 'views', viewsPath );
app.set( 'view engine', 'jade' );

// Export some properities to the views
app.locals( {
  // Like the title
  title: 'CrowdSearcher',
  md: markdown.toHTML,
  moment: moment,
  _: _
} );


// Create a Domain to handle errors properly *for each request*
app.use( function( req, res, next ) {

  var requestDomain = domain.create();
  // Add the domain to the request, so ca be `exited` later
  req.domain = requestDomain;

  // Utility function used to wrap an async call to the api domain
  var wrapInDomain = function( fn, ctx ) {
    if ( _.isString( fn ) && !_.isUndefined( ctx ) )
      fn = ctx[ fn ];

    if ( ctx )
      fn = fn.bind( ctx );

    return requestDomain.bind( fn );
  };
  // Can be invoked using either `req.wrap` or `req.wrapInDomain`.
  req.wrapInDomain = req.wrap = wrapInDomain;

  // Bind Emitters
  requestDomain.add( req );
  requestDomain.add( res );

  // On Domain error call the error middleware
  requestDomain.on( 'error', next );

  // Enter the domain to manage request unhandled exceptions
  requestDomain.enter();
  return next();
} );

// Use icon
app.use( express.favicon() );

// Log all the requests?
//app.use(express.logger('dev'));

// Used to handle uploaded files
app.use( express.bodyParser( {
  uploadDir: uploadPath
} ) );
app.use( express.methodOverride() );

// ## CORS middleware
//
// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
function allowCrossDomain( req, res, next ) {
  if ( req.path.split( '/' )[ 1 ] === 'api' ) {
    res.header( 'Access-Control-Allow-Origin', '*' );
    res.header( 'Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE' );
    res.header( 'Access-Control-Allow-Headers', '*' );
    //res.header('Access-Control-Allow-Headers', 'Accepts, Content-Type, Authorization, X-Requested-With');
    res.header( 'Access-Control-Allow-Headers', req.get( 'Access-Control-Request-Headers' ) );

    // intercept OPTIONS method
    if ( 'OPTIONS' === req.method ) {
      return res.send( 200 );
    } else {
      return next();
    }
  } else {
    return next();
  }
}
app.use( allowCrossDomain );

// Add session support
app.use( express.cookieParser() );
app.use( express.session( {
  secret: 'CrowdSearcherJS'
} ) );
// Used with PassportJS to create *request scoped* messages
app.use( flash() );

// Complie on the fly stylus files
app.use( require( 'stylus' ).middleware( publicPath ) );

// Serve static contents from **publicPath**
app.use( express.static( publicPath ) );


// ### PassportJS
app.use( passport.initialize() );
app.use( passport.session() );

// Pass user to the views
app.use( function( req, res, next ) {
  if ( req.path.split( '/' )[ 1 ] !== 'api' ) {
    // Add th user to the views object
    app.locals( {
      user: req.user
    } );
  }

  return next();
} );


// Manage app routes
app.use( app.router );


// Server
var serverError = function( error ) {
  // Import the logger
  var log = CS.log;

  log.error( error );
  if ( error.code === 'EADDRINUSE' ) {
    log.error( 'Address is in use, try to change the PORT parameter in the configuration' );
  }

  if ( error.code === 'EACCESS' ) {
    log.error( 'The user does not have the required privileges to run the application\nTry changind the PORT parameter in the configuration file or run as a different user' );
  }

  log.error( 'The server will be stopped and the process will exit' );
  setTimeout( function() {
    process.exit( 1 );
  }, 1000 );
};
app.on( 'error', serverError );



// Load the configuration
var config = new Configurator( app );

// If error while configuring, then exit
config.on( 'error', function configError( err ) {
  console.error( 'Error while configuring the app' );
  console.error( err );
  console.error( err.stack );
  process.exit( 1 );
} );

// Once the configuration is ready
config.once( 'ready', function configReady() {
  // Load the routers
  var routes = require( './routes' );
  var errorRoutes = require( './routes/error' );
  var accountRoutes = require( './routes/account' );

  // Import the logger
  var log = CS.log;

  var baseURL = nconf.get( 'webserver:externalAddress' );
  // Pass the application external url to all the views
  app.locals( {
    appBase: baseURL
  } );

  // Configure the API's
  try {
    require( './routes/api' )( app );
  } catch ( err ) {
    log.error( err, 'API binding error' );
    return config.emit( 'error', err );
  }

  // Error handling middleware
  app.use( errorRoutes.error );

  app.use( function( req, res, next ) {
    // Exit from the domain.
    req.domain.exit();
    return next();
  } );


  // Auth middlewares
  var authMiddleware = [
    passport.authenticate( 'local', {
      failureRedirect: baseURL + 'login',
      failureFlash: true
    } )
  ];

  // Home page
  app.get( '/', routes.index );

  // CS Manager
  var manager = require( './routes/manager' );
  app.get( '/manage', routes.checkAuth, manager.index );
  // Jobs
  app.get( '/manage/jobs', routes.checkAuth, manager.jobs );
  app.get( '/manage/job/new', routes.checkAuth, manager.newJob );
  //app.post( '/manage/job/new', routes.checkAuth, manager.postJob );
  app.get( '/manage/job/:id', routes.checkAuth, manager.job );
  app.get( '/manage/job/:id/flows', routes.checkAuth, manager.flows );
  // Tasks
  app.get( '/manage/task/new', routes.checkAuth, manager.newTask );
  // Wizard
  app.get( '/manage/task/wizard', routes.checkAuth, manager.wizard );
  //app.post( '/manage/task/new', routes.checkAuth, manager.postTask );
  app.get( '/manage/task/:id', routes.checkAuth, manager.task );
  // Microtasks
  app.get( '/manage/microtask/:id', routes.checkAuth, manager.microtask );
  // Objects
  app.get( '/manage/object/:id', routes.checkAuth, manager.object );
  // Answers
  app.get( '/manage/answers', routes.checkAuth, manager.answers );
  // Dashboard
  app.get( '/manage/:entity/:id/dashboard', routes.checkAuth, manager.dashboard );
  // Control Mart
  app.get( '/manage/:entity/:id/controlmart', routes.checkAuth, manager.controlmart );
  app.get( '/manage/:entity/:id/mart', routes.checkAuth, manager.controlmart );



  var accountRedirect = function( req, res ) {
    log.trace( 'Session destination: %s', req.session.destination );

    var destination = req.session.destination;
    // Remove the session parameter
    req.session.destination = null;
    // Redirect
    res.redirect( url.resolve( baseURL, destination || 'account' ) );
  };

  // User related
  app.get( '/register', routes.register );
  app.post( '/register', routes.postRegister, accountRedirect );
  app.get( '/login', routes.login );
  app.post( '/login', authMiddleware, accountRedirect );
  app.get( '/logout', routes.logout );

  app.get( '/account', routes.checkAuth, accountRoutes.index );


  // Autentication endpoints based on configured socual networks
  var socialMap = CS.social;
  _.each( socialMap, function( config, name ) {
    var authConfig = _.defaults( {
      failureRedirect: baseURL + 'login',
      failureFlash: true
    }, config.authConfig );

    var passportAuth = passport.authorize( name, authConfig );

    app.get( '/connect/' + name, passportAuth, accountRedirect );
    app.get( '/connect/' + name + '/callback', passportAuth, accountRedirect );
  } );


  // Handle random request
  app.all( '*', function randomUrlHandler( req, res ) {
    log.warn( 'Requested "%s %s" by %s', req.method, req.originalUrl, req.ip );
    res.status( 404 );
    res.format( {
      html: function() {
        res.render( 'YUHERE', {
          title: 'Missing resource'
        } );
      },
      json: function() {
        res.json( {
          message: 'Missing resource',
          method: req.method,
          path: req.originalUrl,
          ip: req.ip
        } );
      }
    } );
  } );

  // Eventually START SERVER!
  log.debug( 'Starting server on port ' + config.getPort() );
  app.listen( config.getPort(), function runningServer() {
    log.info( 'Server running on port ' + config.getPort() );
  } );
} );



// Load configuration, and trigger the associated events.
config.load();