exports.outset = (rect, delta) ->
  top : rect.top  - delta
  left: rect.left - delta
  width : rect.width  + 2*delta
  height: rect.height + 2*delta

exports.pointInRect = (point, rect) ->
  point.left >= rect.left and
  point.top  >= rect.top  and
  point.left <= rect.left + rect.width and
  point.top  <= rect.top  + rect.height
