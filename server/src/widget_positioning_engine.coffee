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
  chrome  = null

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

    guide  = EdgeGuide(canvas, 1)
    chrome = require('./widget_chrome.coffee') canvas,
      clickedStickyEdgeToggle: setStickyEdge

    document.body.appendChild chrome.domEl()

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
    currentWidgetPosition = WidgetPosition(widget)
    currentWidget         = widget

    chrome.render(currentWidgetPosition)
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


  renderDrag = (widgetPosition, prevFrame) -> ->
    widgetPosition?.render()
    renderGuides widgetPosition, prevFrame
    chrome.render prevFrame, widgetPosition

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

  setStickyEdge = (newStickyEdge) ->
    return unless currentWidgetPosition?

    for edge in currentWidgetPosition.stickyEdges()
      guide.clear currentWidgetPosition.frame(), edge

    currentWidgetPosition.setStickyEdge(newStickyEdge)

    chrome.render null, currentWidgetPosition
    currentWidgetPosition.store()


  init()



