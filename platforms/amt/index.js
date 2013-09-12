// Load libraries
var _ = require('underscore');
var async = require( 'async' );
var domain = require( 'domain' );
var fs = require('fs');
var jade = require('jade');

var Performer = common.models.user;

// Create a custom logger
var log = common.log.child( { component: 'AMT' } );

var Execution = common.models.execution;

function execute( task, microtask, execution, platform, callback ) {
  log.trace('Executing the microtask %s', microtask.id);
  // TODO fix with param url
  var url = 'https://workersandbox.mturk.com/mturk/preview?groupId=';

  //Retrieving the hit type id for building the url
  var hitTypeMetadata = task.getMetadata('hitType');

  log.trace('Redirecting the performer to %s',url+hitTypeMetadata);

  return  callback(null,url+hitTypeMetadata);
}

var createAnnotation = function(execution,annotations,operation,callback){

  log.trace('Creating the annotations for the operation %s',operation.label);
  var opImplementation = GLOBAL.common.operations[ operation.name ];

  var opAnnotations = _.filter(annotations,function(annotation){
    return operation._id == annotation.operation._id;
  });

  log.trace('Found %s answers for the operation %s',opAnnotations.length,operation.label);
  opImplementation.create(opAnnotations,operation,function(err,annotations){
    _.each(annotations,function(annotation){
      execution.annotations.push(annotation);
    });

    return callback();
  });

};

