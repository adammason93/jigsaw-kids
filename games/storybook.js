/**
 * AI storybook — journey modal + Supabase Edge Function `clever-service`.
 * Requires: deploy function + OPENAI_API_KEY secret (see supabase/functions/clever-service/README.md).
 */
(function () {
  var CHARACTERS = [
    { id: "unicorn", label: "Unicorn" },
    { id: "dragon", label: "Little dragon" },
    { id: "robot", label: "Robot" },
    { id: "bunny", label: "Bunny" },
    { id: "teddy", label: "Teddy bear" },
  ];

  var PLACES = [
    { id: "beach", label: "Beach" },
    { id: "woods", label: "Woods" },
    { id: "castle", label: "Castle" },
    { id: "garden", label: "Garden" },
    { id: "space", label: "Space" },
  ];

  var STEP_HEADINGS = [
    "Let’s make your book",
    "Who’s the hero?",
    "Pick a buddy",
    "Where are we?",
    "What happens?",
  ];

  var landing = document.getElementById("sbLanding");
  var modal = document.getElementById("sbModal");
  var book = document.getElementById("sbBook");
  var busy = document.getElementById("sbBusy");
  var appEl = document.getElementById("app");
  var nameInput = document.getElementById("sbName");
  var plotInput = document.getElementById("sbPlot");
  var charRow = document.getElementById("sbCharacters");
  var placeRow = document.getElementById("sbPlaces");
  var errEl = document.getElementById("sbError");
  var modalErr = document.getElementById("sbModalError");
  var progressEl = document.getElementById("sbProgress");
  var stepKicker = document.getElementById("sbStepKicker");
  var stepHeading = document.getElementById("sbStepHeading");
  var btnStart = document.getElementById("sbStartJourney");
  var btnGen = document.getElementById("sbGenerate");
  var bookTitle = document.getElementById("sbBookTitle");
  var pageLeaf = document.getElementById("sbPageLeaf");
  var layerOver = document.getElementById("sbLayerOver");
  var layerUnder = document.getElementById("sbLayerUnder");
  var btnPrev = document.getElementById("sbPrev");
  var btnNext = document.getElementById("sbNext");
  var pagerLive = document.getElementById("sbPagerLive");
  var btnNew = document.getElementById("sbNew");
  var btnDownload = document.getElementById("sbDownloadBook");
  var btnShelf = document.getElementById("sbShelfBook");
  var shelfEl = document.getElementById("sbShelf");
  var btnVoiceName = document.getElementById("sbVoiceName");
  var btnVoicePlot = document.getElementById("sbVoicePlot");
  var voiceHintName = document.getElementById("sbVoiceNameHint");
  var voiceHintPlot = document.getElementById("sbVoicePlotHint");

  var SpeechRec =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition || null
      : null;

  var activeSpeech = null;
  /** @type {'name' | 'plot' | null} */
  var speechTarget = null;
  var plotSpeechPrefix = "";
  var plotSpeechAccum = "";

  function getSpeechRecognition() {
    return SpeechRec;
  }

  function setVoiceHint(nameMsg, plotMsg) {
    if (voiceHintName) {
      voiceHintName.textContent = nameMsg || "";
      voiceHintName.hidden = !nameMsg;
    }
    if (voiceHintPlot) {
      voiceHintPlot.textContent = plotMsg || "";
      voiceHintPlot.hidden = !plotMsg;
    }
  }

  function syncVoiceButtons() {
    var onName = speechTarget === "name";
    var onPlot = speechTarget === "plot";
    if (btnVoiceName) {
      btnVoiceName.classList.toggle("is-listening", onName);
      btnVoiceName.setAttribute("aria-pressed", onName ? "true" : "false");
      var nameLbl = btnVoiceName.querySelector(".sb-voice-btn__txt");
      if (nameLbl) nameLbl.textContent = onName ? "Stop" : "Speak";
    }
    if (btnVoicePlot) {
      btnVoicePlot.classList.toggle("is-listening", onPlot);
      btnVoicePlot.setAttribute("aria-pressed", onPlot ? "true" : "false");
      var plotLbl = btnVoicePlot.querySelector(".sb-voice-btn__txt");
      if (plotLbl) plotLbl.textContent = onPlot ? "Stop listening" : "Speak your idea";
    }
  }

  /**
   * @param {{ preserveVoiceHints?: boolean }} [opts]
   */
  function stopSpeech(opts) {
    var preserveHints = opts && opts.preserveVoiceHints;
    var rec = activeSpeech;
    activeSpeech = null;
    speechTarget = null;
    plotSpeechPrefix = "";
    plotSpeechAccum = "";
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch (e) {}
    }
    syncVoiceButtons();
    if (!preserveHints) setVoiceHint("", "");
  }

  function startNameSpeech() {
    var Rec = getSpeechRecognition();
    if (!Rec || !nameInput) return;
    if (speechTarget === "name") {
      stopSpeech();
      return;
    }
    stopSpeech();
    speechTarget = "name";
    var rec = new Rec();
    rec.lang = "en-GB";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      if (!e.results || !e.results.length) return;
      var t = e.results[0][0].transcript.trim();
      nameInput.value = t.slice(0, 24);
    };
    rec.onerror = function (e) {
      if (e.error === "aborted") return;
      var friendly =
        e.error === "not-allowed"
          ? "Microphone blocked — check browser settings or type instead."
          : e.error === "no-speech"
            ? "Didn’t hear anything. Tap Speak and try again."
            : "Speaking hit a snag. You can type instead.";
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint(friendly, "");
    };
    rec.onend = function () {
      if (activeSpeech !== rec) return;
      activeSpeech = null;
      speechTarget = null;
      plotSpeechPrefix = "";
      plotSpeechAccum = "";
      syncVoiceButtons();
      setVoiceHint("", "");
    };
    activeSpeech = rec;
    syncVoiceButtons();
    setVoiceHint("Listening… say your name", "");
    try {
      rec.start();
    } catch (err) {
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint("Couldn’t start the microphone. Try typing.", "");
    }
  }

  function startPlotSpeech() {
    var Rec = getSpeechRecognition();
    if (!Rec || !plotInput) return;
    if (speechTarget === "plot") {
      stopSpeech();
      return;
    }
    stopSpeech();
    speechTarget = "plot";
    plotSpeechPrefix = plotInput.value;
    plotSpeechAccum = "";
    var rec = new Rec();
    rec.lang = "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var interim = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) plotSpeechAccum += piece;
        else interim += piece;
      }
      var tail = (plotSpeechAccum + interim).trim();
      var base = plotSpeechPrefix.replace(/\s+$/,"");
      var merged = (base && tail ? base + " " + tail : base + tail)
        .replace(/\s+/g, " ")
        .trim();
      plotInput.value = merged.slice(0, 220);
    };
    rec.onerror = function (e) {
      if (e.error === "aborted") return;
      var friendly =
        e.error === "not-allowed"
          ? "Microphone blocked — check settings or type your idea."
          : e.error === "no-speech"
            ? "Didn’t catch that — tap Speak and try again."
            : "Speaking had a problem. Typing still works.";
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint("", friendly);
    };
    rec.onend = function () {
      if (activeSpeech !== rec) return;
      activeSpeech = null;
      speechTarget = null;
      plotSpeechPrefix = "";
      plotSpeechAccum = "";
      syncVoiceButtons();
      setVoiceHint("", "");
    };
    activeSpeech = rec;
    syncVoiceButtons();
    setVoiceHint("", "Listening… talk about your story. Tap Stop when you’re done.");
    try {
      rec.start();
    } catch (err) {
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint("", "Couldn’t start the microphone. Try typing.");
    }
  }

  function initVoiceUi() {
    if (!getSpeechRecognition()) {
      if (btnVoiceName) {
        btnVoiceName.hidden = true;
        btnVoiceName.classList.add("is-unavailable");
      }
      if (btnVoicePlot) {
        btnVoicePlot.hidden = true;
        btnVoicePlot.classList.add("is-unavailable");
      }
      return;
    }
    if (btnVoiceName) {
      btnVoiceName.addEventListener("click", function () { startNameSpeech(); });
    }
    if (btnVoicePlot) {
      btnVoicePlot.addEventListener("click", function () { startPlotSpeech(); });
    }
  }

  /** @type {number} */
  var journeyStep = 0;
  /** @type {string} */
  var selectedChar = "unicorn";
  /** @type {string} */
  var selectedPlace = "beach";
  /** @type {{ title: string, sceneImageUrl?: string|null, pages: { text: string, imageUrl: string|null }[] } | null} */
  var story = null;
  var pageIndex = 0;
  var flipLock = false;

  function applyBookThemingFromStory() {
    if (!book || !story) return;
    var u = story.sceneImageUrl;
    if (u) {
      book.classList.add("sb-book--themed");
      book.style.backgroundImage =
        'url("' + String(u).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '")';
    } else {
      book.classList.remove("sb-book--themed");
      book.style.backgroundImage = "";
    }
  }

  function clearBookTheming() {
    if (!book) return;
    book.classList.remove("sb-book--themed");
    book.style.backgroundImage = "";
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function getOverPageFace() {
    return layerOver ? layerOver.querySelector(".sb-page-leaf__sheet--front .sb-page-face") : null;
  }

  function getUnderPageFace() {
    return layerUnder ? layerUnder.querySelector(".sb-page-face") : null;
  }

  function resetPageLeafTransforms() {
    if (!pageLeaf) return;
    pageLeaf.classList.add("no-transition");
    pageLeaf.classList.remove("is-flipping-forward");
    pageLeaf.classList.remove("is-flipping-back");
    void pageLeaf.offsetWidth;
    pageLeaf.classList.remove("no-transition");
  }

  function fillPageFace(faceRoot, page, displayPageNum) {
    if (!faceRoot) return;
    var art = faceRoot.querySelector(".sb-page__art");
    var img = art ? art.querySelector("img") : null;
    var textEl = faceRoot.querySelector(".sb-page__text");
    var numInArt = art ? art.querySelector(".sb-page__num") : null;
    var foot = faceRoot.querySelector(".sb-page-foot");
    var total = story && story.pages ? story.pages.length : 0;
    if (!page) {
      if (textEl) textEl.textContent = "";
      if (art) art.hidden = true;
      if (img) img.removeAttribute("src");
      if (numInArt) numInArt.textContent = "";
      if (foot) {
        foot.textContent = "";
        foot.hidden = true;
      }
      faceRoot.classList.add("sb-page-face--text-only");
      return;
    }
    if (textEl) textEl.textContent = page.text;
    if (art && img) {
      if (page.imageUrl) {
        img.src = page.imageUrl;
        img.alt = "";
        art.hidden = false;
        faceRoot.classList.remove("sb-page-face--text-only");
        if (numInArt && displayPageNum && total) {
          numInArt.textContent = "Page " + displayPageNum + " of " + total;
        } else if (numInArt) numInArt.textContent = "";
        if (foot) {
          foot.textContent = "";
          foot.hidden = true;
        }
      } else {
        art.hidden = true;
        img.removeAttribute("src");
        faceRoot.classList.add("sb-page-face--text-only");
        if (numInArt) numInArt.textContent = "";
        if (foot && displayPageNum && total) {
          foot.textContent = "Page " + displayPageNum + " of " + total;
          foot.hidden = false;
        } else if (foot) {
          foot.textContent = "";
          foot.hidden = true;
        }
      }
    }
  }

  function renderBookSpread() {
    if (!story) return;
    fillPageFace(getOverPageFace(), story.pages[pageIndex], pageIndex + 1);
    var next = story.pages[pageIndex + 1];
    fillPageFace(
      getUnderPageFace(),
      next !== undefined ? next : null,
      next !== undefined ? pageIndex + 2 : 0
    );
  }

  function updatePagerHints() {
    if (!story) return;
    var line = "Page " + (pageIndex + 1) + " of " + story.pages.length;
    if (pagerLive) {
      pagerLive.textContent = line;
    }
    if (btnPrev) btnPrev.disabled = pageIndex === 0 || flipLock;
    if (btnNext) btnNext.disabled = pageIndex >= story.pages.length - 1 || flipLock;
  }

  function completeFlipForward() {
    if (!story || !pageLeaf) return;
    pageIndex++;
    pageLeaf.classList.add("no-transition");
    pageLeaf.classList.remove("is-flipping-forward");
    void pageLeaf.offsetWidth;
    pageLeaf.classList.remove("no-transition");
    renderBookSpread();
    flipLock = false;
    updatePagerHints();
  }

  function completeFlipBack() {
    if (!story || !pageLeaf) return;
    pageIndex--;
    pageLeaf.classList.add("no-transition");
    pageLeaf.classList.remove("is-flipping-back");
    void pageLeaf.offsetWidth;
    pageLeaf.classList.remove("no-transition");
    renderBookSpread();
    flipLock = false;
    updatePagerHints();
  }

  function goNextPage() {
    if (!story || flipLock || pageIndex >= story.pages.length - 1) return;
    if (prefersReducedMotion()) {
      pageIndex++;
      renderBookSpread();
      updatePagerHints();
      return;
    }
    flipLock = true;
    updatePagerHints();
    fillPageFace(getUnderPageFace(), story.pages[pageIndex + 1], pageIndex + 2);
    if (!pageLeaf) {
      pageIndex++;
      renderBookSpread();
      flipLock = false;
      updatePagerHints();
      return;
    }
    pageLeaf.classList.remove("is-flipping-back");
    pageLeaf.classList.remove("no-transition");
    pageLeaf.classList.add("is-flipping-forward");
    var t = window.setTimeout(function () {
      pageLeaf.removeEventListener("transitionend", onEnd);
      completeFlipForward();
    }, 950);
    function onEnd(e) {
      if (e.target !== pageLeaf || e.propertyName !== "transform") return;
      window.clearTimeout(t);
      pageLeaf.removeEventListener("transitionend", onEnd);
      completeFlipForward();
    }
    pageLeaf.addEventListener("transitionend", onEnd);
  }

  function goPrevPage() {
    if (!story || flipLock || pageIndex <= 0) return;
    if (prefersReducedMotion()) {
      pageIndex--;
      renderBookSpread();
      updatePagerHints();
      return;
    }
    flipLock = true;
    updatePagerHints();
    fillPageFace(getUnderPageFace(), story.pages[pageIndex - 1], pageIndex);
    if (!pageLeaf) {
      pageIndex--;
      renderBookSpread();
      flipLock = false;
      updatePagerHints();
      return;
    }
    pageLeaf.classList.remove("is-flipping-forward");
    pageLeaf.classList.remove("no-transition");
    pageLeaf.classList.add("is-flipping-back");
    var t = window.setTimeout(function () {
      pageLeaf.removeEventListener("transitionend", onEnd);
      completeFlipBack();
    }, 950);
    function onEnd(e) {
      if (e.target !== pageLeaf || e.propertyName !== "transform") return;
      window.clearTimeout(t);
      pageLeaf.removeEventListener("transitionend", onEnd);
      completeFlipBack();
    }
    pageLeaf.addEventListener("transitionend", onEnd);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function sanitizeFilename(raw) {
    var s = String(raw || "my-story-book")
      .trim()
      .replace(/[^\w\s\-']/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64)
      .toLowerCase();
    return s || "my-story-book";
  }

  function tryFetchImageDataUrl(url) {
    if (!url) return Promise.resolve(null);
    return fetch(url, { mode: "cors", credentials: "omit" })
      .then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () {
            resolve(fr.result);
          };
          fr.onerror = function () {
            reject(new Error("read"));
          };
          fr.readAsDataURL(blob);
        });
      })
      .catch(function () {
        return null;
      });
  }

  function fetchAllPageDataUrls() {
    if (!story || !story.pages.length) return Promise.resolve([]);
    return Promise.all(
      story.pages.map(function (p) {
        return tryFetchImageDataUrl(p.imageUrl || "");
      })
    );
  }

  var SHELF_STORAGE_KEY = "jigsawKids_storybookShelf_v1";
  var SHELF_MAX_BOOKS = 14;

  function loadShelf() {
    try {
      var raw = localStorage.getItem(SHELF_STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveShelf(list) {
    localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(list));
  }

  function hashFromString(str) {
    var h = 2166136261;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function spineMeta(bookId, title) {
    var h = hashFromString(bookId + ":" + title);
    return {
      hue: h % 360,
      pat: h % 4,
      hPx: 112 + (h % 40),
      wPx: 21 + (h % 16),
    };
  }

  function spineLabel(title) {
    var t = String(title || "Story").trim();
    if (t.length > 22) return t.slice(0, 21) + "…";
    return t;
  }

  function addStoryToShelfFromData(
    title,
    pages,
    dataUrls,
    sceneDataUrl,
    sceneUrlFallback
  ) {
    var list = loadShelf();
    var id = "b" + Date.now() + "-" + ((Math.random() * 1e6) | 0);
    var storedPages = pages.map(function (p, i) {
      return {
        text: p.text,
        imageDataUrl: dataUrls[i] || null,
        imageUrlFallback: p.imageUrl || null,
      };
    });
    list.unshift({
      id: id,
      title: title,
      savedAt: new Date().toISOString(),
      pages: storedPages,
      sceneDataUrl: sceneDataUrl || null,
      sceneUrlFallback: sceneUrlFallback || null,
    });
    while (list.length > SHELF_MAX_BOOKS) {
      list.pop();
    }
    saveShelf(list);
  }

  function removeShelfBook(bookId) {
    var list = loadShelf().filter(function (b) {
      return b.id !== bookId;
    });
    saveShelf(list);
    renderShelf();
  }

  function openShelfBook(bookId) {
    var list = loadShelf();
    var item = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === bookId) {
        item = list[i];
        break;
      }
    }
    if (!item || !item.pages || !item.pages.length) return;
    story = {
      title: item.title,
      sceneImageUrl: item.sceneDataUrl || item.sceneUrlFallback || null,
      pages: item.pages.map(function (p) {
        return {
          text: p.text,
          imageUrl: p.imageDataUrl || p.imageUrlFallback || null,
        };
      }),
    };
    pageIndex = 0;
    showBook();
  }

  function renderShelf() {
    if (!shelfEl) return;
    shelfEl.textContent = "";
    var list = loadShelf();
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "sb-library__empty";
      empty.textContent =
        "No books on the shelf yet. When you finish a story, tap “Put on my shelf”.";
      shelfEl.appendChild(empty);
      return;
    }
    for (var j = 0; j < list.length; j++) {
      (function (item) {
        var meta = spineMeta(item.id, item.title);
        var wrap = document.createElement("div");
        wrap.className = "sb-spine-wrap";
        var spine = document.createElement("button");
        spine.type = "button";
        spine.className = "sb-spine sb-spine--pat" + meta.pat;
        spine.style.setProperty("--sb-h", String(meta.hue));
        spine.style.height = meta.hPx / 16 + "rem";
        spine.style.width = meta.wPx / 16 + "rem";
        spine.setAttribute("role", "listitem");
        spine.setAttribute("aria-label", "Open book: " + item.title);
        var span = document.createElement("span");
        span.className = "sb-spine__title";
        span.textContent = spineLabel(item.title);
        spine.appendChild(span);
        spine.addEventListener("click", function () {
          openShelfBook(item.id);
        });
        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "sb-spine__remove";
        rm.setAttribute("aria-label", "Remove from shelf: " + item.title);
        rm.textContent = "×";
        rm.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          removeShelfBook(item.id);
        });
        wrap.appendChild(spine);
        wrap.appendChild(rm);
        shelfEl.appendChild(wrap);
      })(list[j]);
    }
  }

  function saveBookToShelf() {
    if (!story || !story.pages.length || !btnShelf) return;
    var label = btnShelf.textContent;
    btnShelf.disabled = true;
    btnShelf.textContent = "Saving…";
    fetchAllPageDataUrls()
      .then(function (dataUrls) {
        return tryFetchImageDataUrl(story.sceneImageUrl || "").then(function (sceneData) {
          return { dataUrls: dataUrls, sceneData: sceneData };
        });
      })
      .then(function (o) {
        try {
          addStoryToShelfFromData(
            story.title,
            story.pages,
            o.dataUrls,
            o.sceneData,
            story.sceneImageUrl || null
          );
          renderShelf();
        } catch (e) {
          window.alert("Couldn’t save — storage might be full. Try downloading instead.");
        }
      })
      .catch(function () {
        window.alert("Couldn’t prepare pictures for the shelf. Try again.");
      })
      .finally(function () {
        btnShelf.disabled = false;
        btnShelf.textContent = label;
      });
  }

  function buildStandaloneBookHtml(title, pages, dataUrls, sceneDataUrl) {
    var escTitle = escapeHtml(title);
    var bodyRule = sceneDataUrl
      ? "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;color:#500724;background-image:url(" +
        JSON.stringify(sceneDataUrl) +
        ");background-size:cover;background-position:center top;background-attachment:fixed;background-color:#fce7f3}" +
        "body::before{content:'';position:fixed;inset:0;background:linear-gradient(180deg,rgba(253,242,248,.55)0%,rgba(253,242,248,.08)45%,rgba(252,231,243,.48)100%);pointer-events:none;z-index:0}"
      : "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;background:linear-gradient(165deg,#fce7f3,#fdf2f8 45%,#e9d5ff);color:#500724}";
    var wrapExtra = sceneDataUrl ? ";position:relative;z-index:1" : "";
    var articles = [];
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var art = "";
      if (p.imageUrl) {
        var src = dataUrls[i] || escapeAttr(p.imageUrl);
        art =
          '<div class="sbdl-art"><img src="' +
          src +
          '" alt="Illustration for page ' +
          (i + 1) +
          '" /></div>';
      }
      articles.push(
        '<article class="sbdl-page" id="p-' +
          (i + 1) +
          '"><p class="sbdl-k">Page ' +
          (i + 1) +
          "</p>" +
          art +
          '<p class="sbdl-t">' +
          escapeHtml(p.text).replace(/\n/g, "<br/>") +
          "</p></article>"
      );
    }
    var css =
      bodyRule +
      ".sbdl-wrap{max-width:28rem;margin:0 auto;padding:1.25rem 1rem 2.5rem" +
      wrapExtra +
      "}" +
      "h1{font-size:clamp(1.35rem,4vw,1.65rem);text-align:center;color:#9d174d;margin:0 0 1.25rem;font-weight:800;}" +
      ".sbdl-page{background:#fff;border-radius:18px;padding:1rem 1rem 1.15rem;margin:0 0 1rem;box-shadow:0 6px 22px rgba(157,23,77,.12);border:2px solid rgba(244,114,182,.35);}" +
      ".sbdl-k{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#be185d;margin:0 0 .5rem;}" +
      ".sbdl-art{border-radius:14px;overflow:hidden;margin:0 0 .85rem;background:#fdf2f8;}" +
      ".sbdl-art img{display:block;width:100%;height:auto}" +
      ".sbdl-t{font-size:1.05rem;font-weight:700;line-height:1.55;margin:0}" +
      ".sbdl-foot{margin-top:1.75rem;font-size:.78rem;font-weight:700;color:#9f1239;text-align:center;line-height:1.45;}" +
      "@media print{.sbdl-page{break-inside:avoid}}";
    return (
      '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>' +
      escTitle +
      "</title><style>" +
      css +
      '</style></head><body><div class="sbdl-wrap"><h1>' +
      escTitle +
      "</h1>" +
      articles.join("") +
      '<p class="sbdl-foot">Saved from your Sofia&rsquo;s Game Room storybook. Keep this file to read your story any time (works offline when pictures are embedded).</p></div></body></html>'
    );
  }

  function downloadStoryBook() {
    if (!story || !story.pages.length || !btnDownload) return;
    var origLabel = btnDownload.textContent;
    btnDownload.disabled = true;
    btnDownload.textContent = "Preparing…";
    Promise.all([
      fetchAllPageDataUrls(),
      tryFetchImageDataUrl(story.sceneImageUrl || ""),
    ])
      .then(function (arr) {
        var html = buildStandaloneBookHtml(story.title, story.pages, arr[0], arr[1]);
        var blob = new Blob([html], { type: "text/html;charset=utf-8" });
        var u = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = u;
        a.download = sanitizeFilename(story.title) + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(u);
      })
      .catch(function () {
        window.alert("Couldn’t build the file. Try again in a moment.");
      })
      .finally(function () {
        btnDownload.disabled = false;
        btnDownload.textContent = origLabel;
      });
  }

  function setError(msg) {
    if (!msg) {
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
      if (modalErr) {
        modalErr.hidden = true;
        modalErr.textContent = "";
      }
      return;
    }
    var onModal = modal && !modal.hidden;
    if (errEl) {
      errEl.hidden = onModal;
      if (!onModal) errEl.textContent = msg;
      else errEl.textContent = "";
    }
    if (modalErr) {
      modalErr.hidden = !onModal;
      if (onModal) modalErr.textContent = msg;
      else modalErr.textContent = "";
    }
  }

  function storybookSlug(c) {
    var def = "clever-service";
    if (!c || !c.storybookEdgeSlug) return def;
    var s = String(c.storybookEdgeSlug).trim().replace(/^\/+|\/+$/g, "");
    if (!s) return def;
    var safe = s.replace(/[^a-zA-Z0-9\-_]/g, "");
    return safe || def;
  }

  function functionUrl() {
    var c =
      typeof window.SCORE_CONFIG !== "undefined"
        ? window.SCORE_CONFIG
        : typeof window.SCORE_SYNC !== "undefined"
          ? window.SCORE_SYNC
          : null;
    var base = c && c.supabaseUrl ? String(c.supabaseUrl).replace(/\/$/, "") : "";
    if (!base) return "";
    return base + "/functions/v1/" + storybookSlug(c);
  }

  function anonKey() {
    var c =
      typeof window.SCORE_CONFIG !== "undefined"
        ? window.SCORE_CONFIG
        : typeof window.SCORE_SYNC !== "undefined"
          ? window.SCORE_SYNC
          : null;
    return c && c.supabaseAnonKey ? String(c.supabaseAnonKey) : "";
  }

  function refreshCharacterChips() {
    if (!charRow) return;
    Array.prototype.forEach.call(charRow.querySelectorAll(".sb-chip"), function (el, i) {
      var on = CHARACTERS[i].id === selectedChar;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function refreshPlaceChips() {
    if (!placeRow) return;
    Array.prototype.forEach.call(placeRow.querySelectorAll(".sb-chip"), function (el, i) {
      var on = PLACES[i].id === selectedPlace;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function buildChipRows() {
    if (charRow) {
      charRow.textContent = "";
      CHARACTERS.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sb-chip";
        b.textContent = item.label;
        b.setAttribute("role", "radio");
        b.addEventListener("click", function () {
          selectedChar = item.id;
          refreshCharacterChips();
        });
        charRow.appendChild(b);
      });
      refreshCharacterChips();
    }
    if (placeRow) {
      placeRow.textContent = "";
      PLACES.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sb-chip";
        b.textContent = item.label;
        b.setAttribute("role", "radio");
        b.addEventListener("click", function () {
          selectedPlace = item.id;
          refreshPlaceChips();
        });
        placeRow.appendChild(b);
      });
      refreshPlaceChips();
    }
  }

  function renderProgress() {
    if (!progressEl) return;
    progressEl.textContent = "";
    for (var i = 0; i < 5; i++) {
      var d = document.createElement("span");
      d.className = "sb-dot";
      if (i < journeyStep) d.classList.add("is-done");
      if (i === journeyStep) d.classList.add("is-current");
      progressEl.appendChild(d);
    }
  }

  function goToStep(n) {
    if (n !== journeyStep) stopSpeech();
    journeyStep = Math.max(0, Math.min(4, n));
    if (stepKicker) stepKicker.textContent = "Step " + (journeyStep + 1) + " of 5";
    if (stepHeading) stepHeading.textContent = STEP_HEADINGS[journeyStep] || "";
    renderProgress();
    var panelEls = document.querySelectorAll("#sbModal .sb-panel");
    Array.prototype.forEach.call(panelEls, function (p) {
      var idx = parseInt(p.getAttribute("data-panel") || "0", 10);
      var on = idx === journeyStep;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });
    if (journeyStep === 1 && nameInput) {
      window.requestAnimationFrame(function () {
        nameInput.focus();
      });
    }
    if (journeyStep === 4 && plotInput) {
      window.requestAnimationFrame(function () {
        plotInput.focus();
      });
    }
  }

  function openJourney() {
    var m = modal || document.getElementById("sbModal");
    if (m) {
      m.classList.remove("is-hidden");
      m.removeAttribute("hidden");
      m.hidden = false;
      m.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("sb-modal-open");
    setError("");
    goToStep(0);
    if (stepHeading) {
      try {
        stepHeading.focus();
      } catch (e1) {}
    }
  }

  function closeJourney() {
    stopSpeech();
    var m = modal || document.getElementById("sbModal");
    if (m) {
      m.classList.add("is-hidden");
      m.hidden = true;
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("sb-modal-open");
  }

  function showWizard() {
    story = null;
    pageIndex = 0;
    flipLock = false;
    resetPageLeafTransforms();
    closeJourney();
    if (landing) {
      landing.classList.remove("is-hidden");
      landing.hidden = false;
    }
    if (book) {
      book.classList.add("is-hidden");
      book.hidden = true;
    }
    clearBookTheming();
    if (nameInput) nameInput.value = "";
    if (plotInput) plotInput.value = "";
    goToStep(0);
    setError("");
    renderShelf();
  }

  function showBook() {
    if (!story || !story.pages.length) return;
    closeJourney();
    if (landing) {
      landing.classList.add("is-hidden");
      landing.hidden = true;
    }
    if (book) {
      book.classList.remove("is-hidden");
      book.hidden = false;
    }
    if (bookTitle) bookTitle.textContent = story.title;
    applyBookThemingFromStory();
    resetPageLeafTransforms();
    renderBookSpread();
    updatePagerHints();
  }

  function setBusy(on) {
    if (!busy) return;
    if (on) {
      busy.classList.remove("is-hidden");
      busy.hidden = false;
    } else {
      busy.classList.add("is-hidden");
      busy.hidden = true;
    }
  }

  buildChipRows();
  initVoiceUi();
  renderShelf();

  if (appEl) {
    appEl.addEventListener(
      "click",
      function (e) {
        if (!e.target || !e.target.closest) return;
        if (e.target.closest("#sbStartJourney")) {
          e.preventDefault();
          openJourney();
        }
      },
      false
    );
  } else if (btnStart) {
    btnStart.addEventListener("click", function (e) {
      e.preventDefault();
      openJourney();
    });
  }

  var btnNext0 = document.getElementById("sbNext0");
  var btnBack1 = document.getElementById("sbBack1");
  var btnNext1 = document.getElementById("sbNext1");
  var btnBack2 = document.getElementById("sbBack2");
  var btnNext2 = document.getElementById("sbNext2");
  var btnBack3 = document.getElementById("sbBack3");
  var btnNext3 = document.getElementById("sbNext3");
  var btnBack4 = document.getElementById("sbBack4");

  if (btnNext0) btnNext0.addEventListener("click", function () { goToStep(1); });
  if (btnBack1) btnBack1.addEventListener("click", function () { goToStep(0); });
  if (btnNext1) btnNext1.addEventListener("click", function () { goToStep(2); });
  if (btnBack2) btnBack2.addEventListener("click", function () { goToStep(1); });
  if (btnNext2) btnNext2.addEventListener("click", function () { goToStep(3); });
  if (btnBack3) btnBack3.addEventListener("click", function () { goToStep(2); });
  if (btnNext3) btnNext3.addEventListener("click", function () { goToStep(4); });
  if (btnBack4) btnBack4.addEventListener("click", function () { goToStep(3); });

  if (btnGen) {
    btnGen.addEventListener("click", function () {
      setError("");
      var url = functionUrl();
      var key = anonKey();
      if (!url || !key) {
        setError("Story server isn’t configured. Check score-config (Supabase URL + anon key).");
        return;
      }
      var childName = nameInput ? nameInput.value.trim() : "";
      var plotHint = plotInput ? plotInput.value.trim() : "";
      setBusy(true);
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          apikey: key,
        },
        body: JSON.stringify({
          childName: childName || "Friend",
          character: selectedChar,
          place: selectedPlace,
          plotHint: plotHint,
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, status: r.status, body: j };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            var msg =
              out.body && out.body.error === "server_missing_openai"
                ? "OpenAI isn’t connected yet. A grown-up needs to set OPENAI_API_KEY on the story function."
                : out.body && out.body.error
                  ? "Couldn’t make the book (" + out.body.error + ")."
                  : "Couldn’t make the book (error " + out.status + ").";
            setError(msg);
            return;
          }
          story = {
            title: out.body.title,
            pages: out.body.pages || [],
            sceneImageUrl: out.body.sceneImageUrl || null,
          };
          pageIndex = 0;
          showBook();
        })
        .catch(function () {
          var u = functionUrl();
          setError(
            u
              ? "Can’t reach the story server (" +
                u +
                "). Check connection, Supabase function + OPENAI_API_KEY, and storybookEdgeSlug in score-config if the URL slug changed."
              : "Story server isn’t configured. Check score-config (Supabase URL + anon key)."
          );
        })
        .finally(function () {
          setBusy(false);
        });
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      goPrevPage();
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", function () {
      goNextPage();
    });
  }
  if (btnNew) {
    btnNew.addEventListener("click", function () {
      showWizard();
    });
  }
  if (btnDownload) {
    btnDownload.addEventListener("click", function () {
      downloadStoryBook();
    });
  }
  if (btnShelf) {
    btnShelf.addEventListener("click", function () {
      saveBookToShelf();
    });
  }

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
