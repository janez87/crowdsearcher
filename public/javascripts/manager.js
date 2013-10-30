/* jshint browser: true */
/* global $, noty, markdown, baseUrl */

$.ajaxSetup({
  dataType: 'json',
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
} );


// Compile elements with the md class
$( '.md' ).each( function() {
  this.innerHTML = markdown.toHTML( this.innerHTML );
} );