DragHandler = require './drag_handler.coffee'

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
    return unless (el = getWidget(e.target))?
    widget = widgets.get el.id

    context.fillStyle   = "rgba(255, 255, 255, 0.4)"
    context.strokeStyle = "#289ed6"
    context.lineWidth   = guidesWidth
    context.fillRect(0, 0, canvas.width, canvas.height)

    prevFrame = {}
    handler   = DragHandler(e, el)
    request   = null

    handler.update (frame) ->
      request = requestAnimFrame renderDrag(widget, prevFrame, frame)
      prevFrame =
        left: frame.left - 1
        top : frame.top  - 1
        width : frame.width  + 2
        height: frame.height + 2

    handler.end ->
      cancelAnimFrame request
      storeWidgetFrame widget, top: prevFrame.top+1, left: prevFrame.left+1
      context.clearRect(0, 0, canvas.width, canvas.height)

  renderDrag = (widget, prevFrame, frame) -> ->
    renderGuides prevFrame, frame
    widget.setFrame top: frame.top, left: frame.left
    clearFrame prevFrame
    fillFrame  prevFrame
    clearFrame frame

  renderGuides = (prevFrame, frame) ->
    oldGuideRect =
      left  : Math.floor prevFrame.left + prevFrame.width/2 - 10
      top   : 0
      width : 20
      height: prevFrame.top

    clearFrame oldGuideRect
    fillFrame  oldGuideRect

    oldGuideRect =
      left  : 0
      top   : Math.floor prevFrame.top + prevFrame.height/2 - 10
      width : prevFrame.left
      height: 20

    clearFrame oldGuideRect
    fillFrame  oldGuideRect

    context.beginPath()
    left = frame.left+frame.width/2 - guidesWidth/2
    top  = frame.top+frame.height/2 - guidesWidth/2
    context.moveTo(frame.left, top)
    context.lineTo(0,top)
    context.moveTo(left, frame.top)
    context.lineTo(left, 0)
    context.stroke()

  getWidget = (element) ->
    return if element == document.body or element == document
    if element.className == 'widget' and element.id
      return element
    else
      getWidget element.parentElement

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

  init()



