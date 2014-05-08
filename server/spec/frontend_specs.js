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
  widget.start();
  return setTimeout(function() {
    return positioner.restorePosition(widget);
  });
};

window.reset = destroy;

window.onload = init;


},{"./src/widget.coffee":11,"./src/widget_positioning_engine.coffee":13}],2:[function(require,module,exports){

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
    var changeHandler, currentFrame;
    currentFrame = null;
    changeHandler = jasmine.createSpy('change handler');
    DragHandler({
      pageX: 10,
      pageY: 20
    }, domEl[0]).update(changeHandler);
    $(document).simulate('mousemove', {
      clientX: 20,
      clientY: 25
    });
    expect(changeHandler).toHaveBeenCalledWith(10, 5);
    $(document).simulate('mousemove', {
      clientX: 20,
      clientY: 20
    });
    expect(changeHandler).toHaveBeenCalledWith(0, -5);
    $(document).simulate('mouseup', {
      clientX: 50,
      clientY: 30
    });
    return expect(changeHandler).toHaveBeenCalledWith(30, 10);
  });
});


},{"../../src/drag_handler.coffee":9}],6:[function(require,module,exports){
var WidgetPosition;

WidgetPosition = require('../../src/widget_position.coffee');

describe('widget position', function() {
  var FakeWidget, widget, widgetPosition;
  widget = null;
  widgetPosition = null;
  FakeWidget = function() {
    var domEl;
    domEl = $("<div class='widget'>");
    domEl.css({
      top: 10,
      left: 43,
      width: 100,
      height: 120,
      position: 'absolute'
    });
    $(document.body).append(domEl);
    return {
      id: 'foo',
      contentEl: function() {
        return domEl[0];
      },
      setFrame: jasmine.createSpy('setFrame'),
      clearFrame: function() {},
      destroy: function() {
        return domEl.remove();
      }
    };
  };
  beforeEach(function() {
    widget = FakeWidget();
    widgetPosition = WidgetPosition(widget);
    return localStorage.clear();
  });
  afterEach(function() {
    widget.destroy();
    return localStorage.clear();
  });
  it('exposes a widgets contentEl', function() {
    return expect(widgetPosition.domEl()).toBe(widget.contentEl());
  });
  it("reteive's a widgets frame from the dom", function() {
    var frame;
    frame = widgetPosition.frame();
    expect(frame.top).toBe(10);
    expect(frame.left).toBe(43);
    expect(frame.width).toBe(100);
    return expect(frame.height).toBe(120);
  });
  it("retreives a widget's position from local storage", function() {
    var frame, settings;
    settings = {
      frame: {
        top: 2,
        left: 56,
        width: 42,
        height: 87
      }
    };
    localStorage.setItem(widget.id, JSON.stringify(settings));
    widgetPosition = WidgetPosition(widget);
    frame = widgetPosition.frame();
    expect(frame.top).toBe(2);
    expect(frame.left).toBe(56);
    expect(frame.width).toBe(42);
    return expect(frame.height).toBe(87);
  });
  it("sets default sticky edges", function() {
    return expect(widgetPosition.stickyEdges()).toEqual(['top', 'left']);
  });
  it("gets sticky edges from local storage", function() {
    var settings;
    settings = {
      frame: {
        bottom: 21,
        right: 23,
        width: 42,
        height: 87,
        left: 'auto'
      },
      stickyEdges: ['right', 'bottom']
    };
    localStorage.setItem(widget.id, JSON.stringify(settings));
    widgetPosition = WidgetPosition(widget);
    return expect(widgetPosition.stickyEdges()).toEqual(['right', 'bottom']);
  });
  it('sets sticky edges', function() {
    widgetPosition.setStickyEdge('top');
    expect(widgetPosition.stickyEdges()).toEqual(['top', 'left']);
    widgetPosition.setStickyEdge('bottom');
    expect(widgetPosition.stickyEdges()).toEqual(['left', 'bottom']);
    widgetPosition.setStickyEdge('right');
    expect(widgetPosition.stickyEdges()).toEqual(['bottom', 'right']);
    widgetPosition.setStickyEdge('garbage');
    return expect(widgetPosition.stickyEdges()).toEqual(['bottom', 'right']);
  });
  return describe('given a frame', function() {
    beforeEach(function() {
      var settings;
      settings = {
        frame: {
          top: 10,
          right: 40,
          bottom: 23,
          left: 30,
          width: 100,
          height: 100
        }
      };
      localStorage.setItem(widget.id, JSON.stringify(settings));
      return widgetPosition = WidgetPosition(widget);
    });
    return it('sets a widgets frame based on sticky edges', function() {
      widgetPosition.render();
      expect(widget.setFrame).toHaveBeenCalledWith({
        top: '10px',
        left: '30px',
        width: '100px',
        height: '100px',
        right: 'auto',
        bottom: 'auto'
      });
      widgetPosition.setStickyEdge('right');
      widgetPosition.render();
      expect(widget.setFrame).toHaveBeenCalledWith({
        top: '10px',
        right: '40px',
        width: '100px',
        height: '100px',
        left: 'auto',
        bottom: 'auto'
      });
      widgetPosition.setStickyEdge('bottom');
      widgetPosition.render();
      return expect(widget.setFrame).toHaveBeenCalledWith({
        bottom: '23px',
        right: '40px',
        width: '100px',
        height: '100px',
        top: 'auto',
        left: 'auto'
      });
    });
  });
});


},{"../../src/widget_position.coffee":12}],7:[function(require,module,exports){
var Engine, realAnimFrame;

realAnimFrame = window.webkitRequestAnimationFrame;

window.webkitRequestAnimationFrame = function(animFrame) {
  return animFrame();
};

Engine = require('../../src/widget_positioning_engine.coffee');

window.webkitRequestAnimationFrame = realAnimFrame;

describe('widget positioning engine', function() {
  localStorage.clear();
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


},{"../../src/widget_positioning_engine.coffee":13}],8:[function(require,module,exports){
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


},{"../../src/widget.coffee":11}],9:[function(require,module,exports){
module.exports = function(event, domEl) {
  var api, currentFrame, end, endHandler, prevPosition, update, updateHandler;
  api = {};
  updateHandler = function() {};
  endHandler = function() {};
  prevPosition = {
    x: event.pageX,
    y: event.pageY
  };
  currentFrame = domEl.getBoundingClientRect();
  update = function(e) {
    var dx, dy, _ref;
    _ref = [e.pageX - prevPosition.x, e.pageY - prevPosition.y], dx = _ref[0], dy = _ref[1];
    prevPosition = {
      x: e.pageX,
      y: e.pageY
    };
    return updateHandler(dx, dy);
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


},{}],10:[function(require,module,exports){
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


},{}],11:[function(require,module,exports){
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
      contentEl.style.top = frame.top;
    }
    if (frame.right != null) {
      contentEl.style.right = frame.right;
    }
    if (frame.bottom != null) {
      contentEl.style.bottom = frame.bottom;
    }
    if (frame.left != null) {
      contentEl.style.left = frame.left;
    }
    if (frame.width != null) {
      contentEl.style.width = frame.width;
    }
    if (frame.height != null) {
      contentEl.style.height = frame.height;
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


},{"child_process":2,"nib":2,"stylus":2,"tosource":3}],12:[function(require,module,exports){
var EDGES;

EDGES = ['left', 'right', 'top', 'bottom'];

module.exports = function(widget) {
  var api, cssForFrame, currentFrame, getFrame, getFrameFromDOM, getFrameFromStorage, getLocalSettings, getStickyEdges, init, slice, stickyEdges, storeLocalSettings;
  api = {};
  currentFrame = null;
  stickyEdges = [];
  init = function() {
    currentFrame = getFrame();
    stickyEdges = getStickyEdges();
    return api;
  };
  api.domEl = function() {
    return widget.contentEl();
  };
  api.render = function() {
    if (currentFrame == null) {
      return;
    }
    return widget.setFrame(cssForFrame(currentFrame));
  };
  api.frame = function() {
    return currentFrame;
  };
  api.update = function(dx, dy) {
    if (currentFrame == null) {
      return;
    }
    currentFrame.top += dy;
    currentFrame.bottom -= dy;
    currentFrame.left += dx;
    return currentFrame.right -= dx;
  };
  api.store = function() {
    var settings;
    settings = getLocalSettings();
    settings.frame = currentFrame;
    settings.stickyEdges = stickyEdges;
    return storeLocalSettings(settings);
  };
  api.stickyEdges = function() {
    return stickyEdges;
  };
  api.setStickyEdge = function(edge) {
    if (stickyEdges.indexOf(edge) > -1) {
      return;
    }
    switch (edge) {
      case 'left':
        stickyEdges.push('left');
        stickyEdges = stickyEdges.filter(function(edge) {
          return edge !== "right";
        });
        break;
      case 'right':
        stickyEdges.push('right');
        stickyEdges = stickyEdges.filter(function(edge) {
          return edge !== "left";
        });
        break;
      case 'top':
        stickyEdges.push('top');
        stickyEdges = stickyEdges.filter(function(edge) {
          return edge !== "bottom";
        });
        break;
      case 'bottom':
        stickyEdges.push('bottom');
        stickyEdges = stickyEdges.filter(function(edge) {
          return edge !== "top";
        });
    }
    return stickyEdges;
  };
  cssForFrame = function(frame) {
    var attr, _i, _len, _ref;
    frame = slice(frame, stickyEdges.concat(['width', 'height']));
    _ref = EDGES.concat(['width', 'height']);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      attr = _ref[_i];
      frame[attr] = frame[attr] != null ? frame[attr] + 'px' : 'auto';
    }
    return frame;
  };
  getFrame = function() {
    var _ref;
    return (_ref = getFrameFromStorage()) != null ? _ref : getFrameFromDOM();
  };
  getFrameFromDOM = function() {
    var frame;
    frame = widget.contentEl().getBoundingClientRect();
    return {
      top: frame.top,
      right: window.innerWidth - frame.right,
      bottom: window.innerHeight - frame.bottom,
      left: frame.left,
      width: frame.width || 'auto',
      height: frame.height || 'auto'
    };
  };
  getFrameFromStorage = function() {
    var settings;
    settings = getLocalSettings();
    if (settings != null) {
      return settings.frame;
    }
  };
  getStickyEdges = function() {
    var settings, _ref;
    settings = getLocalSettings();
    return (_ref = settings != null ? settings.stickyEdges : void 0) != null ? _ref : ['top', 'left'];
  };
  getLocalSettings = function() {
    return JSON.parse(localStorage.getItem(widget.id) || '{}');
  };
  storeLocalSettings = function(settings) {
    if (!(settings && (settings.frame != null))) {
      return;
    }
    return localStorage.setItem(widget.id, JSON.stringify(settings));
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


},{}],13:[function(require,module,exports){
var DragHandler, Rect, WidgetPosition, cancelAnimFrame, guidesWidth, requestAnimFrame;

DragHandler = require('./drag_handler.coffee');

Rect = require('./rectangle_math.coffee');

WidgetPosition = require('./widget_position.coffee');

requestAnimFrame = typeof webkitRequestAnimationFrame !== "undefined" && webkitRequestAnimationFrame !== null ? webkitRequestAnimationFrame : setTimeout;

cancelAnimFrame = typeof webkitCancelAnimationFrame !== "undefined" && webkitCancelAnimationFrame !== null ? webkitCancelAnimationFrame : clearTimeout;

guidesWidth = 1;

module.exports = function(widgets) {
  var api, canvas, chromeEl, clearFrame, clearGuide, context, currentWidget, currentWidgetPosition, fillFrame, getWidgetAt, guideDimensions, init, initCanvas, initChrome, onMouseDown, renderChrome, renderDrag, renderGuide, renderGuides, selectWidget, startPositioning, strokeFrame;
  api = {};
  canvas = null;
  context = null;
  currentWidget = null;
  currentWidgetPosition = null;
  chromeEl = null;
  init = function() {
    document.addEventListener('mousedown', onMouseDown);
    canvas = document.createElement('canvas');
    context = canvas.getContext("2d");
    document.body.insertBefore(canvas, document.body.firstChild);
    initCanvas();
    chromeEl = document.createElement('div');
    chromeEl.className = 'widget-chrome';
    chromeEl.innerHTML = "<div class='sticky-edge top'></div>\n<div class='sticky-edge right'></div>\n<div class='sticky-edge bottom'></div>\n<div class='sticky-edge left'></div>";
    chromeEl.style.position = 'absolute';
    document.body.appendChild(chromeEl);
    initChrome();
    return api;
  };
  api.destroy = function() {
    document.removeEventListener('mousedown', onMouseDown);
    if (canvas.parentElement != null) {
      return document.body.removeChild(canvas);
    }
  };
  api.restorePosition = function(widget) {
    var widgetPosition;
    widgetPosition = WidgetPosition(widget);
    return widgetPosition.render();
  };
  onMouseDown = function(e) {
    var widget, widgetPosition;
    widget = getWidgetAt({
      left: e.clientX,
      top: e.clientY
    });
    if (widget == null) {
      return;
    }
    widgetPosition = selectWidget(widget);
    return startPositioning(widgetPosition, e);
  };
  selectWidget = function(widget) {
    var frame, oldFrame;
    oldFrame = currentWidgetPosition != null ? currentWidgetPosition.frame() : void 0;
    currentWidgetPosition = WidgetPosition(widget);
    currentWidget = widget;
    frame = currentWidgetPosition.frame();
    renderChrome(oldFrame, frame);
    return currentWidgetPosition;
  };
  startPositioning = function(widgetPosition, e) {
    var handler, prevFrame, request;
    prevFrame = null;
    handler = DragHandler(e, widgetPosition.domEl());
    request = null;
    handler.update(function(dx, dy) {
      var k, v, _ref, _results;
      widgetPosition.update(dx, dy);
      request = requestAnimFrame(renderDrag(widgetPosition, prevFrame));
      prevFrame = {};
      _ref = widgetPosition.frame();
      _results = [];
      for (k in _ref) {
        v = _ref[k];
        _results.push(prevFrame[k] = v);
      }
      return _results;
    });
    return handler.end(function() {
      var edge, _i, _len, _ref, _results;
      cancelAnimFrame(request);
      widgetPosition.store();
      _ref = ['top', 'right', 'bottom', 'left'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        _results.push(renderGuide(prevFrame, {}, edge));
      }
      return _results;
    });
  };
  renderChrome = function(prevFrame, frame) {
    frame = Rect.outset(frame, 2);
    chromeEl.style.left = frame.left + 'px';
    chromeEl.style.top = frame.top + 'px';
    chromeEl.style.width = frame.width + 'px';
    return chromeEl.style.height = frame.height + 'px';
  };
  renderDrag = function(widgetPosition, prevFrame) {
    return function() {
      if (widgetPosition != null) {
        widgetPosition.render();
      }
      renderGuides(widgetPosition, prevFrame);
      return renderChrome(prevFrame, widgetPosition != null ? widgetPosition.frame() : void 0);
    };
  };
  renderGuides = function(widgetPosition, prevFrame) {
    var edge, edges, _i, _len, _results;
    edges = widgetPosition.stickyEdges();
    _results = [];
    for (_i = 0, _len = edges.length; _i < _len; _i++) {
      edge = edges[_i];
      _results.push(renderGuide(prevFrame, widgetPosition.frame(), edge));
    }
    return _results;
  };
  renderGuide = function(prevFrame, frame, edge) {
    var dim;
    if (prevFrame != null) {
      clearGuide(prevFrame, edge);
    }
    dim = guideDimensions(frame, edge);
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
  clearGuide = function(frame, edge) {
    var dim, oldGuideRect, rectHeight;
    dim = guideDimensions(frame, edge);
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
    return context.restore();
  };
  guideDimensions = function(frame, edge) {
    var angle, center, end, start;
    center = {
      x: frame.left + frame.width / 2,
      y: frame.top + frame.height / 2
    };
    switch (edge) {
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
  initCanvas = function() {
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.width = window.innerWidth;
    return canvas.height = window.innerHeight;
  };
  initChrome = function() {
    return chromeEl.addEventListener('click', function(e) {
      var className, edge, _i, _j, _len, _len1, _ref, _ref1;
      if (currentWidgetPosition == null) {
        return true;
      }
      if (!e.target.classList.contains('sticky-edge')) {
        return true;
      }
      e.stopPropagation();
      _ref = e.target.classList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        className = _ref[_i];
        if (className === 'sticky-edge') {
          continue;
        }
        currentWidgetPosition.setStickyEdge(className);
      }
      _ref1 = ['left', 'right', 'top', 'bottom'];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        edge = _ref1[_j];
        if (currentWidgetPosition.stickyEdges().indexOf(edge) > -1) {
          renderGuide(null, currentWidgetPosition.frame(), edge);
        } else {
          clearGuide(currentWidgetPosition.frame(), edge);
        }
      }
      return currentWidgetPosition.store();
    });
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


},{"./drag_handler.coffee":9,"./rectangle_math.coffee":10,"./widget_position.coffee":12}]},{},[4,5,6,7,8])