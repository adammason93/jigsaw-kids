/* One teacher creator. Drafts stay local until Save or Start. */
(function () {
  "use strict";

  var Core = window.WondiiCreatorCore;
  var Mechanics = window.WondiiMechanicCore;
  var Learn = window.WondiiLearn;
  var root = document.getElementById("learnMain");
  if (!Core || !root) return;

  var DRAFT_KEY = "wondii-creator-draft-v2";
  var params = new URLSearchParams(location.search);
  var draft = Core.blankDraft();
  var step = "home";
  var sourcePanel = "";
  var manage = false;
  var editing = -1;
  var adding = false;
  var buildAt = -1;
  var notice = "";
  var dirty = false;

  function escape(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function org() {
    var current = window.WondiiOrg && WondiiOrg.get && WondiiOrg.get();
    return current || {};
  }

  function classes() {
    try {
      var book = JSON.parse(localStorage.getItem("wondii-school-classes") || "null");
      return book && Array.isArray(book.classes) ? book.classes : [];
    } catch (e) {
      return [];
    }
  }

  function roomById(id) {
    var list = classes();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function portrait(pupil, room) {
    var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
    var length = pupil.presentation === "boy" ? "short" : "long";
    var year = Core.yearFromClass(room);
    var prefix = year === "Year 1" || year === "Reception" ? "5-" : (year === "Year 2" || year === "Year 3" ? "6-" : (year === "Year 5" || year === "Year 6" ? "10-" : ""));
    return "../../games/images/schools/room/kid-" + prefix + hair + "-" + length + ".webp";
  }

  function library() {
    return Learn && Learn.visibleLibrary ? Learn.visibleLibrary() : [];
  }

  function findAdventure(id) {
    var list = Learn && Learn.allJourneys ? Learn.allJourneys() : library();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function saveLocal() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }

  function loadLocal() {
    try {
      var saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved && saved.id) return saved;
    } catch (e) {}
    return null;
  }

  function clearLocal() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function persistAdventure() {
    if (!Learn || !Learn.upsertLibrary) return null;
    var adventure = Core.toAdventure(draft, org().organisationId || null);
    Learn.upsertLibrary(adventure);
    draft.saved = true;
    saveLocal();
    return adventure;
  }

  function mark() {
    dirty = true;
    draft.saved = false;
    saveLocal();
    paint();
  }

  function go(next) {
    step = next;
    manage = false;
    editing = -1;
    adding = false;
    saveLocal();
    paint();
  }

  var STEPS = [
    ["source", "Lesson"],
    ["class", "Class"],
    ["play", "Play"],
    ["activities", "Activities"],
    ["review", "Review"]
  ];

  function progress() {
    var at = -1;
    STEPS.forEach(function (item, index) { if (item[0] === step) at = index; });
    if (at < 0) return "";
    return "<ol class=\"creator-progress\">" + STEPS.map(function (item, index) {
      var cls = index < at ? "is-done" : index === at ? "is-now" : "";
      var inner = index < at ? "<button type=\"button\" data-go=\"" + item[0] + "\">" + item[1] + "</button>" : "<span>" + item[1] + "</span>";
      return "<li class=\"" + cls + "\">" + inner + "</li>";
    }).join("") + "</ol>";
  }

  function actions(buttons) {
    return "<div class=\"creator-actions\">" + buttons.join("") + "</div>";
  }

  function home() {
    var saved = loadLocal();
    var recover = saved && (saved.source && saved.source.text || (saved.activities || []).length)
      ? "<section class=\"creator-card\"><h2>Continue your draft</h2><p>" + escape(saved.title || "An unfinished adventure") + "</p>" +
        actions(["<button type=\"button\" class=\"creator-go\" id=\"keepDraft\">Continue your draft</button>", "<button type=\"button\" class=\"creator-quiet\" id=\"dropDraft\">Start again</button>"]) + "</section>"
      : "";
    return recover + "<p class=\"w-kicker\">Create a learning adventure</p><h1>What are you teaching?</h1>" +
      "<div class=\"creator-paths\">" +
      "<button type=\"button\" class=\"creator-path\" data-source=\"upload\"><strong>Upload lesson material</strong><span>A worksheet, plan, or notes file.</span></button>" +
      "<button type=\"button\" class=\"creator-path\" data-source=\"paste\"><strong>Paste lesson material</strong><span>Paste your worksheet or notes.</span></button>" +
      "<button type=\"button\" class=\"creator-path\" data-source=\"describe\"><strong>Describe the lesson</strong><span>Say what you are teaching in a sentence or two.</span></button>" +
      "</div>" +
      "<p><button type=\"button\" class=\"creator-text\" data-source=\"manual\">Start from scratch</button></p>";
  }

  function source() {
    var text = draft.source.text || "";
    var body = "";
    if (sourcePanel === "upload") {
      body = "<div class=\"creator-drop\"><p><strong>Upload lesson material</strong></p><p class=\"creator-note\">Wondii can read a plain text file. PDF, Word, and photos can be stored, but the words are not read yet.</p>" +
        "<input id=\"lessonFile\" type=\"file\" accept=\".txt,text/plain,.pdf,.docx,.png,.jpg,.jpeg,.webp\" />" +
        (draft.source.unsupported ? "<p class=\"creator-warn\">" + escape(draft.source.filename || "That file") + " is not read as text. Paste the lesson instead.</p>" : "") +
        "</div>";
    } else if (sourcePanel === "paste") {
      body = "<label class=\"creator-field\">Paste your worksheet, lesson notes or learning material here.<textarea id=\"lessonText\">" + escape(text) + "</textarea></label>";
    } else if (sourcePanel === "describe") {
      body = "<label class=\"creator-field\">Describe the lesson<textarea id=\"lessonText\" placeholder=\"Year 4 science lesson about electrical circuits. We have already covered conductors and insulators and I want a fun recap.\">" + escape(text) + "</textarea></label>";
    } else {
      body = "<label class=\"creator-field\">Subject<input id=\"subject\" value=\"" + escape(draft.subject) + "\" /></label>" +
        "<label class=\"creator-field\">Year<select id=\"year\">" + ["", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map(function (year) {
          return "<option" + (draft.year === year ? " selected" : "") + ">" + escape(year || "Choose a year") + "</option>";
        }).join("") + "</select></label>" +
        "<label class=\"creator-field\">Topic<input id=\"topic\" value=\"" + escape(draft.topic) + "\" /></label>" +
        "<label class=\"creator-field\">Learning goal<textarea id=\"goal\">" + escape((draft.goals || [])[0] || "") + "</textarea></label>";
    }
    return progress() + "<h1>What are we learning?</h1>" + body +
      (draft.notice ? "<p class=\"creator-note\">" + escape(draft.notice) + "</p>" : "") +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"home\">Back</button>", "<button type=\"button\" class=\"creator-go\" id=\"sourceNext\">Continue</button>"]);
  }

  function classStep() {
    var room = roomById(draft.classId);
    var known = room
      ? "<section class=\"creator-card creator-known\"><div><p class=\"creator-note\">For</p><h2>" + escape(room.name) + "</h2><p>" + (room.pupils || []).length + " pupils</p>" +
        (draft.classYear ? "<p class=\"creator-note\">Class year " + escape(draft.classYear) + "</p>" : "") + "</div>" +
        "<button type=\"button\" class=\"creator-quiet\" id=\"changeClass\">Change</button></section>"
      : "<div class=\"creator-classes\">" + classes().map(function (item) {
        return "<button type=\"button\" class=\"creator-class\" data-class=\"" + escape(item.id) + "\"><strong>" + escape(item.name) + "</strong><span>" + (item.pupils || []).length + " pupils</span></button>";
      }).join("") + "<button type=\"button\" class=\"creator-class\" data-class=\"\"><strong>No class yet</strong><span>Continue without a class, or create one.</span></button></div>" +
        (classes().length ? "" : "<p><a class=\"creator-go\" href=\"../../portal.html#classes\">Create a class</a></p>");
    var level = "<label class=\"creator-field\">Learning level<select id=\"level\">" + ["", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map(function (year) {
      return "<option" + (draft.year === year ? " selected" : "") + ">" + escape(year || "Not set") + "</option>";
    }).join("") + "</select></label><p class=\"creator-note\">This is the lesson level. It does not change the class year.</p>";
    var here = room ? Core.takingPart(draft, room).length : 0;
    var total = room ? (room.pupils || []).length : 0;
    var people = room ? "<p><strong>" + here + " of " + total + " pupils taking part</strong> <button type=\"button\" class=\"creator-text\" id=\"manage\">Manage</button></p>" + manager(room) : "";
    return progress() + "<h1>Who is it for?</h1>" + known + level + people +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"source\">Back</button>", "<button type=\"button\" class=\"creator-go\" data-go=\"play\">Continue</button>"]);
  }

  function manager(room) {
    if (!manage || !room) return "";
    var away = {};
    (draft.away || []).forEach(function (id) { away[id] = 1; });
    var cards = (room.pupils || []).map(function (pupil) {
      return "<button type=\"button\" class=\"creator-pupil" + (away[pupil.id] ? " is-away" : "") + "\" data-away=\"" + escape(pupil.id) + "\">" +
        "<img src=\"" + escape(portrait(pupil, room)) + "\" alt=\"\" /><span>" + escape(pupil.firstName) + "</span><small>" + (away[pupil.id] ? "Away" : "Here") + "</small></button>";
    }).join("");
    return "<section class=\"creator-card\"><h2>Who's away today?</h2><p class=\"creator-note\">This does not remove anyone from the class.</p><div class=\"creator-pupils\">" + cards + "</div>" +
      actions(["<button type=\"button\" class=\"creator-quiet\" id=\"allHere\">Select all</button>", "<button type=\"button\" class=\"creator-quiet\" id=\"allAway\">Clear all</button>"]) + "</section>";
  }

  function playStep() {
    var modes = Core.PLAY.map(function (mode) {
      return "<button type=\"button\" class=\"creator-mode" + (draft.playMode === mode.id ? " is-now" : "") + "\" data-mode=\"" + mode.id + "\"><strong>" + escape(mode.title) + "</strong><span>" + escape(mode.text) + "</span></button>";
    }).join("");
    var teams = "";
    var mode = Core.playMode(draft.playMode);
    if (mode.engine !== "none") {
      var room = roomById(draft.classId);
      var people = Core.takingPart(draft, room);
      teams = "<section class=\"creator-card\"><h2>Teams</h2>" +
        (draft.playMode === "custom" ? "" : "<button type=\"button\" class=\"creator-quiet\" id=\"autoSplit\">Let Wondii split the class</button> ") +
        "<button type=\"button\" class=\"creator-quiet\" id=\"ownTeams\">Choose teams myself</button>" +
        teamBoard(people, room) + "</section>";
    }
    return progress() + "<h1>How should the class play?</h1><div class=\"creator-modes\">" + modes + "</div>" + teams +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"class\">Back</button>", "<button type=\"button\" class=\"creator-go\" id=\"build\">Build my adventure</button>"]);
  }

  function teamBoard(people, room) {
    if (draft.playMode !== "custom" && draft.teamStyle !== "custom") {
      return "<ul>" + (draft.teams || []).map(function (team) {
        return "<li><strong>" + escape(team.name) + "</strong> · " + (team.pupilIds || []).length + "</li>";
      }).join("") + "</ul>";
    }
    var split = Core.presentationSplit(people);
    var helper = split.available ? "<button type=\"button\" class=\"creator-quiet\" id=\"byPresentation\">Group by saved presentation</button><p class=\"creator-note\">Uses only Girl or Boy saved on the class. You can move anyone.</p>" : "";
    var cards = people.map(function (pupil) {
      var teamName = "Unassigned";
      (draft.teams || []).forEach(function (team) {
        if ((team.pupilIds || []).indexOf(pupil.id) !== -1) teamName = team.name;
      });
      var picks = (draft.teams || []).map(function (team) {
        return "<button type=\"button\" data-assign=\"" + escape(pupil.id) + "\" data-team=\"" + escape(team.id) + "\">" + escape(team.name) + "</button>";
      }).join("");
      return "<div class=\"creator-pupil\"><img src=\"" + escape(portrait(pupil, room)) + "\" alt=\"\" /><span>" + escape(pupil.firstName) + "</span><small>" + escape(teamName) + "</small><span class=\"creator-picks\">" + picks + "</span></div>";
    }).join("");
    return helper + "<div class=\"creator-pupils\">" + cards + "</div>";
  }

  function activities() {
    if (buildAt >= 0) {
      var labels = ["Reading lesson material", "Finding key vocabulary", "Creating activities", "Final checks"];
      return "<h1>Building your adventure</h1><ul class=\"creator-steps\">" + labels.map(function (label, index) {
        var mark = index < buildAt ? "✓" : index === buildAt ? "●" : "○";
        return "<li>" + mark + " " + label + "</li>";
      }).join("") + "</ul>";
    }
    var stale = draft.stale ? "<p class=\"creator-warn\">The lesson text changed. <button type=\"button\" class=\"creator-text\" id=\"rebuild\">Rebuild activities</button></p>" : "";
    var cards = (draft.activities || []).map(function (activity, index) {
      var issue = Core.activityIssue(activity, Mechanics);
      var preview = activity.mechanic === "quiz" ? (activity.config.prompt || "Question not written yet")
        : activity.mechanic === "word_search" ? ((activity.config.words || []).slice(0, 4).join(", ") || "No words yet")
        : activity.mechanic === "spin" ? "Someone from today's class"
        : (activity.config.lines || [])[0] || activity.title;
      return "<article class=\"creator-activity\"><p class=\"creator-note\">" + (index + 1) + "</p><div><header><strong>" + escape(activity.title || activity.mechanic) + "</strong><span>" + (activity.minutes || 0) + " min</span></header>" +
        "<p>" + escape(activity.purpose || "") + "</p><p>" + escape(preview) + "</p>" +
        (issue ? "<p class=\"creator-warn\">" + escape(issue) + "</p>" : "") +
        "<p class=\"creator-note\">" + escape(activity.why || "") + "</p></div>" +
        actions([
          "<button type=\"button\" class=\"creator-quiet\" data-edit=\"" + index + "\">Edit</button>",
          "<button type=\"button\" class=\"creator-quiet\" data-dup=\"" + index + "\">Duplicate</button>",
          "<button type=\"button\" class=\"creator-quiet\" data-up=\"" + index + "\">Move up</button>",
          "<button type=\"button\" class=\"creator-quiet\" data-down=\"" + index + "\">Move down</button>",
          "<button type=\"button\" class=\"creator-quiet\" data-remove=\"" + index + "\">Remove</button>"
        ]) + (editing === index ? editForm(activity, index) : "") + "</article>";
    }).join("");
    var picker = adding ? "<div class=\"creator-paths\">" + Core.capabilities(Mechanics).map(function (item) {
      return "<button type=\"button\" class=\"creator-path\" data-add=\"" + item.id + "\"><strong>" + escape(item.name) + "</strong><span>" + escape(item.description) + "</span></button>";
    }).join("") + "</div>" : "<button type=\"button\" class=\"creator-text\" id=\"addActivity\">+ Add activity</button>";
    return progress() + "<h1>Your adventure</h1><p>About " + (draft.minutes || 0) + " minutes</p>" + stale + "<div class=\"creator-plan\">" + cards + "</div>" + picker +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"play\">Back</button>", "<button type=\"button\" class=\"creator-go\" data-go=\"review\">Review</button>"]);
  }

  function editForm(activity, index) {
    if (!activity) return "";
    var config = activity.config || {};
    var fields = "<label class=\"creator-field\">Title<input id=\"editTitle\" value=\"" + escape(activity.title || "") + "\" /></label>";
    if (activity.mechanic === "quiz") {
      var boolean = config.kind === "boolean";
      fields += "<label class=\"creator-field\">Question<input id=\"editPrompt\" value=\"" + escape(config.prompt || "") + "\" /></label>" +
        "<label class=\"creator-field\">Type<select id=\"editKind\"><option value=\"multiple\"" + (boolean ? "" : " selected") + ">Multiple choice</option><option value=\"boolean\"" + (boolean ? " selected" : "") + ">True or false</option></select></label>";
      if (!boolean) {
        fields += (config.choices || ["", ""]).map(function (choice, choiceIndex) {
          return "<label class=\"creator-field\">Answer " + (choiceIndex + 1) + "<input data-choice=\"" + choiceIndex + "\" value=\"" + escape(choice) + "\" /></label>";
        }).join("") + "<button type=\"button\" class=\"creator-text\" id=\"addChoice\">Add answer</button>";
        fields += "<label class=\"creator-field\">Correct answer<select id=\"editCorrect\">" + (config.choices || []).map(function (choice) {
          return "<option" + (choice === config.correct ? " selected" : "") + ">" + escape(choice) + "</option>";
        }).join("") + "</select></label>";
      } else {
        fields += "<label class=\"creator-field\">Correct answer<select id=\"editCorrect\"><option value=\"true\"" + (config.correct === "true" ? " selected" : "") + ">True</option><option value=\"false\"" + (config.correct === "false" ? " selected" : "") + ">False</option></select></label>";
      }
      fields += "<label class=\"creator-field\">Points<input id=\"editPoints\" type=\"number\" min=\"0\" max=\"5\" value=\"" + escape(config.points == null ? 1 : config.points) + "\" /></label>" +
        "<label><input id=\"editAsk\" type=\"checkbox\"" + (config.askSelected ? " checked" : "") + " /> Ask the selected pupil when someone has been chosen</label>";
    } else if (activity.mechanic === "spin") {
      fields += "<label><input id=\"editRepeat\" type=\"checkbox\"" + (config.avoidRepeat !== false ? " checked" : "") + " /> Avoid choosing the same pupil twice in a row</label>" +
        "<label><input id=\"editFresh\" type=\"checkbox\"" + (config.preferFresh !== false ? " checked" : "") + " /> Prefer pupils who have not had a turn</label>";
    } else if (activity.mechanic === "word_search") {
      fields += "<label class=\"creator-field\">Instruction<input id=\"editInstruction\" value=\"" + escape(config.instruction || "") + "\" /></label>" +
        "<label class=\"creator-field\">Words, one on each line<textarea id=\"editWords\">" + escape((config.words || []).join("\n")) + "</textarea></label>" +
        "<label class=\"creator-field\">Points per word<input id=\"editPoints\" type=\"number\" min=\"0\" max=\"5\" value=\"" + escape(config.points == null ? 1 : config.points) + "\" /></label>";
    } else {
      fields += "<label class=\"creator-field\">What the class sees<textarea id=\"editLines\">" + escape((config.lines || []).join("\n")) + "</textarea></label>";
    }
    return "<section class=\"creator-card\"><h2>Edit</h2>" + fields + actions(["<button type=\"button\" class=\"creator-go\" id=\"saveEdit\" data-index=\"" + index + "\">Save activity</button>", "<button type=\"button\" class=\"creator-quiet\" id=\"closeEdit\">Close</button>"]) + "</section>";
  }

  function review() {
    var room = roomById(draft.classId);
    var problems = Core.issues(draft, Mechanics);
    var line = (draft.activities || []).map(function (activity, index) {
      var preview = activity.mechanic === "quiz" ? activity.config.prompt : activity.mechanic === "word_search" ? (activity.config.words || []).join(", ") : activity.title;
      return "<li><strong>" + (index + 1) + ". " + escape(activity.title) + "</strong> · " + escape(activity.purpose || activity.mechanic) + "<br />" + escape(preview || "") + "</li>";
    }).join("");
    return progress() + "<h1>" + escape(draft.title || "Review") + "</h1>" +
      "<p>" + escape(draft.subject || "Subject not set") + " · " + escape(draft.year || "Learning level not set") + "</p>" +
      "<p>" + escape(room ? room.name : "No class") + " · " + escape(Core.playMode(draft.playMode).title) + "</p>" +
      "<p>" + (room ? Core.takingPart(draft, room).length + " of " + room.pupils.length + " pupils" : "No class pupils") + "</p>" +
      "<p>About " + (draft.minutes || 0) + " minutes</p>" +
      ((draft.goals || []).length ? "<p>Goal: " + escape(draft.goals[0]) + "</p>" : "") +
      (draft.notes ? "<p>" + escape(draft.notes) + "</p>" : "") +
      "<ol class=\"creator-plan\">" + line + "</ol>" +
      (problems.length ? "<p class=\"creator-warn\">" + escape(problems[0]) + "</p>" : "") +
      "<label class=\"creator-field\">Teacher notes<textarea id=\"notes\">" + escape(draft.notes || "") + "</textarea></label>" +
      actions([
        "<button type=\"button\" class=\"creator-go\" id=\"startNow\">Start now</button>",
        "<button type=\"button\" class=\"creator-quiet\" id=\"saveLibrary\">Save to library</button>",
        "<button type=\"button\" class=\"creator-quiet\" data-go=\"activities\">Edit</button>"
      ]);
  }

  function ready() {
    var room = roomById(draft.classId);
    var here = room ? Core.takingPart(draft, room) : [];
    var awayCount = room ? room.pupils.length - here.length : 0;
    var faces = here.slice(0, 8).map(function (pupil) {
      return "<span class=\"creator-pupil\"><img src=\"" + escape(portrait(pupil, room)) + "\" alt=\"\" /><span>" + escape(pupil.firstName) + "</span></span>";
    }).join("");
    var modes = Core.PLAY.map(function (mode) {
      return "<button type=\"button\" class=\"creator-mode" + (draft.playMode === mode.id ? " is-now" : "") + "\" data-mode=\"" + mode.id + "\"><strong>" + escape(mode.title) + "</strong></button>";
    }).join("");
    return "<p class=\"w-kicker\">Ready to start</p><h1>" + escape(room ? room.name + " is ready" : draft.title || "Ready") + "</h1>" +
      "<div class=\"creator-pupils\">" + faces + "</div><p><strong>" + here.length + " pupils here</strong></p>" +
      "<p>" + (awayCount ? awayCount + " pupils away" : "Everyone is here") + " <button type=\"button\" class=\"creator-text\" id=\"manage\">Who's away today?</button></p>" +
      manager(room) +
      "<h2>How are we playing?</h2><div class=\"creator-modes\">" + modes + "</div>" +
      "<label class=\"creator-field\">Add a visiting pupil<input id=\"guest\" maxlength=\"24\" /></label><button type=\"button\" class=\"creator-quiet\" id=\"addGuest\">Add temporary name</button>" +
      "<p class=\"creator-note\">" + (draft.guests || []).map(function (guest) { return escape(guest.name); }).join(", ") + "</p>" +
      actions(["<button type=\"button\" class=\"creator-go\" id=\"begin\">Start adventure</button>", "<button type=\"button\" class=\"creator-quiet\" data-go=\"review\">Back</button>"]);
  }

  function libraryView() {
    var cards = library().map(function (item) {
      var map = item.learningMap || {};
      var count = (item.plan && item.plan.activities && item.plan.activities.length) || (item.plan && item.plan.slides && item.plan.slides.length) || 0;
      return "<article class=\"creator-card\"><h2>" + escape(item.title || (item.plan && item.plan.title) || "Adventure") + "</h2>" +
        "<p>" + escape(map.subject || "") + " " + escape(map.yearGroup || "") + " · " + count + " activities · " + escape(item.estimateMinutes ? item.estimateMinutes + " min" : "") + "</p>" +
        (item.className ? "<p class=\"creator-note\">" + escape(item.className) + "</p>" : "") +
        actions([
          "<a class=\"creator-go\" href=\"create.html?start=" + encodeURIComponent(item.id) + (item.classId ? "&class=" + encodeURIComponent(item.classId) : "") + "\">Start</a>",
          "<a class=\"creator-quiet\" href=\"present.html?journey=" + encodeURIComponent(item.id) + "&preview=1\">Preview</a>",
          "<a class=\"creator-quiet\" href=\"create.html?adapt=" + encodeURIComponent(item.id) + "\">Adapt</a>",
          "<button type=\"button\" class=\"creator-quiet\" data-copy=\"" + escape(item.id) + "\">Duplicate</button>"
        ]) + "</article>";
    }).join("");
    return "<h1>Your adventures</h1>" + (cards || "<p>No saved adventures for this school yet.</p>") +
      "<p><a class=\"creator-go\" href=\"create.html\">Create a learning adventure</a></p>";
  }

  function familyGate() {
    return "<h1>School adventures</h1><p>This builder is for a school account. Family stories stay in the family area.</p><p><a class=\"creator-go\" href=\"../../portal.html\">Back to Wondii</a></p>";
  }

  function paint() {
    var school = org().organisationId;
    var html = !school ? familyGate()
      : step === "library" ? libraryView()
      : step === "source" ? source()
      : step === "class" ? classStep()
      : step === "play" ? playStep()
      : step === "activities" ? activities()
      : step === "review" ? review()
      : step === "ready" ? ready()
      : home();
    if (notice) html = "<p class=\"creator-note\" role=\"status\">" + escape(notice) + "</p>" + html;
    root.innerHTML = "<div class=\"creator\">" + html + "</div>";
    bind();
  }

  function readSourceFields() {
    var text = document.getElementById("lessonText");
    if (text) {
      draft.source.text = text.value;
      draft.source.type = sourcePanel || "paste";
      draft.sourceKind = draft.source.type;
    }
    var subject = document.getElementById("subject");
    if (subject) draft.subject = subject.value.trim();
    var topic = document.getElementById("topic");
    if (topic) draft.topic = topic.value.trim();
    var goal = document.getElementById("goal");
    if (goal) draft.goals = goal.value.trim() ? [goal.value.trim()] : [];
    var year = document.getElementById("year");
    if (year && year.value && year.value.indexOf("Year") === 0) Core.setLearningYear(draft, year.value);
  }

  function saveEditor() {
    var activity = draft.activities[editing];
    if (!activity) return;
    var title = document.getElementById("editTitle");
    if (title) activity.title = title.value.trim() || activity.title;
    if (activity.mechanic === "quiz") {
      var kind = document.getElementById("editKind");
      activity.config.kind = kind && kind.value === "boolean" ? "boolean" : "multiple";
      activity.config.prompt = (document.getElementById("editPrompt") || {}).value || "";
      if (activity.config.kind === "multiple") {
        activity.config.choices = [];
        root.querySelectorAll("[data-choice]").forEach(function (input) { activity.config.choices.push(input.value.trim()); });
      } else activity.config.choices = ["True", "False"];
      var correct = document.getElementById("editCorrect");
      activity.config.correct = correct ? correct.value : "";
      activity.config.points = Number((document.getElementById("editPoints") || {}).value || 1);
      activity.config.askSelected = !!(document.getElementById("editAsk") || {}).checked;
    } else if (activity.mechanic === "spin") {
      activity.config.avoidRepeat = !!(document.getElementById("editRepeat") || {}).checked;
      activity.config.preferFresh = !!(document.getElementById("editFresh") || {}).checked;
    } else if (activity.mechanic === "word_search") {
      activity.config.instruction = (document.getElementById("editInstruction") || {}).value || "";
      activity.config.words = String((document.getElementById("editWords") || {}).value || "").split(/\n/).map(function (word) { return word.trim(); }).filter(Boolean);
      activity.config.points = Number((document.getElementById("editPoints") || {}).value || 1);
      activity.config.title = activity.title;
    } else {
      activity.config.lines = String((document.getElementById("editLines") || {}).value || "").split(/\n/).filter(Boolean);
    }
    editing = -1;
  }

  function beginBuild() {
    readSourceFields();
    buildAt = 0;
    paint();
    var jobs = [
      function () {
        var analysis = Core.analyseSource(draft.source.text || ((draft.goals || [])[0] || draft.topic || ""));
        if (analysis.ok) Core.applyAnalysis(draft, analysis);
      },
      function () { draft.vocabulary = draft.vocabulary || []; },
      function () { Core.recommend(draft); draft.stale = false; },
      function () { notice = Core.issues(draft, Mechanics)[0] || ""; }
    ];
    function tick() {
      if (buildAt >= jobs.length) {
        buildAt = -1;
        go("activities");
        return;
      }
      jobs[buildAt]();
      buildAt += 1;
      paint();
      setTimeout(tick, 30);
    }
    setTimeout(tick, 30);
  }

  function bind() {
    root.querySelectorAll("[data-go]").forEach(function (button) {
      button.addEventListener("click", function () { go(button.getAttribute("data-go")); });
    });
    root.querySelectorAll("[data-source]").forEach(function (button) {
      button.addEventListener("click", function () {
        sourcePanel = button.getAttribute("data-source");
        draft.sourceKind = sourcePanel;
        go("source");
      });
    });
    var keep = document.getElementById("keepDraft");
    if (keep) keep.addEventListener("click", function () {
      draft = loadLocal() || draft;
      step = (draft.activities || []).length ? "activities" : "source";
      sourcePanel = draft.sourceKind || "describe";
      paint();
    });
    var drop = document.getElementById("dropDraft");
    if (drop) drop.addEventListener("click", function () {
      clearLocal();
      draft = Core.blankDraft();
      applyEntryClass();
      paint();
    });
    var file = document.getElementById("lessonFile");
    if (file) file.addEventListener("change", function () {
      if (!Learn || !Learn.readFile) return;
      Learn.readFile(file.files[0]).then(function (result) {
        draft.source.filename = result.filename || "";
        draft.source.unsupported = !!result.needsPaste;
        draft.source.text = result.text || "";
        draft.source.type = result.type || "";
        if (draft.activities.length) draft.stale = true;
        mark();
      }).catch(function (error) {
        notice = error.message || "That file could not be used.";
        paint();
      });
    });
    var next = document.getElementById("sourceNext");
    if (next) next.addEventListener("click", function () {
      readSourceFields();
      if (sourcePanel !== "manual") {
        var before = (draft.activities || []).length;
        var analysis = Core.analyseSource(draft.source.text);
        if (!analysis.ok && sourcePanel !== "upload") {
          notice = analysis.message;
          paint();
          return;
        }
        if (analysis.ok) Core.applyAnalysis(draft, analysis);
        if (before) draft.stale = true;
      }
      go("class");
    });
    root.querySelectorAll("[data-class]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-class");
        Core.setClass(draft, id ? roomById(id) : null);
        mark();
      });
    });
    var change = document.getElementById("changeClass");
    if (change) change.addEventListener("click", function () {
      draft.classId = "";
      paint();
    });
    var level = document.getElementById("level");
    if (level) level.addEventListener("change", function () {
      if (level.value.indexOf("Year") === 0) Core.setLearningYear(draft, level.value);
      mark();
    });
    var manageBtn = document.getElementById("manage");
    if (manageBtn) manageBtn.addEventListener("click", function () { manage = !manage; paint(); });
    root.querySelectorAll("[data-away]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-away");
        Core.excludePupil(draft, id, (draft.away || []).indexOf(id) === -1);
        mark();
      });
    });
    var allHere = document.getElementById("allHere");
    if (allHere) allHere.addEventListener("click", function () { draft.away = []; mark(); });
    var allAway = document.getElementById("allAway");
    if (allAway) allAway.addEventListener("click", function () {
      var room = roomById(draft.classId);
      draft.away = room ? room.pupils.map(function (pupil) { return pupil.id; }) : [];
      mark();
    });
    root.querySelectorAll("[data-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        draft.playMode = button.getAttribute("data-mode");
        draft.teamStyle = draft.playMode === "custom" ? draft.teamStyle : "auto";
        Core.ensureTeams(draft, Core.takingPart(draft, roomById(draft.classId)));
        mark();
      });
    });
    var auto = document.getElementById("autoSplit");
    if (auto) auto.addEventListener("click", function () {
      draft.teamStyle = "auto";
      if (draft.playMode === "custom") draft.playMode = "two";
      Core.ensureTeams(draft, Core.takingPart(draft, roomById(draft.classId)));
      mark();
    });
    var own = document.getElementById("ownTeams");
    if (own) own.addEventListener("click", function () {
      draft.playMode = "custom";
      draft.teamStyle = "auto";
      Core.ensureTeams(draft, Core.takingPart(draft, roomById(draft.classId)));
      draft.teamStyle = "custom";
      mark();
    });
    var byLook = document.getElementById("byPresentation");
    if (byLook) byLook.addEventListener("click", function () {
      var people = Core.takingPart(draft, roomById(draft.classId));
      var split = Core.presentationSplit(people);
      draft.playMode = "custom";
      draft.teamStyle = "custom";
      draft.teams = [
        { id: "team_girls", name: "Girl", pupilIds: split.girls.slice() },
        { id: "team_boys", name: "Boy", pupilIds: split.boys.slice() }
      ];
      mark();
    });
    root.querySelectorAll("[data-assign]").forEach(function (button) {
      button.addEventListener("click", function () {
        Core.assignPupil(draft, button.getAttribute("data-assign"), button.getAttribute("data-team"));
        mark();
      });
    });
    var build = document.getElementById("build");
    if (build) build.addEventListener("click", beginBuild);
    var rebuild = document.getElementById("rebuild");
    if (rebuild) rebuild.addEventListener("click", beginBuild);
    root.querySelectorAll("[data-edit]").forEach(function (button) {
      button.addEventListener("click", function () { editing = Number(button.getAttribute("data-edit")); paint(); });
    });
    root.querySelectorAll("[data-dup]").forEach(function (button) {
      button.addEventListener("click", function () { Core.duplicateActivity(draft, Number(button.getAttribute("data-dup"))); mark(); });
    });
    root.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", function () { Core.removeActivity(draft, Number(button.getAttribute("data-remove"))); mark(); });
    });
    root.querySelectorAll("[data-up]").forEach(function (button) {
      button.addEventListener("click", function () { Core.moveActivity(draft, Number(button.getAttribute("data-up")), -1); mark(); });
    });
    root.querySelectorAll("[data-down]").forEach(function (button) {
      button.addEventListener("click", function () { Core.moveActivity(draft, Number(button.getAttribute("data-down")), 1); mark(); });
    });
    var add = document.getElementById("addActivity");
    if (add) add.addEventListener("click", function () { adding = true; paint(); });
    root.querySelectorAll("[data-add]").forEach(function (button) {
      button.addEventListener("click", function () {
        Core.addActivity(draft, button.getAttribute("data-add"), Mechanics);
        adding = false;
        mark();
      });
    });
    var saveEdit = document.getElementById("saveEdit");
    if (saveEdit) saveEdit.addEventListener("click", function () { saveEditor(); mark(); });
    var closeEdit = document.getElementById("closeEdit");
    if (closeEdit) closeEdit.addEventListener("click", function () { editing = -1; paint(); });
    var addChoice = document.getElementById("addChoice");
    if (addChoice) addChoice.addEventListener("click", function () {
      var activity = draft.activities[editing];
      activity.config.choices = (activity.config.choices || []).concat([""]);
      if (activity.config.choices.length > 6) activity.config.choices = activity.config.choices.slice(0, 6);
      paint();
    });
    var notes = document.getElementById("notes");
    if (notes) notes.addEventListener("change", function () { draft.notes = notes.value; saveLocal(); });
    var save = document.getElementById("saveLibrary");
    if (save) save.addEventListener("click", function () {
      var notesBox = document.getElementById("notes");
      if (notesBox) draft.notes = notesBox.value;
      var problems = Core.issues(draft, Mechanics);
      if (problems.length) { notice = problems[0]; paint(); return; }
      persistAdventure();
      notice = "Saved to your school library.";
      step = "library";
      paint();
    });
    var start = document.getElementById("startNow");
    if (start) start.addEventListener("click", function () {
      var problems = Core.issues(draft, Mechanics);
      if (problems.length) { notice = problems[0]; paint(); return; }
      persistAdventure();
      go("ready");
    });
    var guest = document.getElementById("addGuest");
    if (guest) guest.addEventListener("click", function () {
      Core.addGuest(draft, (document.getElementById("guest") || {}).value || "");
      mark();
    });
    var begin = document.getElementById("begin");
    if (begin) begin.addEventListener("click", function () {
      var problems = Core.issues(draft, Mechanics);
      if (problems.length) { notice = problems[0]; paint(); return; }
      var adventure = persistAdventure();
      if (!window.ClassRooms || !adventure) { notice = "The lesson could not be started."; paint(); return; }
      var plan = Core.sessionPlan(draft, roomById(draft.classId));
      var created = ClassRooms.createSession(adventure, "board", false, plan);
      if (!created) { notice = "The lesson could not be started."; paint(); return; }
      clearLocal();
      location.href = "present.html?session=" + created.code + "&fresh=1";
    });
    root.querySelectorAll("[data-copy]").forEach(function (button) {
      button.addEventListener("click", function () {
        var item = findAdventure(button.getAttribute("data-copy"));
        if (!item || !Learn.duplicate) return;
        Learn.duplicate(item.id);
        paint();
      });
    });
  }

  function applyEntryClass() {
    var classId = params.get("class") || "";
    if (classId) Core.setClass(draft, roomById(classId));
  }


  function boot() {
    if (params.get("library") === "1") step = "library";
    else if (params.get("adapt")) {
      var original = findAdventure(params.get("adapt"));
      if (original) {
        draft = Core.fromAdventure(original);
        applyEntryClass();
        if (!params.get("class") && original.classId) Core.setClass(draft, roomById(original.classId));
        step = "activities";
      }
    } else if (params.get("start")) {
      var existing = findAdventure(params.get("start"));
      if (existing) {
        draft = Core.fromAdventure(existing);
        draft.id = existing.id;
        draft.adaptedFrom = "";
        draft.saved = true;
        if (params.get("class")) Core.setClass(draft, roomById(params.get("class")));
        else if (existing.classId) Core.setClass(draft, roomById(existing.classId));
        step = "ready";
      }
    } else if (params.get("example") === "lights" || params.get("template")) {
      draft.source.text = Learn && Learn.SAMPLE ? Learn.SAMPLE : "Year 4 science. Electricity. Key vocabulary: circuit, battery, switch, current.";
      draft.sourceKind = "describe";
      sourcePanel = "describe";
      Core.applyAnalysis(draft, Core.analyseSource(draft.source.text));
      applyEntryClass();
      step = "class";
    } else applyEntryClass();
    window.addEventListener("beforeunload", function (event) {
      if (!dirty || draft.saved) return;
      event.preventDefault();
      event.returnValue = "";
    });
    paint();
  }

  boot();
})();
