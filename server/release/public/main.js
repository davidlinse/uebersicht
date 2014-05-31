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
  positioner.restorePosition(widget);
  return widget.start();
};

window.reset = destroy;

window.onload = init;


},{"./src/widget.coffee":11,"./src/widget_positioning_engine.coffee":17}],2:[function(require,module,exports){

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
var ChangesServer, WidgetCommandServer, WidgetDir, WidgetsServer, connect, path;

connect = require('connect');

path = require('path');

WidgetDir = require('./widget_directory.coffee');

WidgetsServer = require('./widgets_server.coffee');

WidgetCommandServer = require('./widget_command_server.coffee');

ChangesServer = require('./changes_server.coffee');

module.exports = function(port, widgetPath) {
  var server, widgetDir;
  widgetPath = path.resolve(__dirname, widgetPath);
  widgetDir = WidgetDir(widgetPath);
  server = connect().use(connect["static"](path.resolve(__dirname, './public'))).use(WidgetCommandServer(widgetDir)).use(WidgetsServer(widgetDir)).use(ChangesServer.middleware).use(connect["static"](widgetPath)).listen(port);
  widgetDir.onChange(ChangesServer.push);
  console.log('server started on port', port);
  return server;
};


},{"./changes_server.coffee":5,"./widget_command_server.coffee":13,"./widget_directory.coffee":14,"./widgets_server.coffee":18,"connect":2,"path":2}],5:[function(require,module,exports){
var clients, currentChanges, serialize, timer;

serialize = require('./serialize.coffee');

clients = [];

currentChanges = {};

timer = null;

exports.push = function(changes) {
  var id, val;
  clearTimeout(timer);
  for (id in changes) {
    val = changes[id];
    currentChanges[id] = val;
  }
  return timer = setTimeout(function() {
    var client, json, _i, _len;
    if (clients.length > 0) {
      console.log('pushing changes');
      json = serialize(currentChanges);
      for (_i = 0, _len = clients.length; _i < _len; _i++) {
        client = clients[_i];
        client.response.end(json);
      }
      clients.length = 0;
    }
    return currentChanges = {};
  }, 50);
};

exports.middleware = function(req, res, next) {
  var client, parts;
  parts = req.url.replace(/^\//, '').split('/');
  if (!(parts.length === 1 && parts[0] === 'widget-changes')) {
    return next();
  }
  client = {
    request: req,
    response: res
  };
  clients.push(client);
  return setTimeout(function() {
    var index;
    index = clients.indexOf(client);
    if (!(index > -1)) {
      return;
    }
    clients.splice(index, 1);
    return client.response.end('');
  }, 25000);
};


},{"./serialize.coffee":10}],6:[function(require,module,exports){
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


},{}],7:[function(require,module,exports){
module.exports = function(context) {
  var api;
  api = {};
  api.fillFrame = function(frame) {
    return context.fillRect(frame.left, frame.top, frame.width, frame.height);
  };
  api.strokeFrame = function(frame) {
    return context.strokeRect(frame.left, frame.top, frame.width, frame.height);
  };
  api.clearFrame = function(frame) {
    return context.clearRect(frame.left, frame.top, frame.width, frame.height);
  };
  return api;
};


},{}],8:[function(require,module,exports){
module.exports = function(canvas, width) {
  var api, calcDimensions, clear, clearFrame, context, fillFrame, strokeFrame;
  api = {};
  context = canvas.getContext("2d");
  api.render = function(prevFrame, frame, edge) {
    var dim;
    if (prevFrame != null) {
      clear(prevFrame, edge);
    }
    dim = calcDimensions(frame, edge);
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
    context.lineWidth = width;
    context.stroke();
    return context.restore();
  };
  api.clear = clear = function(frame, edge) {
    var dim, oldGuideRect, rectHeight;
    dim = calcDimensions(frame, edge);
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
  calcDimensions = function(frame, edge) {
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
  fillFrame = function(frame) {
    return context.fillRect(frame.left, frame.top, frame.width, frame.height);
  };
  strokeFrame = function(frame) {
    return context.strokeRect(frame.left, frame.top, frame.width, frame.height);
  };
  clearFrame = function(frame) {
    return context.clearRect(frame.left, frame.top, frame.width, frame.height);
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

exports.clone = function(rect) {
  var clone, k, v;
  clone = {};
  for (k in rect) {
    v = rect[k];
    clone[k] = v;
  }
  return clone;
};


},{}],10:[function(require,module,exports){
module.exports = function(someWidgets) {
  var id, serialized, widget;
  serialized = "({";
  for (id in someWidgets) {
    widget = someWidgets[id];
    if (widget === 'deleted') {
      serialized += "'" + id + "': 'deleted',";
    } else {
      serialized += "'" + id + "': " + (widget.serialize()) + ",";
    }
  }
  return serialized.replace(/,$/, '') + '})';
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
var EdgeGuide, Rect;

Rect = require('./rectangle_math.coffee');

EdgeGuide = require('./edge_guide.coffee');

module.exports = function(canvas, actions) {
  var api, chromeEl, clearFrame, context, cutoutToggles, draw, guide, init, prevFrame, renderGuides;
  api = {};
  context = canvas.getContext('2d');
  draw = require('./draw.coffee')(context);
  prevFrame = null;
  guide = EdgeGuide(canvas, 1);
  chromeEl = document.createElement('div');
  chromeEl.className = 'widget-chrome';
  chromeEl.innerHTML = "<div class='sticky-edge top'></div>\n<div class='sticky-edge right'></div>\n<div class='sticky-edge bottom'></div>\n<div class='sticky-edge left'></div>";
  chromeEl.style.position = 'absolute';
  init = function() {
    chromeEl.addEventListener('click', function(e) {
      var className, _i, _len, _ref, _results;
      if (!e.target.classList.contains('sticky-edge')) {
        return true;
      }
      e.stopPropagation();
      _ref = e.target.classList;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        className = _ref[_i];
        if (className === 'sticky-edge') {
          continue;
        }
        _results.push(actions.clickedStickyEdgeToggle(className));
      }
      return _results;
    });
    api.hide();
    return api;
  };
  api.render = function(widgetPosition) {
    var edges, el, frame, newFrame, _i, _len, _ref;
    chromeEl.style.display = 'block';
    clearFrame(prevFrame);
    if (widgetPosition == null) {
      return;
    }
    newFrame = widgetPosition.frame();
    frame = Rect.outset(newFrame, 1.5);
    context.strokeStyle = "#fff";
    context.lineWidth = 1;
    draw.strokeFrame(frame);
    cutoutToggles(frame, 20);
    frame = Rect.outset(newFrame, 2);
    chromeEl.style.left = frame.left + 'px';
    chromeEl.style.top = frame.top + 'px';
    chromeEl.style.width = frame.width + 'px';
    chromeEl.style.height = frame.height + 'px';
    edges = widgetPosition.stickyEdges();
    _ref = chromeEl.getElementsByClassName("sticky-edge");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      el = _ref[_i];
      if (el.classList.contains(edges[0]) || el.classList.contains(edges[1])) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
    renderGuides(widgetPosition);
    return prevFrame = Rect.clone(newFrame);
  };
  renderGuides = function(widgetPosition) {
    var edge, edges, _i, _len, _results;
    edges = widgetPosition.stickyEdges();
    _results = [];
    for (_i = 0, _len = edges.length; _i < _len; _i++) {
      edge = edges[_i];
      _results.push(guide.render(prevFrame, widgetPosition.frame(), edge));
    }
    return _results;
  };
  api.clearGuides = function() {
    var edge, _i, _len, _ref, _results;
    if (prevFrame == null) {
      return;
    }
    _ref = ['top', 'right', 'bottom', 'left'];
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      edge = _ref[_i];
      _results.push(guide.render(prevFrame, {}, edge));
    }
    return _results;
  };
  cutoutToggles = function(frame, toggleSize) {
    context.clearRect(frame.left + frame.width / 2 - toggleSize / 2, frame.top - toggleSize / 2, toggleSize, toggleSize);
    context.clearRect(frame.left + frame.width / 2 - toggleSize / 2, frame.top + frame.height - toggleSize / 2, toggleSize, toggleSize);
    context.clearRect(frame.left - toggleSize / 2, frame.top + frame.height / 2 - toggleSize / 2, toggleSize, toggleSize);
    return context.clearRect(frame.left + frame.width - toggleSize / 2, frame.top + frame.height / 2 - toggleSize / 2, toggleSize, toggleSize);
  };
  api.domEl = function() {
    return chromeEl;
  };
  api.hide = function() {
    clearFrame(prevFrame);
    api.clearGuides();
    chromeEl.style.display = 'none';
    return prevFrame = null;
  };
  clearFrame = function(frame) {
    if (frame != null) {
      return draw.clearFrame(Rect.outset(frame, 5));
    }
  };
  return init();
};


},{"./draw.coffee":7,"./edge_guide.coffee":8,"./rectangle_math.coffee":9}],13:[function(require,module,exports){
module.exports = function(widgetDir) {
  return function(req, res, next) {
    var parts, widget;
    parts = req.url.replace(/^\//, '').split('/');
    if (parts[0] === 'widgets') {
      widget = widgetDir.get(parts[1]);
    }
    if (widget == null) {
      return next();
    }
    return widget.exec({
      cwd: widgetDir.path
    }, function(err, data, stderr) {
      if (err || stderr) {
        res.writeHead(500);
        return res.end(stderr || err.message);
      } else {
        res.writeHead(200);
        return res.end(data);
      }
    });
  };
};


},{}],14:[function(require,module,exports){
var Widget, loader, paths;

Widget = require('./widget.coffee');

loader = require('./widget_loader.coffee');

paths = require('path');

module.exports = function(directoryPath) {
  var api, changeCallback, deleteWidget, init, isWidgetPath, loadWidget, notifyChange, registerWidget, watcher, widgetId, widgets;
  api = {};
  widgets = {};
  watcher = require('chokidar').watch(directoryPath);
  changeCallback = function() {};
  init = function() {
    watcher.on('change', function(filePath) {
      if (isWidgetPath(filePath)) {
        return registerWidget(loadWidget(filePath));
      }
    }).on('add', function(filePath) {
      if (isWidgetPath(filePath)) {
        return registerWidget(loadWidget(filePath));
      }
    }).on('unlink', function(filePath) {
      if (isWidgetPath(filePath)) {
        return deleteWidget(widgetId(filePath));
      }
    });
    console.log('watching', directoryPath);
    return api;
  };
  api.widgets = function() {
    return widgets;
  };
  api.get = function(id) {
    return widgets[id];
  };
  api.onChange = function(callback) {
    return changeCallback = callback;
  };
  api.path = directoryPath;
  loadWidget = function(filePath) {
    var definition, e, id;
    id = widgetId(filePath);
    definition = loader.loadWidget(filePath);
    if (definition != null) {
      definition.id = id;
    }
    try {
      return Widget(definition);
    } catch (_error) {
      e = _error;
      return console.log('error in widget', id + ':', e.message);
    }
  };
  registerWidget = function(widget) {
    if (widget == null) {
      return;
    }
    console.log('registering widget', widget.id);
    widgets[widget.id] = widget;
    return notifyChange(widget.id, widget);
  };
  deleteWidget = function(id) {
    if (widgets[id] == null) {
      return;
    }
    console.log('deleting widget', id);
    delete widgets[id];
    return notifyChange(id, 'deleted');
  };
  notifyChange = function(id, change) {
    var changes;
    changes = {};
    changes[id] = change;
    return changeCallback(changes);
  };
  widgetId = function(filePath) {
    var fileParts, part;
    fileParts = filePath.replace(directoryPath, '').split(/\/+/);
    fileParts = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = fileParts.length; _i < _len; _i++) {
        part = fileParts[_i];
        if (part) {
          _results.push(part);
        }
      }
      return _results;
    })();
    return fileParts.join('-').replace(/\./g, '-');
  };
  isWidgetPath = function(filePath) {
    var _ref;
    return (_ref = filePath.match(/\.coffee$/)) != null ? _ref : filePath.match(/\.js$/);
  };
  return init();
};


},{"./widget.coffee":11,"./widget_loader.coffee":15,"chokidar":2,"path":2}],15:[function(require,module,exports){
var coffee, fs, loadWidget;

fs = require('fs');

coffee = require('coffee-script');

exports.loadWidget = loadWidget = function(filePath) {
  var definition, e;
  definition = null;
  try {
    definition = fs.readFileSync(filePath, {
      encoding: 'utf8'
    });
    if (filePath.match(/\.coffee$/)) {
      definition = coffee["eval"](definition);
    } else {
      definition = eval('({' + definition + '})');
    }
    definition;
  } catch (_error) {
    e = _error;
    console.log("error loading widget " + filePath + ":\n" + e.message + "\n");
  }
  return definition;
};


},{"coffee-script":2,"fs":2}],16:[function(require,module,exports){
var EDGES;

EDGES = ['left', 'right', 'top', 'bottom'];

module.exports = function(widget) {
  var api, cssForFrame, currentFrame, getFrameFromDOM, getFrameFromStorage, getLocalSettings, getStickyEdges, init, slice, stickyEdges, storeLocalSettings;
  api = {};
  currentFrame = null;
  stickyEdges = [];
  init = function() {
    currentFrame = getFrameFromDOM();
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
  api.restoreFrame = function() {
    var frame;
    frame = getFrameFromStorage();
    if (frame != null) {
      return widget.setFrame(cssForFrame(frame));
    }
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
    return (_ref = settings != null ? settings.stickyEdges : void 0) != null ? _ref : ['bottom', 'left'];
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


},{}],17:[function(require,module,exports){
var DragHandler, Rect, WidgetPosition, cancelAnimFrame, requestAnimFrame;

DragHandler = require('./drag_handler.coffee');

Rect = require('./rectangle_math.coffee');

WidgetPosition = require('./widget_position.coffee');

requestAnimFrame = typeof webkitRequestAnimationFrame !== "undefined" && webkitRequestAnimationFrame !== null ? webkitRequestAnimationFrame : setTimeout;

cancelAnimFrame = typeof webkitCancelAnimationFrame !== "undefined" && webkitCancelAnimationFrame !== null ? webkitCancelAnimationFrame : clearTimeout;

module.exports = function(widgets) {
  var api, canvas, chrome, chromeEl, context, currentWidget, currentWidgetPosition, deselectWidget, getWidgetAt, guide, init, initCanvas, onMouseDown, renderDrag, selectWidget, setStickyEdge, startPositioning;
  api = {};
  canvas = null;
  context = null;
  chrome = null;
  currentWidget = null;
  currentWidgetPosition = null;
  chromeEl = null;
  guide = null;
  init = function() {
    document.addEventListener('mousedown', onMouseDown);
    canvas = document.createElement('canvas');
    context = canvas.getContext("2d");
    document.body.insertBefore(canvas, document.body.firstChild);
    initCanvas();
    chrome = require('./widget_chrome.coffee')(canvas, {
      clickedStickyEdgeToggle: setStickyEdge
    });
    document.body.appendChild(chrome.domEl());
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
    return widgetPosition.restoreFrame();
  };
  onMouseDown = function(e) {
    var widget;
    if (e.which !== 1) {
      return;
    }
    widget = getWidgetAt({
      left: e.clientX,
      top: e.clientY
    });
    if (widget != null) {
      selectWidget(widget);
      return startPositioning(currentWidgetPosition, e);
    } else {
      return deselectWidget();
    }
  };
  selectWidget = function(widget) {
    currentWidgetPosition = WidgetPosition(widget);
    currentWidget = widget;
    chrome.render(currentWidgetPosition);
    return currentWidgetPosition;
  };
  deselectWidget = function() {
    if (!currentWidget) {
      return;
    }
    chrome.hide();
    currentWidget = null;
    return currentWidgetPosition = null;
  };
  startPositioning = function(widgetPosition, e) {
    var handler, request;
    handler = DragHandler(e, widgetPosition.domEl());
    request = null;
    handler.update(function(dx, dy) {
      widgetPosition.update(dx, dy);
      return request = requestAnimFrame(renderDrag(widgetPosition));
    });
    return handler.end(function() {
      cancelAnimFrame(request);
      widgetPosition.store();
      return requestAnimFrame(function() {
        return chrome.clearGuides();
      });
    });
  };
  renderDrag = function(widgetPosition) {
    return function() {
      if (widgetPosition != null) {
        widgetPosition.render();
      }
      return chrome.render(widgetPosition);
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
  setStickyEdge = function(newStickyEdge) {
    var edge, _i, _len, _ref;
    if (currentWidgetPosition == null) {
      return;
    }
    _ref = currentWidgetPosition.stickyEdges();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      edge = _ref[_i];
      guide.clear(currentWidgetPosition.frame(), edge);
    }
    currentWidgetPosition.setStickyEdge(newStickyEdge);
    chrome.render(currentWidgetPosition);
    return currentWidgetPosition.store();
  };
  return init();
};


},{"./drag_handler.coffee":6,"./rectangle_math.coffee":9,"./widget_chrome.coffee":12,"./widget_position.coffee":16}],18:[function(require,module,exports){
var serialize;

serialize = require('./serialize.coffee');

module.exports = function(widgetDir) {
  return function(req, res, next) {
    var parts;
    parts = req.url.replace(/^\//, '').split('/');
    if (!(parts.length === 1 && parts[0] === 'widgets')) {
      return next();
    }
    return res.end(serialize(widgetDir.widgets()));
  };
};


},{"./serialize.coffee":10}]},{},[1,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18])