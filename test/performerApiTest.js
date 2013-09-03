/*globals describe */
/*globals it */

require( 'should' );

var request = require('supertest');

// Test configuration
request = request( 'http://localhost:2100' );

describe( 'Performer API', function() {

	var rawPerformer = {
		name:{
			first:'Andrea',
			last:'ciccio'
		},
		email:'andrea.mauri87@gmail.com',
		metadata: [{
			key:'group',
			value:'gruppo2'
		}]
	};

	var performerId;

	it('should create a Performer',function(done){

		request.post('/api/performers')
		.expect(200)
		.expect('Content-Type',/json/)
		.send( rawPerformer )
		.end( function( err, res ) {
			if(err) return done(err);

			res.body.should.have.property('performers')['with'].lengthOf(1);
			performerId = res.body.performers[0];

			return done();
		});
	});

	it('should retrieve the created performer',function(done){

		request.get('/api/performer?user='+performerId)
		.expect(200)
		.expect('Content-Type',/json/)
		.end(function(err,res){
			if(err) return done(err);

			res.body.should.have.property('performer');
			var performer = res.body.performer;
			console.log(performer);
			performer.email.should.be.equal('andrea.mauri87@gmail.com');
			return done();
		});
	});

});