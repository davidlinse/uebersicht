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


},{"./src/widget.coffee":10,"./src/widget_positioning_engine.coffee":11}],2:[function(require,module,exports){

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
        },
        contentEl: function() {
          return domEl[0];
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


},{"../../src/widget_positioning_engine.coffee":11}],7:[function(require,module,exports){
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


},{"../../src/widget.coffee":10}],8:[function(require,module,exports){
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
exports.outset = function(rect, delta) {
  return {
    top: rect.top - delta,
    left: rect.left - delta,
    width: rect.width + 2 * delta,
    height: rect.height + 2 * delta
  };
};

exports.pointInRect = function(point, rect) {
  return point.left >= rect.left && point.top >= rect.top && point.left <= rect.left + rect.width && point.top <= rect.top + rect.height;
};


},{}],10:[function(require,module,exports){
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
    if (frame.width != null) {
      contentEl.style.width = frame.width + 'px';
    }
    if (frame.height != null) {
      contentEl.style.height = frame.height + 'px';
    }
    return contentEl.style.margin = 0;
  };
  api.contentEl = function() {
    return contentEl;
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


},{"child_process":2,"nib":2,"stylus":2,"tosource":3}],11:[function(require,module,exports){
var DragHandler, Rect, cancelAnimFrame, guidesWidth, requestAnimFrame;

DragHandler = require('./drag_handler.coffee');

Rect = require('./rectangle_math.coffee');

requestAnimFrame = typeof webkitRequestAnimationFrame !== "undefined" && webkitRequestAnimationFrame !== null ? webkitRequestAnimationFrame : setTimeout;

cancelAnimFrame = typeof webkitCancelAnimationFrame !== "undefined" && webkitCancelAnimationFrame !== null ? webkitCancelAnimationFrame : clearTimeout;

guidesWidth = 1;

module.exports = function(widgets) {
  var api, canvas, chromeEl, clearFrame, context, currentWidget, fillFrame, getLocalSettings, getWidgetAt, getWidgetFrame, guideDimensions, init, initCanvas, onMouseDown, renderChrome, renderDrag, renderGuide, renderGuides, selectWidget, slice, startPositioning, storeLocalSettings, storeWidgetFrame, strokeFrame;
  api = {};
  canvas = null;
  context = null;
  currentWidget = null;
  chromeEl = null;
  init = function() {
    document.addEventListener('mousedown', onMouseDown);
    canvas = document.createElement('canvas');
    context = canvas.getContext("2d");
    document.body.insertBefore(canvas, document.body.firstChild);
    initCanvas();
    chromeEl = document.createElement('div');
    chromeEl.className = 'widget-chrome';
    chromeEl.innerHTML = "<div class='link top'></div>\n<div class='link right'></div>\n<div class='link bottom'></div>\n<div class='link left'></div>";
    chromeEl.style.position = 'absolute';
    document.body.appendChild(chromeEl);
    return api;
  };
  api.destroy = function() {
    document.removeEventListener('mousedown', onMouseDown);
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
  onMouseDown = function(e) {
    var widget;
    widget = getWidgetAt({
      left: e.clientX,
      top: e.clientY
    });
    if (widget == null) {
      return;
    }
    startPositioning(widget, e);
    return selectWidget(widget);
  };
  selectWidget = function(widget) {
    var frame, oldFrame;
    oldFrame = {};
    if (currentWidget != null) {
      oldFrame = currentWidget.contentEl().getBoundingClientRect();
    }
    frame = widget.contentEl().getBoundingClientRect();
    currentWidget = widget;
    return renderChrome(oldFrame, frame);
  };
  startPositioning = function(widget, e) {
    var handler, prevFrame, request;
    context.fillStyle = "rgba(255, 255, 255, 0.4)";
    prevFrame = {};
    handler = DragHandler(e, widget.contentEl());
    request = null;
    handler.update(function(frame) {
      var k, v, _results;
      request = requestAnimFrame(renderDrag(widget, prevFrame, frame));
      prevFrame = {};
      _results = [];
      for (k in frame) {
        v = frame[k];
        _results.push(prevFrame[k] = v);
      }
      return _results;
    });
    return handler.end(function() {
      cancelAnimFrame(request);
      storeWidgetFrame(widget, slice(prevFrame, ['top', 'left', 'width', 'height']));
      return renderGuides(prevFrame, {});
    });
  };
  renderChrome = function(prevFrame, frame) {
    frame = Rect.outset(frame, 2);
    chromeEl.style.left = frame.left + 'px';
    chromeEl.style.top = frame.top + 'px';
    chromeEl.style.width = frame.width + 'px';
    return chromeEl.style.height = frame.height + 'px';
  };
  renderDrag = function(widget, prevFrame, frame) {
    return function() {
      renderGuides(prevFrame, frame);
      widget.setFrame(slice(frame, ['top', 'left', 'width', 'height']));
      return renderChrome(prevFrame, frame);
    };
  };
  renderGuides = function(prevFrame, frame) {
    renderGuide(prevFrame, frame, 'top');
    return renderGuide(prevFrame, frame, 'left');
  };
  renderGuide = function(prevFrame, frame, direction) {
    var dim, oldGuideRect, rectHeight;
    dim = guideDimensions(prevFrame, direction);
    rectHeight = 20;
    oldGuideRect = {
      left: dim.start,
      top: -rectHeight / 2,
      width: dim.end,
      height: rectHeight
    };
    context.save();
    context.translate(dim.center.x, dim.center.y);
    context.rotate(dim.angle);
    clearFrame(oldGuideRect);
    context.restore();
    dim = guideDimensions(frame, direction);
    context.save();
    context.translate(dim.center.x, dim.center.y);
    context.rotate(dim.angle);
    context.beginPath();
    context.moveTo(dim.start + 5, 0);
    context.lineTo(dim.end, 0);
    if (typeof context.setLineDash === "function") {
      context.setLineDash([5, 2]);
    }
    context.strokeStyle = "#289ed6";
    context.lineWidth = guidesWidth;
    context.stroke();
    return context.restore();
  };
  guideDimensions = function(frame, direction) {
    var angle, center, end, start;
    center = {
      x: frame.left + frame.width / 2,
      y: frame.top + frame.height / 2
    };
    switch (direction) {
      case 'right':
        angle = 0;
        start = frame.width / 2;
        end = canvas.width;
        break;
      case 'bottom':
        angle = Math.PI / 2;
        start = frame.height / 2;
        end = canvas.height;
        break;
      case 'left':
        angle = Math.PI;
        start = frame.width / 2;
        end = canvas.width;
        break;
      case 'top':
        angle = -Math.PI / 2;
        start = frame.height / 2;
        end = canvas.height;
    }
    return {
      angle: angle,
      start: start,
      end: end,
      center: center
    };
  };
  getWidgetAt = function(point) {
    var foundEl, widgetEl, _i, _len, _ref;
    foundEl = {};
    _ref = document.getElementsByClassName('widget');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      widgetEl = _ref[_i];
      if (widgetEl.id == null) {
        continue;
      }
      if (Rect.pointInRect(point, widgetEl.getBoundingClientRect())) {
        foundEl = widgetEl;
        break;
      }
    }
    return widgets.get(foundEl.id);
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
  slice = function(object, keys) {
    var k, result, _i, _len;
    result = {};
    for (_i = 0, _len = keys.length; _i < _len; _i++) {
      k = keys[_i];
      result[k] = object[k];
    }
    return result;
  };
  return init();
};


},{"./drag_handler.coffee":8,"./rectangle_math.coffee":9}]},{},[4,5,6,7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZmVsaXgvV29ya3NwYWNlL1XMiGJlcnNpY2h0L1XMiGJlcnNpY2h0L3NlcnZlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2ZlbGl4L1dvcmtzcGFjZS9VzIhiZXJzaWNodC9VzIhiZXJzaWNodC9zZXJ2ZXIvY2xpZW50LmNvZmZlZSIsIi9Vc2Vycy9mZWxpeC9Xb3Jrc3BhY2UvVcyIYmVyc2ljaHQvVcyIYmVyc2ljaHQvc2VydmVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIvVXNlcnMvZmVsaXgvV29ya3NwYWNlL1XMiGJlcnNpY2h0L1XMiGJlcnNpY2h0L3NlcnZlci9ub2RlX21vZHVsZXMvdG9zb3VyY2UvdG9zb3VyY2UuanMiLCIvVXNlcnMvZmVsaXgvV29ya3NwYWNlL1XMiGJlcnNpY2h0L1XMiGJlcnNpY2h0L3NlcnZlci9zcGVjL2Zyb250ZW5kL2NsaWVudF9zcGVjLmNvZmZlZSIsIi9Vc2Vycy9mZWxpeC9Xb3Jrc3BhY2UvVcyIYmVyc2ljaHQvVcyIYmVyc2ljaHQvc2VydmVyL3NwZWMvZnJvbnRlbmQvZHJhZF9oYW5kbGVyX3NwZWMuY29mZmVlIiwiL1VzZXJzL2ZlbGl4L1dvcmtzcGFjZS9VzIhiZXJzaWNodC9VzIhiZXJzaWNodC9zZXJ2ZXIvc3BlYy9mcm9udGVuZC93aWRnZXRfcG9zaXRpb25pbmdfZW5naW5lX3NwZWMuY29mZmVlIiwiL1VzZXJzL2ZlbGl4L1dvcmtzcGFjZS9VzIhiZXJzaWNodC9VzIhiZXJzaWNodC9zZXJ2ZXIvc3BlYy9mcm9udGVuZC93aWRnZXRfc3BlYy5jb2ZmZWUiLCIvVXNlcnMvZmVsaXgvV29ya3NwYWNlL1XMiGJlcnNpY2h0L1XMiGJlcnNpY2h0L3NlcnZlci9zcmMvZHJhZ19oYW5kbGVyLmNvZmZlZSIsIi9Vc2Vycy9mZWxpeC9Xb3Jrc3BhY2UvVcyIYmVyc2ljaHQvVcyIYmVyc2ljaHQvc2VydmVyL3NyYy9yZWN0YW5nbGVfbWF0aC5jb2ZmZWUiLCIvVXNlcnMvZmVsaXgvV29ya3NwYWNlL1XMiGJlcnNpY2h0L1XMiGJlcnNpY2h0L3NlcnZlci9zcmMvd2lkZ2V0LmNvZmZlZSIsIi9Vc2Vycy9mZWxpeC9Xb3Jrc3BhY2UvVcyIYmVyc2ljaHQvVcyIYmVyc2ljaHQvc2VydmVyL3NyYy93aWRnZXRfcG9zaXRpb25pbmdfZW5naW5lLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsK0dBQUE7O0FBQUEsQ0FBQSxFQUFjLEdBQWQsQ0FBYyxjQUFBOztBQUNkLENBREEsRUFDYyxJQUFBLElBQWQsNkJBQWM7O0FBRWQsQ0FIQSxDQUFBLENBR2EsSUFBYjs7QUFDQSxDQUpBLEVBSWEsQ0FKYixLQUlBOztBQUNBLENBTEEsRUFLYSxDQUxiLE1BS0E7O0FBRUEsQ0FQQSxFQU9PLENBQVAsS0FBTztDQUNMLENBQUEsQ0FBWSxFQUFBLEdBQVEsQ0FBcEIsSUFBWTtDQUFaLENBQ0EsQ0FBc0IsTUFBYjtDQURULENBRUEsRUFBYSxJQUFMLENBQVIsRUFBQTtDQUZBLENBSUEsQ0FBYSxPQUFiLENBQWE7Q0FBWSxDQUFLLENBQUwsQ0FBQSxLQUFNO0NBQWUsQ0FBQSxLQUFBLE1BQVI7Q0FBYixJQUFLO0NBSjlCLEdBSWE7Q0FFRixDQUFNLENBQU4sTUFBWCxDQUFBLElBQVc7Q0FDVCxHQUFBLE9BQUE7Q0FDRSxFQUFBLEdBQUEsQ0FBTztDQUFQLEtBQ0EsQ0FBQTtDQUNXLENBQU0sRUFBakIsQ0FBQSxLQUFBLEdBQUE7TUFIRjtDQUtFLEtBQUEsS0FBQSxHQUFBO0NBQ1csU0FBWCxHQUFBO01BUE87Q0FBWCxFQUFXO0NBUE47O0FBZ0JQLENBdkJBLEVBdUJVLElBQVYsRUFBVTtDQUNSLEtBQUEsSUFBQTtBQUFBLENB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Q0FBeEIsQ0FBWSxDQUFOLEVBQU4sRUFBQTtDQUFBLEVBQ0EsQ0FBQSxDQUFZLENBQU47Q0FETixFQUVvQixDQUFwQixDQUFZLENBQU47Q0FGTixFQUdnQixDQUFoQixDQUFBLENBQU0sSUFITjtDQUlPLEVBQVMsR0FBVixLQUFOO0NBektGLEVBb0thO0NBcEtiLENBMktBLENBQVksRUFBQSxJQUFaO0NBQ1UsQ0FBcUIsQ0FBN0IsQ0FBQSxDQUFzQixDQUF0QixDQUFPLENBQVAsR0FBQTtDQTVLRixFQTJLWTtDQTNLWixDQThLQSxDQUFjLEVBQUEsSUFBQyxFQUFmO0NBQ1UsQ0FBdUIsQ0FBL0IsQ0FBQSxDQUF3QixDQUF4QixDQUFPLEdBQVAsQ0FBQTtDQS9LRixFQThLYztDQTlLZCxDQWlMQSxDQUFhLEVBQUEsSUFBQyxDQUFkO0NBQ1UsQ0FBc0IsQ0FBOUIsQ0FBQSxDQUF1QixDQUF2QixDQUFPLEVBQVAsRUFBQTtDQWxMRixFQWlMYTtDQWpMYixDQW9MQSxDQUFRLENBQUEsQ0FBUixDQUFRLEdBQUM7Q0FDUCxPQUFBLFdBQUE7Q0FBQSxDQUFBLENBQVMsQ0FBVCxFQUFBO0FBQ0EsQ0FBQSxRQUFBLGtDQUFBO29CQUFBO0NBQUEsRUFBWSxHQUFaO0NBQUEsSUFEQTtDQURNLFVBR047Q0F2TEYsRUFvTFE7Q0FLUixHQUFBLEtBQUE7Q0ExTGUiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIldpZGdldCAgICAgID0gcmVxdWlyZSAnLi9zcmMvd2lkZ2V0LmNvZmZlZSdcblBvc2l0aW9uaW5nID0gcmVxdWlyZSAnLi9zcmMvd2lkZ2V0X3Bvc2l0aW9uaW5nX2VuZ2luZS5jb2ZmZWUnXG5cbndpZGdldHMgICAgPSB7fVxuY29udGVudEVsICA9IG51bGxcbnBvc2l0aW9uZXIgPSBudWxsXG5cbmluaXQgPSAtPlxuICBjb250ZW50RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBjb250ZW50RWwuY2xhc3NOYW1lID0gJ2NvbnRlbnQnXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY29udGVudEVsKVxuXG4gIHBvc2l0aW9uZXIgPSBQb3NpdGlvbmluZyBnZXQ6IChpZCkgLT4gd2lkZ2V0c1tpZF1cblxuICBnZXRXaWRnZXRzIChlcnIsIHdpZGdldFNldHRpbmdzKSAtPlxuICAgIGlmIGVycj9cbiAgICAgIGNvbnNvbGUubG9nIGVyclxuICAgICAgZGVzdHJveSgpXG4gICAgICBzZXRUaW1lb3V0IGluaXQsIDEwMDAwXG4gICAgZWxzZVxuICAgICAgaW5pdFdpZGdldHMgd2lkZ2V0U2V0dGluZ3NcbiAgICAgIHNldFRpbWVvdXQgZ2V0Q2hhbmdlc1xuXG5kZXN0cm95ID0gLT5cbiAgd2lkZ2V0LmRlc3Ryb3koKSBmb3IgaWQsIHdpZGdldCBvZiB3aWRnZXRzXG4gIHdpZGdldHMgPSB7fVxuICBjb250ZW50RWw/LmlubmVySFRNTCA9ICcnXG4gIHBvc2l0aW9uZXIuZGVzdHJveSgpXG5cbmdldFdpZGdldHMgPSAoY2FsbGJhY2spIC0+XG4gICQuZ2V0KCcvd2lkZ2V0cycpXG4gICAgLmRvbmUoKHJlc3BvbnNlKSAtPiBjYWxsYmFjayBudWxsLCBldmFsKHJlc3BvbnNlKSlcbiAgICAuZmFpbCAtPiBjYWxsYmFjayByZXNwb25zZSwgbnVsbFxuXG5nZXRDaGFuZ2VzID0gLT5cbiAgJC5nZXQoJy93aWRnZXQtY2hhbmdlcycpXG4gICAgLmRvbmUoIChyZXNwb25zZSkgLT5cbiAgICAgIGluaXRXaWRnZXRzIGV2YWwocmVzcG9uc2UpIGlmIHJlc3BvbnNlXG4gICAgICBnZXRDaGFuZ2VzKClcbiAgICApXG4gICAgLmZhaWwgLT5cbiAgICAgIGRlc3Ryb3koKVxuICAgICAgc2V0VGltZW91dCBpbml0LCAxMDAwMFxuXG5pbml0V2lkZ2V0cyA9ICh3aWRnZXRTZXR0aW5ncykgLT5cbiAgZm9yIGlkLCBzZXR0aW5ncyBvZiB3aWRnZXRTZXR0aW5nc1xuICAgIHdpZGdldHNbaWRdLmRlc3Ryb3koKSBpZiB3aWRnZXRzW2lkXT9cblxuICAgIGlmIHNldHRpbmdzID09ICdkZWxldGVkJ1xuICAgICAgZGVsZXRlIHdpZGdldHNbaWRdXG4gICAgZWxzZVxuICAgICAgd2lkZ2V0ID0gV2lkZ2V0IHNldHRpbmdzXG4gICAgICB3aWRnZXRzW3dpZGdldC5pZF0gPSB3aWRnZXRcbiAgICAgIGluaXRXaWRnZXQod2lkZ2V0KVxuXG5pbml0V2lkZ2V0ID0gKHdpZGdldCkgLT5cbiAgY29udGVudEVsLmFwcGVuZENoaWxkIHdpZGdldC5jcmVhdGUoKVxuICBwb3NpdGlvbmVyLnBvc2l0b25XaWRnZXQod2lkZ2V0KVxuICB3aWRnZXQuc3RhcnQoKVxuXG53aW5kb3cucmVzZXQgID0gZGVzdHJveVxud2luZG93Lm9ubG9hZCA9IGluaXRcbiIsbnVsbCwiLyogdG9Tb3VyY2UgYnkgTWFyY2VsbG8gQmFzdGVhLUZvcnRlIC0gemxpYiBsaWNlbnNlICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iamVjdCwgZmlsdGVyLCBpbmRlbnQsIHN0YXJ0aW5nSW5kZW50KSB7XG4gICAgdmFyIHNlZW4gPSBbXVxuICAgIHJldHVybiB3YWxrKG9iamVjdCwgZmlsdGVyLCBpbmRlbnQgPT09IHVuZGVmaW5lZCA/ICcgICcgOiAoaW5kZW50IHx8ICcnKSwgc3RhcnRpbmdJbmRlbnQgfHwgJycpXG5cbiAgICBmdW5jdGlvbiB3YWxrKG9iamVjdCwgZmlsdGVyLCBpbmRlbnQsIGN1cnJlbnRJbmRlbnQpIHtcbiAgICAgICAgdmFyIG5leHRJbmRlbnQgPSBjdXJyZW50SW5kZW50ICsgaW5kZW50XG4gICAgICAgIG9iamVjdCA9IGZpbHRlciA/IGZpbHRlcihvYmplY3QpIDogb2JqZWN0XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIG9iamVjdCkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkob2JqZWN0KVxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJycrb2JqZWN0XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob2JqZWN0ID09PSBudWxsKSByZXR1cm4gJ251bGwnXG4gICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiBvYmplY3QudG9TdHJpbmcoKVxuICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuICduZXcgRGF0ZSgnK29iamVjdC5nZXRUaW1lKCkrJyknXG5cbiAgICAgICAgaWYgKHNlZW4uaW5kZXhPZihvYmplY3QpID49IDApIHJldHVybiAneyRjaXJjdWxhclJlZmVyZW5jZToxfSdcbiAgICAgICAgc2Vlbi5wdXNoKG9iamVjdClcblxuICAgICAgICBmdW5jdGlvbiBqb2luKGVsZW1lbnRzKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5kZW50LnNsaWNlKDEpICsgZWxlbWVudHMuam9pbignLCcrKGluZGVudCYmJ1xcbicpK25leHRJbmRlbnQpICsgKGluZGVudCA/ICcgJyA6ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICAgICAgICAgIHJldHVybiAnWycgKyBqb2luKG9iamVjdC5tYXAoZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbGsoZWxlbWVudCwgZmlsdGVyLCBpbmRlbnQsIG5leHRJbmRlbnQpXG4gICAgICAgICAgICB9KSkgKyAnXSdcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgICAgICAgcmV0dXJuIGtleXMubGVuZ3RoID8gJ3snICsgam9pbihrZXlzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxlZ2FsS2V5KGtleSkgPyBrZXkgOiBKU09OLnN0cmluZ2lmeShrZXkpKSArICc6JyArIHdhbGsob2JqZWN0W2tleV0sIGZpbHRlciwgaW5kZW50LCBuZXh0SW5kZW50KVxuICAgICAgICB9KSkgKyAnfScgOiAne30nXG4gICAgfVxufVxuXG52YXIgS0VZV09SRF9SRUdFWFAgPSAvXihhYnN0cmFjdHxib29sZWFufGJyZWFrfGJ5dGV8Y2FzZXxjYXRjaHxjaGFyfGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlYnVnZ2VyfGRlZmF1bHR8ZGVsZXRlfGRvfGRvdWJsZXxlbHNlfGVudW18ZXhwb3J0fGV4dGVuZHN8ZmFsc2V8ZmluYWx8ZmluYWxseXxmbG9hdHxmb3J8ZnVuY3Rpb258Z290b3xpZnxpbXBsZW1lbnRzfGltcG9ydHxpbnxpbnN0YW5jZW9mfGludHxpbnRlcmZhY2V8bG9uZ3xuYXRpdmV8bmV3fG51bGx8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmV0dXJufHNob3J0fHN0YXRpY3xzdXBlcnxzd2l0Y2h8c3luY2hyb25pemVkfHRoaXN8dGhyb3d8dGhyb3dzfHRyYW5zaWVudHx0cnVlfHRyeXx0eXBlb2Z8dW5kZWZpbmVkfHZhcnx2b2lkfHZvbGF0aWxlfHdoaWxlfHdpdGgpJC9cblxuZnVuY3Rpb24gbGVnYWxLZXkoc3RyaW5nKSB7XG4gICAgcmV0dXJuIC9eW2Etel8kXVswLTlhLXpfJF0qJC9naS50ZXN0KHN0cmluZykgJiYgIUtFWVdPUkRfUkVHRVhQLnRlc3Qoc3RyaW5nKVxufSIsImRlc2NyaWJlICdjbGllbnQnLCAtPlxuICBzZXJ2ZXIgICAgPSBudWxsXG4gIGNvbnRlbnRFbCA9IG51bGxcbiAgY2xvY2sgICAgID0gbnVsbFxuXG4gIGJlZm9yZUVhY2ggLT5cbiAgICBjbG9jayAgPSBzaW5vbi51c2VGYWtlVGltZXJzKClcbiAgICBzZXJ2ZXIgPSBzaW5vbi5mYWtlU2VydmVyLmNyZWF0ZSgpXG5cbiAgYWZ0ZXJFYWNoIC0+XG4gICAgc2VydmVyLnJlc3RvcmUoKVxuICAgIGNsb2NrLnJlc3RvcmUoKVxuICAgIHdpbmRvdy5yZXNldCgpXG5cbiAgIyBUaGlzIGlzIGFuIGludGVncmF0aW9uIHRlc3QgZXNlbnRpYWxseS4gVE9ETzogc2VlIGlmIHRoaXMgY2FuIGJlIGJyb2tlbiB1cFxuICBpdCAnc2hvdWxkIG1hbmFnZSB3aWRnZXRzIG9uIHRoZSBmcm9udGVuZCcsIC0+XG4gICAgd2lkZ2V0cyA9IHtcbiAgICAgIGZvbzogeyBpZDogJ2ZvbycsIGNvbW1hbmQ6ICcnLCByZWZyZXNoRnJlcXVlbmN5OiAxMDAwLCBjc3M6ICcnIH0sXG4gICAgICBiYXI6IHsgaWQ6ICdiYXInLCBjb21tYW5kOiAnJywgcmVmcmVzaEZyZXF1ZW5jeTogMTAwMCwgY3NzOiAnJyB9XG4gICAgfVxuXG4gICAgcmVxdWlyZSAnLi4vLi4vY2xpZW50LmNvZmZlZSdcbiAgICB3aW5kb3cub25sb2FkKClcblxuICAgIGNvbnRlbnRFbCA9ICQoJy5jb250ZW50JylcbiAgICBleHBlY3QoY29udGVudEVsLmxlbmd0aCkudG9CZSAxXG5cbiAgICBleHBlY3Qoc2VydmVyLnJlcXVlc3RzWzBdLnVybCkudG9FcXVhbCAnL3dpZGdldHMnXG4gICAgc2VydmVyLnJlcXVlc3RzWzBdLnJlc3BvbmQoMjAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sIEpTT04uc3RyaW5naWZ5IHdpZGdldHMpXG5cbiAgICBleHBlY3QoY29udGVudEVsLmZpbmQoJyNmb28nKS5sZW5ndGgpLnRvQmUgMVxuICAgIGV4cGVjdChjb250ZW50RWwuZmluZCgnI2JhcicpLmxlbmd0aCkudG9CZSAxXG5cbiAgICAjIGNoZWNrIHRoYXQgd2lkZ2V0cyBhcmUgc3RhcnRlZFxuICAgIHJlcXVlc3RlZFVybHMgPSAocmVxLnVybCBmb3IgcmVxIGluIHNlcnZlci5yZXF1ZXN0cylcbiAgICBleHBlY3QocmVxdWVzdGVkVXJscy5pbmRleE9mKCcvd2lkZ2V0cy9mb28nKSkubm90LnRvQmUgLTFcbiAgICBleHBlY3QocmVxdWVzdGVkVXJscy5pbmRleE9mKCcvd2lkZ2V0cy9iYXInKSkubm90LnRvQmUgLTFcblxuICAgICMgY2hlY2sgdGhhdCBjaGFuZ2VzIGFyZSByZXF1ZXN0ZWQgYW5kIGFwcGxpZWRcbiAgICBjbG9jay50aWNrKClcbiAgICBsYXN0UmVxdWVzdCA9IHNlcnZlci5yZXF1ZXN0c1tzZXJ2ZXIucmVxdWVzdHMubGVuZ3RoLTFdXG4gICAgZXhwZWN0KGxhc3RSZXF1ZXN0LnVybCkudG9FcXVhbCAnL3dpZGdldC1jaGFuZ2VzJ1xuXG4gICAgbGFzdFJlcXVlc3QucmVzcG9uZCAyMDAsIHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSwgSlNPTi5zdHJpbmdpZnkgeyBmb286ICdkZWxldGVkJyB9XG4gICAgZXhwZWN0KGNvbnRlbnRFbC5maW5kKCcjZm9vJykubGVuZ3RoKS50b0JlIDBcblxuIiwiRHJhZ0hhbmRsZXIgPSByZXF1aXJlICcuLi8uLi9zcmMvZHJhZ19oYW5kbGVyLmNvZmZlZSdcblxuZGVzY3JpYmUgJ2RyYWcgaGFuZGxlcicsIC0+XG4gIGRvbUVsICA9IG51bGxcblxuICBnZXRQb3NpdGlvbiA9IC0+XG4gICAgZG9tRWwub2Zmc2V0KClcblxuICBiZWZvcmVFYWNoIC0+XG4gICAgZG9tRWwgID0gJChcIjxkaXY+XCIpXG5cbiAgICBkb21FbC5jc3NcbiAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgdG9wOiAwLCBsZWZ0OiAwXG5cbiAgICAkKGRvY3VtZW50LmJvZHkpLmh0bWwoZG9tRWwpXG4gICAgJChkb2N1bWVudC5ib2R5KS5jc3MgcGFkZGluZzogMCwgbWFyZ2luOiAwXG5cbiAgYWZ0ZXJFYWNoIC0+XG4gICAgZG9tRWwucmVtb3ZlKClcbiAgICAkKGRvY3VtZW50LmJvZHkpLmNzcyBwYWRkaW5nOiAnJywgbWFyZ2luOiAnJ1xuXG4gIGl0ICdzaG91bGQgY2FsbCB0aGUgY2hhbmdlIGhhbmRsZXIgd2l0aCBmcmFtZSB1cGRhdGVzJywgLT5cbiAgICBjdXJyZW50RnJhbWUgID0gbnVsbFxuICAgIGNoYW5nZUhhbmRsZXIgPSAoZnJhbWUpIC0+IGN1cnJlbnRGcmFtZSA9IGZyYW1lXG5cbiAgICBEcmFnSGFuZGxlcih7IHBhZ2VYOiAxMCwgcGFnZVk6IDIwIH0sIGRvbUVsWzBdKVxuICAgICAgLnVwZGF0ZSBjaGFuZ2VIYW5kbGVyXG5cbiAgICBwb3NpdGlvbiA9IGdldFBvc2l0aW9uKClcbiAgICBleHBlY3QocG9zaXRpb24ubGVmdCkudG9CZSAwXG4gICAgZXhwZWN0KHBvc2l0aW9uLnRvcCkudG9CZSAwXG5cbiAgICAkKGRvY3VtZW50KS5zaW11bGF0ZSAnbW91c2Vtb3ZlJywgY2xpZW50WDogMjAsIGNsaWVudFk6IDI1XG4gICAgZXhwZWN0KGN1cnJlbnRGcmFtZS5sZWZ0KS50b0JlIDEwXG4gICAgZXhwZWN0KGN1cnJlbnRGcmFtZS50b3ApLnRvQmUgNVxuXG4gICAgJChkb2N1bWVudCkuc2ltdWxhdGUgJ21vdXNlbW92ZScsIGNsaWVudFg6IDIwLCBjbGllbnRZOiAyMFxuICAgIGV4cGVjdChjdXJyZW50RnJhbWUubGVmdCkudG9CZSAxMFxuICAgIGV4cGVjdChjdXJyZW50RnJhbWUudG9wKS50b0JlIDBcblxuICAgICQoZG9jdW1lbnQpLnNpbXVsYXRlICdtb3VzZXVwJywgY2xpZW50WDogNTAsIGNsaWVudFk6IDMwXG4gICAgZXhwZWN0KGN1cnJlbnRGcmFtZS5sZWZ0KS50b0JlIDQwXG4gICAgZXhwZWN0KGN1cnJlbnRGcmFtZS50b3ApLnRvQmUgMTBcblxuIiwiRW5naW5lID0gcmVxdWlyZSAnLi4vLi4vc3JjL3dpZGdldF9wb3NpdGlvbmluZ19lbmdpbmUuY29mZmVlJ1xuXG5kZXNjcmliZSAnd2lkZ2V0IHBvc2l0aW9uaW5nIGVuZ2luZScsIC0+XG5cbiAgZGVzY3JpYmUgJ2RyYWdnaW5nIGEgd2lkZ2V0JywgLT5cbiAgICBlbmdpbmUgICA9IG51bGxcbiAgICBkb21FbCAgICA9IG51bGxcbiAgICB3aWRnZXQgICA9IG51bGxcbiAgICB3aWRnZXRzICA9XG4gICAgICBnZXQ6IC0+IHdpZGdldFxuXG4gICAgYmVmb3JlRWFjaCAtPlxuICAgICAgZW5naW5lID0gRW5naW5lIHdpZGdldHNcbiAgICAgIGRvbUVsICA9ICQoXCI8ZGl2IGNsYXNzPSd3aWRnZXQnIGlkPSdmb28nPjwvZGl2PlwiKVxuICAgICAgd2lkZ2V0ID1cbiAgICAgICAgaWQ6ICdmb28nXG4gICAgICAgIHNldEZyYW1lOiAoZnJhbWUpIC0+IGRvbUVsLmNzcyhmcmFtZSlcbiAgICAgICAgY29udGVudEVsOiAtPiBkb21FbFswXVxuXG4gICAgICBkb21FbC5jc3NcbiAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgICAgIHRvcDogMCwgbGVmdDogMCxcbiAgICAgICAgd2lkdGg6ICcxMDBweCcsIGhlaWdodDogJzEwMHB4J1xuXG4gICAgICAkKGRvY3VtZW50LmJvZHkpLmNzcyBwYWRkaW5nOiAwLCBtYXJnaW46IDBcbiAgICAgICQoZG9jdW1lbnQuYm9keSkuaHRtbChkb21FbClcblxuICAgIGFmdGVyRWFjaCAtPlxuICAgICAgZW5naW5lLmRlc3Ryb3koKVxuICAgICAgZG9tRWwucmVtb3ZlKClcbiAgICAgICQoZG9jdW1lbnQuYm9keSkuY3NzIHBhZGRpbmc6ICcnLCBtYXJnaW46ICcnXG5cbiAgICBnZXRGcmFtZSA9IC0+XG4gICAgICBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb28nKSA/ICd7fScpLmZyYW1lID8ge31cblxuICAgIGl0ICdzaG91bGQgc3RvcmUgdGhlIHdpZGdldCBwb3NpdGlvbiBpbiBsb2NhbCBzdG9yYWdlJywgLT5cbiAgICAgICQoZG9tRWwpLnNpbXVsYXRlKCdkcmFnJywgZHg6IDEwLCBkeTogNSlcbiAgICAgIGN1cnJlbnRGcmFtZSA9IGdldEZyYW1lKClcbiAgICAgIGV4cGVjdChjdXJyZW50RnJhbWUubGVmdCkudG9CZSAxMFxuICAgICAgZXhwZWN0KGN1cnJlbnRGcmFtZS50b3ApLnRvQmUgNVxuIiwiV2lkZ2V0ID0gcmVxdWlyZSAnLi4vLi4vc3JjL3dpZGdldC5jb2ZmZWUnXG5cbmRlc2NyaWJlICd3aWRnZXQnLCAtPlxuXG4gIGl0ICdzaG91bGQgY3JlYXRlIGEgZG9tIGVsZW1lbnQgd2l0aCB0aGUgd2lkZ2V0IGlkJywgLT5cbiAgICB3aWRnZXQgPSBXaWRnZXQgY29tbWFuZDogJycsIGlkOiAnZm9vJywgY3NzOiAnJ1xuXG4gICAgZWwgPSB3aWRnZXQuY3JlYXRlKClcbiAgICBleHBlY3QoJChlbCkubGVuZ3RoKS50b0JlIDFcbiAgICBleHBlY3QoJChlbCkuZmluZChcIiNmb29cIikubGVuZ3RoKS50b0JlIDFcbiAgICB3aWRnZXQuc3RvcCgpXG5cbiAgaXQgJ3Nob3VsZCBjcmVhdGUgYSBzdHlsZSBlbGVtZW50IHdpdGggdGhlIHdpZGdldCBzdHlsZScsIC0+XG4gICAgd2lkZ2V0ID0gV2lkZ2V0IGNvbW1hbmQ6ICcnLCBjc3M6IFwiYmFja2dyb3VuZDogcmVkXCJcbiAgICBlbCA9IHdpZGdldC5jcmVhdGUoKVxuICAgIGV4cGVjdCgkKGVsKS5maW5kKFwic3R5bGVcIikuaHRtbCgpLmluZGV4T2YoJ2JhY2tncm91bmQ6IHJlZCcpKS5ub3QudG9CZSAtMVxuICAgIHdpZGdldC5zdG9wKClcblxuZGVzY3JpYmUgJ3dpZGdldCcsIC0+XG4gIHNlcnZlciA9IG51bGxcbiAgd2lkZ2V0ID0gbnVsbFxuICBkb21FbCAgPSBudWxsXG5cbiAgYmVmb3JlRWFjaCAtPlxuICAgIHNlcnZlciA9IHNpbm9uLmZha2VTZXJ2ZXIuY3JlYXRlKClcblxuICBhZnRlckVhY2ggLT5cbiAgICBzZXJ2ZXIucmVzdG9yZSgpXG4gICAgd2lkZ2V0LnN0b3AoKVxuXG4gIGRlc2NyaWJlICd3aXRob3V0IGEgcmVuZGVyIG1ldGhvZCcsIC0+XG5cbiAgICBiZWZvcmVFYWNoIC0+XG4gICAgICB3aWRnZXQgPSBXaWRnZXQgY29tbWFuZDogJycsIGlkOiAnZm9vJ1xuICAgICAgZG9tRWwgID0gd2lkZ2V0LmNyZWF0ZSgpXG5cbiAgICBpdCAnc2hvdWxkIGp1c3QgcmVuZGVyIHNlcnZlciByZXNwb25zZScsIC0+XG4gICAgICBzZXJ2ZXIucmVzcG9uZFdpdGggXCJHRVRcIiwgXCIvd2lkZ2V0cy9mb29cIiwgWzIwMCwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9LCAnYmFyJ11cblxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIHNlcnZlci5yZXNwb25kKClcblxuICAgICAgZXhwZWN0KCQoZG9tRWwpLmZpbmQoJy53aWRnZXQnKS50ZXh0KCkpLnRvRXF1YWwgJ2JhcidcblxuICBkZXNjcmliZSAnd2l0aCBhIHJlbmRlciBtZXRob2QnLCAtPlxuXG4gICAgYmVmb3JlRWFjaCAtPlxuICAgICAgd2lkZ2V0ID0gV2lkZ2V0IGNvbW1hbmQ6ICcnLCBpZDogJ2ZvbycsIHJlbmRlcjogKG91dCkgLT4gXCJyZW5kZXJlZDogI3tvdXR9XCJcbiAgICAgIGRvbUVsICA9IHdpZGdldC5jcmVhdGUoKVxuXG4gICAgaXQgJ3Nob3VsZCByZW5kZXIgd2hhdCByZW5kZXIgcmV0dXJucycsIC0+XG4gICAgICBzZXJ2ZXIucmVzcG9uZFdpdGggXCJHRVRcIiwgXCIvd2lkZ2V0cy9mb29cIiwgWzIwMCwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9LCAnYmF6J11cblxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIHNlcnZlci5yZXNwb25kKClcblxuICAgICAgZXhwZWN0KCQoZG9tRWwpLmZpbmQoJy53aWRnZXQnKS50ZXh0KCkpLnRvRXF1YWwgJ3JlbmRlcmVkOiBiYXonXG5cbiAgZGVzY3JpYmUgJ3dpdGggYW4gdXBkYXRlIG1ldGhvZCcsIC0+XG4gICAgdXBkYXRlID0gbnVsbFxuXG4gICAgYmVmb3JlRWFjaCAtPlxuICAgICAgdXBkYXRlID0gamFzbWluZS5jcmVhdGVTcHkoJ3VwZGF0ZScpXG4gICAgICB3aWRnZXQgPSBXaWRnZXQgY29tbWFuZDogJycsIGlkOiAnZm9vJywgdXBkYXRlOiB1cGRhdGVcbiAgICAgIGRvbUVsICA9IHdpZGdldC5jcmVhdGUoKVxuXG4gICAgaXQgJ3Nob3VsZCByZW5kZXIgb3V0cHV0IGFuZCB0aGVuIGNhbGwgdXBkYXRlJywgLT5cbiAgICAgIHNlcnZlci5yZXNwb25kV2l0aCBcIkdFVFwiLCBcIi93aWRnZXRzL2Zvb1wiLCBbMjAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9wbGFpblwiIH0sICdzdHVmZiddXG5cbiAgICAgIHdpZGdldC5zdGFydCgpXG4gICAgICBzZXJ2ZXIucmVzcG9uZCgpXG5cbiAgICAgIGV4cGVjdCgkKGRvbUVsKS5maW5kKCcud2lkZ2V0JykudGV4dCgpKS50b0VxdWFsICdzdHVmZidcbiAgICAgIGV4cGVjdCh1cGRhdGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoICdzdHVmZicsICQoZG9tRWwpLmZpbmQoJy53aWRnZXQnKVswXVxuXG4gIGRlc2NyaWJlICd3aGVuIHN0YXJ0ZWQnLCAtPlxuICAgIHJlbmRlciA9IG51bGxcblxuICAgIGJlZm9yZUVhY2ggLT5cbiAgICAgIHJlbmRlciA9IGphc21pbmUuY3JlYXRlU3B5KCdyZW5kZXInKVxuICAgICAgd2lkZ2V0ID0gV2lkZ2V0IGNvbW1hbmQ6ICcnLCBpZDogJ2ZvbycsIHJlbmRlcjogcmVuZGVyLCByZWZyZXNoRnJlcXVlbmN5OiAxMDBcbiAgICAgIGRvbUVsICA9IHdpZGdldC5jcmVhdGUoKVxuXG4gICAgaXQgJ3Nob3VsZCBrZWVwIHVwZGF0aW5nIHVudGlsIHN0b3AoKSBpcyBjYWxsZWQnLCAtPlxuICAgICAgamFzbWluZS5DbG9jay51c2VNb2NrKClcbiAgICAgIHNlcnZlci5yZXNwb25kV2l0aCBcIkdFVFwiLCBcIi93aWRnZXRzL2Zvb1wiLCBbMjAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9wbGFpblwiIH0sICdzdHVmZiddXG4gICAgICBzZXJ2ZXIuYXV0b1Jlc3BvbmQgPSB0cnVlXG4gICAgICBkb25lID0gZmFsc2VcblxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIGphc21pbmUuQ2xvY2sudGljayAyNTBcbiAgICAgIGV4cGVjdChyZW5kZXIuY2FsbHMubGVuZ3RoKS50b0JlIDNcbiAgICAgIHdpZGdldC5zdG9wKClcbiAgICAgIGphc21pbmUuQ2xvY2sudGljayAxMDAwXG4gICAgICBleHBlY3QocmVuZGVyLmNhbGxzLmxlbmd0aCkudG9CZSAzXG5cbiAgZGVzY3JpYmUgJ2Vycm9yIGhhbmRsaW5nJywgLT5cblxuICAgIGl0ICdzaG91bGQgY2F0Y2ggYW5kIHNob3cgZXhjZXB0aW9ucyBpbnNpZGUgcmVuZGVyJywgLT5cbiAgICAgIHdpZGdldCA9IFdpZGdldCBjb21tYW5kOiAnJywgaWQ6ICdmb28nLCByZW5kZXI6IC0+IHRocm93IG5ldyBFcnJvcignc29tZXRoaW5nIHdlbnQgc29ycnknKVxuICAgICAgZG9tRWwgID0gd2lkZ2V0LmNyZWF0ZSgpXG4gICAgICBzZXJ2ZXIucmVzcG9uZFdpdGggXCJHRVRcIiwgXCIvd2lkZ2V0cy9mb29cIiwgWzIwMCwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9LCAnYmF6J11cblxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIHNlcnZlci5yZXNwb25kKClcblxuICAgICAgZXhwZWN0KCQoZG9tRWwpLmZpbmQoJy53aWRnZXQnKS50ZXh0KCkpLnRvRXF1YWwgJ3NvbWV0aGluZyB3ZW50IHNvcnJ5J1xuXG4gICAgaXQgJ3Nob3VsZCBjYXRjaCBhbmQgc2hvdyBleGNlcHRpb25zIGluc2lkZSB1cGRhdGUnLCAtPlxuICAgICAgd2lkZ2V0ID0gV2lkZ2V0IGNvbW1hbmQ6ICcnLCBpZDogJ2ZvbycsIHVwZGF0ZTogLT4gdGhyb3cgbmV3IEVycm9yKCd1cCcpXG4gICAgICBkb21FbCAgPSB3aWRnZXQuY3JlYXRlKClcbiAgICAgIHNlcnZlci5yZXNwb25kV2l0aCBcIkdFVFwiLCBcIi93aWRnZXRzL2Zvb1wiLCBbMjAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9wbGFpblwiIH0sICdiYXonXVxuXG4gICAgICB3aWRnZXQuc3RhcnQoKVxuICAgICAgc2VydmVyLnJlc3BvbmQoKVxuXG4gICAgICBleHBlY3QoJChkb21FbCkuZmluZCgnLndpZGdldCcpLnRleHQoKSkudG9FcXVhbCAndXAnXG5cbiAgICBpdCAnc2hvdWxkIG5vdCBjYWxsIHVwZGF0ZSB3aGVuIHJlbmRlciBmYWlscycsIC0+XG4gICAgICB1cGRhdGUgPSBqYXNtaW5lLmNyZWF0ZVNweSgndXBkYXRlJylcbiAgICAgIHdpZGdldCA9IFdpZGdldFxuICAgICAgICBjb21tYW5kOiAnJ1xuICAgICAgICBpZCAgICAgOiAnZm9vJ1xuICAgICAgICByZW5kZXIgOiAtPiB0aHJvdyBuZXcgRXJyb3IoJ29vcHMnKVxuICAgICAgICB1cGRhdGUgOiB1cGRhdGVcblxuICAgICAgZG9tRWwgID0gd2lkZ2V0LmNyZWF0ZSgpXG4gICAgICBzZXJ2ZXIucmVzcG9uZFdpdGggXCJHRVRcIiwgXCIvd2lkZ2V0cy9mb29cIiwgWzIwMCwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9LCAnYmF6J11cblxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIHNlcnZlci5yZXNwb25kKClcblxuICAgICAgZXhwZWN0KCQoZG9tRWwpLmZpbmQoJy53aWRnZXQnKS50ZXh0KCkpLnRvRXF1YWwgJ29vcHMnXG4gICAgICBleHBlY3QodXBkYXRlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpXG5cbiAgICBpdCAnc2hvdWxkIHJlbmRlciBiYWNrZW5kIGVycm9ycycsIC0+XG4gICAgICB3aWRnZXQgPSBXaWRnZXQgY29tbWFuZDogJycsIGlkOiAnZm9vJywgcmVuZGVyOiAtPlxuICAgICAgZG9tRWwgID0gd2lkZ2V0LmNyZWF0ZSgpXG5cbiAgICAgIHNlcnZlci5yZXNwb25kV2l0aCBcIkdFVFwiLCBcIi93aWRnZXRzL2Zvb1wiLCBbNTAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9wbGFpblwiIH0sICdwdWtlJ11cblxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIHNlcnZlci5yZXNwb25kKClcblxuICAgICAgZXhwZWN0KCQoZG9tRWwpLmZpbmQoJy53aWRnZXQnKS50ZXh0KCkpLnRvRXF1YWwgJ3B1a2UnXG5cbiAgICBpdCAnc2hvdWxkIGJlIGFibGUgdG8gcmVjb3ZlciBhZnRlciBhbiBlcnJvcicsIC0+XG4gICAgICBqYXNtaW5lLkNsb2NrLnVzZU1vY2soKVxuICAgICAgd2lkZ2V0ID0gV2lkZ2V0IGNvbW1hbmQ6ICcnLCBpZDogJ2ZvbycsIHJlZnJlc2hGcmVxdWVuY3k6IDEwMCwgdXBkYXRlOiAobywgZG9tRWwpIC0+XG4gICAgICAgICMgaW1wb3J0YW50IGZvciB0aGlzIHRlc3QgY2FzZTogZG8gc29tZXRoaW5nIHdpdGggdGhlIGV4aXN0aW5nIGlubmVySFRNTFxuICAgICAgICBkb21FbC5pbm5lckhUTUwgPSBkb21FbC5pbm5lckhUTUwgKyAnISdcbiAgICAgIGRvbUVsICA9IHdpZGdldC5jcmVhdGUoKVxuXG4gICAgICBzZXJ2ZXIucmVzcG9uZFdpdGggXCJHRVRcIiwgXCIvd2lkZ2V0cy9mb29cIiwgWzIwMCwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9LCAnYWxsIGdvb2QnXVxuICAgICAgd2lkZ2V0LnN0YXJ0KClcbiAgICAgIHNlcnZlci5yZXNwb25kKClcbiAgICAgIGV4cGVjdCgkKGRvbUVsKS5maW5kKCcud2lkZ2V0JykudGV4dCgpKS50b0VxdWFsICdhbGwgZ29vZCEnXG5cbiAgICAgIHNlcnZlci5yZXNwb25kV2l0aCBcIkdFVFwiLCBcIi93aWRnZXRzL2Zvb1wiLCBbNTAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9wbGFpblwiIH0sICdvaCBub2VzJ11cbiAgICAgIGphc21pbmUuQ2xvY2sudGljaygxMDApXG4gICAgICBzZXJ2ZXIucmVzcG9uZCgpXG4gICAgICBleHBlY3QoJChkb21FbCkuZmluZCgnLndpZGdldCcpLnRleHQoKSkudG9FcXVhbCAnb2ggbm9lcydcblxuICAgICAgc2VydmVyLnJlc3BvbmRXaXRoIFwiR0VUXCIsIFwiL3dpZGdldHMvZm9vXCIsIFsyMDAsIHsgXCJDb250ZW50LVR5cGVcIjogXCJ0ZXh0L3BsYWluXCIgfSwgJ2FsbCBnb29kIGFnYWluJ11cbiAgICAgIGphc21pbmUuQ2xvY2sudGljaygxMDApXG4gICAgICBzZXJ2ZXIucmVzcG9uZCgpXG4gICAgICBleHBlY3QoJChkb21FbCkuZmluZCgnLndpZGdldCcpLnRleHQoKSkudG9FcXVhbCAnYWxsIGdvb2QgYWdhaW4hJ1xuXG5cbiIsIm1vZHVsZS5leHBvcnRzID0gKGV2ZW50LCBkb21FbCkgLT5cbiAgYXBpID0ge31cblxuICB1cGRhdGVIYW5kbGVyID0gLT5cbiAgZW5kSGFuZGxlciAgICA9IC0+XG5cbiAgcHJldlBvc2l0aW9uID1cbiAgICB4OiBldmVudC5wYWdlWFxuICAgIHk6IGV2ZW50LnBhZ2VZXG5cbiAgY3VycmVudEZyYW1lICAgID0ge30gICAgICAgICAgICAgICAgICAjIGlzIHJlYWQgb25seVxuICBjdXJyZW50RnJhbWVba10gPSB2IGZvciBrLCB2IG9mIGRvbUVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG5cbiAgdXBkYXRlID0gKGUpIC0+XG4gICAgW2R4LCBkeV0gID0gW2UucGFnZVggLSBwcmV2UG9zaXRpb24ueCwgZS5wYWdlWSAtIHByZXZQb3NpdGlvbi55XVxuICAgIHByZXZQb3NpdGlvbiA9IHg6IGUucGFnZVgsIHk6IGUucGFnZVlcblxuICAgIGN1cnJlbnRGcmFtZS5sZWZ0ICs9IGR4XG4gICAgY3VycmVudEZyYW1lLnRvcCAgKz0gZHlcblxuICAgIHVwZGF0ZUhhbmRsZXIgY3VycmVudEZyYW1lXG5cbiAgZW5kID0gKGUpIC0+XG4gICAgdXBkYXRlKGUpXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgdXBkYXRlXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcgLCBlbmRcbiAgICBlbmRIYW5kbGVyKClcblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICdtb3VzZW1vdmUnLCB1cGRhdGVcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIGVuZFxuXG4gIGFwaS51cGRhdGUgPSAoaGFuZGxlcikgLT5cbiAgICB1cGRhdGVIYW5kbGVyID0gaGFuZGxlclxuXG4gIGFwaS5lbmQgPSAoaGFuZGxlcikgLT5cbiAgICBlbmRIYW5kbGVyID0gaGFuZGxlclxuXG4gIGFwaVxuIiwiZXhwb3J0cy5vdXRzZXQgPSAocmVjdCwgZGVsdGEpIC0+XG4gIHRvcCA6IHJlY3QudG9wICAtIGRlbHRhXG4gIGxlZnQ6IHJlY3QubGVmdCAtIGRlbHRhXG4gIHdpZHRoIDogcmVjdC53aWR0aCAgKyAyKmRlbHRhXG4gIGhlaWdodDogcmVjdC5oZWlnaHQgKyAyKmRlbHRhXG5cbmV4cG9ydHMucG9pbnRJblJlY3QgPSAocG9pbnQsIHJlY3QpIC0+XG4gIHBvaW50LmxlZnQgPj0gcmVjdC5sZWZ0IGFuZFxuICBwb2ludC50b3AgID49IHJlY3QudG9wICBhbmRcbiAgcG9pbnQubGVmdCA8PSByZWN0LmxlZnQgKyByZWN0LndpZHRoIGFuZFxuICBwb2ludC50b3AgIDw9IHJlY3QudG9wICArIHJlY3QuaGVpZ2h0XG4iLCJleGVjICAgICA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXG50b1NvdXJjZSA9IHJlcXVpcmUoJ3Rvc291cmNlJylcbnN0eWx1cyAgID0gcmVxdWlyZSgnc3R5bHVzJylcbm5pYiAgICAgID0gcmVxdWlyZSgnbmliJylcblxuIyBUaGlzIGlzIGEgd3JhcHBlciAoc29tZXRoaW5nIGxpa2UgYSBiYXNlIGNsYXNzKSwgYXJvdW5kIHRoZVxuIyBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbiBvZiBhIHdpZGdldC5cbiMgQSB3aWRnZXRzIG1vc3RseSBsaXZlcyBjbGllbnQgc2lkZSwgaW4gdGhlIERPTS4gSG93ZXZlciwgdGhlXG4jIGJhY2tlbmQgYWxzbyBpbml0aWFsaXplcyB3aWRnZXRzIGFuZCBydW5zIHdpZGdldHMgY29tbWFuZHMuXG5tb2R1bGUuZXhwb3J0cyA9IChpbXBsZW1lbnRhdGlvbikgLT5cbiAgYXBpICAgPSB7fVxuICBlbCAgICAgICAgPSBudWxsXG4gIGNvbnRlbnRFbCA9IG51bGxcbiAgdGltZXIgICAgID0gbnVsbFxuICB1cGRhdGUgICAgPSBudWxsXG4gIHJlbmRlciAgICA9IG51bGxcbiAgc3RhcnRlZCAgID0gZmFsc2VcbiAgcmVuZGVyZWQgID0gZmFsc2VcblxuICBkZWZhdWx0U3R5bGUgPSAndG9wOiAzMHB4OyBsZWZ0OiAxMHB4J1xuXG4gIGluaXQgPSAtPlxuICAgIGlmIChpc3N1ZXMgPSB2YWxpZGF0ZShpbXBsZW1lbnRhdGlvbikpLmxlbmd0aCAhPSAwXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoaXNzdWVzLmpvaW4oJywgJykpXG5cbiAgICBhcGkuaWQgPSBpbXBsZW1lbnRhdGlvbi5pZCA/ICd3aWRnZXQnXG4gICAgYXBpLnJlZnJlc2hGcmVxdWVuY3kgPSBpbXBsZW1lbnRhdGlvbi5yZWZyZXNoRnJlcXVlbmN5ID8gMTAwMFxuXG4gICAgdW5sZXNzIGltcGxlbWVudGF0aW9uLmNzcz8gb3Igd2luZG93PyAjIHdlIGFyZSBjbGllbnQgc2lkZVxuICAgICAgaW1wbGVtZW50YXRpb24uY3NzID0gcGFyc2VTdHlsZShpbXBsZW1lbnRhdGlvbi5zdHlsZSA/IGRlZmF1bHRTdHlsZSlcbiAgICAgIGRlbGV0ZSBpbXBsZW1lbnRhdGlvbi5zdHlsZVxuXG4gICAgcmVuZGVyID0gaW1wbGVtZW50YXRpb24ucmVuZGVyID8gKG91dHB1dCkgLT4gb3V0cHV0XG4gICAgdXBkYXRlID0gaW1wbGVtZW50YXRpb24udXBkYXRlXG5cbiAgICBhcGlcblxuICAjIGF0dGFjaGVzIGEgd2lkZ2V0IHRvIHRoZSBET01cbiAgYXBpLmNyZWF0ZSAgPSAtPlxuICAgIGVsICAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgY29udGVudEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnZGl2J1xuICAgIGNvbnRlbnRFbC5pZCAgICAgICAgPSBhcGkuaWRcbiAgICBjb250ZW50RWwuY2xhc3NOYW1lID0gJ3dpZGdldCdcbiAgICBlbC5pbm5lckhUTUwgPSBcIjxzdHlsZT4je2ltcGxlbWVudGF0aW9uLmNzc308L3N0eWxlPlxcblwiXG4gICAgZWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKVxuICAgIGVsXG5cbiAgYXBpLmRlc3Ryb3kgPSAtPlxuICAgIGFwaS5zdG9wKClcbiAgICByZXR1cm4gdW5sZXNzIGVsP1xuICAgIGVsLnBhcmVudE5vZGU/LnJlbW92ZUNoaWxkKGVsKVxuICAgIGVsID0gbnVsbFxuICAgIGNvbnRlbnRFbCA9IG51bGxcblxuICAjIHN0YXJ0cyB0aGUgd2lkZ2V0IHJlZnJlc2ggY3ljbGVcbiAgYXBpLnN0YXJ0ID0gLT5cbiAgICBzdGFydGVkID0gdHJ1ZVxuICAgIGNsZWFyVGltZW91dCB0aW1lciBpZiB0aW1lcj9cbiAgICByZWZyZXNoKClcblxuICBhcGkuc3RvcCA9IC0+XG4gICAgc3RhcnRlZCAgPSBmYWxzZVxuICAgIHJlbmRlcmVkID0gZmFsc2VcbiAgICBjbGVhclRpbWVvdXQgdGltZXIgaWYgdGltZXI/XG5cbiAgIyBydW5zIHRoZSB3aWRnZXQgY29tbWFuZC4gVGhpcyBoYXBwZW5zIHNlcnZlciBzaWRlXG4gIGFwaS5leGVjID0gKG9wdGlvbnMsIGNhbGxiYWNrKSAtPlxuICAgIGV4ZWMgaW1wbGVtZW50YXRpb24uY29tbWFuZCwgb3B0aW9ucywgY2FsbGJhY2tcblxuICAjIHVzZWQgYnkgdGhlIGJhY2tlbmQgdG8gc2VuZCBhIHNlcmlhbGl6ZWQgdmVyc2lvbiBvZiB0aGVcbiAgIyB3aWRnZXQgdG8gdGhlIGNsaWVudC4gSlNPTiB3b250J3Qgd29yayBoZXJlLCBiZWNhdXNlIHdlXG4gICMgbmVlZCBmdW5jdGlvbnMgYXMgd2VsbFxuICBhcGkuc2VyaWFsaXplID0gLT5cbiAgICB0b1NvdXJjZSBpbXBsZW1lbnRhdGlvblxuXG4gIGFwaS5zZXRGcmFtZSA9IChmcmFtZSkgLT5cbiAgICBjb250ZW50RWwuc3R5bGUudG9wICAgID0gZnJhbWUudG9wKydweCcgICAgaWYgZnJhbWUudG9wP1xuICAgIGNvbnRlbnRFbC5zdHlsZS5yaWdodCAgPSBmcmFtZS5yaWdodCsncHgnICBpZiBmcmFtZS5yaWdodD9cbiAgICBjb250ZW50RWwuc3R5bGUuYm90dG9tID0gZnJhbWUuYm90dG9tKydweCcgaWYgZnJhbWUuYm90dG9tP1xuICAgIGNvbnRlbnRFbC5zdHlsZS5sZWZ0ICAgPSBmcmFtZS5sZWZ0KydweCcgICBpZiBmcmFtZS5sZWZ0P1xuICAgIGNvbnRlbnRFbC5zdHlsZS53aWR0aCAgPSBmcmFtZS53aWR0aCsncHgnICBpZiBmcmFtZS53aWR0aD9cbiAgICBjb250ZW50RWwuc3R5bGUuaGVpZ2h0ID0gZnJhbWUuaGVpZ2h0KydweCcgaWYgZnJhbWUuaGVpZ2h0P1xuICAgIGNvbnRlbnRFbC5zdHlsZS5tYXJnaW4gPSAwXG5cbiAgYXBpLmNvbnRlbnRFbCA9IC0+XG4gICAgY29udGVudEVsXG5cbiAgcmVkcmF3ID0gKG91dHB1dCwgZXJyb3IpIC0+XG4gICAgaWYgZXJyb3JcbiAgICAgIGNvbnRlbnRFbC5pbm5lckhUTUwgPSBlcnJvclxuICAgICAgcmV0dXJuIHJlbmRlcmVkID0gZmFsc2VcblxuICAgIHRyeVxuICAgICAgcmVuZGVyT3V0cHV0IG91dHB1dFxuICAgIGNhdGNoIGVcbiAgICAgIGNvbnRlbnRFbC5pbm5lckhUTUwgPSBlLm1lc3NhZ2VcblxuICByZW5kZXJPdXRwdXQgPSAob3V0cHV0KSAtPlxuICAgIGlmIHVwZGF0ZT8gYW5kIHJlbmRlcmVkXG4gICAgICB1cGRhdGUuY2FsbChpbXBsZW1lbnRhdGlvbiwgb3V0cHV0LCBjb250ZW50RWwpXG4gICAgZWxzZVxuICAgICAgY29udGVudEVsLmlubmVySFRNTCA9IHJlbmRlci5jYWxsKGltcGxlbWVudGF0aW9uLCBvdXRwdXQpXG4gICAgICByZW5kZXJlZCA9IHRydWVcbiAgICAgIHVwZGF0ZS5jYWxsKGltcGxlbWVudGF0aW9uLCBvdXRwdXQsIGNvbnRlbnRFbCkgaWYgdXBkYXRlP1xuXG4gIHJlZnJlc2ggPSAtPlxuICAgICQuZ2V0KCcvd2lkZ2V0cy8nK2FwaS5pZClcbiAgICAgIC5kb25lKChyZXNwb25zZSkgLT4gcmVkcmF3KHJlc3BvbnNlKSBpZiBzdGFydGVkIClcbiAgICAgIC5mYWlsKChyZXNwb25zZSkgLT4gcmVkcmF3KG51bGwsIHJlc3BvbnNlLnJlc3BvbnNlVGV4dCkgaWYgc3RhcnRlZClcbiAgICAgIC5hbHdheXMgLT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBzdGFydGVkXG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dCByZWZyZXNoLCBhcGkucmVmcmVzaEZyZXF1ZW5jeVxuXG4gIHBhcnNlU3R5bGUgPSAoc3R5bGUpIC0+XG4gICAgcmV0dXJuIFwiXCIgdW5sZXNzIHN0eWxlXG5cbiAgICBzY29wZWRTdHlsZSA9IFwiIyN7YXBpLmlkfVxcbiAgXCIgKyBzdHlsZS5yZXBsYWNlKC9cXG4vZywgXCJcXG4gIFwiKVxuICAgIHRyeVxuICAgICAgc3R5bHVzKHNjb3BlZFN0eWxlKVxuICAgICAgICAuaW1wb3J0KCduaWInKVxuICAgICAgICAudXNlKG5pYigpKVxuICAgICAgICAucmVuZGVyKClcbiAgICBjYXRjaCBlXG4gICAgICBjb25zb2xlLmxvZyAnZXJyb3IgcGFyc2luZyB3aWRnZXQgc3R5bGU6XFxuJ1xuICAgICAgY29uc29sZS5sb2cgZS5tZXNzYWdlXG4gICAgICBjb25zb2xlLmxvZyBzY29wZWRTdHlsZVxuICAgICAgXCJcIlxuXG4gIHZhbGlkYXRlID0gKGltcGwpIC0+XG4gICAgaXNzdWVzID0gW11cbiAgICByZXR1cm4gWydlbXB0eSBpbXBsZW1lbnRhdGlvbiddIHVubGVzcyBpbXBsP1xuICAgIGlzc3Vlcy5wdXNoICdubyBjb21tYW5kIGdpdmVuJyB1bmxlc3MgaW1wbC5jb21tYW5kP1xuICAgIGlzc3Vlc1xuXG4gIGluaXQoKVxuIiwiRHJhZ0hhbmRsZXIgPSByZXF1aXJlICcuL2RyYWdfaGFuZGxlci5jb2ZmZWUnXG5SZWN0ICAgICAgICA9IHJlcXVpcmUgJy4vcmVjdGFuZ2xlX21hdGguY29mZmVlJ1xuXG5yZXF1ZXN0QW5pbUZyYW1lID0gd2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lID8gc2V0VGltZW91dFxuY2FuY2VsQW5pbUZyYW1lICA9IHdlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lICA/IGNsZWFyVGltZW91dFxuXG5ndWlkZXNXaWR0aCA9IDFcblxubW9kdWxlLmV4cG9ydHMgPSAod2lkZ2V0cykgLT5cbiAgYXBpID0ge31cbiAgY2FudmFzICA9IG51bGxcbiAgY29udGV4dCA9IG51bGxcblxuICBjdXJyZW50V2lkZ2V0ID0gbnVsbFxuICBjaHJvbWVFbCA9IG51bGxcblxuICBpbml0ID0gLT5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICdtb3VzZWRvd24nLCBvbk1vdXNlRG93blxuICAgIGNhbnZhcyAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdjYW52YXMnXG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICBkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShjYW52YXMsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZClcbiAgICBpbml0Q2FudmFzKClcblxuICAgIGNocm9tZUVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBjaHJvbWVFbC5jbGFzc05hbWUgPSAnd2lkZ2V0LWNocm9tZSdcbiAgICBjaHJvbWVFbC5pbm5lckhUTUwgPSBcIlwiXCJcbiAgICAgIDxkaXYgY2xhc3M9J2xpbmsgdG9wJz48L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9J2xpbmsgcmlnaHQnPjwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz0nbGluayBib3R0b20nPjwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz0nbGluayBsZWZ0Jz48L2Rpdj5cbiAgICBcIlwiXCJcbiAgICBjaHJvbWVFbC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSdcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkIGNocm9tZUVsXG5cbiAgICBhcGlcblxuICBhcGkuZGVzdHJveSA9IC0+XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgb25Nb3VzZURvd25cbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkIGNhbnZhcyBpZiBjYW52YXMucGFyZW50RWxlbWVudD9cblxuICBhcGkucG9zaXRvbldpZGdldCA9ICh3aWRnZXQpIC0+XG4gICAgZnJhbWUgPSBnZXRXaWRnZXRGcmFtZSh3aWRnZXQpXG4gICAgcmV0dXJuIHVubGVzcyBmcmFtZVxuICAgIHdpZGdldC5zZXRGcmFtZSBmcmFtZVxuXG4gIG9uTW91c2VEb3duID0gKGUpIC0+XG4gICAgd2lkZ2V0ID0gZ2V0V2lkZ2V0QXQobGVmdDogZS5jbGllbnRYLCB0b3A6IGUuY2xpZW50WSlcbiAgICByZXR1cm4gdW5sZXNzIHdpZGdldD9cbiAgICBzdGFydFBvc2l0aW9uaW5nIHdpZGdldCwgZVxuICAgIHNlbGVjdFdpZGdldCh3aWRnZXQpXG5cbiAgc2VsZWN0V2lkZ2V0ID0gKHdpZGdldCkgLT5cbiAgICBvbGRGcmFtZSA9IHt9XG4gICAgb2xkRnJhbWUgPSBjdXJyZW50V2lkZ2V0LmNvbnRlbnRFbCgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIGlmIGN1cnJlbnRXaWRnZXQ/XG4gICAgZnJhbWUgICAgPSB3aWRnZXQuY29udGVudEVsKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcblxuICAgIGN1cnJlbnRXaWRnZXQgPSB3aWRnZXRcbiAgICByZW5kZXJDaHJvbWUob2xkRnJhbWUsIGZyYW1lKVxuXG4gIHN0YXJ0UG9zaXRpb25pbmcgPSAod2lkZ2V0LCBlKSAtPlxuICAgIGNvbnRleHQuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNClcIlxuXG4gICAgcHJldkZyYW1lID0ge31cbiAgICBoYW5kbGVyICAgPSBEcmFnSGFuZGxlcihlLCB3aWRnZXQuY29udGVudEVsKCkpXG4gICAgcmVxdWVzdCAgID0gbnVsbFxuXG4gICAgaGFuZGxlci51cGRhdGUgKGZyYW1lKSAtPlxuICAgICAgcmVxdWVzdCAgID0gcmVxdWVzdEFuaW1GcmFtZSByZW5kZXJEcmFnKHdpZGdldCwgcHJldkZyYW1lLCBmcmFtZSlcbiAgICAgIHByZXZGcmFtZSA9IHt9XG4gICAgICBwcmV2RnJhbWVba10gPSB2IGZvciBrLCB2IG9mIGZyYW1lXG5cbiAgICBoYW5kbGVyLmVuZCAtPlxuICAgICAgY2FuY2VsQW5pbUZyYW1lIHJlcXVlc3RcbiAgICAgIHN0b3JlV2lkZ2V0RnJhbWUgd2lkZ2V0LCBzbGljZShwcmV2RnJhbWUsIFsndG9wJywgJ2xlZnQnLCAnd2lkdGgnLCAnaGVpZ2h0J10pXG4gICAgICByZW5kZXJHdWlkZXMgcHJldkZyYW1lLCB7fSAjIHRoaXMgY2xlYXJzIHRoZSBndWlkZXNcblxuICByZW5kZXJDaHJvbWUgPSAocHJldkZyYW1lLCBmcmFtZSkgLT5cbiAgICBmcmFtZSA9IFJlY3Qub3V0c2V0KGZyYW1lLCAyKVxuICAgIGNocm9tZUVsLnN0eWxlLmxlZnQgPSBmcmFtZS5sZWZ0ICsgJ3B4J1xuICAgIGNocm9tZUVsLnN0eWxlLnRvcCAgPSBmcmFtZS50b3AgICsgJ3B4J1xuICAgIGNocm9tZUVsLnN0eWxlLndpZHRoICA9IGZyYW1lLndpZHRoICArICdweCdcbiAgICBjaHJvbWVFbC5zdHlsZS5oZWlnaHQgPSBmcmFtZS5oZWlnaHQgKyAncHgnXG5cbiAgcmVuZGVyRHJhZyA9ICh3aWRnZXQsIHByZXZGcmFtZSwgZnJhbWUpIC0+IC0+XG4gICAgcmVuZGVyR3VpZGVzIHByZXZGcmFtZSwgZnJhbWVcbiAgICB3aWRnZXQuc2V0RnJhbWUgc2xpY2UoZnJhbWUsIFsndG9wJywgJ2xlZnQnLCAnd2lkdGgnLCAnaGVpZ2h0J10pXG4gICAgcmVuZGVyQ2hyb21lIHByZXZGcmFtZSwgZnJhbWVcblxuICByZW5kZXJHdWlkZXMgPSAocHJldkZyYW1lLCBmcmFtZSkgLT5cbiAgICByZW5kZXJHdWlkZSBwcmV2RnJhbWUsIGZyYW1lLCAndG9wJ1xuICAgIHJlbmRlckd1aWRlIHByZXZGcmFtZSwgZnJhbWUsICdsZWZ0J1xuXG4gIHJlbmRlckd1aWRlID0gKHByZXZGcmFtZSwgZnJhbWUsIGRpcmVjdGlvbikgLT5cbiAgICBkaW0gPSBndWlkZURpbWVuc2lvbnMocHJldkZyYW1lLCBkaXJlY3Rpb24pXG4gICAgcmVjdEhlaWdodCA9IDIwXG5cbiAgICBvbGRHdWlkZVJlY3QgPVxuICAgICAgbGVmdDogICBkaW0uc3RhcnRcbiAgICAgIHRvcCA6ICAgLXJlY3RIZWlnaHQvMlxuICAgICAgd2lkdGggOiBkaW0uZW5kXG4gICAgICBoZWlnaHQ6IHJlY3RIZWlnaHRcblxuICAgIGNvbnRleHQuc2F2ZSgpXG4gICAgY29udGV4dC50cmFuc2xhdGUoZGltLmNlbnRlci54LCBkaW0uY2VudGVyLnkpXG4gICAgY29udGV4dC5yb3RhdGUoZGltLmFuZ2xlKVxuICAgIGNsZWFyRnJhbWUgb2xkR3VpZGVSZWN0XG4gICAgY29udGV4dC5yZXN0b3JlKClcblxuICAgIGRpbSA9IGd1aWRlRGltZW5zaW9ucyhmcmFtZSwgZGlyZWN0aW9uKVxuICAgIGNvbnRleHQuc2F2ZSgpXG4gICAgY29udGV4dC50cmFuc2xhdGUoZGltLmNlbnRlci54LCBkaW0uY2VudGVyLnkpXG4gICAgY29udGV4dC5yb3RhdGUoZGltLmFuZ2xlKVxuXG4gICAgY29udGV4dC5iZWdpblBhdGgoKVxuICAgIGNvbnRleHQubW92ZVRvKGRpbS5zdGFydCs1LCAwKVxuICAgIGNvbnRleHQubGluZVRvKGRpbS5lbmQgICwgMClcbiAgICBjb250ZXh0LnNldExpbmVEYXNoPyhbNSwyXSlcbiAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gXCIjMjg5ZWQ2XCJcbiAgICBjb250ZXh0LmxpbmVXaWR0aCAgID0gZ3VpZGVzV2lkdGhcbiAgICBjb250ZXh0LnN0cm9rZSgpXG4gICAgY29udGV4dC5yZXN0b3JlKClcblxuICBndWlkZURpbWVuc2lvbnMgPSAoZnJhbWUsIGRpcmVjdGlvbikgLT5cbiAgICBjZW50ZXIgPVxuICAgICAgeDogZnJhbWUubGVmdCArIGZyYW1lLndpZHRoLzJcbiAgICAgIHk6IGZyYW1lLnRvcCAgKyBmcmFtZS5oZWlnaHQvMlxuXG4gICAgc3dpdGNoIGRpcmVjdGlvblxuICAgICAgd2hlbiAncmlnaHQnXG4gICAgICAgIGFuZ2xlID0gMFxuICAgICAgICBzdGFydCA9IGZyYW1lLndpZHRoLzJcbiAgICAgICAgZW5kICAgPSBjYW52YXMud2lkdGhcbiAgICAgIHdoZW4gJ2JvdHRvbSdcbiAgICAgICAgYW5nbGUgPSBNYXRoLlBJLzJcbiAgICAgICAgc3RhcnQgPSBmcmFtZS5oZWlnaHQvMlxuICAgICAgICBlbmQgICA9IGNhbnZhcy5oZWlnaHRcbiAgICAgIHdoZW4gJ2xlZnQnXG4gICAgICAgIGFuZ2xlID0gTWF0aC5QSVxuICAgICAgICBzdGFydCA9IGZyYW1lLndpZHRoLzJcbiAgICAgICAgZW5kICAgPSBjYW52YXMud2lkdGhcbiAgICAgIHdoZW4gJ3RvcCdcbiAgICAgICAgYW5nbGUgPSAtTWF0aC5QSS8yXG4gICAgICAgIHN0YXJ0ID0gZnJhbWUuaGVpZ2h0LzJcbiAgICAgICAgZW5kICAgPSBjYW52YXMuaGVpZ2h0XG5cbiAgICBhbmdsZTogYW5nbGUsIHN0YXJ0OiBzdGFydCwgZW5kOiBlbmQsIGNlbnRlcjogY2VudGVyXG5cblxuICBnZXRXaWRnZXRBdCA9IChwb2ludCkgLT5cbiAgICBmb3VuZEVsID0ge31cbiAgICBmb3Igd2lkZ2V0RWwgaW4gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnd2lkZ2V0JylcbiAgICAgIGNvbnRpbnVlIHVubGVzcyB3aWRnZXRFbC5pZD9cbiAgICAgIGlmIFJlY3QucG9pbnRJblJlY3QgcG9pbnQsIHdpZGdldEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gICAgICAgIGZvdW5kRWwgPSB3aWRnZXRFbFxuICAgICAgICBicmVha1xuXG4gICAgd2lkZ2V0cy5nZXQgZm91bmRFbC5pZFxuXG4gIGdldFdpZGdldEZyYW1lID0gKHdpZGdldCkgLT5cbiAgICBnZXRMb2NhbFNldHRpbmdzKHdpZGdldCkuZnJhbWVcblxuICBzdG9yZVdpZGdldEZyYW1lID0gKHdpZGdldCwgZnJhbWUpIC0+XG4gICAgc2V0dGluZ3MgPSBnZXRMb2NhbFNldHRpbmdzKHdpZGdldClcbiAgICBzZXR0aW5ncy5mcmFtZSA9IGZyYW1lXG4gICAgc3RvcmVMb2NhbFNldHRpbmdzIHdpZGdldCwgc2V0dGluZ3NcblxuICBnZXRMb2NhbFNldHRpbmdzID0gKHdpZGdldCkgLT5cbiAgICBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHdpZGdldC5pZCkgb3IgJ3t9JylcblxuICBzdG9yZUxvY2FsU2V0dGluZ3MgPSAod2lkZ2V0LCBzZXR0aW5ncykgLT5cbiAgICAjY29uc29sZS5kZWJ1ZyBzZXR0aW5nc1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtIHdpZGdldC5pZCwgSlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MpXG5cbiAgaW5pdENhbnZhcyA9IC0+XG4gICAgY2FudmFzLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJ1xuICAgIGNhbnZhcy5zdHlsZS50b3AgID0gMFxuICAgIGNhbnZhcy5zdHlsZS5sZWZ0ID0gMFxuICAgIGNhbnZhcy53aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aFxuICAgIGNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHRcblxuICBmaWxsRnJhbWUgPSAoZnJhbWUpIC0+XG4gICAgY29udGV4dC5maWxsUmVjdCBmcmFtZS5sZWZ0LCBmcmFtZS50b3AsIGZyYW1lLndpZHRoLCBmcmFtZS5oZWlnaHRcblxuICBzdHJva2VGcmFtZSA9IChmcmFtZSkgLT5cbiAgICBjb250ZXh0LnN0cm9rZVJlY3QgZnJhbWUubGVmdCwgZnJhbWUudG9wLCBmcmFtZS53aWR0aCwgZnJhbWUuaGVpZ2h0XG5cbiAgY2xlYXJGcmFtZSA9IChmcmFtZSkgLT5cbiAgICBjb250ZXh0LmNsZWFyUmVjdCBmcmFtZS5sZWZ0LCBmcmFtZS50b3AsIGZyYW1lLndpZHRoLCBmcmFtZS5oZWlnaHRcblxuICBzbGljZSA9IChvYmplY3QsIGtleXMpIC0+XG4gICAgcmVzdWx0ID0ge31cbiAgICByZXN1bHRba10gPSBvYmplY3Rba10gZm9yIGsgaW4ga2V5c1xuICAgIHJlc3VsdFxuXG4gIGluaXQoKVxuXG5cblxuIl19
