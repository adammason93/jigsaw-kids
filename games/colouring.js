/**
 * Colouring book: draw on a canvas with line-art overlay. Tools + templates.
 */
(function () {
  "use strict";

  const TEMPLATES = [
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
  const UNDO_MAX = 28;
  /** @type {string[]} */
  var undoStack = [];
  var undoPrepared = false;
  /** @type {{ v: number; templateFile: string; cssW: number; cssH: number; paint: string; t: number } | null} */
  var pendingRestore = null;
  var currentTemplateFile = "";

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

  function readSavedSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      var o = JSON.parse(raw);
      if (!o || o.v !== 1 || !o.templateFile || !o.paint) {
        return null;
      }
      return o;
    } catch (e) {
      return null;
    }
  }

  function saveForLater() {
    if (!currentTemplateFile) {
      if (statusLine) {
        statusLine.textContent = "Pick a picture first, then you can save for later.";
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
      if (statusLine) {
        statusLine.textContent = "Couldn’t save — try again.";
      }
      return;
    }
    var payload = {
      v: 1,
      templateFile: currentTemplateFile,
      cssW: cssW,
      cssH: cssH,
      paint: paint,
      t: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      if (statusLine) {
        statusLine.textContent = "Not enough space on this device — try Save picture instead.";
      }
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("no");
      }
      return;
    }
    if (statusLine) {
      statusLine.textContent =
        "Saved for later on this tablet or computer. Come back to Colouring book anytime!";
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
    isDrawing = false;
    activePointer = null;
    try {
      paintCanvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* */
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
      var img = document.createElement("img");
      img.src = t.file;
      img.alt = "";
      img.width = 120;
      img.height = 90;
      img.loading = "lazy";
      b.appendChild(img);
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
    var onReady = function () {
      templateOverlay.onload = null;
      templateOverlay.onerror = null;
      finishTemplateLoad();
    };
    templateOverlay.onload = onReady;
    templateOverlay.onerror = onReady;
    templateOverlay.src = file;
    templateOverlay.style.display = "block";
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
    if (templateOverlay.naturalWidth > 0) {
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

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    if (document.getElementById("app")) {
      KidsCore.bindTapSound(document.getElementById("app"));
    }
  }
})();
