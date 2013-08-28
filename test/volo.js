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

// Test configuration
request = request( 'http://localhost:2100' );


describe( 'Volo flow test', function() {
  var job;
  var task;
  var microtask;
  var objects;
  var execution;

  
  it( 'Create a job', function( done ) {
    var rawJob = {
      name: 'test job'
    };

    request.post('/api/job')
    .expect(200)
    .expect('Content-Type',/json/)
    .send( rawJob )
    .end( function( err, res ) {
      res.body.should.have.property( 'job' );
      job = res.body.job;
      return done();
    });
  } );


  it( 'Create a Task', function( done ) {
    var rawTask = {
      name: 'Test Task',
      type: 'LIKE',
      job: job,
      objects: [],
      platform:["FACEBOOK"]
    };

    request.post('/api/task')
    .expect(200)
    .expect('Content-Type',/json/)
    .send( rawTask )
    .end( function( err, res ) {
      res.body.should.have.property( 'task' );
      task = res.body.task;
      return done();
    });
  } );



  it( 'Add objects to Task', function( done ) {
    var rawObjects = {
      objects: [
        { name: 'oggetto1', data: { volo: 'volo' } },
        { name: 'oggetto2', data: { volo: 'volo' } },
        { name: 'oggetto3', data: { volo: 'volo' } }
      ]
    };

    request.post('/api/objects?task='+task)
    .expect(200)
    .expect('Content-Type',/json/)
    .send( rawObjects )
    .end( function( err, res ) {
      res.body.should.have.property( 'objects' )['with'].lengthOf( rawObjects.objects.length );
      objects = res.body.objects;
      return done();
    });
  } );


  it.skip( 'Get the task object IDs', function( done ) {
    request.get('/api/task?task='+task)
    .expect(200)
    .expect('Content-Type',/json/)
    .end( function( err, res ) {
      res.body.should.have.property( 'objects' );
      objects = res.body.objects;
      return done();
    });
  });

  it( 'Create a MicroTask', function( done ) {
    var rawMicroTask = {
      objects: objects
    };

    request.post('/api/microtask?task='+task)
    .expect(200)
    .expect('Content-Type',/json/)
    .send( rawMicroTask )
    .end( function( err, res ) {
      res.body.should.have.property( 'microtask' );
      microtask = res.body.microtask;
      return done();
    });
  } );

  it( 'Get an execution', function( done ) {
    request.get('/api/execution?job='+job+'&platform=native')
    .expect(200)
    .expect('Content-Type',/json/)
    .end( function( err, res ) {
      res.body.should.have.property( 'execution' );
      execution = res.body.execution;
      return done();
    });
  });

  it( 'Post an answer', function( done ) {
    var answer = {
      likedObjects: [
        objects[0],
        objects[2]
      ]
    };

    request.post('/api/answer?execution='+execution)
    .expect(200)
    .expect('Content-Type',/json/)
    .send( answer )
    .end( function( err, res ) {
      res.body.should.have.property( 'task' );
      res.body.should.have.property( 'microtask' );
      res.body.should.have.property( 'execution' );
      res.body.should.have.property( 'platform' );

      return done();
    });
  });
});