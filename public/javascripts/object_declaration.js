var $file = $( '#file' );
var $fileType = $( '#file_type' );
$file.on( 'click', function() {
  $file.attr( 'accept', $fileType.val() );
} );

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
    $th.append( $prop );

    $th.append( createSelect( type ) );
    $header.append( $th );
  } );

  var $data = $( '#data' );

  // Print only 5 rows
}

function readFile( file ) {
  // Read the file
  var reader = new FileReader();
  var ext = file.name;
  ext = ext.split( '.' );
  ext = ext.splice( -1 );
  ext = ext[ 0 ].toLowerCase();

  reader.onprogress = function( evt ) {
    //console.log( 'progress', evt.loaded / evt.total );
  };
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

  $.each( row.data, function( key, val ) {
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