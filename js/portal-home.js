/* Shared Wondii Home. Renders one dashboard for every signed-in workspace. */
(function () {
  "use strict";

  var host = document.getElementById("wondiiHome");
  var Model = window.WondiiPortalHomeModel;
  if (!host || !Model) return;

  var mode = "story";
  var surprise = null;
  var surpriseOpen = false;
  var draft = "";
  var saved = [];
  var books = [];
  var loaded = false;
  var ready = false;
  var loadToken = 0;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function reduced() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function view() {
    return window.WondiiOrg && window.WondiiOrg.get ? window.WondiiOrg.get() : {};
  }

  function caps() {
    var current = view();
    var Account = window.WondiiAccount;
    if (!Account) return { canCreateStory: true, canCreateGame: true, canCreatePuzzle: true };
    var space = Account.workspaceFrom({
      userId: current.userId,
      organisation: current.organisation,
      role: current.role,
      organisationName: current.organisationName
    });
    return Account.capabilities(Object.assign({}, space, { role: current.role || "" }));
  }

  function classesNow() {
    try {
      var raw = JSON.parse(localStorage.getItem("wondii-school-classes") || "null");
      return raw && Array.isArray(raw.classes) ? raw.classes : [];
    } catch (e) { return []; }
  }

  function sessionsNow() {
    try {
      var raw = JSON.parse(localStorage.getItem("wondii-class-sessions") || "[]");
      return Array.isArray(raw) ? raw.filter(function (item) { return item && item.demo !== true; }) : [];
    } catch (e) { return []; }
  }

  function adventuresNow(able) {
    var Learn = window.WondiiLearn;
    if (!able || !Learn || !Learn.visibleLibrary) return [];
    return Learn.visibleLibrary().filter(function (item) {
      return item && !item.preparedExample && item.status !== "archived";
    }).map(function (item) {
      var map = item.learningMap || {};
      var ready = item.status === "ready";
      return {
        id: item.id,
        title: (item.plan && item.plan.title) || map.topic || "Learning Adventure",
        year: map.yearGroup || "",
        subject: map.subject || "",
        status: ready ? "Ready" : (item.status || ""),
        href: ready && item.id
          ? "schools/learn/create.html?start=" + encodeURIComponent(item.id)
          : "schools/learn/create.html?library=1"
      };
    });
  }

  function coverOf(book) {
    if (!book) return "";
    if (book.sceneUrlFallback && book.sceneUrlFallback.indexOf("data:") !== 0) return book.sceneUrlFallback;
    var pages = book.pages || [];
    var i;
    for (i = 0; i < pages.length; i++) {
      var url = pages[i] && pages[i].imageUrlFallback;
      if (url && String(url).indexOf("data:") !== 0) return url;
    }
    return "";
  }

  function booksNow() {
    return books.map(function (book) {
      return { id: book.id, title: book.title || "Story", pages: book.pages || [], cover: coverOf(book) };
    });
  }

  function crewList() {
    return window.WondiiCrew ? window.WondiiCrew.list() : [];
  }

  function routeHome() {
    var head = (window.location.hash || "").replace("#", "").split("/")[0];
    return !head || head === "home";
  }

  function card(item) {
    var kind = item.type === "Game" ? "game" : item.type === "Puzzle" ? "puzzle" : item.type === "Learning Adventure" ? "adventure" : "story";
    var link = el("a", "home-card home-card--" + kind);
    link.href = item.href;
    if (item.cover) {
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = item.cover;
      link.appendChild(img);
    }
    link.appendChild(el("span", "home-card__shade"));
    var body = el("span", "home-card__body");
    body.appendChild(el("em", "", item.type));
    body.appendChild(el("strong", "", item.title));
    body.appendChild(el("span", "", item.meta || ""));
    body.appendChild(el("span", "home-card__cta", item.action + " →"));
    link.appendChild(body);
    return link;
  }

  function personCard(row) {
    var link = el("a", "home-person");
    link.href = row.href || "#characters";
    link.setAttribute("data-pose", "idle");
    link.setAttribute("data-character", row.id);
    var record = window.WondiiCrew && window.WondiiCrew.get(row.id);
    if (record && window.WondiiCharacterPortal && window.WondiiCharacterPortal.figure) {
      link.appendChild(window.WondiiCharacterPortal.figure(record));
    } else if (row.artwork) {
      var img = document.createElement("img");
      img.className = "home-person__art";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = row.artwork;
      link.appendChild(img);
    } else {
      link.appendChild(el("span", "home-person__mark", (row.name || "?").slice(0, 1)));
    }
    link.appendChild(el("strong", "", row.name));
    if (row.trait) link.appendChild(el("span", "crew-pill", row.trait));
    link.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch") return;
      link.setAttribute("data-pose", "hover");
    });
    link.addEventListener("pointerleave", function () { link.setAttribute("data-pose", "idle"); });
    link.addEventListener("focusin", function () { link.setAttribute("data-pose", "hover"); });
    link.addEventListener("focusout", function () { link.setAttribute("data-pose", "idle"); });
    return link;
  }

  function empty(title, text, label, href) {
    var box = el("div", "home-empty");
    box.appendChild(el("h3", "", title));
    box.appendChild(el("p", "", text));
    var link = el("a", "home-go", label);
    link.href = href;
    box.appendChild(link);
    return box;
  }

  function world() {
    var scene = el("div", "home-world__scene");
    scene.innerHTML = '<svg viewBox="0 0 960 360" aria-hidden="true">' +
      '<rect width="960" height="360" fill="none"/>' +
      '<circle cx="820" cy="54" r="22" fill="#f6c445"/>' +
      '<ellipse cx="180" cy="250" rx="90" ry="70" fill="#7d5caf"/>' +
      '<rect class="home-flag" x="168" y="150" width="36" height="22" rx="4" fill="#f6c445"/>' +
      '<rect x="184" y="150" width="4" height="90" fill="#5c6284"/>' +
      '<circle cx="430" cy="210" r="46" fill="#3f9d62"/>' +
      '<rect x="422" y="240" width="16" height="50" fill="#6b4a32"/>' +
      '<rect class="home-sign" x="600" y="168" width="90" height="36" rx="8" fill="#141b4d"/>' +
      '<circle cx="760" cy="230" r="48" fill="#5c6284"/>' +
      '<circle class="home-crystal" cx="760" cy="214" r="10" fill="#d7c4ff" opacity="0.7"/>' +
      '</svg>';
    var links = el("div", "home-world__links");
    Model.worldDestinations(caps()).forEach(function (place) {
      var link = el("a", "", "");
      link.href = place.href;
      link.setAttribute("data-place", place.id);
      link.appendChild(el("small", "", place.place));
      link.appendChild(document.createTextNode(place.label));
      links.appendChild(link);
    });
    scene.appendChild(links);
    return scene;
  }

  function render() {
    var ability = caps();
    var current = view();
    var rooms = ability.canManageClasses ? classesNow() : [];
    var sessions = ability.canViewResults ? sessionsNow().map(function (session) {
      return {
        id: session.id || session.code,
        code: session.code,
        title: session.title || session.code || "",
        status: session.status || "",
        createdAt: session.createdAt || "",
        demo: session.demo,
        completed: session.completed,
        total: session.total,
        href: session.code ? "schools/learn/present.html?session=" + encodeURIComponent(session.code) : "#results"
      };
    }) : [];
    var adventures = adventuresNow(ability.canViewAdventures);
    var shelfBooks = booksNow();
    var summary = Model.classSummary(rooms);
    var first = summary.rooms[0] || {};
    var page = el("div", "");
    host.replaceChildren(page);
    host.removeAttribute("aria-busy");

    var hello = el("header", "home-hello");
    hello.appendChild(el("h1", "", Model.greeting(new Date(), current.displayName || "") + " 👋"));
    hello.id = "homeGreeting";
    hello.querySelector("h1").id = "homeGreetingTitle";
    hello.appendChild(el("p", "", Model.supportLine(ability, {
      className: first.name || "",
      year: first.year || "",
      pupils: first.pupils,
      schoolName: current.organisationName || ""
    })));
    var stats = Model.contextStats({ books: shelfBooks, adventures: adventures, classes: rooms });
    if (stats.length) {
      var list = el("ul", "home-stats");
      stats.forEach(function (stat) { list.appendChild(el("li", "", stat)); });
      hello.appendChild(list);
    }
    var search = el("form", "home-search");
    search.setAttribute("role", "search");
    var field = document.createElement("input");
    field.type = "search";
    field.placeholder = "Find anything in Wondii...";
    field.setAttribute("aria-label", "Find anything in Wondii");
    var results = el("ul", "home-search__list");
    results.hidden = true;
    field.addEventListener("input", function () {
      var hits = Model.searchItems(searchSource(ability, adventures, rooms), field.value);
      results.replaceChildren();
      hits.forEach(function (hit) {
        var item = el("li", "");
        var link = el("a", "", hit.title);
        link.href = hit.href || "#home";
        link.appendChild(el("span", "", hit.type || ""));
        item.appendChild(link);
        results.appendChild(item);
      });
      results.hidden = !hits.length;
    });
    search.addEventListener("submit", function (event) { event.preventDefault(); });
    search.appendChild(field);
    search.appendChild(results);
    hello.appendChild(search);
    page.appendChild(hello);

    page.appendChild(hero(ability));

    var going = Model.continueItems({ books: shelfBooks, adventures: adventures, sessions: sessions });
    page.appendChild(section("Continue your adventure", going.length ? shelf(going) : empty("Your next adventure starts here.", "What will you discover today?", "Start creating", "#home"), ""));

    var people = Model.characterShelf(saved, crewList());
    var cast = el("div", "home-people");
    if (!people.length) {
      cast.appendChild(empty("Create someone special.", "Make a character once, then bring them into every story.", "Create a character", "#characters"));
    } else {
      people.forEach(function (row) { cast.appendChild(personCard(row)); });
      var add = el("a", "home-person home-person--add", "+ Create your own");
      add.href = "#characters";
      cast.appendChild(add);
    }
    var castBlock = section("Your characters", cast, "#characters");
    castBlock.querySelector("header p, header a");
    var lead = el("p", "", "Who's joining today's adventure?");
    castBlock.insertBefore(lead, castBlock.children[1] || null);

    var made = Model.creations({ books: shelfBooks, adventures: adventures });
    var split = el("div", ability.canManageClasses ? "home-split" : "");
    split.appendChild(castBlock);
    if (ability.canManageClasses) split.appendChild(classBlock(summary, sessions));
    page.appendChild(split);

    page.appendChild(section("Your creations", made.length ? shelf(made) : empty("Your next adventure starts here.", "Stories, games and puzzles you make will gather here.", "Create a story", "games/storybook.html?create=1"), ""));

    var picks = el("div", "home-discover");
    Model.discovery(ability, crewList()).forEach(function (pick) {
      var link = el("a", "home-card home-card--pick");
      link.href = pick.href;
      var person = window.WondiiCrew && window.WondiiCrew.get(pick.characterId);
      if (person && window.WondiiCharacterPortal && window.WondiiCharacterPortal.figure) {
        link.appendChild(window.WondiiCharacterPortal.figure(person));
      }
      var body = el("span", "home-card__body");
      body.appendChild(el("em", "", pick.characterName ? pick.characterName + "'s pick" : "Wondii pick"));
      body.appendChild(el("strong", "", pick.title));
      body.appendChild(el("p", "", pick.line));
      body.appendChild(el("span", "", "Explore →"));
      link.appendChild(body);
      picks.appendChild(link);
    });
    (current.storyStarters || []).forEach(function (starter) {
      if (!starter || !starter.is_active || !starter.title) return;
      var link = el("a", "home-card home-card--pick");
      link.href = launchHref("story", starter.description || starter.title);
      var body = el("span", "home-card__body");
      body.appendChild(el("em", "", "From your school"));
      body.appendChild(el("strong", "", starter.title));
      if (starter.description) body.appendChild(el("p", "", starter.description));
      link.appendChild(body);
      picks.appendChild(link);
    });
    page.appendChild(section("Made for you", picks, ""));

    var land = el("section", "home-block home-world");
    land.appendChild(el("h2", "", "Your Wondii World"));
    land.appendChild(el("p", "", "Explore everything you've created."));
    land.appendChild(world());
    page.appendChild(land);
    host.appendChild(page);
    var keep = host.querySelector("textarea");
    if (keep && document.activeElement && host.contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA") {
      keep.focus();
    }
    try {
      if (sessionStorage.getItem("wondii-home-focus") === "creation") {
        var box = host.querySelector("textarea");
        if (box) box.focus();
        sessionStorage.removeItem("wondii-home-focus");
      }
    } catch (e) {}
  }

  function searchSource(ability, adventures, rooms) {
    function from(id) {
      var items = [];
      document.querySelectorAll("#" + id + " a").forEach(function (link) {
        var title = link.querySelector("b, strong, .p-card__title");
        if (!title) return;
        items.push({ title: title.textContent, href: link.getAttribute("href") || "#" });
      });
      return items;
    }
    return {
      books: booksNow(),
      games: from("gameGrid"),
      puzzles: from("puzzleGrid").concat(from("puzzleGames")),
      characters: crewList().concat(saved),
      adventures: ability.canViewAdventures ? adventures : [],
      classes: ability.canManageClasses ? rooms : []
    };
  }

  function launchHref(nextMode, prompt) {
    return Model.launchUrl(nextMode === "surprise" ? "story" : nextMode, prompt);
  }

  function hero(ability) {
    var box = el("section", "home-hero");
    var form = el("form", "");
    form.appendChild(el("h2", "", "✨ What would you like to make today?"));
    var prompt = el("div", "home-prompt");
    var area = document.createElement("textarea");
    area.maxLength = 280;
    area.value = draft;
    area.setAttribute("aria-label", "Describe your idea");
    var examples = el("span", "home-examples");
    examples.setAttribute("aria-hidden", "true");
    Model.examples(ability).forEach(function (line) { examples.appendChild(el("span", "", line)); });
    area.addEventListener("input", function () {
      draft = area.value;
      prompt.classList.toggle("is-filled", !!draft.trim());
    });
    if (draft.trim()) prompt.classList.add("is-filled");
    prompt.appendChild(area);
    prompt.appendChild(examples);
    form.appendChild(prompt);
    var modes = el("div", "home-modes");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "What to make");
    Model.creationModes(ability).forEach(function (item) {
      var button = el("button", "home-mode", item.emoji + " " + item.label);
      button.type = "button";
      var pressed = item.id === "surprise" ? surpriseOpen : item.id === mode && !surpriseOpen;
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
      button.addEventListener("click", function () {
        if (item.id === "surprise") {
          surprise = Model.surpriseAt(ability, Date.now());
          mode = surprise.mode;
          surpriseOpen = true;
        } else {
          mode = item.id;
          surprise = null;
          surpriseOpen = false;
        }
        render();
        var next = host.querySelector("textarea");
        if (next) next.focus();
      });
      modes.appendChild(button);
    });
    form.appendChild(modes);
    if (surpriseOpen && surprise) {
      var idea = el("div", "home-surprise");
      idea.appendChild(el("strong", "", surprise.emoji + " " + surprise.title));
      idea.appendChild(el("p", "", surprise.text));
      var go = el("button", "home-go", "Create this →");
      go.type = "submit";
      idea.appendChild(go);
      form.appendChild(idea);
    } else {
      var start = el("button", "home-go", "Start creating →");
      start.type = "submit";
      form.appendChild(start);
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = area.value.trim() || (surprise && surprise.text) || "";
      window.location.href = launchHref(mode, text);
    });
    box.appendChild(form);
    var cameo = Model.cameo(crewList(), new Date().getDate());
    if (cameo) {
      var side = el("aside", "home-cameo");
      side.tabIndex = 0;
      side.setAttribute("data-pose", "idle");
      var bubble = el("p", "home-bubble");
      bubble.appendChild(el("b", "", cameo.name + " has an idea!"));
      bubble.appendChild(document.createTextNode(cameo.line));
      side.appendChild(bubble);
      var record = window.WondiiCrew && window.WondiiCrew.get(cameo.id);
      if (record && window.WondiiCharacterPortal && window.WondiiCharacterPortal.figure) side.appendChild(window.WondiiCharacterPortal.figure(record));
      side.addEventListener("pointerenter", function () { side.setAttribute("data-pose", "hover"); });
      side.addEventListener("pointerleave", function () { side.setAttribute("data-pose", "idle"); });
      side.addEventListener("focusin", function () { side.setAttribute("data-pose", "hover"); });
      side.addEventListener("focusout", function () { side.setAttribute("data-pose", "idle"); });
      box.appendChild(side);
    }
    return box;
  }

  function section(title, body, more) {
    var block = el("section", "home-block");
    var head = el("header", "");
    head.appendChild(el("h2", "", title));
    if (more) {
      var link = el("a", "", "See all →");
      link.href = more;
      head.appendChild(link);
    }
    block.appendChild(head);
    block.appendChild(body);
    return block;
  }

  function shelf(items) {
    var row = el("div", "home-continue");
    items.forEach(function (item) { row.appendChild(card(item)); });
    return row;
  }

  function classBlock(summary, sessions) {
    var box = el("section", "home-block home-class");
    box.appendChild(el("h2", "", "Your class"));
    if (summary.empty) {
      box.appendChild(el("p", "", "Add a class when you are ready. Pupils will show here."));
      var link = el("a", "home-go", "Open classes →");
      link.href = "#classes";
      box.appendChild(link);
      return box;
    }
    var list = el("ul", "");
    summary.rooms.forEach(function (room) {
      var item = el("li", "");
      var link = el("a", "", room.name);
      link.href = room.href;
      var detail = [room.year, typeof room.pupils === "number" ? room.pupils + (room.pupils === 1 ? " pupil" : " pupils") : ""].filter(Boolean).join(" · ");
      item.appendChild(link);
      if (detail) item.appendChild(el("p", "", detail));
      list.appendChild(item);
    });
    box.appendChild(list);
    var week = Model.weekActivity(sessions, new Date());
    if (week.length) {
      box.appendChild(el("h3", "", "This week in your class"));
      var rows = el("ul", "");
      week.forEach(function (session) {
        var item = el("li", "");
        var link = el("a", "", session.title);
        link.href = session.href;
        item.appendChild(link);
        var note = session.status || "";
        if (typeof session.completed === "number") note = session.completed + "/" + session.total + " completed";
        if (note) item.appendChild(el("p", "", note));
        rows.appendChild(item);
      });
      box.appendChild(rows);
    }
    var open = el("a", "home-go", "Open class →");
    open.href = summary.rooms[0].href || "#classes";
    box.appendChild(open);
    return box;
  }

  function celebrate(message) {
    if (!message) return;
    var note = el("p", "home-celebrate", message);
    note.setAttribute("role", "status");
    document.body.appendChild(note);
    window.setTimeout(function () { note.remove(); }, reduced() ? 400 : 1200);
  }

  function paint() {
    if (!routeHome()) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    if (!loaded) {
      host.replaceChildren(el("div", "home-skeleton"));
      host.setAttribute("aria-busy", "true");
      loaded = true;
    }
    load();
  }

  function load() {
    var token = ++loadToken;
    var left = 0;
    var finished = false;
    function done() {
      if (token !== loadToken) return;
      left -= 1;
      if (left > 0 || finished) return;
      finished = true;
      ready = true;
      if (routeHome()) render();
    }
    var store = window.CharacterStore;
    if (store && store.loadCharacters) {
      left += 1;
      store.loadCharacters(function (err, list) {
        if (token !== loadToken) return;
        saved = !err && Array.isArray(list) ? list : [];
        done();
      });
    }
    var shelf = window.StorybookShelfStore;
    var read = shelf && (shelf.getVisibleJson || shelf.getJson);
    if (read) {
      left += 1;
      read.call(shelf).then(function (list) {
        if (token !== loadToken) return;
        books = Array.isArray(list) ? list.filter(function (book) { return book && book.id; }) : [];
        done();
      }).catch(function () { if (token === loadToken) done(); });
    }
    if (!left) done();
    window.setTimeout(function () {
      if (token !== loadToken || finished) return;
      finished = true;
      ready = true;
      if (routeHome()) render();
    }, 2500);
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("[data-focus]");
    if (!link) return;
    try { sessionStorage.setItem("wondii-home-focus", link.getAttribute("data-focus")); } catch (e) {}
    if (!routeHome()) return;
    var box = host.querySelector("textarea");
    if (box) box.focus();
  });
  document.addEventListener("wondii-org", paint);
  try {
    var pending = sessionStorage.getItem("wondii-celebrate");
    if (pending) {
      sessionStorage.removeItem("wondii-celebrate");
      celebrate(pending);
    }
  } catch (e) {}

  window.WondiiPortalHome = { paint: paint, celebrate: celebrate };
  if (routeHome()) paint();
})();
