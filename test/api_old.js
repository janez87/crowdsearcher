var _  = require('underscore');
var fs  = require('fs');
var url = require('url');
var path = require( 'path' );
var util  = require('util');
var flash = require('connect-flash');
var async = require('async');
var nconf = require( 'nconf' );
var mongo = require('mongoose');
var passport = require( 'passport' );

var APIError = require( '../api/error' );


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


// Mongo
// Schema
var ObjectId = mongo.Types.ObjectId;
var fakeId = ( new ObjectId() ).valueOf();

var JobSchema = require( '../models/job' );
var TaskSchema = require( '../models/task' );
var MicroTaskSchema = require( '../models/microtask' );
var ObjectSchema = require( '../models/object' );

// Models
var JobModel = mongo.model( 'job', JobSchema );
var TaskModel = mongo.model( 'task', TaskSchema );
var MicroTaskModel = mongo.model( 'microtask', MicroTaskSchema );
var ObjectModel = mongo.model( 'object', ObjectSchema );



describe( 'API test', function() {
  var rawJob = JSON.parse( fs.readFileSync( __dirname+'/job.json' ) );
  var rawTask = JSON.parse( fs.readFileSync( __dirname+'/task.json' ) );
  var rawObject1 = JSON.parse( fs.readFileSync( __dirname+'/object1.json' ) );
  var rawObject2 = JSON.parse( fs.readFileSync( __dirname+'/object2.json' ) );
  
  var job = new JobModel( rawJob );
  rawTask.job = job.id;
  var task = new TaskModel( rawTask );
  //var microtask = new MicroTaskModel( rawTask );
  rawObject1.job = job.id;
  var object1 = new ObjectModel( rawObject1 );
  rawObject2.job = job.id;
  var object2 = new ObjectModel( rawObject2 );

  var objects = [
    object1.id,
    object2.id
  ];

  before( function( done ) {
    async.series( [
      function( cb ) { job.save( cb ); },
      function( cb ) { task.save( cb ); },
      function( cb ) { object1.save( cb ); },
      function( cb ) { object2.save( cb ); }
    ], function( err, results ) {
      done( err );
    } );
  } );
  
  describe( 'Random api request', function() {
    
    it( 'should return status code NOT_IMPLEMENTED', function( done ) {

      request.get( '/api/asdasasdasd' )
      .expect( APIError.NOT_IMPLEMENTED )
      .expect( 'Content-Type', /json/ )
      .end( done );

    });
  });

  
  describe( 'Task API', function() {

    // GET
    describe( 'Task GET API', function() {
      
      it( 'No params -> BAD_REQUEST and PARAMETER_MISSING', function( done ) {
         request.get( '/api/task' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'PARAMETER_MISSING' );
          return done();
        } );
      });

      it( 'Id set to empty -> BAD_REQUEST and INVALID_TASK_ID' , function( done ) {
        request.get( '/api/task?task' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end(  function( err, res ) {
          res.body.id.should.equal( 'INVALID_TASK_ID' );
          return done();
        } );
      });

      it( 'Id set to an empty string -> BAD_REQUEST and INVALID_TASK_ID', function( done ) {
        request.get( '/api/task?task=' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'INVALID_TASK_ID' );
          return done();
        } );
      });

      it( 'Id unavailable -> NOT_FOUND and TASK_NOT_FOUND', function( done ) {
        request.get( '/api/task?task='+fakeId )
        .expect( APIError.NOT_FOUND )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'TASK_NOT_FOUND' );
          return done();
        } );
      });

      it( 'Everything ok', function( done ) {
        request.get( '/api/task?task='+task.id )
        .expect( 200 )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( task.id );
          return done();
        } );
      });
      
    } );
    

    // POST
    describe( 'Task POST API', function() {

      it( 'without any param should return BAD_REQUEST', function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({})
        .end(done);
      });

      it( 'empty name -> BAD_REQUEST and TASK_NAME_MISSING,', function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send({name:''})
        .end(function( err, res ) {
          res.body.id.should.equal( 'TASK_NAME_MISSING' );
          return done();
        } );
      });


      it( 'empty type -> BAD_REQUEST and TASK_TYPE_MISSING', function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send( {
          name: 'Luca G'
        } )
        .end(function( err, res ) {
          res.body.id.should.equal( 'TASK_TYPE_MISSING' );
          return done();
        } );
      });


      it( 'unavailable task type -> BAD_REQUEST and TASK_TYPE_NOT_AVAILABLE', function(done){
        request.post('/api/task')
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send( {
          name: 'Test Task',
          type: 'UNAVAILABLE'
        } )
        .end( function( err, res ) {
          res.body.id.should.equal( 'TASK_TYPE_NOT_AVAILABLE' );
          return done();
        } );
      });

      //da aggiornare ogni volta che si aggiunge un parametro nuovo al task
      it( 'All parameter -> OK', function(done){
        var tempTask = {
          name: 'Test Task',
          type: 'LIKE',
          objects: []
        };

        request.post('/api/task')
        .expect(200)
        .expect('Content-Type',/json/)
        .send( tempTask )
        .end( function( err, res ) {

          res.body.should.have.property( 'id' );
          res.body.id.should.be.a('string');

          return done();

          /*
          var id = res.body.id;
          request.get( '/api/task?task='+id )
          .expect(200)
          .expect('Content-Type',/json/)
          .end( function( err, res ) {

            res.body['_id'].should.equal( id );
            res.body.should.have.property( 'job' );
            res.body.should.have.property( 'objects' );
            res.body.objects.length.should.equal( 1 );
            return done();
          } );
          */
        } );
      });


      describe( 'PUT Splitting Strategy',  function() {
        
        it( 'No body -> BAD_REQUEST and MISSING_SPLITTINGSTRATEGY', function(done){
          request.put('/api/splittingstrategy?task='+task.id )
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .end( function( err, res ) {
            res.body.id.should.equal( 'MISSING_SPLITTINGSTRATEGY' );
            return done();
          } );
        });

        it( 'Empty body -> BAD_REQUEST and MISSING_SPLITTINGSTRATEGY', function(done){
          request.put('/api/splittingstrategy?task='+task.id )
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .end( function( err, res ) {
            res.body.id.should.equal( 'MISSING_SPLITTINGSTRATEGY' );
            return done();
          } );
        });
        
        it( 'Missing name -> BAD_REQUEST and MISSING_SPLITTINGSTRATEGY_NAME', function(done){
          request.put('/api/splittingstrategy?task='+task.id )
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .send( {
            objectsNumber: 5
          } )
          .end( function( err, res ) {
            res.body.id.should.equal( 'MISSING_SPLITTINGSTRATEGY_NAME' );
            return done();
          } );
        });


        it( 'Missing name -> BAD_REQUEST and MISSING_SPLITTINGSTRATEGY_NAME', function(done){
          request.put('/api/splittingstrategy?task='+task.id )
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .send( {
            name: ''
          } )
          .end( function( err, res ) {
            res.body.id.should.equal( 'MISSING_SPLITTINGSTRATEGY_NAME' );
            return done();
          } );
        });

        it( 'Name configuration mismatch -> BAD_REQUEST and CONFIGURATION_MISMATCH', function(done){
          request.put('/api/splittingstrategy?task='+task.id )
          .expect(APIError.BAD_REQUEST)
          .expect('Content-Type',/json/)
          .send( {
            name: 'CUSTOM',
            objectsNumber: 5
          } )
          .end( function( err, res ) {
            res.body.id.should.equal( 'CONFIGURATION_MISMATCH' );
            return done();
          } );
        });


        it( 'Everything ok', function(done){
          request.put('/api/splittingstrategy?task='+task.id )
          .expect( 200 )
          .expect('Content-Type',/json/)
          .send( {
            name: 'CUSTOM',
            script: 'test'
          } )
          .end( done );
        });

      } );

    });
    
    describe( 'Task DELETE API', function() {

    });
  });

  describe( 'MicroTask API', function() {



    describe( 'MicroTask GET API', function() {
      it( 'No params -> BAD_REQUEST and PARAMETER_MISSING', function( done ) {
         request.get( '/api/microtask' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'PARAMETER_MISSING' );
          return done();
        } );
      });

      it( 'Id set to empty -> BAD_REQUEST and INVALID_MICROTASK_ID' , function( done ) {
        request.get( '/api/microtask?microtask' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end(  function( err, res ) {
          res.body.id.should.equal( 'INVALID_MICROTASK_ID' );
          return done();
        } );
      });

      it( 'Id set to an empty string -> BAD_REQUEST and INVALID_MICROTASK_ID', function( done ) {
        request.get( '/api/microtask?microtask=' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'INVALID_MICROTASK_ID' );
          return done();
        } );
      });

      it( 'Id unavailable -> NOT_FOUND and MICROTASK_NOT_FOUND', function( done ) {
        request.get( '/api/microtask?microtask='+fakeId )
        .expect( APIError.NOT_FOUND )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'MICROTASK_NOT_FOUND' );
          return done();
        } );
      });
    });






    describe( 'MicroTask POST API', function() {

      var taskId;
      var jobId;
      var objectIds;
      before( function( done ) {

        request.post('/api/task')
        .send( {
          name: 'Test Task',
          type: 'LIKE',
          objects: [ {
            name: 'test',
            data: "yeah"
          }, {
            name: 'test',
            data: {
              second: "testData"
            }
          } ]
        } ).end( function( err, res ) {
          taskId = res.body.id;
          
          request.get('/api/task?task='+taskId)
          .end( function( err, res ) {
            jobId = res.body.job;
            objectIds = res.body.objects;
            return done();
          });
        } );
      } );

      it( 'No parameter set -> BAD_REQUEST and PARAMETER_MISSING', function(done){
        request.post( '/api/microtask' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'PARAMETER_MISSING' );
          return done();
        } );
      });

      it( 'id set to empty -> BAD_REQUEST and INVALID_TASK_ID', function(done){
        request.post( '/api/microtask?task' )
        .expect( APIError.BAD_REQUEST )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'INVALID_TASK_ID' );
          return done();
        } );
      });

      it( 'Id unavailable -> NOT_FOUND and TASK_NOT_FOUND', function(done){
        request.post( '/api/microtask?task='+fakeId )
        .expect( APIError.NOT_FOUND )
        .expect( 'Content-Type', /json/ )
        .end( function( err, res ) {
          res.body.id.should.equal( 'TASK_NOT_FOUND' );
          return done();
        } );
      });
      
      it( 'No objects field passed -> BAD_REQUEST and OBJECTS_MISSING', function(done){
        request.post('/api/microtask?task='+taskId)
        .expect(APIError.BAD_REQUEST)
        .expect('Content-Type',/json/)
        .send( {} )
        .end( function( err, res ) {
          res.body.id.should.equal( 'OBJECTS_MISSING' );
          return done();
        } );
      });

      it( 'Objects passed -> OK', function(done){
        request.post('/api/microtask?task='+taskId)
        .expect( 200 )
        .expect('Content-Type',/json/)
        .send( {
          objects: objectIds
        } )
        .end( function( err, res ) {

          res.body.should.have.property( 'id' );
          res.body.id.should.be.a('string');

          return done();
        } );
      });


    });
    describe( 'MicroTask DELETE API', function() {
    });
  });

});