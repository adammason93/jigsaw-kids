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

  function artKey(pupil, room) {
    return agePrefix(room && room.name) + bodyOf(pupil);
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
    if (view.primaryColour) document.documentElement.style.setProperty("--room-accent", view.primaryColour);
    var book = loadBook();
    var room = findRoom(book);
    if (!room) {
      root.innerHTML = "<main class=\"room-page\"><a class=\"room-back\" href=\"../../portal.html#home\">Back to classes</a><h1>This class is not on this account</h1><p>Classes belong to the signed-in teacher. Nothing from another account is shown here.</p></main>";
      return;
    }
    if (ensure(room)) saveBook(book);
    root.innerHTML = page(room, view);
    bind(book, room);
    scheduleIdle();
  }

  function page(room, view) {
    var count = room.pupils.length;
    var welcome = params.get("welcome") === "1";
    return "<main class=\"room-page\">" +
      "<a class=\"room-back\" href=\"../../portal.html#home\">Back to classes</a>" +
      "<header class=\"room-top\"><div><p>" + count + " pupil" + (count === 1 ? "" : "s") + "</p><h1>" + escape(room.name) + "</h1></div>" +
      "<div class=\"room-actions\"><a class=\"room-go\" href=\"create.html?class=" + encodeURIComponent(room.id) + "\">Create an adventure</a>" +
      "<button type=\"button\" class=\"room-ghost\" id=\"startLesson\">Start a lesson</button>" +
      "<button type=\"button\" class=\"room-ghost\" id=\"choosePupils\">" + (chooseOn ? "Done choosing" : "Choose pupils") + "</button>" +
      "<a class=\"room-ghost\" href=\"?id=" + encodeURIComponent(room.id) + "&tab=pupils\">Edit class</a></div></header>" +
      tabs(room) +
      (welcome ? "<p class=\"room-banner\" id=\"welcomeBanner\">" + (count > 1 ? "Your class is ready. " + count + " explorers have joined " + escape(room.name) + "." : (count === 1 ? "Welcome, " + escape(room.pupils[0].firstName) + "." : "Your classroom is ready.")) + "</p>" : "") +
      (tab === "classroom" ? scene(room, view) + below(room) + strip(room) : "") +
      (tab === "pupils" ? pupilsTab(room) : "") +
      (tab === "groups" ? groupsTab(room) : "") +
      (tab === "progress" ? progressTab(room) : "") +
      (tab === "settings" ? settingsTab(room) : "") +
      (cardId ? card(room) : "") +
      (lessonsOpen ? lessonPicker(room) : "") +
      "</main>";
  }

  function tabs(room) {
    var items = ["classroom", "pupils", "groups", "progress", "settings"];
    return "<nav class=\"room-tabs\">" + items.map(function (item) {
      var on = item === tab ? " is-on" : "";
      return "<a class=\"" + on.trim() + "\" href=\"?id=" + encodeURIComponent(room.id) + "&tab=" + item + "\">" + item.charAt(0).toUpperCase() + item.slice(1) + "</a>";
    }).join("") + "</nav>";
  }

  function scene(room, view) {
    var logo = view && view.logoUrl ? "<img src=\"" + escape(view.logoUrl) + "\" alt=\"\" />" : "";
    var seats = room.pupils.map(function (pupil) {
      var seat = seatById(pupil.seat) || SEATS[0];
      var scale = ageScale(room.name);
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
    var todayHtml = today ? "<article class=\"room-card\"><h2>Today's adventure</h2><p>" + escape((today.plan && today.plan.title) || (today.learningMap && today.learningMap.topic) || "Adventure") + "</p><a class=\"room-go\" href=\"present.html?journey=" + encodeURIComponent(today.id) + "&class=" + encodeURIComponent(room.id) + "\">Start adventure</a></article>" : "<article class=\"room-card\"><h2>Today's adventure</h2><p>Adventures you create for this class show up here.</p><a class=\"room-go\" href=\"create.html?class=" + encodeURIComponent(room.id) + "\">Create an adventure</a></article>";
    return "<div class=\"room-below\">" + todayHtml + "<article class=\"room-card\"><h2>This week</h2><p>" + (sessions ? sessions + " class session" + (sessions === 1 ? "" : "s") + " on this account." : "Present a lesson and this will show how many times the class took part.") + "</p><button type=\"button\" class=\"room-ghost\" id=\"spinSomeone\">Choose someone</button> <button type=\"button\" class=\"room-ghost\" id=\"spinSkip\">Someone else</button></article></div>";
  }

  function strip(room) {
    if (!room.pupils.length) return "";
    var buttons = room.pupils.slice(0, 16).map(function (pupil) {
      return "<button type=\"button\" data-pupil=\"" + escape(pupil.id) + "\"><img src=\"" + art(pupil, false, room) + "\" alt=\"\" />" + escape(pupil.firstName) + "</button>";
    }).join("");
    var more = room.pupils.length > 16 ? "<a href=\"?id=" + encodeURIComponent(room.id) + "&tab=pupils\">+" + (room.pupils.length - 16) + "</a>" : "";
    return "<section><h2>Your pupils · " + room.pupils.length + "</h2><div class=\"room-strip\">" + buttons + more + "</div></section>";
  }

  function pupilsTab(room) {
    var rows = room.pupils.map(function (pupil) {
      var who = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : presentationOf(pupil.firstName);
      return "<li><img src=\"" + art(pupil, false, room) + "\" alt=\"\" /><strong>" + escape(pupil.firstName) + "</strong><span>" + escape(TABLE_NAME[pupil.group] || "") + "</span>" +
        "<button type=\"button\" class=\"look-chip" + (who === "girl" ? " is-on" : "") + "\" data-who=\"girl\" data-id=\"" + escape(pupil.id) + "\">Girl</button>" +
        "<button type=\"button\" class=\"look-chip" + (who === "boy" ? " is-on" : "") + "\" data-who=\"boy\" data-id=\"" + escape(pupil.id) + "\">Boy</button>" +
        "<button type=\"button\" data-card=\"" + escape(pupil.id) + "\">View</button>" +
        "<button type=\"button\" class=\"room-ghost\" data-remove=\"" + escape(pupil.id) + "\">Remove</button></li>";
    }).join("");
    return "<section class=\"room-panel\"><h2>Pupils</h2><ul class=\"room-list\">" + (rows || "<li>No pupils yet.</li>") + "</ul>" +
      "<h2>Add a pupil</h2><label>First name <input id=\"newPupil\" maxlength=\"24\" /></label>" +
      "<p>Girl or boy</p><div class=\"look-chips\"><button type=\"button\" class=\"look-chip\" id=\"pickGirl\">Girl</button><button type=\"button\" class=\"look-chip\" id=\"pickBoy\">Boy</button></div>" +
      "<p><button type=\"button\" class=\"room-ghost\" id=\"randomLook\">Randomise character</button> <button type=\"button\" class=\"room-go\" id=\"savePupil\">Add pupil</button></p>" +
      "<p>A name like Sofia starts as a girl. A name like Jack starts as a boy. Switch it if you need to.</p></section>";
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
    return "<section class=\"room-panel\"><h2>Class settings</h2><label>Class name <input id=\"renameClass\" maxlength=\"40\" value=\"" + escape(room.name) + "\" /></label>" +
      "<p><button type=\"button\" class=\"room-go\" id=\"saveName\">Save name</button></p>" +
      "<p>The class name sets the age of the pictures. Y3 and Year 3 look about 6 to 7. Year 1 looks younger. Year 6 looks older. Hair and seats stay the same.</p></section>";
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
        var id = button.getAttribute("data-remove");
        var pupil = room.pupils.filter(function (item) { return item.id === id; })[0];
        if (!pupil) return;
        if (!global.confirm("Remove " + pupil.firstName + " from this class?")) return;
        room.pupils = room.pupils.filter(function (item) { return item.id !== id; });
        if (selectedId === id) { selectedId = ""; turnName = ""; }
        if (cardId === id) cardId = "";
        if (chosen[id]) delete chosen[id];
        forgetPupil(room, id);
        saveBook(book);
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
      if (!name) return;
      room.name = name;
      saveBook(book);
      paint();
    });
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
