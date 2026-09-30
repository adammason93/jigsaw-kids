/* One class, one illustrated room. Pupils stay on this signed-in account. */
(function (global) {
  "use strict";

  var root = document.getElementById("roomApp");
  var KEY = "wondii-school-classes";
  if (!root) return;

  var params = new URLSearchParams(location.search);
  var classId = params.get("id") || "";
  var tab = params.get("tab") || "classroom";
  var memory = null;
  var selectedId = "";
  var cardId = "";
  var addWho = "";
  var chooseOn = false;
  var chosen = {};
  var lessonsOpen = false;
  var turnName = "";
  var wavingId = "";
  var hoverTimer = 0;
  var waveTimer = 0;
  var idleTimer = 0;
  var cooling = {};
  var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pendingRemove = "";
  var editId = "";
  var editSnapshot = null;

  var BODIES = ["brown-short", "black-short", "blonde-short", "auburn-short", "brown-long", "black-long", "blonde-long", "auburn-long"];
  var ARM_PIVOT = {};
  /* Reading time. Children sit cross-legged on the rug and the floor in front of it. */
  var SEATS = [
    { id: "red-1", table: "red", x: 42, y: 5, w: 13 },
    { id: "green-1", table: "green", x: 58, y: 5, w: 13 },
    { id: "blue-1", table: "blue", x: 50, y: 14, w: 11 },
    { id: "gold-1", table: "gold", x: 36, y: 12, w: 11 },
    { id: "red-2", table: "red", x: 64, y: 12, w: 11 },
    { id: "green-2", table: "green", x: 44, y: 20, w: 9 },
    { id: "blue-2", table: "blue", x: 56, y: 22, w: 9 },
    { id: "gold-2", table: "gold", x: 34, y: 22, w: 8.5 },
    { id: "red-3", table: "red", x: 66, y: 22, w: 8.5 },
    { id: "green-3", table: "green", x: 50, y: 26, w: 8 },
    { id: "blue-3", table: "blue", x: 40, y: 28, w: 7.5 },
    { id: "gold-3", table: "gold", x: 60, y: 28, w: 7.5 },
    { id: "red-4", table: "red", x: 32, y: 16, w: 8 },
    { id: "green-4", table: "green", x: 70, y: 16, w: 8 },
    { id: "blue-4", table: "blue", x: 46, y: 32, w: 7 },
    { id: "gold-4", table: "gold", x: 56, y: 32, w: 7 },
    { id: "red-5", table: "red", x: 38, y: 8, w: 10 },
    { id: "green-5", table: "green", x: 62, y: 8, w: 10 },
    { id: "blue-5", table: "blue", x: 28, y: 20, w: 7.5 },
    { id: "gold-5", table: "gold", x: 74, y: 20, w: 7.5 },
    { id: "red-6", table: "red", x: 36, y: 32, w: 6.5 },
    { id: "green-6", table: "green", x: 64, y: 32, w: 6.5 },
    { id: "blue-6", table: "blue", x: 50, y: 8, w: 10 },
    { id: "gold-6", table: "gold", x: 54, y: 18, w: 8 },
    { id: "rug-1", table: "red", x: 42, y: 24, w: 7.5 },
    { id: "rug-2", table: "blue", x: 58, y: 24, w: 7.5 },
    { id: "rug-3", table: "green", x: 48, y: 34, w: 6.5 },
    { id: "rug-4", table: "gold", x: 62, y: 18, w: 7.5 },
    { id: "front-1", table: "red", x: 34, y: 6, w: 9 },
    { id: "front-2", table: "green", x: 68, y: 6, w: 9 },
    { id: "front-3", table: "blue", x: 46, y: 16, w: 8 },
    { id: "front-4", table: "gold", x: 60, y: 10, w: 8 }
  ];
  var TABLE_NAME = { red: "Red table", blue: "Blue table", green: "Green table", gold: "Gold table" };

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function firstName(value) {
    return String(value || "").trim().split(/\s+/)[0].slice(0, 24);
  }

  function uid(prefix) {
    if (global.WondiiSchoolDomain && global.WondiiSchoolDomain.uuid) return global.WondiiSchoolDomain.uuid();
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function yearFromName(name) {
    var text = String(name || "").toLowerCase();
    if (/\breception\b|\bnursery\b|\bfoundation\b/.test(text)) return 0;
    var tagged = text.match(/\b(?:year|yr|y)\s*([1-6])(?!\d)/);
    if (tagged) return Number(tagged[1]);
    var compact = text.match(/\by([1-6])(?!\d)/);
    if (compact) return Number(compact[1]);
    var lead = text.trim().match(/^([1-6])\s*[a-z]$/i);
    if (lead) return Number(lead[1]);
    return null;
  }

  function agePrefix(name) {
    var year = yearFromName(name);
    if (year === null || year === 4) return "";
    if (year <= 1) return "5-";
    if (year <= 3) return "6-";
    return "10-";
  }

  function ageScale(name) {
    var year = yearFromName(name);
    if (year === null || year === 4) return 1;
    if (year <= 1) return 0.78;
    if (year <= 3) return 0.88;
    return 1.08;
  }

  var GIRL_NAMES = "sofia sophia sophie sofie emma olivia amelia isla ava mia isabella freya grace poppy lily ella charlotte emily jessica hannah lucy chloe ruby evie eva maya zara aisha fatima noor priya leah alice daisy florence harper willow iris nora anna maria layla lila sienna imogen phoebe matilda rosie esme scarlett violet hazel penelope luna aria amira yasmin hana".split(" ");
  var BOY_NAMES = "jack noah oliver liam ethan leo freddie jacob harry george oscar arthur muhammad mohammed ali thomas james william henry alfie theo finley arlo teddy hugo joshua daniel samuel joseph alexander lucas mason logan benjamin jake max adam ryan callum dylan harrison sebastian isaac jonah eli kai omar yusuf hassan ravi arjun ibrahim charlie".split(" ");
  var GIRL_SET = {};
  var BOY_SET = {};
  GIRL_NAMES.forEach(function (name) { GIRL_SET[name] = 1; });
  BOY_NAMES.forEach(function (name) { BOY_SET[name] = 1; });

  function presentationOf(value) {
    var key = firstName(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (GIRL_SET[key]) return "girl";
    if (BOY_SET[key]) return "boy";
    return "";
  }

  function bodyOf(pupil) {
    var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
    var who = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : presentationOf(pupil.firstName);
    var length = who === "girl" ? "long" : (who === "boy" ? "short" : (pupil.length === "long" ? "long" : "short"));
    return hair + "-" + length;
  }

  function roomYear(room) {
    return (room && (room.yearLabel || room.name)) || "";
  }

  function artKey(pupil, room) {
    return agePrefix(roomYear(room)) + bodyOf(pupil);
  }

  function art(pupil, wave, room) {
    return "../../games/images/schools/room/kid-" + artKey(pupil, room) + (wave ? "-wave" : "") + ".webp";
  }

  function armArt(pupil, room) {
    var key = artKey(pupil, room);
    if (!ARM_PIVOT[key]) return "";
    return "../../games/images/schools/room/kid-" + key + "-arm.webp";
  }

  function loadBook() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.classes)) {
          memory = saved;
          return saved;
        }
      }
    } catch (e) {}
    return memory || { classes: [] };
  }

  function saveBook(book) {
    memory = book;
    try { localStorage.setItem(KEY, JSON.stringify(book)); } catch (e) {}
    if (global.WondiiSchoolData) global.WondiiSchoolData.syncClasses(book);
  }

  function findRoom(book) {
    for (var i = 0; i < book.classes.length; i++) if (book.classes[i].id === classId) return book.classes[i];
    return null;
  }

  function seatById(id) {
    for (var i = 0; i < SEATS.length; i++) if (SEATS[i].id === id) return SEATS[i];
    return null;
  }

  function ensure(room) {
    var changed = false;
    var used = {};
    room.pupils.forEach(function (pupil) { if (pupil.seat) used[pupil.seat] = true; });
    room.pupils.forEach(function (pupil, index) {
      if (!/^(brown|black|blonde|auburn)$/.test(pupil.hair) || (pupil.length !== "short" && pupil.length !== "long")) {
        var bits = BODIES[index % BODIES.length].split("-");
        pupil.hair = bits[0];
        pupil.length = bits[1];
        if (!pupil.eyes) pupil.eyes = "brown";
        changed = true;
      }
      if (pupil.presentation !== "girl" && pupil.presentation !== "boy") {
        var guess = presentationOf(pupil.firstName);
        if (guess) {
          pupil.presentation = guess;
          pupil.length = guess === "girl" ? "long" : "short";
          changed = true;
        }
      }
      if (!seatById(pupil.seat) || used[pupil.seat] && room.pupils.filter(function (item) { return item.seat === pupil.seat; }).length > 1) {
        var free = null;
        for (var s = 0; s < SEATS.length; s++) if (!used[SEATS[s].id]) { free = SEATS[s]; break; }
        if (free) {
          used[pupil.seat] = false;
          pupil.seat = free.id;
          used[free.id] = true;
          if (!pupil.group) pupil.group = free.table;
          changed = true;
        }
      }
      if (!pupil.group && pupil.seat) {
        var seat = seatById(pupil.seat);
        pupil.group = seat ? seat.table : "red";
        changed = true;
      }
    });
    return changed;
  }

  function orgView() {
    try { return global.WondiiOrg && WondiiOrg.get ? WondiiOrg.get() : {}; } catch (e) { return {}; }
  }

  function adventureNow() {
    var want = params.get("adventure") || "";
    var list = lessons();
    var found = null;
    if (want) list.forEach(function (item) { if (item.id === want) found = item; });
    return found || list[0] || null;
  }

  function lessons() {
    if (!global.WondiiLearn || !WondiiLearn.visibleLibrary) return [];
    return WondiiLearn.visibleLibrary().filter(function (item) {
      return item && !item.preparedExample && item.status === "ready";
    });
  }

  function participation(name) {
    var want = firstName(name).toLowerCase();
    var count = 0;
    if (!want || !global.ClassRooms || !ClassRooms.forJourney) return 0;
    lessons().forEach(function (item) {
      ClassRooms.forJourney(item.id).forEach(function (session) {
        var roster = session.board && session.board.roster;
        if (!roster) return;
        if (roster.some(function (pupil) { return pupil.here && firstName(pupil.firstName).toLowerCase() === want; })) count += 1;
      });
    });
    return count;
  }

  function paint() {
    var view = orgView();
    if (view.primaryColour) document.documentElement.style.setProperty("--school-accent", view.primaryColour);
    var book = loadBook();
    var room = findRoom(book);
    if (!room) {
      root.innerHTML = "<main class=\"room-page w-page\" data-w-context=\"schools\">" + shellNav("classes") +
        "<div class=\"w-empty\"><p class=\"w-empty__title\">This class is not on this account</p><p>Classes belong to the signed-in teacher.</p></div></main>";
      return;
    }
    if (ensure(room)) saveBook(book);
    root.innerHTML = page(room, view);
    bind(book, room);
    scheduleIdle();
  }

  function shellNav(current) {
    var links = [
      ["home", "Home"],
      ["classes", "Classes"],
      ["create", "Create"],
      ["library", "Library"],
      ["results", "Results"]
    ];
    return "<nav class=\"room-bar\" aria-label=\"School\">" + links.map(function (item) {
      var on = item[0] === current ? " aria-current=\"page\"" : "";
      return "<a href=\"../../portal.html#" + item[0] + "\"" + on + ">" + item[1] + "</a>";
    }).join("") + "</nav>";
  }

  function rememberClass(room) {
    try {
      sessionStorage.setItem("wondii-class-context", JSON.stringify({
        classId: room.id,
        name: room.name,
        yearLabel: room.yearLabel || ""
      }));
    } catch (e) {}
  }

  function page(room, view) {
    rememberClass(room);
    var count = room.pupils.length;
    var welcome = params.get("welcome") === "1";
    var year = room.yearLabel ? "<p class=\"w-kicker\">" + escape(room.yearLabel) + "</p>" : "";
    var q = encodeURIComponent(room.id);
    return "<main class=\"room-page w-page\" data-w-context=\"schools\">" +
      shellNav("classes") +
      schoolLockup(view) +
      "<header class=\"room-top\"><div>" + year + "<h1>" + escape(room.name) + "</h1><p>" + count + " pupil" + (count === 1 ? "" : "s") + "</p></div></header>" +
      "<div class=\"t-actions\">" +
      "<a class=\"w-btn w-btn--primary\" href=\"create.html?class=" + q + "\">Create Adventure</a>" +
      "<a class=\"w-btn w-btn--secondary\" href=\"present.html?example=lights&class=" + q + "\">Quick Game</a>" +
      "<a class=\"w-btn w-btn--quiet\" href=\"../../games/storybook.html?create=1&class=" + q + "\">Create Story</a></div>" +
      (welcome ? "<p class=\"w-note w-note--success\" id=\"welcomeBanner\">" + escape(room.name) + " is ready.</p>" : "") +
      (tab === "classroom" ? scene(room, view) + below(room) : "") +
      tools(room) +
      (tab === "pupils" ? pupilsTab(room) : "") +
      (tab === "characters" ? charactersTab(room) : "") +
      (tab === "groups" ? groupsTab(room) : "") +
      (tab === "progress" ? progressTab(room) : "") +
      (tab === "past" ? pastTab(room) : "") +
      (tab === "settings" ? settingsTab(room) : "") +
      (cardId ? card(room) : "") +
      (lessonsOpen ? lessonPicker(room) : "") +
      removeDialog(room) +
      editDialog(room) +
      "</main>";
  }

  function schoolLockup(view) {
    var name = (view && view.organisationName) || "";
    var logo = view && view.logoUrl ? "<img src=\"" + escape(view.logoUrl) + "\" alt=\"\" />" : "";
    if (!name && !logo) return "<div class=\"t-school\"><img class=\"t-mark\" src=\"../../games/images/brand/wondi-wordmark.svg\" alt=\"Wondii\" /></div>";
    return "<div class=\"t-school\"><img class=\"t-mark\" src=\"../../games/images/brand/wondi-wordmark.svg\" alt=\"Wondii\" />" + logo +
      "<div><strong>" + escape(name || "School") + "</strong><span>Wondii Schools</span></div></div>";
  }

  function tools(room) {
    var items = [
      ["classroom", "Classroom"],
      ["pupils", "Pupils"],
      ["characters", "Characters"],
      ["progress", "Progress"],
      ["past", "Past activities"],
      ["settings", "Settings"]
    ];
    return "<nav class=\"room-tools\" aria-label=\"Class tools\">" + items.map(function (item) {
      var on = item[0] === tab ? " aria-current=\"page\"" : "";
      return "<a href=\"?id=" + encodeURIComponent(room.id) + "&tab=" + item[0] + "\"" + on + ">" + item[1] + "</a>";
    }).join("") + "</nav>";
  }

  function scene(room, view) {
    var logo = view && view.logoUrl ? "<img src=\"" + escape(view.logoUrl) + "\" alt=\"\" />" : "";
    var overflow = 0;
    var seats = room.pupils.map(function (pupil) {
      var seat = seatById(pupil.seat);
      if (!seat) {
        overflow += 1;
        seat = { x: 6 + ((overflow - 1) % 8) * 11, y: 2 + Math.floor((overflow - 1) / 8) * 8, w: 8 };
      }
      var scale = ageScale(roomYear(room));
      var hot = pupil.id === selectedId ? " is-selected is-hot" : "";
      if (chosen[pupil.id]) hot += " is-turn";
      var arm = armArt(pupil, room);
      var armImg = arm ? "<img class=\"seat-arm\" style=\"transform-origin:" + ARM_PIVOT[artKey(pupil, room)] + "\" src=\"" + arm + "\" alt=\"\" />" : "<img class=\"seat-wave\" src=\"" + art(pupil, true, room) + "\" alt=\"\" />";
      return "<button type=\"button\" class=\"seat" + hot + "\" data-pupil=\"" + escape(pupil.id) + "\" style=\"left:" + seat.x + "%;bottom:" + seat.y + "%;height:" + (seat.w * scale * 2.55).toFixed(2) + "%;z-index:" + (100 - seat.y) + "\" aria-label=\"" + escape(pupil.firstName) + " — open pupil\">" +
        "<img class=\"seat-idle\" src=\"" + art(pupil, false, room) + "\" alt=\"\" />" +
        armImg +
        "<span class=\"seat-name\">" + escape(pupil.firstName) + "</span></button>";
    }).join("");
    var empty = room.pupils.length ? "" : "<div class=\"room-empty\"><h2>Your classroom is ready</h2><p>Add your pupils and they will sit on the floor for reading time.</p><a class=\"room-go\" href=\"?id=" + encodeURIComponent(room.id) + "&tab=pupils\">Add pupils</a></div>";
    var list = room.pupils.map(function (pupil) {
      return "<li><img src=\"" + art(pupil, false, room) + "\" alt=\"\" /><strong>" + escape(pupil.firstName) + "</strong></li>";
    }).join("");
    return "<section class=\"room-stage\" id=\"roomStage\"><div class=\"room-frame\">" +
      "<img class=\"room-bg\" src=\"../../games/images/schools/room-classic.jpg\" alt=\"\" />" +
      "<div class=\"room-board\">" + logo + "<span>" + (adventureNow() ? "Today's adventure" : "Wondii") + "</span><strong>" + escape(adventureNow() ? ((adventureNow().plan && adventureNow().plan.title) || "Adventure") : room.name) + "</strong></div>" +
      seats + empty +
      "<button type=\"button\" class=\"room-ghost room-full\" id=\"roomFull\">Full screen</button></div></section>" +
      "<section class=\"room-fallback room-card\"><h2>" + escape(room.name) + "</h2><ul class=\"room-list\">" + (list || "<li>No pupils yet.</li>") + "</ul></section>" +
      (turnName ? "<p class=\"room-turn\">" + escape(turnName) + "'s turn</p>" : "") +
      (chooseOn ? "<p class=\"room-banner\">Choose pupils in the room. Selected: " + Object.keys(chosen).length + " <button type=\"button\" class=\"room-go\" id=\"chooseContinue\">Continue</button></p>" : "");
  }

  function below(room) {
    var list = lessons();
    var today = adventureNow();
    var sessions = 0;
    if (global.ClassRooms && ClassRooms.forJourney) {
      list.forEach(function (item) { sessions += ClassRooms.forJourney(item.id).length; });
    }
    var todayHtml = today ? "<article class=\"w-card\"><h2 class=\"w-h3\">Continue</h2><p>" + escape((today.plan && today.plan.title) || (today.learningMap && today.learningMap.topic) || "Adventure") + "</p><a class=\"w-btn w-btn--secondary\" href=\"present.html?journey=" + encodeURIComponent(today.id) + "&class=" + encodeURIComponent(room.id) + "\">Start adventure</a></article>" : "<article class=\"w-card\"><h2 class=\"w-h3\">Continue</h2><p>Adventures for this class show up here.</p></article>";
    return "<div class=\"room-below t-grid\">" + todayHtml + "<article class=\"w-card\"><h2 class=\"w-h3\">In the room</h2><p>" + (sessions ? sessions + " class session" + (sessions === 1 ? "" : "s") + " on this account." : "Sessions appear after this class takes part.") + "</p><p class=\"t-actions\"><button type=\"button\" class=\"w-btn w-btn--quiet\" id=\"startLesson\">Saved lessons</button><button type=\"button\" class=\"w-btn w-btn--quiet\" id=\"choosePupils\">" + (chooseOn ? "Done choosing" : "Choose pupils") + "</button><button type=\"button\" class=\"w-btn w-btn--quiet\" id=\"spinSomeone\">Choose someone</button></p></article></div>";
  }

  function strip(room) {
    if (!room.pupils.length) return "";
    var buttons = room.pupils.slice(0, 16).map(function (pupil) {
      return "<button type=\"button\" data-pupil=\"" + escape(pupil.id) + "\"><img src=\"" + art(pupil, false, room) + "\" alt=\"\" />" + escape(pupil.firstName) + "</button>";
    }).join("");
    var more = room.pupils.length > 16 ? "<a href=\"?id=" + encodeURIComponent(room.id) + "&tab=pupils\">+" + (room.pupils.length - 16) + "</a>" : "";
    return "<section><h2>Your pupils · " + room.pupils.length + "</h2><div class=\"room-strip\">" + buttons + more + "</div></section>";
  }

  function pupilRow(room, pupil) {
    return "<li><img class=\"w-avatar w-avatar--sm\" src=\"" + art(pupil, false, room) + "\" alt=\"\" /><strong>" + escape(pupil.firstName) + "</strong>" +
      "<button type=\"button\" class=\"w-btn w-btn--quiet\" data-edit=\"" + escape(pupil.id) + "\">Character</button>" +
      "<button type=\"button\" class=\"w-btn w-btn--quiet\" data-remove=\"" + escape(pupil.id) + "\">Remove</button></li>";
  }

  function pupilsTab(room) {
    var rows = room.pupils.map(function (pupil) { return pupilRow(room, pupil); }).join("");
    var empty = room.pupils.length ? "" : "<div class=\"w-empty\"><p class=\"w-empty__title\">No pupils yet</p><p>Add first names below. One child on each line.</p></div>";
    return "<section class=\"w-panel\"><h2 class=\"w-h2\">Pupils</h2>" + empty +
      "<ul class=\"room-people\">" + rows + "</ul>" +
      "<h3 class=\"w-h3\">Add pupils</h3>" +
      "<label class=\"w-field\">First names<textarea class=\"w-input\" id=\"pasteNames\" rows=\"6\" placeholder=\"One first name on each line\"></textarea>" +
      "<p class=\"w-help\" id=\"pastePreview\">Names will appear here.</p></label>" +
      "<p><button type=\"button\" class=\"w-btn w-btn--primary\" id=\"saveNames\">Add these pupils</button></p>" +
      "<h3 class=\"w-h3\">Add one pupil</h3>" +
      "<label class=\"w-field\">First name<input class=\"w-input\" id=\"newPupil\" maxlength=\"24\" /></label>" +
      "<p>Girl or boy</p><div class=\"w-segment\"><button type=\"button\" id=\"pickGirl\">Girl</button><button type=\"button\" id=\"pickBoy\">Boy</button></div>" +
      "<p><button type=\"button\" class=\"w-btn w-btn--secondary\" id=\"savePupil\">Add pupil</button></p></section>";
  }

  function charactersTab(room) {
    var rows = room.pupils.map(function (pupil) { return pupilRow(room, pupil); }).join("");
    return "<section class=\"w-panel\"><h2 class=\"w-h2\">Characters</h2><p>Each pupil has a character. You can use the class before changing any of them.</p>" +
      (rows ? "<ul class=\"room-people\">" + rows + "</ul>" : "<div class=\"w-empty\"><p class=\"w-empty__title\">No characters yet</p><p>Add pupils and Wondii gives each one a character.</p></div>") +
      "</section>";
  }

  function classSessions(room) {
    var list = [];
    try {
      var raw = JSON.parse(localStorage.getItem("wondii-class-sessions") || "[]");
      if (!Array.isArray(raw)) return list;
      raw.forEach(function (session) {
        if (!session || session.demo) return;
        if (session.classId === room.id) list.push(session);
      });
    } catch (e) {}
    return list;
  }

  function pastTab(room) {
    var rows = classSessions(room).map(function (session) {
      var when = session.createdAt ? new Date(session.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
      return "<article class=\"w-card\"><strong>" + escape(session.title || session.code || "Class session") + "</strong><p>" + escape([session.status, when].filter(Boolean).join(" · ")) + "</p></article>";
    }).join("");
    return "<section><h2 class=\"w-h2\">Past activities</h2>" +
      (rows ? "<div class=\"t-grid\">" + rows + "</div>" : "<div class=\"w-empty\"><p class=\"w-empty__title\">No activities yet</p><p>Results will appear after your class completes an activity.</p></div>") +
      "</section>";
  }

  function groupsTab(room) {
    var rows = room.pupils.map(function (pupil) {
      var options = ["red", "blue", "green", "gold"].map(function (id) {
        return "<option value=\"" + id + "\"" + (pupil.group === id ? " selected" : "") + ">" + TABLE_NAME[id] + "</option>";
      }).join("");
      return "<li><strong>" + escape(pupil.firstName) + "</strong><select data-group=\"" + escape(pupil.id) + "\">" + options + "</select></li>";
    }).join("");
    return "<section class=\"room-panel\"><h2>Tables</h2><p>Moving a pupil gives them a free seat at that table.</p><ul class=\"room-list\">" + (rows || "<li>Add pupils first.</li>") + "</ul></section>";
  }

  function progressTab(room) {
    var rows = room.pupils.map(function (pupil) {
      var n = participation(pupil.firstName);
      return "<li><img src=\"" + art(pupil, false, room) + "\" alt=\"\" /><strong>" + escape(pupil.firstName) + "</strong><span>" + n + " class session" + (n === 1 ? "" : "s") + "</span></li>";
    }).join("");
    return "<section class=\"room-panel\"><h2>Who took part</h2><p>This is participation in lessons on this account, not a score.</p><ul class=\"room-list\">" + (rows || "<li>No pupils yet.</li>") + "</ul></section>";
  }

  function settingsTab(room) {
    var years = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map(function (year) {
      return "<option" + (room.yearLabel === year ? " selected" : "") + ">" + year + "</option>";
    }).join("");
    return "<section class=\"w-panel\"><h2 class=\"w-h2\">Settings</h2>" +
      "<label class=\"w-field\">Class name<input class=\"w-input\" id=\"renameClass\" maxlength=\"40\" value=\"" + escape(room.name) + "\" /></label>" +
      "<label class=\"w-field\">Year or group<select class=\"w-input\" id=\"renameYear\"><option value=\"\">Not set</option>" + years + "</select></label>" +
      "<p><button type=\"button\" class=\"w-btn w-btn--primary\" id=\"saveName\">Save</button></p>" +
      "<p><a href=\"?id=" + encodeURIComponent(room.id) + "&tab=groups\">Tables</a></p>" +
      "<p class=\"w-help\">The year sets how old the characters look. Removing a whole class is not available yet.</p></section>";
  }

  function removeDialog(room) {
    if (!pendingRemove) return "";
    var pupil = room.pupils.filter(function (item) { return item.id === pendingRemove; })[0];
    if (!pupil) return "";
    return "<dialog class=\"w-dialog\" id=\"removePupil\" aria-labelledby=\"removeTitle\"><div class=\"w-dialog__body\">" +
      "<h2 class=\"w-h2\" id=\"removeTitle\">Remove " + escape(pupil.firstName) + "?</h2>" +
      "<p>" + escape(pupil.firstName) + " will leave " + escape(room.name) + ".</p>" +
      "<div class=\"w-dialog__actions\"><button type=\"button\" class=\"w-btn w-btn--quiet\" id=\"removeCancel\">Cancel</button>" +
      "<button type=\"button\" class=\"w-btn w-btn--danger\" id=\"removeConfirm\">Remove</button></div></div></dialog>";
  }

  function chipRow(list, trait, current) {
    return list.map(function (item) {
      var on = item.id === current ? " is-on\" aria-pressed=\"true" : "\" aria-pressed=\"false";
      return "<button type=\"button\" class=\"look-chip" + on + "\" data-trait=\"" + trait + "\" data-value=\"" + item.id + "\">" + item.label + "</button>";
    }).join("");
  }

  function editDialog(room) {
    if (!editId) return "";
    var pupil = room.pupils.filter(function (item) { return item.id === editId; })[0];
    if (!pupil) return "";
    var who = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : "";
    return "<dialog class=\"w-dialog\" id=\"editPupil\" aria-labelledby=\"editTitle\"><div class=\"w-dialog__body\">" +
      "<h2 class=\"w-h2\" id=\"editTitle\">" + escape(pupil.firstName) + "</h2>" +
      "<img class=\"w-avatar w-avatar--lg\" src=\"" + art(pupil, false, room) + "\" alt=\"\" />" +
      "<p>Girl or boy</p><div class=\"w-segment\">" + chipRow([{ id: "girl", label: "Girl" }, { id: "boy", label: "Boy" }], "presentation", who) + "</div>" +
      "<p>Hair</p><div class=\"w-segment\">" + chipRow([{ id: "brown", label: "Brown" }, { id: "black", label: "Black" }, { id: "blonde", label: "Blonde" }, { id: "auburn", label: "Auburn" }], "hair", pupil.hair || "brown") + "</div>" +
      "<p>Eyes</p><div class=\"w-segment\">" + chipRow([{ id: "brown", label: "Brown" }, { id: "blue", label: "Blue" }, { id: "green", label: "Green" }], "eyes", pupil.eyes || "brown") + "</div>" +
      "<div class=\"w-dialog__actions\"><button type=\"button\" class=\"w-btn w-btn--quiet\" id=\"editCancel\">Close</button>" +
      "<button type=\"button\" class=\"w-btn w-btn--primary\" id=\"editSave\">Save</button></div></div></dialog>";
  }

  function card(room) {
    var pupil = room.pupils.filter(function (item) { return item.id === cardId; })[0];
    if (!pupil) return "";
    var n = participation(pupil.firstName);
    return "<aside class=\"room-card room-card-float\"><button type=\"button\" class=\"room-ghost\" id=\"closeCard\">Close</button><h2>" + escape(pupil.firstName) + "</h2><img src=\"" + art(pupil, false, room) + "\" alt=\"\" width=\"120\" />" +
      "<p>" + n + " class session" + (n === 1 ? "" : "s") + " with this class.</p>" +
      "<p><button type=\"button\" class=\"room-go\" id=\"cardChoose\">Choose for an activity</button> " +
      "<button type=\"button\" class=\"room-ghost\" data-remove=\"" + escape(pupil.id) + "\">Remove from class</button></p></aside>";
  }

  function lessonPicker(room) {
    var list = lessons();
    var rows = list.slice(0, 6).map(function (item) {
      var title = (item.plan && item.plan.title) || (item.learningMap && item.learningMap.topic) || "Lesson";
      return "<p><a class=\"room-go\" href=\"present.html?journey=" + encodeURIComponent(item.id) + "&class=" + encodeURIComponent(room.id) + "\">" + escape(title) + "</a></p>";
    }).join("");
    return "<section class=\"room-panel room-lessons\"><h2>Start a lesson</h2>" + (rows || "<p>No saved lessons on this account yet.</p>") +
      "<p><a class=\"room-ghost\" href=\"create.html?class=" + encodeURIComponent(room.id) + "\">Create an adventure</a> <button type=\"button\" class=\"room-ghost\" id=\"closeLessons\">Close</button></p></section>";
  }

  function wave(button) {
    if (!button || reduced) {
      if (button) button.classList.add("is-hot");
      return;
    }
    var id = button.getAttribute("data-pupil");
    if (!id || cooling[id] || button.classList.contains("is-wave")) {
      button.classList.add("is-hot");
      return;
    }
    var node = button.querySelector(".seat-arm, .seat-wave");
    button.classList.add("is-wave", "is-hot");
    cooling[id] = true;
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      var live = root.querySelector("[data-pupil=\"" + id + "\"]");
      if (live) {
        live.classList.remove("is-wave");
        if (selectedId !== id) live.classList.remove("is-hot");
      }
      global.setTimeout(function () { cooling[id] = false; }, 700);
    }
    if (node) {
      node.addEventListener("animationend", function end(event) {
        if (event.target !== node) return;
        node.removeEventListener("animationend", end);
        done();
      });
    }
    global.clearTimeout(waveTimer);
    waveTimer = global.setTimeout(done, 1400);
  }

  function boardFor(room) {
    var raw = null;
    try { raw = JSON.parse(sessionStorage.getItem("wondii-class-turn") || "null"); } catch (e) {}
    if (!raw || raw.classId !== room.id) {
      raw = { classId: room.id, roster: room.pupils.map(function (pupil) {
        return { id: pupil.id, firstName: pupil.firstName, avatar: "pip", here: true, inWheel: true };
      }), remaining: [], picked: [], currentId: "", selection: "fair" };
    }
    return raw;
  }

  function saveBoard(board) {
    try { sessionStorage.setItem("wondii-class-turn", JSON.stringify(board)); } catch (e) {}
  }

  function forgetPupil(room, id) {
    var board = boardFor(room);
    board.roster = (board.roster || []).filter(function (pupil) { return pupil.id !== id; });
    board.remaining = (board.remaining || []).filter(function (item) { return item !== id; });
    board.picked = (board.picked || []).filter(function (item) { return item !== id; });
    if (board.currentId === id) board.currentId = "";
    saveBoard(board);
    try {
      var saved = JSON.parse(sessionStorage.getItem("wondii-class-pick") || "null");
      if (saved && saved.classId === room.id && Array.isArray(saved.ids)) {
        saved.ids = saved.ids.filter(function (item) { return item !== id; });
        sessionStorage.setItem("wondii-class-pick", JSON.stringify(saved));
      }
    } catch (e) {}
  }

  function bind(book, room) {
    var start = document.getElementById("startLesson");
    if (start) start.addEventListener("click", function () { lessonsOpen = !lessonsOpen; paint(); });
    var closeLessons = document.getElementById("closeLessons");
    if (closeLessons) closeLessons.addEventListener("click", function () { lessonsOpen = false; paint(); });
    var choose = document.getElementById("choosePupils");
    if (choose) choose.addEventListener("click", function () {
      chooseOn = !chooseOn;
      if (!chooseOn) chosen = {};
      paint();
    });
    var cont = document.getElementById("chooseContinue");
    if (cont) cont.addEventListener("click", function () {
      try { sessionStorage.setItem("wondii-class-pick", JSON.stringify({ classId: room.id, ids: Object.keys(chosen) })); } catch (e) {}
      lessonsOpen = true;
      chooseOn = false;
      paint();
    });
    var full = document.getElementById("roomFull");
    if (full) full.addEventListener("click", function () {
      var stage = document.getElementById("roomStage");
      if (stage && stage.requestFullscreen) {
        var pending = stage.requestFullscreen();
        if (pending && pending.catch) pending.catch(function () {});
      }
    });
    root.querySelectorAll("[data-pupil]").forEach(function (button) {
      button.addEventListener("pointerenter", function (event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        global.clearTimeout(hoverTimer);
        hoverTimer = global.setTimeout(function () { wave(button); }, 160);
      });
      button.addEventListener("pointerleave", function () {
        global.clearTimeout(hoverTimer);
        if (!button.classList.contains("is-wave") && button.getAttribute("data-pupil") !== selectedId) button.classList.remove("is-hot");
      });
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-pupil");
        if (chooseOn) {
          if (chosen[id]) delete chosen[id]; else chosen[id] = true;
          paint();
          return;
        }
        var again = selectedId === id;
        selectedId = id;
        if (again) cardId = id;
        paint();
        if (!again) wave(root.querySelector("[data-pupil=\"" + id + "\"]"));
      });
    });
    root.querySelectorAll("[data-card]").forEach(function (button) {
      button.addEventListener("click", function () { cardId = button.getAttribute("data-card"); selectedId = cardId; paint(); });
    });
    var closeCard = document.getElementById("closeCard");
    if (closeCard) closeCard.addEventListener("click", function () { cardId = ""; paint(); });
    var cardChoose = document.getElementById("cardChoose");
    if (cardChoose) cardChoose.addEventListener("click", function () {
      chosen = {};
      chosen[cardId] = true;
      try { sessionStorage.setItem("wondii-class-pick", JSON.stringify({ classId: room.id, ids: [cardId] })); } catch (e) {}
      lessonsOpen = true;
      paint();
    });
    var spin = document.getElementById("spinSomeone");
    if (spin) spin.addEventListener("click", function () {
      if (!global.Classroom || !room.pupils.length) return;
      var board = boardFor(room);
      var pupil = Classroom.take(board);
      saveBoard(board);
      if (!pupil) return;
      selectedId = pupil.id;
      turnName = pupil.firstName;
      paint();
      var button = root.querySelector("[data-pupil=\"" + pupil.id + "\"]");
      wave(button);
    });
    var skip = document.getElementById("spinSkip");
    if (skip) skip.addEventListener("click", function () {
      if (!global.Classroom) return;
      var board = boardFor(room);
      var pupil = Classroom.skip(board);
      saveBoard(board);
      if (!pupil) return;
      selectedId = pupil.id;
      turnName = pupil.firstName;
      paint();
      wave(root.querySelector("[data-pupil=\"" + pupil.id + "\"]"));
    });
    root.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
        pendingRemove = button.getAttribute("data-remove") || "";
        paint();
      });
    });
    root.querySelectorAll("[data-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        var pupil = room.pupils.filter(function (item) { return item.id === button.getAttribute("data-edit"); })[0];
        if (!pupil) return;
        editId = pupil.id;
        editSnapshot = { presentation: pupil.presentation || "", hair: pupil.hair, length: pupil.length, eyes: pupil.eyes };
        paint();
      });
    });
    root.querySelectorAll("[data-trait]").forEach(function (button) {
      button.addEventListener("click", function () {
        var pupil = room.pupils.filter(function (item) { return item.id === editId; })[0];
        if (!pupil) return;
        var trait = button.getAttribute("data-trait");
        var value = button.getAttribute("data-value");
        pupil[trait] = value;
        if (trait === "presentation") pupil.length = value === "girl" ? "long" : "short";
        paint();
      });
    });
    var savePupil = document.getElementById("savePupil");
    if (savePupil) savePupil.addEventListener("click", function () {
      var name = firstName(document.getElementById("newPupil").value);
      if (!name) return;
      var who = addWho || presentationOf(name);
      addWho = "";
      var used = {};
      room.pupils.forEach(function (pupil) { used[bodyOf(pupil)] = (used[bodyOf(pupil)] || 0) + 1; });
      var pool = BODIES.filter(function (id) {
        if (who === "girl") return /-long$/.test(id);
        if (who === "boy") return /-short$/.test(id);
        return true;
      });
      var best = pool.slice().sort(function (a, b) { return (used[a] || 0) - (used[b] || 0); })[0];
      if (global._roomRandom) {
        best = BODIES[Math.floor(Math.random() * BODIES.length)];
        who = /-long$/.test(best) ? "girl" : "boy";
      }
      global._roomRandom = false;
      var bits = best.split("-");
      room.pupils.push({ id: uid("pup_"), firstName: name, hair: bits[0], length: who === "girl" ? "long" : (who === "boy" ? "short" : bits[1]), eyes: "brown", presentation: who, seat: "", group: "" });
      ensure(room);
      saveBook(book);
      paint();
    });
    var randomLook = document.getElementById("randomLook");
    if (randomLook) randomLook.addEventListener("click", function () { global._roomRandom = true; randomLook.textContent = "A varied character will be used"; });
    function paintWho(who) {
      var girl = document.getElementById("pickGirl");
      var boy = document.getElementById("pickBoy");
      if (girl) girl.classList.toggle("is-on", who === "girl");
      if (boy) boy.classList.toggle("is-on", who === "boy");
    }
    var newPupil = document.getElementById("newPupil");
    if (newPupil) newPupil.addEventListener("input", function () {
      if (!addWho) paintWho(presentationOf(newPupil.value));
    });
    var pickGirl = document.getElementById("pickGirl");
    var pickBoy = document.getElementById("pickBoy");
    if (pickGirl) pickGirl.addEventListener("click", function () { addWho = "girl"; paintWho("girl"); });
    if (pickBoy) pickBoy.addEventListener("click", function () { addWho = "boy"; paintWho("boy"); });
    root.querySelectorAll("[data-who]").forEach(function (button) {
      button.addEventListener("click", function () {
        var pupil = room.pupils.filter(function (item) { return item.id === button.getAttribute("data-id"); })[0];
        if (!pupil) return;
        var who = button.getAttribute("data-who") === "boy" ? "boy" : "girl";
        pupil.presentation = who;
        pupil.length = who === "girl" ? "long" : "short";
        saveBook(book);
        paint();
      });
    });
    root.querySelectorAll("[data-group]").forEach(function (select) {
      select.addEventListener("change", function () {
        var pupil = room.pupils.filter(function (item) { return item.id === select.getAttribute("data-group"); })[0];
        if (!pupil) return;
        pupil.group = select.value;
        pupil.seat = "";
        var used = {};
        room.pupils.forEach(function (item) { if (item.seat) used[item.seat] = true; });
        for (var i = 0; i < SEATS.length; i++) {
          if (SEATS[i].table === pupil.group && !used[SEATS[i].id]) { pupil.seat = SEATS[i].id; break; }
        }
        saveBook(book);
        paint();
      });
    });
    var saveName = document.getElementById("saveName");
    if (saveName) saveName.addEventListener("click", function () {
      var name = String(document.getElementById("renameClass").value || "").trim().slice(0, 40);
      var year = String(document.getElementById("renameYear").value || "");
      if (!name) return;
      room.name = name;
      room.yearLabel = year;
      saveBook(book);
      paint();
    });
    var paste = document.getElementById("pasteNames");
    var pastePreview = document.getElementById("pastePreview");
    function namesFromPaste() {
      var names = [];
      String(paste && paste.value || "").split(/\n/).forEach(function (line) {
        var name = firstName(line);
        if (name && names.length < 35) names.push(name);
      });
      return names;
    }
    if (paste && pastePreview) paste.addEventListener("input", function () {
      var names = namesFromPaste();
      pastePreview.textContent = names.length ? names.length + " pupil" + (names.length === 1 ? "" : "s") + ": " + names.join(", ") : "Names will appear here.";
    });
    var saveNames = document.getElementById("saveNames");
    if (saveNames) saveNames.addEventListener("click", function () {
      var names = namesFromPaste();
      if (!names.length) return;
      names.forEach(function (name, index) {
        var who = presentationOf(name);
        var hairs = ["brown", "black", "blonde", "auburn"];
        room.pupils.push({
          id: uid("pup_"),
          firstName: name,
          hair: hairs[index % hairs.length],
          length: who === "girl" ? "long" : "short",
          eyes: "brown",
          presentation: who,
          seat: "",
          group: ""
        });
      });
      ensure(room);
      saveBook(book);
      paint();
    });
    function showDialog(id) {
      var dialog = document.getElementById(id);
      if (dialog && dialog.showModal && !dialog.open) dialog.showModal();
    }
    var removeCancel = document.getElementById("removeCancel");
    if (removeCancel) removeCancel.addEventListener("click", function () {
      pendingRemove = "";
      paint();
    });
    var removeConfirm = document.getElementById("removeConfirm");
    if (removeConfirm) removeConfirm.addEventListener("click", function () {
      var id = pendingRemove;
      pendingRemove = "";
      var pupil = room.pupils.filter(function (item) { return item.id === id; })[0];
      if (!pupil) { paint(); return; }
      room.pupils = room.pupils.filter(function (item) { return item.id !== id; });
      if (selectedId === id) { selectedId = ""; turnName = ""; }
      if (cardId === id) cardId = "";
      if (editId === id) editId = "";
      if (chosen[id]) delete chosen[id];
      forgetPupil(room, id);
      saveBook(book);
      paint();
    });
    var editCancel = document.getElementById("editCancel");
    if (editCancel) editCancel.addEventListener("click", function () {
      var pupil = room.pupils.filter(function (item) { return item.id === editId; })[0];
      if (pupil && editSnapshot) {
        pupil.presentation = editSnapshot.presentation;
        pupil.hair = editSnapshot.hair;
        pupil.length = editSnapshot.length;
        pupil.eyes = editSnapshot.eyes;
      }
      editId = "";
      editSnapshot = null;
      paint();
    });
    var editSave = document.getElementById("editSave");
    if (editSave) editSave.addEventListener("click", function () {
      editId = "";
      editSnapshot = null;
      saveBook(book);
      paint();
    });
    showDialog("removePupil");
    showDialog("editPupil");
    var removeDialogNode = document.getElementById("removePupil");
    if (removeDialogNode) {
      removeDialogNode.addEventListener("cancel", function (event) {
        event.preventDefault();
        pendingRemove = "";
        paint();
      });
      var cancelBtn = document.getElementById("removeCancel");
      if (cancelBtn) cancelBtn.focus();
    }
    var editDialogNode = document.getElementById("editPupil");
    if (editDialogNode) {
      editDialogNode.addEventListener("cancel", function (event) {
        event.preventDefault();
        editCancel && editCancel.click();
      });
    }
    if (params.get("welcome") === "1") {
      params.delete("welcome");
      history.replaceState(null, "", "?" + params.toString());
      if (!reduced && room.pupils.length === 1) {
        wave(root.querySelector("[data-pupil]"));
      }
    }
  }

  function scheduleIdle() {
    global.clearInterval(idleTimer);
    if (reduced || tab !== "classroom") return;
    idleTimer = global.setInterval(function () {
      if (document.hidden) return;
      var seats = root.querySelectorAll(".seat");
      seats.forEach(function (seat) { seat.classList.remove("is-alive"); });
      var pool = [];
      seats.forEach(function (seat) { if (!seat.classList.contains("is-wave")) pool.push(seat); });
      var n = Math.min(3, pool.length);
      for (var i = 0; i < n; i++) {
        var pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (pick) pick.classList.add("is-alive");
      }
    }, 2600);
  }

  if (global.WondiiOrg && WondiiOrg.subscribe) WondiiOrg.subscribe(paint);
  paint();
  global.WondiiClass = { reload: paint };
})(window);
