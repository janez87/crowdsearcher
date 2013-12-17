// Load libraries
var _ = require( 'underscore' );
var util = require( 'util' );
var async = require( 'async' );
var CS = require( '../core' );

// Import a child Logger
var log = CS.log.child( {
  component: 'Stats'
} );

// Import Models
var Execution = CS.models.execution;
var Microtask = CS.models.microtask;
var Task = CS.models.task;
var ObjectSchema = CS.models.object;
var Platform = CS.models.platform;

// Generate custom error `GetStatsError` that inherits
// from `APIError`
var APIError = require( './error' );
var GetStatsError = function( id, message, status ) {
  GetStatsError.super_.call( this, id, message, status );
};
util.inherits( GetStatsError, APIError );
GetStatsError.prototype.name = 'GetStatsError';
// Custom error IDS
GetStatsError.BAD_ENTITY = 'BAD_ENTITY';
GetStatsError.NO_ENTITY = 'NO_ENTITY';
GetStatsError.NO_EXECUTIONS = 'NO_EXECUTIONS';

// API object returned by the file
// -----
var API = {
  // The API endpoint. The final endpoint will be:
  //    /api/**endpointUrl**
  url: ':entity/:id/stats',

  // The API method to implement.
  method: 'GET'
};

// API core function logic. If this function is executed then each check is passed.
//TODO:
API.logic = function getStats( req, res, next ) {
  var entity = req.params.entity;
  var entityId = req.params.id;
  var raw = ( req.query.raw === 'true' );

  var filter = {};
  filter[ entity ] = entityId;

  log.trace( 'Stats for %s with id %s', entity, entityId );

  function getEntity( callback ) {
    if ( entity !== 'task' && entity !== 'microtask' )
      return callback( new GetStatsError( GetStatsError.BAD_ENTITY, 'The entity "' + entity + '" cannot have stats' ) );

    var EntityModel = CS.models[ entity ];

    if ( !EntityModel )
      return callback( new GetStatsError( GetStatsError.NO_ENTITY, 'The entity "' + entity + '" does not exist' ) );

    EntityModel
      .findById( entityId )
      .populate( 'objects operations platforms' + ( entity === 'task' ? ' microtasks' : '' ) )
      .lean()
      .exec( function( err, entityObject ) {
        if ( err ) return callback( err );

        if ( !entityObject )
          return callback( new GetStatsError( GetStatsError.NO_ENTITY, 'No entity with id ' + entityId ) );

        return callback( null, entityObject );
      } );
  }


  function getExecutions( entityObject, callback ) {
    Execution
      .find( filter )
      .populate( 'microtask performer ' )
      .lean()
      .exec( function( err, executions ) {
        if ( err ) return callback( err );

        if ( !executions )
          return callback( new GetStatsError( GetStatsError.NO_EXECUTIONS, 'No executions available' ) );

        _.each( executions, function( execution ) {
          var endDate = execution.closedDate || execution.invalidDate;
          if ( execution.status !== 'CREATED' && endDate ) {
            // Difference in milliseconds
            execution.duration = endDate - execution.createdDate;
            // Convert to seconds
            execution.duration = duration( execution.createdDate, endDate );
          }
        } );

        return callback( null, entityObject, executions );
      } );
  }

  function duration( from, to ) {
    if ( !to ) return undefined;
    // Return duration in seconds
    return Math.round( ( to - from ) / 1000 );
  }

  function sumList( list, property ) {
    return _.reduce( list, function( m, value ) {
      return m + ( property ? value[ property ] : value );
    }, 0 );
  }

  function calcStat( list, property ) {
    var avg = sumList( list, property ) / list.length;

    var varList = _.map( list, function( value, key ) {
      var num = ( property ? value[ property ] : value );
      return Math.pow( num - avg, 2 );
    } );
    var variance = sumList( varList ) / varList.length;

    return {
      variance: variance,
      average: avg
    };
  }

  function getBaseData( entityObject, executions ) {
    var data = {};
    // Add basic entity data
    data.id = entityObject._id;
    data.name = entityObject.name; // Available only for task stats
    data.description = entityObject.description; // Available only for task stats

    // Time data
    data.start = entityObject.openedDate || entityObject.createdDate;
    data.end = entityObject.closedDate;
    data.duration = duration( data.start, data.end );



    // Objects
    data.objects = entityObject.objects.length || 0;
    data.closedObjects = _.countBy( entityObject.objects, 'status' ).CLOSED || 0;



    // Platforms
    var enabledPlatforms = [];
    var executionPlatforms = [];
    var invitationPlatforms = [];
    _.each( entityObject.platforms, function( platform ) {
      if ( platform.enabled ) enabledPlatforms.push( platform );
      if ( platform.execution ) executionPlatforms.push( platform );
      if ( platform.invitation ) invitationPlatforms.push( platform );
    } );
    data.platforms = enabledPlatforms.length;
    data.invitationPlatforms = invitationPlatforms.length;
    data.executionPlatforms = executionPlatforms.length;





    // executionStat
    var executionGroups = _.groupBy( executions, 'status' );
    executionGroups[ 'CLOSED' ] = executionGroups[ 'CLOSED' ] || [];
    executionGroups[ 'INVALID' ] = executionGroups[ 'INVALID' ] || [];
    data.executions = executions.length;
    data.closedExecutions = executionGroups[ 'CLOSED' ].length;
    data.invalidExecutions = executionGroups[ 'INVALID' ].length;

    var executionStat = calcStat( executionGroups[ 'CLOSED' ], 'duration' );

    var totalDuration = _.reduce( executions, function( m, execution ) {
      if ( execution.status === 'CLOSED' ) {
        return m ? m : 0 + execution.duration;
      } else {
        return m;
      }
    }, null );
    data.execution = {
      duration: totalDuration,
      avgDuration: executionStat.average,
      varDuration: executionStat.variance
    };




    // Performers
    var performerMap = _.groupBy( executions, function( value ) {
      return value.performer ? value.performer._id : null;
    } );
    data.performers = _.size( performerMap );


    var performerStat = calcStat( _.values( performerMap ), 'length' );
    data.performer = {
      avgDuration: data.execution.avgDuration,
      varDuration: data.execution.varDuration,
      avgExecutions: performerStat.average,
      varExecutions: performerStat.variance
    };

    return data;
  }

  function parseResults( entityObject, executions, callback ) {
    var data = getBaseData( entityObject, executions );

    // Create HashMaps for useful objects
    var objectMap = _.indexBy( entityObject.objects, '_id' );
    //var operationMap = _.indexBy( entityObject.operations, '_id' );
    //var platformsMap = _.indexBy( entityObject.platformsMap, '_id' );

    // Task dependent data
    if ( entity === 'task' ) {
      data.name = entityObject.name;
      data.description = entityObject.description;

      // Microtask data
      data.microtasks = entityObject.microtasks.length;
      // Group executions by Microtask
      var executionsByMicrotask = _.groupBy( executions, function( execution ) {
        return execution.microtask._id;
      } );
      var closedMicrotasks = [];
      data.microtaskStats = _.map( entityObject.microtasks, function( microtask ) {
        // Replace the id of the objects with the actual objects
        microtask.objects = _.map( microtask.objects, function( objectId ) {
          return objectMap[ objectId ];
        } );

        // Get the list of execution for the current microtask
        var microtaskExecutions = executionsByMicrotask[ microtask._id ] || [];

        // Get base data for the microtask
        var microtaskData = getBaseData( microtask, microtaskExecutions );

        if ( microtask.status === 'CLOSED' ) closedMicrotasks.push( microtaskData );
        return microtaskData;
      } );
      data.closedMicrotasks = closedMicrotasks.length;

      var mTaskDurationStats = calcStat( closedMicrotasks, 'duration' );
      var mTaskExecutionStats = calcStat( closedMicrotasks, 'executions' );
      data.microtask = {
        avgExecutions: mTaskExecutionStats.average,
        varExecutions: mTaskExecutionStats.variance,
        avgDuration: mTaskDurationStats.average,
        varDuration: mTaskDurationStats.variance
      };
    }


    if ( raw )
      data.raw = executions;

    return callback( null, data );
  }


  // Perform actions on the executions
  var actions = [
    getEntity,
    getExecutions,
    parseResults
  ];
  async.waterfall( actions, function( err, data ) {
    if ( err ) return next( err );

    res.json( data );
  } );
};

// Export the API object
exports = module.exports = API;