Widget      = require './src/widget.coffee'
Positioning = require './src/widget_positioning_engine.coffee'

widgets    = {}
contentEl  = null
positioner = null

init = ->
  contentEl = document.createElement('div')
  contentEl.className = 'content'
  document.body.appendChild(contentEl)

  positioner = Positioning get: (id) -> widgets[id]

  getWidgets (err, widgetSettings) ->
    if err?
      console.log err
      destroy()
      setTimeout init, 10000
    else
      initWidgets widgetSettings
      setTimeout getChanges

destroy = ->
  widget.destroy() for id, widget of widgets
  widgets = {}
  contentEl?.innerHTML = ''
  positioner.destroy()

getWidgets = (callback) ->
  $.get('/widgets')
    .done((response) -> callback null, eval(response))
    .fail -> callback response, null

getChanges = ->
  $.get('/widget-changes')
    .done( (response) ->
      initWidgets eval(response) if response
      getChanges()
    )
    .fail ->
      destroy()
      setTimeout init, 10000

initWidgets = (widgetSettings) ->
  for id, settings of widgetSettings
    widgets[id].destroy() if widgets[id]?

    if settings == 'deleted'
      delete widgets[id]
    else
      widget = Widget settings
      widgets[widget.id] = widget
      initWidget(widget)

initWidget = (widget) ->
  contentEl.appendChild widget.create()
  positioner.positonWidget(widget)
  widget.start()

window.reset  = destroy
window.onload = init
