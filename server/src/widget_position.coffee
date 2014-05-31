EDGES = ['left', 'right', 'top', 'bottom']

module.exports = (widget) ->
  api = {}

  currentFrame = null
  stickyEdges  = []

  init = ->
    currentFrame = getFrameFromDOM()
    stickyEdges  = getStickyEdges()
    api

  api.domEl = ->
    widget.contentEl()

  api.render = ->
    return unless currentFrame?
    widget.setFrame cssForFrame(currentFrame)

  api.frame = ->
    currentFrame

  api.restoreFrame = ->
    frame     = getFrameFromStorage() ? {}
    meassured = getFrameFromDOM()
    frame.width  = meassured.width
    frame.height = meassured.height
    widget.setFrame cssForFrame(frame) if frame?

  api.update = (dx, dy) ->
    return unless currentFrame?
    currentFrame.top    += dy
    currentFrame.bottom -= dy
    currentFrame.left   += dx
    currentFrame.right  -= dx

  api.store = ->
    settings = getLocalSettings()

    settings.frame       = currentFrame
    settings.stickyEdges = stickyEdges
    storeLocalSettings(settings)

  api.stickyEdges = ->
    stickyEdges

  api.setStickyEdge = (edge) ->
    return if stickyEdges.indexOf(edge) > -1
    switch edge
      when 'left'
        stickyEdges.push('left')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "right"
      when 'right'
        stickyEdges.push('right')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "left"
      when 'top'
        stickyEdges.push('top')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "bottom"
      when 'bottom'
        stickyEdges.push('bottom')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "top"

    stickyEdges


  cssForFrame = (frame) ->
    frame = slice frame, stickyEdges.concat(['width', 'height'])
    for attr in EDGES.concat(['width', 'height'])
      frame[attr] = if frame[attr]? then frame[attr]+'px' else 'auto'
    frame

  getFrameFromDOM = ->
    frame = widget.contentEl().getBoundingClientRect()
    top   : frame.top
    right : window.innerWidth - frame.right
    bottom: window.innerHeight - frame.bottom
    left  : frame.left
    width : frame.width  or 'auto'
    height: frame.height or 'auto'

  getFrameFromStorage =  ->
    settings = getLocalSettings()
    settings.frame if settings?

  getStickyEdges = ->
    settings = getLocalSettings()
    settings?.stickyEdges ? ['bottom', 'left']

  getLocalSettings =  ->
    JSON.parse(localStorage.getItem(widget.id) or '{}')

  storeLocalSettings = (settings) ->
    return unless settings and settings.frame?
    localStorage.setItem widget.id, JSON.stringify(settings)

  slice = (object, keys) ->
    result = {}
    result[k] = object[k] for k in keys
    result

  init()
