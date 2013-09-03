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
var fb = require( 'fb' );

var APIError = require( '../api/error' );


// Test libraries
require( 'should' );
var request = require('supertest');

// Test configuration
request = request( 'http://localhost:2100' );

describe.skip( 'Test post and comment', function() {
  var token = 'AAAERZBLc1B7cBAFxZALqEmcKr7arLkHZCn2sG2g6WzFDLlnIGyYoGE1w1HXfbvZCg0cqBWIrxjlhx27sBpVQDdCbBn466xngIySBe7WUYwZDZD';
  var postID;
  it( 'Post a POST', function( done ) {
    this.timeout(0);

    fb.api('me/feed', 'post', {
      message: 'TEST',
      access_token: token
    }, function( res ) {
      if( res.error ) return done( new Error( res.error.message||res.error.code ) );

      postID = res.id;
      done();
    });
  } );

  it( 'Post a COMMENT', function( done ) {
    this.timeout(0);

    fb.api( postID+'/comments', 'post', {
      message: 'asdasd',
      access_token: token
    }, function( res ) {
      if( res.error ) return done( new Error( res.error.message||res.error.code ) );

      done();
    });
  } );
} );

describe( 'Volo FB test', function() {
  var job;
  var task;
  var microtask;
  var objects;
  var execution;

  it( 'Create a job', function( done ) {
    var rawJob = {
      name: 'test job',
      metadata: [
        {
          name: 'works',
          value: true
        }
      ]
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
  } )
;

  it( 'Create a Task', function( done ) {
    // FB is slow
    this.timeout(0);

    var rawTask = {
      name: 'Test Task',
      type: 'LIKE',
      job: job,
      metadata: [
        {
          name: 'works',
          value: false
        },
        {
          name: 'works_task',
          value: true
        }
      ],
      platforms: [
        {
          name: 'facebook',
          configuration: {
            appId: '301234899978167',
            appSecret: 'c846dcb147e9366aae165c3ab59b254a',
            appToken: '301234899978167|CyrtO9jcgk8nET-Ct4rZltMrres',
            token: 'AAAERZBLc1B7cBAFxZALqEmcKr7arLkHZCn2sG2g6WzFDLlnIGyYoGE1w1HXfbvZCg0cqBWIrxjlhx27sBpVQDdCbBn466xngIySBe7WUYwZDZD'
          }
        }
      ],

      splittingStrategy: {
        name: 'EQUI_SPLIT',
        objectsNumber: 2
      },
      invitationStrategy: {
        name: 'NATIVE',
        platforms: [ 'facebook', 'twitter' ]
      },
      implementationStrategy: {
        name: 'NATIVE',
        platforms: [ 'facebook' ]
      },
      controlrules: [
        {
          'event': 'OPEN_TASK',
          type: 'SPLIT'
        },
        {
          'event': 'OPEN_TASK',
          type: 'INVITATION'
        }
      ],
      objects: []
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
        { name: 'oggetto2', data: { volo: 'volo1' } },
        { name: 'oggetto3', data: { volo: 'volo2' } }
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


  it( 'Open the Task', function( done ) {
    // FB is slow
    this.timeout(0);

    request.post('/api/opentask?task='+task)
    .expect(200)
    .expect('Content-Type',/json/)
    .end( done );
  });

});