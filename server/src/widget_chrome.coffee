Rect      = require './rectangle_math.coffee'
EdgeGuide = require './edge_guide.coffee'

module.exports = (canvas, actions) ->
  api  = {}

  context   = canvas.getContext('2d')
  draw      = require('./draw.coffee')(context)
  prevFrame = null

  guide     = EdgeGuide(canvas, 1)

  chromeEl = document.createElement('div')
  chromeEl.className = 'widget-chrome'
  chromeEl.innerHTML = """
    <div class='sticky-edge top'></div>
    <div class='sticky-edge right'></div>
    <div class='sticky-edge bottom'></div>
    <div class='sticky-edge left'></div>
    <div class='sticky-edge center-x'></div>
    <div class='sticky-edge center-y'></div>
  """
  chromeEl.style.position = 'absolute'

  init = ->
    chromeEl.addEventListener 'click', (e) ->
      return true unless e.which == 1
      return true unless e.target.classList.contains('sticky-edge')

      for className in e.target.classList
        continue if className == 'sticky-edge'
        actions.clickedStickyEdgeToggle className

    api.hide()
    api

  api.render = (widget, options = {}) ->
    chromeEl.style.display = 'block'
    clearFrame prevFrame
    return unless widget?.position?

    newFrame = widget.position.frame()

    frame = Rect.outset(newFrame, 1.5)
    context.strokeStyle = "#fff"
    context.lineWidth   = 1
    draw.strokeFrame frame
    cutoutToggles frame,  20

    frame = Rect.outset(newFrame, 2)
    chromeEl.style.left   = frame.left + 'px'
    chromeEl.style.top    = frame.top  + 'px'
    chromeEl.style.width  = frame.width  + 'px'
    chromeEl.style.height = frame.height + 'px'

    edges = widget.position.stickyEdges()
    for el in chromeEl.getElementsByClassName("sticky-edge")
      if el.classList.contains(edges[0]) or el.classList.contains(edges[1])
        el.classList.add 'active'
      else
        el.classList.remove 'active'

    renderGuides(widget) unless options?.guides == false

    prevFrame = Rect.clone(newFrame)

  renderGuides = (widget) ->
    edges = widget.position.stickyEdges()
    for edge in edges
      guide.render prevFrame, widget.position.frame(), edge

  api.clearGuides = ->
    return unless prevFrame?
    for edge in ['top', 'right', 'bottom', 'left']
      guide.render prevFrame, {}, edge

  cutoutToggles = (frame, toggleSize) ->
    context.clearRect frame.left+frame.width/2 - toggleSize/2, frame.top - toggleSize/2, toggleSize, toggleSize
    context.clearRect frame.left+frame.width/2 - toggleSize/2, frame.top + frame.height - toggleSize/2, toggleSize, toggleSize
    context.clearRect frame.left - toggleSize/2, frame.top + frame.height/2 - toggleSize/2, toggleSize, toggleSize
    context.clearRect frame.left + frame.width - toggleSize/2, frame.top + frame.height/2 - toggleSize/2, toggleSize, toggleSize

  api.domEl = ->
    chromeEl

  api.hide = ->
    clearFrame prevFrame
    api.clearGuides()
    chromeEl.style.display = 'none'
    prevFrame = null

  clearFrame = (frame) ->
    draw.clearFrame Rect.outset(frame, 5) if frame?

  init()
