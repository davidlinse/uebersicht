module.exports = (event, domEl, changeHandler) ->
  prevPosition =
    x: event.pageX
    y: event.pageY

  currentFrame    = {}                  # is read only
  currentFrame[k] = v for k, v of domEl.getBoundingClientRect()

  update = (e) ->
    [dx, dy]  = [e.pageX - prevPosition.x, e.pageY - prevPosition.y]
    prevPosition = x: e.pageX, y: e.pageY

    currentFrame.left += dx
    currentFrame.top  += dy

    changeHandler currentFrame

  end = (e) ->
    update(e)
    document.removeEventListener 'mousemove', update
    document.removeEventListener 'mouseup' , end

  document.addEventListener 'mousemove', update
  document.addEventListener 'mouseup', end
