DragHandler = require './drag_handler.coffee'

module.exports = (widgets) ->
  api = {}

  init = ->
    document.addEventListener 'mousedown', startPositioning
    api

  api.destroy = ->
    document.removeEventListener 'mousedown', startPositioning

  api.positonWidget = (widget) ->
    frame = getWidgetFrame(widget)
    return unless frame
    widget.setFrame frame

  startPositioning = (e) ->
    return unless (el = getWidget(e.target))?
    widget = widgets.get el.id
    DragHandler e, el, (frame) ->
      storeWidgetFrame widget, frame
      widget.setFrame frame

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

  init()



