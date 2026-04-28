/**
 * Shared localStorage score card: load/save, copy/paste JSON, reset, render.
 * Each game uses GameScorecard.wire({ storageKey, defaults, display, ... }).
 */
(function (global) {
  "use strict";

  function n0(v) {
    var n = parseInt(v, 10);
    return isFinite(n) && n >= 0 ? n : 0;
  }

  function cloneTemplate(template) {
    return JSON.parse(JSON.stringify(template));
  }

  /**
   * Merge raw onto template shape; unknown keys dropped; numbers sanitized ≥ 0.
   * @param {object} template
   * @param {object|null|undefined} raw
   */
  function deepNormalize(template, raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return cloneTemplate(template);
    }
    /** @type {object} */
    var out = {};
    var keys = Object.keys(template);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var t = template[k];
      var r = raw[k];
      if (typeof t === "number") {
        out[k] = n0(r);
      } else if (t !== null && typeof t === "object" && !Array.isArray(t)) {
        out[k] = deepNormalize(
          t,
          r && typeof r === "object" && !Array.isArray(r) ? r : {}
        );
      } else {
        out[k] = t;
      }
    }
    return out;
  }

  function load(key, defaults) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) {
        return cloneTemplate(defaults);
      }
      return deepNormalize(defaults, JSON.parse(raw));
    } catch (e) {
      return cloneTemplate(defaults);
    }
  }

  function save(key, data) {
    try {
      global.localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function renderFields(display, data) {
    Object.keys(display).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) {
        return;
      }
      var fn = display[id];
      var v = typeof fn === "function" ? fn(data) : fn;
      el.textContent = String(v);
    });
  }

  function copyToClipboard(text, onOk, onFail) {
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(onOk, function () {
        fallbackCopy(text, onOk, onFail);
      });
    } else {
      fallbackCopy(text, onOk, onFail);
    }
  }

  function fallbackCopy(text, onOk, onFail) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (onOk) {
        onOk();
      }
    } catch (e) {
      if (onFail) {
        onFail(text);
      }
    }
  }

  /**
   * @param {object} opts
   * @param {string} opts.storageKey
   * @param {object} opts.defaults
   * @param {Record<string, function(object): string|number>} opts.display
   * @param {string} [opts.hintId]
   * @param {string} [opts.btnCopyId]
   * @param {string} [opts.btnPasteId]
   * @param {string} [opts.btnResetId]
   * @param {function(object): void} [opts.onRender]
   */
  function wire(opts) {
    var key = opts.storageKey;
    var defaults = opts.defaults;
    var display = opts.display;
    var hintEl = opts.hintId ? document.getElementById(opts.hintId) : null;
    var hintHtml = hintEl ? hintEl.innerHTML : "";

    function render() {
      var data = load(key, defaults);
      renderFields(display, data);
      if (opts.onRender) {
        opts.onRender(data);
      }
    }

    function flash(msg) {
      if (!hintEl) {
        return;
      }
      hintEl.textContent = msg;
      global.setTimeout(function () {
        if (hintEl) {
          hintEl.innerHTML = hintHtml;
        }
      }, 2600);
    }

    function doCopy() {
      var data = load(key, defaults);
      var text = JSON.stringify(data);
      copyToClipboard(
        text,
        function () {
          flash("Copied! On another device, tap Paste scores.");
        },
        function (t) {
          global.prompt("Copy this text:", t);
        }
      );
    }

    function doPaste() {
      var raw = global.prompt(
        "Paste the scores text you copied (from Copy scores on another device):",
        ""
      );
      if (raw === null || !String(raw).trim()) {
        return;
      }
      try {
        var parsed = JSON.parse(String(raw).trim());
        var next = deepNormalize(defaults, parsed);
        save(key, next);
        render();
        flash("Scores updated from paste.");
      } catch (e) {
        global.alert(
          "Could not read that as scores. Copy the full line from the other device and try again."
        );
      }
    }

    function doReset() {
      if (
        !global.confirm("Clear all score counts saved on this device for this game?")
      ) {
        return;
      }
      try {
        global.localStorage.removeItem(key);
      } catch (e) {}
      render();
      flash("Scores cleared.");
    }

    var bc = opts.btnCopyId ? document.getElementById(opts.btnCopyId) : null;
    var bp = opts.btnPasteId ? document.getElementById(opts.btnPasteId) : null;
    var br = opts.btnResetId ? document.getElementById(opts.btnResetId) : null;
    if (bc) {
      bc.addEventListener("click", doCopy);
    }
    if (bp) {
      bp.addEventListener("click", doPaste);
    }
    if (br) {
      br.addEventListener("click", doReset);
    }

    return {
      load: function () {
        return load(key, defaults);
      },
      save: function (data) {
        save(key, data);
        render();
      },
      update: function (mutator) {
        var d = load(key, defaults);
        mutator(d);
        save(key, d);
        render();
      },
      render: render,
      flash: flash,
    };
  }

  global.GameScorecard = {
    n0: n0,
    deepNormalize: deepNormalize,
    load: load,
    save: save,
    renderFields: renderFields,
    wire: wire,
    copyToClipboard: copyToClipboard,
  };
})(typeof window !== "undefined" ? window : this);
