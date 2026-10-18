/* Visual story-making journey. Create sends the choices to Book V2.
   Surprise me does not start generation. A local preview is not a finished book. */
(function () {
  var CREW = [
    ["wondii-maya", "Maya"],
    ["wondii-leo", "Leo"],
    ["wondii-amara", "Amara"],
    ["wondii-finn", "Finn"],
    ["wondii-zara", "Zara"],
    ["wondii-theo", "Theo"],
    ["wondii-nia", "Nia"],
    ["wondii-arlo", "Arlo"],
    ["wondii-sofia", "Sofia"],
    ["wondii-ravi", "Ravi"],
    ["wondii-elsie", "Elsie"],
    ["wondii-jasper", "Jasper"]
  ];
  var THEMES = [
    ["Adventure", "🧭"],
    ["Animals", "🦊"],
    ["Magic", "✨"],
    ["Space", "🚀"],
    ["Friendship", "💛"],
    ["Mystery", "🔍"],
    ["Everyday", "🏠"],
    ["Surprise me", "🎲"]
  ];
  var SETTINGS = [
    ["library", "Wondii World"],
    ["bedroom", "At home"],
    ["woods", "In nature"],
    ["undersea", "Under the sea"],
    ["castle", "Somewhere magical"]
  ];
  var PLACE_ART = {
    library: "images/connect-four-world.jpg",
    bedroom: "images/storybook-landing-room-bg.jpg",
    woods: "images/jigsaw-presets/dino.jpg",
    undersea: "images/jigsaw-presets/dolphin.jpg",
    castle: "images/jigsaw-presets/unicorn.jpg"
  };
  var THEME_ART = {
    Adventure: "images/jigsaw-presets/dino.jpg",
    Animals: "images/jigsaw-presets/puppy.jpg",
    Magic: "images/jigsaw-presets/unicorn.jpg",
    Space: "images/jigsaw-presets/rocket.jpg",
    Friendship: "images/jigsaw-presets/kitten.jpg",
    Mystery: "images/portal/stories-night.jpg",
    Everyday: "images/math-race-park-wide.png",
    "Surprise me": "images/connect-four-world.jpg"
  };
  var IDEAS = [
    ["Maybe they discover a hidden door in the school library.", "A hidden door", "images/connect-four-world.jpg"],
    ["Maybe a lost star needs help to get home before morning.", "A lost star", "images/portal/stories-night.jpg"],
    ["Maybe a shy animal asks them to find a missing song.", "A missing song", "images/jigsaw-presets/kitten.jpg"],
    ["Maybe the castle garden grows a path that only friends can see.", "A secret path", "images/jigsaw-presets/unicorn.jpg"]
  ];
  var CUTOUT = {
    "wondii-maya": "cast-proof/maya-scene.png",
    "wondii-leo": "cast-proof/leo-scene.png"
  };

  var landing = document.getElementById("sbLanding");
  var journey = document.getElementById("sbStoryJourney");
  var stage = document.getElementById("sjStage");
  var title = document.getElementById("sjJourneyTitle");
  var stepLabel = document.getElementById("sjStepLabel");
  var nextBtn = document.getElementById("sjNext");
  var backBtn = document.getElementById("sjBack");
  var startBtn = document.getElementById("sbStartJourney");
  var surpriseBtn = document.getElementById("sbSurprise");
  var demoBtn = document.getElementById("sbPreviewSample");
  if (!landing || !journey || !stage) return;

  var step = "cast";
  var state = {
    ids: ["wondii-maya"],
    tab: "crew",
    theme: "Adventure",
    place: "library",
    idea: "",
    length: "medium",
    ageBand: knownAge(),
    notice: "",
    sceneKind: "place",
    justJoined: "",
    moreIdeas: false,
    pendingStar: "",
    pageCount: 0,
    author: "",
    approveGeneration: false,
    resumeApproved: false,
    resumePayload: null,
    continueError: "",
    sending: false,
    checkingProgress: false,
    accountId: "",
    shelfBook: null
  };
  var library = { mine: [], shared: [], personalities: {}, mineState: "idle", sharedState: "idle" };
  var portraits = {};
  var remembered = {};
  var castTouched = false;
  if (exactTestPages() === 12) {
    state.pageCount = 12;
    state.ageBand = "4-6";
    state.place = "woods";
    state.theme = "Adventure";
    state.length = "medium";
    state.idea = "Maya, Isaac and Sofia find a tiny blue boat caught in the reeds by the stream. The boat is trying to reach the lantern tree before the evening wind stops. They walk with it through the meadow, lift it over a fallen branch, and wait with it while the first lantern lights. The boat gets there, and the three of them walk home together.";
    state.ids = ["wondii-maya", "wondii-sofia"];
    castTouched = true;
  }

  function exactTestPages() {
    try {
      if (new URLSearchParams(window.location.search).get("pages") === "12") return 12;
    } catch (ePages) {}
    return 0;
  }

  function motionOk() {
    try {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (eMotion) {
      return true;
    }
  }

  function person(id) {
    var lists = [CREW, library.mine, library.shared];
    var i;
    var row;
    for (i = 0; i < lists.length; i++) {
      row = lists[i].filter(function (item) { return item[0] === id; })[0];
      if (row) {
        remembered[id] = row[1];
        return row;
      }
    }
    if (remembered[id]) return [id, remembered[id]];
    return null;
  }

  function star() {
    return person(state.ids[0]) || CREW[0];
  }

  function confirmedCrewId() {
    var found = [];
    function take(value) {
      if (value) found.push(String(value));
    }
    try {
      var account = window.WondiiAccount;
      var profile = account && (account.profile || account.child || null);
      if (profile) {
        take(profile.storyCharacterId);
        take(profile.linkedCharacterId);
        take(profile.crewId);
      }
    } catch (eAccount) {}
    try {
      var core = window.KidsCore;
      var kid = core && core.profile;
      if (typeof kid === "function") kid = kid();
      if (kid) {
        take(kid.storyCharacterId);
        take(kid.linkedCharacterId);
        take(kid.crewId);
      }
    } catch (eCore) {}
    var n;
    var match;
    for (n = 0; n < found.length; n++) {
      match = CREW.filter(function (item) { return item[0] === found[n]; })[0];
      if (match) return match[0];
    }
    return "wondii-maya";
  }

  function knownAge() {
    var bands = { "4-6": 1, "7-9": 1, "10-12": 1 };
    var found = "";
    function take(value) {
      if (found) return;
      var band = String(value || "");
      if (bands[band]) found = band;
    }
    try {
      var account = window.WondiiAccount;
      var profile = account && (account.profile || account.child || null);
      if (profile) {
        take(profile.ageBand);
        take(profile.age_band);
      }
    } catch (eAge) {}
    try {
      var core = window.KidsCore;
      var kid = core && core.profile;
      if (typeof kid === "function") kid = kid();
      if (kid) {
        take(kid.ageBand);
        take(kid.age_band);
      }
    } catch (eKid) {}
    return found;
  }

  function applyLinkedStar() {
    if (castTouched) return;
    state.ids = [confirmedCrewId()];
  }

  function portraitSrc(id) {
    if (portraits[id]) return portraits[id];
    if (CREW.filter(function (row) { return row[0] === id; })[0]) {
      return "images/characters/crew/" + id + ".jpg";
    }
    return "";
  }

  function safePicture(src) {
    var picture = String(src || "");
    if (picture.indexOf("blob:") === 0 || picture.indexOf("data:image/") === 0) return picture;
    if (/^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/sign\//i.test(picture)) return picture;
    if (picture.indexOf("images/characters/crew/") === 0) return picture;
    return "";
  }

  function stampArt(id, url) {
    var nodes = document.querySelectorAll("[data-art]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-art") === id) nodes[i].src = url;
    }
  }

  function rememberRows(rows) {
    rows.forEach(function (row) { remembered[row[0]] = row[1]; });
  }

  function placeName() {
    var row = SETTINGS.filter(function (item) { return item[0] === state.place; })[0];
    return row ? row[1] : "Wondii World";
  }

  function lengthName() {
    if (state.length === "short") return "Short — lighter pages";
    if (state.length === "long") return "Long — more detail on every page";
    return "Medium — the usual storybook";
  }

  function friendNames() {
    return state.ids.slice(1).map(function (id) {
      var row = person(id);
      return row ? row[1] : "";
    }).filter(Boolean);
  }

  function setStatus(text) {
    var node = document.getElementById("sjStatus");
    if (node) node.textContent = text;
  }

  function crumbs(current) {
    stepLabel.textContent = "";
    ["Your stars", "Your world", "Your idea", "Your book"].forEach(function (name, index) {
      if (index) stepLabel.appendChild(document.createTextNode(" → "));
      var span = document.createElement("span");
      span.textContent = name;
      if (name === current) span.setAttribute("aria-current", "step");
      stepLabel.appendChild(span);
    });
  }

  function sceneArt() {
    if (step === "cast") return PLACE_ART.library;
    return PLACE_ART[state.place] || PLACE_ART.library;
  }

  function applyScene(url) {
    document.body.style.setProperty("--sj-world", 'url("' + url + '")');
    document.body.dataset.sjPlace = step === "cast" ? "library" : state.place;
  }

  function turnPage() {
    var reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (eMotion) {}
    stage.classList.remove("is-turn");
    if (reduce) return;
    window.requestAnimationFrame(function () {
      stage.classList.add("is-turn");
    });
  }

  function dressWelcome() {
    var figure = landing.querySelector(".sj-companion");
    if (figure) figure.hidden = true;
  }

  function showWelcome() {
    journey.classList.remove("sj-on-stars", "sj-shell");
    journey.hidden = true;
    journey.classList.remove("is-kept");
    landing.hidden = false;
    landing.classList.remove("is-hidden", "is-opening");
    applyScene(PLACE_ART.library);
    dressWelcome();
  }

  function showJourney() {
    landing.hidden = true;
    landing.classList.add("is-hidden");
    landing.classList.remove("is-opening");
    journey.hidden = false;
    paint();
  }

  var opening = false;
  function openTheBook() {
    if (opening) return;
    applyLinkedStar();
    step = "cast";
    if (!motionOk()) {
      showJourney();
      turnPage();
      return;
    }
    opening = true;
    landing.classList.add("is-opening");
    window.setTimeout(function () {
      opening = false;
      showJourney();
      turnPage();
    }, 680);
  }

  function findCast(id) {
    var nodes = stage.querySelectorAll(".sj-hero, .sj-pal");
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-who") === id) return nodes[i];
    }
    return null;
  }

  function faceButton(row) {
    var at = state.ids.indexOf(row[0]);
    var on = at >= 0;
    var isStar = at === 0;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sj-face" + (on ? " is-on" : "") + (isStar ? " is-star" : "");
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.setAttribute("aria-label", row[1] + (isStar ? ", the star" : on ? ", a friend" : ", not in the story"));
    var img = document.createElement("img");
    img.alt = "";
    img.setAttribute("data-art", row[0]);
    var src = portraitSrc(row[0]);
    if (src) img.src = src;
    button.appendChild(img);
    button.appendChild(document.createTextNode(row[1]));
    if (on) {
      var role = document.createElement("em");
      role.className = "sj-role";
      role.textContent = isStar ? "★ Star" : "● Friend";
      button.appendChild(role);
    }
    button.addEventListener("click", function () {
      castTouched = true;
      var index = state.ids.indexOf(row[0]);
      if (index === 0 && state.ids.length > 1) {
        var leavingStar = findCast(row[0]);
        state.ids.splice(0, 1);
        state.notice = (person(state.ids[0]) || ["", "A friend"])[1] + " is now the star.";
        if (leavingStar && motionOk()) {
          leavingStar.classList.add("is-leave");
          window.setTimeout(paint, 280);
          return;
        }
      } else if (index > 0) {
        var leaving = findCast(row[0]);
        state.ids.splice(index, 1);
        state.notice = row[1] + " is out of the story.";
        if (leaving && motionOk()) {
          leaving.classList.add("is-leave");
          window.setTimeout(paint, 280);
          return;
        }
      } else if (index === 0) {
        state.notice = "A story needs a star. Tap a friend to bring them along.";
      } else if (state.ids.length < 4) {
        state.ids.push(row[0]);
        state.justJoined = row[0];
        remembered[row[0]] = row[1];
        state.notice = state.ids.length === 1
          ? row[1] + " is the star."
          : row[1] + " is coming too.";
      } else {
        state.notice = "Four characters is the most. Tap someone to take them out first.";
      }
      paint();
    });
    return button;
  }

  function castFigure(id, role) {
    var who = person(id);
    var fig = document.createElement("figure");
    fig.className = role === "star" ? "sj-hero" : "sj-pal";
    fig.setAttribute("data-who", who[0]);
    if (state.justJoined === who[0]) fig.classList.add("is-join");
    var img = document.createElement("img");
    img.alt = "";
    var picture = portraitSrc(who[0]);
    if (picture) img.src = picture;
    img.setAttribute("data-art", who[0]);
    fig.appendChild(img);
    var cap = document.createElement("figcaption");
    var badge = document.createElement("span");
    badge.textContent = role === "star" ? "Star" : "Friend";
    cap.appendChild(badge);
    cap.appendChild(document.createTextNode(who[1]));
    fig.appendChild(cap);
    return fig;
  }

  function troupe() {
    return starsTroupe();
  }

  function sceneFigure(id, role) {
    var who = person(id);
    if (!who) return null;
    var cutout = CUTOUT[who[0]] || "";
    var fig = document.createElement("figure");
    fig.className = (role === "star" ? "sj-hero" : "sj-pal") + (cutout ? " sj-live" : " sj-token");
    fig.setAttribute("data-who", who[0]);
    if (state.justJoined === who[0]) fig.classList.add("is-join");
    var cap = document.createElement("figcaption");
    var badge = document.createElement("span");
    badge.textContent = role === "star" ? "Star" : "Friend";
    cap.appendChild(badge);
    cap.appendChild(document.createTextNode(who[1]));
    fig.appendChild(cap);
    if (cutout) {
      var feet = document.createElement("div");
      feet.className = "sj-feet";
      var live = document.createElement("img");
      live.className = "sj-cutout";
      live.alt = "";
      live.src = cutout;
      feet.appendChild(live);
      fig.appendChild(feet);
    } else {
      var locket = document.createElement("div");
      locket.className = "sj-locket";
      var portrait = document.createElement("img");
      portrait.alt = "";
      portrait.setAttribute("data-art", who[0]);
      var src = portraitSrc(who[0]);
      if (src) portrait.src = src;
      locket.appendChild(portrait);
      fig.appendChild(locket);
      var stand = document.createElement("i");
      stand.className = "sj-stand";
      stand.setAttribute("aria-hidden", "true");
      fig.appendChild(stand);
    }
    return fig;
  }

  function starsTroupe() {
    var group = document.createElement("div");
    group.className = "sj-troupe";
    var friends = state.ids.slice(1).filter(person);
    var first = friends[0] ? sceneFigure(friends[0], "friend") : null;
    var lead = sceneFigure(state.ids[0], "star");
    if (first) group.appendChild(first);
    if (lead) group.appendChild(lead);
    friends.slice(1).forEach(function (id) {
      var fig = sceneFigure(id, "friend");
      if (fig) group.appendChild(fig);
    });
    return group;
  }

  function storePortrait(id, url) {
    var picture = safePicture(url);
    if (!picture) return;
    portraits[id] = picture;
    stampArt(id, picture);
  }

  function requestMine() {
    if (library.mineState === "loading" || library.mineState === "ready" || library.mineState === "signed-out") return;
    var lib = window.ChildLibrary;
    if (lib && lib.isChildSession && lib.isChildSession() && lib.loadCharacters) {
      library.mineState = "loading";
      lib.loadCharacters(function (err, list) {
        if (err) {
          library.mineState = "signed-out";
          if (step === "cast") paint();
          return;
        }
        library.mine = [];
        library.personalities = {};
        (list || []).forEach(function (row) {
          if (!row || !row.id || !row.name) return;
          var id = String(row.id);
          library.mine.push([id, String(row.name).slice(0, 40)]);
          library.personalities[id] = row.personality || null;
          if (lib.characterArtUrl) {
            lib.characterArtUrl(row.id, function (artErr, url) {
              if (!artErr) storePortrait(id, url);
            });
          }
        });
        rememberRows(library.mine);
        library.mineState = "ready";
        applyPendingStar();
        if (step === "cast") paint();
      });
      return;
    }
    var store = window.CharacterStore;
    if (!store || !store.loadCharacters) {
      library.mineState = "signed-out";
      return;
    }
    library.mineState = "loading";
    store.loadCharacters(function (err, list) {
      if (err) {
        library.mineState = err.code === "no_session" || err.code === "school-signed-out" ? "signed-out" : "error";
        if (step === "cast") paint();
        return;
      }
      library.mine = [];
      library.personalities = {};
      (list || []).forEach(function (row) {
        if (!row || !row.id || !row.name) return;
        var id = String(row.id);
        library.mine.push([id, String(row.name).slice(0, 40)]);
        library.personalities[id] = row.personality || null;
        if (store.getCharacterSignedUrl) {
          store.getCharacterSignedUrl(row.id, function (urlErr, url) {
            if (!urlErr) storePortrait(id, url);
          });
        }
      });
      rememberRows(library.mine);
      library.mineState = "ready";
      applyPendingStar();
      if (step === "cast") paint();
    });
  }

  function shareRowId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function requestShared() {
    if (library.sharedState === "loading" || library.sharedState === "ready" || library.sharedState === "signed-out") return;
    var lib = window.ChildLibrary;
    if (!lib || !lib.isChildSession || !lib.isChildSession() || !lib.listSharedCharacters) {
      library.sharedState = "signed-out";
      if (state.pendingStar && shareRowId(state.pendingStar) && step === "cast") paint();
      return;
    }
    library.sharedState = "loading";
    lib.listSharedCharacters(function (err, rows) {
      if (err) {
        library.shared = [];
        library.sharedState = String(err && err.message) === "not_child" ? "signed-out" : "error";
        if (step === "cast") paint();
        return;
      }
      library.shared = [];
      (rows || []).forEach(function (row) {
        if (!row || !shareRowId(row.id)) return;
        var id = String(row.id);
        var name = String(row.title || "").trim().slice(0, 40);
        if (!name) return;
        library.shared.push([id, name]);
        if (lib.localArtUrl) {
          lib.localArtUrl("shared/" + id + "/character.png", function (artErr, url) {
            if (!artErr) storePortrait(id, url);
          });
        }
      });
      rememberRows(library.shared);
      library.sharedState = "ready";
      applyPendingStar();
      if (step === "cast") paint();
    });
  }

  function takePendingStar() {
    var raw = "";
    try {
      raw = sessionStorage.getItem("wondii-journey-star") || "";
      if (raw) sessionStorage.removeItem("wondii-journey-star");
    } catch (ePending) {
      return;
    }
    raw = String(raw).trim();
    if (!raw) return;
    if (raw.indexOf("builtin:") === 0) raw = raw.slice(8);
    castTouched = true;
    var crew = CREW.filter(function (item) {
      return item[0] === raw || item[0] === "wondii-" + raw;
    })[0];
    if (crew) {
      state.ids = [crew[0]];
      state.pendingStar = "";
      return;
    }
    state.pendingStar = raw;
    state.ids = [];
  }

  function applyPendingStar() {
    if (!state.pendingStar) return;
    var raw = state.pendingStar;
    var lists = library.mine.concat(library.shared);
    var row = lists.filter(function (item) { return item[0] === raw; })[0];
    if (!row) return;
    state.ids = [row[0]];
    state.pendingStar = "";
    castTouched = true;
    if (step === "cast") paint();
  }

  function libraryNote(which) {
    var mode = which === "mine" ? library.mineState : library.sharedState;
    if (mode === "loading") return which === "mine" ? "Opening your characters…" : "Opening characters shared with you…";
    if (mode === "error") return "Those characters could not be opened. Wondii Crew is ready here.";
    if (mode === "ready") {
      var list = which === "mine" ? library.mine : library.shared;
      if (!list.length) {
        return which === "mine"
          ? "You have not saved a character yet. Wondii Crew is ready here."
          : "No characters have been shared with you yet. Wondii Crew is ready here.";
      }
    }
    return "Sign in to use saved or shared characters. Wondii Crew is ready here.";
  }

  function pickedStrip() {
    var head = document.createElement("div");
    head.className = "sj-picked-head";
    head.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-kicker",
      textContent: "Coming along · " + Math.max(0, state.ids.length - 1) + " of 3 friends"
    }));
    var picked = document.createElement("div");
    picked.className = "sj-picked";
    state.ids.forEach(function (id) {
      var who = person(id);
      if (!who) return;
      var chip = document.createElement("span");
      chip.className = "sj-medal" + (id === state.ids[0] ? " is-star" : "");
      var img = document.createElement("img");
      img.alt = "";
      img.setAttribute("data-art", who[0]);
      var src = portraitSrc(who[0]);
      if (src) img.src = src;
      chip.appendChild(img);
      chip.appendChild(document.createElement("strong")).textContent = who[1];
      chip.appendChild(Object.assign(document.createElement("em"), {
        textContent: id === state.ids[0] ? "★ Star" : "● Friend"
      }));
      picked.appendChild(chip);
    });
    head.appendChild(picked);
    return head;
  }

  function paintCast() {
    title.textContent = "Who's coming on your adventure?";
    crumbs("Your stars");
    backBtn.textContent = "Back";
    nextBtn.textContent = "Continue";
    nextBtn.disabled = state.ids.length < 1;
    var root = document.createElement("div");
    root.className = "sj-layout";
    var meadow = document.createElement("div");
    meadow.className = "sj-scene";
    meadow.setAttribute("aria-hidden", "true");
    var picker = document.createElement("div");
    picker.className = "sj-dock sj-play";
    picker.appendChild(pickedStrip());
    picker.setAttribute("aria-label", "Choose who is in the story");
    var tabs = document.createElement("div");
    tabs.className = "sj-tabs";
    tabs.setAttribute("role", "tablist");
    [["crew", "Wondii Crew"], ["mine", "My Characters"], ["shared", "Shared With Me"]].forEach(function (item) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", state.tab === item[0] ? "true" : "false");
      tab.textContent = item[1];
      tab.addEventListener("click", function () {
        state.tab = item[0];
        if (item[0] === "mine") requestMine();
        if (item[0] === "shared") requestShared();
        paint();
      });
      tabs.appendChild(tab);
    });
    picker.appendChild(tabs);
    if (state.tab === "crew") {
      var grid = document.createElement("div");
      grid.className = "sj-faces";
      CREW.forEach(function (row) { grid.appendChild(faceButton(row)); });
      picker.appendChild(grid);
    } else if ((state.tab === "mine" ? library.mineState : library.sharedState) === "ready" && (state.tab === "mine" ? library.mine : library.shared).length) {
      var saved = document.createElement("div");
      saved.className = "sj-faces";
      (state.tab === "mine" ? library.mine : library.shared).forEach(function (row) {
        saved.appendChild(faceButton(row));
      });
      picker.appendChild(saved);
    } else {
      picker.appendChild(Object.assign(document.createElement("p"), {
        className: "sj-empty",
        textContent: libraryNote(state.tab)
      }));
    }
    picker.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-legend",
      textContent: "Tap once for the star. Tap a friend to bring them along. Four at most."
    }));
    picker.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-sr",
      textContent: "A star mark means the star. A dot means a friend. Up to four."
    }));
    root.appendChild(meadow);
    root.appendChild(picker);
    stage.appendChild(root);
    var pendingNote = "";
    if (state.pendingStar && !state.ids.length) {
      pendingNote = library.mineState === "loading" || library.sharedState === "loading"
        ? "That character is still opening. Choose someone here if they do not appear."
        : "That character could not be opened here. Choose someone from the crew or your characters.";
    }
    setStatus(pendingNote || state.notice || (nextBtn.disabled ? "Choose a star before you continue." : ""));
    state.justJoined = "";
  }

  function destination(selected, label, src, on) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sj-dest" + (selected ? " is-on" : "");
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    var img = document.createElement("img");
    img.alt = "";
    img.src = src;
    button.appendChild(img);
    button.appendChild(document.createElement("strong")).textContent = label;
    button.addEventListener("click", on);
    return button;
  }

  function placeCard(selected, id, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sj-place" + (selected ? " is-on" : "");
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    var img = document.createElement("img");
    img.alt = "";
    img.src = PLACE_ART[id];
    button.appendChild(img);
    button.appendChild(document.createElement("strong")).textContent = label;
    if (selected) {
      var mark = document.createElement("span");
      mark.className = "sj-check";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "✓";
      button.appendChild(mark);
    }
    button.addEventListener("click", function () {
      state.place = id;
      state.sceneKind = "place";
      paint();
    });
    return button;
  }

  function themeChip(selected, name) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sj-chip" + (selected ? " is-on" : "");
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.textContent = name;
    button.addEventListener("click", function () {
      state.theme = name;
      state.sceneKind = "theme";
      paint();
    });
    return button;
  }

  function stageShell(dock) {
    var layout = document.createElement("div");
    layout.className = "sj-layout";
    var scene = document.createElement("div");
    scene.className = "sj-scene";
    scene.setAttribute("aria-hidden", "true");
    layout.appendChild(scene);
    layout.appendChild(dock);
    return layout;
  }

  function paintWorld() {
    title.textContent = "Where shall we go?";
    crumbs("Your world");
    backBtn.textContent = "Back";
    nextBtn.textContent = "Continue";
    nextBtn.disabled = !state.theme || !state.place;
    var dock = document.createElement("div");
    dock.className = "sj-dock sj-where";
    dock.appendChild(Object.assign(document.createElement("p"), { className: "sj-kicker", textContent: "Where it happens" }));
    var places = document.createElement("div");
    places.className = "sj-places";
    SETTINGS.forEach(function (row) {
      places.appendChild(placeCard(state.place === row[0], row[0], row[1]));
    });
    dock.appendChild(places);
    dock.appendChild(Object.assign(document.createElement("p"), { className: "sj-kicker", textContent: "Kind of adventure" }));
    var themes = document.createElement("div");
    themes.className = "sj-chips";
    THEMES.forEach(function (row) {
      themes.appendChild(themeChip(state.theme === row[0], row[0]));
    });
    dock.appendChild(themes);
    stage.appendChild(stageShell(dock));
    var chosen = stage.querySelector(".sj-place.is-on");
    if (chosen && chosen.parentElement) {
      chosen.parentElement.scrollLeft = Math.max(0, chosen.offsetLeft - 8);
    }
    setStatus("");
  }

  function lengthButtons(focusAfter) {
    var lengths = document.createElement("div");
    lengths.className = "sj-lengths";
    [
      ["short", "Short", "Lighter pages"],
      ["medium", "Storybook", "The usual"],
      ["long", "Longer", "Richer pages"]
    ].forEach(function (row) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sj-length" + (state.length === row[0] ? " is-on" : "");
      button.setAttribute("aria-pressed", state.length === row[0] ? "true" : "false");
      button.appendChild(document.createElement("strong")).textContent = row[1];
      button.appendChild(document.createElement("span")).textContent = row[2];
      button.addEventListener("click", function () {
        state.length = row[0];
        paint();
        if (focusAfter) {
          var again = stage.querySelector("textarea");
          if (again) again.focus();
        }
      });
      lengths.appendChild(button);
    });
    return lengths;
  }

  function paintIdea() {
    title.textContent = "What happens in your adventure?";
    crumbs("Your idea");
    backBtn.textContent = "Back";
    nextBtn.textContent = "Continue";
    nextBtn.disabled = false;
    var dock = document.createElement("div");
    dock.className = "sj-dock sj-journal";
    var leafWrite = document.createElement("label");
    leafWrite.className = "sj-write";
    leafWrite.appendChild(Object.assign(document.createElement("span"), {
      className: "sj-kicker",
      textContent: "Your story journal"
    }));
    var box = document.createElement("textarea");
    box.maxLength = 600;
    box.placeholder = "Write what happens…";
    box.value = state.idea;
    box.addEventListener("input", function () {
      state.idea = box.value;
    });
    leafWrite.appendChild(box);
    dock.appendChild(leafWrite);
    var ideas = document.createElement("div");
    ideas.className = "sj-suggests sj-inspires";
    var shown = state.moreIdeas ? IDEAS : IDEAS.slice(0, 3);
    shown.forEach(function (row) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "sj-inspire" + (state.idea === row[0] ? " is-on" : "");
      card.setAttribute("aria-label", row[0]);
      var img = document.createElement("img");
      img.alt = "";
      img.src = row[2];
      card.appendChild(img);
      card.appendChild(document.createElement("strong")).textContent = row[1];
      card.addEventListener("click", function () {
        state.idea = row[0];
        paint();
        var again = stage.querySelector("textarea");
        if (again) again.focus();
      });
      ideas.appendChild(card);
    });
    if (!state.moreIdeas && IDEAS.length > 3) {
      var more = document.createElement("button");
      more.type = "button";
      more.className = "sj-inspire sj-inspire--more";
      more.textContent = "More ideas";
      more.addEventListener("click", function () {
        state.moreIdeas = true;
        paint();
      });
      ideas.appendChild(more);
    }
    dock.appendChild(ideas);
    var lengthRow = document.createElement("div");
    lengthRow.className = "sj-length-row";
    lengthRow.appendChild(Object.assign(document.createElement("p"), { className: "sj-kicker", textContent: "Story length" }));
    lengthRow.appendChild(lengthButtons(true));
    dock.appendChild(lengthRow);
    stage.appendChild(stageShell(dock));
    setStatus("");
  }

  function plotText() {
    var who = state.ids.map(function (id) {
      var row = person(id);
      return row ? row[1] : "";
    }).filter(Boolean);
    var theme = state.theme === "Surprise me" ? "surprise adventure" : state.theme.toLowerCase() + " story";
    var idea = state.idea.trim();
    var article = /^[aeiou]/.test(theme) ? "an" : "a";
    var line = "Write " + article + " " + theme + " starring " + who.join(" and ") + ".";
    if (idea) line += " " + idea;
    return line;
  }

  function summaryRow(list, term, detail) {
    var wrap = document.createElement("div");
    wrap.appendChild(Object.assign(document.createElement("dt"), { textContent: term }));
    wrap.appendChild(Object.assign(document.createElement("dd"), { textContent: detail }));
    list.appendChild(wrap);
  }

  function chosenAuthor() {
    var Shelf = window.WondiiBookV2Shelf;
    if (Shelf && Shelf.authorCredit) return Shelf.authorCredit(state.author);
    return String(state.author || "").replace(/\s+/g, " ").trim().slice(0, 40);
  }

  function quoteLine() {
    var Budget = window.WondiiBookV2Budget;
    var CostLine = window.WondiiApprovalCost;
    if (!Budget || !Budget.quote || !CostLine || !CostLine.approvalCostLine) {
      return "The cost is checked on Wondii's servers before any pictures are made.";
    }
    return CostLine.approvalCostLine(state.creationKey, Budget.quote(), Budget.GBP_PER_USD);
  }

  function childNow() {
    return !!(window.ChildLibrary && window.ChildLibrary.isChildSession && window.ChildLibrary.isChildSession());
  }

  function capLine() {
    return "The maximum for this story is held on Wondii's servers. This page cannot raise it, and a child account cannot approve it.";
  }

  function approvalNote() {
    if (childNow()) {
      return "A grown-up needs to approve this book before Wondii writes it or draws the pictures. Nothing is charged from a child account.";
    }
    if (state.approveGeneration) {
      return "Create My Book records your approval for this story on this account. Wondii checks the spending limit on the server before any pictures are made. Unattended continuation stays off until Wondii turns it on for this account.";
    }
    return "Save the story idea keeps the plan only. No pictures are drawn and nothing is charged.";
  }

  function savedNames() {
    var members = state.resumePayload && Array.isArray(state.resumePayload.members) ? state.resumePayload.members : [];
    var named = members.map(function (member) {
      return member && member.name ? String(member.name) : "";
    }).filter(Boolean);
    if (named.length) return named;
    return state.ids.map(function (id) {
      var row = person(id);
      return row ? row[1] : "";
    }).filter(Boolean);
  }

  function bookProgress(job) {
    var Progress = window.WondiiBookV2Progress;
    if (!Progress || !Progress.view) return null;
    return Progress.view(job || null, Date.now(), { names: savedNames() });
  }

  function workshopOptions() {
    var reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (eMotion) {}
    var known = state.job && state.job.status && state.job.status !== "checking";
    return {
      now: Date.now(),
      names: savedNames(),
      shelfBook: state.shelfBook || null,
      accountId: state.accountId || "",
      reducedMotion: reduced,
      opening: state.checkingProgress === true && !known
    };
  }

  function workshopModel(job) {
    var Workshop = window.WondiiBookWorkshop;
    if (!Workshop || !Workshop.present) return null;
    var model = Workshop.present(job || null, workshopOptions());
    return model.showWorkshop ? model : null;
  }

  function rememberWorkshop(job) {
    var Workshop = window.WondiiBookWorkshop;
    var key = state.creationKey || (state.resumePayload && state.resumePayload.creationKey) || "";
    if (!key || !job || !Workshop || !Workshop.snapshot) return;
    try {
      var name = "wondii-workshop-job:" + key;
      var shot = Workshop.snapshot(job);
      var prior = localStorage.getItem(name) || "";
      var priorJob = "";
      try { priorJob = JSON.stringify(JSON.parse(prior).job || null); } catch (ePrior) { priorJob = ""; }
      if (priorJob === JSON.stringify(shot)) return;
      localStorage.setItem(name, JSON.stringify({ at: Date.now(), job: shot }));
    } catch (eStore) {}
  }

  function cachedWorkshop(key) {
    try {
      var raw = localStorage.getItem("wondii-workshop-job:" + key) || "";
      var saved = raw ? JSON.parse(raw) : null;
      return saved && saved.job && saved.job.status ? saved.job : null;
    } catch (eRead) {
      return null;
    }
  }

  function confirmShelf(key) {
    var userId = state.accountId || "";
    var store = window.StorybookShelfStore;
    var read = store && userId && store.getJson ? store.getJson() : Promise.resolve([]);
    return read.then(function (local) {
      return readCloudShelf().then(function (cloud) {
        var Shelf = window.WondiiBookV2Shelf;
        var list = Shelf && Shelf.mergeOwned ? Shelf.mergeOwned(local, cloud) : (local || []);
        var found = null;
        list.forEach(function (item) {
          if (item && String(item.creationKey || "") === String(key || "")) found = item;
        });
        return finishedBook(found) ? found : null;
      });
    }).catch(function () {
      return null;
    });
  }

  function showWorkshopJob(job) {
    rememberWorkshop(job);
    var done = job && (job.status === "complete" || job.reason === "saved");
    if (!done) {
      showPlanSaved(!!state.accountId, job);
      return;
    }
    var key = state.creationKey || (state.resumePayload && state.resumePayload.creationKey) || "";
    confirmShelf(key).then(function (book) {
      if (book) state.shelfBook = book;
      showPlanSaved(!!state.accountId, job);
    });
  }

  function showReadyBook(book, job) {
    state.shelfBook = book;
    state.sending = false;
    state.checkingProgress = false;
    showPlanSaved(true, Object.assign({}, job || {}, {
      status: "complete",
      reason: "saved",
      stage: "read",
      recoverable: false
    }));
  }

  /* A later automatic continuation could send the next saved unit while a
     parent is watching. This poll does not. It only reads status.
     After Continue, the first read can still be the expired job. That is not
     a result, so the poll keeps waiting until the checkpoint changes. */
  var quietTimer = 0;
  function beginQuietWatch(readStatus) {
    if (quietTimer || typeof readStatus !== "function") return;
    quietTimer = window.setInterval(function () {
      if (document.hidden || step !== "saved") return;
      if (!workshopModel(state.job)) return;
      readStatus().then(function (watched) {
        if (!watched || !watched.ok) return;
        var job = watched.body && watched.body.job || null;
        if (!job || !job.status) return;
        var Progress = window.WondiiBookV2Progress;
        if (state.job && Progress && Progress.changed && !Progress.changed(state.job, job)) return;
        state.checkingProgress = false;
        state.continueError = "";
        if (job.status === "complete" || job.reason === "saved") {
          showWorkshopJob(job);
          return;
        }
        showPlanSaved(!!state.accountId, job);
        var seen = bookProgress(job);
        if (seen && seen.state === "working") {
          window.clearInterval(quietTimer);
          quietTimer = 0;
          pollJob(readStatus, !!state.accountId, null);
        }
      }).catch(function () {});
    }, 5000);
  }

  function pollJob(readStatus, onAccount, baseline) {
    if (quietTimer) {
      window.clearInterval(quietTimer);
      quietTimer = 0;
    }
    var polls = 0;
    var timer = 0;
    var Progress = window.WondiiBookV2Progress;
    function stop() {
      if (timer) window.clearInterval(timer);
    }
    function fail(message, job) {
      stop();
      state.sending = false;
      state.checkingProgress = false;
      state.continueError = message;
      var kept = state.job && state.job.status && state.job.status !== "checking" ? state.job : (job || baseline || state.job);
      showPlanSaved(onAccount, kept);
    }
    function tick() {
      polls += 1;
      if (polls > 52) {
        stop();
        state.sending = false;
        setStatus("Refresh this page to check again. Nothing extra was started.");
        return;
      }
      readStatus().then(function (watched) {
        if (!watched || watched.status === 401 || watched.status === 403) {
          fail("Sign in to check this story. Nothing was started.", { status: "unavailable", message: "Sign in to check this story. Nothing was started." });
          return;
        }
        if (!watched.ok) {
          var refused = Progress && Progress.reportedMessage
            ? Progress.reportedMessage(watched, "Unable to check progress right now.")
            : "Unable to check progress right now.";
          fail(refused, { status: "unavailable", message: refused });
          return;
        }
        var job = watched.body && watched.body.job || null;
        if (!job || !job.status) {
          if (polls >= 3) {
            var missing = Progress && Progress.reportedMessage
              ? Progress.reportedMessage(watched, "This story has not started. Nothing was charged.")
              : "This story has not started. Nothing was charged.";
            fail(missing, { status: "unavailable", message: missing });
          }
          return;
        }
        if (baseline && (!Progress || !Progress.changed || !Progress.changed(baseline, job))) {
          if (polls >= 6) fail("Continue did not start. The saved story was not changed.", baseline);
          return;
        }
        state.continueError = "";
        state.checkingProgress = false;
        var seen = bookProgress(job);
        if (job.status === "complete" || job.reason === "saved") {
          stop();
          state.sending = false;
          showWorkshopJob(job);
          beginQuietWatch(readStatus);
          return;
        }
        if (!seen || seen.state !== "working") state.sending = false;
        showPlanSaved(onAccount, job);
        if (!seen || seen.state !== "working") {
          stop();
          if (workshopModel(job)) beginQuietWatch(readStatus);
        }
      }).catch(function () {
        fail("Unable to check progress right now.", { status: "unavailable", message: "Unable to check progress right now." });
      });
    }
    tick();
    timer = window.setInterval(tick, 5000);
  }

  function paintSummary() {
    title.textContent = "Ready for your adventure?";
    crumbs("Your book");
    backBtn.textContent = "Edit";
    if (childNow()) state.approveGeneration = false;
    nextBtn.textContent = state.approveGeneration ? "Create My Book" : "Save the story idea";
    nextBtn.disabled = !state.ageBand;
    var dock = document.createElement("div");
    dock.className = "sj-dock sj-preview";
    dock.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-preview__flag",
      textContent: "Preview. This is not your finished book."
    }));
    var book = document.createElement("div");
    book.className = "sj-book";
    var cover = document.createElement("div");
    cover.className = "sj-book__cover";
    var picture = document.createElement("img");
    picture.alt = "";
    picture.src = PLACE_ART[state.place] || PLACE_ART.library;
    cover.appendChild(picture);
    var cast = document.createElement("div");
    cast.className = "sj-book__cast sj-picked";
    state.ids.forEach(function (id) {
      var who = person(id);
      if (!who) return;
      var chip = document.createElement("span");
      chip.className = "sj-medal" + (id === state.ids[0] ? " is-star" : "");
      var face = document.createElement("img");
      face.alt = "";
      var src = portraitSrc(who[0]);
      if (src) face.src = src;
      chip.appendChild(face);
      chip.appendChild(document.createElement("strong")).textContent = who[1];
      chip.appendChild(Object.assign(document.createElement("em"), {
        textContent: id === state.ids[0] ? "★ Star" : "● Friend"
      }));
      cast.appendChild(chip);
    });
    cover.appendChild(cast);
    cover.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-book__place",
      textContent: placeName()
    }));
    book.appendChild(cover);
    var page = document.createElement("div");
    page.className = "sj-book__page";
    page.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-ready__kind",
      textContent: state.theme
    }));
    page.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-ready__idea",
      textContent: state.idea.trim() || "A gentle adventure, ready when you are."
    }));
    var lengthLabel = state.length === "short" ? "Short" : state.length === "long" ? "Longer" : "Storybook";
    page.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-ready__length",
      textContent: lengthLabel
    }));
    var ages = document.createElement("div");
    ages.className = "sj-lengths";
    [
      ["4-6", "Ages 4–6", "Year 1 writing"],
      ["7-9", "Ages 7–9", "Ages 7–9 writing"],
      ["10-12", "Ages 10–12", "Year 6 writing"]
    ].forEach(function (row) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sj-length" + (state.ageBand === row[0] ? " is-on" : "");
      button.setAttribute("aria-pressed", state.ageBand === row[0] ? "true" : "false");
      button.appendChild(document.createElement("strong")).textContent = row[1];
      button.appendChild(document.createElement("span")).textContent = row[2];
      button.addEventListener("click", function () {
        state.ageBand = row[0];
        paint();
      });
      ages.appendChild(button);
    });
    page.appendChild(ages);
    var authorWrap = document.createElement("label");
    authorWrap.className = "sj-author";
    authorWrap.appendChild(document.createElement("span")).textContent = "Written by";
    var authorInput = document.createElement("input");
    authorInput.type = "text";
    authorInput.maxLength = 40;
    authorInput.autocomplete = "name";
    authorInput.placeholder = "Sofia, Mum and Sofia, or Class 1B";
    authorInput.value = state.author || "";
    authorInput.addEventListener("input", function () {
      state.author = authorInput.value;
    });
    authorWrap.appendChild(authorInput);
    page.appendChild(authorWrap);
    page.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-author__note",
      textContent: "This is the name you choose. It is not taken from the characters in the story. Wondii stays the publisher."
    }));
    page.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-quote",
      textContent: quoteLine()
    }));
    page.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-quote",
      textContent: capLine()
    }));
    if (!childNow()) {
      var approve = document.createElement("label");
      approve.className = "sj-approve";
      var approveBox = document.createElement("input");
      approveBox.type = "checkbox";
      approveBox.checked = state.approveGeneration === true;
      approveBox.addEventListener("change", function () {
        state.approveGeneration = approveBox.checked === true;
        nextBtn.textContent = state.approveGeneration ? "Create My Book" : "Save the story idea";
        var note = dock.querySelector(".sj-whisper");
        if (note) note.textContent = approvalNote();
      });
      approve.appendChild(approveBox);
      approve.appendChild(document.createElement("span")).textContent = "I approve Wondii writing and illustrating this book, up to the maximum shown here.";
      page.appendChild(approve);
    }
    book.appendChild(page);
    dock.appendChild(book);
    nextBtn.textContent = state.approveGeneration ? "Create My Book" : "Save the story idea";
    dock.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-whisper",
      textContent: approvalNote()
    }));
    stage.appendChild(stageShell(dock));
    setStatus("Nothing has been created yet.");
  }

  function showPlanSaved(onAccount, job) {
    state.planOnAccount = !!onAccount;
    state.job = job && (job.status || job.stages) ? job : null;
    if (state.job) rememberWorkshop(state.job);
    nextBtn.disabled = false;
    if (step === "saved") paint();
    else go("saved");
  }

  function paintWorkshop(model) {
    document.body.classList.add("bw-live");
    title.textContent = model.headline;
    stepLabel.textContent = "Book workshop";
    backBtn.textContent = "Leave for now";
    nextBtn.hidden = true;
    var Workshop = window.WondiiBookWorkshop;
    if (Workshop && Workshop.render) {
      Workshop.render(stage, model, {
        onContinue: function () {
          if (state.sending || !model.continueEnabled) return;
          nextBtn.disabled = false;
          nextBtn.click();
        }
      });
    }
    setStatus("");
  }

  function paintSaved() {
    document.body.classList.remove("bw-live");
    nextBtn.hidden = false;
    var who = savedNames().join(", ") || "Your characters";
    var progress = bookProgress(state.job);
    title.textContent = progress && progress.state && progress.state !== "saved" ? "This story is saved" : "Your story idea is saved";
    crumbs("Story plan");
    backBtn.textContent = "Make another story";
    nextBtn.textContent = state.checkingProgress ? "Checking" : (progress && progress.button ? progress.button : "Back to my bookshelf");
    nextBtn.disabled = state.checkingProgress === true || !(progress && progress.buttonEnabled) || state.sending === true;
    var dock = document.createElement("div");
    dock.className = "sj-dock sj-saved";
    dock.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-preview__flag",
      textContent: "Story plan. This is not a finished book."
    }));
    var card = document.createElement("div");
    card.className = "sj-saved-card";
    card.appendChild(Object.assign(document.createElement("h2"), {
      textContent: plannedTitle(state.idea)
    }));
    if (state.continueError) {
      card.appendChild(Object.assign(document.createElement("p"), {
        className: "sj-saved-note",
        textContent: state.continueError
      }));
    }
    card.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-ready__idea",
      textContent: state.idea.trim() || "A gentle adventure, ready when story writing begins."
    }));
    card.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-saved-note",
      textContent: state.planOnAccount
        ? who + (progress && progress.state && progress.state !== "saved"
          ? " are saved in this story."
          : " — this idea is saved on your account. The illustrated book has not been made yet.")
        : "This idea was checked on this computer. Sign in to keep it. The illustrated book has not been made yet."
    }));
    if (state.checkingProgress) {
      card.appendChild(Object.assign(document.createElement("p"), {
        className: "sj-saved-note",
        textContent: "Checking the latest progress…"
      }));
    }
    if (progress && progress.unitCount) {
      var meter = document.createElement("div");
      meter.className = "sj-illustration-meter";
      meter.appendChild(Object.assign(document.createElement("p"), {
        className: "sj-illustration-count",
        textContent: progress.acceptedLine
      }));
      var bar = document.createElement("div");
      bar.className = "sj-illustration-bar";
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(progress.unitCount));
      bar.setAttribute("aria-valuenow", String(progress.acceptedCount || 0));
      var fill = document.createElement("span");
      var portion = progress.unitCount ? (Number(progress.acceptedCount) || 0) / progress.unitCount : 0;
      fill.style.width = Math.max(0, Math.min(100, Math.round(portion * 100))) + "%";
      bar.appendChild(fill);
      meter.appendChild(bar);
      if (progress.previousLine) {
        meter.appendChild(Object.assign(document.createElement("p"), {
          className: "sj-illustration-step",
          textContent: progress.previousLine
        }));
      }
      if (progress.illustration) {
        meter.appendChild(Object.assign(document.createElement("p"), {
          className: "sj-illustration-step is-current",
          textContent: progress.illustration
        }));
      }
      card.appendChild(meter);
    }
    var steps = document.createElement("ol");
    steps.className = "sj-progress";
    var rows = progress && progress.rows && progress.rows.length ? progress.rows : (
      state.checkingProgress ? [] : [
        { label: "Story plan", tone: "done", word: "Done" },
        { label: "Story writing", tone: "waiting", word: "Waiting" },
        { label: "Art direction", tone: "waiting", word: "Waiting" },
        { label: "Pictures", tone: "waiting", word: "Waiting" },
        { label: "Picture check", tone: "waiting", word: "Waiting" },
        { label: "Save the book", tone: "waiting", word: "Waiting" },
        { label: "Open the book", tone: "waiting", word: "Waiting" }
      ]
    );
    rows.forEach(function (row) {
      var item = document.createElement("li");
      var tone = row.tone || "waiting";
      item.className = tone === "done" ? "is-done" : tone === "working" ? "is-running" : tone === "ready" ? "is-ready" : tone === "stopped" ? "is-stopped" : "is-waiting";
      item.appendChild(document.createElement("strong")).textContent = row.label;
      item.appendChild(document.createElement("span")).textContent = row.word || "Waiting";
      steps.appendChild(item);
    });
    card.appendChild(steps);
    dock.appendChild(card);
    dock.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-whisper",
      textContent: state.continueError
        ? state.continueError
        : progress && progress.state && progress.state !== "saved"
        ? progress.detail
        : state.approveGeneration
          ? "You approved this book. Story writing is not turned on for this account yet, so only the idea was saved. Nothing was charged."
          : "No pictures were drawn, and nothing was charged. You can approve the book when you are ready."
    }));
    stage.appendChild(stageShell(dock));
    setStatus(state.continueError || "");
  }

  function paint() {
    var model = step === "saved" ? workshopModel(state.job) : null;
    if (!(model && stage.querySelector("[data-workshop]"))) stage.innerHTML = "";
    if (!model) document.body.classList.remove("bw-live");
    journey.classList.add("sj-shell", "sj-v3");
    journey.classList.toggle("sj-on-stars", step === "cast");
    journey.classList.toggle("sj-on-world", step === "world");
    journey.classList.toggle("sj-on-idea", step === "idea");
    journey.classList.toggle("sj-on-review", step !== "cast" && step !== "world" && step !== "idea");
    journey.classList.toggle("sj-on-saved", step === "saved");
    applyScene(sceneArt());
    if (step === "cast") paintCast();
    else if (step === "world") paintWorld();
    else if (step === "idea") paintIdea();
    else if (step === "saved" && model) paintWorkshop(model);
    else if (step === "saved") paintSaved();
    else paintSummary();
  }

  function go(next) {
    step = next;
    showJourney();
    turnPage();
  }

  backBtn.addEventListener("click", function () {
    if (step === "saved" && workshopModel(state.job)) {
      window.location.assign("../portal.html#stories");
      return;
    }
    if (step === "saved") go("cast");
    else if (step === "cast") showWelcome();
    else if (step === "world") go("cast");
    else if (step === "idea") go("world");
    else go("idea");
  });

  function failContinue(message, job) {
    state.sending = false;
    state.continueError = message || "Continue did not start. The saved story was not changed.";
    nextBtn.disabled = false;
    showPlanSaved(!!state.planOnAccount, job || state.job);
  }

  nextBtn.addEventListener("click", function () {
    if (nextBtn.disabled) return;
    var continued = null;
    if (step === "saved") {
      var shown = bookProgress(state.job);
      if (state.sending || (shown && shown.active)) return;
      if (!(shown && shown.canContinue)) {
        window.location.assign("../portal.html#stories");
        return;
      }
      var Shelf = window.WondiiBookV2Shelf;
      continued = Shelf && Shelf.continueRequest ? Shelf.continueRequest(state.resumePayload) : null;
      if (!continued) {
        failContinue("This story's saved cast could not be used. Nothing was started.");
        return;
      }
    }
    if (step === "cast") {
      if (!state.ids.length) {
        setStatus("Choose a star before you continue.");
        return;
      }
      go("world");
      return;
    }
    if (step === "world") {
      go("idea");
      return;
    }
    if (step === "idea") {
      go("summary");
      return;
    }
    if (!continued && !state.ageBand) {
      setStatus("Choose an age band before the story can be planned.");
      return;
    }
    var members = [];
    if (!continued) {
      var ShelfCast = window.WondiiBookV2Shelf;
      var restored = ShelfCast && ShelfCast.castFromResume ? ShelfCast.castFromResume(state.resumePayload) : null;
      var sameCast = restored && restored.members.map(function (member) { return member.id; }).join("\n") === state.ids.join("\n");
      if (sameCast) {
        members = restored.members.map(function (member) {
          return { id: member.id, name: member.name, source: member.source };
        });
        state.savedReferences = restored.savedReferences;
      } else {
        state.savedReferences = [];
        state.ids.forEach(function (id) {
          var row = person(id);
          if (!row) return;
          members.push({ id: id, name: row[1], source: memberSource(id) });
        });
      }
      if (!members.length || members.length !== state.ids.length) {
        setStatus("Choose each person again so nobody is left out of the story.");
        return;
      }
      if (members.some(function (member) { return !member.source; })) {
        setStatus("This saved story is missing its character pictures. Nothing was started.");
        return;
      }
    }
    nextBtn.disabled = true;
    state.sending = true;
    state.continueError = "";
    setStatus(continued ? "Continuing this story…" : "Checking the story plan…");
    whenSession(function (view) {
      var local = isLocalHost();
      var userId = view && view.userId ? String(view.userId) : "";
      if (userId) state.accountId = userId;
      var baseline = state.job;
      if (!local && !userId) {
        if (continued) failContinue("Sign in again before this story can continue. Nothing was changed.", baseline);
        else {
          state.sending = false;
          nextBtn.disabled = false;
          setStatus("Sign in to keep this story. Nothing was saved.");
        }
        return;
      }
      var endpoint = bookV2Url();
      if (!endpoint) {
        if (continued) failContinue("Book V2 is not available on this site yet. Nothing was changed.", baseline);
        else {
          state.sending = false;
          nextBtn.disabled = false;
          setStatus("Book V2 is not available on this site yet. Nothing was saved.");
        }
        return;
      }
      var key = continued ? continued.creationKey : creationKey();
      var making = !continued && state.approveGeneration === true;
      var resuming = !continued && state.resumeApproved === true;
      var pictures = continued ? continued.savedReferences : portraitReferences(members, userId);
      if (!continued && savedPicturesMissing(members, pictures)) {
        state.sending = false;
        nextBtn.disabled = false;
        setStatus("This saved story is missing its character pictures. Nothing was started.");
        return;
      }
      var payload = continued || {
        members: members,
        savedReferences: pictures,
        sharedCharacters: sharedArt(members),
        idea: state.idea.trim(),
        place: state.place,
        length: state.length,
        theme: state.theme,
        familyAgeBand: state.ageBand,
        authorDisplay: chosenAuthor(),
        creationKey: key,
        pageCount: state.pageCount || undefined,
        approveGeneration: making,
        automatic: making === true && !childNow(),
        background: making || resuming,
        continueJob: resuming
      };
      state.resumePayload = Object.assign({}, payload);
      delete state.resumePayload.approveGeneration;
      delete state.resumePayload.continueJob;
      delete state.resumePayload.background;
      delete state.resumePayload.watch;
      function followBook(send) {
        pollJob(function () {
          return send({ watch: true, background: false, approveGeneration: false, continueJob: false });
        }, !!userId, continued ? baseline : null);
      }
      function sendBook(extra) {
        return fetch(endpoint, {
          method: "POST",
          headers: planHeaders(view),
          body: JSON.stringify(Object.assign({}, payload, extra || {}))
        }).then(function (response) {
          return response.text().then(function (raw) {
            var body = {};
            try { body = raw ? JSON.parse(raw) : {}; } catch (eParse) { body = {}; }
            return { ok: response.ok, status: response.status, body: body };
          });
        });
      }
      var ready = making && userId ? keepPlannedBook({
        generated: false,
        simulated: true,
        request: { idea: state.idea.trim(), names: members.map(function (member) { return member.name; }) }
      }, key, userId, state.idea, null).catch(function (err) {
        if (err && err.message === "occupied") throw err;
        return null;
      }) : Promise.resolve();
      ready.then(function () {
        try {
          sessionStorage.setItem("wondii-book-active", key);
          sessionStorage.setItem("wondii-book-resume:" + key, JSON.stringify(state.resumePayload));
        } catch (eRemember) {}
        return sendBook();
      }).then(function (result) {
        var body = result.body || {};
        if (result.status === 404 || body.code === "NOT_FOUND") {
          if (continued) failContinue("Book V2 is not available on this site yet. Nothing was changed.", baseline);
          else {
            state.sending = false;
            nextBtn.disabled = false;
            setStatus("Book V2 is not available on this site yet. Nothing was saved.");
          }
          return;
        }
        if (result.status === 401 || result.status === 403) {
          if (continued) failContinue("Sign in again before this story can continue. Nothing was changed.", baseline);
          else {
            state.sending = false;
            nextBtn.disabled = false;
            setStatus("Sign in again before this story can be planned. Nothing was saved.");
          }
          return;
        }
        if (result.status === 202 || body.background === true) {
          state.checkingProgress = true;
          showPlanSaved(!!userId, state.job);
          followBook(sendBook);
          return;
        }
        state.sending = false;
        if (continued) {
          var returned = body.job || null;
          var Progress = window.WondiiBookV2Progress;
          var moved = !!(returned && Progress && Progress.changed && Progress.changed(baseline, returned));
          if (!result.ok || !body.ok || !moved) {
            failContinue(body.message || "Continue did not start. The saved story was not changed.", baseline);
            return;
          }
          state.continueError = "";
          if (body.saved && body.book && body.book.id && finishedBook(body.book)) {
            keepFinishedBook(body.book, userId).then(function (book) {
              showReadyBook(book, returned);
            }).catch(function () {
              failContinue("The illustrated book is ready, but it could not be saved on this device. It was not opened.", returned);
            });
            return;
          }
          if (returned.status === "complete" || returned.reason === "saved") {
            showWorkshopJob(returned);
            return;
          }
          showPlanSaved(!!userId, returned);
          return;
        }
        if (!result.ok || !body.ok) {
          nextBtn.disabled = false;
          setStatus(body.message || "The story plan could not start. Nothing was saved.");
          return;
        }
        var accountId = body.accountId ? String(body.accountId) : "";
        if ((accountId && accountId !== userId) && !(local && !userId)) {
          nextBtn.disabled = false;
          setStatus("This story plan was not tied to your account. Nothing was saved.");
          return;
        }
        if (body.generated || (body.generation && body.generation.authorised)) {
          if (!(body.saved && body.book && body.book.id && finishedBook(body.book)) && !(body.job && body.job.recoverable && body.job.status !== "saved")) {
            state.sending = false;
            nextBtn.disabled = false;
            setStatus("Book V2 tried to write the story before that was approved. Nothing was saved.");
            return;
          }
        }
        if (body.saved && body.book && body.book.id && finishedBook(body.book)) {
          keepFinishedBook(body.book, accountId || userId).then(function (book) {
            state.accountId = accountId || userId || state.accountId;
            showReadyBook(book, body.job);
          }).catch(function () {
            state.sending = false;
            nextBtn.disabled = false;
            setStatus("The illustrated book is ready, but it could not be saved on this device. It was not opened.");
          });
          return;
        }
        if (body.job && body.job.recoverable && body.job.status !== "saved") {
          showPlanSaved(!!userId, body.job);
          return;
        }
        if (!body.simulated || !body.preview) {
          state.sending = false;
          nextBtn.disabled = false;
          setStatus("Book V2 did not return a story plan. Nothing was saved.");
          return;
        }
        if (!local && accountId !== userId) {
          state.sending = false;
          nextBtn.disabled = false;
          setStatus("This story plan was not tied to your account. Nothing was saved.");
          return;
        }
        if (local && accountId && accountId !== userId) {
          state.sending = false;
          nextBtn.disabled = false;
          setStatus("This story plan was not tied to your account. Nothing was saved.");
          return;
        }
        if (userId) {
          keepPlannedBook(body.preview, key, accountId || userId, state.idea, body.job).then(function (book) {
            if (book && finishedBook(book)) {
              state.accountId = accountId || userId || state.accountId;
              showReadyBook(book, body.job);
              return;
            }
            showPlanSaved(true, body.job);
          }).catch(function (err) {
            state.sending = false;
            nextBtn.disabled = false;
            var reason = err && err.message ? String(err.message) : "";
            if (reason === "occupied") {
              setStatus("An existing book already uses this story. Nothing was changed.");
              return;
            }
            if (reason === "library") {
              setStatus("Your library could not be read, so this story was not saved. Nothing was changed.");
              return;
            }
            if (reason === "upload") {
              setStatus("The story plan could not be saved on your account. Nothing was changed.");
              return;
            }
            if (reason === "wrong-shelf") {
              setStatus("Switch back to your own library before saving this story. Nothing was saved.");
              return;
            }
            setStatus("The story plan was checked, but it could not be saved on this account. Nothing was kept.");
          });
          return;
        }
        showPlanSaved(false, body.job);
      }).catch(function (err) {
        if (continued) {
          failContinue(err && err.message === "occupied"
            ? "An existing book already uses this story. Nothing was changed."
            : (local
              ? "Book V2 is not running on this computer. Nothing was changed."
              : "Book V2 could not be reached. Nothing was changed."), baseline);
          return;
        }
        state.sending = false;
        nextBtn.disabled = false;
        if (err && err.message === "occupied") {
          setStatus("An existing book already uses this story. Nothing was changed.");
          return;
        }
        setStatus(local
          ? "Book V2 is not running on this computer. Nothing was saved."
          : "Book V2 could not be reached. Nothing was saved.");
      });
    });
  });

  function memberSource(id) {
    if (CREW.some(function (row) { return row[0] === id; })) return "wondii-crew";
    if (library.shared.some(function (row) { return row[0] === id; })) return "shared";
    if (library.mine.some(function (row) { return row[0] === id; })) return "saved";
    return "";
  }

  function stablePortrait(id, picture) {
    var raw = String(picture || "").trim();
    if (!raw || raw.indexOf("data:") === 0 || raw.indexOf("blob:") === 0) return "";
    if (raw.indexOf("images/characters/crew/") === 0 || raw.indexOf("maya-v1") >= 0) return "";
    var path = raw;
    if (/^https?:/i.test(raw)) {
      var match = raw.match(/\/storage\/v1\/object\/(?:sign|authenticated|public)\/characters_room\/([^?#]+)/i);
      if (!match) return "";
      try { path = decodeURIComponent(match[1]); } catch (ePath) { path = match[1]; }
    }
    path = path.split("?")[0].replace(/^\/+/, "");
    if (path.indexOf("characters_room/") === 0) path = path.slice("characters_room/".length);
    if (!path || path.indexOf("..") >= 0 || path.indexOf("\\") >= 0) return "";
    var file = String(id || "") + ".png";
    if (!file || file.indexOf("/") >= 0 || path !== path.slice(0, path.length - file.length) + file) return "";
    if (path.indexOf("/characters/" + file) < 0) return "";
    return path;
  }

  function portraitReferences(members, userId) {
    if (state.savedReferences && state.savedReferences.length) return state.savedReferences;
    return savedArt(members, userId);
  }

  function savedPicturesMissing(members, references) {
    return (members || []).some(function (member) {
      if (!member || member.source !== "saved") return false;
      return !(references || []).some(function (row) {
        return row && row.id === member.id && row.reference && row.ownerId;
      });
    });
  }

  function savedArt(members, userId) {
    return members.filter(function (member) { return member.source === "saved"; }).map(function (member) {
      var reference = stablePortrait(member.id, portraits[member.id]);
      var row = {
        id: member.id,
        name: member.name,
        ownerType: "family",
        ownerId: userId || ""
      };
      if (reference && reference.indexOf((userId || "") + "/characters/" + member.id + ".png") === 0) row.reference = reference;
      var personality = window.WondiiPersonality;
      var packed = personality ? personality.pack(library.personalities[member.id]) : null;
      if (packed) row.personality = packed;
      return row;
    });
  }

  function sharedArt(members) {
    return members.filter(function (member) { return member.source === "shared"; }).map(function (member) {
      var reference = stablePortrait(member.id, portraits[member.id]);
      var row = { id: member.id, name: member.name, shareId: member.id };
      if (reference) row.reference = reference;
      return row;
    });
  }

  function creationKey() {
    if (state.creationKey) return state.creationKey;
    var alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    var out = "book";
    var i;
    for (i = 0; i < 16; i++) out += alphabet.charAt((Math.random() * alphabet.length) | 0);
    state.creationKey = out;
    return out;
  }

  function isLocalHost() {
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function whenSession(done) {
    var session = window.WondiiSession;
    if (!session || !session.get) {
      done({ status: "missing", userId: "" });
      return;
    }
    var view = session.get();
    if (view && view.status !== "initialising") {
      done(view);
      return;
    }
    if (!session.subscribe) {
      done(view || { status: "missing", userId: "" });
      return;
    }
    var settled = false;
    function finish(next) {
      if (settled || !next || next.status === "initialising") return;
      settled = true;
      done(next);
    }
    session.subscribe(finish);
    window.setTimeout(function () {
      if (settled) return;
      settled = true;
      done(session.get ? session.get() : { status: "timeout", userId: "" });
    }, 4000);
  }

  function planHeaders(view) {
    var headers = { "Content-Type": "application/json" };
    if (isLocalHost()) return headers;
    var config = window.SCORE_CONFIG || window.SCORE_SYNC || {};
    if (config.supabaseAnonKey) headers.apikey = String(config.supabaseAnonKey);
    var token = view && view.session && view.session.access_token ? String(view.session.access_token) : "";
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function plannedTitle(idea) {
    var title = String(idea || "").trim();
    if (title.length > 48) title = title.slice(0, 45).trim() + "…";
    return title || "A new Wondii story";
  }

  function cloudCode(err) {
    if (!err) return "";
    return String(err.message || err.code || err);
  }

  function localCloudMiss(err) {
    var code = cloudCode(err);
    return code === "no_session" || code === "not_configured" || code === "no_client";
  }

  function readCloudShelf() {
    var cloud = window.KidsScoreCloud;
    if (!cloud || !cloud.downloadStorybookLibrary) {
      if (isLocalHost()) return Promise.resolve([]);
      return Promise.reject(new Error("library"));
    }
    return new Promise(function (resolve, reject) {
      cloud.downloadStorybookLibrary(function (err, data) {
        if (!err) {
          resolve(Array.isArray(data) ? data : []);
          return;
        }
        if (isLocalHost() && localCloudMiss(err)) {
          resolve([]);
          return;
        }
        reject(new Error("library"));
      });
    });
  }

  function uploadAccountShelf(raw) {
    var cloud = window.KidsScoreCloud;
    if (!cloud || !cloud.scheduleStorybookUpload) {
      if (isLocalHost()) return Promise.resolve();
      return Promise.reject(new Error("upload"));
    }
    return new Promise(function (resolve, reject) {
      cloud.scheduleStorybookUpload(raw, function (err) {
        if (!err) {
          resolve();
          return;
        }
        if (isLocalHost() && localCloudMiss(err)) {
          resolve();
          return;
        }
        reject(new Error("upload"));
      });
    });
  }

  function finishedBook(book) {
    if (!book || book.generated !== true || book.recordKind === "plan" || !book.id) return false;
    var pages = book.pages || [];
    if (!pages.length) return false;
    if (Number(book.pageCount) > 0 && pages.length !== Number(book.pageCount)) return false;
    return pages.every(function (page) {
      if (!page) return false;
      var text = String(page.text || page.prose || "").trim();
      var image = String(page.imageDataUrl || page.imageUrlFallback || "");
      return !!text && image.indexOf("data:image/") === 0;
    });
  }

  function keepFinishedBook(book, userId) {
    var Shelf = window.WondiiBookV2Shelf;
    var store = window.StorybookShelfStore;
    if (!Shelf || !Shelf.mergeOwned) return Promise.reject(new Error("no_shelf"));
    if (!finishedBook(book)) return Promise.reject(new Error("incomplete"));
    if (!store || !userId || !store.getJson || !store.setJson) return Promise.reject(new Error("no_account"));
    if (book.ownerUserId && String(book.ownerUserId) !== String(userId)) return Promise.reject(new Error("wrong-shelf"));
    var bound = store.currentUserId ? String(store.currentUserId() || "") : "";
    if (bound && bound !== String(userId)) return Promise.reject(new Error("wrong-shelf"));
    if (!bound && store.bindUser) store.bindUser(userId);
    var child = window.ChildLibrary && window.ChildLibrary.isChildSession && window.ChildLibrary.isChildSession();
    return store.getJson().then(function (local) {
      return readCloudShelf().then(function (cloud) {
        var merged = Shelf.mergeOwned(local, cloud);
        var next = [];
        var id = String(book.id);
        var key = String(book.creationKey || "");
        merged.forEach(function (item) {
          if (!item) return;
          var mark = item.ownerUserId || item.ownerId || "";
          if (mark && String(mark) !== String(userId)) {
            next.push(item);
            return;
          }
          if (String(item.id || "") === id) return;
          if (key && String(item.creationKey || "") === key) return;
          next.push(item);
        });
        var copy = Object.assign({}, book, {
          generated: true,
          recordKind: "book",
          openable: true,
          ownerUserId: String(userId)
        });
        if (!copy.author) {
          var credit = chosenAuthor();
          if (credit) copy.author = credit;
        }
        next.unshift(copy);
        return store.setJson(next).then(function () {
          if (child) return copy;
          return uploadAccountShelf(JSON.stringify(next)).then(function () {
            return copy;
          }).catch(function (err) {
            return store.setJson(merged).then(function () { throw err; });
          });
        });
      });
    });
  }

  function keepPlannedBook(preview, key, userId, idea, job) {
    var Shelf = window.WondiiBookV2Shelf;
    var store = window.StorybookShelfStore;
    if (!Shelf || !Shelf.placePlan || !Shelf.mergeOwned) return Promise.reject(new Error("no_shelf"));
    if (!store || !userId || !store.getJson || !store.setJson) return Promise.reject(new Error("no_account"));
    var bound = store.currentUserId ? String(store.currentUserId() || "") : "";
    if (bound && bound !== userId) return Promise.reject(new Error("wrong-shelf"));
    if (store.viewUserId && store.isIsolated && store.isIsolated()) {
      var viewUid = String(store.viewUserId() || "");
      if (viewUid && viewUid !== userId) return Promise.reject(new Error("wrong-shelf"));
    }
    if (!bound && store.bindUser) store.bindUser(userId);
    var child = window.ChildLibrary && window.ChildLibrary.isChildSession && window.ChildLibrary.isChildSession();
    return store.getJson().then(function (local) {
      return readCloudShelf().then(function (cloud) {
        var merged = Shelf.mergeOwned(local, cloud);
        var placed = Shelf.placePlan({
          creationKey: String(key),
          owner: { userId: String(userId), accountKind: "adult" },
          authorDisplay: chosenAuthor(),
          resume: state.resumePayload,
          preview: preview,
          request: {
            idea: state.idea.trim(),
            place: state.place,
            theme: state.theme,
            length: state.length,
            ageBand: state.ageBand,
            pageCount: state.pageCount || undefined,
            members: state.ids.slice()
          },
          job: job || null,
          title: plannedTitle(idea),
          shelf: merged,
          savedAt: new Date().toISOString()
        });
        if (!placed.ok) return Promise.reject(new Error(placed.reason || "save"));
        function show(list) {
          if (store.isIsolated && store.isIsolated() && store.setIsolated) store.setIsolated(userId, list);
          return list;
        }
        return store.setJson(placed.shelf).then(function () {
          show(placed.shelf);
          if (child) return placed.book;
          return uploadAccountShelf(JSON.stringify(placed.shelf)).then(function () {
            return placed.book;
          }).catch(function (err) {
            return store.setJson(merged).then(function () {
              show(merged);
              throw err;
            });
          });
        });
      });
    });
  }

  function bookV2Url() {
    if (isLocalHost()) return "http://127.0.0.1:8796/v1/book";
    var config = window.SCORE_CONFIG || window.SCORE_SYNC || null;
    var base = config && config.supabaseUrl ? String(config.supabaseUrl).replace(/\/$/, "") : "";
    if (!base) return "";
    return base + "/functions/v1/book-v2";
  }

  var tomeBtn = document.getElementById("sjTome");
  function begin(event) {
    event.preventDefault();
    event.stopPropagation();
    openTheBook();
  }
  if (startBtn) startBtn.addEventListener("click", begin);
  if (tomeBtn) tomeBtn.addEventListener("click", begin);

  if (surpriseBtn) {
    surpriseBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var pick = CREW[(Math.random() * CREW.length) | 0];
      state.ids = [pick[0]];
      state.tab = "crew";
      castTouched = true;
      openTheBook();
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (window.WondiiStoryDraft) window.WondiiStoryDraft.openDemo();
    });
  }

  var navMenu = document.getElementById("sjNavMenu");
  var mainNav = document.getElementById("sjMainNav");
  if (navMenu && mainNav) {
    navMenu.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      navMenu.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !mainNav.classList.contains("is-open")) return;
      mainNav.classList.remove("is-open");
      navMenu.setAttribute("aria-expanded", "false");
      navMenu.focus();
    });
  }

  var helpBtn = document.getElementById("sjHelp");
  var helpDialog = document.getElementById("sjHelpDialog");
  var helpClose = document.getElementById("sjHelpClose");
  function closeHelp() {
    if (!helpDialog) return;
    helpDialog.hidden = true;
    if (helpBtn) helpBtn.focus();
  }
  if (helpBtn && helpDialog) {
    helpBtn.addEventListener("click", function () {
      helpDialog.hidden = false;
      if (helpClose) helpClose.focus();
    });
    helpDialog.addEventListener("click", function (event) {
      if (event.target === helpDialog) closeHelp();
    });
  }
  if (helpClose) helpClose.addEventListener("click", closeHelp);

  var settingsBtn = document.getElementById("sjSettings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.openSettings) KidsCore.openSettings();
    });
  }

  function storyKeyFromPage() {
    try {
      return String(new URLSearchParams(window.location.search).get("story") || "");
    } catch (eStory) {
      return "";
    }
  }

  function applyResume(saved) {
    if (!saved || typeof saved !== "object") return false;
    state.creationKey = String(saved.creationKey || state.creationKey || "");
    state.idea = String(saved.idea || state.idea || "");
    state.place = String(saved.place || state.place || "library");
    state.theme = String(saved.theme || state.theme || "Adventure");
    state.length = String(saved.length || state.length || "medium");
    state.ageBand = String(saved.familyAgeBand || saved.ageBand || state.ageBand || "");
    state.author = String(saved.authorDisplay || state.author || "");
    if (Array.isArray(saved.members) && saved.members.length) {
      state.ids = saved.members.map(function (member) {
        var id = String(member && member.id || member || "");
        if (id && member && member.name) remembered[id] = String(member.name);
        return id;
      }).filter(Boolean);
      castTouched = true;
    }
    state.resumePayload = saved;
    return !!state.creationKey;
  }

  function watchReturnedStory() {
    var saved = state.resumePayload;
    if (!saved || !saved.creationKey) return;
    whenSession(function (view) {
      var userId = view && view.userId ? String(view.userId) : "";
      if (userId) state.accountId = userId;
      if (!userId && !isLocalHost()) {
        state.resumeApproved = false;
        showPlanSaved(false, { status: "unavailable", message: "Sign in to check this story. Nothing was started." });
        return;
      }
      var endpoint = bookV2Url();
      if (!endpoint) {
        showPlanSaved(!!userId, { status: "unavailable", message: "Unable to check progress right now." });
        return;
      }
      function readStatus() {
        return fetch(endpoint, {
          method: "POST",
          headers: planHeaders(view),
          body: JSON.stringify(Object.assign({}, saved, {
            watch: true,
            background: false,
            approveGeneration: false,
            continueJob: false
          }))
        }).then(function (response) {
          return response.text().then(function (raw) {
            var body = {};
            try { body = raw ? JSON.parse(raw) : {}; } catch (eParse) { body = {}; }
            return { ok: response.ok, status: response.status, body: body };
          });
        });
      }
      readStatus().then(function (result) {
        if (!result || result.status === 401 || result.status === 403) {
          showPlanSaved(!!userId, { status: "unavailable", message: "Sign in to check this story. Nothing was started." });
          return;
        }
        if (!result.ok) {
          var ProgressNow = window.WondiiBookV2Progress;
          var reason = ProgressNow && ProgressNow.reportedMessage
            ? ProgressNow.reportedMessage(result, "Unable to check progress right now.")
            : "Unable to check progress right now.";
          showPlanSaved(!!userId, { status: "unavailable", message: reason });
          return;
        }
        var job = result.body && result.body.job || null;
        if (job && (job.status === "complete" || job.reason === "saved")) {
          showWorkshopJob(job);
          beginQuietWatch(readStatus);
          return;
        }
        if (!job || !job.status) {
          state.resumeApproved = false;
          step = "summary";
          showJourney();
          return;
        }
        var seen = bookProgress(job);
        state.resumeApproved = !!(seen && seen.canContinue);
        showPlanSaved(!!userId, job);
        if (seen && seen.state === "working") pollJob(readStatus, !!userId);
        else if (workshopModel(job)) beginQuietWatch(readStatus);
      }).catch(function () {
        showPlanSaved(!!userId, { status: "unavailable", message: "Unable to check progress right now." });
      });
    });
  }

  function resumeSavedStory() {
    var key = storyKeyFromPage();
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) return;
    var raw = "";
    try { raw = sessionStorage.getItem("wondii-book-resume:" + key) || ""; } catch (eRaw) {}
    var saved = null;
    try { saved = raw ? JSON.parse(raw) : null; } catch (eJson) { saved = null; }
    whenSession(function (view) {
      var userId = view && view.userId ? String(view.userId) : "";
      var store = window.StorybookShelfStore;
      var read = store && userId && store.getJson ? store.getJson() : Promise.resolve([]);
      read.then(function (local) {
        return readCloudShelf().then(function (cloud) {
          var Shelf = window.WondiiBookV2Shelf;
          var list = Shelf && Shelf.mergeOwned ? Shelf.mergeOwned(local, cloud) : (local || []);
          var plan = null;
          list.forEach(function (item) {
            if (item && String(item.creationKey || "") === key) plan = item;
          });
          if (plan && finishedBook(plan)) {
            state.accountId = userId || state.accountId;
            applyResume(saved || (plan && plan.resume) || { creationKey: key });
            state.creationKey = state.creationKey || key;
            showReadyBook(plan, null);
            return;
          }
          if (!saved && plan && plan.resume) saved = plan.resume;
          if (!saved && plan && plan.request) {
            saved = Object.assign({ creationKey: key, authorDisplay: plan.author || "" }, plan.request);
          }
          var ShelfApi = window.WondiiBookV2Shelf;
          if (ShelfApi && ShelfApi.preferResume) saved = ShelfApi.preferResume(saved, plan && plan.resume);
          else if (plan && plan.resume && ShelfApi && ShelfApi.continueRequest && !ShelfApi.continueRequest(saved) && ShelfApi.continueRequest(plan.resume)) {
            saved = plan.resume;
          }
          if (!applyResume(saved)) return;
          state.accountId = userId || state.accountId;
          state.approveGeneration = false;
          state.resumeApproved = false;
          var cached = cachedWorkshop(key);
          if (cached) showPlanSaved(!!userId, cached);
          else {
            step = "summary";
            showJourney();
          }
          watchReturnedStory();
        }).catch(function () {
          if (!applyResume(saved)) return;
          state.approveGeneration = false;
          step = "summary";
          showJourney();
        });
      }).catch(function () {});
    });
  }

  window.addEventListener("storage", function (event) {
    var key = state.creationKey || (state.resumePayload && state.resumePayload.creationKey) || "";
    if (!key || !event || event.key !== "wondii-workshop-job:" + key || !event.newValue) return;
    var saved = null;
    try { saved = JSON.parse(event.newValue); } catch (eStore) { saved = null; }
    if (!saved || !saved.job || !saved.job.status) return;
    state.checkingProgress = false;
    showPlanSaved(!!state.accountId, saved.job);
  });

  takePendingStar();
  try {
    var orgSeed = sessionStorage.getItem("wondii-org-starter");
    if (orgSeed) {
      state.idea = String(orgSeed).slice(0, 500);
      sessionStorage.removeItem("wondii-org-starter");
    }
  } catch (eSeed) {}
  if (state.pendingStar && shareRowId(state.pendingStar)) {
    state.tab = "shared";
    requestShared();
    openTheBook();
  } else if (state.pendingStar) {
    state.tab = "mine";
    requestMine();
    requestShared();
  }
  function workshopDemo() {
    try {
      var params = new URLSearchParams(window.location.search);
      var host = window.location.hostname;
      return params.get("workshop") === "demo" && (host === "127.0.0.1" || host === "localhost");
    } catch (eDemo) {
      return false;
    }
  }

  function startWorkshopDemo() {
    var params = new URLSearchParams(window.location.search);
    var scene = params.get("scene") || "drawing";
    var started = Date.now();
    var jobs = {
      opening: null,
      writing: { status: "running", stage: "story", reason: "running", writerStage: "", startedAt: started, recoverable: true, illustrationUnits: 11, acceptedPictures: 0 },
      drawing: { status: "running", stage: "pictures", reason: "running", pendingKind: "draw", startedAt: started, recoverable: true, acceptedPictures: 3, illustrationUnits: 11, acceptedPreviews: ["images/workshop/book-cover.jpg"] },
      checking: { status: "running", stage: "pictures", reason: "running", pendingKind: "check", startedAt: started, recoverable: true, acceptedPictures: 4, illustrationUnits: 11, acceptedPreviews: ["images/workshop/book-cover.jpg"] },
      assembling: { status: "running", stage: "pictures", reason: "running", startedAt: started, recoverable: true, acceptedPictures: 11, illustrationUnits: 11 },
      saving: { status: "running", stage: "save", reason: "running", startedAt: started, recoverable: true, acceptedPictures: 11, illustrationUnits: 11 },
      waiting: { status: "interrupted", reason: "continue", stage: "pictures", pendingKind: "draw", recoverable: true, acceptedPictures: 3, illustrationUnits: 11, startedAt: started - 500000 },
      paused: { status: "interrupted", reason: "uncertain", recoverable: true, acceptedPictures: 3, illustrationUnits: 11 },
      failed: { status: "interrupted", reason: "picture", recoverable: false, acceptedPictures: 3, illustrationUnits: 11 },
      completed: { status: "complete", reason: "saved", stage: "read", acceptedPictures: 11, illustrationUnits: 11 }
    };
    state.checkingProgress = scene === "opening";
    state.job = jobs[scene] || jobs.drawing;
    if (scene === "completed") {
      state.shelfBook = {
        id: "b-preview-saved-book",
        generated: true,
        recordKind: "book",
        pageCount: 1,
        pages: [{ text: "The lantern was waiting.", imageDataUrl: "data:image/jpeg;base64,preview" }]
      };
    }
    state.creationKey = "workshopdemo0001";
    step = "saved";
    showJourney();
  }

  applyScene(PLACE_ART.library);
  dressWelcome();
  if (workshopDemo()) startWorkshopDemo();
  else resumeSavedStory();

  document.addEventListener("wondii-story-home", function () {
    step = "cast";
    showWelcome();
  });
  document.addEventListener("wondii-story-create", function () {
    step = "cast";
    showJourney();
  });

  var textBtn = document.getElementById("sjTextSize");
  var textStep = 0;
  if (textBtn) {
    textBtn.addEventListener("click", function () {
      textStep = (textStep + 1) % 3;
      document.body.classList.remove("sj-type-lg", "sj-type-xl");
      if (textStep === 1) document.body.classList.add("sj-type-lg");
      if (textStep === 2) document.body.classList.add("sj-type-xl");
      textBtn.setAttribute("aria-pressed", textStep ? "true" : "false");
    });
  }
})();
