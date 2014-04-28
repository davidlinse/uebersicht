Engine = require '../../src/widget_positioning_engine.coffee'

describe 'widget positioning engine', ->

  describe 'dragging a widget', ->
    engine   = null
    domEl    = null
    widget   = null
    widgets  =
      get: -> widget

    beforeEach ->
      engine = Engine widgets
      domEl  = $("<div class='widget' id='foo'></div>")
      widget =
        id: 'foo'
        setFrame: (frame) -> domEl.css(frame)

      domEl.css
        position: 'absolute',
        top: 0, left: 0,
        width: '100px', height: '100px'

      $(document.body).css padding: 0, margin: 0
      $(document.body).html(domEl)

    afterEach ->
      engine.destroy()
      domEl.remove()
      $(document.body).css padding: '', margin: ''

    getFrame = ->
      JSON.parse(localStorage.getItem('foo') ? '{}').frame ? {}

    it 'should store the widget position in local storage', ->
      $(domEl).simulate('drag', dx: 10, dy: 5)
      currentFrame = getFrame()
      expect(currentFrame.left).toBe 10
      expect(currentFrame.top).toBe 5
