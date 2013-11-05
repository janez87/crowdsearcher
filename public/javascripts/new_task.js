/* jshint browser: true */
/* global $, noty, baseUrl, Arg, getParams */

// Get the Task data as Object
function getTaskObject() {
  var task = {};

  // Task info
  task.name = $( '#name' ).val();
  task.private = $( '#private' ).is( ':checked' );
  task.job = $( '#job' ).val();
  task.description = $( '#description_md' ).val();

  // Landing
  task.landing = $( '#landing_md' ).val();
  // Ending
  task.ending = $( '#ending_md' ).val();

  // Operations
  task.operations = $( '.operation', '#operation_list' ).map( function() {
    return $( this ).data( 'value' );
  } ).get();

  // Platforms
  task.platforms = $( '.platform', '#platform_list' ).map( function() {
    return $( this ).data( 'value' );
  } ).get();

  // Data input
  var external = $( '#data_external' ).is( '.active' );
  if( external ) {
    task.objects = $( '#data_file_input' ).data( 'json' );
  } else {
    var headerMap = {};
    $( '#data_header_list td input' ).each( function() {
      var index = $( this ).closest( 'td' ).index()+1;
      headerMap[ index ] = this.value;
    } );

    task.objects = $( '#data_rows tr' ).map( function() {
      var row = {};

      $( 'td', this ).each( function() {
        var index = $( this ).index()+1;
        row[ headerMap[ index ] ] = $( this ).data( 'value' );
      } );

      return { data: row };
    } ).get();
  }



  // Splitting strategy
  task.splittingStrategy = $( '#splitting_list .strategy' ).data( 'value' );
  // Assignment strategy
  task.assignmentStrategy = $( '#assignment_list .strategy' ).data( 'value' );
  // Implementation strategy
  task.implementationStrategy = $( '#implementation_list .strategy' ).data( 'value' );

  // Control rules
  task.controlrules = $( '.list-group:not(#task_rule_list) .rule' ).map( function() {
    return $( this ).data( 'value' );
  } ).get();

  return task;
}


function createListElement( obj, type, viewOnly ) {
  var id = 'herp-derp-'+Math.floor( Math.random()*25000 );
  var $output = $( '<li class="list-group-item"></li>' );

  $output.addClass( type );
  $output.attr( 'data-value', JSON.stringify( obj ) );

  var content = '<div class="row"><div class="col-md-6">'+
    '<h4 class="list-group-item-heading" data-toggle="collapse" data-target="#'+id+'" title="'+obj.name+'">'+obj.name+'</h4>'+
    '</div><div class="col-md-4 text-right">';

  if( obj.event || obj.label ) {
    content += '<code>'+(obj.event||obj.label)+'</code>';
  } else {
    if( obj.enabled )
      content += '<i class="fa fa-power-off fa-border" title="Platform enabled"></i>';

    if( obj.execution )
      content += '<i class="fa fa-play fa-border" title="Platform enabled for execution"></i>';

    if( obj.invitation )
      content += '<i class="fa fa-envelope-o fa-border" title="Platform enabled for invitation"></i>';
  }

  content += '</div><div class="col-md-2 text-right">';

  if( !viewOnly )
    content += '<button type="button" title="Remove" class="btn btn-xs btn-danger remove"><i class="fa fa-trash-o"></i></button>';
  else
    content += '<i class="fa fa-reorder fa-border"></i>';

  content += '</div></div>'+
    '<pre class="list-group-item-text collapse" id="'+id+'">'+JSON.stringify( obj, null, 2 )+'</pre>';

  $output.html( content );
  return $output;
}


// Add a Rule/Operation/Platform
$( '.add' ).on( 'click', function() {
  var data = $( this ).data();
  var $selected = $( 'option:selected', data.source );
  if( $selected.val()!=='' ) {

    var obj = {
      name: $selected.val(),
      params: getParams( $selected.data( 'target' ) )
    };

    if( data.type==='rule' || data.type==='strategy rule' )
      obj.action = obj.name;

    // Find other inputs
    var $additionalData = $selected
    .closest( '.form-group' )
    .siblings( '.form-group' )
    .find( 'input, select' );

    $additionalData.each( function() {
      var $input = $( this );
      var name = $input.data( 'name' );

      if( $input.attr( 'type' )==='checkbox' )
        obj[ name ] = $input.is( ':checked' );
      else
        obj[ name ] = $input.val();
    } );

    var $target = $( data.target );
    $target.append( createListElement( obj, data.type ) );
  }
} );

// Handle rule/operation/platform removal
$( '.panel .list-group' ).on( 'click', '.remove', function() {
  $( this ).closest( '.list-group-item' ).remove();
} );

// Add a control rule
$( '.add_control' ).on( 'click', function() {
  var data = $( this ).data();
  var $selected = $( 'option:selected', data.source );
  if( $selected.val()!=='' ) {
    var optionData = $selected.data();


    var params = getParams( optionData.target );
    var actions = optionData.actions;

    $.each( actions, function() {
      var action = this;

      $.each( action.events, function( i, eventName ) {
        var actionParams = {};

        if( action.mapping ) {
          $.each( action.mapping, function( source, destination ) {
            actionParams[ destination ] = params[ source ];
          } );
        }

        var obj = {
          name: action.action,
          event: eventName,
          type: 'CUSTOM',
          params: actionParams
        };

        var $target = $( data.target );
        $target.append( createListElement( obj, 'rule' ) );
      } );
    } );
  }
} );

$('#rule-control-panel').on( 'show.bs.collapse', function() {
  var $list = $( '#task_rule_list' );
  $list.empty();
  var $rules = $( '.list-group:not(#task_rule_list) .rule' );

  $rules.each( function() {
    var $rule = $( this );
    var obj = $rule.data( 'value' );
    $list.append( createListElement( obj, 'rule', true ) );
  } );
} );

// Get the Job Id from the url
$( '#job' ).val( Arg( 'job' ) );
$( '#name' ).on( 'keyup', function() {
  $( '.name' ).text( this.value );
} );
// Handle reset
$( '#reset' ).on( 'click', function( evt ) {
  evt.preventDefault();

  location.href = location.href;
  return false;
} );

// Preview
var $preview = $( '#preview' );
$preview.click( function() {
  var task = getTaskObject();
  noty( {
    text: '<pre class="text-left">'+JSON.stringify( task, null, 2 )+'</pre>',
    modal: true
  } );
  return false;
});

// Send Task
var $send = $( '#send' );
$send.click( function() {
  var task = getTaskObject();

  // Create the AJAX request
  var url = baseUrl+'api/task';
  var req = $.ajax( {
    url: url,
    contentType: 'application/json; charset=UTF-8',
    dataType: 'json',
    processData: true,
    type: 'POST',
    data: JSON.stringify( task )
  } );

  req.done( function ( task ) {
    noty( {
      type: 'success',
      text: 'Task posted',
      modal: true,
      buttons: [ {
        addClass: 'btn btn-sm btn-default',
        text: '<i class="fa fa-folder-open"></i> Task details',
        onClick: function() {
          location.href = baseUrl+'manage/task/'+task._id;
        }
      }, {
        addClass: 'btn btn-sm btn-primary',
        text: '<i class="fa fa-cross"></i> Close',
        onClick: function( n ) {
          n.close();
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

  return false;
} );