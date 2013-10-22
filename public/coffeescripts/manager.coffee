md = $ '.md'
md.each ->
  @innerHTML = markdown.toHTML @innerHTML