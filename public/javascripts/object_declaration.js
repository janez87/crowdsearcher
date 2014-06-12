/* global $btnSend, sendData */
var $file = $( '#file' );
var $fileType = $( '#file_type' );
$file.on( 'click', function() {
  $file.attr( 'accept', $fileType.val() );
} );


function saveData( data, schema, gt ) {
  if ( data )
    $( '.wzData' ).val( JSON.stringify( {
      data: data,
      schema: schema,
      gt: gt
    } ) );
}

$btnSend.click( function( evt ) {

  var data = JSON.parse( $( '.wzData' ).val() );

  var $ids = $( '#header > th input' );

  var ids = $.map( $ids, function( element ) {
    return $( element ).val();
  } );

  var $types = $( '#header > th select option:selected' );

  var types = $.map( $types, function( element ) {
    return $( element ).val();
  } );

  var schema = {};

  for ( var i = 0; i < ids.length; i++ ) {
    schema[ ids[ i ] ] = types[ i ];
  }

  var gt = $( '#header > th input:radio:checked' ).val();

  saveData( data.data, schema, gt );

  return sendData.call( this, evt );
} );

function dataPreview( data, type ) {
  var html;
  if ( type === 'Object' ) {
    html = '<pre>' + JSON.stringify( data, null, 2 ) + '</pre>';
  } else {
    html = '' + data;
  }
  return html;
}

function createTableEditor( data, schema ) {
  var $header = $( '#header' );

  function createSelect( selected ) {
    var types = [
      'Array',
      'Number',
      'Date',
      'Boolean',
      'Object',
      'String'
    ];
    var select = '<select class="form-control">';
    $.each( types, function( idx, val ) {
      select += '<option' + ( val === selected ? ' selected' : '' ) + '>' + val + '</option>';
    } );
    select += '</select>';
    return select;
  }

  $.each( schema, function( prop, type ) {
    var $th = $( '<th></th>' );

    var $prop = $( '<input type="text"/>' );
    $prop.addClass( 'form-control input-sm' );
    $prop.val( prop );

    var $container = $( '<div class="input-group"><span class="input-group-addon" title="Ground truth"><input type="radio" name="gt" value="'+prop+'"></span></div>' );
    $container.append( $prop );

    $th.append( $container );
    $th.append( createSelect( type ) );
    $header.append( $th );
  } );

  var $data = $( '#data' );
  // Print only 5 rows
  for ( var i = 0; i < 5 && i < data.length; i++ ) {
    var $tr = $( '<tr></tr>' );
    $.each( schema, function( prop, type ) {
      var $td = $( '<td></td>' );
      var cell = data[ i ][ prop ];
      $td.attr( 'title', JSON.stringify( cell, null, 2 ) );
      $td.html( dataPreview( cell, type ) );
      $tr.append( $td );
    } );
    $data.append( $tr );
  }

  // Save data
  saveData( data, schema );
}

function readFile( file ) {
  // Read the file
  var reader = new FileReader();
  var ext = file.name;
  ext = ext.split( '.' );
  ext = ext.splice( -1 );
  ext = ext[ 0 ].toLowerCase();

  reader.onload = function() {
    var data = reader.result;
    var parser = parse[ ext ];
    if ( !parser ) {
      alert( ext + ' not implemented' );
      console.error( ext, data );
    } else {
      parser( data );
    }
  };

  reader.readAsText( file );
}


var parse = {
  'json': loadJSON
};

function loadJSON( data ) {
  var json = JSON.parse( data );
  var row = json.data[ 0 ];
  var schema = {};

  $.each( row, function( key, val ) {
    var type = 'string';
    type = toString.call( val ).split( ' ' ).splice( -1 )[ 0 ].slice( 0, -1 );
    if ( !isNaN( Date.parse( val ) ) ) type = 'Date';
    if ( $.isArray( val ) ) type = 'Array';
    schema[ key ] = type;
  } );

  createTableEditor( json.data, schema );
}

$file.on( 'change', function() {
  var file = this.files[ 0 ];
  if ( !file ) return;

  readFile( file );
} );


saveData();