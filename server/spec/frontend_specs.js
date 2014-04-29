(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Positioning, Widget, contentEl, destroy, getChanges, getWidgets, init, initWidget, initWidgets, positioner, widgets;

Widget = require('./src/widget.coffee');

Positioning = require('./src/widget_positioning_engine.coffee');

widgets = {};

contentEl = null;

positioner = null;

init = function() {
  contentEl = document.createElement('div');
  contentEl.className = 'content';
  document.body.appendChild(contentEl);
  positioner = Positioning({
    get: function(id) {
      return widgets[id];
    }
  });
  return getWidgets(function(err, widgetSettings) {
    if (err != null) {
      console.log(err);
      destroy();
      return setTimeout(init, 10000);
    } else {
      initWidgets(widgetSettings);
      return setTimeout(getChanges);
    }
  });
};

destroy = function() {
  var id, widget;
  for (id in widgets) {
    widget = widgets[id];
    widget.destroy();
  }
  widgets = {};
  if (contentEl != null) {
    contentEl.innerHTML = '';
  }
  return positioner.destroy();
};

getWidgets = function(callback) {
  return $.get('/widgets').done(function(response) {
    return callback(null, eval(response));
  }).fail(function() {
    return callback(response, null);
  });
};

getChanges = function() {
  return $.get('/widget-changes').done(function(response) {
    if (response) {
      initWidgets(eval(response));
    }
    return getChanges();
  }).fail(function() {
    destroy();
    return setTimeout(init, 10000);
  });
};

initWidgets = function(widgetSettings) {
  var id, settings, widget, _results;
  _results = [];
  for (id in widgetSettings) {
    settings = widgetSettings[id];
    if (widgets[id] != null) {
      widgets[id].destroy();
    }
    if (settings === 'deleted') {
      _results.push(delete widgets[id]);
    } else {
      widget = Widget(settings);
      widgets[widget.id] = widget;
      _results.push(initWidget(widget));
    }
  }
  return _results;
};

initWidget = function(widget) {
  contentEl.appendChild(widget.create());
  positioner.positonWidget(widget);
  return widget.start();
};

window.reset = destroy;

window.onload = init;


},{"./src/widget.coffee":9,"./src/widget_positioning_engine.coffee":10}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/* toSource by Marcello Bastea-Forte - zlib license */
module.exports = function(object, filter, indent, startingIndent) {
    var seen = []
    return walk(object, filter, indent === undefined ? '  ' : (indent || ''), startingIndent || '')

    function walk(object, filter, indent, currentIndent) {
        var nextIndent = currentIndent + indent
        object = filter ? filter(object) : object
        switch (typeof object) {
            case 'string':
                return JSON.stringify(object)
            case 'boolean':
            case 'number':
            case 'function':
            case 'undefined':
                return ''+object
        }

        if (object === null) return 'null'
        if (object instanceof RegExp) return object.toString()
        if (object instanceof Date) return 'new Date('+object.getTime()+')'

        if (seen.indexOf(object) >= 0) return '{$circularReference:1}'
        seen.push(object)

        function join(elements) {
            return indent.slice(1) + elements.join(','+(indent&&'\n')+nextIndent) + (indent ? ' ' : '');
        }

        if (Array.isArray(object)) {
            return '[' + join(object.map(function(element){
                return walk(element, filter, indent, nextIndent)
            })) + ']'
        }
        var keys = Object.keys(object)
        return keys.length ? '{' + join(keys.map(function (key) {
            return (legalKey(key) ? key : JSON.stringify(key)) + ':' + walk(object[key], filter, indent, nextIndent)
        })) + '}' : '{}'
    }
}

var KEYWORD_REGEXP = /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|undefined|var|void|volatile|while|with)$/

