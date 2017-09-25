'use strict';
var async = require('async');
var util = require('util');
let _ = require( 'lodash' );

var log = CS.log.child( { component: 'UpdatePerformerScore' } );

// Models

var CSError = require('../../error');
// Custom error
var UpdatePerformerScoreError = function( id, message) {
  /* jshint camelcase: false */
  UpdatePerformerScoreError.super_.call( this, id, message);
};

util.inherits( UpdatePerformerScoreError, CSError );

// Error name
UpdatePerformerScoreError.prototype.name = 'UpdatePerformerScoreError';

var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');

  var domain = require( 'domain' ).create();
  domain.on('error',callback);

  var execution = data.execution;
  var performerId = execution.performer;

  if( !_.isArray( config.metadata ) )
    config.metadata = [ config.metadata ];
  var correctMetadata = config.metadata;

  if( !_.isArray( config.operation ) )
    config.operation = [ config.operation ];
  var operationList = config.operation;

  if(_.isUndefined(performerId)){
    log.trace('The performer is anonymous');
    return callback();
  }

  var isInvalid = execution.getMetadata('invalid');
  if(!_.isUndefined(isInvalid) && isInvalid){
    log.trace('The execution is invalid');
    return callback();
  }

  execution
  .populate('annotations.object annotations.operation performer job',domain.bind(function(err,execution){
    if (err) return callback(err);

    var job = execution.job;
    var metadataKey = config.prefix+job.id+'_score';
    var annotations = execution.annotations;
    var performer = execution.performer;

    var performerScore = performer.getMetadata( metadataKey ) || 0;
    var delta = 0;
    var correctNum = 0;
    // Calculate new user score
    _.each( annotations, function( annotation ) {
      var operation = annotation.operation;

      var index = _.indexOf( operationList, operation.label );
      var metadata = correctMetadata[ index ];

      if( !metadata ) return;

      var object = annotation.object;
      var selectedCategory = annotation.response;
      var correctValue = object.getMetadata( metadata );

      if(_.isUndefined(correctValue)){
        log.trace('Ground truth not defined for object %s',object.id);
        return;
      }

      if( selectedCategory === correctValue ) {
        delta += 1;
        correctNum += 1;
      } else {
        delta -= 1;
      }
    });
    log.trace('Current score for the performer %s is %s', performer.id, performerScore );

    // Add the delta to the performer score
    performerScore += delta;
    log.trace('Setting the metadata %s to %s', metadataKey, performerScore );

    var savePerformer = function( cb ) {
      performer.save( domain.bind( cb ) );
    };
    var saveJob = function( cb ) {
      job.save( domain.bind( cb ) );
    };

    var actions = [];
    if( delta!==0 ) {
      performer.setMetadata( metadataKey, performerScore );
      actions.push( savePerformer );
    }

    // Check user job max score
    var max = job.getMetadata( 'maxSùcore' ) || 0;
    log.trace( 'The maximum score is %s', max );
    if( performerScore>max ) {
      max = performerScore;
      job.setMetadata( 'maxScore', max );
      actions.push( saveJob );
    }

    async.series( actions, function( err ) {
      if( err ) return callback( err );

      return callback( null, {
        correct: correctNum,
        performerScore: performerScore,
        maxScore: max
      } );
    } );

    /*
    annotations = _.filter(annotations,function(annotation){
      return annotation.operation.label === config.operation;
    });

    var correctNum = 0;
    var total = 0;
    _.each(annotations,function(annotation){
      var object = annotation.object;
      var selectedCategory = annotation.response;

      var correctValue = object.getMetadata(correct);
      if(_.isUndefined(correctValue)){
        log.trace('Ground truth not defined for object %s',object.id);
        return;
      }

      var score = performer.getMetadata(prefix+'score');

      if(_.isUndefined(score)){
        score = 0;
      }

      total += 1;
      if(selectedCategory === correctValue){
        score = score +1;
        correctNum += 1;
      }else{
        score = score -1;
      }

      log.trace('Current score for the performer %s is %s',performer.id,score);
      log.trace('Setting the metadata %s',prefix+'score');
      performer.setMetadata(prefix+'score',score);
    });
    performer.save(domain.bind(function(err,savedPerformer){
      if(err) return callback(err);

      var max = job.getMetadata('maxScore');
      log.trace('Searching the metadata %s', prefix+'score');

      var performerScore = savedPerformer.getMetadata(prefix+'score');
      log.trace('The maximum score is %s',max);

      log.trace('The performer score is %s',performerScore);

      if(_.isUndefined(max) || performerScore>max){
        job.setMetadata('maxScore',performerScore);
        log.trace('Updating the maximum score');

        return job.save( domain.bind( function( err ) {
          return callback( err, {
            correct: correctNum,
            performerScore: performerScore,
            maxScore: performerScore
          } );
        } ) );
      }else{
        return callback( null, {
          correct: correctNum,
          performerScore: performerScore,
          maxScore: max
        } );
      }
    }));
    */
  }));
};



var checkParameters = function( callback ) {
  log.trace( 'Checking parameters' );
  // Everything went better then expected...
  return callback();
};

var params = {
  prefix:{
    type:'string',
    'default':'score_'
  },
  metadata:{
    type: [ 'string' ],
    'default':'correct'
  },
  operation:{
    type: [ 'string' ]
  }
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
