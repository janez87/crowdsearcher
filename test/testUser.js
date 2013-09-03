/*globals describe */
/*globals it */

require( 'should' );
var mongoose = require('mongoose');

var db = mongoose.connect('mongodb://localhost/Test');

var Account = db.model('account',require('./models/account.js'));
var User = db.model('user',require('./models/user.js'));

var assert = require('assert');


describe( 'Task Model', function() {

	var user = new User({username:'user'});

	var data = {
		id:'29392932',
		photo:'urlToPhoto',
		token:'token',
		secretToken:'secretToken',
		email:'asd@asd.com'
	};

	it('should ad an account to a user',function(done){


		user.addAccount('facebook',data,function(err,user){
			if(err) return done(err);

			user.should.have.property('accounts');
			user.accounts.should.have.length(1);

			return done();
		});

	});

	it('should recover a user by its social account',function(done){

		User.findByAccountId('facebook',data.id,function(err,retrievedUser){
			if(err) return done(err);

			assert(user.id === retrievedUser.id);

			return done();
		});
	});

	it('should create a new user given a social account',function(done){

		var data = {
			id:'343434',
			photo:'urlToPhoto',
			token:'token',
			secretToken:'secretToken',
			email:'asd@asd.com'
		};

		User.createWithAccount('twitter',data,function(err,createdUser){
			if(err) return done(err);

			createdUser.should.have.property('accounts');
			createdUser.accounts.should.have.length(1);

			User.findByAccountId('twitter',data.id,function(err,retrievedUser){
				if(err) return done(err);

				assert(createdUser.id === retrievedUser.id);

				return done();
			});
		});

	});

});