function retrieve(task,microtask,platform,cronJob){
  log.trace( 'Job running' );
  log.trace( 'Task: %s', task._id );
  log.trace( 'Microtask: %s', microtask._id );
  log.trace( 'Config: %j', config );
  log.trace( 'CronJob: %j', cronJob );

  var jobDomain = require('domain').createDomain();

  jobDomain.on('error',function(err){
    return log.error(err);
  });

  var config = platform.params;

  var conf = {
    url: config.url,
    receptor: { port: 3000, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: config.accessKeyId ,
    secretAccessKey: config.secretAccessKey ,
    amount: config.price,
    duration: config.duration
  };

  var mturk = require('mturk')(conf);

  var HIT = mturk.HIT;

  var hitId = microtask.getMetadata('hit');

  if(_.isUndefined(hitId)){
    return log.error('The hit for the microtask %s is undefined',microtask.id);
  }

  log.trace('Retrieving the hit %s',hitId);
  HIT.get(hitId,jobDomain.bind(function(err,hit){
    if(err) return log.error('An error occured during the hit retrieval',err);

    if( !hit ) return log.error( 'No hit retrieved' );

    log.trace('Hit retrieved');
    log.trace('Retrieving the assignments');

    hit.getAssignments({assignmentStatus:'Submitted'},jobDomain.bind(function(err,numResult,totalNumResult,pageNumber,assignments){
      if(err) return log.error('An error occured during the retrival of the assignment for the hit %s',hit.id);

      if( !assignments ) return log.error( 'No assignments retrieved' );

      log.trace('Found %s submitted assignments',assignments.length);

      if(assignments.length === 0) return log.trace('No assignment found');

      microtask.populate('operations platforms',jobDomain.bind(function(err,microtask){
        if (err) return log.error('Error in the populate',err);

        if( !microtask ) return log.error( 'No microtask retrieved' );

        var checkAssignment = function(assignment,callback){
          var worker = assignment.workerId;
          var amtPerformer;

          var checkPerformer = function(callback){
            Performer.findByAccountId('amt',worker,jobDomain.bind(function(err,performer){
              if(err) return callback(err);

              if(!_.isUndefined(performer) && performer){
                log.trace('Performer %s found', performer._id);
                amtPerformer = performer;
                return callback();
              }

              log.trace('Performer not found');
              var data = {
                id:worker,
                username:worker
              };

              log.trace('Creating the performer with his amt account %s',worker);
              var user = Performer.createWithAccount('amt',data );
              jobDomain.bind( user.save.bind( user ) )( function( err, performer ) {
                if( err ) return callback( err );

                log.trace('Performer created');
                amtPerformer = performer;
                return callback();
              });
            }));

          };

          var saveAssignment = function(callback){

            var rawExecution = {
                task:task,
                microtask:microtask,
                job:task.job,
                performer:amtPerformer,
                operations:microtask.operations,
                platform: platform,
                creationDate: assignment.acceptTime
              };

            var execution = new Execution(rawExecution);

            var mTAnswers = assignment.answer.QuestionFormAnswers.Answer;
            var annotationsToBeCreated = [];

            if( !_.isArray( mTAnswers ) )
              mTAnswers = [ mTAnswers ];

            _.each(mTAnswers,function(answer){
              var identifiers = answer.QuestionIdentifier.split('_');
              var objectId = identifiers[0];
              var operationId = identifiers[1];

              var operation = _.find(microtask.operations,function(op){
                return op.id === operationId;
              });

              if(_.isUndefined(operation)){
                return log.error('Operation not found... wtf?');
              }

              log.trace('Answer for the operation %j',operation);
              log.trace( 'Assignment: %j', assignment );
              var rawAnnotation = {
                date: assignment.submitTime,
                objectId: objectId,
                operation: operation
              };

              if(operation.name === 'like'){
                var like = answer.SelectionIdentifier;

                if(like === 'like'){
                  // NOOP
                }

              }else if(operation.name === 'classify' || operation.name==='fuzzyclassify' ){

                var category = answer.SelectionIdentifier;
                rawAnnotation.value = category;

              }else if(operation.name === 'tag'){

                var tags = answer.FreeText;
                tags = tags.split(',');
                rawAnnotation.value = tags;

              }else if(operation.name === 'comment'){

                var comment = answer.FreeText;
                rawAnnotation.value = comment;

              } else{
                return log.error('Operation %s not supported',operation.name);
              }

              annotationsToBeCreated.push( rawAnnotation );
            });

            async.eachSeries(microtask.operations,_.partial(createAnnotation,execution,annotationsToBeCreated),function(err){
              if(err) return callback(err);

              log.trace('Annotations saved for the assignment %s', assignment.id);
              log.trace('Closing the execution');
              execution.setMetadata('assignment',assignment.id);
              execution.close(function(err){
                if (err) return callback(err);

                log.trace('Execution closed for the assignment %s',assignment.id);
                return callback();
              });
            });
          };

          async.series([checkPerformer,saveAssignment],callback);
        };

        async.eachSeries(assignments,checkAssignment,function(err){
          if(err) return log.error('CronJob',err);

          log.trace('All done');
        });
      }));
    }));
  }));

}

function create(task, microtask, platform, callback){
  log.trace( 'Creating the task inteface using AMT');

  var executeDomain = domain.create();

  executeDomain.on( 'error', function( err ) {
    log.error( 'Got error' );
    log.error( err );
    return callback( err );
  } );

  var config = platform.params;

  var conf = {
    url: config.url,
    receptor: { port: 3000, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    amount: config.price,
    duration: config.duration
  };

  // MTurk stuff
  var mturk = require('mturk')(conf);
  var HITType = mturk.HITType;
  var HIT = mturk.HIT;
  var Price = mturk.Price;

  var amount = config.price;
  var price = new Price(amount, 'USD');

  var duration = config.duration;

  //TODO: prenderle dalla config - magari leggere cosa sono...
  var options = { keywords: 'movies', autoApprovalDelayInSeconds: 3600 };


  var hitTypeId = '';

  // Create the HitType
  var createHitType = function(callback){
    log.trace('Creating the HitType');
    var description = 'Movie shot classification';
    if(!description){
      description =  'Movie shot classification';
    }
    log.trace('Creating the hit type');
    log.trace(task.name,description,price,duration,options);
    HITType.create(task.name,description,price,duration,options,function(err,hitType){
      if(err){
        return callback(err);
      }

      log.trace('HitType '+ hitType.id +' created');
      hitTypeId = hitType.id;

      task.setMetadata('hitType', hitType.id);

      task.save(executeDomain.bind(callback));
    });
  };

  var questionXML = '';

  var renderQuestion = function(callback){
    log.trace( 'Rendering question' );

    var jadeTemplate = config.jadeTemplate;
    microtask.populate('objects operations',executeDomain.bind(function(err,microtask){
      if(err) return callback(err);

      log.trace('Populate ok, got %s objects and % operations',microtask.objects.length,microtask.operations.length);

      if(_.isUndefined(jadeTemplate) || jadeTemplate===''){

        var templateFile = fs.readFileSync('platforms/amt/microtask.jade');

        var options = {
          filename: 'platforms/amt/microtask.jade',
          rootpath: 'platforms/amt/'
        };

        var compiledTemplate = jade.compile(templateFile,options);

        questionXML = compiledTemplate({microtask:microtask,task:task});

      }else{
        var templateFile = fs.readFileSync('platforms/amt/'+jadeTemplate);

        var options = {
          filename: 'platforms/amt/'+jadeTemplate,
          rootpath: 'platforms/amt/'
        };

        var compiledTemplate = jade.compile(templateFile,options);
        questionXML = compiledTemplate({microtask:microtask,task:task});
      }

      fs.writeFileSync('questionXML.xml',questionXML);
      log.trace('QuestionXML for the microtask %s created',microtask.id);

      return callback();
    }));

  };

  //Create the Hit
  var createHit = function(callback){
    log.trace( 'Creating HIT' );

    //TODO: prenderle dalla config
    var options = {maxAssignments: 13};
    var lifeTimeInSeconds = 3600*24*5; // 5 day

    HIT.create(hitTypeId,questionXML,lifeTimeInSeconds,options,function(err,hit){
      if( err ) return callback( err );

      log.trace('created hit with id %s', hit.id);

      microtask.setMetadata('hit',hit.id);

      microtask.save(executeDomain.bind(callback));

    });

  };

  var hitTypeMeta = task.getMetadata('hitType');
  var actions = [];
  if(_.isUndefined(hitTypeMeta)){
    log.trace('HitType not found');
    actions = [executeDomain.bind(createHitType),executeDomain.bind(renderQuestion),executeDomain.bind(createHit)];
  }else{
    hitTypeId = hitTypeMeta;
    log.trace('HitType %s found',hitTypeId);
    actions = [executeDomain.bind(renderQuestion),executeDomain.bind(createHit)];
  }

  //TODO: do it with waterfall
  async.series(actions,function(err){
    if(err) return callback(err);

    log.trace('All HIT created');
    return callback();
  });
}


var Platform = {
  invite: undefined,
  timed: {
    expression: '* * * * *',
    onTick: retrieve
  },
  execute: execute,
  init: create,
  params : {
    jadeTemplate:{
      type:'string',
      'default':'customTemplate.jade'
    },
    url: {
      type:'url',
      'default': 'https://mechanicalturk.sandbox.amazonaws.com'
    },
    accessKeyId:{
      type:'string',
      'default':''
    },
    secretAccessKey:{
      type:'string',
      'default':''
    },
    price:{
      type:'number',
      'default':0.01
    },
    duration:{
      type:'number',
      'default': 60
    }
  }
};




module.exports = exports = Platform;