
  $.ajaxSetup({
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  $(document).on('click', 'a', function() {
    console.log(this.href);
    if (this.href === '#') return false;
  });
