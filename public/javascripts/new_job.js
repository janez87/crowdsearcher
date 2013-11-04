/* jshint browser: true */
/* global $, noty, getParams, baseUrl, slugify */

var $alias = $( '#alias' );
var $name = $( '#name' );
$name.on( 'keyup', function() {
  $alias.val( slugify( this.value ) );
} );


var $send = $( '#send' );
$send.click( function() {
  var $description = $( '#description' );
  var $landing = $( '#landing' );
  var $ending = $( '#ending' );
  var $assignment = $( '#assignment_name' );

  // Plain values
  var name = $name.val();
  var alias = $alias.val();
  var description = $description.val();
  var landing = $landing.val();
  var ending = $ending.val();

  // Assignment strategy
  var assignment = {
    name: $assignment.val(),
    params: getParams( '#assignment-params' )
  };

  var data = {
    name: name===''? undefined : name,
    alias: alias===''? undefined : alias,
    description: description===''? undefined : description,
    landing: landing===''? undefined : landing,
    ending: ending===''? undefined : ending,
    assignment: assignment? assignment : undefined
  };

  // Create the AJAX request
  var url = baseUrl+'api/job';
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
});
/*
noty( {
  type: 'success',
  text: 'asd',
  timeout: 1500
} );
*/