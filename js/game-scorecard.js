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
    try {
      if (
        global.KidsScoreCloud &&
        typeof global.KidsScoreCloud.onScoreSaved === "function"
      ) {
        global.KidsScoreCloud.onScoreSaved(key);
      }
    } catch (e2) {}
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
  function escapeHtml(text) {
    var d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function wire(opts) {
    var key = opts.storageKey;
    var defaults = opts.defaults;
    var display = opts.display;
    var hintEl = opts.hintId ? document.getElementById(opts.hintId) : null;
    var hintHtml = hintEl ? hintEl.innerHTML : "";
    /** @type {HTMLElement|null} */
    var toastEl = null;
    /** @type {HTMLElement|null} */
    var helpRoot = null;
    var helpOpen = false;
    /** @type {HTMLElement|null} */
    var fabBtn = null;
    /** @type {HTMLElement|null} */
    var lastFocusEl = null;

    if (hintEl) {
      var gsc = hintEl.closest(".gsc");
      hintEl.setAttribute("hidden", "");
      hintEl.classList.add("gsc__hint--stored");
      if (gsc) {
        toastEl = document.createElement("div");
        toastEl.className = "gsc__toast";
        toastEl.setAttribute("role", "status");
        toastEl.setAttribute("aria-live", "polite");

        fabBtn = document.createElement("button");
        fabBtn.type = "button";
        fabBtn.className = "gsc__help-fab";
        fabBtn.setAttribute("aria-label", "About this score card");
        fabBtn.setAttribute("aria-expanded", "false");
        fabBtn.setAttribute("title", "How scores work");
        fabBtn.innerHTML =
          '<span class="gsc__help-fab-mark" aria-hidden="true">?</span>';

        var helpId = "gscHelpDlg-" + opts.hintId;
        var titleId = helpId + "-title";
        helpRoot = document.createElement("div");
        helpRoot.id = helpId;
        helpRoot.className = "gsc__help";
        helpRoot.setAttribute("hidden", "");
        helpRoot.innerHTML =
          '<div class="gsc__help-backdrop" tabindex="-1" aria-hidden="true"></div>' +
          '<div class="gsc__help-panel" role="dialog" aria-modal="true" aria-labelledby="' +
          titleId +
          '">' +
          '<h3 class="gsc__help-title" id="' +
          titleId +
          '">Scores</h3>' +
          '<div class="gsc__help-body">' +
          hintHtml +
          '<p class="gsc__help-sync-note">' +
          "Scores are stored in <strong>this browser on this device only</strong> — they are not uploaded or synced online. " +
          "To show the same totals on another phone or tablet, tap <strong>Copy scores</strong> here, then on the other device open this same game and tap <strong>Paste scores</strong> (your clipboard or a message works)." +
          "</p>" +
          "</div>" +
          '<button type="button" class="gsc__help-close">Done</button>' +
          "</div>";

        gsc.classList.add("gsc--has-help");
        var title = gsc.querySelector(".gsc__title");
        if (title) {
          title.insertAdjacentElement("afterend", toastEl);
        } else {
          gsc.insertBefore(toastEl, gsc.firstChild);
        }
        gsc.appendChild(fabBtn);
        gsc.appendChild(helpRoot);

        var backdrop = helpRoot.querySelector(".gsc__help-backdrop");
        var closeBtn = helpRoot.querySelector(".gsc__help-close");

        function closeHelp() {
          if (!helpRoot || !helpOpen) {
            return;
          }
          helpOpen = false;
          helpRoot.setAttribute("hidden", "");
          fabBtn.setAttribute("aria-expanded", "false");
          global.document.body.classList.remove("gsc-help-open");
          if (lastFocusEl && typeof lastFocusEl.focus === "function") {
            lastFocusEl.focus();
          }
        }

        function openHelp() {
          if (!helpRoot || helpOpen) {
            return;
          }
          lastFocusEl =
            /** @type {HTMLElement} */ (global.document.activeElement);
          helpOpen = true;
          helpRoot.removeAttribute("hidden");
          fabBtn.setAttribute("aria-expanded", "true");
          global.document.body.classList.add("gsc-help-open");
          if (closeBtn && typeof closeBtn.focus === "function") {
            closeBtn.focus();
          }
        }

        fabBtn.addEventListener("click", function (e) {
          e.preventDefault();
          if (helpOpen) {
            closeHelp();
          } else {
            openHelp();
          }
        });
        if (backdrop) {
          backdrop.addEventListener("click", closeHelp);
        }
        if (closeBtn) {
          closeBtn.addEventListener("click", closeHelp);
        }
        global.document.addEventListener("keydown", function (e) {
          if (
            helpOpen &&
            e.key === "Escape" &&
            helpRoot &&
            !helpRoot.hasAttribute("hidden")
          ) {
            e.preventDefault();
            closeHelp();
          }
        });
      }
    }

    function render() {
      var data = load(key, defaults);
      renderFields(display, data);
      if (opts.onRender) {
        opts.onRender(data);
      }
    }

    function flash(msg) {
      if (toastEl) {
        toastEl.innerHTML =
          '<span class="gsc__toast-msg">' + escapeHtml(String(msg)) + "</span>";
        global.setTimeout(function () {
          if (toastEl) {
            toastEl.innerHTML = "";
          }
        }, 2600);
        return;
      }
      if (hintEl) {
        hintEl.removeAttribute("hidden");
        hintEl.classList.remove("gsc__hint--stored");
        hintEl.textContent = msg;
        global.setTimeout(function () {
          if (hintEl) {
            hintEl.setAttribute("hidden", "");
            hintEl.classList.add("gsc__hint--stored");
            hintEl.innerHTML = hintHtml;
          }
        }, 2600);
      }
    }

    function doCopy() {
      var data = load(key, defaults);
      var text = JSON.stringify(data);
      copyToClipboard(
        text,
        function () {
          flash(
            "Copied! On the other device, open this game and tap Paste scores."
          );
        },
        function (t) {
          global.prompt("Copy this text:", t);
        }
      );
    }

    function applyPastedJson(raw) {
      var parsed = JSON.parse(String(raw).trim());
      var next = deepNormalize(defaults, parsed);
      save(key, next);
      render();
      flash("Scores updated from paste.");
    }

    function doPaste() {
      function promptForPaste() {
        var raw = global.prompt(
          "Paste the scores text you copied (from Copy scores on another device):",
          ""
        );
        if (raw === null || !String(raw).trim()) {
          return;
        }
        try {
          applyPastedJson(raw);
        } catch (e) {
          global.alert(
            "Could not read that as scores. Copy the full line from the other device and try again."
          );
        }
      }

      if (
        global.navigator.clipboard &&
        typeof global.navigator.clipboard.readText === "function"
      ) {
        global.navigator.clipboard.readText().then(
          function (text) {
            if (text && String(text).trim()) {
              try {
                applyPastedJson(text);
                return;
              } catch (e) {
                global.alert(
                  "Clipboard doesn’t look like scores from Copy scores. Copy again on the other device, or paste the text in the next box."
                );
              }
            }
            promptForPaste();
          },
          function () {
            promptForPaste();
          }
        );
        return;
      }
      promptForPaste();
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
