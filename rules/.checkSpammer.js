// CheckSpammer rule
// ---
// Rule that check if a user is a spammer for an operation


// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var CS = require( '../core' );

// Create a child logger
var log = CS.log.child( { component: 'CheckSpammer' } );

// Models
var ControlMart = CS.models.controlmart;


var performRule = function( event, config,task, data, callback ) {
  log.trace('Performing the rule');

  // Error handler
  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var execution = data.execution;
  var operationLabel = config.operation;

  var performer = execution.performer;

  if(_.isUndefined(performer)){
    log.warn('The performer is anonymous');
    return callback();
  }

  execution.populate('annotations.operation annotations.objects',function(err,execution){
    if( err ) return callback( err );

    var annotations = _.filter(execution.annotations,function(annotation){
      return annotation.operation.label === operationLabel;
    });


    if(annotations.length === 0){
      log.warn('No annotation for the operation %s',operationLabel);
    }

    var operationId = annotations[0].operation._id;

    ControlMart
    .get({task:task._id,performer:performer,operation:operationId},function(err,controlmart){
      if( err ) return callback( err );

      var spammer = _.findWhere(controlmart,{name:'spammer'});
      if(_.isUndefined(spammer)){
        spammer = false;
      }

      if(spammer){
        log.info('The perforemr %s is already a spammer',performer);
        return callback();
      }

      var evaluations = _.findWhere(controlmart,{name:'evaluations'});
      if(_.isUndefined(evaluations)){
        evaluations = 0;
      }

      var correct = _.findWhere(controlmart,{name:'correct'});
      if(_.isUndefined(correct)){
        correct = 0;
      }

      var wrong = _.findWhere(controlmart,{name:'wrong'});
      if(_.isUndefined(wrong)){
        wrong = 0;
      }

      var ratio = _.findWhere(controlmart,{name:'ratio'});
      if(_.isUndefined(ratio)){
        ratio = 0;
      }

      _.each(annotations, function(annotation){
        var gt = annotation.object.getMetadata(config.groundtruth);

        log.trace('Updating the evaluations');
        evaluations++;

        if(_.isUndefined(gt)){
          log.info('The object %s does not have a groundtruth',annotation.object._id);
          return;
        }

        var response = annotation.response;

        if(response === gt){
          correct++;
        }else{
          wrong++;
        }

        ratio = correct/evaluations;
        if(evaluations >= config.answers){
          log.trace('The performer did %s evaluations',evaluations);
          if(ratio<=config.threshold){
            log.trace('The ratio of the performer is below the threshold (%s <= %s)',ratio,config.ratio);
            spammer = true;
          }
        }

      });

      log.trace('Updating the control mart');
      var updatedMart = [];
      var spammerMart = {
        performer:performer,
        name:'spammer',
        data:spammer,
        task:task._id,
        operation:operationId
      };
      updatedMart.push(spammerMart);

      var evaluationsMart = {
        performer:performer,
        name:'evaluations',
        data:evaluations,
        task:task._id,
        operation:operationId
      };
      updatedMart.push(evaluationsMart);

      var correctMart = {
        performer:performer,
        name:'correct',
        data:correct,
        task:task._id,
        operation:operationId
      };
      updatedMart.push(correctMart);

      var wrongMart = {
        performer:performer,
        name:'wrong',
        data:wrong,
        task:task._id,
        operation:operationId
      };
      updatedMart.push(wrongMart);

      var ratioMart = {
        performer:performer,
        name:'ratio',
        data:ratio,
        task:task._id,
        operation:operationId
      };
      updatedMart.push(ratioMart);

      return ControlMart.insert(updatedMart,callback);

    });


  });



};

var checkParameters = function( params, done ) {
  log.trace( 'Checking parameters' );

  // Everything went better then expected...

  if(_.isUndefined(params.operation)){
    log.error('The label of the operation must be specified');
    return done(false);
  }

  if(_.isUndefined(params.groundtruth)){
    log.error('The groundtruth metadata must be specified');
    return done(false);
  }

  if(_.isUndefined(params.threshold) || params.threshold<=0){
    log.error('The threshold must be an integer greater than 0');
    return done(false);
  }

  if(_.isUndefined(params.answers) || params.answers<=0){
    log.error('The number of answers must be an integer greater than 0');
    return done(false);
  }

  return done(true);
};

var params = {
  operation: 'string',
  answers:'number',
  threshold:'number',
  groundtruth:'string'
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;