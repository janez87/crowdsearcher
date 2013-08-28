var APIError = require( '../api/error' );
var fs = require('fs');
var mongo = require('mongoose');
var querystring = require('querystring');
// Test libraries
require( "should" );
var request = require('supertest');



GLOBAL.common = {
  log: require( 'bunyan' ).createLogger( {
    name: 'Test',
    level: 'trace'
  } )
};


// Test configuration
request = request( 'http://localhost:2100' );
mongo.connect('mongodb://localhost/CrowdSearcher');

describe('API test',function(){
  //test parameters
  var testJob = JSON.parse( fs.readFileSync( __dirname+'/job.json' ) );
  var testTask = JSON.parse( fs.readFileSync( __dirname+'/task.json' ) );
  var testObjects = JSON.parse( fs.readFileSync( __dirname+'/objects.json' ) );

  var ObjectId = mongo.Types.ObjectId;
  var fakeId = ( new ObjectId() ).valueOf();

  //retrieved after the post test
  var testId = '';
  var microTaskTestId = '';
  var testExecutionId = '';
  var testJobId = '';
  var objectIds = [];

  describe('Wrong request',function(){

    it('should return status code NOT_IMPLEMENTED',function(done){
      request.get('/api/wrongendopint')
      .expect(APIError.NOT_IMPLEMENTED)
      .expect('Content-Type',/json/)
      .end(done);
    });
  });

  describe('Job POST API',function(){
    it('should return OK and the job id ',function(done){
      request.post('/api/job')
      .expect(200)
      .expect('Content-Type',/json/)
      .send(testJob)
      .end(function(err,res){
        res.body.should.have.property('job');
        res.body.job.should.be.a('string');
        testJobId = res.body.job;
        testTask.job = testJobId;
        return done(err);
      });
    });
  });

  describe('Job GET API',function(){
    it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
      request.get('/api/job')
      .expect(APIError.BAD_REQUEST)
      .expect('Content-Type',/json/)
      .end(function(err,res){
        res.body.id.should.equal('PARAMETER_MISSING');
        return done(err);
      });
    });

    it('should return BAD_REQUEST and INVALID_JOB_ID if the id is empty',function(done){
      request.get('/api/job?job=')
      .expect(APIError.BAD_REQUEST)
      .expect('Content-Type',/json/)
      .end(function(err,res) {
        res.body.id.should.equal('INVALID_JOB_ID');
        return done(err);
      });
    });

    it('should return NOT_FOUND and JOB_NOT_FOUND if the job does not exist',function(done){
      request.get('/api/job?job='+fakeId)
      .expect(APIError.NOT_FOUND)
      .expect('Content-Type',/json/)
      .end(function(err,res){
        res.body.id.should.equal('JOB_NOT_FOUND');
        return done(err);
      });
    });

    it('should return the JSON representation of the job if it\'s all ok ',function(done){
      request.get('/api/job?job='+testJobId)
      .expect(200)
      .expect('Content-Type',/json/)
      .end(function(err,res){
        res.body.id.should.equal(testJobId);
        return done(err);
      });
    });
  });

  describe('Task API',function(){
    describe('Task POST API',function(){
      it('should return BAD_REQUEST without any parameters',function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({})
        .end(done);
      });

      it('should return BAD_REQUEST and TASK_NAME_MISSING if name is empty',function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({name:''})
        .end(function(err,res){
          res.body.id.should.equal('TASK_NAME_MISSING');
          return done(err);
        });
      });

      it('should return BAD_REQUEST and TASK_TYPE_MISSING if type is not provided',function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({name:'Name'})
        .end(function(err,res){
          res.body.id.should.equal('TASK_TYPE_MISSING');
          return done(err);
        });
      });

      it('should return BAD_REQUEST and TASK_TYPE_NOT_AVIABLE if the sected task type does not exist',function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({name:'Name',type:"WRONG"})
        .end(function(err,res){
          res.body.id.should.equal('TASK_TYPE_NOT_AVAILABLE');
          return done(err);
        });
      });

      it('should return ??? if the task has no objects',function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send(
          {
            job:testJobId,
            name: "Test Task",
            type: "LIKE",
            platforms:[
            {name:"FACEBOOK"}]
          })
        .end(function(err,res){
          res.body.id.should.equal('TASK_TYPE_NOT_AVAILABLE');
          console.log(err.message);
          return done(err);
        });
      });

      it('should return OK and the id of the saved task if all the parameters are provided ',function(done){
        request.post('/api/task')
        .expect(200)
        .expect('Content-Type',/json/)
        .send(testTask)
        .end(function(err,res){
          res.body.should.have.property('task');
          res.body.task.should.be.a('string');
          testId = res.body.task;
          return done(err);
        });
      });

      describe.skip('PUT Splitting strategy',function(){
        it( 'should return BAD_REQUEST and MISSING_SPLITTINGSTRATEGY if no data is provided', function(done){
            request.put('/api/splittingstrategy?task='+testId )
            .expect(APIError.BAD_REQUEST)
            .expect('Content-Type',/json/)
            .end( function( err, res ) {
              res.body.id.should.equal( 'MISSING_SPLITTINGSTRATEGY' );
              return done(err);
            } );
        });

        it( 'should return BAD_REQUEST and MISSING_SPLITTINGSTRATEGY_NAME if no name is provided', function(done){
            request.put('/api/splittingstrategy?task='+testId )
            .expect(APIError.BAD_REQUEST)
            .expect('Content-Type',/json/)
            .send({randomparamater:"CUSTOM"})
            .end( function( err, res ) {
              res.body.id.should.equal( 'MISSING_SPLITTINGSTRATEGY_NAME' );
              return done(err);
            } );
        });

        it( 'should return BAD_REQUEST and STRATEGY_NOT_FOUND if the strategy does not exist', function(done){
            request.put('/api/splittingstrategy?task='+testId )
            .expect(APIError.BAD_REQUEST)
            .expect('Content-Type',/json/)
            .send({name:"WRONG"})
            .end( function( err, res ) {
              res.body.id.should.equal( 'STRATEGY_NOT_FOUND' );
              return done(err);
            } );
        });

        it( 'should return BAD_REQUEST and CONFIGURATION_MISMATCH if bla', function(done){
            request.put('/api/splittingstrategy?task='+testId )
            .expect(APIError.BAD_REQUEST)
            .expect('Content-Type',/json/)
            .send({name:"REDUNDANT"})
            .end( function( err, res ) {
              res.body.id.should.equal( 'CONFIGURATION_MISMATCH' );
              return done(err);
            } );
        });

        it( 'should return OK if all the paramters are provided', function(done){
            request.put('/api/splittingstrategy?task='+testId )
            .expect(200)
            .expect('Content-Type',/json/)
            .send({name:"EQUI_SPLIT",objectsNumber:4})
            .end(done);
        });
      });

      describe.skip('PUT Assignment strategy',function(){
        it( 'should return BAD_REQUEST and MISSING_ASSIGNEMENTSTRATEGY if no data is provided', function(done){
            request.put('/api/assignmentstrategy?task='+testId )
            .expect(APIError.BAD_REQUEST)
            .expect('Content-Type',/json/)
            .end( function( err, res ) {
              res.body.id.should.equal( 'MISSING_ASSIGNEMENTSTRATEGY' );
              return done(err);
            } );
        });
      });

      describe.skip('PUT Implementation strategy',function(){
        it( 'should return BAD_REQUEST and MISSING_IMPLEMENTATIONSTRATEGY if no data is provided', function(done){
            request.put('/api/assignmentstrategy?task='+testId )
            .expect(APIError.BAD_REQUEST)
            .expect('Content-Type',/json/)
            .end( function( err, res ) {
              res.body.id.should.equal( 'MISSING_IMPLEMENTATIONSTRATEGY' );
              return done(err);
            } );
        });
      });
    });

    describe.skip('Task GET API',function(){
      it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
        request.get('/api/task')
        .expect( APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('PARAMETER_MISSING');
          return done(err);
        });
      });

      it('should return BAD_REQUEST and INVALID_TASK_ID if the id is empty',function(done){
        request.get('/api/task?task=')
        .expect( APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('INVALID_TASK_ID');
          return done(err);
        });
      });


      it('should return NOT_FOUND and TASK_NOT_FOUND if the task does not exist',function(done){
        request.get('/api/task?task='+fakeId)
        .expect( APIError.NOT_FOUND)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('TASK_NOT_FOUND');
          return done(err);
        });
      });

      it('should return a JSON representation of the task if the id is ok',function(done){
        request.get('/api/task?task='+testId)
        .expect( 200 )
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal(testId);
          return done(err);
        });
      });

    });

    describe.skip('Objects API',function(){
      describe('Objects POST API',function(){
        it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
          request.post('/api/objects')
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .end(function(err,res){
            res.body.id.should.equal('PARAMETER_MISSING');
            return done(err);
          });
        });

        it('should return BAD_REQUEST and INVALID_TASK_ID if the task id is empty',function(done){
          request.post('/api/objects?task')
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .end(function(err,res){
            res.body.id.should.equal('INVALID_TASK_ID');
            return done(err);
          });
        });

        it('should return BAD_REQUEST and TASK_NOT_FOUND if the selected task does not exist',function(done){
          request.post('/api/objects?task='+fakeId)
          .expect(APIError.NOT_FOUND)
          .expect('Content-Type',/json/)
          .send({})
          .end(function(err,res){
            res.body.id.should.equal('TASK_NOT_FOUND');
            return done(err);
          });
        });

        it('should return BAD_REQUEST and MISSING_OBJECTS if the objects are not provided',function(done){
          request.post('/api/objects?task='+testId)
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .send({})
          .end(function(err,res){
            res.body.id.should.equal('MISSING_OBJECTS');
            return done(err);
          });
        });

        it('should return BAD_REQUEST and OBJECTS_NOT_PROVIDED if the objects array is empty',function(done){
          request.post('/api/objects?task='+testId)
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .send({objects:[]})
          .end(function(err,res){
            res.body.id.should.equal('OBJECTS_NOT_PROVIDED');
            return done(err);
          });
        });

        it('should return BAD_REQUEST and OBJECTS_NOT_ARRAY if the objects array is not an array',function(done){
          request.post('/api/objects?task='+testId)
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .send({objects:'a'})
          .end(function(err,res){
            res.body.id.should.equal('OBJECTS_NOT_ARRAY');
            return done(err);
          });
        });

        it('should return OK and the id of the created objects if all is ok',function(done){
          request.post('/api/objects?task='+testId)
          .expect(200)
          .expect('Content-Type',/json/)
          .send(testObjects)
          .end(function(err,res){
            res.body.should.have.property('objects');
            objectIds = res.body.objects;
            return done(err);
          });
        });


      });

      describe('Objects GET API',function(){
        it('should return Ok and the JSON representation of the object if a single if is provided',function(done){
          request.get('/api/object?object='+objectIds[0])
          .expect(200)
          .expect('Content-Type',/json/)
          .end(function(err,res){
            var o = res.body[0];
            o.should.have.property('name');
            o.should.have.property('data');
            return done(err);
          });
        });

        it('should return Ok and the JSON representation of the objects if an array is provided',function(done){
          var query = {objects:objectIds };
          request.get('/api/object?'+querystring.stringify(query))
          .expect(200)
          .expect('Content-Type',/json/)
          .end(function(err,res){
            var array = res.body;
            array.length.should.eql(objectIds.length);
            return done(err);
          });
        });
      });
    });

    describe.skip('Open Task API',function(){
      it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
        request.post('/api/opentask')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('PARAMETER_MISSING');
          return done(err);
        });
      });

      it('should return BAD_REQUEST and INVALID_TASK_ID if the task id is empty',function(done){
        request.post('/api/opentask?task=')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('INVALID_TASK_ID');
          return done(err);
        });
      });

      it('should return NOT_FOUND and TASK_NOT_FOUND if the task does not found',function(done){
        request.post('/api/opentask?task='+fakeId)
        .expect(APIError.NOT_FOUND)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('TASK_NOT_FOUND');
          return done(err);
        });
      });

      it('should return OK if all the parameters are ok',function(done){
        //this.timeout(0);
        request.post('/api/opentask?task='+testId)
        .expect(200)
        .expect('Content-Type',/json/)
        .end(done);
      });
    });
  });

  describe.skip('MicroTask API',function(){
    describe('MicroTask POST API',function(){
      it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
        request.post('/api/microtask')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err, res){
            res.body.id.should.equal('PARAMETER_MISSING');
            return done(err);
        });
      });

      it('should return BAD_REQUEST and INVALID_TASK_ID if the id of the task is empty',function(done){
        request.post('/api/microtask?task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err, res){
            res.body.id.should.equal('INVALID_TASK_ID');
            return done(err);
        });
      });

      it('should return NOT_FOUND and TASK_NOT_FOUND if the selected task does not exist',function(done){
        request.post('/api/microtask?task='+fakeId)
        .expect(APIError.NOT_FOUND)
        .expect('Content-Type',/json/)
        .end(function(err, res){
            res.body.id.should.equal('TASK_NOT_FOUND');
            return done(err);
        });
      });

      it('should return BAD_REQUEST and MISSING_OBJECTS if the objects are not present',function(done){
        request.post('/api/microtask?task='+testId)
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({})
        .end(function(err, res){
            res.body.id.should.equal('MISSING_OBJECTS');
            return done(err);
        });
      });

      it('should return OK the id of the microtask if all the parameters are correct',function(done){
        request.post('/api/microtask?task='+testId)
        .expect(200)
        .expect('Content-Type',/json/)
        .send({objects:objectIds})
        .end(function(err, res){
            res.body.should.have.property('microtask');
            res.body.microtask.should.be.a('string');
            microTaskTestId = res.body.microtask;
            return done(err);
        });
      });
    });

    describe('MicroTask GET API',function(){
      it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
        request.get('/api/microtask')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('PARAMETER_MISSING');
          return done(err);
        });
      });

      it('should return BAD_REQUEST and INVALID_MICROTASK_ID if the id is empty',function(done){
        request.get('/api/microtask?microtask=')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('INVALID_MICROTASK_ID');
          return done(err);
        });
      });

      it('should return NOT_FOUND and MICROTASK_NOT_FOUND if the microtask does not exists',function(done){
        request.get('/api/microtask?microtask='+fakeId)
        .expect(APIError.NOT_FOUND)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('MICROTASK_NOT_FOUND');
          return done(err);
        });
      });

      it('should return OK and the json representation of the microtask if the parameter is ok',function(done){
        request.get('/api/microtask?microtask='+microTaskTestId)
        .expect(200)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal(microTaskTestId);
          return done(err);
        });
      });
    });


  });
  
  describe.skip('Execution API',function(){
    describe('Execution GET API',function(){
      it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
        request.get('/api/execution')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('PARAMETER_MISSING');
          return done(err);
        });      
      });

       it('should return OK with and the id of the execution if a task is passed',function(done){
        request.get('/api/execution?task='+testId+'&platform=TEF')
        .expect(200)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.should.have.property('execution');
          testExecutionId = res.body.execution;
          return done(err);
        });      
      }); 

       it('should return OK with and the id of the execution if a job is passed',function(done){
        request.get('/api/execution?job='+testJobId+'&platform=TEF')
        .expect(200)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.should.have.property('execution');
          return done(err);
        });      
      });

       it.skip('should return OK with and the id of the execution if a microtask is passed',function(done){
        request.get('/api/execution?microtask='+microTaskTestId+'&platform=TEF')
        .expect(200)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.should.have.property('execution');
          return done(err);
        });      
      });

    });

    describe('Execution START API',function(){
      it('should return ??? if no data is provided',function(done){
        request.get('/api/run')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          return done(err);
        });
      });

      it('should return OK and do something cool is all is ok',function(done){
        request.get('/api/run?execution='+testExecutionId)
        .expect(200)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          return done(err);
        });
      });
    });
  });

  describe('Answer API',function(){
    describe('Answer POST API',function(){
      it('should return BAD_REQUEST and PARAMETER_MISSING if no data is provided',function(done){
        request.post('/api/answer')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .end(function(err,res){
          res.body.id.should.equal('PARAMETER_MISSING');
          return done(err);
        });

      });
    });
  });

});