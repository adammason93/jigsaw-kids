/**
 * Colouring book: draw on a canvas with line-art overlay. Tools + templates.
 */
(function () {
  "use strict";

  /** Sentinel path: no overlay image — white canvas only. */
  const BLANK_TEMPLATE_FILE = "__blank__";

  const TEMPLATES = [
    { id: "blank", label: "Blank paper", file: BLANK_TEMPLATE_FILE },
    { id: "mermaid", label: "Mermaid", file: "images/colouring/template-mermaid.png" },
    { id: "dino-hill", label: "Dino & palm", file: "images/colouring/template-dino-hill.png" },
    { id: "coral-reef", label: "Coral reef", file: "images/colouring/template-coral-reef.png" },
    { id: "shark-party", label: "Shark & fish", file: "images/colouring/template-shark-party.png" },
    { id: "winged-unicorn", label: "Winged unicorn", file: "images/colouring/template-winged-unicorn.png" },
    { id: "pony", label: "Pony", file: "images/colouring/template-pony.png" },
    { id: "winter-friend", label: "Winter friend", file: "images/colouring/template-winter-friend.png" },
    { id: "splash-friends", label: "Splashing friends", file: "images/colouring/template-splash-friends.png" },
  ];

  const TOOL = {
    pen: { lineWidth: 4.5, alpha: 1, crayon: false },
    pencil: { lineWidth: 2.8, alpha: 0.38, crayon: false },
    crayon: { lineWidth: 8.5, alpha: 0.9, crayon: true },
    marker: { lineWidth: 14, alpha: 0.36, crayon: false },
    eraser: { lineWidth: 20, alpha: 1, eraser: true, crayon: false },
  };

  const paintCanvas = document.getElementById("paintCanvas");
  const templateOverlay = document.getElementById("templateOverlay");
  const colourStage = document.getElementById("colourStage");
  const colourPanzoom = document.getElementById("colourPanzoom");
  const templateList = document.getElementById("templateList");
  const customColour = document.getElementById("customColour");
  const btnClear = document.getElementById("btnClear");
  const btnSave = document.getElementById("btnSave");
  const btnUndo = document.getElementById("btnUndo");
  const btnSaveLater = document.getElementById("btnSaveLater");
  const btnSaveAsNew = document.getElementById("btnSaveAsNew");
  const saveLink = document.getElementById("saveLink");
  const statusLine = document.getElementById("statusLine");
  if (!paintCanvas || !templateOverlay || !colourStage) {
    return;
  }

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const ctx = paintCanvas.getContext("2d");
  var currentTool = "pen";
  var currentColor = "#0f172a";
  var lastX = 0;
  var lastY = 0;
  var isDrawing = false;
  var activePointer = null;
  var cssW = 1;
  var cssH = 1;
  var dpr = 1;
  var viewScale = 1;
  var panX = 0;
  var panY = 0;
  /** @type {Record<number, { x: number; y: number }>} */
  var pinchById = {};
  var isPinchGesture = false;
  var lastPinchDist = 1;
  var lastPinchCx = 0;
  var lastPinchCy = 0;

  const STORAGE_KEY = "jigsawKidsColouringV1";
  const PREF_AUTO_SAVE = "jigsawKidsColouringAutoSaveV1";
  const AUTO_SAVE_DEBOUNCE_MS = 2200;
  const UNDO_MAX = 28;
  const MAX_SLOTS = 10;
  /** @type {ReturnType<typeof setTimeout> | null} */
  var autoSaveDebounceTimer = null;
  /** @type {string[]} */
  var undoStack = [];
  var undoPrepared = false;
  /** @type {{ v: number; templateFile: string; cssW: number; cssH: number; paint: string; t: number; id?: string } | null} */
  var pendingRestore = null;
  var currentTemplateFile = "";
  const colourSavedStrip = document.getElementById("colourSavedStrip");
  const colourSavedHint = document.getElementById("colourSavedHint");

  function makeSlotId() {
    return (
      "s_" +
      Date.now().toString(36) +
      "_" +
      Math.floor(Math.random() * 1e9).toString(36)
    );
  }

  function emptyStore() {
    return { v: 2, bundleT: 0, activeSlotId: null, slots: [] };
  }

  function ensureActiveValid(st) {
    if (!st.slots || st.slots.length === 0) {
      st.activeSlotId = null;
      return st;
    }
    var ids = {};
    st.slots.forEach(function (s) {
      ids[s.id] = true;
    });
    if (!st.activeSlotId || !ids[st.activeSlotId]) {
      st.activeSlotId = st.slots[0].id;
    }
    return st;
  }

  function trimSlotsStore(st) {
    if (!st.slots || st.slots.length <= MAX_SLOTS) {
      return ensureActiveValid(st);
    }
    var sorted = st.slots.slice().sort(function (a, b) {
      return (b.t || 0) - (a.t || 0);
    });
    sorted = sorted.slice(0, MAX_SLOTS);
    var idset = {};
    sorted.forEach(function (s) {
      idset[s.id] = true;
    });
    if (st.activeSlotId && !idset[st.activeSlotId]) {
      st.activeSlotId = sorted[0] ? sorted[0].id : null;
    }
    st.slots = sorted;
    return ensureActiveValid(st);
  }

  function migrateV1SessionToStore(o) {
    if (!isValidSavedSession(o)) {
      return null;
    }
    var id = makeSlotId();
    return {
      v: 2,
      bundleT: o.t || Date.now(),
      activeSlotId: id,
      slots: [
        {
          id: id,
          v: 1,
          templateFile: o.templateFile,
          cssW: o.cssW,
          cssH: o.cssH,
          paint: o.paint,
          t: o.t || Date.now(),
        },
      ],
    };
  }

  function storeOrMigrate(x) {
    if (!x) {
      return null;
    }
    if (x.v === 2 && Array.isArray(x.slots)) {
      try {
        return trimSlotsStore(JSON.parse(JSON.stringify(x)));
      } catch (e) {
        return null;
      }
    }
    return migrateV1SessionToStore(x);
  }

  function mergeColourStores(L, R) {
    var a = storeOrMigrate(L);
    var b = storeOrMigrate(R);
    if (!a && !b) {
      return null;
    }
    if (!b) {
      return a;
    }
    if (!a) {
      return b;
    }
    var byId = Object.create(null);
    function insertSlots(arr) {
      var i;
      for (i = 0; i < arr.length; i++) {
        var sl = arr[i];
        if (!sl || !sl.id || !isValidSavedSession(sl)) {
          continue;
        }
        var old = byId[sl.id];
        if (!old || (sl.t || 0) > (old.t || 0)) {
          byId[sl.id] = sl;
        }
      }
    }
    insertSlots(a.slots);
    insertSlots(b.slots);
    var ids = Object.keys(byId);
    var mergedSlots = ids.map(function (k) {
      return byId[k];
    });
    mergedSlots.sort(function (x, y) {
      return (y.t || 0) - (x.t || 0);
    });
    if (mergedSlots.length > MAX_SLOTS) {
      mergedSlots = mergedSlots.slice(0, MAX_SLOTS);
    }
    var idset = {};
    mergedSlots.forEach(function (s) {
      idset[s.id] = true;
    });
    var active =
      a.activeSlotId && idset[a.activeSlotId]
        ? a.activeSlotId
        : b.activeSlotId && idset[b.activeSlotId]
          ? b.activeSlotId
          : mergedSlots.length
            ? mergedSlots[0].id
            : null;
    var bt = Math.max(
      a.bundleT || 0,
      b.bundleT || 0,
      mergedSlots[0] ? mergedSlots[0].t || 0 : 0
    );
    return trimSlotsStore({
      v: 2,
      bundleT: bt,
      activeSlotId: active,
      slots: mergedSlots,
    });
  }

  /** @returns {typeof emptyStore()}
   */
  function readColourStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return emptyStore();
      }
      var o = JSON.parse(raw);
      if (o && o.v === 1 && isValidSavedSession(o)) {
        var m = migrateV1SessionToStore(o);
        if (m) {
          writeColourStore(m);
          return trimSlotsStore(m);
        }
      }
      var s = storeOrMigrate(o);
      return s || emptyStore();
    } catch (e) {
      return emptyStore();
    }
  }

  function writeColourStore(st) {
    st = trimSlotsStore(st);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {
      return false;
    }
    return true;
  }

  function scheduleCloudStoreUpload(st) {
    try {
      if (
        typeof KidsScoreCloud !== "undefined" &&
        KidsScoreCloud.scheduleColouringUpload
      ) {
        KidsScoreCloud.scheduleColouringUpload(JSON.stringify(st));
      }
    } catch (eC) {}
  }

  function getTemplateLabel(file) {
    var i;
    for (i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].file === file) {
        return TEMPLATES[i].label;
      }
    }
    return "Picture";
  }

  function getDpr() {
    return Math.min(window.devicePixelRatio || 1, 2.5);
  }

  function pinchPointerCount() {
    var n = 0;
    for (var k in pinchById) {
      if (Object.prototype.hasOwnProperty.call(pinchById, k)) {
        n++;
      }
    }
    return n;
  }

  function pinchPointValues() {
    var vals = [];
    for (var k in pinchById) {
      if (Object.prototype.hasOwnProperty.call(pinchById, k)) {
        vals.push(pinchById[k]);
      }
    }
    return vals;
  }

  function distPoints(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  function stageLocalFromClient(clientX, clientY) {
    var sr = colourStage.getBoundingClientRect();
    return { x: clientX - sr.left, y: clientY - sr.top };
  }

  function applyViewTransform() {
    if (colourPanzoom) {
      colourPanzoom.style.transform =
        "translate(" + panX + "px," + panY + "px) scale(" + viewScale + ")";
    }
  }

  function clampPan() {
    var W = colourStage.clientWidth;
    var H = colourStage.clientHeight;
    if (viewScale <= 1.001) {
      viewScale = 1;
      panX = 0;
      panY = 0;
      return;
    }
    var sw = W * viewScale;
    var sh = H * viewScale;
    panX = Math.min(0, Math.max(W - sw, panX));
    panY = Math.min(0, Math.max(H - sh, panY));
  }

  function updateZoomPct() {
    var el = document.getElementById("zoomPct");
    if (el) {
      el.textContent = Math.round(viewScale * 100) + "%";
    }
  }

  function resetView() {
    viewScale = 1;
    panX = 0;
    panY = 0;
    applyViewTransform();
    updateZoomPct();
  }

  /**
   * @param {number} newScale
   * @param {number} fx - focal x in stage-local px
   * @param {number} fy - focal y in stage-local px
   */
  function setScaleAround(newScale, fx, fy) {
    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    if (newScale <= 1) {
      resetView();
      return;
    }
    var wx = (fx - panX) / viewScale;
    var wy = (fy - panY) / viewScale;
    viewScale = newScale;
    panX = fx - wx * viewScale;
    panY = fy - wy * viewScale;
    clampPan();
    applyViewTransform();
    updateZoomPct();
  }

  function clearUndo() {
    undoStack = [];
    updateUndoUi();
  }

  function updateUndoUi() {
    if (btnUndo) {
      btnUndo.disabled = undoStack.length === 0;
    }
  }

  function snapshotCanvasPng() {
    try {
      return paintCanvas.toDataURL("image/png");
    } catch (e) {
      return null;
    }
  }

  function pushUndoCheckpoint() {
    var s = snapshotCanvasPng();
    if (!s) {
      return;
    }
    undoStack.push(s);
    if (undoStack.length > UNDO_MAX) {
      undoStack.shift();
    }
    updateUndoUi();
  }

  function restoreFromDataUrl(url) {
    var im = new Image();
    im.onload = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.drawImage(im, 0, 0, cssW, cssH);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateUndoUi();
    };
    im.onerror = function () {
      updateUndoUi();
    };
    im.src = url;
  }

  function undoLast() {
    if (undoStack.length === 0) {
      return;
    }
    var toRestore = undoStack.pop();
    restoreFromDataUrl(toRestore);
    if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
      KidsCore.playSound("tap");
    }
  }

  /** Default on so a refresh doesn’t lose work; user can turn off in the checkbox. */
  function loadAutoSavePref() {
    try {
      var v = localStorage.getItem(PREF_AUTO_SAVE);
      if (v === null) {
        return true;
      }
      return v === "1";
    } catch (e) {
      return true;
    }
  }

  function saveAutoSavePref(on) {
    try {
      localStorage.setItem(PREF_AUTO_SAVE, on ? "1" : "0");
    } catch (e) {}
  }

  function isAutoSaveEnabled() {
    var el = document.getElementById("chkColourAutoSave");
    return !!(el && el.checked);
  }

  function cancelScheduledAutoSave() {
    if (autoSaveDebounceTimer) {
      clearTimeout(autoSaveDebounceTimer);
      autoSaveDebounceTimer = null;
    }
  }

  function scheduleAutoSaveAfterStroke() {
    if (!isAutoSaveEnabled()) {
      return;
    }
    cancelScheduledAutoSave();
    autoSaveDebounceTimer = window.setTimeout(function () {
      autoSaveDebounceTimer = null;
      saveForLater({ silent: true });
    }, AUTO_SAVE_DEBOUNCE_MS);
  }

  /** Flush pending debounced save (e.g. tab hidden, leaving page). */
  function flushAutoSaveNow() {
    if (!isAutoSaveEnabled()) {
      return;
    }
    cancelScheduledAutoSave();
    saveForLater({ silent: true });
  }

  function isValidSavedSession(o) {
    return !!(
      o &&
      o.v === 1 &&
      o.paint &&
      typeof o.templateFile === "string" &&
      o.templateFile.length > 0
    );
  }

  function finalizeCanvasBootstrap() {
    renderSavedSlotsBar();
    var savedSession = readSavedSession();
    if (savedSession && savedSession.templateFile) {
      pendingRestore = savedSession;
      var savedBtn = findTemplateButton(savedSession.templateFile);
      selectTemplate(savedSession.templateFile, savedBtn, { fromSavedSession: true });
    } else {
      pendingRestore = null;
      var firstT = TEMPLATES[0];
      if (firstT) {
        var firstBtn = templateList && templateList.querySelector(".tmpl-btn");
        selectTemplate(firstT.file, firstBtn, null);
      } else {
        updateZoomPct();
        updateUndoUi();
      }
    }
  }

  /**
   * If signed into Supabase sync, merge local bundle with cloud bundle (slots by id).
   */
  function bootstrapCanvas() {
    if (
      typeof KidsScoreCloud !== "undefined" &&
      KidsScoreCloud.downloadColouringSession
    ) {
      KidsScoreCloud.downloadColouringSession(function (err, cloudRaw) {
        if (err) {
          finalizeCanvasBootstrap();
          return;
        }
        var merged = mergeColourStores(readColourStore(), cloudRaw);
        if (!merged || !merged.slots.length) {
          finalizeCanvasBootstrap();
          return;
        }
        var prev = "";
        try {
          prev = localStorage.getItem(STORAGE_KEY) || "";
        } catch (eP) {}
        var nextStr = JSON.stringify(merged);
        var hadCloud = !!storeOrMigrate(cloudRaw);
        try {
          if (prev !== nextStr) {
            localStorage.setItem(STORAGE_KEY, nextStr);
            if (hadCloud && statusLine) {
              statusLine.textContent =
                "Loaded your saved pictures from the cloud — tap one to carry on!";
            }
          }
        } catch (eStore) {}

        finalizeCanvasBootstrap();
      });
    } else {
      finalizeCanvasBootstrap();
    }
  }

  /** Active slot snapshot (same shape as legacy v1 document) — or null */
  function readSavedSession() {
    var st = readColourStore();
    if (!st.slots || !st.slots.length || !st.activeSlotId) {
      return null;
    }
    var i;
    for (i = 0; i < st.slots.length; i++) {
      if (
        st.slots[i].id === st.activeSlotId &&
        isValidSavedSession(st.slots[i])
      ) {
        return st.slots[i];
      }
    }
    return null;
  }

  function persistStoreAndSync(st) {
    if (!writeColourStore(st)) {
      if (statusLine) {
        statusLine.textContent =
          "Not enough space on this device — try Save picture instead.";
      }
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("no");
      }
      return false;
    }
    scheduleCloudStoreUpload(st);
    renderSavedSlotsBar();
    return true;
  }

  /**
   * @param {(function(): void)|undefined} done
   */
  function applyThumbToPayload(paintDataUrl, payload, done) {
    done = done || function () {};
    var im = new Image();
    im.onload = function () {
      try {
        var c = document.createElement("canvas");
        c.width = 120;
        c.height = 90;
        var cx = c.getContext("2d");
        cx.drawImage(im, 0, 0, c.width, c.height);
        payload.thumb = c.toDataURL("image/jpeg", 0.74);
      } catch (eThumb) {}
      done();
    };
    im.onerror = function () {
      done();
    };
    im.src = paintDataUrl;
  }

  function renderSavedSlotsBar() {
    if (!colourSavedStrip) {
      return;
    }
    colourSavedStrip.innerHTML = "";
    var st = readColourStore();
    if (colourSavedHint) {
      colourSavedHint.style.display =
        st.slots && st.slots.length ? "none" : "";
    }
    if (!st.slots || !st.slots.length) {
      return;
    }
    st.slots.forEach(function (sl) {
      if (!isValidSavedSession(sl)) {
        return;
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "colour-saved__chip";
      btn.setAttribute("role", "listitem");
      if (sl.id === st.activeSlotId) {
        btn.classList.add("is-active");
      }
      btn.setAttribute("data-slot-id", sl.id);
      var lab = getTemplateLabel(sl.templateFile);
      var d = new Date(sl.t || 0);
      var timeStr = d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      btn.setAttribute(
        "aria-label",
        "Open saved picture: " + lab + " · " + timeStr
      );
      btn.title = lab + " · " + timeStr;

      var vis = document.createElement("div");
      vis.className = "colour-saved__chip-vis";
      if (sl.thumb) {
        var thumbImg = document.createElement("img");
        thumbImg.src = sl.thumb;
        thumbImg.alt = "";
        vis.appendChild(thumbImg);
      } else if (sl.templateFile !== BLANK_TEMPLATE_FILE) {
        var lineImg = document.createElement("img");
        lineImg.src = sl.templateFile;
        lineImg.alt = "";
        vis.appendChild(lineImg);
      } else {
        var blankMk = document.createElement("span");
        blankMk.className = "colour-saved__chip-blank";
        blankMk.setAttribute("aria-hidden", "true");
        vis.appendChild(blankMk);
      }
      btn.appendChild(vis);
      var cap = document.createElement("span");
      cap.className = "colour-saved__chip-cap";
      cap.textContent = lab;
      btn.appendChild(cap);

      btn.addEventListener("click", function () {
        loadSavedSlot(sl.id);
      });

      colourSavedStrip.appendChild(btn);
    });
  }

  function loadSavedSlot(slotId) {
    var st = readColourStore();
    var target = null;
    var i;
    for (i = 0; i < st.slots.length; i++) {
      if (st.slots[i].id === slotId && isValidSavedSession(st.slots[i])) {
        target = st.slots[i];
        break;
      }
    }
    if (!target) {
      return;
    }
    st.activeSlotId = slotId;
    writeColourStore(st);
    pendingRestore = target;
    var btnBk = findTemplateButton(target.templateFile);
    selectTemplate(target.templateFile, btnBk, { fromSavedSession: true });
    renderSavedSlotsBar();
    if (statusLine) {
      statusLine.textContent =
        "Showing this saved picture — keep colouring!";
    }
    scheduleCloudStoreUpload(st);
    if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
      KidsCore.playSound("tap");
    }
  }

  /**
   * @param {{ silent?: boolean; asNewSlot?: boolean }} [opts]
   */
  function saveForLater(opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var asNew = !!opts.asNewSlot;
    if (!currentTemplateFile) {
      if (statusLine && !silent) {
        statusLine.textContent =
          "Pick a picture first, then you can save for later.";
      }
      return;
    }
    var paint;
    try {
      paint = paintCanvas.toDataURL("image/jpeg", 0.86);
    } catch (e) {
      paint = null;
    }
    if (!paint) {
      if (statusLine && !silent) {
        statusLine.textContent = "Couldn’t save — try again.";
      }
      return;
    }

    var basePayload = {
      v: 1,
      templateFile: currentTemplateFile,
      cssW: cssW,
      cssH: cssH,
      paint: paint,
      t: Date.now(),
    };

    function applySlotToStore(slotPayload) {
      var st = readColourStore();
      if (asNew) {
        slotPayload.id = makeSlotId();
        if (!st.slots) {
          st.slots = [];
        }
        st.slots.unshift(slotPayload);
        st.activeSlotId = slotPayload.id;
      } else if (!st.slots.length || !st.activeSlotId) {
        slotPayload.id = makeSlotId();
        if (!st.slots) {
          st.slots = [];
        }
        st.slots.unshift(slotPayload);
        st.activeSlotId = slotPayload.id;
      } else {
        var found = false;
        var j;
        for (j = 0; j < st.slots.length; j++) {
          if (st.slots[j].id === st.activeSlotId) {
            slotPayload.id = st.activeSlotId;
            st.slots[j] = slotPayload;
            found = true;
            break;
          }
        }
        if (!found) {
          slotPayload.id = makeSlotId();
          st.slots.unshift(slotPayload);
          st.activeSlotId = slotPayload.id;
        }
      }
      st.bundleT = Date.now();
      return persistStoreAndSync(st);
    }

    function afterReady(body) {
      if (!applySlotToStore(body)) {
        return;
      }
      if (!silent) {
        if (statusLine) {
          statusLine.textContent = asNew
            ? "Saved as another picture — tap it in the list any time!"
            : "Saved for later on this tablet or computer. Come back to Colouring book anytime!";
        }
        if (typeof KidsCore !== "undefined") {
          if (KidsCore.playSound) {
            KidsCore.playSound("ok");
          }
          if (KidsCore.haptic) {
            KidsCore.haptic("light");
          }
        }
      }
    }

    var needThumb = !silent || asNew;
    if (needThumb) {
      var labeled = {};
      labeled.v = basePayload.v;
      labeled.templateFile = basePayload.templateFile;
      labeled.cssW = basePayload.cssW;
      labeled.cssH = basePayload.cssH;
      labeled.paint = basePayload.paint;
      labeled.t = basePayload.t;
      applyThumbToPayload(paint, labeled, function () {
        afterReady(labeled);
      });
    } else {
      afterReady(basePayload);
    }
  }

  function fitCanvas(preserve) {
    var preserveDrawing = !!preserve;
    dpr = getDpr();
    var rect = colourStage.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) {
      return;
    }
    var prevW = cssW;
    var prevH = cssH;
    cssW = Math.max(1, Math.floor(colourStage.clientWidth));
    cssH = Math.max(1, Math.floor(colourStage.clientHeight));
    if (preserveDrawing && (prevW !== cssW || prevH !== cssH)) {
      resetView();
      clearUndo();
    }
    var snap = null;
    if (preserveDrawing && paintCanvas.width > 0 && paintCanvas.height > 0) {
      try {
        snap = paintCanvas.toDataURL("image/png");
      } catch (e) {
        snap = null;
      }
    }
    paintCanvas.width = Math.max(1, Math.floor(cssW * dpr));
    paintCanvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
    if (snap) {
      var im = new Image();
      im.onload = function () {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(im, 0, 0, cssW, cssH);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      im.onerror = function () {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cssW, cssH);
      };
      im.src = snap;
    }
  }

  function applyToolForStroke() {
    var t = TOOL[currentTool] || TOOL.pen;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (t.eraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = t.lineWidth;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = t.alpha;
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = t.lineWidth;
    }
  }

  function drawSegment(x1, y1, x2, y2) {
    var t = TOOL[currentTool] || TOOL.pen;
    if (t.crayon) {
      applyToolForStroke();
      var i;
      for (i = 0; i < 5; i++) {
        var jx = (Math.random() - 0.5) * 4.5;
        var jy = (Math.random() - 0.5) * 4.5;
        ctx.beginPath();
        ctx.moveTo(x1 + jx, y1 + jy);
        ctx.lineTo(x2 + jx, y2 + jy);
        ctx.stroke();
      }
    } else {
      applyToolForStroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function getPos(e) {
    var pl = stageLocalFromClient(e.clientX, e.clientY);
    var x = (pl.x - panX) / viewScale;
    var y = (pl.y - panY) / viewScale;
    return {
      x: Math.max(0, Math.min(cssW, x)),
      y: Math.max(0, Math.min(cssH, y)),
    };
  }

  function onPointerDown(e) {
    if (isPinchGesture || pinchPointerCount() > 1) {
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    e.preventDefault();
    undoPrepared = false;
    isDrawing = true;
    activePointer = e.pointerId;
    var p = getPos(e);
    lastX = p.x;
    lastY = p.y;
    try {
      paintCanvas.setPointerCapture(e.pointerId);
    } catch (err) {
      /* */
    }
    if (typeof KidsCore !== "undefined" && KidsCore.haptic) {
      KidsCore.haptic("light");
    }
  }

  function onPointerMove(e) {
    if (isPinchGesture) {
      return;
    }
    if (!isDrawing || e.pointerId !== activePointer) {
      return;
    }
    e.preventDefault();
    if (!undoPrepared) {
      pushUndoCheckpoint();
      undoPrepared = true;
    }
    var p = getPos(e);
    drawSegment(lastX, lastY, p.x, p.y);
    lastX = p.x;
    lastY = p.y;
  }

  function onPointerUp(e) {
    if (activePointer == null) {
      return;
    }
    if (e.pointerId !== activePointer) {
      return;
    }
    e.preventDefault();
    var hadStroke = undoPrepared;
    isDrawing = false;
    activePointer = null;
    try {
      paintCanvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* */
    }
    if (hadStroke) {
      scheduleAutoSaveAfterStroke();
    }
  }

  function buildTemplateList() {
    if (!templateList) {
      return;
    }
    templateList.innerHTML = "";
    TEMPLATES.forEach(function (t, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tmpl-btn" + (i === 0 ? " is-active" : "");
      b.setAttribute("data-file", t.file);
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      if (t.file === BLANK_TEMPLATE_FILE) {
        var blankThumb = document.createElement("span");
        blankThumb.className = "tmpl-btn__blank-thumb";
        blankThumb.setAttribute("aria-hidden", "true");
        b.appendChild(blankThumb);
      } else {
        var img = document.createElement("img");
        img.src = t.file;
        img.alt = "";
        img.width = 120;
        img.height = 90;
        img.loading = "lazy";
        b.appendChild(img);
      }
      var span = document.createElement("span");
      span.textContent = t.label;
      b.appendChild(span);
      b.addEventListener("click", function () {
        selectTemplate(t.file, b, null);
      });
      templateList.appendChild(b);
    });
  }

  function findTemplateButton(file) {
    if (!templateList || !file) {
      return null;
    }
    return templateList.querySelector('.tmpl-btn[data-file="' + file + '"]');
  }

  var templateReadyOnce = false;

  function finishTemplateLoad() {
    if (templateReadyOnce) {
      return;
    }
    templateReadyOnce = true;
    resetView();
    fitCanvas(false);
    clearUndo();
    if (pendingRestore && pendingRestore.templateFile === currentTemplateFile) {
      var pr = pendingRestore;
      pendingRestore = null;
      restoreFromDataUrl(pr.paint);
      if (statusLine) {
        statusLine.textContent = "Welcome back — here’s the picture you saved!";
      }
    } else {
      updateUndoUi();
    }
  }

  /**
   * @param {string} file
   * @param {HTMLButtonElement | null | undefined} buttonEl
   * @param {{ fromSavedSession?: boolean } | null} opts
   */
  function selectTemplate(file, buttonEl, opts) {
    opts = opts || {};
    cancelScheduledAutoSave();
    if (!opts.fromSavedSession) {
      pendingRestore = null;
    }
    currentTemplateFile = file;
    templateList.querySelectorAll(".tmpl-btn").forEach(function (btn) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    });
    if (buttonEl) {
      buttonEl.classList.add("is-active");
      buttonEl.setAttribute("aria-pressed", "true");
    }
    templateReadyOnce = false;
    templateOverlay.onload = null;
    templateOverlay.onerror = null;
    if (file === BLANK_TEMPLATE_FILE) {
      templateOverlay.removeAttribute("src");
      templateOverlay.style.display = "none";
      if (statusLine && !opts.fromSavedSession) {
        statusLine.textContent = "Blank paper — draw anything you like. Change to a picture any time.";
      }
      finishTemplateLoad();
      return;
    }
    templateOverlay.style.display = "block";
    var onReady = function () {
      templateOverlay.onload = null;
      templateOverlay.onerror = null;
      finishTemplateLoad();
    };
    templateOverlay.onload = onReady;
    templateOverlay.onerror = onReady;
    templateOverlay.src = file;
    if (statusLine && !opts.fromSavedSession) {
      statusLine.textContent = "Colour on the canvas. Change pictures any time.";
    }
    if (templateOverlay.decode && typeof templateOverlay.decode === "function") {
      templateOverlay.decode().then(onReady).catch(onReady);
    }
  }

  function setToolById(id) {
    currentTool = id in TOOL ? id : "pen";
    document.querySelectorAll(".tool-btn").forEach(function (b) {
      var on = b.getAttribute("data-tool") === currentTool;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setColor(hex) {
    var norm = (hex + "").toLowerCase();
    currentColor = norm;
    if (customColour) {
      customColour.value = norm.length === 7 ? norm : "#000000";
    }
    document.querySelectorAll(".swatch").forEach(function (s) {
      var h = (s.getAttribute("data-hex") || "").toLowerCase();
      s.setAttribute("aria-pressed", h === norm ? "true" : "false");
    });
  }

  function clearPainting() {
    cancelScheduledAutoSave();
    clearUndo();
    fitCanvas(false);
    if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
      KidsCore.playSound("tap");
    }
  }

  function savePicture() {
    var merged = document.createElement("canvas");
    merged.width = paintCanvas.width;
    merged.height = paintCanvas.height;
    var mctx = merged.getContext("2d");
    mctx.drawImage(paintCanvas, 0, 0);
    if (
      templateOverlay.style.display !== "none" &&
      templateOverlay.naturalWidth > 0 &&
      currentTemplateFile !== BLANK_TEMPLATE_FILE
    ) {
      mctx.globalCompositeOperation = "multiply";
      mctx.drawImage(
        templateOverlay,
        0,
        0,
        templateOverlay.naturalWidth,
        templateOverlay.naturalHeight,
        0,
        0,
        merged.width,
        merged.height
      );
      mctx.globalCompositeOperation = "source-over";
    }
    var url;
    try {
      url = merged.toDataURL("image/png");
    } catch (e) {
      if (statusLine) {
        statusLine.textContent = "Couldn’t save (browser blocked the picture).";
      }
      return;
    }
    if (saveLink) {
      saveLink.href = url;
      saveLink.download = "sofiacolour-" + (Date.now() % 100000) + ".png";
      saveLink.click();
    }
    /* Keep an in-app copy so refresh / come back still shows this picture (export alone does not). */
    saveForLater({ silent: true });
    if (statusLine) {
      statusLine.textContent = "Picture saved! Check your Downloads folder (or the share sheet on iPad).";
    }
    if (typeof KidsCore !== "undefined") {
      if (KidsCore.playSound) {
        KidsCore.playSound("ok");
      }
      if (KidsCore.haptic) {
        KidsCore.haptic("light");
      }
    }
  }

  function onStagePointerDownCapture(e) {
    var pl = stageLocalFromClient(e.clientX, e.clientY);
    pinchById[e.pointerId] = pl;
    if (pinchPointerCount() === 2) {
      isPinchGesture = true;
      isDrawing = false;
      activePointer = null;
      var vals = pinchPointValues();
      lastPinchDist = distPoints(vals[0], vals[1]);
      lastPinchCx = (vals[0].x + vals[1].x) / 2;
      lastPinchCy = (vals[0].y + vals[1].y) / 2;
    }
  }

  function onStagePointerMoveCapture(e) {
    if (Object.prototype.hasOwnProperty.call(pinchById, e.pointerId)) {
      pinchById[e.pointerId] = stageLocalFromClient(e.clientX, e.clientY);
    }
    if (!isPinchGesture || pinchPointerCount() < 2) {
      return;
    }
    var vals = pinchPointValues();
    if (vals.length < 2) {
      return;
    }
    var d = distPoints(vals[0], vals[1]);
    var cx = (vals[0].x + vals[1].x) / 2;
    var cy = (vals[0].y + vals[1].y) / 2;
    panX += cx - lastPinchCx;
    panY += cy - lastPinchCy;
    lastPinchCx = cx;
    lastPinchCy = cy;
    var scaleFactor = d / lastPinchDist;
    lastPinchDist = d || lastPinchDist;
    if (scaleFactor > 0 && isFinite(scaleFactor)) {
      var wcx = (cx - panX) / viewScale;
      var wcy = (cy - panY) / viewScale;
      viewScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewScale * scaleFactor));
      panX = cx - wcx * viewScale;
      panY = cy - wcy * viewScale;
    }
    clampPan();
    applyViewTransform();
    updateZoomPct();
    e.preventDefault();
  }

  function onStagePointerUpCapture(e) {
    delete pinchById[e.pointerId];
    if (pinchPointerCount() < 2) {
      isPinchGesture = false;
      lastPinchDist = 1;
    }
  }

  /* Events */
  colourStage.addEventListener("pointerdown", onStagePointerDownCapture, true);
  colourStage.addEventListener("pointermove", onStagePointerMoveCapture, true);
  colourStage.addEventListener("pointerup", onStagePointerUpCapture, true);
  colourStage.addEventListener("pointercancel", onStagePointerUpCapture, true);
  colourStage.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      var pl = stageLocalFromClient(e.clientX, e.clientY);
      setScaleAround(viewScale * factor, pl.x, pl.y);
    },
    { passive: false }
  );

  paintCanvas.addEventListener("pointerdown", onPointerDown);
  paintCanvas.addEventListener("pointermove", onPointerMove);
  paintCanvas.addEventListener("pointerup", onPointerUp);
  paintCanvas.addEventListener("pointercancel", onPointerUp);
  document.addEventListener(
    "pointerup",
    function (e) {
      if (isDrawing && e.pointerId === activePointer) {
        onPointerUp(e);
      }
    },
    { capture: true }
  );

  if (btnClear) {
    btnClear.addEventListener("click", clearPainting);
  }
  if (btnUndo) {
    btnUndo.addEventListener("click", function () {
      undoLast();
    });
  }
  if (btnSaveLater) {
    btnSaveLater.addEventListener("click", function () {
      saveForLater();
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
    });
  }
  if (btnSaveAsNew) {
    btnSaveAsNew.addEventListener("click", function () {
      saveForLater({ asNewSlot: true });
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
    });
  }
  if (btnSave) {
    btnSave.addEventListener("click", savePicture);
  }

  var btnZoomIn = document.getElementById("btnZoomIn");
  var btnZoomOut = document.getElementById("btnZoomOut");
  var btnZoomFit = document.getElementById("btnZoomFit");
  if (btnZoomIn && colourStage) {
    btnZoomIn.addEventListener("click", function () {
      var w = colourStage.clientWidth;
      var h = colourStage.clientHeight;
      setScaleAround(viewScale * 1.28, w / 2, h / 2);
    });
  }
  if (btnZoomOut && colourStage) {
    btnZoomOut.addEventListener("click", function () {
      var w = colourStage.clientWidth;
      var h = colourStage.clientHeight;
      setScaleAround(viewScale / 1.28, w / 2, h / 2);
    });
  }
  if (btnZoomFit) {
    btnZoomFit.addEventListener("click", function () {
      resetView();
    });
  }

  document.querySelectorAll(".swatch").forEach(function (s) {
    s.addEventListener("click", function () {
      var h = s.getAttribute("data-hex");
      if (h) {
        setColor(h);
      }
    });
  });

  if (customColour) {
    customColour.addEventListener("input", function () {
      setColor(customColour.value);
      document.querySelectorAll(".swatch").forEach(function (sw) {
        sw.setAttribute("aria-pressed", "false");
      });
    });
  }

  document.querySelectorAll(".tool-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-tool");
      if (id) {
        setToolById(id);
        if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
          KidsCore.playSound("tap");
        }
      }
    });
  });

  if (customColour) {
    setColor(customColour.value || currentColor);
  } else {
    setColor("#0f172a");
  }
  setToolById("pen");
  buildTemplateList();
  bootstrapCanvas();

  var ro = new ResizeObserver(function () {
    fitCanvas(true);
  });
  ro.observe(colourStage);
  requestAnimationFrame(function () {
    fitCanvas(false);
  });

  window.addEventListener("orientationchange", function () {
    setTimeout(function () {
      fitCanvas(true);
    }, 200);
  });

  var chkColourAutoSave = document.getElementById("chkColourAutoSave");
  if (chkColourAutoSave) {
    chkColourAutoSave.checked = loadAutoSavePref();
    chkColourAutoSave.addEventListener("change", function () {
      saveAutoSavePref(chkColourAutoSave.checked);
      if (chkColourAutoSave.checked) {
        saveForLater({ silent: true });
      } else {
        cancelScheduledAutoSave();
      }
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      flushAutoSaveNow();
    }
  });
  window.addEventListener("pagehide", function () {
    flushAutoSaveNow();
  });

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    if (document.getElementById("app")) {
      KidsCore.bindTapSound(document.getElementById("app"));
    }
  }
})();
