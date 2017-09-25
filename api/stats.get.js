'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let mongo = require( 'mongoose' );
let Promise = require( 'bluebird' );

// Load my modules
let CS = require( '../core' );
let APIError = require( './error' );

// Constant declaration

// Module variables declaration
let ObjectId = mongo.Types.ObjectId;
let Execution = CS.models.execution;
let log = CS.log.child( {
  component: 'Stats'
} );
class GetStatsError extends APIError {}
GetStatsError.prototype.name = 'GetStatsError';
GetStatsError.BAD_ENTITY = 'BAD_ENTITY';
GetStatsError.NO_ENTITY = 'NO_ENTITY';
GetStatsError.NO_EXECUTIONS = 'NO_EXECUTIONS';

// Module functions declaration
function duration( from, to ) {
  if ( !to ) return undefined;
  // Return duration in seconds
  return Math.round( ( to - from ) / 1000 );
}
function execPipeline( entityName, pipeline ) {
  log.debug( 'Executing on %s the pipeline: %j', entityName, pipeline );

  let EntityModel = CS.models[ entityName ];
  let collection = EntityModel.collection;

  return collection
  .aggregate( pipeline, {
    allowDiskUse: true,
  } )
  .toArray()
  ;
}
function getStatusClass( d ) {
  let status = d._id;
  if( _.startsWith( 'CLOSED', status ) ) {
    return 'closed';
  } else if( _.isString( status )) {
    return status.toLowerCase();
  } else {
    return status;
  }
}
function getEntityStats( entityName, filter, project, groupOn ) {
  log.debug( 'Stats for %s with filter: %j', entityName, filter );

  let pipeline = [];
  pipeline.push( {
    $match: filter,
  } );
  pipeline.push( {
    $project: _.assign( {}, project, {
      duration: {
        $divide: [
          { $subtract: [ '$closedDate', '$createdDate' ] },
          1000,
        ]
      },
    } )
  } );
  pipeline.push( {
    $group: {
      _id: groupOn,
      count: { $sum: 1 },
      avg: { $avg: '$duration' },
      std: { $stdDevPop: '$duration' },
      data: { $push: '$duration' }
    }
  } );

  return execPipeline( entityName, pipeline )
  .then( result => {

    let statusMap = _.keyBy( result, getStatusClass );
    let data = _.mapValues( statusMap, 'count' );

    let total = _( data ).map().sum();

    let allData = _( statusMap )
    .map( 'data' )
    .flatten()
    .filter()
    .sortBy()
    .value();

    return {
      open: data.created,
      closed: total - data.created,
      total: total,
      avg: (statusMap.closed||statusMap['null']||{}).avg,
      std: (statusMap.closed||statusMap['null']||{}).std,
      durations: allData,
    };
  } );
}
function getEntity( entityName, id ) {
  if( entityName !== 'task' && entityName !== 'microtask' ) {
    let message = `The entityName "${entityName}" cannot have stats`;
    return Promise.reject( new GetStatsError( GetStatsError.BAD_ENTITY, message ) );
  }

  let EntityModel = CS.models[ entityName ];

  if( !EntityModel ) {
    let message = `The entityName "${entityName}" does not exist`;
    return Promise.reject( new GetStatsError( GetStatsError.NO_ENTITY, message ) );
  }

  return EntityModel
  .findById( id )
  .populate( 'operations platforms' )
  .select( '-microtasks -objects' )
  .exec()
  .then( entityObject => {
    if( !entityObject ) {
      let message = 'No entity with id '+id;
      return Promise.reject( new GetStatsError( GetStatsError.NO_ENTITY, message ) );
    }

    return entityObject.toObject( {
      getters: true
    } );
  } );
}
function toUTC( dateString ) {
  var date = new Date( dateString );

  return -date.getTimezoneOffset() * 60000 + Date.UTC( date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds() );
}
function mapExecution( execution ) {
  let createdObject = {
    date: toUTC( execution.createdDate ),
    value: 1,
  };
  if( execution.closedDate ) {
    let closedObject = {
      date: toUTC( execution.closedDate ),
      value: -1,
    };

    return [ createdObject, closedObject ];
  }

  return createdObject;
}
function getActiveExecutions( filter ) {
  // TODO limit?
  return Execution
  .find( filter )
  .select( 'createdDate closedDate -_id' )
  .exec()
  .then( executions => {
    let v = 0;

    let data = _( executions )
    .map( mapExecution )
    .flatten()
    .sortBy( 'date' )
    .map( e => {
      v += e.value;

      return {
        x: e.date,
        y: v,
      }
    } )
    .value();

    return data;
  } );
}
function getClosedObjects( filter ) {
  // TODO
  return [];
}
function getTopPerformers( filter, limit ) {
  limit = limit || 20;
  log.debug( 'Get top %d performers filter: %j', limit, filter );

  let pipeline = [];
  pipeline.push( {
    $match: filter,
  } );
  pipeline.push( {
    $group: {
      _id: '$performer',
      total: { $sum: 1 },
      invalid: {
        $sum: { $cond: [ { $eq: [ '$status', 'INVALID' ] }, 1, 0, ] },
      },
      created: {
        $sum: { $cond: [ { $eq: [ '$status', 'CREATED' ] }, 1, 0, ] },
      },
      closed: {
        $sum: { $cond: [ { $and: [
            { $ne: [ '$status', 'INVALID' ] },
            { $ne: [ '$status', 'CREATED' ] }
        ] }, 1, 0, ] },
      },
    }
  } );
  pipeline.push( {
    $sort: {
      total: -1,
    }
  } );

  return execPipeline( 'execution', pipeline );
}
function getPerformerExecutions( filter ) {
  log.debug( 'Get executions per performer filter: %j', filter );

  let pipeline = [];
  pipeline.push( {
    $match: _.assign( {}, filter, {
      status: 'CLOSED', // Aandrea Mauri neo PhD
    } ),
  } );
  pipeline.push( {
    $group: {
      _id: '$performer',
      total: { $sum: 1 },
    }
  } );
  pipeline.push( {
    $group: {
      _id: null,
      avg: { $avg: '$total' },
      std: { $stdDevPop: '$total' },
      data: { $push: '$total' }
    }
  } );

  return execPipeline( 'execution', pipeline )
  .then( d=>d[0] );
}
function getPerformerStats( filter ) {
  log.debug( 'Get performer statistics with filter: %j', filter );

  filter = _.assign( {}, filter, {
    status: 'CLOSED', // Andrea Mauri neo PhD
  } );

  return getEntityStats( 'execution', filter, { performer: 1 } )
}
function getMicrotaskStats( filter ) {
  filter = _.assign( {}, filter, {
    status: 'CLOSED',
  } );

  return getEntityStats( 'microtask', filter );
}
function getStats( req, res, next ) {
  var entityName = req.params.entity;
  var entityId = req.params.id;

  var filter = {
    [entityName]: ObjectId( entityId ),
  };

  log.trace( 'Stats for %s with id %s', entityName, entityId );

  let props = {
    entity: getEntity( entityName, entityId ),
    objectStats: getEntityStats( 'object', filter, { status: 1 } , '$status' ),
    executionStats: getEntityStats( 'execution', filter, { status: 1 }, '$status' ),
    performerStats: getPerformerStats( filter ),
    performerExecutions: getPerformerExecutions( filter ),
    topPerformers: getTopPerformers( filter ),
    activeExecutions: getActiveExecutions( filter ),
    // closedObjects: getClosedObjects( filter ),
  };

  if( entityName==='task' ) {
    props.microtaskStats = getEntityStats( 'microtask', filter, { status: 1 }, '$status' );
  }

  return Promise
  .props( props )
  .then( results => {

    results.name = entityName;
    results.id = results.entity._id;
    results.start = results.entity.openedDate || results.entity.createdDate;
    results.end = results.entity.closedDate;
    results.duration = duration( results.start, results.end );

    return results;
  } )
  /*
  */
  .then( data => {
    log.debug( 'Data ready, sending data' );
    res.json( data );
  } )
  .catch( next );
}
// Module class declaration


// Module initialization (at first load)

// Module exports
module.exports = {
  url: ':entity/:id/stats',
  method: 'GET',
  logic: getStats,
};