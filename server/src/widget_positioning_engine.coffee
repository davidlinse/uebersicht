DragHandler    = require './drag_handler.coffee'
Rect           = require './rectangle_math.coffee'
WidgetPosition = require './widget_position.coffee'

requestAnimFrame = webkitRequestAnimationFrame ? setTimeout
cancelAnimFrame  = webkitCancelAnimationFrame  ? clearTimeout

guidesWidth = 1

module.exports = (widgets) ->
  api = {}
  canvas  = null
  context = null

  currentWidget         = null
  currentWidgetPosition = null
  chromeEl = null

  init = ->
    document.addEventListener 'mousedown', onMouseDown
    canvas  = document.createElement 'canvas'
    context = canvas.getContext("2d")
    document.body.insertBefore(canvas, document.body.firstChild)
    initCanvas()

    chromeEl = document.createElement('div')
    chromeEl.className = 'widget-chrome'
    chromeEl.innerHTML = """
      <div class='sticky-edge top'></div>
      <div class='sticky-edge right'></div>
      <div class='sticky-edge bottom'></div>
      <div class='sticky-edge left'></div>
    """
    chromeEl.style.position = 'absolute'
    document.body.appendChild chromeEl
    initChrome()

    api

  api.destroy = ->
    document.removeEventListener 'mousedown', onMouseDown
    document.body.removeChild canvas if canvas.parentElement?

  api.restorePosition = (widget) ->
    widgetPosition = WidgetPosition widget
    widgetPosition.restoreFrame()

  onMouseDown = (e) ->
    widget = getWidgetAt(left: e.clientX, top: e.clientY)
    return unless widget?
    widgetPosition = selectWidget(widget)
    startPositioning widgetPosition, e

  selectWidget = (widget) ->
    oldFrame = currentWidgetPosition?.frame()

    currentWidgetPosition = WidgetPosition(widget)
    currentWidget         = widget
    frame                 = currentWidgetPosition.frame()

    renderChrome(oldFrame, frame)
    currentWidgetPosition

  startPositioning = (widgetPosition, e) ->
    prevFrame = null
    handler   = DragHandler(e, widgetPosition.domEl())
    request   = null

    handler.update (dx, dy) ->
      widgetPosition.update dx, dy
      request   = requestAnimFrame renderDrag(widgetPosition, prevFrame)
      prevFrame = {}
      prevFrame[k] = v for k, v of widgetPosition.frame()

    handler.end ->
      cancelAnimFrame request
      widgetPosition.store()
      for edge in ['top', 'right', 'bottom', 'left']
        renderGuide prevFrame, {}, edge # this clears the guides

  renderChrome = (prevFrame, frame) ->
    frame = Rect.outset(frame, 2)
    chromeEl.style.left = frame.left + 'px'
    chromeEl.style.top  = frame.top  + 'px'
    chromeEl.style.width  = frame.width  + 'px'
    chromeEl.style.height = frame.height + 'px'

  renderDrag = (widgetPosition, prevFrame) -> ->
    widgetPosition?.render()
    renderGuides widgetPosition, prevFrame
    renderChrome prevFrame, widgetPosition?.frame()

  renderGuides = (widgetPosition, prevFrame) ->
    edges = widgetPosition.stickyEdges()
    for edge in edges
      renderGuide prevFrame, widgetPosition.frame(), edge

  renderGuide = (prevFrame, frame, edge) ->
    clearGuide(prevFrame, edge) if prevFrame?

    dim = guideDimensions(frame, edge)
    context.save()
    context.translate(dim.center.x, dim.center.y)
    context.rotate(dim.angle)

    context.beginPath()
    context.moveTo(dim.start+5, 0)
    context.lineTo(dim.end  , 0)
    context.setLineDash?([5,2])
    context.strokeStyle = "#289ed6"
    context.lineWidth   = guidesWidth
    context.stroke()
    context.restore()

  clearGuide = (frame, edge) ->
    dim = guideDimensions(frame, edge)
    rectHeight = 20

    oldGuideRect =
      left:   dim.start
      top :   -rectHeight/2
      width : dim.end
      height: rectHeight

    context.save()
    context.translate(dim.center.x, dim.center.y)
    context.rotate(dim.angle)
    clearFrame oldGuideRect
    context.restore()

  guideDimensions = (frame, edge) ->
    center =
      x: frame.left + frame.width/2
      y: frame.top  + frame.height/2

    switch edge
      when 'right'
        angle = 0
        start = frame.width/2
        end   = canvas.width
      when 'bottom'
        angle = Math.PI/2
        start = frame.height/2
        end   = canvas.height
      when 'left'
        angle = Math.PI
        start = frame.width/2
        end   = canvas.width
      when 'top'
        angle = -Math.PI/2
        start = frame.height/2
        end   = canvas.height

    angle: angle, start: start, end: end, center: center

  getWidgetAt = (point) ->
    foundEl = {}
    for widgetEl in document.getElementsByClassName('widget')
      continue unless widgetEl.id?
      if Rect.pointInRect point, widgetEl.getBoundingClientRect()
        foundEl = widgetEl
        break

    widgets.get foundEl.id


  initCanvas = ->
    canvas.style.position = 'absolute'
    canvas.style.top  = 0
    canvas.style.left = 0
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

  initChrome = ->
    chromeEl.addEventListener 'click', (e) ->
      return true unless currentWidgetPosition?
      return true unless e.target.classList.contains('sticky-edge')
      e.stopPropagation()
      for className in e.target.classList
        continue if className == 'sticky-edge'
        currentWidgetPosition.setStickyEdge(className)

      for edge in ['left', 'right', 'top', 'bottom']
        if currentWidgetPosition.stickyEdges().indexOf(edge) > -1
          renderGuide null, currentWidgetPosition.frame(), edge
        else
          clearGuide currentWidgetPosition.frame(), edge

      currentWidgetPosition.store()

  fillFrame = (frame) ->
    context.fillRect frame.left, frame.top, frame.width, frame.height

  strokeFrame = (frame) ->
    context.strokeRect frame.left, frame.top, frame.width, frame.height

  clearFrame = (frame) ->
    context.clearRect frame.left, frame.top, frame.width, frame.height


  init()



