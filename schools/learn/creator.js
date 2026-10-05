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
  var step = "source";
  var sourcePanel = "describe";
  var manage = false;
  var editing = -1;
  var openMore = -1;
  var confirmRemove = -1;
  var adding = false;
  var buildAt = -1;
  var buildLine = "";
  var generationToken = 0;
  var notice = "";
  var dirty = false;
  var returnStep = "";

  function pupilCount(count) {
    var n = Number(count) || 0;
    return n + " pupil" + (n === 1 ? "" : "s");
  }

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

  function classIsCurrent() {
    return !!(draft.classId && roomById(draft.classId));
  }

  function persistAdventure() {
    if (Core.brokenLesson(draft)) return Promise.resolve({ adventure: null, reason: "content" });
    if (!Learn || !Learn.upsertLibrary) return Promise.resolve({ adventure: null, reason: "save" });
    if (!classIsCurrent()) return Promise.resolve({ adventure: null, reason: "class" });
    var previousId = draft.id;
    if (window.WondiiSchoolDomain && !WondiiSchoolDomain.isUuid(draft.id)) draft.id = WondiiSchoolDomain.uuid();
    var adventure = Core.toAdventure(draft, org().organisationId || null);
    adventure.classId = draft.classId;
    saveLocal();
    return Promise.resolve(Learn.upsertLibrary(adventure, previousId)).then(function (ok) {
      if (!ok) return { adventure: null, reason: "save" };
      draft.saved = true;
      dirty = false;
      saveLocal();
      return { adventure: adventure, reason: "" };
    });
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
    openMore = -1;
    confirmRemove = -1;
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
    var room = roomById(draft.classId);
    var known = room
      ? "<p class=\"creator-note\">For " + escape(room.name) + " · " + (room.pupils || []).length + " pupil" + ((room.pupils || []).length === 1 ? "" : "s") + ".</p>"
      : "";
    var saved = loadLocal();
    var recover = saved && saved.id !== draft.id && (saved.source && saved.source.text || (saved.activities || []).length)
      ? "<section class=\"creator-card\"><h2>Continue your draft</h2><p>" + escape(saved.title || "An unfinished adventure") + "</p>" +
        actions(["<button type=\"button\" class=\"creator-go\" id=\"keepDraft\">Continue that draft</button>", "<button type=\"button\" class=\"creator-quiet\" id=\"dropDraft\">Start something new</button>"]) + "</section>"
      : "";
    var fileNote = draft.source.filename ? "<p class=\"creator-note\">Added: " + escape(draft.source.filename) + "</p>" : "";
    var warn = draft.source.unsupported ? "<p class=\"creator-warn\">" + escape(draft.source.filename || "That file") + " is kept with the lesson. Paste the important lines so Wondii can use them.</p>" : "";
    return recover + progress() + "<h1>What are we learning today?</h1>" +
      "<p class=\"creator-note\">Tell Wondii what you would like your class to learn.</p>" +
      known +
      "<label class=\"creator-field\">The lesson<textarea id=\"lessonText\" placeholder=\"20 minute fractions recap using pizzas.\">" + escape(text) + "</textarea></label>" +
      actions(["<button type=\"button\" class=\"creator-go\" id=\"sourceNext\">Continue</button>"]) +
      "<p class=\"creator-note\">or give Wondii something to work from</p>" +
      "<div class=\"creator-drop\"><p><strong>Already have something prepared?</strong></p>" +
      "<p class=\"creator-note\">Drop a worksheet, lesson plan, photo, PDF, or Word file. Plain text is read straight away. PDF, Word, and photos are kept with the adventure. Paste the important lines so Wondii can use them.</p>" +
      "<input id=\"lessonFile\" type=\"file\" accept=\".txt,text/plain,.pdf,.docx,.png,.jpg,.jpeg,.webp\" /></div>" +
      fileNote + warn +
      (draft.notice ? "<p class=\"creator-note\">" + escape(draft.notice) + "</p>" : "");
  }

  function classStep() {
    var room = roomById(draft.classId);
    var known = room
      ? "<section class=\"creator-card creator-known\"><div><p class=\"creator-note\">For</p><h2>" + escape(room.name) + "</h2><p>" + pupilCount((room.pupils || []).length) + "</p>" +
        (draft.classYear ? "<p class=\"creator-note\">Class year " + escape(draft.classYear) + "</p>" : "") + "</div>" +
        "<button type=\"button\" class=\"creator-quiet\" id=\"changeClass\">Change</button></section>"
      : "<div class=\"creator-classes\">" + classes().map(function (item) {
        return "<button type=\"button\" class=\"creator-class\" data-class=\"" + escape(item.id) + "\"><strong>" + escape(item.name) + "</strong><span>" + pupilCount((item.pupils || []).length) + "</span></button>";
      }).join("") + "<button type=\"button\" class=\"creator-class\" data-class=\"\"><strong>No class yet</strong><span>Continue without a class, or create one.</span></button></div>" +
        (classes().length ? "" : "<p><a class=\"creator-go\" href=\"../../portal.html#classes\">Create a class</a></p>");
    var level = "<label class=\"creator-field\">Learning level<select id=\"level\">" + ["", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map(function (year) {
      return "<option" + (draft.year === year ? " selected" : "") + ">" + escape(year || "Not set") + "</option>";
    }).join("") + "</select></label><p class=\"creator-note\">This is the lesson level. It does not change the class year.</p>";
    var here = room ? Core.takingPart(draft, room).length : 0;
    var total = room ? (room.pupils || []).length : 0;
    var people = room ? "<p><strong>" + here + " of " + total + " " + (total === 1 ? "pupil" : "pupils") + " taking part</strong> <button type=\"button\" class=\"creator-text\" id=\"manage\">Manage</button></p>" + manager(room) : "";
    return progress() + "<h1>Who is it for?</h1>" + known + level + people +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"source\">Back</button>", "<button type=\"button\" class=\"creator-go\" data-go=\"" + (draft.quick ? "quick" : "play") + "\">Continue</button>"]);
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
    var back = returnStep === "confirm" ? "confirm" : "class";
    var failed = draft.generationError === "failed"
      ? "<section class=\"creator-card\" role=\"status\"><h2>Wondii couldn't finish this adventure.</h2>" +
        actions([
          "<button type=\"button\" class=\"creator-go\" id=\"build\">Try again</button>",
          "<button type=\"button\" class=\"creator-quiet\" data-go=\"source\">Edit lesson</button>",
          "<button type=\"button\" class=\"creator-quiet\" id=\"buildManual\">Build manually</button>"
        ]) + "</section>"
      : (draft.generationError
        ? "<p class=\"creator-warn\" role=\"status\">We couldn't finish one of the activities. Try again, or edit the lesson.</p><p><button type=\"button\" class=\"creator-quiet\" data-go=\"source\">Edit lesson</button></p>"
        : "");
    var primary = draft.generationError === "failed"
      ? ""
      : (returnStep === "confirm"
        ? "<button type=\"button\" class=\"creator-go\" id=\"saveSetup\">Use this setup</button>"
        : "<button type=\"button\" class=\"creator-go\" id=\"build\">" + (draft.generationError ? "Try again" : "Build my adventure") + "</button>");
    var yearNote = draft.year ? "" : "<p class=\"creator-warn\" role=\"status\">Choose a year group before building. This lesson will not assume Year 3.</p>";
    return progress() + "<h1>How should the class play?</h1>" + yearNote + failed + "<div class=\"creator-modes\">" + modes + "</div>" + teams +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"" + back + "\">Back</button>", primary]);
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

  function experienceLine(activity) {
    if (activity.mechanic === "quiz") {
      var prompt = (activity.config && activity.config.prompt) || "";
      var count = activity.config && activity.config.questions ? activity.config.questions.length : 0;
      return count > 1 ? prompt + " · " + count + " questions" : prompt;
    }
    if (activity.mechanic === "word_search") return (activity.config && activity.config.instruction) || "Find the words from this lesson.";
    if (activity.mechanic === "spin") return (activity.config && activity.config.prompt) || "Wondii chooses a pupil who is here today.";
    if (activity.mechanic === "doors") {
      var door = activity.config || {};
      var labels = (door.choices && door.choices.length ? door.choices : door.lines) || [];
      return [door.prompt].concat(labels).filter(Boolean).join(" · ");
    }
    return ((activity.config && activity.config.lines) || [])[0] || activity.why || "";
  }

  function activities() {
    if (buildAt >= 0) {
      return progress() + "<h1>" + escape(buildLine || "Understanding your lesson…") + "</h1><p>Wondii is preparing the adventure. It will not start until you review it.</p>";
    }
    var stale = draft.stale ? "<p class=\"creator-warn\">The lesson text changed. <button type=\"button\" class=\"creator-text\" id=\"rebuild\">Rebuild activities</button></p>" : "";
    var last = draft.activities.length - 1;
    var cards = (draft.activities || []).map(function (activity, index) {
      var issue = Core.activityIssue(activity, Mechanics);
      var meta = Core.capability(activity.mechanic);
      var kind = meta ? meta.name : activity.mechanic;
      var moreId = "activity-more-" + index;
      var moves = (index > 0 ? "<button type=\"button\" role=\"menuitem\" data-up=\"" + index + "\">Move up</button>" : "") +
        (index < last ? "<button type=\"button\" role=\"menuitem\" data-down=\"" + index + "\">Move down</button>" : "");
      var remove = confirmRemove === index
        ? "<p id=\"remove-ask-" + index + "\">Remove this activity?</p><button type=\"button\" role=\"menuitem\" data-remove=\"" + index + "\">Remove</button><button type=\"button\" role=\"menuitem\" data-keep=\"" + index + "\">Keep</button>"
        : "<button type=\"button\" role=\"menuitem\" data-ask-remove=\"" + index + "\">Remove</button>";
      return "<article class=\"creator-activity\"><div><header><strong>" + escape(activity.title || kind) + "</strong><span>" + (activity.minutes || 0) + " min</span></header>" +
        "<p class=\"creator-note\">" + escape(kind) + " · " + escape(Core.participationLabel(Core.participationOf(activity))) + "</p>" +
        "<p>" + escape(experienceLine(activity)) + "</p>" +
        (issue ? "<p class=\"creator-warn\">" + escape(issue) + "</p>" : "") +
        "<div class=\"creator-more\">" +
        "<button type=\"button\" class=\"creator-quiet\" data-edit=\"" + index + "\">Edit</button>" +
        "<button type=\"button\" class=\"creator-quiet\" data-more=\"" + index + "\" aria-haspopup=\"menu\" aria-label=\"More actions\" aria-expanded=\"" + (openMore === index ? "true" : "false") + "\" aria-controls=\"" + moreId + "\">More</button>" +
        "<div class=\"creator-menu\" id=\"" + moreId + "\" role=\"menu\"" + (openMore === index ? "" : " hidden") + ">" +
        "<button type=\"button\" role=\"menuitem\" data-dup=\"" + index + "\">Duplicate</button>" + moves + remove +
        "</div></div></div>" +
        (editing === index ? editForm(activity, index) : "") + "</article>";
    }).join("");
    var pickerNote = adding ? "<p class=\"creator-note\">The class can play a quiz, a spin, or a word search. Reading together, a reveal, and pick a door are not extra games.</p>" : "";
    var picker = adding ? pickerNote + "<div class=\"creator-paths\">" + Core.capabilities(Mechanics).map(function (item) {
      return "<button type=\"button\" class=\"creator-path\" data-add=\"" + item.id + "\"><strong>" + escape(item.name) + "</strong><span>" + escape(item.description) + "</span></button>";
    }).join("") + "</div>" : "<button type=\"button\" class=\"creator-text\" id=\"addActivity\">+ Add activity</button>";
    var nextStep = draft.quick ? "attendance" : "review";
    var backStep = draft.quick ? "quick" : "play";
    return progress() + "<h1>Your adventure</h1><p>About " + (draft.minutes || 0) + " minutes</p>" + stale + "<div class=\"creator-plan\">" + cards + "</div>" + picker +
      actions(["<button type=\"button\" class=\"creator-quiet\" data-go=\"" + backStep + "\">Back</button>", "<button type=\"button\" class=\"creator-go\" data-go=\"" + nextStep + "\">" + (draft.quick ? "Continue" : "Review") + "</button>"]);
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
      fields += "<label class=\"creator-field\">Points<input id=\"editPoints\" type=\"number\" min=\"0\" max=\"5\" value=\"" + escape(config.points == null ? 1 : config.points) + "\" /></label>" + whoField(activity);
    } else if (activity.mechanic === "spin") {
      fields += "<label class=\"creator-field\">What the pupil answers<input id=\"editPrompt\" value=\"" + escape((config.prompt) || "") + "\" /></label>" +
        "<label><input id=\"editRepeat\" type=\"checkbox\"" + (config.avoidRepeat !== false ? " checked" : "") + " /> Avoid choosing the same pupil twice in a row</label>" +
        "<label><input id=\"editFresh\" type=\"checkbox\"" + (config.preferFresh !== false ? " checked" : "") + " /> Prefer pupils who have not had a turn</label>";
    } else if (activity.mechanic === "doors") {
      var doorLabels = (config.choices && config.choices.length ? config.choices : config.lines) || [];
      fields += "<label class=\"creator-field\">Question<input id=\"editPrompt\" value=\"" + escape(config.prompt || "") + "\" /></label>" +
        "<label class=\"creator-field\">Three choices, one on each line<textarea id=\"editLines\">" + escape(doorLabels.join("\n")) + "</textarea></label>" +
        "<label class=\"creator-field\">What each choice reveals, one on each line<textarea id=\"editReveals\">" + escape((config.reveals || []).join("\n")) + "</textarea></label>";
    } else if (activity.mechanic === "word_search") {
      fields += "<label class=\"creator-field\">Instruction<input id=\"editInstruction\" value=\"" + escape(config.instruction || "") + "\" /></label>" +
        "<label class=\"creator-field\">Words, one on each line<textarea id=\"editWords\">" + escape((config.words || []).join("\n")) + "</textarea></label>" +
        "<label class=\"creator-field\">Points per word<input id=\"editPoints\" type=\"number\" min=\"0\" max=\"5\" value=\"" + escape(config.points == null ? 1 : config.points) + "\" /></label>" + whoField(activity);
    } else {
      fields += "<label class=\"creator-field\">What the class sees<textarea id=\"editLines\">" + escape((config.lines || []).join("\n")) + "</textarea></label>";
    }
    return "<section class=\"creator-card\"><h2>Edit</h2>" + fields + actions(["<button type=\"button\" class=\"creator-go\" id=\"saveEdit\" data-index=\"" + index + "\">Save activity</button>", "<button type=\"button\" class=\"creator-quiet\" id=\"closeEdit\">Close</button>"]) + "</section>";
  }

  function whoField(activity) {
    var options = Core.participationOptions(activity.mechanic, draft.playMode);
    if (!options.length || (options.length === 1 && activity.mechanic !== "quiz" && activity.mechanic !== "word_search")) return "";
    var current = Core.participationOf(activity);
    return "<label class=\"creator-field\">Who answers?<select id=\"editPart\">" + options.map(function (id) {
      return "<option value=\"" + escape(id) + "\"" + (id === current ? " selected" : "") + ">" + escape(Core.participationLabel(id)) + "</option>";
    }).join("") + "</select></label>";
  }

  function review() {
    var room = roomById(draft.classId);
    var mode = Core.playMode(draft.playMode);
    var problems = Core.issues(draft, Mechanics);
    var cards = (draft.activities || []).map(function (activity, index) {
      var part = Core.participationOf(activity);
      var prev = index ? draft.activities[index - 1] : null;
      var follow = "";
      if (activity.mechanic === "spin" && !(activity.config && activity.config.prompt)) follow = "<p>The chosen pupil needs a question.</p>";
      if (prev && prev.mechanic === "spin" && (part === "selected_pupil" || part === "spin")) follow = "<p>The selected pupil answers.</p>";
      var detail = experienceLine(activity);
      var purpose = activity.purpose && activity.purpose !== activity.mechanic ? activity.purpose : "";
      return "<article class=\"creator-activity\"><p class=\"creator-note\">" + (index + 1) + "</p><div><strong>" + escape(activity.title || activity.mechanic) + "</strong>" +
        (purpose ? "<p>" + escape(purpose) + "</p>" : "") +
        "<p>" + escape(detail) + "</p>" + follow +
        "<p>Participation: " + escape(Core.participationLabel(part)) + "</p>" +
        "<p>Scoring: " + escape(Core.scoreCopy(activity, draft.playMode)) + "</p>" +
        "<button type=\"button\" class=\"creator-quiet\" data-edit=\"" + index + "\">Edit</button></div></article>";
    }).join("");
    var objective = (draft.goals || [])[0] || "";
    var knowledge = (draft.lessonPlan && draft.lessonPlan.keyKnowledge) || [];
    var story = draft.storyPlan || {};
    var beatNames = { beginning: "Arrival", goal: "The mission", development: "What happens", discovery: "Discovery", application: "Use the idea", resolution: "The way home", debrief: "What we discovered" };
    var journey = (draft.activities || []).map(function (activity, index) {
      var beat = activity.scene && beatNames[activity.scene.beat];
      var role = activity.config && activity.config.role;
      return "<li>" + escape((beat ? beat + " — " : "") + (activity.title || activity.mechanic || "Scene")) + (role ? " · " + escape(role) : "") + "</li>";
    }).join("");
    var ageLine = draft.year || "";
    if (!draft.year) ageLine = "Year not set. Choose a learning level before the class plays.";
    else if (draft.yearAssumption && !/^year 3, about 7 to 8/i.test(draft.yearAssumption)) ageLine = draft.year + " · " + draft.yearAssumption;
    return progress() + "<h1>" + escape((story.title) || draft.title || "Review") + "</h1>" +
      "<p>" + escape(draft.subject || "Subject not set") + " · " + escape(ageLine || "Learning level not set") + "</p>" +
      (objective ? "<p><strong>Objective.</strong> " + escape(objective) + "</p>" : "") +
      (story.mission ? "<p><strong>Mission.</strong> " + escape(story.mission) + "</p>" : "") +
      (story.premise ? "<p>" + escape(story.premise) + "</p>" : "") +
      (journey ? "<p><strong>Journey.</strong></p><ol class=\"creator-plan\">" + journey + "</ol>" : "") +
      "<p>" + escape(room ? room.name : "No class") + " · " + (room ? pupilCount(room.pupils.length) : "No pupils") + "</p>" +
      "<p>About " + (draft.minutes || 0) + " minutes · " + escape(mode.title) + "</p>" +
      (knowledge.length ? "<p><strong>Key knowledge.</strong> " + escape(knowledge.join(" ")) + "</p>" : "") +
      (globalThis.WondiiVisuals && WondiiVisuals.reviewHtml ? WondiiVisuals.reviewHtml(draft) : "") +
      "<div class=\"creator-plan\">" + cards + "</div>" +
      (problems.length ? "<p class=\"creator-warn\" role=\"status\">We couldn't finish one of the activities. Try again, edit the lesson, or remove the activity that is not ready.</p>" : "") +
      "<label class=\"creator-field\">Teacher notes<textarea id=\"notes\">" + escape(draft.notes || "") + "</textarea></label>" +
      actions(problems.length ? [
        "<button type=\"button\" class=\"creator-go\" id=\"rebuild\">Try again</button>",
        "<button type=\"button\" class=\"creator-quiet\" data-go=\"source\">Edit lesson</button>",
        "<button type=\"button\" class=\"creator-quiet\" data-go=\"activities\">Edit plan</button>"
      ] : [
        "<button type=\"button\" class=\"creator-go\" id=\"startNow\">Start now</button>",
        "<button type=\"button\" class=\"creator-quiet\" id=\"saveLibrary\">Save to library</button>",
        "<button type=\"button\" class=\"creator-quiet\" data-go=\"activities\">Edit plan</button>"
      ]);
  }

  function attendance() {
    var room = roomById(draft.classId);
    var away = {};
    (draft.away || []).forEach(function (id) { away[id] = 1; });
    var rows = room ? (room.pupils || []).map(function (pupil) {
      var off = !!away[pupil.id];
      return "<button type=\"button\" class=\"creator-pupil" + (off ? " is-away" : "") + "\" data-away=\"" + escape(pupil.id) + "\">" +
        "<img src=\"" + escape(portrait(pupil, room)) + "\" alt=\"\" /><span>" + escape(pupil.firstName) + "</span><small>" + (off ? "Away" : "Here") + "</small></button>";
    }).join("") : "<p>No class is saved on this adventure yet.</p>";
    var here = room ? Core.takingPart(draft, room).length : 0;
    var total = room ? room.pupils.length : 0;
    var guests = (draft.guests || []).map(function (guest) { return escape(guest.name); }).join(", ");
    return "<p class=\"w-kicker\">Attendance</p><h1>Who's here today?</h1>" +
      (room ? "<p>" + escape(room.name) + "</p>" : "") +
      "<div class=\"creator-pupils\">" + rows + "</div>" +
      "<p><strong>" + here + " of " + total + " here today</strong></p>" +
      "<label class=\"creator-field\">Add a visitor<input id=\"guest\" maxlength=\"24\" /></label>" +
      "<button type=\"button\" class=\"creator-quiet\" id=\"addGuest\">Add visitor</button>" +
      "<p class=\"creator-note\">" + (guests ? "Visitors today: " + guests + ". " : "") + "A visitor stays in this session only.</p>" +
      actions(["<button type=\"button\" class=\"creator-go\" data-go=\"confirm\">Continue</button>", "<button type=\"button\" class=\"creator-quiet\" data-go=\"review\">Back</button>"]);
  }

  function teamHeading(name) {
    if (!name) return "Team";
    return /team/i.test(name) ? name : name + " Team";
  }

  function confirmPlay() {
    var room = roomById(draft.classId);
    var plan = Core.sessionPlan(draft, room);
    var mode = Core.playMode(draft.playMode);
    var copy = "Playing together as one class.";
    if (mode.id === "individual") copy = "Children will take turns during activities.";
    else if (mode.id === "teacher_class") copy = "Teacher vs Class";
    else if (mode.engine !== "none") copy = (plan.teamNames || []).map(teamHeading).join(" vs ") || mode.title;
    var byId = {};
    if (room) (room.pupils || []).forEach(function (pupil) { byId[pupil.id] = pupil; });
    (draft.guests || []).forEach(function (guest) { byId[guest.id] = { id: guest.id, firstName: guest.name }; });
    var faces = mode.engine === "none" ? "" : (plan.teamNames || []).map(function (name, index) {
      var ids = [];
      (plan.assignments || []).forEach(function (row) { if (row.teamIndex === index) ids.push(row.id); });
      var kids = ids.map(function (id) {
        var pupil = byId[id];
        if (!pupil) return "";
        return "<span class=\"creator-pupil\"><img src=\"" + escape(portrait(pupil, room)) + "\" alt=\"\" /><span>" + escape(pupil.firstName) + "</span></span>";
      }).join("");
      return "<section class=\"creator-card\"><h2>" + escape(teamHeading(name)) + "</h2><div class=\"creator-pupils\">" + kids + "</div></section>";
    }).join("");
    return "<p class=\"w-kicker\">Ready</p><h1>" + escape(draft.title || "Today's adventure") + "</h1><p>" + escape(copy) + "</p>" + faces +
      actions([
        "<button type=\"button\" class=\"creator-go\" id=\"begin\">Start adventure</button>",
        "<button type=\"button\" class=\"creator-quiet\" id=\"changeSetup\">Change setup</button>",
        "<button type=\"button\" class=\"creator-quiet\" data-go=\"attendance\">Back</button>"
      ]);
  }

  function quickStep() {
    var room = roomById(draft.classId);
    var picks = [
      ["quiz", "Quiz", "One question for this class."],
      ["spin", "Spin a pupil", "Choose someone who is here."],
      ["word_search", "Word search", "Find a few words together."]
    ];
    return "<h1>Quick game</h1><p>" + escape(room ? room.name + " is already selected." : "Choose a class, then pick a game.") + "</p><div class=\"creator-paths\">" +
      picks.map(function (item) {
        return "<button type=\"button\" class=\"creator-path\" data-quick=\"" + item[0] + "\"><strong>" + escape(item[1]) + "</strong><span>" + escape(item[2]) + "</span></button>";
      }).join("") + "</div>" +
      (room ? "" : "<p><button type=\"button\" class=\"creator-quiet\" data-go=\"class\">Choose a class</button></p>");
  }

  function ready() {
    return attendance();
  }

  function libraryView() {
    var cards = library().map(function (item) {
      var map = item.learningMap || {};
      var current = Core.isCurrent(item);
      var count = (item.plan && item.plan.activities && item.plan.activities.length) || (item.plan && item.plan.slides && item.plan.slides.length) || 0;
      var buttons = Core.libraryActions(item).map(function (label) {
        var classBit = item.classId ? "&class=" + encodeURIComponent(item.classId) : "";
        if (label === "Start") return "<a class=\"creator-go\" href=\"create.html?start=" + encodeURIComponent(item.id) + classBit + "\">Start</a>";
        if (label === "Preview") return "<a class=\"creator-quiet\" href=\"present.html?journey=" + encodeURIComponent(item.id) + "&preview=1\">Preview</a>";
        if (label === "Adapt") return "<a class=\"creator-quiet\" href=\"create.html?adapt=" + encodeURIComponent(item.id) + "\">Adapt</a>";
        if (label === "Duplicate") return "<button type=\"button\" class=\"creator-quiet\" data-copy=\"" + escape(item.id) + "\">Duplicate</button>";
        if (label === "Update this adventure") return "<a class=\"creator-go\" href=\"create.html?adapt=" + encodeURIComponent(item.id) + "\">Update this adventure</a>";
        return "";
      }).join("");
      return "<article class=\"creator-card\"><p class=\"creator-note\">" + (current ? "Current adventure" : "Older adventure") + "</p><h2>" + escape(item.title || (item.plan && item.plan.title) || "Adventure") + "</h2>" +
        "<p>" + escape(map.subject || "") + " " + escape(map.yearGroup || "") + " · " + count + " activities · " + escape(item.estimateMinutes ? item.estimateMinutes + " min" : "") + "</p>" +
        (item.className ? "<p class=\"creator-note\">" + escape(item.className) + "</p>" : "") +
        (current ? "" : "<p>This adventure uses an older format. Updating makes a new copy and leaves the original as it is.</p>") +
        actions([buttons]) + "</article>";
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
      : step === "attendance" || step === "ready" ? attendance()
      : step === "confirm" ? confirmPlay()
      : step === "quick" ? quickStep()
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
      var part = document.getElementById("editPart");
      if (part) {
        activity.config.participation = part.value;
        activity.config.askSelected = part.value === "selected_pupil";
      }
      if (activity.config.questions && activity.config.questions.length) {
        activity.config.questions[0].prompt = activity.config.prompt;
        activity.config.questions[0].choices = activity.config.choices.slice();
        activity.config.questions[0].correct = activity.config.correct;
        activity.config.questions[0].kind = activity.config.kind;
      }
      activity.minutes = Math.max(2, (activity.config.questions || []).length || 1);
      draft.minutes = draft.activities.reduce(function (total, item) { return total + (item.minutes || 0); }, 0);
    } else if (activity.mechanic === "spin") {
      activity.config.prompt = (document.getElementById("editPrompt") || {}).value || "";
      activity.config.avoidRepeat = !!(document.getElementById("editRepeat") || {}).checked;
      activity.config.preferFresh = !!(document.getElementById("editFresh") || {}).checked;
      activity.why = activity.config.prompt || activity.why;
    } else if (activity.mechanic === "doors") {
      var labels = String((document.getElementById("editLines") || {}).value || "").split(/\n/).map(function (line) { return line.trim(); }).filter(Boolean).slice(0, 3);
      activity.config.prompt = (document.getElementById("editPrompt") || {}).value || "";
      activity.config.choices = labels;
      activity.config.lines = labels.slice();
      activity.config.reveals = String((document.getElementById("editReveals") || {}).value || "").split(/\n/).map(function (line) { return line.trim(); }).filter(Boolean).slice(0, 3);
    } else if (activity.mechanic === "word_search") {
      activity.config.instruction = (document.getElementById("editInstruction") || {}).value || "";
      activity.config.words = String((document.getElementById("editWords") || {}).value || "").split(/\n/).map(function (word) { return word.trim(); }).filter(Boolean);
      activity.config.points = Number((document.getElementById("editPoints") || {}).value || 1);
      var wordPart = document.getElementById("editPart");
      if (wordPart) activity.config.participation = wordPart.value;
      activity.config.title = activity.title;
    } else {
      activity.config.lines = String((document.getElementById("editLines") || {}).value || "").split(/\n/).filter(Boolean);
    }
    editing = -1;
  }

  function applyBrain(adventure) {
    draft.activities = adventure.activities || [];
    draft.minutes = adventure.estimateMinutes || draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    if (adventure.subject) draft.subject = adventure.subject;
    if (adventure.topic) draft.topic = adventure.topic;
    if (adventure.title) draft.title = adventure.title;
    if (adventure.objectives && adventure.objectives.length) draft.goals = adventure.objectives.slice();
    if (adventure.vocabulary && adventure.vocabulary.length) draft.vocabulary = adventure.vocabulary.slice();
    draft.lessonPlan = adventure.lessonPlan || null;
    draft.storyPlan = adventure.storyPlan || null;
    draft.visualAssets = adventure.visualAssets || null;
    var assumedYear = adventure.yearAssumed ? (adventure.yearAssumption || "") : "";
    if (/^year 3, about 7 to 8/i.test(assumedYear)) assumedYear = "";
    draft.yearAssumption = assumedYear;
    draft.generation = adventure.meta || { fallbackUsed: false };
    draft.generationError = "";
  }

  function useLibrary(stage, issues) {
    Core.recommend(draft);
    var broken = Core.brokenLesson(draft);
    var problems = Core.validateAdventure(draft, Mechanics);
    if (broken || problems.length || !(draft.activities || []).length) {
      draft.activities = [];
      draft.minutes = 0;
      draft.generationError = "failed";
      draft.generation = { fallbackUsed: true, stage: stage || "EDUCATIONAL_VALIDATION_FAILED", issues: Core.boundedIssues(issues) };
      notice = "";
      step = "play";
      return;
    }
    draft.generationError = "";
    draft.generation = { fallbackUsed: true, repairUsed: false };
    notice = "Wondii built this from its lesson library.";
    step = "activities";
  }

  function createWorld(token) {
    var Visuals = window.WondiiVisualAdventure;
    var orgId = org().organisationId || "";
    buildAt = 0;
    buildLine = "Creating the world...";
    if (!Visuals || !Visuals.visualsAllowed({ organisationId: orgId }) || !Visuals.planVisualAssets) {
      buildAt = -1;
      go("activities");
      return;
    }
    var adventure = {
      title: draft.title || "",
      topic: draft.topic || "",
      subject: draft.subject || "",
      yearGroup: draft.year || "",
      year: draft.year || "",
      storyPlan: draft.storyPlan || null,
      lessonPlan: draft.lessonPlan || null,
      activities: draft.activities || []
    };
    var room = roomById(draft.classId);
    var featured = Visuals.bindFeatured ? Visuals.bindFeatured((room && room.pupils) || [], draft.year, draft.storyPlan) : [];
    draft.featuredCast = featured;
    adventure.avatarRefs = Visuals.avatarRefs ? Visuals.avatarRefs(featured) : [];
    var planned = [];
    try { planned = Visuals.planVisualAssets(adventure) || []; } catch (e) { planned = []; }
    var queue = (adventure.avatarRefs.length ? [] : ["characters"]).concat(planned.map(function (asset) { return asset.id; }));
    var pictures = [];
    var sheetPath = "";
    var cloud = window.KidsScoreCloud;
    var sync = window.SCORE_SYNC || {};
    var worldStarted = Date.now();
    function finish() {
      if (token !== generationToken) return;
      draft.visualAssets = pictures;
      draft.visualTiming = { ms: Date.now() - worldStarted, count: queue.length, concurrency: 3 };
      if (Visuals.stampActivities) Visuals.stampActivities(draft.activities, pictures);
      if (window.WondiiVisuals && WondiiVisuals.bind) WondiiVisuals.bind(pictures);
      buildAt = -1;
      go("activities");
    }
    function requestAsset(id, done) {
      if (token !== generationToken) return;
      buildLine = id === "characters" ? "Creating the characters..." : "Creating the world...";
      paint();
      function send(sessionToken) {
        var headers = { "Content-Type": "application/json" };
        if (sessionToken) headers.Authorization = "Bearer " + sessionToken;
        if (sync.supabaseAnonKey) headers.apikey = sync.supabaseAnonKey;
        var control = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(120000) } : {};
        return fetch("/api/learn/visuals", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            organisationId: orgId,
            mode: "lesson",
            adventure: adventure,
            assetId: id,
            avatarRefs: adventure.avatarRefs || [],
            referencePath: id === "characters" ? "" : sheetPath
          }),
          signal: control.signal
        }).then(function (res) { return res.json(); }).catch(function () { return null; });
      }
      function take(body) {
        var asset = body && body.asset;
        if (id === "characters") {
          if (asset && asset.storagePath) sheetPath = asset.storagePath;
        } else if (asset) pictures.push(asset);
        else pictures.push({ id: id, status: "failed", fallback: true, usedByScenes: [] });
        if (done) done();
      }
      if (!cloud || !cloud.getSession) { take(null); return; }
      cloud.getSession(function (session) {
        var sessionToken = session && session.access_token;
        if (!sessionToken) take(null);
        else send(sessionToken).then(take);
      });
    }
    buildLine = "Creating the world...";
    paint();
    if (Visuals.scheduleVisualAssets) Visuals.scheduleVisualAssets(queue, requestAsset, finish, 3);
    else requestAsset(queue[0], finish);
  }

  function beginBuild() {
    readSourceFields();
    if (!draft.year) {
      generationToken += 1;
      buildAt = -1;
      notice = "Choose a year group before building this lesson.";
      step = "class";
      paint();
      return;
    }
    var token = ++generationToken;
    buildAt = 0;
    var lines = ["Planning your lesson...", "Shaping the mission...", "Building the adventure...", "Checking everything..."];
    var lineAt = 0;
    buildLine = lines[0];
    draft.generationError = "";
    notice = "";
    step = "activities";
    paint();
    var timer = setInterval(function () {
      if (token !== generationToken || buildAt < 0) { clearInterval(timer); return; }
      lineAt = Math.min(lineAt + 1, lines.length - 1);
      buildLine = lines[lineAt];
      paint();
    }, 8000);
    var analysis = Core.analyseSource(draft.source.text || ((draft.goals || [])[0] || draft.topic || ""));
    if (analysis.ok) Core.applyAnalysis(draft, analysis);
    var room = roomById(draft.classId);
    var here = Core.takingPart(draft, room).length;
    var Brain = window.WondiiLessonBrain;
    var ctx = Brain ? Brain.contextFrom(draft, {
      organisationId: org().organisationId || "",
      pupilCount: here,
      availableMechanics: Core.capabilities(Mechanics).map(function (item) { return item.id; })
    }) : null;
    var pending = Brain && ctx ? Brain.request(ctx) : Promise.resolve({ ok: false, category: "unauthorised" });
    pending.then(function (result) {
      if (token !== generationToken) return;
      clearInterval(timer);
      if (result && result.ok && result.adventure) {
        applyBrain(result.adventure);
        var problems = Core.validateAdventure(draft, Mechanics);
        var broken = Core.brokenLesson(draft);
        if (!problems.length && !broken) {
          draft.stale = false;
          createWorld(token);
          return;
        }
        buildAt = -1;
        useLibrary(result.stage, problems.concat(broken ? [broken] : []));
        draft.stale = false;
        paint();
        return;
      }
      buildAt = -1;
      useLibrary(result && result.stage, result && result.issues);
      draft.stale = false;
      paint();
    });
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
      var text = (draft.source.text || "").trim();
      if (text.length < 12 && !draft.source.filename) {
        notice = "Add a little more about the lesson.";
        paint();
        return;
      }
      var before = (draft.activities || []).length;
      if (text.length >= 12) {
        var analysis = Core.analyseSource(text);
        if (analysis.ok) Core.applyAnalysis(draft, analysis);
      }
      if (before) draft.stale = true;
      draft.sourceKind = "describe";
      go(draft.classId ? "play" : "class");
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
    var manual = document.getElementById("buildManual");
    if (manual) manual.addEventListener("click", function () {
      generationToken += 1;
      buildAt = -1;
      draft.activities = [];
      draft.minutes = 0;
      draft.generationError = "";
      notice = "";
      adding = true;
      go("activities");
    });
    var saveSetup = document.getElementById("saveSetup");
    if (saveSetup) saveSetup.addEventListener("click", function () {
      Core.ensureTeams(draft, Core.takingPart(draft, roomById(draft.classId)));
      returnStep = "";
      go("confirm");
    });
    var changeSetup = document.getElementById("changeSetup");
    if (changeSetup) changeSetup.addEventListener("click", function () {
      returnStep = "confirm";
      go("play");
    });
    root.querySelectorAll("[data-quick]").forEach(function (button) {
      button.addEventListener("click", function () {
        var mechanic = button.getAttribute("data-quick");
        draft.activities = [];
        draft.quick = true;
        draft.title = draft.title || "Quick game";
        Core.addActivity(draft, mechanic, Mechanics);
        var activity = draft.activities[0];
        if (activity && mechanic === "quiz") {
          activity.config.prompt = "What is 2 × 2?";
          activity.config.choices = ["3", "4", "5", "6"];
          activity.config.correct = "4";
          activity.config.participation = "whole_class";
        }
        if (activity && mechanic === "word_search") {
          activity.config.words = ["STAR", "MOON", "SUN"];
        }
        editing = mechanic === "spin" ? -1 : 0;
        go(mechanic === "spin" ? "attendance" : "activities");
      });
    });
    var rebuild = document.getElementById("rebuild");
    if (rebuild) rebuild.addEventListener("click", beginBuild);
    root.querySelectorAll("[data-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        editing = Number(button.getAttribute("data-edit"));
        if (step === "review") step = "activities";
        paint();
      });
    });
    root.querySelectorAll("[data-dup]").forEach(function (button) {
      button.addEventListener("click", function () { Core.duplicateActivity(draft, Number(button.getAttribute("data-dup"))); mark(); });
    });
    root.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
        Core.removeActivity(draft, Number(button.getAttribute("data-remove")));
        confirmRemove = -1;
        openMore = -1;
        mark();
      });
    });
    root.querySelectorAll("[data-more]").forEach(function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.getAttribute("data-more"));
        openMore = openMore === index ? -1 : index;
        confirmRemove = -1;
        paint();
        if (openMore === index) {
          var item = document.querySelector("#activity-more-" + index + " [role='menuitem']");
          if (item) item.focus();
        }
      });
    });
    root.querySelectorAll("[data-up]").forEach(function (button) {
      button.addEventListener("click", function () { Core.moveActivity(draft, Number(button.getAttribute("data-up")), -1); openMore = -1; mark(); });
    });
    root.querySelectorAll("[data-down]").forEach(function (button) {
      button.addEventListener("click", function () { Core.moveActivity(draft, Number(button.getAttribute("data-down")), 1); openMore = -1; mark(); });
    });
    root.querySelectorAll("[data-ask-remove]").forEach(function (button) {
      button.addEventListener("click", function () { confirmRemove = Number(button.getAttribute("data-ask-remove")); paint(); });
    });
    root.querySelectorAll("[data-keep]").forEach(function (button) {
      button.addEventListener("click", function () { confirmRemove = -1; paint(); });
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
      save.disabled = true;
      persistAdventure().then(function (result) {
        if (result.reason === "class") {
          notice = "Choose a class from this school before saving.";
          step = "class";
          paint();
          return;
        }
        if (result.reason === "content") {
          notice = "Wondii couldn't finish this adventure.";
          draft.generationError = "failed";
          step = "play";
          paint();
          return;
        }
        if (!result.adventure) { paint(); return; }
        notice = "Saved to your school library.";
        step = "library";
        paint();
      });
    });
    var start = document.getElementById("startNow");
    if (start) start.addEventListener("click", function () {
      var problems = Core.issues(draft, Mechanics);
      if (problems.length) { notice = problems[0]; paint(); return; }
      if (Core.brokenLesson(draft)) {
        notice = "Wondii couldn't finish this adventure.";
        draft.generationError = "failed";
        step = "play";
        paint();
        return;
      }
      if (!draft.quick) persistAdventure();
      go("attendance");
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
      begin.disabled = true;
      var saving = draft.quick
        ? Promise.resolve({ adventure: Core.toAdventure(draft, org().organisationId || null), reason: "" })
        : persistAdventure();
      saving.then(function (result) {
        if (result.reason === "class") {
          notice = "Choose a class from this school before starting.";
          step = "class";
          paint();
          return;
        }
        if (result.reason === "content") {
          notice = "Wondii couldn't finish this adventure.";
          draft.generationError = "failed";
          step = "play";
          paint();
          return;
        }
        var adventure = result.adventure;
        if (!adventure) { paint(); return; }
        if (!window.ClassRooms) {
          notice = "The session could not be created. The adventure is still saved.";
          paint();
          return;
        }
        var created = draft.pendingSessionCode ? ClassRooms.get(draft.pendingSessionCode) : null;
        var freshSession = !created;
        if (!created) {
          var plan = Core.sessionPlan(draft, roomById(draft.classId));
          created = ClassRooms.createSession(adventure, "board", false, plan);
        }
        if (!created) {
          notice = draft.quick ? "The session could not be created." : "The session could not be created. The adventure is still saved.";
          paint();
          return;
        }
        draft.pendingSessionCode = created.code;
        var follow = freshSession && window.WondiiSchoolData && WondiiSchoolData.whenSaved
          ? WondiiSchoolData.whenSaved()
          : (window.WondiiSchoolData && WondiiSchoolData.retry ? WondiiSchoolData.retry() : Promise.resolve(true));
        return follow.then(function (ok) {
          if (!ok || (window.WondiiSchoolData && WondiiSchoolData.state() === "failed")) { paint(); return; }
          clearLocal();
          dirty = false;
          draft.saved = true;
          location.href = "present.html?session=" + created.code + "&fresh=1" + (draft.classId ? "&class=" + encodeURIComponent(draft.classId) : "");
        });
      });
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
        var dropped = Core.unsupportedMechanics(original);
        draft = Core.fromAdventure(original);
        var keptTeams = JSON.parse(JSON.stringify(draft.teams || []));
        var keptMode = draft.playMode;
        applyEntryClass();
        if (!params.get("class") && original.classId) Core.setClass(draft, roomById(original.classId));
        if (keptTeams.length) {
          draft.teams = keptTeams;
          draft.playMode = keptMode;
        }
        if (dropped.length) notice = "This copy left out activities that cannot be played yet: " + dropped.join(", ") + ". The original adventure is unchanged.";
        if (Core.validateAdventure(draft, Mechanics).length) notice = "This adventure needs a quick repair before the class can play it.";
        step = "activities";
      } else notice = "This adventure could not be opened on this account.";
    } else if (params.get("start")) {
      var existing = findAdventure(params.get("start"));
      if (!existing) notice = "This adventure could not be opened on this account.";
      else if (Core.needsRepair(existing)) {
        draft = Core.fromAdventure(existing);
        draft.id = existing.id;
        draft.adaptedFrom = "";
        draft.saved = false;
        if (params.get("class")) Core.setClass(draft, roomById(params.get("class")));
        else if (existing.classId) Core.setClass(draft, roomById(existing.classId));
        notice = "This adventure needs a quick repair before the class can play it.";
        step = "activities";
      } else if (!Core.isCurrent(existing)) {
        notice = "This is an older adventure. Update it before it can be played. The original stays as it is.";
        step = "library";
      } else {
        draft = Core.fromAdventure(existing);
        draft.id = existing.id;
        draft.adaptedFrom = "";
        draft.saved = true;
        var keptTeams = JSON.parse(JSON.stringify(draft.teams || []));
        var keptMode = draft.playMode;
        if (params.get("class")) Core.setClass(draft, roomById(params.get("class")));
        else if (existing.classId) Core.setClass(draft, roomById(existing.classId));
        if (keptTeams.length) {
          draft.teams = keptTeams;
          draft.playMode = keptMode;
        }
        step = "attendance";
      }
    } else if (params.get("quick") === "1") {
      draft.quick = true;
      draft.title = "Quick game";
      applyEntryClass();
      step = draft.classId ? "quick" : "class";
    } else if (params.get("guided") === "1") {
      applyEntryClass();
      step = "source";
      sourcePanel = "describe";
    } else if (params.get("example") === "lights" || params.get("template")) {
      draft.source.text = Learn && Learn.SAMPLE ? Learn.SAMPLE : "Year 4 science. Electricity. Key vocabulary: circuit, battery, switch, current.";
      draft.sourceKind = "describe";
      sourcePanel = "describe";
      Core.applyAnalysis(draft, Core.analyseSource(draft.source.text));
      applyEntryClass();
      step = "class";
    } else applyEntryClass();
    document.addEventListener("wondii-visuals", function () {
      if (step === "review") paint();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || openMore < 0) return;
      var back = openMore;
      openMore = -1;
      confirmRemove = -1;
      paint();
      var button = document.querySelector("[data-more='" + back + "']");
      if (button) button.focus();
    });
    window.addEventListener("beforeunload", function (event) {
      if (!dirty || draft.saved) return;
      event.preventDefault();
      event.returnValue = "";
    });
    paint();
  }

  var booted = false;
  function openBuilder() {
    var view = org();
    if (!view.organisationId && view.status !== "ready") {
      root.innerHTML = "<div class=\"creator\"><p class=\"creator-note\">Opening your school…</p></div>";
      if (window.WondiiOrg && WondiiOrg.subscribe && !openBuilder.waiting) {
        openBuilder.waiting = true;
        WondiiOrg.subscribe(function () { openBuilder(); });
      }
      return;
    }
    if (!window.__wondiiAccountReady && window.KidsScoreCloud) {
      root.innerHTML = "<div class=\"creator\"><p class=\"creator-note\">Opening your school…</p></div>";
      if (!openBuilder.account) {
        openBuilder.account = true;
        window.addEventListener("wondii-account-scope", function () { openBuilder(); });
        setTimeout(function () {
          window.__wondiiAccountReady = true;
          openBuilder();
        }, 2500);
      }
      return;
    }
    if (booted) return;
    booted = true;
    boot();
  }

  openBuilder();
})();
