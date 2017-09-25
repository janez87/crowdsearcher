'use strict';
// Load system modules
let fs = require( 'fs' );
let url = require( 'url' );
let path = require( 'path' );
let http = require( 'http' );
let https = require( 'https' );
let domain = require( 'domain' );

// Load modules
let _ = require( 'lodash' );
let flash = require( 'connect-flash' );
let passport = require( 'passport' );
let express = require( 'express' );
let moment = require( 'moment' );
let markdown = require( 'markdown' ).markdown;
let cors = require( 'cors' );
let serve = require( 'serve-static' );
let bodyParser = require( 'body-parser' );
let cookieParser = require( 'cookie-parser' );
let methodOverride = require( 'method-override' );
let session = require( 'express-session' );
let RedisStore = require( 'connect-redis' )( session );

// Load my modules
let Configurator = require( './config' );
let CS = require( './core' );

// Constant declaration

// Module variables declaration
let publicPath = path.join( __dirname, 'public' );
let viewsPath = path.join( __dirname, 'views' );
let uploadPath = path.join( __dirname, 'uploads' );
var app = express();
let config = new Configurator( app );

// Module functions declaration
function configError( err ) {
  console.error( 'Error while configuring the app' );
  console.error( err );
  console.error( err.stack );
  process.exit( 1 );
}
function serverError( error ) {
  let log = CS.log;

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
}
function configReady() {
  var log = CS.log;
  CS.config = config;

  // Load the routers
  var routes = require( './routes' );
  var errorRoutes = require( './routes/error' );
  var accountRoutes = require( './routes/account' );


  let baseURL = config.externalAddress;
  // Pass the application external url to all the views
  app.locals.appBase = config.externalAddress;

  // Configure the API's
  try {
    var bindApi = require( './routes/api' );
    bindApi( app );
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
  let managerRouter = express.Router( {
    mergeParams: true,
  } );
  let manager = require( './routes/manager' );
  managerRouter.use( routes.checkAuth );

  // Home
  managerRouter.get( '/', manager.index );
  // Jobs
  managerRouter.get( '/jobs', manager.jobs );
  managerRouter.get( '/job/new', manager.newJob );
  //managerRouter.post( '/job/new', manager.postJob );
  managerRouter.get( '/job/:id', manager.job );
  managerRouter.get( '/job/:id/flows', manager.flows );

  // Task Types wizard
  managerRouter.get( '/wizard', function( req, res ) {
    res.redirect( config.externalAddress + 'manage/wizard/task_type' );
  } );
  managerRouter.all( '/wizard/:page', manager.wizard );

  // Tasks
  managerRouter.get( '/task/new', manager.newTask );
  //managerRouter.post( '/task/new', manager.postTask );
  managerRouter.get( '/task/:id', manager.task );
  // Microtasks
  managerRouter.get( '/microtask/:id', manager.microtask );
  // Objects
  managerRouter.get( '/object/:id', manager.object );
  // Answers
  managerRouter.get( '/answers', manager.answers );
  // Dashboard
  managerRouter.get( '/:entity/:id/dashboard', manager.dashboard );
  // Control Mart
  managerRouter.get( '/:entity/:id/controlmart', manager.controlmart );
  managerRouter.get( '/:entity/:id/mart', manager.controlmart );



  // TODO: REMOVE ME
  app.get( '/task/:id/event/:event', ( req, res ) => {
    let CRM = require( './core/CRM' ); // TODO remove
    let id = req.params.id;
    let event = req.params.event;
    log.debug( 'Trigger %s on %s', event, id );
    CRM.trigger( event, { task: id }, ()=> res.send( 'OK' ) );
  } );

  // Mount the router
  app.use( '/manage', managerRouter );



  var accountRedirect = function( req, res ) {
    log.trace( 'Session destination: %s', req.session.destination );

    var destination = req.session.destination;
    // Remove the session parameter
    req.session.destination = null;
    // Redirect
    var dest = url.resolve( baseURL, destination || 'account' );
    log.trace( 'Destination: %s', destination );
    log.trace( 'Dest: %s', dest );
    res.redirect( dest );
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
  _.each( socialMap, function( cfg, name ) {
    var authConfig = _.defaults( {
      failureRedirect: baseURL + 'login',
      failureFlash: true
    }, cfg.authConfig );

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

  var protocol = config.protocol || 'http';
  log.debug( 'Starting %s server on port %s', protocol, config.port );

  if ( protocol === 'https' ) {
    var options = {
      cert: fs.readFileSync( './certificate.pem' ).toString(),
      key: fs.readFileSync( './privatekey.pem' ).toString()
    };
    https.createServer( options, app ).listen( config.port );
  } else {
    http.createServer( app ).listen( config.port );
  }
}

// Module class declaration

// Module initialization (at first load)

// Entry point
// var env = ( process.env.NODE_ENV || 'dev' ).toLowerCase();
// Error.stackTraceLimit = env==='production' ? 15 : Infinity;
process.title = 'CrowdSearcher';

// Create the upload path if not exist
app.set( 'views', viewsPath );
app.set( 'view engine', 'jade' );
app.enable( 'trust proxy' );
app.locals = {
  // Like the title
  title: 'CrowdSearcher',
  md: markdown.toHTML,
  moment: moment,
  _: _,
  CS: CS
};


// Create a Domain to handle errors properly *for each request*
app.use( function( req, res, next ) {

  var requestDomain = domain.create();
  // Add the domain to the request, so ca be `exited` later
  req.domain = requestDomain;

  // Utility function used to wrap an async call to the api domain
  var wrapInDomain = function( fn, ctx ) {
    if ( _.isString( fn ) && !_.isUndefined( ctx ) ) {
      fn = ctx[ fn ];
    }

    if ( ctx ) {
      fn = fn.bind( ctx );
    }

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


// Used to handle uploaded files
app.use( bodyParser( {
  uploadDir: uploadPath,
  limit: '150mb',
  extended: true,
} ) );
app.use( methodOverride() );
app.use( cors() );
// Add session support
app.use( cookieParser() );
app.use( session( {
  store: new RedisStore( {
    client: CS.redis,
  } ),
  secret: 'CrowdSearcher',
} ) );
// Used with PassportJS to create *request scoped* messages
app.use( flash() );
// Complie on the fly stylus files
app.use( require( 'stylus' ).middleware( publicPath ) );
// Serve static contents from **publicPath**
app.use( serve( publicPath ) );
// PassportJS
app.use( passport.initialize() );
app.use( passport.session() );
// Pass user to the views
app.use( function( req, res, next ) {
  if ( req.path.split( '/' )[ 1 ] !== 'api' ) {
    // Add th user to the views object
    app.locals.user = req.user;
    app.locals.req = req;
  }

  return next();
} );
// Server errors
app.on( 'error', serverError );



// Load the configuration

config
.load( app )
.then( configReady )
.catch( configError )


//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78