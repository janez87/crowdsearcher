$ ->
  $links = $ 'a[href]'
  $links.click ( evt )->
    evt.preventDefault()
    $a = $ evt.currentTarget

    href = $a.prop 'href'

    console.log href
    params = location.search.slice 1
    params = params.split '&'

    for qp in params
      data = qp.split '='
      key = data[ 0 ]
      value = data[ 1 ]
      if key!='job' and key!='task' and key!='alias'
        href += "&#{key}=#{value}"

    location.href = href
    return false