rectM = require '../../src/rectangle_math.coffee'

describe 'rectangle math', ->

  describe 'outset', ->
    it 'should outset a rectangle', ->
      rect = left: 10, top: 20, width: 40, height: 30
      newRect = rectM.outset(rect, 1)

      expect(newRect.left).toBe 9
      expect(newRect.top).toBe 19
      expect(newRect.width).toBe 42
      expect(newRect.height).toBe 32


  describe 'pointInRect', ->
    describe 'given a point inside the rect', ->
      point = left: 10, top: 15
      rect  = left: 0, top: 0, width: 50, height: 60

      it 'should return true', ->
        expect(rectM.pointInRect(point, rect)).toBe true

    describe 'given a point outside the rect', ->
      point = left: 51, top: 15
      rect  = left: 0, top: 0, width: 50, height: 60

      it 'should return true', ->
        expect(rectM.pointInRect(point, rect)).toBe false

