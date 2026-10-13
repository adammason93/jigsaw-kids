/* Visual story-making journey. Writes into the existing storybook draft.
   Surprise me does not start generation. Creation is not a book. */
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
    notice: "",
    sceneKind: "place",
    justJoined: "",
    moreIdeas: false,
    pendingStar: ""
  };
  var library = { mine: [], shared: [], mineState: "idle", sharedState: "idle" };
  var portraits = {};
  var remembered = {};
  var castTouched = false;

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
        (list || []).forEach(function (row) {
          if (!row || !row.id || !row.name) return;
          var id = String(row.id);
          library.mine.push([id, String(row.name).slice(0, 40)]);
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
      (list || []).forEach(function (row) {
        if (!row || !row.id || !row.name) return;
        var id = String(row.id);
        library.mine.push([id, String(row.name).slice(0, 40)]);
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

  function paintSummary() {
    title.textContent = "Ready for your adventure?";
    crumbs("Your book");
    backBtn.textContent = "Edit";
    nextBtn.textContent = "Create my story";
    nextBtn.disabled = false;
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
      textContent: lengthLabel + " · 12 pages"
    }));
    book.appendChild(page);
    dock.appendChild(book);
    dock.appendChild(Object.assign(document.createElement("p"), {
      className: "sj-whisper",
      textContent: "The real book appears after it is made. Create my story uses your story allowance. Nothing is sent until you press it."
    }));
    stage.appendChild(stageShell(dock));
    setStatus("Nothing has been created yet.");
  }

  function paint() {
    stage.innerHTML = "";
    journey.classList.add("sj-shell", "sj-v3");
    journey.classList.toggle("sj-on-stars", step === "cast");
    journey.classList.toggle("sj-on-world", step === "world");
    journey.classList.toggle("sj-on-idea", step === "idea");
    journey.classList.toggle("sj-on-review", step !== "cast" && step !== "world" && step !== "idea");
    applyScene(sceneArt());
    if (step === "cast") paintCast();
    else if (step === "world") paintWorld();
    else if (step === "idea") paintIdea();
    else paintSummary();
  }

  function go(next) {
    step = next;
    showJourney();
    turnPage();
  }

  backBtn.addEventListener("click", function () {
    if (step === "cast") showWelcome();
    else if (step === "world") go("cast");
    else if (step === "idea") go("world");
    else go("idea");
  });

  nextBtn.addEventListener("click", function () {
    if (nextBtn.disabled) return;
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
    if (!window.WondiiStoryDraft || !window.WondiiStoryDraft.apply) {
      setStatus("This page cannot start a book yet. Your choices are still here.");
      return;
    }
    var members = [];
    state.ids.forEach(function (id) {
      var row = person(id);
      if (!row) return;
      members.push({ id: id, name: row[1], src: portraitSrc(id) });
    });
    if (!members.length || members.length !== state.ids.length) {
      setStatus("Choose each person again so nobody is left out of the story.");
      return;
    }
    nextBtn.disabled = true;
    /* Pictures draw the star and one tagged friend. Up to three photos are
       accepted; further friends stay in the words. Saved characters and crew
       are not used as identity sheets. Leave this limit in place. */
    setStatus(members.length > 2
      ? "Everyone is named in the story. Pictures can show the star and one friend."
      : "Starting your book…");
    var idea = state.idea.trim();
    if (!idea) state.idea = "Maybe they discover a secret door in a magical forest.";
    window.WondiiStoryDraft.apply({
      name: members[0].name,
      plot: plotText(),
      place: state.place,
      length: state.length,
      style: "soft_3d",
      cast: members
    }).then(function () {
      if (!idea) state.idea = "";
      window.WondiiStoryDraft.create();
      watchGeneration();
    }).catch(function () {
      if (!idea) state.idea = "";
      nextBtn.disabled = false;
      setStatus("The book was not started. Your choices are still here.");
    });
  });

  function watchGeneration() {
    var errorNode = document.getElementById("sbError");
    var book = document.getElementById("sbBook");
    var busy = document.getElementById("sbBusy");
    var waits = 0;
    var timer = window.setInterval(function () {
      waits += 1;
      var failed = errorNode && !errorNode.hidden && errorNode.textContent.trim();
      var opened = book && !book.hidden && !book.classList.contains("is-hidden");
      var stillBusy = busy && !busy.hidden && !busy.classList.contains("is-hidden");
      if (opened) {
        window.clearInterval(timer);
        return;
      }
      if (failed && !stillBusy) {
        window.clearInterval(timer);
        nextBtn.disabled = false;
        setStatus(errorNode.textContent.trim());
        return;
      }
      if (waits > 240) {
        window.clearInterval(timer);
        nextBtn.disabled = false;
        setStatus("The book was not started. Your choices are still here.");
      }
    }, 250);
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
  applyScene(PLACE_ART.library);
  dressWelcome();

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
