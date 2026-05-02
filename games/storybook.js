/**
 * AI storybook — journey modal + Supabase Edge Function `clever-service`.
 * Requires: deploy function + OPENAI_API_KEY secret (see supabase/functions/clever-service/README.md).
 */
(function () {
  var CHARACTERS = [
    { id: "unicorn", label: "Unicorn", icon: "\uD83E\uDD84" },
    { id: "dragon", label: "Little dragon", icon: "\uD83D\uDC09" },
    { id: "dinosaur", label: "Dinosaur", icon: "\uD83E\uDD96" },
    { id: "robot", label: "Robot", icon: "\uD83E\uDD16" },
    { id: "bunny", label: "Bunny", icon: "\uD83D\uDC30" },
    { id: "teddy", label: "Teddy bear", icon: "\uD83E\uDDF8" },
    { id: "cat", label: "Kitty", icon: "\uD83D\uDC31" },
    { id: "dog", label: "Puppy", icon: "\uD83D\uDC36" },
    { id: "fox", label: "Fox", icon: "\uD83E\uDD8A" },
    { id: "penguin", label: "Penguin", icon: "\uD83D\uDC27" },
    { id: "owl", label: "Owl", icon: "\uD83E\uDD89" },
    { id: "octopus", label: "Octopus", icon: "\uD83D\uDC19" },
    { id: "giraffe", label: "Giraffe", icon: "\uD83E\uDD92" },
    { id: "bee", label: "Bumblebee", icon: "\uD83D\uDC1D" },
    { id: "butterfly", label: "Butterfly", icon: "\uD83E\uDD8B" },
    { id: "ladybug", label: "Ladybug", icon: "\uD83D\uDC1E" },
    { id: "frog", label: "Frog", icon: "\uD83D\uDC38" },
    { id: "hedgehog", label: "Hedgehog", icon: "\uD83E\uDD94" },
    { id: "mouse", label: "Little mouse", icon: "\uD83D\uDC2D" },
    { id: "hippo", label: "Hippo", icon: "\uD83E\uDD9B" },
    { id: "flamingo", label: "Flamingo", icon: "\uD83E\uDDA9" },
    { id: "turtle", label: "Turtle", icon: "\uD83D\uDC22" },
    { id: "koala", label: "Koala", icon: "\uD83D\uDC28" },
    { id: "llama", label: "Llama", icon: "\uD83E\uDD99" },
    { id: "nobuddy", label: "No buddy", icon: "\uD83D\uDC64" },
  ];

  /** Must match clever-service `BOOK_COLOR_KEYS` / `coerceBookColor`. */
  var BOOK_COLOR_OPTIONS = [
    { id: "", label: "Auto", swatch: null },
    { id: "pink", label: "Pink", swatch: "#ec4899" },
    { id: "blue", label: "Blue", swatch: "#2563eb" },
    { id: "green", label: "Green", swatch: "#16a34a" },
    { id: "purple", label: "Purple", swatch: "#9333ea" },
    { id: "orange", label: "Orange", swatch: "#ea580c" },
    { id: "teal", label: "Teal", swatch: "#0d9488" },
    { id: "red", label: "Red", swatch: "#dc2626" },
    { id: "yellow", label: "Yellow", swatch: "#ca8a04" },
    { id: "lilac", label: "Lilac", swatch: "#a78bfa" },
    { id: "mint", label: "Mint", swatch: "#34d399" },
    { id: "coral", label: "Coral", swatch: "#fb7185" },
    { id: "navy", label: "Navy", swatch: "#1e3a8a" },
  ];

  /** Max characters for "What happens?" — keep in sync with clever-service `STORYBOOK_PLOT_HINT_MAX`. */
  var PLOT_INPUT_MAX = 800;

  var PLACES = [
    { id: "beach", label: "Beach", icon: "\uD83C\uDFD6" },
    { id: "woods", label: "Woods", icon: "\uD83C\uDF32" },
    { id: "castle", label: "Castle", icon: "\uD83C\uDFF0" },
    { id: "garden", label: "Garden", icon: "\uD83C\uDF37" },
    { id: "space", label: "Space", icon: "\uD83D\uDE80" },
    { id: "sea", label: "Open sea", icon: "\uD83C\uDF0A" },
    { id: "pirateship", label: "Pirate ship", icon: "\uD83D\uDEA2" },
    { id: "mountain", label: "Mountains", icon: "\u26F0" },
    { id: "zoo", label: "Zoo", icon: "\uD83E\uDD81" },
    { id: "farm", label: "Farm", icon: "\uD83D\uDC04" },
    { id: "circus", label: "Circus", icon: "\uD83C\uDFAA" },
    { id: "city", label: "Toy town", icon: "\uD83C\uDFD7" },
    { id: "train", label: "Train ride", icon: "\uD83D\uDE82" },
    { id: "lake", label: "Lake", icon: "\uD83D\uDEF6" },
    { id: "snow", label: "Snowy land", icon: "\u2744" },
    { id: "desert", label: "Desert", icon: "\uD83C\uDFDC" },
    { id: "stadium", label: "Football stadium", icon: "\u26BD" },
    { id: "museum", label: "Museum", icon: "\uD83C\uDFDB" },
    { id: "island", label: "Tropical island", icon: "\uD83C\uDFDD" },
  ];

  var STEP_HEADINGS = [
    "Let’s make your book",
    "Who’s the hero?",
    "Pick a buddy",
    "Where are we?",
    "What happens?",
  ];

  var STEP_PROGRESS_LABELS = ["Hello", "You", "Friend", "Where", "Story"];

  /** Short lines read aloud per wizard step (pre-readers). */
  var STEP_GUIDE_TEXT = [
    "Welcome. We will ask who you are, who your friend is, where you go, and what happens. Press Let’s go when you are ready.",
    "Who is the hero? This is your name in the story. You can type or tap Speak. You can add photos and pick a book title and colours.",
    "Pick a buddy for your story, or no buddy for a people-only story.",
    "Where should the story happen? Tap one place.",
    "What happens? We only need a little idea. One sentence is enough. You can tap Speak or try a starter below.",
  ];

  var PLOT_STARTERS = [
    "We found a magic door…",
    "My friend got lost and we helped…",
    "We built a secret clubhouse…",
    "Something glowed under my bed…",
    "We followed a trail of sparkles…",
  ];

  var landing = document.getElementById("sbLanding");
  var modal = document.getElementById("sbModal");
  var book = document.getElementById("sbBook");
  var busy = document.getElementById("sbBusy");
  var appEl = document.getElementById("app");
  var nameInput = document.getElementById("sbName");
  var bookTitleInput = document.getElementById("sbBookTitle");
  var authorInput = document.getElementById("sbAuthor");
  var plotInput = document.getElementById("sbPlot");
  var charRow = document.getElementById("sbCharacters");
  var placeRow = document.getElementById("sbPlaces");
  var bookColorsWrap = document.getElementById("sbBookColorsWrap");
  var bookColorsQuick = document.getElementById("sbBookColorsQuick");
  var bookColorsGrid = document.getElementById("sbBookColorsGrid");
  var bookColorsExtra = document.getElementById("sbBookColorsExtra");
  var bookColorToggle = document.getElementById("sbBookColorToggle");
  var errEl = document.getElementById("sbError");
  var modalErr = document.getElementById("sbModalError");
  var progressEl = document.getElementById("sbProgress");
  var stepKicker = document.getElementById("sbStepKicker");
  var stepHeading = document.getElementById("sbStepHeading");
  var readStepBtn = document.getElementById("sbReadStepBtn");
  var btnStart = document.getElementById("sbStartJourney");
  var btnGen = document.getElementById("sbGenerate");
  var heroPhotoInput = document.getElementById("sbHeroPhoto");
  var heroPhotoPickBtn = document.getElementById("sbHeroPhotoPick");
  var heroPhotoThumbsWrap = document.getElementById("sbHeroPhotoThumbsWrap");
  var heroPhotoThumbsList = document.getElementById("sbHeroPhotoThumbs");
  var heroPhotoErr = document.getElementById("sbHeroPhotoErr");
  var heroPhotoRemove = document.getElementById("sbHeroPhotoRemove");
  var heroRefDatalist = document.getElementById("sbHeroRefWhoDatalist");
  /** @type {{ dataUrl: string, who: string }[]} */
  var heroPhotoItems = [];
  var HERO_PHOTO_MAX_COUNT = 3;
  /** Keep under clever-service `MAX_HERO_REFERENCE_BYTES` per image after base64 (~1.2MB raw). */
  var HERO_PHOTO_MAX_FILE_BYTES = Math.floor(1.25 * 1024 * 1024);
  var readerHeading = document.getElementById("sbBookHeading");
  var spreadText = document.getElementById("sbSpreadText");
  var spreadTextClip = document.getElementById("sbSpreadTextClip");
  var spreadTextActions = document.getElementById("sbSpreadTextActions");
  var btnReadToMe = document.getElementById("sbReadToMe");
  var spreadArt = document.getElementById("sbSpreadArt");

  var currentAudio = null;
  var stepGuideAudio = null;
  var stepGuidePlaying = false;

  function refreshReadStepBtn() {
    if (!readStepBtn) return;
    if (stepGuidePlaying) {
      readStepBtn.textContent = "Stop";
      readStepBtn.setAttribute("aria-label", "Stop reading this step");
    } else {
      readStepBtn.innerHTML =
        '<span aria-hidden="true">\uD83D\uDD0A</span> Read this to me';
      readStepBtn.setAttribute(
        "aria-label",
        "Read this step out loud",
      );
    }
  }

  function stopStepGuideAudio() {
    if (stepGuideAudio) {
      try {
        stepGuideAudio.pause();
        stepGuideAudio.src = "";
      } catch (eSg) {}
      stepGuideAudio = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (eSy) {}
    }
    stepGuidePlaying = false;
    refreshReadStepBtn();
  }

  function speakStepGuideFallback(text) {
    if (!window.speechSynthesis) return;
    stepGuidePlaying = true;
    refreshReadStepBtn();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.92;
    u.onend = function () {
      stepGuidePlaying = false;
      refreshReadStepBtn();
    };
    u.onerror = function () {
      stepGuidePlaying = false;
      refreshReadStepBtn();
    };
    window.speechSynthesis.speak(u);
  }

  function toggleStepGuide() {
    stopSpeech();
    if (stepGuidePlaying) {
      stopStepGuideAudio();
      return;
    }
    stopReading();
    stopStepGuideAudio();
    var text = STEP_GUIDE_TEXT[journeyStep];
    if (!text) return;
    var fUrl = functionUrl();
    if (fUrl) {
      stepGuideAudio = new Audio(
        fUrl + "?ttsText=" + encodeURIComponent(text),
      );
      stepGuidePlaying = true;
      refreshReadStepBtn();
      stepGuideAudio.onended = function () {
        stepGuidePlaying = false;
        refreshReadStepBtn();
      };
      stepGuideAudio.onerror = function () {
        stopStepGuideAudio();
        speakStepGuideFallback(text);
      };
      var gp = stepGuideAudio.play();
      if (gp !== undefined) {
        gp.catch(function () {
          stopStepGuideAudio();
          speakStepGuideFallback(text);
        });
      }
    } else {
      speakStepGuideFallback(text);
    }
  }

  function readWordOutLoud(word, element) {
    stopStepGuideAudio();
    if (currentAudio) {
      stopReading();
    }

    var fUrl = functionUrl();
    if (!fUrl) return;
    
    // Highlight the word being read
    if (element) {
      element.classList.add("sb-word-reading");
    }
    
    var audioUrl = fUrl + "?ttsText=" + encodeURIComponent(word);
    currentAudio = new Audio(audioUrl);
    
    var playPromise = currentAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(function(e) {
        console.error("Word audio playback failed:", e);
        if (element) {
          element.classList.remove("sb-word-reading");
        }
        stopReading();
      });
    }
    
    currentAudio.onended = function() {
      if (element) {
        element.classList.remove("sb-word-reading");
      }
      stopReading();
    };
    currentAudio.onerror = function() {
      if (element) {
        element.classList.remove("sb-word-reading");
      }
      stopReading();
    };
  }

  function stopReading() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    if (btnReadToMe) {
      btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">🔊</span>';
      btnReadToMe.disabled = false;
    }
  }

  if (btnReadToMe) {
    btnReadToMe.addEventListener("click", function() {
      if (currentAudio) {
        stopReading();
        return;
      }
      stopStepGuideAudio();
      var n = numSpreads();
      if (n < 1 || spreadIndex * 2 >= story.pages.length) return;
      var leftP = story.pages[spreadIndex * 2];
      if (!leftP || !leftP.text) return;
      
      var fUrl = functionUrl();
      if (!fUrl) return;
      
      btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">⏳</span>';
      btnReadToMe.disabled = true;
      
      var audioUrl = fUrl + "?ttsText=" + encodeURIComponent(leftP.text);
      currentAudio = new Audio(audioUrl);
      
      // On iOS, play() must be called synchronously in the click handler
      var playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          if (!currentAudio) return;
          btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">⏹️</span>';
          btnReadToMe.disabled = false;
        }).catch(function(e) {
          console.error("Audio playback failed:", e);
          stopReading();
        });
      } else {
        btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">⏹️</span>';
        btnReadToMe.disabled = false;
      }
      
      currentAudio.onended = stopReading;
      currentAudio.onerror = stopReading;
    });
  }
  var spreadArtImg = document.getElementById("sbSpreadArtImg");
  var spreadArtNum = document.getElementById("sbSpreadArtNum");
  var spreadInnerEl = document.getElementById("sbFlipSpreadInner");
  var spreadArtBg = document.getElementById("sbSpreadArtBg");
  var spreadArtBase = document.getElementById("sbSpreadArtBase");
  var spreadArtCover = document.getElementById("sbSpreadArtCover");
  /** Incoming spread: full duplex under the peel (#sbSpreadArtCover inside .sb-flip-spread__art-base). */
  /** Outgoing duplex on #sbSpreadArtPeel rotates away above it. */
  var spreadArtPeelShell = document.getElementById("sbSpreadArtPeel");
  var spreadArtPeelImg = document.getElementById("sbSpreadArtPeelImg");
  var readerStack = document.getElementById("sbReaderStack");
  var readerPages = document.getElementById("sbReaderPages");
  var btnOpenCover = document.getElementById("sbOpenCover");
  var btnCloseBook = document.getElementById("sbCloseBook");
  var coverTitle = document.getElementById("sbCoverTitle");
  var coverAuthor = document.getElementById("sbCoverAuthor");
  var coverPanel = document.getElementById("sbCoverPanel");
  var btnPrev = document.getElementById("sbPrev");
  var btnNext = document.getElementById("sbNext");
  /** Wide screens (tablets / large landscape): edge-to-edge reader + fixed overlays. */
  var immersiveReaderMq =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(min-width: 768px)")
      : { matches: false, addEventListener: function () {} };
  var btnNew = document.getElementById("sbNew");
  var btnDownload = document.getElementById("sbDownloadBook");
  var btnShelf = document.getElementById("sbShelfBook");
  var actionsDock = document.getElementById("sbBookActionsDock");
  var actionsFab = document.getElementById("sbBookActionsFab");
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
    stopStepGuideAudio();
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
    stopStepGuideAudio();
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
      plotInput.value = merged.slice(0, PLOT_INPUT_MAX);
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
  /** True when user skipped buddy + place panels; Back from plot returns to name step. */
  var skippedBuddyAndPlace = false;
  /** @type {string} */
  var selectedChar = "unicorn";
  /** @type {string} */
  var selectedPlace = "beach";
  /** @type {string} book frame colour: "" = Auto, or "blue"|"green"|"pink" */
  var selectedBookCoverColor = "";
  /** @type {{ title: string, author?: string, readerFont?: string|null, sceneImageUrl?: string|null, pages: { text: string, imageUrl: string|null }[] } | null} */
  var story = null;

  /** Matches clever-service STORY_READER_FONT_KEYS — body / tape-over-art / splash word stack per book. */
  var SB_READER_FONT_PRESETS = {
    fredoka: {
      body: '"Fredoka","Sniglet","Nunito",sans-serif',
      overArt: '"Schoolbell","Fredoka","Nunito",sans-serif',
      emphasis: '"Kalam","Fredoka","Nunito",cursive,sans-serif',
    },
    schoolbell: {
      body: '"Schoolbell","Nunito",sans-serif',
      overArt: '"Schoolbell","Nunito",sans-serif',
      emphasis: '"Kalam","Schoolbell","Nunito",cursive,sans-serif',
    },
    sniglet: {
      body: '"Sniglet","Fredoka","Nunito",sans-serif',
      overArt: '"Sniglet","Schoolbell","Nunito",sans-serif',
      emphasis: '"Sniglet","Fredoka","Nunito",sans-serif',
    },
    kalam: {
      body: '"Kalam","Sniglet","Nunito",cursive,sans-serif',
      overArt: '"Kalam","Schoolbell","Nunito",cursive,sans-serif',
      emphasis: '"Kalam","Fredoka","Nunito",cursive,sans-serif',
    },
    patrick: {
      body: '"Patrick Hand","Schoolbell","Nunito",cursive,sans-serif',
      overArt: '"Patrick Hand","Nunito",cursive,sans-serif',
      emphasis: '"Kalam","Patrick Hand","Nunito",cursive,sans-serif',
    },
    comic: {
      body: '"Comic Neue","Nunito",sans-serif',
      overArt: '"Comic Neue","Schoolbell","Nunito",sans-serif',
      emphasis: '"Sniglet","Comic Neue","Nunito",sans-serif',
    },
  };

  function normalizeReaderFontKey(key) {
    var k = key ? String(key).toLowerCase().trim() : "";
    return SB_READER_FONT_PRESETS[k] ? k : "fredoka";
  }
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

  function illustrationUrlAtSpreadIndex(si) {
    if (!story || !story.pages || !story.pages.length) return "";
    var nSpr = numSpreads();
    if (nSpr < 1) return "";
    si = Math.max(0, Math.min(si, nSpr - 1));
    if (si * 2 >= story.pages.length) {
      return storyImageDisplayUrl(story.sceneImageUrl || "");
    }
    var rightP = story.pages[si * 2 + 1];
    var raw = rightP && rightP.imageUrl ? String(rightP.imageUrl) : "";
    return storyImageDisplayUrl(raw);
  }

  function clearSpreadTurnRevealFx() {
    if (spreadTextClip) {
      spreadTextClip.classList.remove("sb-flip-text__clip--reveal-turn");
      spreadTextClip.style.clipPath = "";
      spreadTextClip.style.webkitClipPath = "";
    }
    if (spreadArtBase) {
      spreadArtBase.classList.remove("sb-flip-spread__art-base--reveal-turn");
    }
  }

  function clearSpreadPeelTurnClasses() {
    var shell =
      spreadArtPeelShell || document.getElementById("sbSpreadArtPeel");
    if (!shell) return;
    shell.classList.remove(
      "sb-story-pageflip--turn-next-1",
      "sb-story-pageflip--snap-next",
      "sb-story-pageflip--turn-next-2",
      "sb-story-pageflip--turn-prev-1",
      "sb-story-pageflip--snap-prev",
      "sb-story-pageflip--turn-prev-2"
    );
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
    clearSpreadPeelTurnClasses();
    clearSpreadTurnRevealFx();
  }

  function bindCpShellTurnEnd(shell, cb) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      shell.removeEventListener("transitionend", onTe);
      shell.removeEventListener("webkitTransitionEnd", onTe);
      window.clearTimeout(tid);
      cb();
    }
    function onTe(ev) {
      if (!ev || ev.target !== shell) return;
      var pn = ev.propertyName || "";
      if (pn !== "" && !isTransformTransitionProperty(pn)) return;
      finish();
    }
    shell.addEventListener("transitionend", onTe);
    shell.addEventListener("webkitTransitionEnd", onTe);
    var tid = window.setTimeout(finish, 1400);
  }

  function bumpSpreadIndex(delta) {
    spreadIndex += delta;
    var nSpr = numSpreads();
    spreadIndex = Math.max(0, Math.min(spreadIndex, nSpr - 1));
    applySpreadContent();
  }

  function navigateSpreadWithRightPageTurn(delta) {
    var peelShell =
      spreadArtPeelShell || document.getElementById("sbSpreadArtPeel");
    if (spreadAnimLock) return;
    if (!peelShell) {
      navigateSpreadInstant(delta);
      return;
    }

    var fromSi = spreadIndex;
    spreadIndex += delta;
    var nSpr = numSpreads();
    spreadIndex = Math.max(0, Math.min(spreadIndex, nSpr - 1));

    spreadAnimLock = true;
    setSpreadNavBusy(true);
    clearSpreadPeelTurnClasses();
    clearSpreadTurnRevealFx();

    /* Destination prose + incoming duplex on base (#sbSpreadArtCover); peel rotates away over it */
    applySpreadContent({ skipArt: true });
    syncSpreadIllustrationFromStory();

    var peelImg =
      spreadArtPeelImg || document.getElementById("sbSpreadArtPeelImg");
    var peelBackImg = document.getElementById("sbSpreadArtPeelBackImg");
    var outgoingLeftShell = document.getElementById("sbSpreadArtOutgoingLeft");
    var outgoingLeftImg = document.getElementById("sbSpreadArtOutgoingLeftImg");

    var outgoingUrl = illustrationUrlAtSpreadIndex(fromSi);
    var incomingUrl = illustrationUrlAtSpreadIndex(spreadIndex);

    if (peelImg) {
      peelImg.alt = "";
      if (outgoingUrl) {
        peelImg.referrerPolicy = "no-referrer";
        peelImg.src = outgoingUrl;
      } else {
        peelImg.removeAttribute("src");
      }
    }
    
    if (peelBackImg) {
      peelBackImg.alt = "";
      if (incomingUrl) {
        peelBackImg.referrerPolicy = "no-referrer";
        peelBackImg.src = incomingUrl;
      } else {
        peelBackImg.removeAttribute("src");
      }
    }

    if (outgoingLeftImg) {
      outgoingLeftImg.alt = "";
      if (outgoingUrl) {
        outgoingLeftImg.referrerPolicy = "no-referrer";
        outgoingLeftImg.src = outgoingUrl;
      } else {
        outgoingLeftImg.removeAttribute("src");
      }
    }

    peelShell.hidden = false;
    peelShell.removeAttribute("hidden");
    if (outgoingLeftShell) {
      outgoingLeftShell.hidden = false;
      outgoingLeftShell.removeAttribute("hidden");
      outgoingLeftShell.style.display = "block";
    }

    var isNext = delta > 0;
    var cls1 = isNext
      ? "sb-story-pageflip--turn-next-1"
      : "sb-story-pageflip--turn-prev-1";

    window.requestAnimationFrame(function () {
      peelShell.classList.add(cls1);
      if (spreadTextClip) {
        spreadTextClip.classList.add("sb-flip-text__clip--reveal-turn");
      }

      bindCpShellTurnEnd(peelShell, function peelTurnDone() {
        clearSpreadPeelTurnClasses();
        clearSpreadTurnRevealFx();
        if (peelImg) peelImg.removeAttribute("src");
        if (peelBackImg) peelBackImg.removeAttribute("src");
        if (outgoingLeftImg) outgoingLeftImg.removeAttribute("src");
        
        peelShell.hidden = true;
        if (outgoingLeftShell) {
          outgoingLeftShell.hidden = true;
          outgoingLeftShell.style.display = "none";
        }
        spreadAnimLock = false;
        setSpreadNavBusy(false);
      });
    });
  }

  function navigateSpreadInstant(delta) {
    spreadAnimLock = false;
    bumpSpreadIndex(delta);
  }

  function navigateSpread(delta) {
    if (!story) return;
    if (book && book.classList.contains("sb-book--cover-visible")) return;
    if (delta > 0 && spreadIndex >= numSpreads() - 1) return;
    if (delta < 0 && spreadIndex <= 0) return;
    if (prefersReducedSpreadMotion()) {
      navigateSpreadInstant(delta);
      return;
    }
    if (spreadAnimLock) return;
    navigateSpreadWithRightPageTurn(delta);
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
    stopReading();
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

    var c = story.bookColor ? String(story.bookColor).toLowerCase() : "";
    var themes = {
      blue: ["#2563eb", "#dbeafe", "#1d4ed8", "#1e40af", "#1e3a8a"],
      navy: ["#1e3a8a", "#dbeafe", "#1e40af", "#172554", "#0f172a"],
      green: ["#16a34a", "#dcfce7", "#15803d", "#166534", "#14532d"],
      mint: ["#10b981", "#d1fae5", "#059669", "#047857", "#065f46"],
      pink: ["#db2777", "#fce7f3", "#be185d", "#9d174d", "#831843"],
      coral: ["#f43f5e", "#ffe4e6", "#e11d48", "#be123c", "#9f1239"],
      lilac: ["#a855f7", "#f3e8ff", "#9333ea", "#7e22ce", "#6b21a8"],
      purple: ["#7c3aed", "#ede9fe", "#6d28d9", "#5b21b6", "#4c1d95"],
      orange: ["#ea580c", "#ffedd5", "#c2410c", "#9a3412", "#7c2d12"],
      red: ["#dc2626", "#fee2e2", "#b91c1c", "#991b1b", "#7f1d1d"],
      yellow: ["#ca8a04", "#fef9c3", "#a16207", "#854d0e", "#713f12"],
      teal: ["#0d9488", "#ccfbf1", "#0f766e", "#115e59", "#134e4a"],
    };
    var t = themes[c];
    if (t) {
      book.style.setProperty("--sb-flip-red", t[0]);
      book.style.setProperty("--sb-flip-light", t[1]);
      book.style.setProperty("--sb-flip-mid", t[2]);
      book.style.setProperty("--sb-flip-dark", t[3]);
      book.style.setProperty("--sb-flip-darker", t[4]);
    } else {
      book.style.setProperty("--sb-flip-red", "#db2777");
      book.style.setProperty("--sb-flip-light", "#fce7f3");
      book.style.setProperty("--sb-flip-mid", "#be185d");
      book.style.setProperty("--sb-flip-dark", "#9d174d");
      book.style.setProperty("--sb-flip-darker", "#831843");
    }

    var preset =
      SB_READER_FONT_PRESETS[normalizeReaderFontKey(story.readerFont)];
    book.style.setProperty("--sb-reader-font-body", preset.body);
    book.style.setProperty("--sb-reader-font-over-art", preset.overArt);
    book.style.setProperty("--sb-reader-font-emphasis", preset.emphasis);

    var u = story.sceneImageUrl;
    if (u) {
      book.classList.add("sb-book--themed");
      // Remove setting the background image on the entire book container
      book.style.backgroundImage = "";
      if (coverPanel) {
        coverPanel.classList.add("sb-cover__panel--themed");
        var safeUrl = String(u).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        coverPanel.style.setProperty("--sb-cover-photo", 'url("' + safeUrl + '")');
      }
    } else {
      book.classList.remove("sb-book--themed");
      book.style.backgroundImage = "";
      if (coverPanel) {
        coverPanel.classList.remove("sb-cover__panel--themed");
        coverPanel.style.removeProperty("--sb-cover-photo");
      }
    }
  }

  function clearBookTheming() {
    if (!book) return;
    book.style.removeProperty("--sb-flip-red");
    book.style.removeProperty("--sb-flip-light");
    book.style.removeProperty("--sb-flip-mid");
    book.style.removeProperty("--sb-flip-dark");
    book.style.removeProperty("--sb-flip-darker");
    book.style.removeProperty("--sb-reader-font-body");
    book.style.removeProperty("--sb-reader-font-over-art");
    book.style.removeProperty("--sb-reader-font-emphasis");
    book.classList.remove("sb-book--themed");
    book.style.backgroundImage = "";
    if (coverPanel) {
      coverPanel.classList.remove("sb-cover__panel--themed");
      coverPanel.style.removeProperty("--sb-cover-photo");
    }
  }

  function numSpreads() {
    return story && story.pages ? Math.floor(story.pages.length / 2) + 1 : 0;
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
    var rfKeys = Object.keys(SB_READER_FONT_PRESETS);
    var rfPick = rfKeys[(Math.random() * rfKeys.length) | 0] || "fredoka";
    return {
      title: "Mira and the fallen star (sample)",
      bookColor: "blue",
      readerFont: rfPick,
      sceneImageUrl: null,
      pages: pages,
    };
  }

  /** Words in ALL CAPS (sound effects) — skip common short words so body text stays normal. */
  var SB_BIG_WORD_STOP = {
    THE: true,
    AND: true,
    BUT: true,
    FOR: true,
    WAS: true,
    ARE: true,
    WERE: true,
    NOT: true,
    SHE: true,
    HER: true,
    HIS: true,
    HIM: true,
    YOU: true,
    ALL: true,
    CAN: true,
    HAD: true,
    HAS: true,
    ONE: true,
    TWO: true,
    DAY: true,
    WAY: true,
    OUT: true,
    OFF: true,
    TOO: true,
    WHO: true,
    OUR: true,
    SAY: true,
    YES: true,
    NOW: true,
    NEW: true,
    HOW: true,
    WHY: true,
    LET: true,
    GOT: true,
    GET: true,
    BOY: true,
    GIRL: true,
    MAN: true,
    MEN: true,
    MUM: true,
    DAD: true,
  };

  function isBigWordToken(part) {
    if (!part) {
      return false;
    }
    var letters = part.replace(/[^A-Za-z]/g, "");
    if (letters.length < 3) {
      return false;
    }
    if (letters !== letters.toUpperCase()) {
      return false;
    }
    if (SB_BIG_WORD_STOP[letters]) {
      return false;
    }
    return true;
  }

  function storyPageTextToReadableHtml(text) {
    var lines = escapeHtml(String(text || ""))
      .replace(/\r/g, "")
      .split("\n");
    var htmlLines = [];
    for (var li = 0; li < lines.length; li++) {
      var words = lines[li].split(/\s+/).filter(function (w) {
        return w.length > 0;
      });
      var spans = [];
      for (var wi = 0; wi < words.length; wi++) {
        var word = words[wi];
        var cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()'"”]/g, "");
        var cls = "sb-readable-word";
        if (isBigWordToken(word)) {
          cls += " sb-big-word";
        }
        spans.push(
          '<span class="' +
            cls +
            '" data-word="' +
            escapeAttr(cleanWord) +
            '">' +
            word +
            "</span>"
        );
      }
      htmlLines.push(spans.join(" "));
    }
    return htmlLines.join("<br/>");
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
    
    stopReading(); // Stop any playing audio when page turns
    
    if (spreadIndex * 2 >= story.pages.length) {
      spreadText.innerHTML =
        '<div class="sb-the-end-wrap" role="status">' +
        '<h2 class="sb-the-end-title">The End</h2>' +
        '<p class="sb-the-end-lead">We hope you enjoyed the story!</p>' +
        "</div>";
      if (spreadTextActions) spreadTextActions.hidden = true;
      return;
    }
    var i = spreadIndex * 2;
    var leftP = story.pages[i];
    if (leftP && leftP.text) {
      spreadText.innerHTML = storyPageTextToReadableHtml(leftP.text);

      var wordSpans = spreadText.querySelectorAll(".sb-readable-word");
      for (var w = 0; w < wordSpans.length; w++) {
        wordSpans[w].addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var wordToRead = this.getAttribute("data-word");
          if (wordToRead) {
            readWordOutLoud(wordToRead, this);
          }
        });
      }
    } else {
      spreadText.innerHTML = "";
    }
    if (spreadTextActions) {
      if (!leftP || !leftP.text) {
        spreadTextActions.hidden = true;
        spreadTextActions.style.display = "none";
      } else {
        spreadTextActions.hidden = false;
        spreadTextActions.style.display = "flex";
      }
    }
  }

  function syncSpreadIllustrationFromStory() {
    if (!story) return;
    var n = numSpreads();
    if (n < 1) return;
    var si = spreadIndex;
    si = Math.max(0, Math.min(si, n - 1));
    var isTheEnd = si * 2 >= story.pages.length;
    var rightP = isTheEnd ? null : story.pages[si * 2 + 1];
    var pLo = isTheEnd ? story.pages.length : (si * 2 + 1);
    var pHi = isTheEnd ? story.pages.length : (si * 2 + 2);
    var rawU = isTheEnd
      ? story.sceneImageUrl || ""
      : rightP && rightP.imageUrl
        ? String(rightP.imageUrl)
        : "";
    var u = storyImageDisplayUrl(rawU);

    if (u) {
      if (spreadArtImg) {
        spreadArtImg.src = u;
        spreadArtImg.alt = isTheEnd ? "The End" : "Illustration for pages " + pLo + "–" + pHi;
        spreadArtImg.referrerPolicy = "no-referrer";
      }
      if (spreadArt) spreadArt.classList.remove("is-empty");
      if (spreadArtCover) {
        spreadArtCover.src = u;
        spreadArtCover.alt = isTheEnd ? "The End" : "Illustration for pages " + pLo + "–" + pHi + " of " + story.pages.length;
        spreadArtCover.referrerPolicy = "no-referrer";
      }
      if (spreadInnerEl && spreadInnerEl.dataset) {
        spreadInnerEl.dataset.sbArtUrl = u;
      }
      if (spreadInnerEl) {
        spreadInnerEl.classList.add("sb-flip-spread__inner--has-art");
      }
      if (spreadArtNum) {
        spreadArtNum.textContent = isTheEnd ? "The End" : "Pages " + pLo + "–" + pHi + " of " + story.pages.length;
      }
    } else {
      if (spreadArtImg) spreadArtImg.removeAttribute("src");
      if (spreadArt) spreadArt.classList.add("is-empty");
      if (spreadArtBg) spreadArtBg.style.backgroundImage = "";
      if (spreadArtCover) {
        spreadArtCover.removeAttribute("src");
        spreadArtCover.alt = "";
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
  }

  /**
   * @param {{ skipArt?: boolean }} opt  — skipArt while anim: text updated, base art set via `syncSpreadIllustrationFromStory` in navigator
   */
  function applySpreadContent(opt) {
    opt = opt || {};
    if (!story || !spreadText) return;
    var n = numSpreads();
    if (n < 1) return;
    spreadIndex = Math.max(0, Math.min(spreadIndex, n - 1));
    writeSpreadTextMetaFromStory();
    if (!opt.skipArt) {
      syncSpreadIllustrationFromStory();
    }
    updatePagerHints();
  }

  function renderSpread() {
    applySpreadContent();
  }

  function updatePagerHints() {
    if (!story) return;
    var n = numSpreads();
    var si = spreadIndex;
    si = Math.max(0, Math.min(si, Math.max(0, n - 1)));
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

  /**
   * Remote hosts that often block direct browser fetch/CORS or cold-load inconsistently.
   * Load via clever-service GET `?url=` (same as DALL·E) so images encode for the shelf and show in the reader.
   */
  function storyImageNeedsEdgeProxy(url) {
    var u = String(url || "").toLowerCase();
    if (!u || u.indexOf("data:") === 0) return false;
    if (u.indexOf("/functions/v1/") !== -1 && u.indexOf("url=") !== -1) return false;
    return (
      u.indexOf("blob.core.windows.net") !== -1 ||
      u.indexOf("oaiusercontent.com") !== -1 ||
      u.indexOf("fal.media") !== -1 ||
      u.indexOf("fal-cdn") !== -1 ||
      u.indexOf(".r2.dev") !== -1
    );
  }

  /**
   * Shelf storage can skip canvas JPEG re-encode when the URL is a stable public asset
   * the browser loads at full quality (e.g. Supabase Storage). Proxied / ephemeral hosts
   * still use tryFetchImageDataUrl.
   */
  function shelfKeepOriginalRemoteUrl(url) {
    var u = String(url || "").trim().toLowerCase();
    if (!u || u.indexOf("data:") === 0) return false;
    if (storyImageNeedsEdgeProxy(url)) return false;
    if (
      u.indexOf(".supabase.co/") !== -1 &&
      u.indexOf("/storage/v1/object/public/") !== -1
    ) {
      return true;
    }
    return false;
  }

  function storyImageDisplayUrl(remoteUrl) {
    var u = String(remoteUrl || "").trim();
    if (!u) return u;
    if (u.indexOf("data:") === 0) return u;
    if (!storyImageNeedsEdgeProxy(u)) return u;
    var base = functionUrl();
    if (!base) return u;
    var key = anonKey();
    var out = base + "?url=" + encodeURIComponent(u);
    if (key) out += "&apikey=" + encodeURIComponent(key);
    return out;
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
    return Promise.resolve().then(function() {
      if (!url) return null;
      if (url.indexOf("data:") === 0) return url;
      
      // 1. First fetch the image using CORS fetch to get the raw Blob. 
      // Proxy DALL·E + Fal (and similar) through clever-service ?url= so CORS/shelf encoding works.
      var fetchUrl = url;
      var fUrl = functionUrl();
      var aKey = anonKey();
      var reqOpts = {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "default",
        referrerPolicy: "no-referrer",
      };

      if (fUrl && storyImageNeedsEdgeProxy(url)) {
        fetchUrl = storyImageDisplayUrl(url);
        if (aKey) {
          reqOpts.headers = {
            Authorization: "Bearer " + aKey,
            apikey: aKey,
          };
        }
      }

      return fetch(fetchUrl, reqOpts)
        .then(function (r) {
          if (!r.ok) throw new Error("bad " + r.status);
          return r.blob();
        })
        .then(function (blob) {
          // 2. Convert Blob to raw base64 data URL
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
        .then(function (rawBase64) {
          // 3. Load the raw base64 data URL into an image to compress it.
          // Because it's a data: URL, there are zero CORS restrictions and canvas won't be tainted.
          return new Promise(function (resolve) {
            var img = new Image();
            // We set crossOrigin just in case the URL was NOT proxied and is a direct CDN link
            if (rawBase64.indexOf("data:") !== 0) {
              img.crossOrigin = "anonymous";
            }
            img.onload = function () {
              try {
                var canvas = document.createElement("canvas");
                /* Match ~1024px+ story art: 720 was visibly soft when reopening from shelf. */
                var maxDim = 1280;
                var w = img.width;
                var h = img.height;
                if (w > maxDim || h > maxDim) {
                  var ratio = w / h;
                  if (w > h) {
                    w = maxDim;
                    h = Math.round(maxDim / ratio);
                  } else {
                    h = maxDim;
                    w = Math.round(maxDim * ratio);
                  }
                }
                canvas.width = w || 1;
                canvas.height = h || 1;
                var ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("No 2d context");
                ctx.drawImage(img, 0, 0, w, h);
                /* Higher than 0.55 — shelf reopen looked muddy; still JPEG for quota vs PNG */
                resolve(canvas.toDataURL("image/jpeg", 0.85));
              } catch (e) {
                console.warn("Canvas compression failed, falling back to original URL", e);
                resolve(url); // Fallback to original URL if compression fails
              }
            };
            img.onerror = function (e) {
              console.warn("Image element failed to load raw base64", e);
              resolve(url); // Fallback to original URL if image load fails
            };
            img.src = rawBase64;
          });
        });
    }).catch(function (err) {
      console.warn("Could not fetch data URL for", url, err);
      return url; // CRITICAL FIX: Always return the original URL if the proxy/fetch fails, never null!
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

  /** Like fetchAllPageDataUrls but avoids re-encoding URLs already served at full quality (e.g. Supabase public). */
  function fetchShelfPageDataUrls() {
    if (!story || !story.pages.length) return Promise.resolve([]);
    return Promise.all(
      story.pages.map(function (p) {
        var u = p.imageUrl || "";
        if (shelfKeepOriginalRemoteUrl(u)) return Promise.resolve(null);
        return tryFetchImageDataUrl(u);
      })
    );
  }

  function fetchSceneDataUrlForShelf(sceneUrl) {
    if (!sceneUrl) return Promise.resolve(null);
    if (shelfKeepOriginalRemoteUrl(sceneUrl)) return Promise.resolve(null);
    return tryFetchImageDataUrl(sceneUrl);
  }

  var SHELF_STORAGE_KEY = "jigsawKids_storybookShelf_v1";
  var SHELF_MAX_BOOKS = 14;
  /** @type {Array|null} null until first hydrate from IndexedDB / localStorage */
  var shelfCache = null;

  function loadShelfSyncFromLocalStorage() {
    try {
      var raw = localStorage.getItem(SHELF_STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function loadShelf() {
    if (shelfCache === null) {
      return loadShelfSyncFromLocalStorage();
    }
    return shelfCache;
  }

  /**
   * Refresh in-memory shelf from the same store the cloud merge uses (needed after pull).
   * @param {function(): void} [done]
   */
  function reloadShelfCacheFromStore(done) {
    if (window.StorybookShelfStore && typeof window.StorybookShelfStore.getJson === "function") {
      window.StorybookShelfStore.getJson()
        .then(function (list) {
          shelfCache = Array.isArray(list) ? list : [];
          if (done) {
            done();
          }
        })
        .catch(function () {
          shelfCache = loadShelfSyncFromLocalStorage();
          if (done) {
            done();
          }
        });
    } else {
      shelfCache = loadShelfSyncFromLocalStorage();
      if (done) {
        done();
      }
    }
  }

  /**
   * @param {function(): void} [onWritten] after data is persisted and shelfCache updated
   */
  function saveShelf(list, cloudDone, onWritten) {
    cloudDone = typeof cloudDone === "function" ? cloudDone : null;
    onWritten = typeof onWritten === "function" ? onWritten : null;
    var tryList = list.slice();

    function afterPersistOk(raw) {
      shelfCache = tryList;
      if (onWritten) {
        onWritten();
      }
        if (window.KidsScoreCloud && window.KidsScoreCloud.scheduleStorybookUpload) {
        window.KidsScoreCloud.scheduleStorybookUpload(raw, cloudDone);
      } else if (cloudDone) {
        cloudDone(null);
      }
    }

    function attempt() {
      var raw = JSON.stringify(tryList);
      if (window.StorybookShelfStore && typeof window.StorybookShelfStore.setRaw === "function") {
        window.StorybookShelfStore.setRaw(raw).then(
          function () {
            afterPersistOk(raw);
          },
          function (e) {
            if (tryList.length > 1) {
              console.warn("Shelf storage tight — removing oldest book and retrying.", e);
              tryList.pop();
              attempt();
            } else {
              if (cloudDone) {
                cloudDone(e || new Error("storage_quota"));
              } else {
                window.alert("Could not save your library — storage is full on this device.");
              }
            }
          },
        );
        return;
      }
      while (tryList.length > 0) {
        try {
          var r = JSON.stringify(tryList);
          localStorage.setItem(SHELF_STORAGE_KEY, r);
          afterPersistOk(r);
          return;
      } catch (e) {
          if (tryList.length > 1) {
          console.warn("localStorage quota exceeded, removing oldest book to make space.");
            tryList.pop();
        } else {
            if (cloudDone) {
              cloudDone(e);
        }
            throw e;
      }
    }
      }
    }
    attempt();
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

  function spineMeta(bookId, title, bookColor) {
    var h = hashFromString(bookId + ":" + title);
    var hue = h % 360;
    var c = bookColor ? String(bookColor).toLowerCase() : "";
    if (c.indexOf("navy") !== -1) hue = 222 + (h % 18);
    else if (c.indexOf("teal") !== -1) hue = 175 + (h % 20);
    else if (c.indexOf("mint") !== -1) hue = 145 + (h % 22);
    else if (c.indexOf("green") !== -1) hue = 120 + (h % 40);
    else if (c.indexOf("blue") !== -1) hue = 200 + (h % 40);
    else if (c.indexOf("lilac") !== -1) hue = 265 + (h % 25);
    else if (c.indexOf("purple") !== -1) hue = 275 + (h % 30);
    else if (c.indexOf("coral") !== -1) hue = 350 + (h % 12);
    else if (c.indexOf("pink") !== -1) hue = 320 + (h % 30);
    else if (c.indexOf("red") !== -1) hue = 5 + (h % 18);
    else if (c.indexOf("orange") !== -1) hue = 28 + (h % 18);
    else if (c.indexOf("yellow") !== -1) hue = 48 + (h % 14);
    return {
      hue: hue,
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
    author,
    pages,
    dataUrls,
    sceneDataUrl,
    sceneUrlFallback,
    bookColor,
    readerFont,
    cloudDone,
    onWritten
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
      author: author || "",
      bookColor: bookColor || null,
      readerFont: readerFont || null,
      savedAt: new Date().toISOString(),
      pages: storedPages,
      sceneDataUrl: sceneDataUrl || null,
      sceneUrlFallback: sceneUrlFallback || null,
    });
    while (list.length > SHELF_MAX_BOOKS) {
      list.pop();
    }
    saveShelf(list, cloudDone, onWritten);
  }

  function removeShelfBook(bookId) {
    var list = loadShelf().filter(function (b) {
      return b.id !== bookId;
    });
    saveShelf(list, null, function () {
    renderShelf();
    });
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
      author: item.author || "",
      bookColor: item.bookColor || null,
      readerFont: item.readerFont || null,
      /* Prefer remote asset when present so reopen matches stored PNG (not shelf JPEG). */
      sceneImageUrl: item.sceneUrlFallback || item.sceneDataUrl || null,
      pages: item.pages.map(function (p) {
        return {
          text: p.text,
          imageUrl: p.imageUrlFallback || p.imageDataUrl || null,
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
    if (item.sceneUrlFallback || item.sceneDataUrl) {
      return { src: item.sceneUrlFallback || item.sceneDataUrl, pageIndex: -1 };
    }
    if (!item.pages || !item.pages.length) return { src: "", pageIndex: -1 };
    for (var i = 0; i < item.pages.length; i++) {
      var p = item.pages[i];
      var du = String(p.imageDataUrl || "").trim();
      var hu = String(p.imageUrlFallback || "").trim();
      var src = hu || du;
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

  /**
   * CodePen-style 3D volume: front (cover) + paper block + back — fewer faces than a full cube,
   * works better with dynamic cover art.
   */
  function wrapShelfCoverInBook3d(face) {
    var scene = document.createElement("span");
    scene.className = "sb-cover-card__scene";
    var shadow = document.createElement("span");
    shadow.className = "sb-cover-card__book-shadow";
    shadow.setAttribute("aria-hidden", "true");
    var book = document.createElement("span");
    book.className = "sb-cover-card__book";
    var front = document.createElement("span");
    front.className = "sb-cover-card__book-front";
    front.appendChild(face);
    var paper = document.createElement("span");
    paper.className = "sb-cover-card__book-paper";
    paper.setAttribute("aria-hidden", "true");
    var back = document.createElement("span");
    back.className = "sb-cover-card__book-back";
    back.setAttribute("aria-hidden", "true");
    book.appendChild(front);
    book.appendChild(paper);
    book.appendChild(back);
    scene.appendChild(shadow);
    scene.appendChild(book);
    return scene;
  }

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
    var meta = spineMeta(item.id, item.title, item.bookColor);
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
      (coverSrc ? " sb-cover-card--has-art" : " sb-cover-card--placeholder");
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

    openBtn.appendChild(wrapShelfCoverInBook3d(face));
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
      if (window.confirm('Remove "' + item.title + '" from your shelf?')) {
      removeShelfBook(item.id);
      }
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
      updateCarouselButtons();
      return;
    }
    
    var itemsPerPage = 9;
    for (var i = 0; i < list.length; i += itemsPerPage) {
      var pageDiv = document.createElement("div");
      pageDiv.className = "sb-library-page";
      for (var j = i; j < i + itemsPerPage && j < list.length; j++) {
        pageDiv.appendChild(createCoverCardWrap(list[j]));
      }
      shelfEl.appendChild(pageDiv);
    }
    updateCarouselButtons();
  }

  function updateCarouselButtons() {
    var prevBtn = document.getElementById("sbCarouselPrev");
    var nextBtn = document.getElementById("sbCarouselNext");
    if (!prevBtn || !nextBtn || !shelfEl) return;
    
    var scrollLeft = shelfEl.scrollLeft;
    var maxScroll = shelfEl.scrollWidth - shelfEl.clientWidth;
    
    prevBtn.disabled = scrollLeft <= 0;
    nextBtn.disabled = scrollLeft >= maxScroll - 1; // -1 for rounding
  }

  function scrollCarousel(dir) {
    if (!shelfEl) return;
    // Scroll by one full page
    // Add 20px for the gap between pages to ensure it crosses the snap threshold
    var gap = 20;
    var amount = (shelfEl.clientWidth + gap) * dir;
    shelfEl.scrollBy({ left: amount, behavior: "smooth" });
  }

  function saveBookToShelf() {
    if (!story || !story.pages.length || !btnShelf) return;
    var label = btnShelf.textContent;
    btnShelf.disabled = true;
    btnShelf.textContent = "Saving…";
    fetchShelfPageDataUrls()
      .then(function (dataUrls) {
        return fetchSceneDataUrlForShelf(story.sceneImageUrl || "").then(function (sceneData) {
          return { dataUrls: dataUrls, sceneData: sceneData };
        });
      })
      .then(function (o) {
        try {
          addStoryToShelfFromData(
            story.title,
            story.author,
            story.pages,
            o.dataUrls,
            o.sceneData,
            story.sceneImageUrl || null,
            story.bookColor || null,
            story.readerFont || null,
            function (cloudErr) {
              if (
                !window.KidsScoreCloud ||
                !window.KidsScoreCloud.isConfigured ||
                !window.KidsScoreCloud.isConfigured()
              ) {
                return;
              }
              var hintEl = document.getElementById("sbLibraryHint");
              var defaultHint =
                (hintEl && hintEl.getAttribute("data-default-hint")) ||
                "Put a book on the shelf after you read it — tap a cover to open it again.";
              if (hintEl && !hintEl.getAttribute("data-default-hint")) {
                hintEl.setAttribute("data-default-hint", hintEl.textContent.trim() || defaultHint);
              }
              if (!cloudErr) {
                if (hintEl) {
                  hintEl.textContent =
                    "Saved on this device and backed up to the cloud. Use the same family password on other devices, then “Get latest books from cloud”.";
                  window.setTimeout(function () {
                    if (hintEl) {
                      hintEl.textContent =
                        hintEl.getAttribute("data-default-hint") || defaultHint;
                    }
                  }, 12000);
                }
                return;
              }
              var msg = cloudErr && cloudErr.message ? String(cloudErr.message) : String(cloudErr);
              if (msg === "no_session") {
                window.alert(
                  "This tablet saved the book only on itself — it did not reach the cloud.\n\nOpen ⚙️ (bottom corner) → Sign in with your family password → tap “Put on my shelf” again.\n\n(Deploying edge functions does not update shelf sync — the website’s JavaScript does.)",
                );
              } else {
                window.alert(
                  "Saved on this device, but cloud backup failed:\n\n" +
                    msg +
                    "\n\nIf this keeps happening, ask a grown-up to check saved books in your account storage."
                );
              }
              if (hintEl) {
                hintEl.textContent =
                  "Cloud backup failed — see the message above. Books are still on this device.";
                window.setTimeout(function () {
                  if (hintEl) {
                    hintEl.textContent =
                      hintEl.getAttribute("data-default-hint") || defaultHint;
                  }
                }, 14000);
              }
            },
            function () {
          renderShelf();
            },
          );
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

  function buildStandaloneBookHtml(title, author, pages, dataUrls, sceneDataUrl, readerFont) {
    var rf = normalizeReaderFontKey(readerFont);
    var preset = SB_READER_FONT_PRESETS[rf];
    var escTitle = escapeHtml(title);
    var escAuthor = author ? escapeHtml(author) : "";
    var authorHtml = escAuthor ? '<p class="sbdl-cover-author">' + escAuthor + '</p>' : '';
    var bodyRule =
      "body{font-family:" +
      preset.body +
      ";margin:0;background:linear-gradient(165deg,#fce7f3,#fdf2f8 45%,#e9d5ff);color:#500724}";
    var articles = [];
    
    if (sceneDataUrl) {
      articles.push(
        '<div class="sbdl-spread sbdl-spread--cover">' +
          '<img class="sbdl-cover-img" src="' + sceneDataUrl + '" alt="Cover" />' +
          '<div class="sbdl-cover-title-wrap"><h1 class="sbdl-cover-title">' + escTitle + '</h1>' + authorHtml + '</div>' +
        '</div>'
      );
    } else {
      articles.push('<h1>' + escTitle + '</h1>' + authorHtml);
    }

    for (var i = 0; i < pages.length; i += 2) {
      var leftPage = pages[i];
      var rightPage = pages[i + 1] || null;
      
      var leftContent = '<div class="sbdl-side sbdl-side--left">' +
        '<p class="sbdl-t">' + escapeHtml(leftPage.text).replace(/\n/g, "<br/>") + '</p>' +
        '<p class="sbdl-k">Page ' + (i + 1) + '</p>' +
      '</div>';
      
      var rightContent = '<div class="sbdl-side sbdl-side--right">';
      if (rightPage) {
         if (rightPage.imageUrl) {
            var src = dataUrls[i + 1] || escapeAttr(rightPage.imageUrl);
            rightContent += '<div class="sbdl-art"><img src="' + src + '" alt="Illustration for page ' + (i + 2) + '" /></div>';
         }
         rightContent += '<p class="sbdl-t">' + escapeHtml(rightPage.text).replace(/\n/g, "<br/>") + '</p>';
         rightContent += '<p class="sbdl-k">Page ' + (i + 2) + '</p>';
      }
      rightContent += '</div>';

      articles.push(
        '<div class="sbdl-spread">' +
          leftContent +
          rightContent +
        '</div>'
      );
    }

    var css =
      bodyRule +
      ".sbdl-wrap{max-width:54rem;margin:0 auto;padding:1.5rem 1rem 3rem}" +
      "h1{font-size:clamp(1.35rem,4vw,1.65rem);text-align:center;color:#9d174d;margin:0 0 1.25rem;font-weight:800;}" +
      ".sbdl-spread{display:flex;flex-direction:column;gap:1.5rem;background:#fff;border-radius:24px;padding:1.5rem;margin:0 0 2rem;box-shadow:0 8px 32px rgba(157,23,77,.08);border:2px solid rgba(244,114,182,.3);}" +
      "@media(min-width:768px){.sbdl-spread{flex-direction:row;padding:2.5rem;gap:3rem;}}" +
      ".sbdl-side{flex:1;display:flex;flex-direction:column;}" +
      ".sbdl-k{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#be185d;margin-top:auto;padding-top:1.5rem;text-align:center;opacity:0.6;}" +
      ".sbdl-art{border-radius:16px;overflow:hidden;margin:0 0 1.25rem;background:#fdf2f8;box-shadow:0 4px 16px rgba(0,0,0,0.06);}" +
      ".sbdl-art img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;transform:scale(1.02);}" +
      ".sbdl-t{font-size:1.25rem;font-weight:600;line-height:1.65;margin:0;color:#500724;font-family:" +
      preset.body +
      ";}" +
      ".sbdl-spread--cover{position:relative;padding:0;overflow:hidden;border:none;box-shadow:0 12px 40px rgba(157,23,77,.2);}" +
      "@media(min-width:768px){.sbdl-spread--cover{padding:0;}}" +
      ".sbdl-cover-img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;transform:scale(1.02);}" +
      ".sbdl-cover-title-wrap{position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;}" +
      ".sbdl-cover-title{font-size:clamp(2.5rem,8vw,4rem);color:#fff;text-shadow:0 4px 24px rgba(0,0,0,0.6);margin:0;text-align:center;}" +
      ".sbdl-cover-author{font-size:clamp(1.2rem,4vw,1.8rem);color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.6);margin:1rem 0 0;text-align:center;font-weight:600;}" +
      ".sbdl-foot{margin-top:2.5rem;font-size:.85rem;font-weight:700;color:#9f1239;text-align:center;line-height:1.5;opacity:0.8;}" +
      "@media print{.sbdl-spread{break-inside:avoid;flex-direction:row;padding:2rem;gap:2rem;}}";

    return (
      '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/><link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&amp;family=Fredoka:wght@400;500;600;700&amp;family=Kalam:wght@400;700&amp;family=Nunito:wght@600;700;800&amp;family=Patrick+Hand&amp;family=Schoolbell&amp;family=Sniglet:wght@400;800&amp;display=swap" rel="stylesheet"/><title>' +
      escTitle +
      "</title><style>" +
      css +
      '</style></head><body><div class="sbdl-wrap">' +
      articles.join("") +
      '<p class="sbdl-foot">Saved from your Sofia&rsquo;s Game Room storybook. Keep this file to read your story any time!</p></div></body></html>'
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
        var html = buildStandaloneBookHtml(
          story.title,
          story.author,
          story.pages,
          arr[0],
          arr[1],
          story.readerFont
        );
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

  function heroFirstToken() {
    var n = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "";
    var first = (n.split(/\s+/)[0] || "").replace(/[^a-z]/gi, "");
    return first.toLowerCase();
  }

  function syncHeroRefDatalist() {
    if (!heroRefDatalist) return;
    heroRefDatalist.replaceChildren();
    var heroLab = nameInput && nameInput.value.trim()
      ? nameInput.value.trim()
      : "Hero";
    var oHero = document.createElement("option");
    oHero.value = heroLab;
    heroRefDatalist.appendChild(oHero);
    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    list.forEach(function (item) {
      if (!item || !item.label) return;
      var o = document.createElement("option");
      o.value = item.label;
      heroRefDatalist.appendChild(o);
    });
  }

  function displayNameForWho(who) {
    if (who === "hero") {
      return nameInput && nameInput.value.trim()
        ? nameInput.value.trim()
        : "Hero";
    }
    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === who) return list[i].label;
    }
    if (who && /^[a-z0-9]+$/i.test(String(who))) {
      var s = String(who);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return who || "Friend";
  }

  /** @returns {"hero"|string|null} */
  function resolveWhoFromText(raw) {
    var t = (raw || "").trim();
    if (!t.length) return "hero";
    var tLo = t.toLowerCase();
    var tNorm = tLo.replace(/[^a-z0-9]/gu, "");

    if (!tNorm || tNorm === "hero" || tNorm === "me") return "hero";
    if (/\(\s*hero\s*\)/i.test(t)) return "hero";

    var heroName = nameInput && nameInput.value.trim()
      ? nameInput.value.trim()
      : "";
    if (heroName && tLo === heroName.toLowerCase()) return "hero";

    var hf = heroFirstToken();
    if (hf && tNorm === hf) return "hero";

    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    for (var j = 0; j < list.length; j++) {
      var item = list[j];
      if (!item || !item.id) continue;
      if (item.id === tNorm || item.label.trim().toLowerCase() === tLo) {
        return item.id;
      }
    }
    if (tNorm.length >= 2 && tNorm.length <= 24 && /^[a-z0-9]+$/i.test(tNorm)) {
      return tNorm.toLowerCase();
    }
    return null;
  }

  function normalizeWhoInput(idx, inp) {
    if (!inp || idx < 0 || idx >= heroPhotoItems.length) return;
    setHeroPhotoError("");
    var prev = heroPhotoItems[idx].who;
    var r = resolveWhoFromText(inp.value);
    if (r === null) {
      setHeroPhotoError(
        "Use the hero’s name or a short friend name (letters and numbers only).",
      );
      heroPhotoItems[idx].who = prev;
      inp.value = displayNameForWho(prev);
      return;
    }
    heroPhotoItems[idx].who = r;
    inp.value = displayNameForWho(r);
  }

  function renderHeroPhotoThumbs() {
    if (!heroPhotoThumbsList || !heroPhotoThumbsWrap) return;
    syncHeroRefDatalist();
    heroPhotoThumbsList.replaceChildren();
    heroPhotoItems.forEach(function (item, idx) {
      var li = document.createElement("li");
      li.className = "sb-hero-ref__thumb-item";
      li.setAttribute("data-idx", String(idx));
      var img = document.createElement("img");
      img.className = "sb-hero-ref__thumb";
      img.src = item.dataUrl;
      img.alt = "Photo " + (idx + 1);
      img.width = 96;
      img.height = 96;
      img.decoding = "async";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.className = "sb-hero-ref__who-input";
      inp.setAttribute("list", "sbHeroRefWhoDatalist");
      inp.setAttribute("autocomplete", "off");
      inp.setAttribute("aria-label", "Who is in this photo — type a name");
      inp.setAttribute("maxlength", "48");
      inp.value = displayNameForWho(item.who);
      inp.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          inp.blur();
        }
      });
      inp.addEventListener("focusout", function () {
        normalizeWhoInput(idx, inp);
      });
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sb-hero-ref__thumb-remove";
      btn.setAttribute("aria-label", "Remove photo " + (idx + 1));
      btn.setAttribute("data-idx", String(idx));
      btn.textContent = "\u00d7";
      li.appendChild(img);
      li.appendChild(inp);
      li.appendChild(btn);
      heroPhotoThumbsList.appendChild(li);
    });
    heroPhotoThumbsWrap.hidden = heroPhotoItems.length === 0;
  }

  function clearHeroPhoto() {
    heroPhotoItems = [];
    if (heroPhotoInput) heroPhotoInput.value = "";
    renderHeroPhotoThumbs();
    if (heroPhotoErr) {
      heroPhotoErr.textContent = "";
      heroPhotoErr.hidden = true;
    }
  }

  function setHeroPhotoError(msg) {
    if (!heroPhotoErr) return;
    if (msg) {
      heroPhotoErr.textContent = msg;
      heroPhotoErr.hidden = false;
    } else {
      heroPhotoErr.textContent = "";
      heroPhotoErr.hidden = true;
    }
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
    return [];
  }

  function buildBookColorUI() {
    if (!bookColorsQuick || !bookColorsGrid) return;
    var quickN = 4;
    bookColorsQuick.textContent = "";
    bookColorsGrid.textContent = "";
    BOOK_COLOR_OPTIONS.slice(0, quickN).forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-chip";
      b.textContent = item.label;
      b.setAttribute("role", "radio");
      b.setAttribute("data-book-color", item.id);
      b.setAttribute("aria-label", item.label);
      bookColorsQuick.appendChild(b);
    });
    BOOK_COLOR_OPTIONS.slice(quickN).forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-color-swatch";
      b.setAttribute("role", "radio");
      b.setAttribute("data-book-color", item.id);
      b.setAttribute("aria-label", item.label);
      var dot = document.createElement("span");
      dot.className = "sb-color-swatch__dot";
      if (item.swatch) dot.style.background = item.swatch;
      else dot.classList.add("sb-color-swatch__dot--auto");
      b.appendChild(dot);
      var lab = document.createElement("span");
      lab.className = "sb-color-swatch__label";
      lab.textContent = item.label;
      b.appendChild(lab);
      bookColorsGrid.appendChild(b);
    });
    refreshBookColorChips();
  }

  function refreshBookColorChips() {
    if (!bookColorsWrap) return;
    Array.prototype.forEach.call(
      bookColorsWrap.querySelectorAll("[data-book-color]"),
      function (btn) {
        var v = btn.getAttribute("data-book-color");
        if (v === null) v = "";
        var on = v === selectedBookCoverColor;
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      }
    );
  }

  function wireBookColorChips() {
    if (!bookColorsWrap) return;
    bookColorsWrap.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest("[data-book-color]");
      if (!btn || !bookColorsWrap.contains(btn)) return;
      var raw = btn.getAttribute("data-book-color");
      selectedBookCoverColor = raw === null || raw === "" ? "" : raw;
      refreshBookColorChips();
    });
    if (bookColorToggle && bookColorsExtra) {
      bookColorToggle.addEventListener("click", function () {
        var show = bookColorsExtra.hidden;
        bookColorsExtra.hidden = !show;
        bookColorToggle.setAttribute("aria-expanded", show ? "true" : "false");
      });
    }
    refreshBookColorChips();
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
        b.className = "sb-chip sb-chip--with-icon";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-label", item.label);
        var ic = document.createElement("span");
        ic.className = "sb-chip__ic";
        ic.setAttribute("aria-hidden", "true");
        ic.textContent = item.icon || "";
        var lbl = document.createElement("span");
        lbl.className = "sb-chip__lbl";
        lbl.textContent = item.label;
        b.appendChild(ic);
        b.appendChild(lbl);
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
        b.className = "sb-chip sb-chip--with-icon";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-label", item.label);
        var ic = document.createElement("span");
        ic.className = "sb-chip__ic";
        ic.setAttribute("aria-hidden", "true");
        ic.textContent = item.icon || "";
        var lbl = document.createElement("span");
        lbl.className = "sb-chip__lbl";
        lbl.textContent = item.label;
        b.appendChild(ic);
        b.appendChild(lbl);
        b.addEventListener("click", function () {
          selectedPlace = item.id;
          refreshPlaceChips();
        });
        placeRow.appendChild(b);
      });
      refreshPlaceChips();
    }
    buildBookColorUI();
    wireBookColorChips();
  }

  function renderProgress() {
    if (!progressEl) return;
    progressEl.textContent = "";
    for (var i = 0; i < 5; i++) {
      var cell = document.createElement("span");
      cell.className = "sb-progress-step";
      if (i < journeyStep) cell.classList.add("is-done");
      if (i === journeyStep) cell.classList.add("is-current");
      var d = document.createElement("span");
      d.className = "sb-dot";
      cell.appendChild(d);
      var pl = document.createElement("span");
      pl.className = "sb-progress-step__label";
      pl.textContent = STEP_PROGRESS_LABELS[i] || "";
      cell.appendChild(pl);
      progressEl.appendChild(cell);
    }
  }

  function wirePlotStarters() {
    var wrap = document.getElementById("sbPlotStarters");
    if (!wrap || !plotInput) return;
    wrap.textContent = "";
    PLOT_STARTERS.forEach(function (line) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-plot-starter";
      b.textContent = line;
      b.setAttribute("aria-label", "Use idea: " + line);
      b.addEventListener("click", function () {
        var cur = String(plotInput.value || "").trim();
        if (!cur) {
          plotInput.value = line.slice(0, PLOT_INPUT_MAX);
        } else {
          plotInput.value = (cur + " " + line)
            .trim()
            .slice(0, PLOT_INPUT_MAX);
        }
        try {
          plotInput.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (eIn) {}
      });
      wrap.appendChild(b);
    });
  }

  function goToStep(n) {
    if (n !== journeyStep) {
      stopSpeech();
      stopStepGuideAudio();
    }
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
    stopStepGuideAudio();
    var m = modal || document.getElementById("sbModal");
    if (m) {
      m.classList.remove("is-hidden");
      m.removeAttribute("hidden");
      m.hidden = false;
      m.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("sb-modal-open");
    setError("");
    if (bookColorsExtra) bookColorsExtra.hidden = true;
    if (bookColorToggle) bookColorToggle.setAttribute("aria-expanded", "false");
    goToStep(0);
    if (stepHeading) {
      try {
        stepHeading.focus();
      } catch (e1) {}
    }
  }

  function closeJourney() {
    stopSpeech();
    stopStepGuideAudio();
    var m = modal || document.getElementById("sbModal");
    if (m) {
      m.classList.add("is-hidden");
      m.hidden = true;
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("sb-modal-open");
  }

  function setBookActionsOpen(open) {
    if (!book) return;
    book.classList.toggle("sb-book--actions-open", !!open);
    if (actionsFab) {
      actionsFab.setAttribute("aria-expanded", open ? "true" : "false");
    }
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
      book.classList.remove("sb-book--actions-open");
      if (actionsFab) actionsFab.setAttribute("aria-expanded", "false");
    }
  }

  function showWizard() {
    story = null;
    spreadIndex = 0;
    spreadAnimLock = false;
    if (spreadArtCover) {
      spreadArtCover.removeAttribute("src");
      spreadArtCover.alt = "";
    }
    if (spreadArtBg) {
      spreadArtBg.style.backgroundImage = "";
    }
    clearSpreadPeelTurnClasses();
    if (spreadArtPeelImg) {
      spreadArtPeelImg.removeAttribute("src");
    }
    if (spreadArtPeelShell) {
      spreadArtPeelShell.hidden = true;
    }
    if (spreadInnerEl) {
      spreadInnerEl.classList.remove(
        "sb-flip-spread__inner--has-art"
      );
      if (spreadInnerEl.dataset && spreadInnerEl.dataset.sbArtUrl) {
        delete spreadInnerEl.dataset.sbArtUrl;
      }
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
    clearHeroPhoto();
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
    setBookActionsOpen(false);
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

  function initPortalWelcome() {
    var el = document.getElementById("sbPortalWelcome");
    if (!el) return;
    var params;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (e) {
      return;
    }
    if (String(params.get("from") || "") !== "portal") return;

    var dismissBtn = document.getElementById("sbPortalWelcomeDismiss");
    var titleEl = document.getElementById("sbPortalWelcomeTitle");
    var leadEl = document.getElementById("sbPortalWelcomeLead");
    var prof =
      typeof KidsCore !== "undefined" && typeof KidsCore.getProfile === "function"
        ? KidsCore.getProfile()
        : {};
    var rawName = prof && prof.name ? String(prof.name).trim() : "";
    var displayName = rawName || "Sofia";
    if (titleEl) {
      titleEl.textContent = "Welcome back, " + displayName + "!";
    }
    if (leadEl) {
      leadEl.textContent =
        "Let’s get creative — start a new book or open one you’ve put on your shelf.";
    }
    var reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function cleanUrl() {
      try {
        var u = new URL(window.location.href);
        if (!u.searchParams.has("from")) return;
        u.searchParams.delete("from");
        var next = u.pathname + (u.search || "") + (u.hash || "");
        window.history.replaceState({}, "", next);
      } catch (e2) {}
    }

    function dismiss() {
      if (!el || el.hidden) return;
      el.classList.add("is-leaving");
      document.body.classList.remove("sb-portal-welcome-open");
      window.setTimeout(function () {
        el.hidden = true;
        el.classList.remove("is-active", "is-leaving");
        el.setAttribute("aria-hidden", "true");
        document.removeEventListener("keydown", onKey);
        var startBtn = document.getElementById("sbStartJourney");
        if (startBtn && typeof startBtn.focus === "function") {
          startBtn.focus();
        }
      }, reduced ? 120 : 340);
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss();
      }
    }

    cleanUrl();
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("sb-portal-welcome-open");
    document.addEventListener("keydown", onKey);

    if (dismissBtn) {
      dismissBtn.addEventListener("click", function (e) {
        e.preventDefault();
        dismiss();
      });
    }

    el.addEventListener("click", function (e) {
      if (
        e.target &&
        e.target.classList &&
        e.target.classList.contains("sb-portal-welcome__veil")
      ) {
        dismiss();
      }
    });

    if (reduced) {
      el.classList.add("is-active");
      if (dismissBtn) dismissBtn.focus();
    } else {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          el.classList.add("is-active");
          if (dismissBtn) dismissBtn.focus();
        });
      });
    }
  }

  function startStorybookApp() {
  buildChipRows();
  wirePlotStarters();
  if (readStepBtn) {
    readStepBtn.addEventListener("click", toggleStepGuide);
    refreshReadStepBtn();
  }
  initVoiceUi();

    function runAfterShelfHydrate() {
  renderShelf();
      setupShelfCloudSync();
    }

    if (window.StorybookShelfStore && typeof window.StorybookShelfStore.ready === "function") {
      window.StorybookShelfStore.ready()
        .then(function () {
          return window.StorybookShelfStore.getJson();
        })
        .then(function (list) {
          shelfCache = Array.isArray(list) ? list : [];
        })
        .catch(function () {
          shelfCache = loadShelfSyncFromLocalStorage();
        })
        .then(runAfterShelfHydrate);
    } else {
      shelfCache = loadShelfSyncFromLocalStorage();
      runAfterShelfHydrate();
    }
  }

  function mergeFailedMessage(raw) {
    var s = String(raw || "");
    if (
      s === "localStorage_quota" ||
      s === "storage_quota" ||
      /quota|QuotaExceeded/i.test(s)
    ) {
      return (
        "This phone or tablet ran out of space for this site’s saved data.\n\n" +
        "Remove a few books from the shelf on this device (tap × on a cover), or clear site data for this website in Safari/Chrome settings, then open Build your book and tap “Get latest books from cloud” again."
      );
    }
    return s;
  }

  function setupShelfCloudSync() {
    if (!window.KidsScoreCloud || !window.KidsScoreCloud.mergeStorybookShelfFromCloud) {
      return;
    }
    var shelfPullTimer = null;
    function pullShelfFromCloudNow() {
      window.KidsScoreCloud.mergeStorybookShelfFromCloud(function (err) {
        if (err) {
          var msg = err && err.message ? err.message : String(err);
          window.alert(
            "Could not load your library from the cloud.\n\n" +
              mergeFailedMessage(msg) +
              "\n\nAlso check you are signed in under ⚙️ on this device.",
          );
        }
        reloadShelfCacheFromStore(function () {
          renderShelf();
        });
      });
    }
    function pullShelfFromCloud() {
      if (shelfPullTimer) {
        clearTimeout(shelfPullTimer);
      }
      shelfPullTimer = setTimeout(function () {
        shelfPullTimer = null;
        pullShelfFromCloudNow();
      }, 200);
    }

    window.addEventListener("kids-storybook-merge-failed", function (e) {
      var raw = (e.detail && e.detail.message) || "Unknown error";
      window.alert("Could not update your story library on this device.\n\n" + mergeFailedMessage(raw));
      reloadShelfCacheFromStore(function () {
        renderShelf();
      });
    });

    pullShelfFromCloudNow();
    window.addEventListener("kids-scorecard-refresh", function () {
      reloadShelfCacheFromStore(function () {
          renderShelf();
      });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        pullShelfFromCloud();
      }
    });
    window.addEventListener("pageshow", function () {
      pullShelfFromCloud();
    });

    var btnPullLibrary = document.getElementById("sbPullLibrary");
    if (btnPullLibrary) {
      function syncPullButtonVisibility() {
        var on =
          window.KidsScoreCloud &&
          window.KidsScoreCloud.isConfigured &&
          window.KidsScoreCloud.isConfigured();
        btnPullLibrary.hidden = !on;
      }
      syncPullButtonVisibility();
      window.addEventListener("kids-scorecard-refresh", syncPullButtonVisibility);
      btnPullLibrary.addEventListener("click", function () {
        if (!window.KidsScoreCloud.isConfigured || !window.KidsScoreCloud.isConfigured()) {
          window.alert(
            "Turn on Sync on the main menu (gear) and sign in — then you can pull books from the cloud.",
          );
          return;
        }
        pullShelfFromCloudNow();
      });
    }
  }

  initPortalWelcome();
  startStorybookApp();

  if (immersiveReaderMq.addEventListener) {
    immersiveReaderMq.addEventListener("change", setReaderImmersiveFromLayout);
  } else if (immersiveReaderMq.addListener) {
    immersiveReaderMq.addListener(setReaderImmersiveFromLayout);
  }

  if (actionsFab) {
    actionsFab.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!book || !book.classList.contains("sb-book--immersive")) return;
      var open = !book.classList.contains("sb-book--actions-open");
      setBookActionsOpen(open);
    });
  }
  document.addEventListener(
    "click",
    function (e) {
      if (!book || !book.classList.contains("sb-book--immersive")) return;
      if (!book.classList.contains("sb-book--actions-open")) return;
      if (!actionsDock || !e.target || !e.target.closest) return;
      if (e.target.closest("#sbBookActionsDock")) return;
      setBookActionsOpen(false);
    },
    true
  );
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!book || !book.classList.contains("sb-book--immersive")) return;
    if (!book.classList.contains("sb-book--actions-open")) return;
    setBookActionsOpen(false);
  });

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

  if (heroPhotoInput) {
    heroPhotoInput.addEventListener("change", function () {
      setHeroPhotoError("");
      var files = Array.prototype.slice.call(heroPhotoInput.files || []);
      heroPhotoInput.value = "";
      if (!files.length) return;
      var slotsLeft = HERO_PHOTO_MAX_COUNT - heroPhotoItems.length;
      if (slotsLeft <= 0) {
        setHeroPhotoError("You already have 3 photos — remove one to add another.");
        return;
      }
      if (files.length > slotsLeft) {
        setHeroPhotoError("Only room for " + slotsLeft + " more — pick fewer photos.");
        files = files.slice(0, slotsLeft);
      }
      for (var i = 0; i < files.length; i++) {
        if (!/^image\/(jpeg|png|webp)$/i.test(files[i].type)) {
          setHeroPhotoError("Use JPG, PNG, or WebP photos only.");
          return;
        }
        if (files[i].size > HERO_PHOTO_MAX_FILE_BYTES) {
          setHeroPhotoError("Each photo must be under about 1 MB.");
          return;
        }
      }
      var reads = files.map(function (f) {
        return new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () {
            resolve(typeof r.result === "string" ? r.result : "");
          };
          r.onerror = function () {
            reject(new Error("read"));
          };
          r.readAsDataURL(f);
        });
      });
      Promise.all(reads)
        .then(function (urls) {
          urls.forEach(function (url) {
            if (
              url &&
              /^data:image\//i.test(url) &&
              heroPhotoItems.length < HERO_PHOTO_MAX_COUNT
            ) {
              heroPhotoItems.push({ dataUrl: url, who: "hero" });
            }
          });
          renderHeroPhotoThumbs();
        })
        .catch(function () {
          setHeroPhotoError("Could not read that photo.");
        });
    });
  }
  if (heroPhotoThumbsList) {
    heroPhotoThumbsList.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var rm = t.closest(".sb-hero-ref__thumb-remove");
      if (!rm) return;
      var idx = parseInt(rm.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < heroPhotoItems.length) {
        heroPhotoItems.splice(idx, 1);
        renderHeroPhotoThumbs();
        setHeroPhotoError("");
      }
    });
  }
  if (heroPhotoRemove) {
    heroPhotoRemove.addEventListener("click", function () {
      clearHeroPhoto();
    });
  }
  if (nameInput) {
    nameInput.addEventListener("input", function () {
      renderHeroPhotoThumbs();
    });
  }
  if (heroPhotoPickBtn && heroPhotoInput) {
    heroPhotoPickBtn.addEventListener("click", function () {
      heroPhotoInput.click();
    });
  }

  var btnNext0 = document.getElementById("sbNext0");
  var btnBack1 = document.getElementById("sbBack1");
  var btnNext1 = document.getElementById("sbNext1");
  var btnSkipToPlot = document.getElementById("sbSkipToPlot");
  var btnBack2 = document.getElementById("sbBack2");
  var btnNext2 = document.getElementById("sbNext2");
  var btnBack3 = document.getElementById("sbBack3");
  var btnNext3 = document.getElementById("sbNext3");
  var btnBack4 = document.getElementById("sbBack4");

  if (btnNext0) btnNext0.addEventListener("click", function () { goToStep(1); });
  if (btnBack1) btnBack1.addEventListener("click", function () { goToStep(0); });
  if (btnNext1) {
    btnNext1.addEventListener("click", function () {
      skippedBuddyAndPlace = false;
      goToStep(2);
    });
  }
  if (btnSkipToPlot) {
    btnSkipToPlot.addEventListener("click", function () {
      skippedBuddyAndPlace = true;
      selectedChar = "unicorn";
      selectedPlace = "beach";
      refreshCharacterChips();
      refreshPlaceChips();
      goToStep(4);
    });
  }
  if (btnBack2) btnBack2.addEventListener("click", function () { goToStep(1); });
  if (btnNext2) btnNext2.addEventListener("click", function () { goToStep(3); });
  if (btnBack3) btnBack3.addEventListener("click", function () { goToStep(2); });
  if (btnNext3) btnNext3.addEventListener("click", function () { goToStep(4); });
  if (btnBack4) {
    btnBack4.addEventListener("click", function () {
      goToStep(skippedBuddyAndPlace ? 1 : 3);
    });
  }

  if (btnGen) {
    btnGen.addEventListener("click", function () {
      setError("");
      var url = functionUrl();
      var key = anonKey();
      if (!url || !key) {
        setError("Story magic isn’t set up here yet. Ask a grown-up to open ⚙️ and check sign-in / settings.");
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
          bookCoverColor: selectedBookCoverColor || undefined,
          characterReferencePhotos: heroPhotoItems.length
            ? heroPhotoItems.map(function (x) {
                return { who: x.who, image: x.dataUrl };
              })
            : undefined,
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, status: r.status, body: j };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            var b =
              out.body && typeof out.body === "object" ? out.body : {};
            /** Supabase WORKER_LIMIT or Gateway Timeout — story + six images often exceeds Edge budget */
            var isTimeout =
              out.status === 546 ||
              out.status === 504 ||
              Number(b.code) === 546 ||
              Number(b.code) === 504;
            var msg;
            if (isTimeout) {
              msg =
                "The story maker ran out of time — it was still drawing lots of pictures. Wait a moment and try again, or ask a grown-up for help.";
            } else if (b.error === "server_missing_openai") {
              msg =
                "Story drawing isn’t turned on for this game yet. A grown-up needs to finish setup on the server.";
            } else if (b.error === "fal_failed" && b.detail) {
              msg =
                "We couldn’t finish all the pictures — you weren’t given a mismatched book. Wait a moment and try again, or ask a grown-up to check billing and setup. " +
                String(b.detail).slice(0, 400);
            } else if (b.error === "gpt_image_failed" && b.detail) {
              msg =
                "Couldn’t make the book (pictures). " + String(b.detail).slice(0, 500);
            } else if (b.error === "images_failed" && b.detail) {
              msg =
                "Couldn’t make the book (pictures). " + String(b.detail);
            } else if (b.error === "story_failed") {
              msg =
                "Couldn’t finish the story text. Try again — if it keeps happening, ask a grown-up to check the setup.";
              if (b.detail) {
                msg += " " + String(b.detail).slice(0, 320);
              }
            } else if (b.error && typeof b.error === "string") {
              msg = "Couldn’t make the book (" + b.error + ").";
            } else {
              msg =
                "Couldn’t make the book (HTTP " +
                out.status +
                (b.msg ? ": " + String(b.msg).slice(0, 240) : "") +
                ").";
            }
            setError(msg);
            return;
          }
          var apiTitle =
            out.body && out.body.title ? String(out.body.title).trim() : "";
          var customTitle = bookTitleInput ? bookTitleInput.value.trim() : "";
          var customAuthor = authorInput ? authorInput.value.trim() : "";
          story = {
            title: customTitle || apiTitle || "Your story",
            author: customAuthor,
            bookColor: out.body.bookColor || null,
            readerFont: out.body.readerFont || null,
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
              ? "Can’t reach the story magic right now. Check your internet, or ask a grown-up to try again in a minute."
              : "Story magic isn’t set up here yet. Ask a grown-up to open ⚙️ and check sign-in / settings."
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
      setBookActionsOpen(false);
      showWizard();
    });
  }
  if (btnDownload) {
    btnDownload.addEventListener("click", function () {
      setBookActionsOpen(false);
      downloadStoryBook();
    });
  }
  if (btnShelf) {
    btnShelf.addEventListener("click", function () {
      setBookActionsOpen(false);
      saveBookToShelf();
    });
  }

  var prevCarouselBtn = document.getElementById("sbCarouselPrev");
  if (prevCarouselBtn) {
    prevCarouselBtn.addEventListener("click", function () {
      scrollCarousel(-1);
    });
  }
  
  var nextCarouselBtn = document.getElementById("sbCarouselNext");
  if (nextCarouselBtn) {
    nextCarouselBtn.addEventListener("click", function () {
      scrollCarousel(1);
    });
  }
  
  if (shelfEl) {
    shelfEl.addEventListener("scroll", function () {
      updateCarouselButtons();
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
