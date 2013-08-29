
  $(function() {
    var $links;
    $links = $('a[href]');
    return $links.click(function(evt) {
      var $a, data, href, key, params, qp, value, _i, _len;
      evt.preventDefault();
      $a = $(evt.currentTarget);
      href = $a.prop('href');
      console.log(href);
      params = location.search.slice(1);
      params = params.split('&');
      for (_i = 0, _len = params.length; _i < _len; _i++) {
        qp = params[_i];
        data = qp.split('=');
        key = data[0];
        value = data[1];
        if (key !== 'job' && key !== 'task' && key !== 'alias') {
          href += "&" + key + "=" + value;
        }
      }
      location.href = href;
      return false;
    });
  });
