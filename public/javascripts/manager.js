(function() {
  var md;

  md = $('.md');

  md.each(function() {
    return this.innerHTML = markdown.toHTML(this.innerHTML);
  });

}).call(this);
