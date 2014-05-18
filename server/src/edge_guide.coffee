module.exports = (canvas, width) ->
  api = {}

  context = canvas.getContext("2d")

  api.render = (prevFrame, frame, edge) ->
    clear(prevFrame, edge) if prevFrame?

    dim = calcDimensions(frame, edge)
    context.save()
    context.translate(dim.center.x, dim.center.y)
    context.rotate(dim.angle)

    context.beginPath()
    context.moveTo(dim.start+5, 0)
    context.lineTo(dim.end  , 0)
    context.setLineDash?([5,2])
    context.strokeStyle = "#289ed6"
    context.lineWidth   = width
    context.stroke()
    context.restore()

  api.clear = clear = (frame, edge) ->
    dim = calcDimensions(frame, edge)
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

  calcDimensions = (frame, edge) ->
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

  fillFrame = (frame) ->
    context.fillRect frame.left, frame.top, frame.width, frame.height

  strokeFrame = (frame) ->
    context.strokeRect frame.left, frame.top, frame.width, frame.height

  clearFrame = (frame) ->
    context.clearRect frame.left, frame.top, frame.width, frame.height


  api
