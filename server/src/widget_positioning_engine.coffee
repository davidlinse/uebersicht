DragHandler    = require './drag_handler.coffee'
Rect           = require './rectangle_math.coffee'
WidgetPosition = require './widget_position.coffee'


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

    if widget?
      selectWidget(widget)
      startPositioning currentWidgetPosition, e
    else
      deselectWidget()

  selectWidget = (widget) ->
    currentWidgetPosition = WidgetPosition(widget)
    currentWidget         = widget

    chrome.render(currentWidgetPosition)
    currentWidgetPosition

  deselectWidget = ->
    return unless currentWidget

    chrome.hide()
    currentWidget = null
    currentWidgetPosition = null

  startPositioning = (widgetPosition, e) ->
    handler   = DragHandler(e, widgetPosition.domEl())
    request   = null

    handler.update (dx, dy) ->
      widgetPosition.update dx, dy
      request = requestAnimFrame renderDrag(widgetPosition)

    handler.end ->
      cancelAnimFrame request
      widgetPosition.store()
      chrome.clearGuides()

  renderDrag = (widgetPosition) -> ->
    widgetPosition?.render()
    chrome.render widgetPosition

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

    chrome.render currentWidgetPosition
    currentWidgetPosition.store()


  init()



