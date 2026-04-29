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
  var bookTitleInput = document.getElementById("sbBookTitle");
  var plotInput = document.getElementById("sbPlot");
  var charRow = document.getElementById("sbCharacters");
  var gamePeopleRow = document.getElementById("sbGamePeople");
  var gamePeopleBlock = document.getElementById("sbGamePeopleBlock");
  var placeRow = document.getElementById("sbPlaces");
  var errEl = document.getElementById("sbError");
  var modalErr = document.getElementById("sbModalError");
  var progressEl = document.getElementById("sbProgress");
  var stepKicker = document.getElementById("sbStepKicker");
  var stepHeading = document.getElementById("sbStepHeading");
  var btnStart = document.getElementById("sbStartJourney");
  var btnGen = document.getElementById("sbGenerate");
  var readerHeading = document.getElementById("sbBookHeading");
  var spreadText = document.getElementById("sbSpreadText");
  var spreadMeta = document.getElementById("sbSpreadMeta");
  var spreadArt = document.getElementById("sbSpreadArt");
  var spreadArtImg = document.getElementById("sbSpreadArtImg");
  var spreadArtNum = document.getElementById("sbSpreadArtNum");
  var spreadInnerEl = document.getElementById("sbFlipSpreadInner");
  var spreadArtBg = document.getElementById("sbSpreadArtBg");
  var spreadArtCover = document.getElementById("sbSpreadArtCover");
  var spreadRightArtImg = document.getElementById("sbSpreadRightArt");
  var readerStack = document.getElementById("sbReaderStack");
  var readerPages = document.getElementById("sbReaderPages");
  var btnOpenCover = document.getElementById("sbOpenCover");
  var btnCloseBook = document.getElementById("sbCloseBook");
  var coverTitle = document.getElementById("sbCoverTitle");
  var btnPrev = document.getElementById("sbPrev");
  var btnNext = document.getElementById("sbNext");
  var pagerLive = document.getElementById("sbPagerLive");
  /** Wide screens (tablets / large landscape): edge-to-edge reader + fixed overlays. */
  var immersiveReaderMq =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(min-width: 768px)")
      : { matches: false, addEventListener: function () {} };
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
  var spreadIndex = 0;
  /** @type {boolean} */
  var spreadAnimLock = false;
  var coverOpenGeneration = 0;

  function prefersReducedSpreadMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isTransformTransitionProperty(name) {
    return name === "transform" || name === "-webkit-transform";
  }

  function clearSpreadTurnClasses() {
    if (spreadInnerEl) {
      spreadInnerEl.classList.remove(
        "sb-flip-spread__inner--turn-out-next",
        "sb-flip-spread__inner--turn-out-prev",
        "sb-flip-spread__inner--turn-in-next",
        "sb-flip-spread__inner--turn-in-prev",
        "sb-flip-spread__inner--fade-out",
        "sb-flip-spread__inner--fade-in"
      );
    }
  }

  function rebuildFlipbookSheets() {
    if (!story || !story.pages.length) return;
    if (spreadInnerEl) {
      spreadInnerEl.classList.add("sb-flip-spread__inner--ref-flipbook");
    }
  }

  function navigateSpreadInstant(delta) {
    spreadAnimLock = false;
    spreadIndex += delta;
    var nSpr = numSpreads();
    spreadIndex = Math.max(0, Math.min(spreadIndex, nSpr - 1));
    applySpreadContent();
  }

  function navigateSpread(delta) {
    if (!story) return;
    if (book && book.classList.contains("sb-book--cover-visible")) return;
    if (delta > 0 && spreadIndex >= numSpreads() - 1) return;
    if (delta < 0 && spreadIndex <= 0) return;
    navigateSpreadInstant(delta);
  }

  function setSpreadNavBusy(locked) {
    if (!btnPrev || !btnNext) return;
    if (locked) {
      btnPrev.disabled = true;
      btnNext.disabled = true;
    } else {
      updatePagerHints();
    }
  }

  function syncCloseBookButton() {
    if (!btnCloseBook) return;
    var opening =
      readerStack &&
      readerStack.classList.contains("sb-reader-stack--opening");
    var readerOpen =
      readerStack &&
      readerStack.classList.contains("sb-reader-stack--open");
    var coverShowing =
      book && book.classList.contains("sb-book--cover-visible");
    var show =
      book &&
      story &&
      readerOpen &&
      !coverShowing &&
      !opening;
    if (show) {
      btnCloseBook.hidden = false;
      btnCloseBook.removeAttribute("aria-hidden");
    } else {
      btnCloseBook.hidden = true;
      btnCloseBook.setAttribute("aria-hidden", "true");
    }
  }

  function closeBookCover() {
    if (!book || !readerStack) return;
    if (book.classList.contains("sb-book--cover-visible")) return;
    if (
      !readerStack.classList.contains("sb-reader-stack--open") &&
      !readerStack.classList.contains("sb-reader-stack--opening")
    ) {
      return;
    }

    coverOpenGeneration += 1;

    spreadAnimLock = false;
    clearSpreadTurnClasses();
    setSpreadNavBusy(false);

    readerStack.classList.remove(
      "sb-reader-stack--open",
      "sb-reader-stack--opening"
    );
    book.classList.add("sb-book--cover-visible");
    if (readerPages) readerPages.setAttribute("aria-hidden", "true");
    if (btnOpenCover) {
      btnOpenCover.removeAttribute("aria-hidden");
      btnOpenCover.removeAttribute("tabindex");
    }
    syncCloseBookButton();
    updatePagerHints();
  }

  function openBookCover() {
    if (!book || !book.classList.contains("sb-book--cover-visible")) return;
    if (!readerStack) return;

    function finishOpen() {
      readerStack.classList.add("sb-reader-stack--open");
      readerStack.classList.remove("sb-reader-stack--opening");
      book.classList.remove("sb-book--cover-visible");
      if (readerPages) readerPages.removeAttribute("aria-hidden");
      if (btnOpenCover) {
        btnOpenCover.setAttribute("aria-hidden", "true");
        btnOpenCover.tabIndex = -1;
      }
      syncCloseBookButton();
      updatePagerHints();
    }

    if (prefersReducedSpreadMotion()) {
      finishOpen();
      return;
    }

    coverOpenGeneration += 1;
    var myGen = coverOpenGeneration;
    var pivotEl = document.getElementById("sbCoverPivot");
    var finished = false;

    function done() {
      if (myGen !== coverOpenGeneration || finished) return;
      finished = true;
      if (pivotEl) {
        pivotEl.removeEventListener("transitionend", onPivotEnd);
      }
      finishOpen();
    }

    function onPivotEnd(ev) {
      if (!pivotEl || ev.target !== pivotEl) return;
      if (!isTransformTransitionProperty(ev.propertyName || "")) return;
      done();
    }

    readerStack.classList.add("sb-reader-stack--opening");
    if (pivotEl) {
      pivotEl.addEventListener("transitionend", onPivotEnd);
    }
    window.setTimeout(done, 1350);
  }

  function resetBookCoverForWizard() {
    coverOpenGeneration += 1;
    if (readerStack) {
      readerStack.classList.remove(
        "sb-reader-stack--open",
        "sb-reader-stack--opening"
      );
    }
    if (book) book.classList.remove("sb-book--cover-visible");
    if (readerPages) readerPages.setAttribute("aria-hidden", "true");
    if (btnOpenCover) {
      btnOpenCover.removeAttribute("aria-hidden");
      btnOpenCover.removeAttribute("tabindex");
    }
    syncCloseBookButton();
  }

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

  function numSpreads() {
    return story && story.pages ? Math.floor(story.pages.length / 2) : 0;
  }

  /** Local preview only — same shape as OpenAI output (pairs: text, then picture). */
  function buildSampleStory() {
    var imgs = [
      "images/colouring/template-winged-unicorn.png",
      "images/colouring/template-dino-hill.png",
      "images/character-freya.png",
      "images/math-race-dino.png",
      "images/colouring/template-mermaid.png",
      "images/character-sofia-running.png",
    ];
    var texts = [
      "Once upon a time, a small fox named Mira found a silver star glinting in the tall grass near the edge of the woods.",
      "The star whispered that it had tumbled from the sky and needed to be home before sunrise. Mira promised to help.",
      "She rolled the star gently in a leaf-boat down the brook, past sleepy ducks and sparkling stones.",
      "At the hill of three oaks, a wise crow pointed to the clearest patch of night where the sky looked soft as velvet.",
      "Mira tossed the star as high as she could. It caught a breeze and rose — tiny at first, then bright again.",
      "By morning the sky was ordinary blue, but Mira knew the star was safe. She curled up in her den, proud and cosy.",
    ];
    var pages = [];
    for (var s = 0; s < 6; s++) {
      pages.push({ text: texts[s], imageUrl: null });
      pages.push({ text: "", imageUrl: imgs[s] });
    }
    return {
      title: "Mira and the fallen star (sample)",
      sceneImageUrl: null,
      pages: pages,
    };
  }

  function openSampleBook() {
    story = buildSampleStory();
    spreadIndex = 0;
    showBook();
  }

  function writeSpreadTextMetaFromStory() {
    if (!story || !spreadText) return;
    var n = numSpreads();
    if (n < 1) return;
    spreadIndex = Math.max(0, Math.min(spreadIndex, n - 1));
    var i = spreadIndex * 2;
    var leftP = story.pages[i];
    spreadText.textContent = leftP ? leftP.text : "";
    var pLo = i + 1;
    var pHi = i + 2;
    if (spreadMeta) {
      spreadMeta.textContent =
        "Spread " + (spreadIndex + 1) + " of " + n + " · pages " + pLo + "–" + pHi;
    }
  }

  function applySpreadContent() {
    if (!story || !spreadText) return;
    var n = numSpreads();
    if (n < 1) return;
    spreadIndex = Math.max(0, Math.min(spreadIndex, n - 1));
    var i = spreadIndex * 2;
    writeSpreadTextMetaFromStory();
    var rightP = story.pages[i + 1];
    var pLo = i + 1;
    var pHi = i + 2;
    /* Illustration fills right column (#sbSpreadRightArt); legacy hidden nodes kept in sync if present */
    if (rightP && rightP.imageUrl) {
      var u = String(rightP.imageUrl);
      if (spreadArtImg) {
        spreadArtImg.src = u;
        spreadArtImg.alt = "Illustration for pages " + pLo + "–" + pHi;
        spreadArtImg.referrerPolicy = "no-referrer";
      }
      if (spreadArt) spreadArt.classList.remove("is-empty");
      if (spreadArtBg) {
        spreadArtBg.style.backgroundImage = "url(" + JSON.stringify(u) + ")";
      }
      if (spreadArtCover) {
        spreadArtCover.src = u;
        spreadArtCover.alt = "";
        spreadArtCover.referrerPolicy = "no-referrer";
      }
      if (spreadRightArtImg) {
        spreadRightArtImg.hidden = false;
        spreadRightArtImg.removeAttribute("hidden");
        spreadRightArtImg.src = u;
        spreadRightArtImg.alt = "Illustration for pages " + pLo + "–" + pHi;
        spreadRightArtImg.referrerPolicy = "no-referrer";
      }
      if (spreadInnerEl && spreadInnerEl.dataset) {
        spreadInnerEl.dataset.sbArtUrl = u;
      }
      if (spreadInnerEl) {
        spreadInnerEl.classList.add("sb-flip-spread__inner--has-art");
      }
      if (spreadArtNum) {
        spreadArtNum.textContent =
          "Pages " + pLo + "–" + pHi + " of " + story.pages.length;
      }
    } else {
      if (spreadArtImg) spreadArtImg.removeAttribute("src");
      if (spreadArt) spreadArt.classList.add("is-empty");
      if (spreadArtBg) spreadArtBg.style.backgroundImage = "";
      if (spreadArtCover) {
        spreadArtCover.removeAttribute("src");
        spreadArtCover.alt = "";
      }
      if (spreadRightArtImg) {
        spreadRightArtImg.removeAttribute("src");
        spreadRightArtImg.alt = "";
        spreadRightArtImg.hidden = true;
      }
      if (spreadInnerEl && spreadInnerEl.dataset && spreadInnerEl.dataset.sbArtUrl) {
        delete spreadInnerEl.dataset.sbArtUrl;
      }
      if (spreadInnerEl) {
        spreadInnerEl.classList.remove("sb-flip-spread__inner--has-art");
      }
      if (spreadArtNum) {
        spreadArtNum.textContent = rightP ? "Drawing missing" : "";
      }
    }
    updatePagerHints();
  }

  function renderSpread() {
    rebuildFlipbookSheets();
    applySpreadContent();
  }

  function updatePagerHints() {
    if (!story) return;
    if (spreadAnimLock) {
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      return;
    }
    if (book && book.classList.contains("sb-book--cover-visible")) {
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      return;
    }
    var n = numSpreads();
    var si = spreadIndex;
    var pLo = si * 2 + 1;
    var pHi = si * 2 + 2;
    if (pagerLive) {
      pagerLive.textContent =
        "Spread " + (si + 1) + " of " + n + " — pages " + pLo + "–" + pHi + " of " + story.pages.length;
    }
    if (btnPrev) btnPrev.disabled = si <= 0;
    if (btnNext) btnNext.disabled = si >= n - 1;
  }

  function goNextPage() {
    navigateSpread(1);
  }

  function goPrevPage() {
    navigateSpread(-1);
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
    return fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
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
    if (t.length > 44) return t.slice(0, 42) + "…";
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
    spreadIndex = 0;
    showBook();
  }

  /**
   * First illustration on the shelf cover (persisted base64 wins over remote CDN URL).
   * @returns {{ src: string, pageIndex: number }}
   */
  function firstShelfCoverMeta(item) {
    if (!item.pages || !item.pages.length) return { src: "", pageIndex: -1 };
    for (var i = 0; i < item.pages.length; i++) {
      var p = item.pages[i];
      var du = String(p.imageDataUrl || "").trim();
      var hu = String(p.imageUrlFallback || "").trim();
      var src = du || hu;
      if (src) return { src: src, pageIndex: i };
    }
    return { src: "", pageIndex: -1 };
  }

  function persistShelfPageDataUrl(bookId, pageIdx, dataUrl) {
    var list = loadShelf();
    for (var bi = 0; bi < list.length; bi++) {
      if (list[bi].id !== bookId) continue;
      var pages = list[bi].pages;
      if (!pages || !pages[pageIdx]) continue;
      pages[pageIdx].imageDataUrl = dataUrl;
      saveShelf(list);
      break;
    }
  }

  var SHELF_COVERS_PER_TIER = 4;

  function composeHardbackShelfFace(face, meta, rawTitle, imgElOpt) {
    var titleShown = spineLabel(rawTitle);
    face.textContent = "";
    var shell = document.createElement("span");
    shell.className = "sb-cover-card__hardback";
    var cloth = document.createElement("span");
    cloth.className =
      "sb-cover-card__cloth sb-cover-card__cloth--pat" + String(meta.pat);
    cloth.style.setProperty("--sb-h", String(meta.hue));
    if (imgElOpt) {
      cloth.appendChild(imgElOpt);
    }
    var giltTop = document.createElement("span");
    giltTop.className = "sb-cover-card__gilt sb-cover-card__gilt--top";
    giltTop.setAttribute("aria-hidden", "true");
    var titleWrap = document.createElement("span");
    titleWrap.className = "sb-cover-card__cover-title-wrap";
    var tit = document.createElement("span");
    tit.className = "sb-cover-card__cover-title";
    tit.textContent = titleShown;
    titleWrap.appendChild(tit);
    var giltBot = document.createElement("span");
    giltBot.className = "sb-cover-card__gilt sb-cover-card__gilt--bot";
    giltBot.setAttribute("aria-hidden", "true");
    cloth.appendChild(giltTop);
    cloth.appendChild(titleWrap);
    cloth.appendChild(giltBot);
    shell.appendChild(cloth);
    face.appendChild(shell);
  }

  function createCoverCardWrap(item) {
    var meta = spineMeta(item.id, item.title);
    var cover = firstShelfCoverMeta(item);
    var coverSrc = cover.src;
    var pageIdxCover = cover.pageIndex;
    var wrap = document.createElement("div");
    wrap.className = "sb-cover-card-wrap";
    var openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className =
      "sb-cover-card sb-cover-card--hardback sb-cover-card--pat" +
      meta.pat +
      (coverSrc ? "" : " sb-cover-card--placeholder");
    openBtn.style.setProperty("--sb-h", String(meta.hue));
    openBtn.setAttribute("role", "listitem");
    openBtn.setAttribute("aria-label", "Open book: " + item.title);
    var face = document.createElement("span");
    face.className = "sb-cover-card__face";

    function finishCoverFallback() {
      openBtn.className =
        "sb-cover-card sb-cover-card--hardback sb-cover-card--pat" +
        meta.pat +
        " sb-cover-card--placeholder";
      composeHardbackShelfFace(face, meta, item.title, null);
    }

    if (coverSrc) {
      var img = document.createElement("img");
      img.src = coverSrc;
      img.alt = "";
      img.decoding = "async";
      img.loading = "lazy";
      img.className = "sb-cover-card__thumb-bg";
      img.referrerPolicy = "no-referrer";
      var retriedCover = false;
      img.onerror = function () {
        var pg = pageIdxCover >= 0 && item.pages ? item.pages[pageIdxCover] : null;
        var remoteFallback = pg && String(pg.imageUrlFallback || "").trim();

        if (!retriedCover && pg && remoteFallback && /^https?:\/\//i.test(remoteFallback)) {
          retriedCover = true;
          tryFetchImageDataUrl(remoteFallback)
            .then(function (dataUrl) {
              if (dataUrl && String(dataUrl).indexOf("data:") === 0) {
                persistShelfPageDataUrl(item.id, pageIdxCover, dataUrl);
                img.src = dataUrl;
                return;
              }
              finishCoverFallback();
            })
            .catch(function () {
              finishCoverFallback();
            });
          return;
        }
        finishCoverFallback();
      };
      composeHardbackShelfFace(face, meta, item.title, img);
    } else {
      composeHardbackShelfFace(face, meta, item.title, null);
    }

    openBtn.appendChild(face);
    openBtn.addEventListener("click", function () {
      openShelfBook(item.id);
    });
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "sb-shelf-remove";
    rm.setAttribute("aria-label", "Remove from shelf: " + item.title);
    rm.textContent = "×";
    rm.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      removeShelfBook(item.id);
    });
    wrap.appendChild(openBtn);
    wrap.appendChild(rm);
    return wrap;
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
    var step = SHELF_COVERS_PER_TIER;
    for (var i = 0; i < list.length; i += step) {
      var tier = document.createElement("div");
      tier.className = "sb-shelf-tier";
      var books = document.createElement("div");
      books.className = "sb-shelf-tier__books";
      books.setAttribute("role", "list");
      for (var k = i; k < list.length && k < i + step; k++) {
        books.appendChild(createCoverCardWrap(list[k]));
      }
      var lip = document.createElement("div");
      lip.className = "sb-shelf-tier__lip";
      lip.setAttribute("aria-hidden", "true");
      tier.appendChild(books);
      tier.appendChild(lip);
      shelfEl.appendChild(tier);
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

  function getSelectedFamilyPeople() {
    var out = [];
    if (!gamePeopleRow) return out;
    Array.prototype.forEach.call(
      gamePeopleRow.querySelectorAll(".sb-chip.is-selected"),
      function (el) {
        var id = el.getAttribute("data-person-id");
        var lab = el.getAttribute("data-person-label");
        if (id && lab) out.push({ id: id, label: lab });
      }
    );
    return out;
  }

  function clearGamePeopleChips() {
    if (!gamePeopleRow) return;
    Array.prototype.forEach.call(gamePeopleRow.querySelectorAll(".sb-chip"), function (el) {
      el.classList.remove("is-selected");
      el.setAttribute("aria-checked", "false");
    });
  }

  function buildGamePeopleChips() {
    if (!gamePeopleRow) return;
    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    gamePeopleRow.textContent = "";
    if (gamePeopleBlock) {
      if (!list.length) {
        gamePeopleBlock.hidden = true;
        return;
      }
      gamePeopleBlock.hidden = false;
    }
    list.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-chip";
      b.textContent = item.label;
      b.setAttribute("role", "checkbox");
      b.setAttribute("aria-checked", "false");
      b.setAttribute("data-person-label", item.label);
      b.setAttribute("data-person-id", item.id);
      b.addEventListener("click", function () {
        var on = !b.classList.contains("is-selected");
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
      gamePeopleRow.appendChild(b);
    });
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
    buildGamePeopleChips();
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

  function setReaderImmersiveFromLayout() {
    if (!book) return;
    var on =
      !book.classList.contains("is-hidden") && immersiveReaderMq.matches;
    if (on) {
      book.classList.add("sb-book--immersive");
      document.body.classList.add("sb-reader-immersive");
    } else {
      book.classList.remove("sb-book--immersive");
      document.body.classList.remove("sb-reader-immersive");
    }
  }

  function showWizard() {
    story = null;
    spreadIndex = 0;
    spreadAnimLock = false;
    if (spreadRightArtImg) {
      spreadRightArtImg.removeAttribute("src");
      spreadRightArtImg.alt = "";
      spreadRightArtImg.hidden = true;
    }
    if (spreadInnerEl) {
      spreadInnerEl.classList.remove("sb-flip-spread__inner--ref-flipbook");
    }
    clearSpreadTurnClasses();
    resetBookCoverForWizard();
    closeJourney();
    document.body.classList.remove("sb-reader-immersive");
    if (book) {
      book.classList.remove("sb-book--immersive");
    }
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
    if (bookTitleInput) bookTitleInput.value = "";
    if (plotInput) plotInput.value = "";
    clearGamePeopleChips();
    goToStep(0);
    setError("");
    renderShelf();
  }

  function showBook() {
    if (!story || !story.pages.length) return;
    spreadIndex = 0;
    coverOpenGeneration += 1;
    closeJourney();
    if (landing) {
      landing.classList.add("is-hidden");
      landing.hidden = true;
    }
    if (book) {
      book.classList.remove("is-hidden");
      book.hidden = false;
    }
    if (readerHeading) readerHeading.textContent = story.title;
    if (coverTitle && story) coverTitle.textContent = story.title;
    if (btnOpenCover && story) {
      btnOpenCover.setAttribute(
        "aria-label",
        "Open the book: " + String(story.title || "your story")
      );
    }
    if (readerStack) {
      readerStack.classList.remove(
        "sb-reader-stack--open",
        "sb-reader-stack--opening"
      );
    }
    if (readerPages) readerPages.setAttribute("aria-hidden", "true");
    if (btnOpenCover) {
      btnOpenCover.removeAttribute("aria-hidden");
      btnOpenCover.removeAttribute("tabindex");
    }
    if (book) book.classList.add("sb-book--cover-visible");
    applyBookThemingFromStory();
    renderSpread();
    syncCloseBookButton();
    setReaderImmersiveFromLayout();
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

  if (immersiveReaderMq.addEventListener) {
    immersiveReaderMq.addEventListener("change", setReaderImmersiveFromLayout);
  } else if (immersiveReaderMq.addListener) {
    immersiveReaderMq.addListener(setReaderImmersiveFromLayout);
  }

  var btnPreviewSample = document.getElementById("sbPreviewSample");

  if (appEl) {
    appEl.addEventListener(
      "click",
      function (e) {
        if (!e.target || !e.target.closest) return;
        if (e.target.closest("#sbStartJourney")) {
          e.preventDefault();
          openJourney();
        }
        if (e.target.closest("#sbPreviewSample")) {
          e.preventDefault();
          openSampleBook();
        }
        if (e.target.closest("#sbOpenCover")) {
          e.preventDefault();
          openBookCover();
        }
        if (e.target.closest("#sbCloseBook")) {
          e.preventDefault();
          closeBookCover();
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

  if (btnPreviewSample && !appEl) {
    btnPreviewSample.addEventListener("click", function (e) {
      e.preventDefault();
      openSampleBook();
    });
  }

  if (btnOpenCover && !appEl) {
    btnOpenCover.addEventListener("click", function (e) {
      e.preventDefault();
      openBookCover();
    });
  }

  if (btnCloseBook && !appEl) {
    btnCloseBook.addEventListener("click", function (e) {
      e.preventDefault();
      closeBookCover();
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
      var familyPeople = getSelectedFamilyPeople();
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
          familyNames: familyPeople.map(function (p) {
            return p.label;
          }),
          familyPeople: familyPeople,
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
                : out.body && out.body.error === "images_failed" && out.body.detail
                  ? "Couldn’t make the book (pictures). " + String(out.body.detail)
                : out.body && out.body.error
                  ? "Couldn’t make the book (" + out.body.error + ")."
                  : "Couldn’t make the book (error " + out.status + ").";
            setError(msg);
            return;
          }
          var apiTitle =
            out.body && out.body.title ? String(out.body.title).trim() : "";
          var customTitle = bookTitleInput ? bookTitleInput.value.trim() : "";
          story = {
            title: customTitle || apiTitle || "Your story",
            pages: out.body.pages || [],
            sceneImageUrl: out.body.sceneImageUrl || null,
          };
          spreadIndex = 0;
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

  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("sample") === "1" || params.get("demo") === "1") {
      openSampleBook();
    }
  } catch (err) {}

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
