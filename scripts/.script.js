

// Script manager
// ====


// Load libraries
var _ = require('underscore');
var fs = require('fs');
var vm = require( 'vm' );
var path = require('path');
var nconf = require('nconf');



// Create a child logger
var log = common.log.child( { component: 'Script Manager' } );


// ##scriptList
// Get the list of available scripts
module.exports.list = exports.list = function list( callback ) {
  var scriptsPath = nconf.get( 'scripts:default' );
  fs.readdir( scriptsPath, callback );
};

module.exports.getFunction = exports.getFunction = function getFunction( name ) {
  var fileName = name+'.js';
  //TODO: must implement the real logic
  //TODO: run()!
  return function( event ) {
    log.trace( 'script %s running with %s parameters', name, arguments.length );
    log.trace( 'event: %s', event );
    var callback = arguments[ arguments.length-1 ];
    callback();
  };
};