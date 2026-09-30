/* Teacher home. Classes and pupil names belong to this signed-in account. */
(function () {
  "use strict";

  var host = document.getElementById("orgToday");
  var Learn = window.WondiiLearn;
  var KEY = "wondii-school-classes";
  if (!host || !Learn || !window.WondiiOrg) return;

  var HAIRS = [
    { id: "brown", label: "Brown" },
    { id: "black", label: "Black" },
    { id: "blonde", label: "Blonde" },
    { id: "auburn", label: "Auburn" }
  ];
  var LENGTHS = [
    { id: "short", label: "Short" },
    { id: "long", label: "Long" }
  ];
  var EYES = [
    { id: "brown", label: "Brown" },
    { id: "blue", label: "Blue" },
    { id: "green", label: "Green" }
  ];
  var openClass = "";
  var wizard = null;

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
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
  }

  function greeting() {
    var hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function lessonsNow() {
    return Learn.visibleLibrary().filter(function (item) {
      return !item.preparedExample && item.status === "ready";
    });
  }

  function weekActivity(lessons) {
    var since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var sessions = [];
    if (!window.ClassRooms || !ClassRooms.forJourney) return { sessions: 0, pupils: 0 };
    lessons.forEach(function (item) {
      ClassRooms.forJourney(item.id).forEach(function (session) {
        if (Date.parse(session.createdAt || "") >= since) sessions.push(session);
      });
    });
    var names = {};
    sessions.forEach(function (session) {
      var roster = session.board && session.board.roster;
      if (!roster) return;
      roster.forEach(function (pupil) {
        if (pupil.here && pupil.firstName) names[pupil.firstName.toLowerCase()] = true;
      });
    });
    return { sessions: sessions.length, pupils: Object.keys(names).length };
  }

  function allowed(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return id;
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
      length: who === "girl" ? "long" : (who === "boy" ? "short" : allowed(LENGTHS, pupil.length, "short")),
      eyes: allowed(EYES, pupil.eyes, "brown"),
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

  function blankPupil() {
    return { id: uid("pup_"), firstName: "", hair: "brown", length: "short", eyes: "brown" };
  }

  function figure(pupil, logoUrl, editable) {
    var look = lookOf(pupil);
    var logo = logoUrl ? "<img class=\"pupil-fig__logo\" src=\"" + escape(logoUrl) + "\" alt=\"\" />" : "";
    var inner = "<span class=\"pupil-fig\"><img src=\"" + portrait(look) + "\" alt=\"\" />" + logo + "</span>";
    if (!editable) return inner;
    return "<button type=\"button\" class=\"pupil-card\" data-edit=\"" + escape(pupil.id) + "\">" + inner +
      "<strong>" + escape(pupil.firstName || "Pupil") + "</strong></button>";
  }

  function captureWizard() {
    if (!wizard) return;
    var name = document.getElementById("classWizardName");
    var size = document.getElementById("classWizardSize");
    var pupilName = document.getElementById("pupilWizardName");
    if (name) wizard.name = name.value;
    if (size) wizard.size = size.value;
    if (pupilName && wizard.pupils[wizard.index]) wizard.pupils[wizard.index].firstName = pupilName.value;
  }

  function paint(view) {
    if (!paint.skip) captureWizard();
    var org = view && view.organisation;
    var home = host.closest(".p-view");
    if (home) home.classList.toggle("is-teacher", !!org);
    host.hidden = !org;
    if (!org) return;
    var school = org.name || "your school";
    var book = loadClasses();
    var lessons = lessonsNow();
    var activity = weekActivity(lessons);
    var query = (document.getElementById("teachSearch") && document.getElementById("teachSearch").value || "").trim().toLowerCase();
    var shown = lessons.filter(function (item) {
      if (!query) return true;
      var map = item.learningMap || {};
      var title = (item.plan && item.plan.title) || map.topic || "";
      return (title + " " + (map.subject || "")).toLowerCase().indexOf(query) !== -1;
    });
    host.innerHTML = shell(school, book, shown, lessons, activity, query, view);
    bind(book);
  }

  function shell(school, book, shown, lessons, activity, query, view) {
    return "<div class=\"teach-dash\">" +
      "<header class=\"teach-hello\"><div><p>" + greeting() + "</p><h1>Ready to inspire your class today?</h1></div>" +
      "<label class=\"teach-search\"><span class=\"visually-hidden\">Search lessons</span><input id=\"teachSearch\" type=\"search\" placeholder=\"Search lessons\" value=\"" + escape(query) + "\" /></label></header>" +
      "<div class=\"teach-top\">" + hero(book) + classesPanel(book, view) + "</div>" +
      quick(book) +
      wizardHtml(view) +
      "<div class=\"teach-lower\">" + adventures(shown, lessons.length) + activityPanel(activity, school, view) + "</div></div>";
  }

  function hero(book) {
    var href = "schools/learn/create.html";
    if (book && book.classes && book.classes.length === 1) href += "?class=" + encodeURIComponent(book.classes[0].id);
    return "<article class=\"teach-hero\"><img src=\"games/images/schools/teach-hero.jpg\" alt=\"\" /><div><h2>Create a Learning Adventure</h2>" +
      "<p>Tell Wondii what you are teaching. It already knows your class.</p>" +
      "<a class=\"teach-go\" href=\"" + href + "\">Create an adventure</a> " +
      "<a class=\"teach-quiet\" href=\"schools/learn/present.html?example=lights\">See how it works</a></div></article>";
  }

  function classesPanel(book) {
    var cards = book.classes.map(function (room) {
      var faces = room.pupils.slice(0, 4).map(function (pupil) {
        return "<img src=\"" + portrait(pupil, room.name) + "\" alt=\"\" />";
      }).join("");
      return "<a class=\"teach-class\" href=\"schools/learn/class.html?id=" + encodeURIComponent(room.id) + "\"><span class=\"teach-faces\">" + (faces || "<span class=\"teach-faces__empty\"></span>") + "</span><strong>" + escape(room.name) + "</strong><em>" + room.pupils.length + " pupil" + (room.pupils.length === 1 ? "" : "s") + "</em></a>";
    }).join("");
    return "<aside class=\"teach-classes\"><div class=\"teach-classes__head\"><h2>Your classes</h2></div>" +
      (cards || "<p>Add a class and Wondii will ask for each child.</p>") +
      "<button type=\"button\" class=\"teach-link\" id=\"addClass\">Add a class</button></aside>";
  }

  function classroom(book, view) {
    var room = book.classes.filter(function (item) { return item.id === openClass; })[0];
    if (!room) return "";
    var logo = view && view.logoUrl;
    var kids = room.pupils.map(function (pupil) { return figure(pupil, logo, true); }).join("");
    return "<section class=\"teach-room\"><div class=\"teach-classes__head\"><h2>" + escape(room.name) + "</h2>" +
      "<button type=\"button\" class=\"teach-link teach-link--inline\" id=\"addPupil\">Add a pupil</button></div>" +
      "<div class=\"teach-room__scene\"><img class=\"teach-room__bg\" src=\"games/images/schools/classroom.jpg\" alt=\"\" />" +
      "<div class=\"teach-room__row\">" + (kids || "<p class=\"teach-room__empty\">The class will stand here in school uniform.</p>") + "</div></div></section>";
  }

  function chips(list, trait, current) {
    return list.map(function (item) {
      var on = item.id === current ? " is-on" : "";
      return "<button type=\"button\" class=\"look-chip" + on + "\" data-trait=\"" + trait + "\" data-value=\"" + item.id + "\">" + item.label + "</button>";
    }).join("");
  }

  function wizardHtml(view) {
    if (!wizard) return "";
    var logo = view && view.logoUrl;
    var body = wizard.step === "pupil" ? pupilStep(logo) : sizeStep();
    return "<div class=\"teach-modal\" id=\"classWizard\"><div class=\"teach-modal__card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"wizardTitle\">" +
      "<button type=\"button\" class=\"teach-modal__x\" data-close aria-label=\"Close\">×</button>" + body + "</div></div>";
  }

  function sizeStep() {
    return "<p class=\"teach-modal__kicker\">New class</p><h2 id=\"wizardTitle\">Who is in this class?</h2>" +
      "<label>Class name <input id=\"classWizardName\" maxlength=\"40\" placeholder=\"Year 3\" value=\"" + escape(wizard.name || "") + "\" /></label>" +
      "<label>How many pupils? <input id=\"classWizardSize\" type=\"number\" min=\"1\" max=\"35\" inputmode=\"numeric\" placeholder=\"e.g. 28\" value=\"" + escape(wizard.size || "") + "\" /></label>" +
      (wizard.error ? "<p class=\"teach-modal__error\">" + escape(wizard.error) + "</p>" : "") +
      "<p class=\"teach-note\">Next, each child: first name, girl or boy, hair and eyes. A name like Sofia starts as a girl. No surnames.</p>" +
      "<div class=\"teach-modal__actions\"><button type=\"button\" class=\"teach-quiet\" data-close>Cancel</button>" +
      "<button type=\"button\" class=\"teach-go\" id=\"wizardNext\">Continue</button></div>";
  }

  function pupilStep(logo) {
    var pupil = wizard.pupils[wizard.index] || blankPupil();
    var look = lookOf(pupil);
    var last = wizard.index >= wizard.pupils.length - 1;
    var title = wizard.mode === "edit" ? "Edit " + (pupil.firstName || "pupil") : "Pupil " + (wizard.index + 1) + " of " + wizard.pupils.length;
    var nextLabel = wizard.mode === "edit" ? "Save" : (last ? "Add the class" : "Next pupil");
    return "<p class=\"teach-modal__kicker\">" + escape(wizard.name || "Class") + "</p><h2 id=\"wizardTitle\">" + escape(title) + "</h2>" +
      "<div class=\"teach-modal__pupil\">" + figure(Object.assign({ firstName: pupil.firstName }, look), logo, false) +
      "<div><label>First name <input id=\"pupilWizardName\" maxlength=\"24\" value=\"" + escape(pupil.firstName || "") + "\" /></label>" +
      "<p>Girl or boy</p><div class=\"look-chips\">" + chips([{ id: "girl", label: "Girl" }, { id: "boy", label: "Boy" }], "presentation", look.presentation) + "</div>" +
      "<p>Hair colour</p><div class=\"look-chips\">" + chips(HAIRS, "hair", look.hair) + "</div>" +
      "<p>Hair length</p><div class=\"look-chips\">" + chips(LENGTHS, "length", look.length) + "</div>" +
      "<p>Eye colour</p><div class=\"look-chips\">" + chips(EYES, "eyes", look.eyes) + "</div></div></div>" +
      (wizard.error ? "<p class=\"teach-modal__error\">" + escape(wizard.error) + "</p>" : "") +
      "<p class=\"teach-note\">The jumper is the same for the class. Your school logo sits on the chest.</p>" +
      "<div class=\"teach-modal__actions\"><button type=\"button\" class=\"teach-quiet\" id=\"wizardBack\">Back</button>" +
      "<button type=\"button\" class=\"teach-go\" id=\"wizardNext\">" + nextLabel + "</button></div>";
  }

  function pupilLessons(name) {
    var want = firstName(name).toLowerCase();
    var count = 0;
    if (!window.ClassRooms || !want) return 0;
    lessonsNow().forEach(function (item) {
      ClassRooms.forJourney(item.id).forEach(function (session) {
        var roster = session.board && session.board.roster;
        if (!roster) return;
        if (roster.some(function (pupil) { return pupil.here && firstName(pupil.firstName).toLowerCase() === want; })) count += 1;
      });
    });
    return count;
  }

  function quick(book) {
    var create = "schools/learn/create.html";
    if (book && book.classes && book.classes.length === 1) create += "?class=" + encodeURIComponent(book.classes[0].id);
    var items = [
      [create, "Create an adventure", "Say what the class is learning."],
      ["schools/learn/create.html?library=1", "Your adventures", "Open adventures on this account."],
      ["schools/learn/create.html?example=lights", "Prepared example", "The electricity adventure, ready to present."]
    ];
    return "<section class=\"teach-quick\"><h2>Quick actions</h2><div>" + items.map(function (item) {
      return "<a href=\"" + item[0] + "\"><strong>" + item[1] + "</strong><span>" + item[2] + "</span></a>";
    }).join("") + "</div></section>";
  }

  function adventures(shown, total) {
    var cards = shown.slice(0, 6).map(function (item) {
      var map = item.learningMap || {};
      var title = item.plan && item.plan.title ? item.plan.title : (map.topic || "Lesson");
      var meta = [map.yearGroup, map.subject].filter(Boolean).join(" · ");
      var mins = item.estimateMinutes ? item.estimateMinutes + " min" : "";
      var steps = item.plan && item.plan.steps ? item.plan.steps.length + " activities" : "";
      var start = "schools/learn/present.html?journey=" + encodeURIComponent(item.id) + (item.classId ? "&class=" + encodeURIComponent(item.classId) : "");
      return "<article><div><p>" + escape(meta) + "</p><h3>" + escape(title) + "</h3><p>" + escape([mins, steps].filter(Boolean).join(" · ")) + "</p></div>" +
        "<a href=\"" + start + "\">Start adventure</a></article>";
    }).join("");
    return "<section class=\"teach-adventures\"><div class=\"teach-classes__head\"><h2>Your recent adventures</h2><a href=\"schools/learn/create.html?library=1\">View all</a></div>" +
      (cards || "<p>Adventures you create show up here. Nothing from another account is listed.</p>") +
      (total > 6 ? "" : "") + "</section>";
  }

  function activityPanel(activity, school, view) {
    var empty = !activity.sessions;
    var starters = ((view && view.storyStarters) || []).filter(function (item) { return item.is_active; }).slice(0, 3);
    var ideas = starters.map(function (item) {
      return "<button type=\"button\" class=\"teach-class\" data-seed=\"" + escape(item.prompt_seed || item.title) + "\"><strong>" + escape(item.title) + "</strong></button>";
    }).join("");
    return "<aside class=\"teach-activity\"><h2>This week</h2>" +
      (empty ? "<p>Present a lesson with the class and this will show how many sessions you ran, and how many children were marked here.</p>" :
        "<p><strong>" + activity.sessions + "</strong> class session" + (activity.sessions === 1 ? "" : "s") + "</p><p><strong>" + activity.pupils + "</strong> children marked here</p>") +
      "<p class=\"teach-note\">This is who took part, not a score. Stories saved on this account stay in Stories. A book is not marked against a pupil yet.</p>" +
      (ideas ? "<h2>Ideas for " + escape(school) + "</h2>" + ideas : "") +
      "<a class=\"teach-quiet\" href=\"#stories\">Open Stories</a></aside>";
  }

  function commitPupil(pupil) {
    var look = lookOf(pupil);
    return {
      id: pupil.id || uid("pup_"),
      firstName: firstName(pupil.firstName),
      hair: look.hair,
      length: look.length,
      eyes: look.eyes,
      presentation: look.presentation || ""
    };
  }

  function finishWizard(book) {
    var room;
    if (wizard.mode === "edit" || wizard.mode === "add") {
      room = book.classes.filter(function (item) { return item.id === wizard.classId; })[0];
      if (!room) { wizard = null; return; }
      var saved = commitPupil(wizard.pupils[0]);
      if (wizard.mode === "edit") {
        room.pupils = room.pupils.map(function (item) { return item.id === saved.id ? saved : item; });
      } else room.pupils.push(saved);
      openClass = room.id;
    } else {
      room = {
        id: uid("cls_"),
        name: wizard.name,
        pupils: wizard.pupils.map(commitPupil)
      };
      book.classes.push(room);
      openClass = room.id;
      saveClasses(book);
      wizard = null;
      window.location.href = "schools/learn/class.html?id=" + encodeURIComponent(room.id) + "&welcome=1";
      return;
    }
    wizard = null;
    saveClasses(book);
  }

  function wizardNext(book) {
    captureWizard();
    wizard.error = "";
    if (wizard.step !== "pupil") {
      var name = String(wizard.name || "").trim().slice(0, 40);
      var size = parseInt(wizard.size, 10);
      if (!name) { wizard.error = "Add a class name."; paint(WondiiOrg.get()); return; }
      if (!size || size < 1 || size > 35) { wizard.error = "Choose a class size from 1 to 35."; paint(WondiiOrg.get()); return; }
      wizard.name = name;
      var next = [];
      for (var i = 0; i < size; i++) next.push(wizard.pupils[i] || blankPupil());
      wizard.pupils = next;
      wizard.index = 0;
      wizard.step = "pupil";
      paint.skip = true;
      paint(WondiiOrg.get());
      paint.skip = false;
      return;
    }
    var pupil = wizard.pupils[wizard.index];
    pupil.firstName = firstName(pupil.firstName);
    if (!pupil.firstName) { wizard.error = "Add a first name."; paint(WondiiOrg.get()); return; }
    if (wizard.mode === "new" && wizard.index < wizard.pupils.length - 1) {
      wizard.index += 1;
      paint.skip = true;
      paint(WondiiOrg.get());
      paint.skip = false;
      return;
    }
    finishWizard(book);
    paint(WondiiOrg.get());
  }

  function bind(book) {
    var search = document.getElementById("teachSearch");
    if (search) search.addEventListener("change", function () { paint(WondiiOrg.get()); });
    var addClass = document.getElementById("addClass");
    if (addClass) addClass.addEventListener("click", function () {
      wizard = { mode: "new", step: "size", name: "", size: "", index: 0, pupils: [], error: "" };
      paint(WondiiOrg.get());
    });
    host.querySelectorAll("[data-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openClass = openClass === btn.getAttribute("data-open") ? "" : btn.getAttribute("data-open");
        paint(WondiiOrg.get());
      });
    });
    var addPupil = document.getElementById("addPupil");
    if (addPupil) addPupil.addEventListener("click", function () {
      var room = book.classes.filter(function (item) { return item.id === openClass; })[0];
      if (!room) return;
      wizard = { mode: "add", step: "pupil", classId: room.id, name: room.name, index: 0, pupils: [blankPupil()], error: "" };
      paint(WondiiOrg.get());
    });
    host.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var room = book.classes.filter(function (item) { return item.id === openClass; })[0];
        if (!room) return;
        var pupil = room.pupils.filter(function (item) { return item.id === btn.getAttribute("data-edit"); })[0];
        if (!pupil) return;
        wizard = { mode: "edit", step: "pupil", classId: room.id, name: room.name, index: 0, pupils: [Object.assign({}, pupil)], error: "" };
        paint(WondiiOrg.get());
      });
    });
    host.querySelectorAll("[data-trait]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        captureWizard();
        var pupil = wizard && wizard.pupils[wizard.index];
        if (!pupil) return;
        var trait = btn.getAttribute("data-trait");
        var value = btn.getAttribute("data-value");
        pupil[trait] = value;
        pupil.lookLocked = true;
        if (trait === "presentation") pupil.length = value === "girl" ? "long" : "short";
        if (trait === "length") pupil.presentation = value === "long" ? "girl" : "boy";
        paint.skip = true;
        paint(WondiiOrg.get());
        paint.skip = false;
      });
    });
    host.querySelectorAll("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", function () { wizard = null; paint(WondiiOrg.get()); });
    });
    var modal = document.getElementById("classWizard");
    if (modal) modal.addEventListener("click", function (e) {
      if (e.target === modal) { wizard = null; paint(WondiiOrg.get()); }
    });
    var next = document.getElementById("wizardNext");
    if (next) next.addEventListener("click", function () { wizardNext(book); });
    var back = document.getElementById("wizardBack");
    if (back) back.addEventListener("click", function () {
      captureWizard();
      if (wizard.mode === "new" && wizard.step === "pupil" && wizard.index > 0) wizard.index -= 1;
      else if (wizard.mode === "new" && wizard.step === "pupil") wizard.step = "size";
      else { wizard = null; }
      wizard && (wizard.error = "");
      paint.skip = true;
      paint(WondiiOrg.get());
      paint.skip = false;
    });
    ["classWizardName", "classWizardSize", "pupilWizardName"].forEach(function (id) {
      var field = document.getElementById(id);
      if (!field) return;
      field.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); wizardNext(book); }
      });
      if (id === "pupilWizardName") field.addEventListener("input", function () {
        captureWizard();
        var pupil = wizard && wizard.pupils[wizard.index];
        if (!pupil || pupil.lookLocked) return;
        var guess = presentationOf(pupil.firstName);
        if (!guess || pupil.presentation === guess) return;
        pupil.presentation = guess;
        pupil.length = guess === "girl" ? "long" : "short";
        paint.skip = true;
        paint(WondiiOrg.get());
        paint.skip = false;
      });
    });
    host.querySelectorAll("[data-seed]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try { sessionStorage.setItem("wondii-org-starter", btn.getAttribute("data-seed") || ""); } catch (e) {}
        window.location.href = "games/storybook.html";
      });
    });
    var focus = document.getElementById("pupilWizardName") || document.getElementById("classWizardName");
    if (focus) {
      focus.focus();
      var end = focus.value.length;
      if (focus.setSelectionRange) focus.setSelectionRange(end, end);
    }
  }

  WondiiOrg.subscribe(paint);
  paint(WondiiOrg.get());
  window.WondiiHome = { paint: paint };
})();
