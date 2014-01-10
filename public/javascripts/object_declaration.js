var $file = $( '#file' );
var $fileType = $( '#file_type' );
$file.on( 'click', function() {
  $file.attr( 'accept', $fileType.val() );
} );

function readFile( file ) {
  // Read the file
  var reader = new FileReader();
  var ext = file.name;
  ext = ext.split( '.' );
  ext = ext.splice( -1 );
  ext = ext[ 0 ].toLowerCase();

  reader.onprogress = function( evt ) {
    console.log( 'progress', evt.loaded / evt.total );
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
  var $schema = $( '#schema' );

  $.each( row.data, function( key, val ) {
    var type = 'string';
    type = toString.call( val ).split( ' ' ).splice( -1 )[ 0 ].slice( 0, -1 );
    if ( !isNaN( Date.parse( val ) ) ) type = 'Date';
    if ( $.isArray( val ) ) type = 'Array';
    schema[ key ] = type;
    $schema.append( '<b>' + key + '</b>: ' + type + '<br>' );
  } );

}

$file.on( 'change', function() {
  var file = this.files[ 0 ];
  if ( !file ) return;

  readFile( file );
} );