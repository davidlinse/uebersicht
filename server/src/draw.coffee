module.exports = (context) ->
  api = {}

  api.fillFrame = (frame) ->
    context.fillRect frame.left, frame.top, frame.width, frame.height

  api.strokeFrame = (frame) ->
    context.strokeRect frame.left, frame.top, frame.width, frame.height

  api.clearFrame = (frame) ->
    context.clearRect frame.left, frame.top, frame.width, frame.height

  api
