/**
 * EvEmitter v1.0.2 — bundled for link-grid (MIT)
 */
(function (global, factory) {
  if (typeof define == "function" && define.amd) {
    define(factory);
  } else if (typeof module == "object" && module.exports) {
    module.exports = factory();
  } else {
    global.EvEmitter = factory();
  }
})(this, function () {
  "use strict";
  function EvEmitter() {}
  var proto = EvEmitter.prototype;
  proto.on = function (eventName, listener) {
    if (!eventName || !listener) return;
    var events = (this._events = this._events || {});
    var listeners = (events[eventName] = events[eventName] || []);
    if (listeners.indexOf(listener) == -1) listeners.push(listener);
    return this;
  };
  proto.once = function (eventName, listener) {
    if (!eventName || !listener) return;
    this.on(eventName, listener);
    var onceEvents = (this._onceEvents = this._onceEvents || {});
    var onceListeners = (onceEvents[eventName] = onceEvents[eventName] || {});
    onceListeners[listener] = true;
    return this;
  };
  proto.off = function (eventName, listener) {
    var listeners = this._events && this._events[eventName];
    if (!listeners || !listeners.length) return;
    var index = listeners.indexOf(listener);
    if (index != -1) listeners.splice(index, 1);
    return this;
  };
  proto.emitEvent = function (eventName, args) {
    var listeners = this._events && this._events[eventName];
    if (!listeners || !listeners.length) return;
    var i = 0;
    var listener = listeners[i];
    args = args || [];
    var onceListeners = this._onceEvents && this._onceEvents[eventName];
    while (listener) {
      var isOnce = onceListeners && onceListeners[listener];
      if (isOnce) {
        this.off(eventName, listener);
        delete onceListeners[listener];
      }
      listener.apply(this, args);
      i += isOnce ? 0 : 1;
      listener = listeners[i];
    }
    return this;
  };
  return EvEmitter;
});

/*!
 * Unipointer v2.1.0 — bundled for link-grid (MIT)
 */
(function (window, factory) {
  if (typeof define == "function" && define.amd) {
    define(["ev-emitter/ev-emitter"], function (EvEmitter) {
      return factory(window, EvEmitter);
    });
  } else if (typeof module == "object" && module.exports) {
    module.exports = factory(window, require("ev-emitter"));
  } else {
    window.Unipointer = factory(window, window.EvEmitter);
  }
})(window, function factory(window, EvEmitter) {
  "use strict";
  function noop() {}
  function Unipointer() {}
  var proto = (Unipointer.prototype = Object.create(EvEmitter.prototype));
  proto.bindStartEvent = function (elem) {
    this._bindStartEvent(elem, true);
  };
  proto.unbindStartEvent = function (elem) {
    this._bindStartEvent(elem, false);
  };
  proto._bindStartEvent = function (elem, isBind) {
    isBind = isBind === undefined ? true : !!isBind;
    var bindMethod = isBind ? "addEventListener" : "removeEventListener";
    if (window.navigator.pointerEnabled) {
      elem[bindMethod]("pointerdown", this);
    } else if (window.navigator.msPointerEnabled) {
      elem[bindMethod]("MSPointerDown", this);
    } else {
      elem[bindMethod]("mousedown", this);
      elem[bindMethod]("touchstart", this);
    }
  };
  proto.handleEvent = function (event) {
    var method = "on" + event.type;
    if (this[method]) this[method](event);
  };
  proto.getTouch = function (touches) {
    for (var i = 0; i < touches.length; i++) {
      var touch = touches[i];
      if (touch.identifier == this.pointerIdentifier) return touch;
    }
  };
  proto.onmousedown = function (event) {
    var button = event.button;
    if (button && button !== 0 && button !== 1) return;
    this._pointerDown(event, event);
  };
  proto.ontouchstart = function (event) {
    this._pointerDown(event, event.changedTouches[0]);
  };
  proto.onMSPointerDown =
    proto.onpointerdown =
    function (event) {
      this._pointerDown(event, event);
    };
  proto._pointerDown = function (event, pointer) {
    if (this.isPointerDown) return;
    this.isPointerDown = true;
    this.pointerIdentifier =
      pointer.pointerId !== undefined ? pointer.pointerId : pointer.identifier;
    this.pointerDown(event, pointer);
  };
  proto.pointerDown = function (event, pointer) {
    this._bindPostStartEvents(event);
    this.emitEvent("pointerDown", [event, pointer]);
  };
  var postStartEvents = {
    mousedown: ["mousemove", "mouseup"],
    touchstart: ["touchmove", "touchend", "touchcancel"],
    pointerdown: ["pointermove", "pointerup", "pointercancel"],
    MSPointerDown: ["MSPointerMove", "MSPointerUp", "MSPointerCancel"],
  };
  proto._bindPostStartEvents = function (event) {
    if (!event) return;
    var events = postStartEvents[event.type];
    events.forEach(function (eventName) {
      window.addEventListener(eventName, this);
    }, this);
    this._boundPointerEvents = events;
  };
  proto._unbindPostStartEvents = function () {
    if (!this._boundPointerEvents) return;
    this._boundPointerEvents.forEach(function (eventName) {
      window.removeEventListener(eventName, this);
    }, this);
    delete this._boundPointerEvents;
  };
  proto.onmousemove = function (event) {
    this._pointerMove(event, event);
  };
  proto.onMSPointerMove =
    proto.onpointermove =
    function (event) {
      if (event.pointerId == this.pointerIdentifier) this._pointerMove(event, event);
    };
  proto.ontouchmove = function (event) {
    var touch = this.getTouch(event.changedTouches);
    if (touch) this._pointerMove(event, touch);
  };
  proto._pointerMove = function (event, pointer) {
    this.pointerMove(event, pointer);
  };
  proto.pointerMove = function (event, pointer) {
    this.emitEvent("pointerMove", [event, pointer]);
  };
  proto.onmouseup = function (event) {
    this._pointerUp(event, event);
  };
  proto.onMSPointerUp =
    proto.onpointerup =
    function (event) {
      if (event.pointerId == this.pointerIdentifier) this._pointerUp(event, event);
    };
  proto.ontouchend = function (event) {
    var touch = this.getTouch(event.changedTouches);
    if (touch) this._pointerUp(event, touch);
  };
  proto._pointerUp = function (event, pointer) {
    this._pointerDone();
    this.pointerUp(event, pointer);
  };
  proto.pointerUp = function (event, pointer) {
    this.emitEvent("pointerUp", [event, pointer]);
  };
  proto._pointerDone = function () {
    this.isPointerDown = false;
    delete this.pointerIdentifier;
    this._unbindPostStartEvents();
    this.pointerDone();
  };
  proto.pointerDone = noop;
  proto.onMSPointerCancel =
    proto.onpointercancel =
    function (event) {
      if (event.pointerId == this.pointerIdentifier) this._pointerCancel(event, event);
    };
  proto.ontouchcancel = function (event) {
    var touch = this.getTouch(event.changedTouches);
    if (touch) this._pointerCancel(event, touch);
  };
  proto._pointerCancel = function (event, pointer) {
    this._pointerDone();
    this.pointerCancel(event, pointer);
  };
  proto.pointerCancel = function (event, pointer) {
    this.emitEvent("pointerCancel", [event, pointer]);
  };
  Unipointer.getPointerPoint = function (pointer) {
    return { x: pointer.pageX, y: pointer.pageY };
  };
  return Unipointer;
});
