/* jshint browser: true */
/* global $, noty, markdown, baseUrl, confirmNoty */

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

$( 'select[data-toggle="collapse"]' ).on( 'change', function() {
  var $selected = $( 'option:selected', this );
  var $parent = $( $( this ).data( 'parent' ) );
  $parent.children( ':visible' ).slideUp();
  if( $selected.val()!=='' ) {
    var target = $selected.data( 'target' );
    $( target ).slideDown();
  }
} );

$( 'a[data-entity][data-id]' ).on( 'click', function( evt ) {
  evt.preventDefault();
  var data = $( this ).data();
  var id = data.id;
  var entity = data.entity;
  var destination = data.destination;

  if( !id || !entity )
    return false;

  var method = data.method || 'GET';
  method = method.toUpperCase();
  var action = data.action;

  function performAction() {
    var n = noty( {
      text: 'Wait please...',
      modal: true
    } );

    var url = baseUrl+'api/'+entity+'/'+id+'/'+action;
    if( method==='DELETE' )
      url = baseUrl+'api/'+entity+'?'+entity+'='+id;

    var req = $.ajax( {
      url: url,
      type: method
    } );

    req.always( function() {
      n.close();
    } );

    req.done( function() {
      noty( {
        type: 'success',
        text: 'Ok',
        timeout: 1500,
        modal: true,
        callback: {
          afterClose: function() {
            if( destination!==false ) {
              location.href = destination || location.href;
            }
          }
        }
      } );
    } );

    req.fail( function( jqXHR, status, err ) {
      var json = jqXHR.responseJSON || {};
      noty( {
        type: 'error',
        text: err+': '+json.message
      } );

      console.error( json, jqXHR );
    } );
  }

  if( method==='DELETE' ) {
    var text = 'Are you sure you want to delete the '+entity+' '+id+'?';
    confirmNoty( text, performAction );
  } else {
    performAction();
  }


  return false;
} );