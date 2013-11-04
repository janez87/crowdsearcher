/* global $, noty */
var baseUrl = $( 'base' ).prop( 'href' );

function slugify( string ) {
  return string
  .toString()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '');
}

function createInput( config, name ) {
  var type = config.type? config.type : config;

  var multiple = false;
  if( $.isArray( type ) ) {
    type = type[ 0 ];
    multiple = true;
  }

  var originalType = type;
  type = type==='string'? 'text': type;
  type = type==='platform'? 'text': type;
  type = type==='boolean'? 'checkbox': type;

  if( type==='number' && multiple )
    type = 'string';

  var id = 'id_'+name+'_'+Math.floor(Math.random()*150);
  var placeholder = 'Insert '+name;
  var value = config.default? config.default : '';

  var $ctrlGroup = $( '<div></div>' );
  var $label = $( '<label></label>' );
  var $input = $( '<input />' );



  if( type!=='checkbox' ) {
    $ctrlGroup.addClass( 'form-group' );
    $ctrlGroup.append( $label );
  } else {
    $ctrlGroup.addClass( 'input-group' );
  }


  $label.attr( 'for', id );

  $input.attr( 'type', type );
  $input.attr( 'id', id );
  $input.attr( 'name', name );
  $input.attr( 'data-name', name );
  $input.attr( 'data-original-type', originalType );
  $input.attr( 'data-multiple', multiple );
  $input.attr( 'placeholder', placeholder );
  if( type!=='checkbox' )
    $input.addClass( 'form-control' );

  if( type!=='checkbox' ) {
    $input.val( value );
    $ctrlGroup.append( $input );
  } else {
    $input.prop( 'checked', value );
    var $wrap = $( '<span class="input-group-addon input-small"></span>' );
    $wrap.append( $input );
    $ctrlGroup.append( $wrap );
    $ctrlGroup.append( $label );
  }

  $label.append( name );
  return $ctrlGroup;
}


function showParams( params, $paramContainer ) {
  $paramContainer = $( $paramContainer );
  var $paramList = $( '.param-list', $paramContainer );
  $paramList.empty();

  if( params ) {
    $.each( params, function ( name, type ) {
      $paramList.append( createInput( type, name ) );
    } );
  }
}


function getParams( $paramContainer ) {
  $paramContainer = $( $paramContainer );
  var data = {};
  var $dataInputList = $paramContainer.find( 'input:not(input[type="hidden"]), select' );

  $dataInputList.each( function() {
    var $element = $( this );
    var multiple = $element.data( 'multiple' );
    var originalType = $element.data( 'type' );
    var name = $element.data( 'name' );
    var value = $element.val();

    /*
    if 'platform'==$element.attr 'role'
      value = $element.siblings( 'input[type="hidden"]' ).val()
    */
    if( multiple ) {
      value = value.length===0? [] : value.split( ',' );
    }
    if( originalType==='number' ) {
      if( multiple ) {
        value = $.map( value, function ( num ) {
          return parseFloat( num, 10 );
        } );
      } else {
        value = parseFloat( value, 10 );
      }
    } else if (originalType==='boolean') {
      value = $element.is( ':checked' );
    } else if (originalType==='date') {
      value = new Date( value );
    }

    data[ name ] = value;
  } );

  return data;
}

function warnNoty( text ) {
  return noty( {
    layout: 'center',
    type: 'warning',
    text: text,
    modal: true
  } );
}

function confirmNoty( text, success, fail ) {
  text = text || 'Are you sure?';

  return noty( {
    type: 'confirm',
    text: text,
    modal: true,
    buttons: [ {
      addClass: 'btn btn-sm btn-success',
      text: 'Yes',
      onClick: function( $noty ) {
        $noty.close();
        if( $.isFunction( success ) )
          success();
      }
    }, {
      addClass: 'btn btn-sm btn-danger',
      text: 'No',
      onClick: function( $noty ) {
        $noty.close();
        if( $.isFunction( fail ) )
          fail();
      }
    } ]
  } );
}