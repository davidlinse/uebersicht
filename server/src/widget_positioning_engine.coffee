DragHandler    = require './drag_handler.coffee'
Rect           = require './rectangle_math.coffee'
WidgetPosition = require './widget_position.coffee'
EdgeGuide      = require './edge_guide.coffee'

requestAnimFrame = webkitRequestAnimationFrame ? setTimeout
cancelAnimFrame  = webkitCancelAnimationFrame  ? clearTimeout

module.exports = (widgets) ->
  api = {}
  canvas  = null
  context = null

  currentWidget         = null
  currentWidgetPosition = null
  chromeEl = null
  guide    = null

  init = ->
    document.addEventListener 'mousedown', onMouseDown
    canvas  = document.createElement 'canvas'
    context = canvas.getContext("2d")
    document.body.insertBefore(canvas, document.body.firstChild)
    initCanvas()

    guide = EdgeGuide(canvas, 1)

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
    return unless e.which == 1
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
        guide.render prevFrame, {}, edge # this clears the guides

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
      guide.render prevFrame, widgetPosition.frame(), edge

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
          guide.render null, currentWidgetPosition.frame(), edge
        else
          guide.clear currentWidgetPosition.frame(), edge

      currentWidgetPosition.store()


  init()



