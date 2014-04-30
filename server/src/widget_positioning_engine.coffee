DragHandler = require './drag_handler.coffee'
Rect        = require './rectangle_math.coffee'

requestAnimFrame = webkitRequestAnimationFrame ? setTimeout
cancelAnimFrame  = webkitCancelAnimationFrame  ? clearTimeout

guidesWidth = 1

module.exports = (widgets) ->
  api = {}
  canvas  = null
  context = null

  currentWidget = null
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
      <div class='link top'></div>
      <div class='link right'></div>
      <div class='link bottom'></div>
      <div class='link left'></div>
    """
    chromeEl.style.position = 'absolute'
    document.body.appendChild chromeEl

    api

  api.destroy = ->
    document.removeEventListener 'mousedown', onMouseDown
    document.body.removeChild canvas if canvas.parentElement?

  api.positonWidget = (widget) ->
    frame = getWidgetFrame(widget)
    return unless frame
    widget.setFrame frame

  onMouseDown = (e) ->
    widget = getWidgetAt(left: e.clientX, top: e.clientY)
    return unless widget?
    startPositioning widget, e
    selectWidget(widget)

  selectWidget = (widget) ->
    oldFrame = {}
    oldFrame = currentWidget.contentEl().getBoundingClientRect() if currentWidget?
    frame    = widget.contentEl().getBoundingClientRect()

    currentWidget = widget
    renderChrome(oldFrame, frame)

  startPositioning = (widget, e) ->
    context.fillStyle = "rgba(255, 255, 255, 0.4)"

    prevFrame = {}
    handler   = DragHandler(e, widget.contentEl())
    request   = null

    handler.update (frame) ->
      request   = requestAnimFrame renderDrag(widget, prevFrame, frame)
      prevFrame = {}
      prevFrame[k] = v for k, v of frame

    handler.end ->
      cancelAnimFrame request
      storeWidgetFrame widget, slice(prevFrame, ['top', 'left', 'width', 'height'])
      renderGuides prevFrame, {} # this clears the guides

  renderChrome = (prevFrame, frame) ->
    frame = Rect.outset(frame, 2)
    chromeEl.style.left = frame.left + 'px'
    chromeEl.style.top  = frame.top  + 'px'
    chromeEl.style.width  = frame.width  + 'px'
    chromeEl.style.height = frame.height + 'px'

  renderDrag = (widget, prevFrame, frame) -> ->
    renderGuides prevFrame, frame
    widget.setFrame slice(frame, ['top', 'left', 'width', 'height'])
    renderChrome prevFrame, frame

  renderGuides = (prevFrame, frame) ->
    renderGuide prevFrame, frame, 'top'
    renderGuide prevFrame, frame, 'left'

  renderGuide = (prevFrame, frame, direction) ->
    dim = guideDimensions(prevFrame, direction)
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

    dim = guideDimensions(frame, direction)
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

  guideDimensions = (frame, direction) ->
    center =
      x: frame.left + frame.width/2
      y: frame.top  + frame.height/2

    switch direction
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

  getWidgetFrame = (widget) ->
    getLocalSettings(widget).frame

  storeWidgetFrame = (widget, frame) ->
    settings = getLocalSettings(widget)
    settings.frame = frame
    storeLocalSettings widget, settings

  getLocalSettings = (widget) ->
    JSON.parse(localStorage.getItem(widget.id) or '{}')

  storeLocalSettings = (widget, settings) ->
    #console.debug settings
    localStorage.setItem widget.id, JSON.stringify(settings)

  initCanvas = ->
    canvas.style.position = 'absolute'
    canvas.style.top  = 0
    canvas.style.left = 0
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

  fillFrame = (frame) ->
    context.fillRect frame.left, frame.top, frame.width, frame.height

  strokeFrame = (frame) ->
    context.strokeRect frame.left, frame.top, frame.width, frame.height

  clearFrame = (frame) ->
    context.clearRect frame.left, frame.top, frame.width, frame.height

  slice = (object, keys) ->
    result = {}
    result[k] = object[k] for k in keys
    result

  init()



