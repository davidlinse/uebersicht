DragHandler    = require './drag_handler.coffee'
Rect           = require './rectangle_math.coffee'

requestAnimFrame = webkitRequestAnimationFrame ? setTimeout
cancelAnimFrame  = webkitCancelAnimationFrame  ? clearTimeout

module.exports = (widgets) ->
  api = {}
  canvas  = null
  context = null
  chrome  = null

  currentWidget = null
  guide         = null

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

  onMouseDown = (e) ->
    return true unless e.which == 1
    return true if chrome.domEl().contains(e.target)
    widget = getWidgetAt(left: e.clientX, top: e.clientY)

    if widget?
      selectWidget(widget)
      startPositioning currentWidget, e
    else
      deselectWidget()

  selectWidget = (widget) ->
    return if widget == currentWidget
    currentWidget = widget

    chrome.render(currentWidget, guides: false)

  deselectWidget = ->
    return unless currentWidget

    chrome.hide()
    currentWidget = null

  startPositioning = (widget, e) ->
    handler   = DragHandler(e, widget.contentEl())
    request   = null

    handler.update (dx, dy) ->
      widget.position.update dx, dy
      request = requestAnimFrame renderDrag(widget)

    handler.end ->
      cancelAnimFrame request
      widget.position.store()
      requestAnimFrame -> chrome.clearGuides()

  renderDrag = (widget) -> ->
    widget?.position.render()
    chrome.render widget

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
    return unless currentWidget?

    currentWidget.position.setStickyEdge(newStickyEdge)
    currentWidget.position.render()
    chrome.render currentWidget
    currentWidget.position.store()


  init()



