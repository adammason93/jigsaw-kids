/* Teacher home. Classes and pupil names belong to this signed-in account. */
(function () {
  "use strict";

  var host = document.getElementById("orgToday");
  var Learn = window.WondiiLearn;
  var KEY = "wondii-school-classes";
  if (!host || !Learn || !window.WondiiOrg) return;

  var HAIRS = ["brown", "black", "blonde", "auburn"];
  var YEARS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
  var adding = false;
  var addError = "";

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function uid() {
    if (window.WondiiSchoolDomain && window.WondiiSchoolDomain.uuid) return window.WondiiSchoolDomain.uuid();
    return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function firstName(value) {
    return String(value || "").trim().split(/\s+/)[0].slice(0, 24);
  }

  var memoryBook = null;

  function loadClasses() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.classes)) {
          memoryBook = saved;
          return saved;
        }
      }
    } catch (e) {}
    return memoryBook || { classes: [] };
  }

  function saveClasses(book) {
    memoryBook = book;
    try { localStorage.setItem(KEY, JSON.stringify(book)); } catch (e) {}
    if (window.WondiiSchoolData && window.WondiiSchoolData.syncClasses) {
      return window.WondiiSchoolData.syncClasses(book);
    }
    return Promise.resolve();
  }

  function greeting() {
    var hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function teacherRoute() {
    var h = (window.location.hash || "").replace("#", "");
    if (h === "home" || h === "classes" || h === "create" || h === "library" || h === "results") return h;
    if (!h) return "home";
    return "";
  }

  function lessonsNow() {
    return Learn.visibleLibrary().filter(function (item) {
      return item && !item.preparedExample && item.status !== "archived";
    });
  }

  function readyLessons() {
    return lessonsNow().filter(function (item) { return item.status === "ready"; });
  }

  function sessionsNow() {
    try {
      var raw = JSON.parse(localStorage.getItem("wondii-class-sessions") || "[]");
      return Array.isArray(raw) ? raw.filter(function (item) { return item && item.demo !== true; }) : [];
    } catch (e) { return []; }
  }

  function weekActivity(lessons) {
    var since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var sessions = [];
    if (!window.ClassRooms || !ClassRooms.forJourney) return { sessions: 0 };
    lessons.forEach(function (item) {
      ClassRooms.forJourney(item.id).forEach(function (session) {
        if (Date.parse(session.createdAt || "") >= since) sessions.push(session);
      });
    });
    return { sessions: sessions.length };
  }

  function allowed(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i] === id) return id;
    return fallback;
  }

  var GIRL_SET = {};
  var BOY_SET = {};
  "sofia sophia sophie sofie emma olivia amelia isla ava mia isabella freya grace poppy lily ella charlotte emily jessica hannah lucy chloe ruby evie eva maya zara aisha fatima noor priya leah alice daisy florence harper willow iris nora anna maria layla lila sienna imogen phoebe matilda rosie esme scarlett violet hazel penelope luna aria amira yasmin hana".split(" ").forEach(function (name) { GIRL_SET[name] = 1; });
  "jack noah oliver liam ethan leo freddie jacob harry george oscar arthur muhammad mohammed ali thomas james william henry alfie theo finley arlo teddy hugo joshua daniel samuel joseph alexander lucas mason logan benjamin jake max adam ryan callum dylan harrison sebastian isaac jonah eli kai omar yusuf hassan ravi arjun ibrahim charlie".split(" ").forEach(function (name) { BOY_SET[name] = 1; });

  function presentationOf(value) {
    var key = firstName(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (GIRL_SET[key]) return "girl";
    if (BOY_SET[key]) return "boy";
    return "";
  }

  function lookOf(pupil) {
    pupil = pupil || {};
    var who = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : presentationOf(pupil.firstName);
    return {
      hair: allowed(HAIRS, pupil.hair, "brown"),
      length: who === "girl" ? "long" : (who === "boy" ? "short" : (pupil.length === "long" ? "long" : "short")),
      eyes: /^(brown|blue|green)$/.test(pupil.eyes) ? pupil.eyes : "brown",
      presentation: who
    };
  }

  function portrait(pupil, className) {
    var look = lookOf(pupil);
    var text = String(className || "").toLowerCase();
    var yearMatch = text.match(/\b(?:year|yr|y)\s*([1-6])(?!\d)/) || text.match(/\by([1-6])(?!\d)/);
    var lead = text.trim().match(/^([1-6])\s*[a-z]$/i);
    var year = /\breception\b|\bnursery\b/.test(text) ? 0 : (yearMatch ? Number(yearMatch[1]) : (lead ? Number(lead[1]) : null));
    var prefix = year === null || year === 4 ? "" : (year <= 1 ? "5-" : (year <= 3 ? "6-" : "10-"));
    return "games/images/schools/room/kid-" + prefix + look.hair + "-" + look.length + ".webp";
  }

  function lessonTitle(item) {
    var map = item.learningMap || {};
    return (item.plan && item.plan.title) || map.topic || "Learning Adventure";
  }

  function parseNames(value) {
    var names = [];
    String(value || "").split(/\n/).forEach(function (line) {
      var name = firstName(line);
      if (name && names.length < 35) names.push(name);
    });
    return names;
  }

  function pupilFromName(name, index) {
    var who = presentationOf(name);
    return {
      id: uid(),
      firstName: name,
      hair: HAIRS[index % HAIRS.length],
      length: who === "girl" ? "long" : "short",
      eyes: "brown",
      presentation: who
    };
  }

  function markTeacherNav() {
    var view = teacherRoute();
    document.querySelectorAll("[data-teacher]").forEach(function (link) {
      var on = !!view && link.getAttribute("data-teacher") === view;
      link.classList.toggle("is-on", on);
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (view && view !== "home") {
      document.querySelectorAll("[data-view-link=\"home\"]").forEach(function (link) {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      });
    }
  }

  function classCard(room) {
    var label = room.yearLabel || room.name;
    var faces = (room.pupils || []).slice(0, 4).map(function (pupil) {
      return "<img class=\"w-avatar w-avatar--sm\" src=\"" + portrait(pupil, label) + "\" alt=\"\" />";
    }).join("");
    var year = room.yearLabel ? "<span class=\"w-badge w-badge--school\">" + escape(room.yearLabel) + "</span>" : "";
    var count = (room.pupils || []).length;
    return "<a class=\"w-card w-card--interactive t-class\" href=\"schools/learn/class.html?id=" + encodeURIComponent(room.id) + "\">" +
      "<span class=\"w-faces\">" + (faces || "<span class=\"w-avatar w-avatar--sm\" aria-hidden=\"true\"></span>") + "</span>" +
      "<strong>" + escape(room.name) + "</strong>" + year +
      "<em>" + count + " pupil" + (count === 1 ? "" : "s") + "</em>" +
      "<span class=\"w-btn w-btn--secondary\">Open class</span></a>";
  }

  function emptyClasses() {
    return "<div class=\"w-empty\"><p class=\"w-empty__title\">No classes yet</p><p>Create your first class to bring your Wondii classroom to life.</p></div>";
  }

  function createLinks(classId) {
    var adventure = "schools/learn/create.html" + (classId ? "?class=" + encodeURIComponent(classId) : "");
    var game = "schools/learn/create.html?quick=1" + (classId ? "&class=" + encodeURIComponent(classId) : "");
    var story = "games/storybook.html?create=1" + (classId ? "&class=" + encodeURIComponent(classId) : "");
    return [
      [adventure, "Learning Adventure", "Turn today's lesson into an adventure."],
      [game, "Quick Game", "Quiz, spin, or a word search with this class."],
      [story, "Create Story", "Start a story on this account."]
    ];
  }

  function createCards(classId) {
    return "<div class=\"t-grid\">" + createLinks(classId).map(function (item) {
      return "<a class=\"w-card w-card--interactive w-card--feature\" href=\"" + item[0] + "\"><h3 class=\"w-h3\">" + item[1] + "</h3><p>" + item[2] + "</p></a>";
    }).join("") + "</div>";
  }

  function oneClassId(book) {
    return book.classes.length === 1 ? book.classes[0].id : "";
  }

  function liveSession(sessions) {
    var i;
    for (i = 0; i < sessions.length; i++) {
      var status = sessions[i].engineStatus || "";
      if (status === "active" || status === "paused" || status === "recoverable_error" || status === "waiting") return sessions[i];
    }
    return null;
  }

  function currentAdventure(item) {
    if (!item || item.creator !== "v2" || !item.plan || !item.plan.activities || !item.plan.activities.length) return false;
    var known = { quiz: 1, spin: 1, word_search: 1, story: 1, mystery: 1, doors: 1 };
    return item.plan.activities.every(function (activity) { return activity && known[activity.mechanic]; });
  }

  function recentBlock(lessons, sessions) {
    var bits = [];
    var live = liveSession(sessions);
    if (live && live.code) {
      var resume = "schools/learn/present.html?session=" + encodeURIComponent(live.code) + (live.classId ? "&class=" + encodeURIComponent(live.classId) : "");
      bits.push("<a class=\"w-card w-card--interactive\" href=\"" + resume + "\"><p class=\"w-kicker\">Continue lesson</p><strong>" + escape(live.title || live.code) + "</strong><p>Round still open</p></a>");
    }
    var adventure = readyLessons()[0];
    if (adventure && currentAdventure(adventure)) {
      var start = "schools/learn/create.html?start=" + encodeURIComponent(adventure.id) + (adventure.classId ? "&class=" + encodeURIComponent(adventure.classId) : "");
      bits.push("<a class=\"w-card w-card--interactive\" href=\"" + start + "\"><p class=\"w-kicker\">Start adventure</p><strong>" + escape(lessonTitle(adventure)) + "</strong></a>");
    } else if (adventure) {
      bits.push("<a class=\"w-card w-card--interactive\" href=\"schools/learn/create.html?library=1\"><p class=\"w-kicker\">Older adventure</p><strong>" + escape(lessonTitle(adventure)) + "</strong><p>Update it before starting</p></a>");
    }
    if (!bits.length) {
      return "<div class=\"w-empty\"><p class=\"w-empty__title\">Nothing to continue yet</p><p>Create a Learning Adventure from your lesson material.</p></div>";
    }
    return "<div class=\"t-grid\">" + bits.join("") + "</div>";
  }

  function homeView(view, book, lessons, sessions) {
    var week = weekActivity(readyLessons());
    var classes = book.classes.slice(0, 4).map(classCard).join("");
    var insight = week.sessions ? "<p class=\"w-note w-note--info\">" + week.sessions + " class session" + (week.sessions === 1 ? "" : "s") + " this week.</p>" : "";
    return "<header class=\"t-section\"><p class=\"w-kicker\">Wondii Schools</p><h1 class=\"w-title\">" + greeting() + "</h1>" +
      "<p class=\"w-lead\">What would you like to create?</p></header>" +
      createCards(oneClassId(book)) +
      insight +
      "<section class=\"t-section\"><div class=\"w-toolbar\"><h2 class=\"w-h2\">My classes</h2><a class=\"w-btn w-btn--quiet\" href=\"#classes\">All classes</a></div>" +
      (classes ? "<div class=\"t-grid\">" + classes + "</div>" : emptyClasses() + "<p><a class=\"w-btn w-btn--primary\" href=\"#classes\">Add a class</a></p>") +
      "</section>" +
      "<section class=\"t-section\"><h2 class=\"w-h2\">Continue</h2>" + recentBlock(lessons, sessions) + "</section>";
  }

  function addDialog() {
    if (!adding) return "";
    var years = "<option value=\"\">Year or group</option>" + YEARS.map(function (year) {
      return "<option>" + year + "</option>";
    }).join("");
    return "<dialog class=\"w-dialog w-dialog--wide\" id=\"addClassDialog\" aria-labelledby=\"addClassTitle\">" +
      "<form class=\"w-dialog__body\" id=\"addClassForm\">" +
      "<h2 class=\"w-h2\" id=\"addClassTitle\">Add a class</h2>" +
      "<p>First names only. Characters can be changed later.</p>" +
      "<label class=\"w-field\">Class name<input class=\"w-input\" id=\"className\" name=\"className\" maxlength=\"40\" required /></label>" +
      "<label class=\"w-field\">Year or group<select class=\"w-input\" id=\"classYear\" name=\"classYear\" required>" + years + "</select></label>" +
      "<label class=\"w-field\">Pupils<textarea class=\"w-input\" id=\"classNames\" name=\"classNames\" rows=\"8\" placeholder=\"One first name on each line\"></textarea>" +
      "<p class=\"w-help\" id=\"namePreview\">Names will appear here.</p></label>" +
      (addError ? "<p class=\"w-error\" role=\"alert\">" + escape(addError) + "</p>" : "") +
      "<div class=\"w-dialog__actions\"><button type=\"button\" class=\"w-btn w-btn--quiet\" id=\"addClassCancel\">Cancel</button>" +
      "<button type=\"submit\" class=\"w-btn w-btn--primary\" id=\"addClassSave\">Create class</button></div></form></dialog>";
  }

  function classesView(view, book) {
    var cards = book.classes.map(classCard).join("");
    return "<header class=\"t-section\"><div class=\"w-toolbar\"><h1 class=\"w-title\">Classes</h1>" +
      "<button type=\"button\" class=\"w-btn w-btn--primary\" id=\"addClass\">Add class</button></div></header>" +
      (cards ? "<div class=\"t-grid\">" + cards + "</div>" : emptyClasses()) +
      addDialog();
  }

  function createView(view, book) {
    return "<header class=\"t-section\"><h1 class=\"w-title\">Create</h1><p class=\"w-lead\">Choose what to make. Inside a class, Wondii already knows the pupils.</p></header>" +
      createCards(oneClassId(book));
  }

  function libraryView(view, lessons) {
    var cards = lessons.map(function (item) {
      var ready = item.status === "ready" && currentAdventure(item);
      var href = ready
        ? "schools/learn/create.html?start=" + encodeURIComponent(item.id) + (item.classId ? "&class=" + encodeURIComponent(item.classId) : "")
        : (item.creator === "v2" ? "schools/learn/create.html?library=1" : "schools/learn/create.html?adapt=" + encodeURIComponent(item.id));
      var meta = [(item.learningMap && item.learningMap.yearGroup) || "", ready ? "Start" : (currentAdventure(item) ? "Draft" : "Update this adventure")].filter(Boolean).join(" · ");
      return "<a class=\"w-card w-card--interactive\" href=\"" + href + "\"><p class=\"w-kicker\">Learning Adventure</p><strong>" + escape(lessonTitle(item)) + "</strong><p>" + escape(meta) + "</p></a>";
    }).join("");
    var stories = "<a class=\"w-card w-card--interactive\" href=\"#stories\"><p class=\"w-kicker\">Stories / Books</p><strong>Stories on this account</strong><p>Open the story shelf. A book is not marked against a pupil yet.</p></a>";
    return "<header class=\"t-section\"><h1 class=\"w-title\">Library</h1><p class=\"w-lead\">Adventures and stories saved on this account.</p></header>" +
      "<section class=\"t-section\"><h2 class=\"w-h2\">Learning Adventures</h2>" +
      (cards ? "<div class=\"t-grid\">" + cards + "</div>" : "<div class=\"w-empty\"><p class=\"w-empty__title\">No adventures yet</p><p>Create a Learning Adventure from your lesson material.</p></div>") +
      "</section><section class=\"t-section\"><h2 class=\"w-h2\">Stories / Books</h2><div class=\"t-grid\">" + stories + "</div></section>";
  }

  function resultsView(view, sessions) {
    var rows = sessions.slice(0, 12).map(function (session) {
      var when = session.createdAt ? new Date(session.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
      var href = session.code ? "schools/learn/present.html?session=" + encodeURIComponent(session.code) + (session.classId ? "&class=" + encodeURIComponent(session.classId) : "") : "#results";
      return "<a class=\"w-card w-card--interactive\" href=\"" + href + "\"><strong>" + escape(session.title || session.code || "Class session") + "</strong><p>" + escape([session.status, when].filter(Boolean).join(" · ")) + "</p></a>";
    }).join("");
    return "<header class=\"t-section\"><h1 class=\"w-title\">Results</h1><p class=\"w-lead\">Class sessions on this account. This is participation, not attainment.</p></header>" +
      (rows ? "<div class=\"t-grid\">" + rows + "</div>" : "<div class=\"w-empty\"><p class=\"w-empty__title\">No results yet</p><p>Results will appear after your class completes an activity.</p></div>");
  }

  function paint(view) {
    var org = view && view.organisation;
    var home = host.closest(".p-view");
    if (home) home.classList.toggle("is-teacher", !!org);
    host.hidden = !org;
    markTeacherNav();
    if (!org) return;
    var book = loadClasses();
    var lessons = lessonsNow();
    var sessions = sessionsNow().slice().sort(function (a, b) {
      return Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "");
    });
    var route = teacherRoute();
    var html = route === "classes" ? classesView(view, book) :
      route === "create" ? createView(view, book) :
      route === "library" ? libraryView(view, lessons) :
      route === "results" ? resultsView(view, sessions) :
      homeView(view, book, lessons, sessions);
    host.innerHTML = "<div class=\"teach-dash w-page\" data-w-context=\"schools\">" + html + "</div>";
    bind(book);
  }

  function bind(book) {
    var addClass = document.getElementById("addClass");
    if (addClass) addClass.addEventListener("click", function () {
      adding = true;
      addError = "";
      paint(WondiiOrg.get());
    });
    var dialog = document.getElementById("addClassDialog");
    var form = document.getElementById("addClassForm");
    if (dialog && form) {
      var names = document.getElementById("classNames");
      var preview = document.getElementById("namePreview");
      function showPreview() {
        var list = parseNames(names.value);
        preview.textContent = list.length ? list.length + " pupil" + (list.length === 1 ? "" : "s") + ": " + list.join(", ") : "Names will appear here.";
      }
      if (names) names.addEventListener("input", showPreview);
      var cancel = document.getElementById("addClassCancel");
      if (cancel) cancel.addEventListener("click", function () {
        adding = false;
        dialog.close();
        paint(WondiiOrg.get());
      });
      dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        adding = false;
        paint(WondiiOrg.get());
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var name = String(document.getElementById("className").value || "").trim().slice(0, 40);
        var year = String(document.getElementById("classYear").value || "");
        if (!name || YEARS.indexOf(year) < 0) {
          addError = "Add a class name and a year.";
          paint(WondiiOrg.get());
          return;
        }
        var pupils = parseNames(names.value).map(pupilFromName);
        var room = { id: uid(), name: name, yearLabel: year, pupils: pupils };
        book.classes.push(room);
        adding = false;
        addError = "";
        var save = document.getElementById("addClassSave");
        if (save) save.classList.add("is-loading");
        var pending = saveClasses(book);
        var go = function () {
          window.location.href = "schools/learn/class.html?id=" + encodeURIComponent(room.id) + "&welcome=1";
        };
        if (pending && pending.then) pending.then(go, go);
        else go();
      });
      var nameField = document.getElementById("className");
      if (nameField) nameField.focus();
      if (dialog.showModal && !dialog.open) {
        try { dialog.showModal(); } catch (e) {}
      }
    }
  }

  window.addEventListener("hashchange", function () {
    paint(WondiiOrg.get());
  });

  WondiiOrg.subscribe(paint);
  paint(WondiiOrg.get());
  window.WondiiHome = { paint: paint };
})();
