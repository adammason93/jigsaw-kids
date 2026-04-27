/**
 * Colouring book: draw on a canvas with line-art overlay. Tools + templates.
 */
(function () {
  "use strict";

  const TEMPLATES = [
    { id: "castle", label: "Castle", file: "images/colouring/template-castle.svg" },
    { id: "unicorn", label: "Unicorn", file: "images/colouring/template-unicorn.svg" },
    { id: "rainbow", label: "Rainbow", file: "images/colouring/template-rainbow.svg" },
    { id: "dino", label: "Dinosaur", file: "images/colouring/template-dino.svg" },
    { id: "butterfly", label: "Butterfly", file: "images/colouring/template-butterfly.svg" },
    { id: "robot", label: "Robot", file: "images/colouring/template-robot.svg" },
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
  const templateList = document.getElementById("templateList");
  const customColour = document.getElementById("customColour");
  const btnClear = document.getElementById("btnClear");
  const btnSave = document.getElementById("btnSave");
  const saveLink = document.getElementById("saveLink");
  const statusLine = document.getElementById("statusLine");
  if (!paintCanvas || !templateOverlay || !colourStage) {
    return;
  }

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

  function getDpr() {
    return Math.min(window.devicePixelRatio || 1, 2.5);
  }

  function fitCanvas(preserve) {
    var preserveDrawing = !!preserve;
    dpr = getDpr();
    var rect = colourStage.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) {
      return;
    }
    cssW = Math.max(1, Math.floor(colourStage.clientWidth));
    cssH = Math.max(1, Math.floor(colourStage.clientHeight));
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
    var rect = paintCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    e.preventDefault();
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
    if (!isDrawing || e.pointerId !== activePointer) {
      return;
    }
    e.preventDefault();
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
        selectTemplate(t.file, b);
      });
      templateList.appendChild(b);
    });
  }

  function selectTemplate(file, buttonEl) {
    templateList.querySelectorAll(".tmpl-btn").forEach(function (btn) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    });
    if (buttonEl) {
      buttonEl.classList.add("is-active");
      buttonEl.setAttribute("aria-pressed", "true");
    }
    templateOverlay.src = file;
    templateOverlay.style.display = "block";
    if (statusLine) {
      statusLine.textContent = "Colour in the big picture area below. Change pictures any time.";
    }
    fitCanvas(false);
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

  /* Events */
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
  if (btnSave) {
    btnSave.addEventListener("click", savePicture);
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
  var firstT = TEMPLATES[0];
  if (firstT) {
    var firstBtn = templateList && templateList.querySelector(".tmpl-btn");
    selectTemplate(firstT.file, firstBtn);
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
