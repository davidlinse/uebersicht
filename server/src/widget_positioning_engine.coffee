DragHandler = require './drag_handler.coffee'
Rect        = require './rectangle_math.coffee'

module.exports = (widgets) ->
  api = {}
  canvas  = null
  context = null

  requestAnimFrame = webkitRequestAnimationFrame ? setTimeout
  cancelAnimFrame  = webkitCancelAnimationFrame  ? clearTimeout

  guidesWidth = 2

  init = ->
    document.addEventListener 'mousedown', startPositioning
    canvas  = document.createElement 'canvas'
    context = canvas.getContext("2d")
    document.body.insertBefore(canvas, document.body.firstChild)
    initCanvas()
    api

  api.destroy = ->
    document.removeEventListener 'mousedown', startPositioning
    document.body.removeChild canvas if canvas.parentElement?

  api.positonWidget = (widget) ->
    frame = getWidgetFrame(widget)
    return unless frame
    widget.setFrame frame

  startPositioning = (e) ->
    return unless (el = getWidget(left: e.clientX, top: e.clientY))?
    widget = widgets.get el.id

    context.fillStyle = "rgba(255, 255, 255, 0.4)"

    prevFrame = {}
    handler   = DragHandler(e, el)
    request   = null

    handler.update (frame) ->
      request   = requestAnimFrame renderDrag(widget, prevFrame, frame)
      prevFrame = {}
      prevFrame[k] = v for k, v of frame

    handler.end ->
      cancelAnimFrame request
      storeWidgetFrame widget, slice(prevFrame, ['top', 'left', 'width', 'height'])
      context.clearRect(0, 0, canvas.width, canvas.height)

  renderDrag = (widget, prevFrame, frame) -> ->
    renderGuides prevFrame, frame
    widget.setFrame slice(frame, ['top', 'left', 'width', 'height'])

    clearFrame(Rect.outset(prevFrame, 5))

    context.save()
    context.setLineDash([5])
    context.strokeStyle = "#fff"
    context.lineWidth   = 2
    strokeFrame Rect.outset(frame,2)
    context.restore()

  renderGuides = (prevFrame, frame) ->
    oldGuideRect =
      left  : Math.floor prevFrame.left + prevFrame.width/2 - 10
      top   : 0
      width : 20
      height: prevFrame.top

    clearFrame oldGuideRect

    oldGuideRect =
      left  : 0
      top   : Math.floor prevFrame.top + prevFrame.height/2 - 10
      width : prevFrame.left
      height: 20

    clearFrame oldGuideRect

    left = frame.left+frame.width/2 - guidesWidth/2
    top  = frame.top+frame.height/2 - guidesWidth/2

    context.beginPath()
    context.moveTo(frame.left, top)
    context.lineTo(0,top)
    context.moveTo(left, frame.top)
    context.lineTo(left, 0)

    context.save()
    context.strokeStyle = "#289ed6"
    context.lineWidth   = guidesWidth
    context.stroke()
    context.restore()

  getWidget = (point) ->
    for widgetEl in document.getElementsByClassName('widget')
      continue unless widgetEl.id?
      if Rect.pointInRect point, widgetEl.getBoundingClientRect()
        return widgetEl


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



