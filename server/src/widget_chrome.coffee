Rect = require './rectangle_math.coffee'
module.exports = (canvas, actions) ->
  api  = {}

  context = canvas.getContext('2d')
  draw    = require('./draw.coffee')(context)

  chromeEl = document.createElement('div')
  chromeEl.className = 'widget-chrome'
  chromeEl.innerHTML = """
    <div class='sticky-edge top'></div>
    <div class='sticky-edge right'></div>
    <div class='sticky-edge bottom'></div>
    <div class='sticky-edge left'></div>
  """
  chromeEl.style.position = 'absolute'

  init = ->
    chromeEl.addEventListener 'click', (e) ->
      return true unless e.target.classList.contains('sticky-edge')
      e.stopPropagation()

      for className in e.target.classList
        continue if className == 'sticky-edge'
        actions.clickedStickyEdgeToggle className

    api

  api.render = (prevFrame, widgetPosition) ->
    draw.clearFrame Rect.outset(prevFrame, 4) if prevFrame?
    return unless widgetPosition?

    frame = Rect.outset(widgetPosition.frame(), 1.5)
    context.strokeStyle = "#fff"
    context.lineWidth   = 1
    draw.strokeFrame frame

    toggleSize = 20
    context.clearRect frame.left+frame.width/2 - toggleSize/2, frame.top - toggleSize/2, toggleSize, toggleSize
    context.clearRect frame.left+frame.width/2 - toggleSize/2, frame.top + frame.height - toggleSize/2, toggleSize, toggleSize
    context.clearRect frame.left - toggleSize/2, frame.top + frame.height/2 - toggleSize/2, toggleSize, toggleSize
    context.clearRect frame.left + frame.width - toggleSize/2, frame.top + frame.height/2 - toggleSize/2, toggleSize, toggleSize

    frame = Rect.outset(widgetPosition.frame(), 2)
    chromeEl.style.left   = frame.left + 'px'
    chromeEl.style.top    = frame.top  + 'px'
    chromeEl.style.width  = frame.width  + 'px'
    chromeEl.style.height = frame.height + 'px'

    edges = widgetPosition.stickyEdges()
    for el in chromeEl.getElementsByClassName("sticky-edge")
      if el.classList.contains(edges[0]) or el.classList.contains(edges[1])
        el.classList.add 'active'
      else
        el.classList.remove 'active'

  api.domEl = ->
    chromeEl

  init()
