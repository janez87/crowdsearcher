/* global $, showParams */

// Lists handler
var $lists = $( '.list-controller' );
var $parametersList = $( '.param-container', $lists );
$parametersList.hide();

var $listSelect = $( '.list-controller-name', $lists );

$listSelect.on( 'change', function() {
  var $select = $( this );
  var $selectedOption = $( 'option:selected', $select );
  var $paramContainer = $select.closest( '.list-controller' ).find( '.param-container' );
  $paramContainer.hide();

  var params = $selectedOption.data( 'params' );
  if( params ) {
    showParams( params, $paramContainer );
    $paramContainer.show();
  }
} );
