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
    meassured    = getFrameFromDOM()
    frame        = getFrameFromStorage() ? meassured
    stickyEdges ?= getStickyEdges()

    frame.width  = meassured.width
    frame.height = meassured.height

    if stickyEdges.indexOf('center-x') > -1
      centerHorizontaly(frame)

    if stickyEdges.indexOf('center-y') > -1
      centerVerticaly(frame)

    currentFrame = frame

    widget.setFrame cssForFrame(frame) if frame?

  api.update = (dx, dy) ->
    return unless currentFrame?
    centerHorizontal = stickyEdges.indexOf('center-x') > -1
    centerVertical   = stickyEdges.indexOf('center-y') > -1

    currentFrame.top    += dy unless centerVertical
    currentFrame.bottom -= dy unless centerVertical
    currentFrame.left   += dx unless centerHorizontal
    currentFrame.right  -= dx unless centerHorizontal

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
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "right" and edge isnt 'center-x'
      when 'right'
        stickyEdges.push('right')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "left"  and edge isnt 'center-x'
      when 'top'
        stickyEdges.push('top')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "bottom" and edge isnt 'center-y'
      when 'bottom'
        stickyEdges.push('bottom')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "top" and edge isnt 'center-y'
      when 'center-x'
        stickyEdges.push('center-x')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "left" and edge isnt "right"
        centerHorizontaly(currentFrame) if currentFrame?
      when 'center-y'
        stickyEdges.push('center-y')
        stickyEdges = stickyEdges.filter (edge) -> edge isnt "top" and edge isnt "bottom"
        centerVerticaly(currentFrame) if currentFrame?

    stickyEdges


  cssForFrame = (frame) ->
    css = {}

    if stickyEdges.indexOf('left') > -1 or stickyEdges.indexOf('center-x') > -1
      css.left  = frame.left+'px'
      css.right = 'auto'
    else if stickyEdges.indexOf('right') > -1
      css.right = frame.right+'px'
      css.left  = 'auto'

    if stickyEdges.indexOf('top') > -1 or stickyEdges.indexOf('center-y') > -1
      css.top    = frame.top+'px'
      css.bottom = 'auto'
    else if stickyEdges.indexOf('bottom') > -1
      css.bottom = frame.bottom+'px'
      css.top    = 'auto'

    css

  getFrameFromDOM = ->
    frame = widget.contentEl().getBoundingClientRect()
    top   : frame.top
    right : window.innerWidth  - frame.right
    bottom: window.innerHeight - frame.bottom
    left  : frame.left
    width : frame.width
    height: frame.height

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

  centerHorizontaly = (frame) ->
    centerX = window.innerWidth/2

    frame.left  = centerX - frame.width/2
    frame.right = centerX - frame.width/2

  centerVerticaly = (frame) ->
    centerY = window.innerHeight/2

    frame.top    = centerY - frame.height/2
    frame.bottom = centerY - frame.height/2

  init()
