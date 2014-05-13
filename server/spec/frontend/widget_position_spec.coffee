WidgetPosition = require '../../src/widget_position.coffee'

describe 'widget position', ->
  widget = null
  widgetPosition = null

  FakeWidget = ->
    domEl = $("<div class='widget'>")
    domEl.css top: 10, left: 43, width: 100, height: 120, position: 'absolute'
    $(document.body).append domEl

    id       : 'foo'
    contentEl: -> domEl[0]
    setFrame : jasmine.createSpy('setFrame')
    clearFrame: ->
    destroy  : -> domEl.remove()

  beforeEach ->
    widget = FakeWidget()
    widgetPosition = WidgetPosition widget
    localStorage.clear()

  afterEach ->
    widget.destroy()
    localStorage.clear()

  it 'exposes a widgets contentEl', ->
    expect(widgetPosition.domEl()).toBe widget.contentEl()

  it "reteive's a widgets frame from the dom", ->
    frame = widgetPosition.frame()
    expect(frame.top).toBe    10
    expect(frame.left).toBe   43
    expect(frame.width).toBe  100
    expect(frame.height).toBe 120

  it "restores a widget's position from local storage", ->
    settings = frame: { top: 2, left: 56, width: 42, height: 87 }
    localStorage.setItem(widget.id, JSON.stringify(settings))

    widgetPosition = WidgetPosition(widget)
    widgetPosition.restoreFrame()

    frame = widget.setFrame.calls[0].args[0]
    expect(frame.top).toBe    '2px'
    expect(frame.left).toBe   '56px'
    expect(frame.width).toBe  '42px'
    expect(frame.height).toBe '87px'

  it "sets default sticky edges", ->
    expect(widgetPosition.stickyEdges()).toEqual ['top', 'left']

  it "gets sticky edges from local storage", ->
    settings =
      frame: { bottom: 21, right: 23, width: 42, height: 87, left: 'auto' }
      stickyEdges: ['right', 'bottom']
    localStorage.setItem(widget.id, JSON.stringify(settings))

    widgetPosition = WidgetPosition(widget)
    expect(widgetPosition.stickyEdges()).toEqual ['right', 'bottom']

  it 'sets sticky edges', ->
    widgetPosition.setStickyEdge('top')
    expect(widgetPosition.stickyEdges()).toEqual ['top', 'left']

    widgetPosition.setStickyEdge('bottom')
    expect(widgetPosition.stickyEdges()).toEqual ['left', 'bottom']

    widgetPosition.setStickyEdge('right')
    expect(widgetPosition.stickyEdges()).toEqual ['bottom', 'right']

    widgetPosition.setStickyEdge('garbage')
    expect(widgetPosition.stickyEdges()).toEqual ['bottom', 'right']

  # describe 'given a frame', ->

  #   beforeEach ->
  #     settings = frame: { top: 10, right: 40, bottom: 23, left: 30, width: 100, height: 100 }
  #     localStorage.setItem(widget.id, JSON.stringify(settings))
  #     widgetPosition = WidgetPosition(widget)

  #   it 'sets a widgets frame based on sticky edges', ->
  #     widgetPosition.render()
  #     expect(widget.setFrame).toHaveBeenCalledWith
  #       top   : '10px'
  #       left  : '30px'
  #       width : '100px'
  #       height: '100px',
  #       right : 'auto'
  #       bottom: 'auto'

  #     widgetPosition.setStickyEdge 'right'
  #     widgetPosition.render()
  #     expect(widget.setFrame).toHaveBeenCalledWith
  #       top   : '10px'
  #       right : '40px'
  #       width : '100px'
  #       height: '100px'
  #       left  : 'auto'
  #       bottom: 'auto'

  #     widgetPosition.setStickyEdge 'bottom'
  #     widgetPosition.render()
  #     expect(widget.setFrame).toHaveBeenCalledWith
  #       bottom: '23px'
  #       right : '40px'
  #       width : '100px'
  #       height: '100px'
  #       top   : 'auto'
  #       left  : 'auto'





