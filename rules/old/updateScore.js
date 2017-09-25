
'use strict';
let _ = require( 'lodash' );
var async = require( 'async' );
var util = require('util');

var log = CS.log.child( { component: 'UpdateScore' } );

// Models

var CSError = require('../../error');
// Custom error
var UpdateScoreError = function( id, message) {
  UpdateScoreError.super_.call( this, id, message);
};

util.inherits( UpdateScoreError, CSError );

// Error name
UpdateScoreError.prototype.name = 'UpdateScoreError';


var performRule = function( data, config, callback ) {
  log.trace('Performing the rule');
  var domain = require( 'domain' ).create();

  domain.on('error',callback);

  var label = config.prefix + data.task.id;
  var microtask = data.microtask;
  var annotations = data.execution.annotations;

  var invalid = data.execution.getMetadata('invalid');

  if(!_.isUndefined(invalid) && invalid.value === true){
    log.trace('The execution %s was marked as invalid',data.execution.id);
    return callback();
  }

  if(annotations.length === 0 || annotations.length === 2){
    log.trace('There is no winner.. or maybe to many');
    return callback();
  }


  var createMetadata = function(object,callback){

    if(!object.hasMetadata(label+'score')){
      log.trace('Creating the metadata %s for the object %s', label+'score',object.id);
      object.setMetadata(label+'score',0);
    }

    return callback();
  };


  var computeScore = function(winner,loser){

    var winnerOldScore = winner.getMetadata(label+'score').value;
    var loserOldScore = loser.getMetadata(label+'score').value;

    winner.setMetadata(label+'score',winnerOldScore+1);
    loser.setMetadata(label+'score',loserOldScore-1);

  };



  microtask.populate('objects operations',domain.bind(function(err,microtask){
    if(err) return callback(err);

    log.trace('Objects of the microtask %s populated',microtask.id);

    async.each(microtask.objects,createMetadata,function(err){
      if(err) return callback(err);

      var annotation = annotations[0];

      var winner = _.filter(microtask.objects,function(o){
        return o._id.equals(annotation.object);
      });

      winner = winner[0];
      log.trace('The winner is %s',winner.id);

      var loser = _.filter(microtask.objects,function(o){
        return !o._id.equals(winner._id);
      });

      loser = loser[0];
      log.trace('The loser is %s',loser.id);

      computeScore(winner,loser);

      async.each([winner,loser],function(object,callback){
        object.save(callback);
      },callback);
    });


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
  }
};

module.exports.perform = exports.perform = performRule;
module.exports.check = exports.check = checkParameters;
module.exports.params = exports.params = params;
