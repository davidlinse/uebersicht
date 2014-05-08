DragHandler = require '../../src/drag_handler.coffee'

describe 'drag handler', ->
  domEl  = null

  getPosition = ->
    domEl.offset()

  beforeEach ->
    domEl  = $("<div>")

    domEl.css
      position: 'absolute',
      top: 0, left: 0

    $(document.body).html(domEl)
    $(document.body).css padding: 0, margin: 0

  afterEach ->
    domEl.remove()
    $(document.body).css padding: '', margin: ''

  it 'should call the change handler with frame updates', ->
    currentFrame  = null
    changeHandler = jasmine.createSpy 'change handler'

    DragHandler({ pageX: 10, pageY: 20 }, domEl[0])
      .update changeHandler

    $(document).simulate 'mousemove', clientX: 20, clientY: 25
    expect(changeHandler).toHaveBeenCalledWith 10, 5

    $(document).simulate 'mousemove', clientX: 20, clientY: 20
    expect(changeHandler).toHaveBeenCalledWith 0, -5

    $(document).simulate 'mouseup', clientX: 50, clientY: 30
    expect(changeHandler).toHaveBeenCalledWith 30, 10

