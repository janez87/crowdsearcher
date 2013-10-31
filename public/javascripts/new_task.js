/* jshint browser: true */
/* global $, noty, baseUrl, Arg, getParams */

function getObject() {
  var task = {};


  return task;
}

$( 'select[data-toggle="collapse"]' ).on( 'change', function() {
  var $selected = $( 'option:selected', this );
  var $parent = $( $( this ).data( 'parent' ) );
  $parent.children( ':visible' ).slideUp();
  if( $selected.val()!=='' ) {
    var target = $selected.data( 'target' );
    $( target ).slideDown();
  }
} );

$( '.add' ).on( 'click', function ( evt ) {
  var data = $( this ).data();
  var $selected = $( 'option:selected', data.source );
  if( $selected.val()!=='' ) {

    var obj = {
      name: $selected.val(),
      params: getParams( $selected.data( 'target' ) )
    };
    var $target = $( data.target );
    $target.append( '<p>'+obj.name+'</p>' );

    console.log( obj );
  }
} );

$( '#job' ).val( Arg( 'job' ) );
$( '#reset' ).on( 'click', function( evt ) {
  evt.preventDefault();

  location.href = location.href;
  return false;
} );

var $send = $( '#send' );
$send.click( function() {
  console.log( getObject() );
  /*
  // Create the AJAX request
  var url = baseUrl+'manage/job/new';
  var req = $.ajax( {
    url: url,
    contentType: 'application/json; charset=UTF-8',
    dataType: 'json',
    processData: true,
    type: 'POST',
    data: JSON.stringify( data )
  } );

  req.done( function ( job ) {
    noty( {
      type: 'success',
      text: 'Job posted',
      buttons: [ {
        addClass: 'btn btn-sm btn-default',
        text: '<i class="fa fa-folder-open"></i> Job details',
        onClick: function() {
          location.href = baseUrl+'manage/job/'+job._id;
        }
      } ]
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
  */
} );