function legalKey(string) {
    return /^[a-z_$][0-9a-z_$]*$/gi.test(string) && !KEYWORD_REGEXP.test(string)
}
},{}],4:[function(require,module,exports){
describe('client', function() {
  var clock, contentEl, server;
  server = null;
  contentEl = null;
  clock = null;
  beforeEach(function() {
    clock = sinon.useFakeTimers();
    return server = sinon.fakeServer.create();
  });
  afterEach(function() {
    server.restore();
    clock.restore();
    return window.reset();
  });
  return it('should manage widgets on the frontend', function() {
    var lastRequest, req, requestedUrls, widgets;
    widgets = {
      foo: {
        id: 'foo',
        command: '',
        refreshFrequency: 1000,
        css: ''
      },
      bar: {
        id: 'bar',
        command: '',
        refreshFrequency: 1000,
        css: ''
      }
    };
    require('../../client.coffee');
    window.onload();
    contentEl = $('.content');
    expect(contentEl.length).toBe(1);
    expect(server.requests[0].url).toEqual('/widgets');
    server.requests[0].respond(200, {
      "Content-Type": "application/json"
    }, JSON.stringify(widgets));
    expect(contentEl.find('#foo').length).toBe(1);
    expect(contentEl.find('#bar').length).toBe(1);
    requestedUrls = (function() {
      var _i, _len, _ref, _results;
      _ref = server.requests;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        req = _ref[_i];
        _results.push(req.url);
      }
      return _results;
    })();
    expect(requestedUrls.indexOf('/widgets/foo')).not.toBe(-1);
    expect(requestedUrls.indexOf('/widgets/bar')).not.toBe(-1);
    clock.tick();
    lastRequest = server.requests[server.requests.length - 1];
    expect(lastRequest.url).toEqual('/widget-changes');
    lastRequest.respond(200, {
      "Content-Type": "application/json"
    }, JSON.stringify({
      foo: 'deleted'
    }));
    return expect(contentEl.find('#foo').length).toBe(0);
  });
});


},{"../../client.coffee":1}],5:[function(require,module,exports){
var DragHandler;

DragHandler = require('../../src/drag_handler.coffee');

describe('drag handler', function() {
  var domEl, getPosition;
  domEl = null;
  getPosition = function() {
    return domEl.offset();
  };
  beforeEach(function() {
    domEl = $("<div>");
    domEl.css({
      position: 'absolute',
      top: 0,
      left: 0
    });
    $(document.body).html(domEl);
    return $(document.body).css({
      padding: 0,
      margin: 0
    });
  });
  afterEach(function() {
    domEl.remove();
    return $(document.body).css({
      padding: '',
      margin: ''
    });
  });
  return it('should call the change handler with frame updates', function() {
    var changeHandler, currentFrame, position;
    currentFrame = null;
    changeHandler = function(frame) {
      return currentFrame = frame;
    };
    DragHandler({
      pageX: 10,
      pageY: 20
    }, domEl[0]).update(changeHandler);
    position = getPosition();
    expect(position.left).toBe(0);
    expect(position.top).toBe(0);
    $(document).simulate('mousemove', {
      clientX: 20,
      clientY: 25
    });
    expect(currentFrame.left).toBe(10);
    expect(currentFrame.top).toBe(5);
    $(document).simulate('mousemove', {
      clientX: 20,
      clientY: 20
    });
    expect(currentFrame.left).toBe(10);
    expect(currentFrame.top).toBe(0);
    $(document).simulate('mouseup', {
      clientX: 50,
      clientY: 30
    });
    expect(currentFrame.left).toBe(40);
    return expect(currentFrame.top).toBe(10);
  });
});


},{"../../src/drag_handler.coffee":8}],6:[function(require,module,exports){
var Engine;

Engine = require('../../src/widget_positioning_engine.coffee');

describe('widget positioning engine', function() {
  return describe('dragging a widget', function() {
    var domEl, engine, getFrame, widget, widgets;
    engine = null;
    domEl = null;
    widget = null;
    widgets = {
      get: function() {
        return widget;
      }
    };
    beforeEach(function() {
      engine = Engine(widgets);
      domEl = $("<div class='widget' id='foo'></div>");
      widget = {
        id: 'foo',
        setFrame: function(frame) {
          return domEl.css(frame);
        }
      };
      domEl.css({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100px',
        height: '100px'
      });
      $(document.body).css({
        padding: 0,
        margin: 0
      });
      return $(document.body).html(domEl);
    });
    afterEach(function() {
      engine.destroy();
      domEl.remove();
      return $(document.body).css({
        padding: '',
        margin: ''
      });
    });
    getFrame = function() {
      var _ref, _ref1;
      return (_ref = JSON.parse((_ref1 = localStorage.getItem('foo')) != null ? _ref1 : '{}').frame) != null ? _ref : {};
    };
    return it('should store the widget position in local storage', function() {
      var currentFrame;
      $(domEl).simulate('drag', {
        dx: 10,
        dy: 5
      });
      currentFrame = getFrame();
      expect(currentFrame.left).toBe(10);
      return expect(currentFrame.top).toBe(5);
    });
  });
});


},{"../../src/widget_positioning_engine.coffee":10}],7:[function(require,module,exports){
var Widget;

Widget = require('../../src/widget.coffee');

describe('widget', function() {
  it('should create a dom element with the widget id', function() {
    var el, widget;
    widget = Widget({
      command: '',
      id: 'foo',
      css: ''
    });
    el = widget.create();
    expect($(el).length).toBe(1);
    expect($(el).find("#foo").length).toBe(1);
    return widget.stop();
  });
  return it('should create a style element with the widget style', function() {
    var el, widget;
    widget = Widget({
      command: '',
      css: "background: red"
    });
    el = widget.create();
    expect($(el).find("style").html().indexOf('background: red')).not.toBe(-1);
    return widget.stop();
  });
});

describe('widget', function() {
  var domEl, server, widget;
  server = null;
  widget = null;
  domEl = null;
  beforeEach(function() {
    return server = sinon.fakeServer.create();
  });
  afterEach(function() {
    server.restore();
    return widget.stop();
  });
  describe('without a render method', function() {
    beforeEach(function() {
      widget = Widget({
        command: '',
        id: 'foo'
      });
      return domEl = widget.create();
    });
    return it('should just render server response', function() {
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'bar'
      ]);
      widget.start();
      server.respond();
      return expect($(domEl).find('.widget').text()).toEqual('bar');
    });
  });
  describe('with a render method', function() {
    beforeEach(function() {
      widget = Widget({
        command: '',
        id: 'foo',
        render: function(out) {
          return "rendered: " + out;
        }
      });
      return domEl = widget.create();
    });
    return it('should render what render returns', function() {
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'baz'
      ]);
      widget.start();
      server.respond();
      return expect($(domEl).find('.widget').text()).toEqual('rendered: baz');
    });
  });
  describe('with an update method', function() {
    var update;
    update = null;
    beforeEach(function() {
      update = jasmine.createSpy('update');
      widget = Widget({
        command: '',
        id: 'foo',
        update: update
      });
      return domEl = widget.create();
    });
    return it('should render output and then call update', function() {
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'stuff'
      ]);
      widget.start();
      server.respond();
      expect($(domEl).find('.widget').text()).toEqual('stuff');
      return expect(update).toHaveBeenCalledWith('stuff', $(domEl).find('.widget')[0]);
    });
  });
  describe('when started', function() {
    var render;
    render = null;
    beforeEach(function() {
      render = jasmine.createSpy('render');
      widget = Widget({
        command: '',
        id: 'foo',
        render: render,
        refreshFrequency: 100
      });
      return domEl = widget.create();
    });
    return it('should keep updating until stop() is called', function() {
      var done;
      jasmine.Clock.useMock();
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'stuff'
      ]);
      server.autoRespond = true;
      done = false;
      widget.start();
      jasmine.Clock.tick(250);
      expect(render.calls.length).toBe(3);
      widget.stop();
      jasmine.Clock.tick(1000);
      return expect(render.calls.length).toBe(3);
    });
  });
  return describe('error handling', function() {
    it('should catch and show exceptions inside render', function() {
      widget = Widget({
        command: '',
        id: 'foo',
        render: function() {
          throw new Error('something went sorry');
        }
      });
      domEl = widget.create();
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'baz'
      ]);
      widget.start();
      server.respond();
      return expect($(domEl).find('.widget').text()).toEqual('something went sorry');
    });
    it('should catch and show exceptions inside update', function() {
      widget = Widget({
        command: '',
        id: 'foo',
        update: function() {
          throw new Error('up');
        }
      });
      domEl = widget.create();
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'baz'
      ]);
      widget.start();
      server.respond();
      return expect($(domEl).find('.widget').text()).toEqual('up');
    });
    it('should not call update when render fails', function() {
      var update;
      update = jasmine.createSpy('update');
      widget = Widget({
        command: '',
        id: 'foo',
        render: function() {
          throw new Error('oops');
        },
        update: update
      });
      domEl = widget.create();
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'baz'
      ]);
      widget.start();
      server.respond();
      expect($(domEl).find('.widget').text()).toEqual('oops');
      return expect(update).not.toHaveBeenCalled();
    });
    it('should render backend errors', function() {
      widget = Widget({
        command: '',
        id: 'foo',
        render: function() {}
      });
      domEl = widget.create();
      server.respondWith("GET", "/widgets/foo", [
        500, {
          "Content-Type": "text/plain"
        }, 'puke'
      ]);
      widget.start();
      server.respond();
      return expect($(domEl).find('.widget').text()).toEqual('puke');
    });
    return it('should be able to recover after an error', function() {
      jasmine.Clock.useMock();
      widget = Widget({
        command: '',
        id: 'foo',
        refreshFrequency: 100,
        update: function(o, domEl) {
          return domEl.innerHTML = domEl.innerHTML + '!';
        }
      });
      domEl = widget.create();
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'all good'
      ]);
      widget.start();
      server.respond();
      expect($(domEl).find('.widget').text()).toEqual('all good!');
      server.respondWith("GET", "/widgets/foo", [
        500, {
          "Content-Type": "text/plain"
        }, 'oh noes'
      ]);
      jasmine.Clock.tick(100);
      server.respond();
      expect($(domEl).find('.widget').text()).toEqual('oh noes');
      server.respondWith("GET", "/widgets/foo", [
        200, {
          "Content-Type": "text/plain"
        }, 'all good again'
      ]);
      jasmine.Clock.tick(100);
      server.respond();
      return expect($(domEl).find('.widget').text()).toEqual('all good again!');
    });
  });
});


},{"../../src/widget.coffee":9}],8:[function(require,module,exports){
module.exports = function(event, domEl) {
  var api, currentFrame, end, endHandler, k, prevPosition, update, updateHandler, v, _ref;
  api = {};
  updateHandler = function() {};
  endHandler = function() {};
  prevPosition = {
    x: event.pageX,
    y: event.pageY
  };
  currentFrame = {};
  _ref = domEl.getBoundingClientRect();
  for (k in _ref) {
    v = _ref[k];
    currentFrame[k] = v;
  }
  update = function(e) {
    var dx, dy, _ref1;
    _ref1 = [e.pageX - prevPosition.x, e.pageY - prevPosition.y], dx = _ref1[0], dy = _ref1[1];
    prevPosition = {
      x: e.pageX,
      y: e.pageY
    };
    currentFrame.left += dx;
    currentFrame.top += dy;
    return updateHandler(currentFrame);
  };
  end = function(e) {
    update(e);
    document.removeEventListener('mousemove', update);
    document.removeEventListener('mouseup', end);
    return endHandler();
  };
  document.addEventListener('mousemove', update);
  document.addEventListener('mouseup', end);
  api.update = function(handler) {
    return updateHandler = handler;
  };
  api.end = function(handler) {
    return endHandler = handler;
  };
  return api;
};


},{}],9:[function(require,module,exports){
var exec, nib, stylus, toSource;

exec = require('child_process').exec;

toSource = require('tosource');

stylus = require('stylus');

nib = require('nib');

module.exports = function(implementation) {
  var api, contentEl, defaultStyle, el, init, parseStyle, redraw, refresh, render, renderOutput, rendered, started, timer, update, validate;
  api = {};
  el = null;
  contentEl = null;
  timer = null;
  update = null;
  render = null;
  started = false;
  rendered = false;
  defaultStyle = 'top: 30px; left: 10px';
  init = function() {
    var issues, _ref, _ref1, _ref2, _ref3;
    if ((issues = validate(implementation)).length !== 0) {
      throw new Error(issues.join(', '));
    }
    api.id = (_ref = implementation.id) != null ? _ref : 'widget';
    api.refreshFrequency = (_ref1 = implementation.refreshFrequency) != null ? _ref1 : 1000;
    if (!((implementation.css != null) || (typeof window !== "undefined" && window !== null))) {
      implementation.css = parseStyle((_ref2 = implementation.style) != null ? _ref2 : defaultStyle);
      delete implementation.style;
    }
    render = (_ref3 = implementation.render) != null ? _ref3 : function(output) {
      return output;
    };
    update = implementation.update;
    return api;
  };
  api.create = function() {
    el = document.createElement('div');
    contentEl = document.createElement('div');
    contentEl.id = api.id;
    contentEl.className = 'widget';
    el.innerHTML = "<style>" + implementation.css + "</style>\n";
    el.appendChild(contentEl);
    return el;
  };
  api.destroy = function() {
    var _ref;
    api.stop();
    if (el == null) {
      return;
    }
    if ((_ref = el.parentNode) != null) {
      _ref.removeChild(el);
    }
    el = null;
    return contentEl = null;
  };
  api.start = function() {
    started = true;
    if (timer != null) {
      clearTimeout(timer);
    }
    return refresh();
  };
  api.stop = function() {
    started = false;
    rendered = false;
    if (timer != null) {
      return clearTimeout(timer);
    }
  };
  api.exec = function(options, callback) {
    return exec(implementation.command, options, callback);
  };
  api.serialize = function() {
    return toSource(implementation);
  };
  api.setFrame = function(frame) {
    if (frame.top != null) {
      contentEl.style.top = frame.top + 'px';
    }
    if (frame.right != null) {
      contentEl.style.right = frame.right + 'px';
    }
    if (frame.bottom != null) {
      contentEl.style.bottom = frame.bottom + 'px';
    }
    if (frame.left != null) {
      contentEl.style.left = frame.left + 'px';
    }
    return contentEl.style.margin = 0;
  };
  redraw = function(output, error) {
    var e;
    if (error) {
      contentEl.innerHTML = error;
      return rendered = false;
    }
    try {
      return renderOutput(output);
    } catch (_error) {
      e = _error;
      return contentEl.innerHTML = e.message;
    }
  };
  renderOutput = function(output) {
    if ((update != null) && rendered) {
      return update.call(implementation, output, contentEl);
    } else {
      contentEl.innerHTML = render.call(implementation, output);
      rendered = true;
      if (update != null) {
        return update.call(implementation, output, contentEl);
      }
    }
  };
  refresh = function() {
    return $.get('/widgets/' + api.id).done(function(response) {
      if (started) {
        return redraw(response);
      }
    }).fail(function(response) {
      if (started) {
        return redraw(null, response.responseText);
      }
    }).always(function() {
      if (!started) {
        return;
      }
      return timer = setTimeout(refresh, api.refreshFrequency);
    });
  };
  parseStyle = function(style) {
    var e, scopedStyle;
    if (!style) {
      return "";
    }
    scopedStyle = ("#" + api.id + "\n  ") + style.replace(/\n/g, "\n  ");
    try {
      return stylus(scopedStyle)["import"]('nib').use(nib()).render();
    } catch (_error) {
      e = _error;
      console.log('error parsing widget style:\n');
      console.log(e.message);
      console.log(scopedStyle);
      return "";
    }
  };
  validate = function(impl) {
    var issues;
    issues = [];
    if (impl == null) {
      return ['empty implementation'];
    }
    if (impl.command == null) {
      issues.push('no command given');
    }
    return issues;
  };
  return init();
};


},{"child_process":2,"nib":2,"stylus":2,"tosource":3}],10:[function(require,module,exports){
var DragHandler;

DragHandler = require('./drag_handler.coffee');

module.exports = function(widgets) {
  var api, cancelAnimFrame, canvas, clearFrame, context, fillFrame, getLocalSettings, getWidget, getWidgetFrame, guidesWidth, init, initCanvas, renderDrag, renderGuides, requestAnimFrame, startPositioning, storeLocalSettings, storeWidgetFrame, strokeFrame;
  api = {};
  canvas = null;
  context = null;
  requestAnimFrame = typeof webkitRequestAnimationFrame !== "undefined" && webkitRequestAnimationFrame !== null ? webkitRequestAnimationFrame : setTimeout;
  cancelAnimFrame = typeof webkitCancelAnimationFrame !== "undefined" && webkitCancelAnimationFrame !== null ? webkitCancelAnimationFrame : clearTimeout;
  guidesWidth = 2;
  init = function() {
    document.addEventListener('mousedown', startPositioning);
    canvas = document.createElement('canvas');
    context = canvas.getContext("2d");
    document.body.insertBefore(canvas, document.body.firstChild);
    initCanvas();
    return api;
  };
  api.destroy = function() {
    document.removeEventListener('mousedown', startPositioning);
    if (canvas.parentElement != null) {
      return document.body.removeChild(canvas);
    }
  };
  api.positonWidget = function(widget) {
    var frame;
    frame = getWidgetFrame(widget);
    if (!frame) {
      return;
    }
    return widget.setFrame(frame);
  };
  startPositioning = function(e) {
    var el, handler, prevFrame, request, widget;
    if ((el = getWidget(e.target)) == null) {
      return;
    }
    widget = widgets.get(el.id);
    context.fillStyle = "rgba(255, 255, 255, 0.4)";
    context.strokeStyle = "#289ed6";
    context.lineWidth = guidesWidth;
    context.fillRect(0, 0, canvas.width, canvas.height);
    prevFrame = {};
    handler = DragHandler(e, el);
    request = null;
    handler.update(function(frame) {
      request = requestAnimFrame(renderDrag(widget, prevFrame, frame));
      return prevFrame = {
        left: frame.left - 1,
        top: frame.top - 1,
        width: frame.width + 2,
        height: frame.height + 2
      };
    });
    return handler.end(function() {
      cancelAnimFrame(request);
      storeWidgetFrame(widget, {
        top: prevFrame.top + 1,
        left: prevFrame.left + 1
      });
      return context.clearRect(0, 0, canvas.width, canvas.height);
    });
  };
  renderDrag = function(widget, prevFrame, frame) {
    return function() {
      renderGuides(prevFrame, frame);
      widget.setFrame({
        top: frame.top,
        left: frame.left
      });
      clearFrame(prevFrame);
      fillFrame(prevFrame);
      return clearFrame(frame);
    };
  };
  renderGuides = function(prevFrame, frame) {
    var left, oldGuideRect, top;
    oldGuideRect = {
      left: Math.floor(prevFrame.left + prevFrame.width / 2 - 10),
      top: 0,
      width: 20,
      height: prevFrame.top
    };
    clearFrame(oldGuideRect);
    fillFrame(oldGuideRect);
    oldGuideRect = {
      left: 0,
      top: Math.floor(prevFrame.top + prevFrame.height / 2 - 10),
      width: prevFrame.left,
      height: 20
    };
    clearFrame(oldGuideRect);
    fillFrame(oldGuideRect);
    context.beginPath();
    left = frame.left + frame.width / 2 - guidesWidth / 2;
    top = frame.top + frame.height / 2 - guidesWidth / 2;
    context.moveTo(frame.left, top);
    context.lineTo(0, top);
    context.moveTo(left, frame.top);
    context.lineTo(left, 0);
    return context.stroke();
  };
  getWidget = function(element) {
    if (element === document.body || element === document) {
      return;
    }
    if (element.className === 'widget' && element.id) {
      return element;
    } else {
      return getWidget(element.parentElement);
    }
  };
  getWidgetFrame = function(widget) {
    return getLocalSettings(widget).frame;
  };
  storeWidgetFrame = function(widget, frame) {
    var settings;
    settings = getLocalSettings(widget);
    settings.frame = frame;
    return storeLocalSettings(widget, settings);
  };
  getLocalSettings = function(widget) {
    return JSON.parse(localStorage.getItem(widget.id) || '{}');
  };
  storeLocalSettings = function(widget, settings) {
    return localStorage.setItem(widget.id, JSON.stringify(settings));
  };
  initCanvas = function() {
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.width = window.innerWidth;
    return canvas.height = window.innerHeight;
  };
  fillFrame = function(frame) {
    return context.fillRect(frame.left, frame.top, frame.width, frame.height);
  };
  strokeFrame = function(frame) {
    return context.strokeRect(frame.left, frame.top, frame.width, frame.height);
  };
  clearFrame = function(frame) {
    return context.clearRect(frame.left, frame.top, frame.width, frame.height);
  };
  return init();
};


},{"./drag_handler.coffee":8}]},{},[4,5,6,7])