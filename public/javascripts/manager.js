/* global $, markdown */

// Compile elements with the md class
$( '.md' ).each( function() {
  this.innerHTML = markdown.toHTML( this.innerHTML );
} );
/*
$( function() {
  // instance DataTables on dt tables elements
  $( 'table.dt' ).dataTable( {
    sDom: 'ipt'
  } );
});
*/