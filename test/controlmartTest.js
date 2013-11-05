/*globals describe */
/*globals it */

var mongoose = require('mongoose');
require( 'should' );

var ControlMartSchema = require('./models/controlmart.js');

var db = mongoose.connect('mongodb://localhost/Test');

var ControlMart = db.model('controlmart',ControlMartSchema);

var rawTuple  = {
	name:'test',
	data:'value'
};

describe('ControlMart test',function(){
	it('Should save',function(done){

		ControlMart.insert(rawTuple,function(err,tuple){
			if(err) return done(err);

			tuple.name.should.be.equal(rawTuple.name);
			tuple.data.should.be.equal(rawTuple.data);

			return done();
		});
	});

	it('Shoud update the tuple',function(done){
		rawTuple.data='newValue';
		ControlMart.insert(rawTuple,function(err,tuple){
			if(err) return done(err);

			tuple.name.should.be.equal(rawTuple.name);
			tuple.data.should.be.equal(rawTuple.data);

			return done();
		});
	});

	it('Should return the data of the tuple',function(done){
		ControlMart.get(rawTuple,function(err,data){
			if(err) return done(err);

			data.should.be.equal(rawTuple.data);

			return done();
		});
	});

	it('Should return an array of tuples',function(done){
		var tupletoSearch = {
			name:'test'
		};
		ControlMart.select(tupletoSearch,function(err,tuples){
			if(err) return done(err);

			tuples[0].data.should.be.equal(rawTuple.data);

			return done();
		});
	});
});
