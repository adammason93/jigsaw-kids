/* Five-step teacher builder. Uses the existing lesson model.
   It does not call a live model, and it does not invent activities. */
(function (global) {
  "use strict";

  var STEPS = ["idea", "material", "classpick", "found", "choices", "adventure", "personal", "review", "storyboard", "saved"];
  var LABELS = ["Lesson", "Material", "Activities", "Personalise", "Review"];
  var EXAMPLES = [
    "Teach Year 3 about the water cycle",
    "Help Year 5 practise fractions",
    "Create a phonics activity for sh and ch"
  ];
  var SUBJECT_LINE = {
    English: "An English lesson for my class",
    Maths: "A maths lesson for my class",
    Science: "A science lesson for my class",
    History: "A history lesson for my class",
    Geography: "A geography lesson for my class"
  };
  var MINUTES = {
    quiz: 5, exit_ticket: 4, word_search: 6, matching: 6, sequencing: 6,
    circuit_game: 5, story: 12, stem: 10, comprehension: 6, maths: 6, creative: 8
  };
  var KINDS = ["story", "quiz", "word_search", "matching", "sequencing", "maths", "circuit_game", "comprehension", "stem", "creative", "exit_ticket"];
  var picker = "";
  var editing = -1;

  function handles(step) {
    return STEPS.indexOf(step) !== -1;
  }

  function classBook() {
    try {
      var raw = JSON.parse(localStorage.getItem("wondii-school-classes") || "null");
      if (raw && Array.isArray(raw.classes)) return raw;
    } catch (e) {}
    return { classes: [] };
  }

  function saveClassBook(book) {
    try { localStorage.setItem("wondii-school-classes", JSON.stringify(book)); } catch (e) {}
  }

  function roomOf(id) {
    var classes = classBook().classes;
    for (var i = 0; i < classes.length; i++) if (classes[i].id === id) return classes[i];
    return null;
  }

  function knownRoom(journey) {
    return roomOf(journey && journey.classId) || (classBook().classes.length === 1 ? classBook().classes[0] : null);
  }

  function yearLabel(name) {
    var text = String(name || "").toLowerCase();
    if (/\breception\b|\bnursery\b/.test(text)) return "Reception";
    var yearMatch = text.match(/\b(?:year|yr|y)\s*([1-6])(?!\d)/) || text.match(/\by([1-6])(?!\d)/);
    var lead = String(name || "").trim().match(/^([1-6])\s*[a-z]$/i);
    var year = yearMatch ? Number(yearMatch[1]) : (lead ? Number(lead[1]) : null);
    return year ? "Year " + year : "";
  }

  function artPrefix(name) {
    var text = String(name || "").toLowerCase();
    var yearMatch = text.match(/\b(?:year|yr|y)\s*([1-6])(?!\d)/) || text.match(/\by([1-6])(?!\d)/);
    var lead = String(name || "").trim().match(/^([1-6])\s*[a-z]$/i);
    var year = /\breception\b|\bnursery\b/.test(text) ? 0 : (yearMatch ? Number(yearMatch[1]) : (lead ? Number(lead[1]) : null));
    if (year === null || year === 4) return "";
    if (year <= 1) return "5-";
    if (year <= 3) return "6-";
    return "10-";
  }

  function portrait(pupil, className) {
    var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
    var length = pupil.presentation === "boy" || pupil.length === "short" ? "short" : "long";
    if (pupil.presentation === "girl") length = "long";
    return "../../games/images/schools/room/kid-" + artPrefix(className) + hair + "-" + length + ".webp";
  }

  function applyRoom(journey, room) {
    if (!room) return;
    journey.classId = room.id;
    journey.className = room.name;
    journey.learningMap = journey.learningMap || {};
    journey.learningMap.confidence = journey.learningMap.confidence || {};
    var year = yearLabel(room.name);
    if (year) {
      journey.learningMap.yearGroup = year;
      journey.learningMap.confidence.yearGroup = "class";
    }
    if (journey.useClassCharacters !== false) journey.useClassCharacters = true;
  }

  function inferPace(text) {
    var match = String(text || "").match(/\b([1-9]\d?)\s*(?:min|mins|minute|minutes)\b/i);
    if (!match) return 0;
    var n = Number(match[1]);
    if (n <= 10) return 10;
    if (n <= 20) return 20;
    if (n <= 30) return 30;
    if (n <= 45) return 45;
    return 60;
  }

  function inferPlay(text) {
    var t = String(text || "").toLowerCase();
    if (/game\s*show/.test(t)) return "game_show";
    if (/\bcalm\b|\bquiet\b/.test(t)) return "calm";
    return "";
  }

  function indexOf(step) {
    if (step === "idea") return 0;
    if (step === "material" || step === "found") return 1;
    if (step === "adventure") return 2;
    if (step === "personal") return 3;
    return 4;
  }

  function activity(id) {
    return global.WondiiLearn.activityById(id);
  }

  function minutes(id) {
    return MINUTES[id] || 5;
  }

  function sync(journey) {
    var Learn = global.WondiiLearn;
    journey.plan = Learn.planFor(journey);
    var steps = (journey.plan && journey.plan.steps) || [];
    var ordered = [];
    (journey.selected || []).forEach(function (id) {
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].id === id) {
          ordered.push(steps[i]);
          break;
        }
      }
    });
    if (journey.plan) journey.plan.steps = ordered;
    journey.estimateMinutes = Learn.estimate(journey.selected);
  }

  function covered(journey) {
    var goals = (journey.learningMap && journey.learningMap.learningObjectives) || [];
    var selected = journey.selected || [];
    var checks = selected.indexOf("quiz") !== -1 || selected.indexOf("exit_ticket") !== -1 || selected.indexOf("matching") !== -1;
    return { goals: goals, done: checks ? goals.length : 0, total: goals.length };
  }

  function progress(journey, escape) {
    if ({ idea: 1, material: 1, classpick: 1, found: 1, choices: 1, storyboard: 1 }[journey.uiStep]) return "";
    var at = indexOf(journey.uiStep);
    var items = LABELS.map(function (label, index) {
      var cls = index < at ? "is-done" : index === at ? "is-now" : "";
      var inner = index < at
        ? "<button type=\"button\" data-flow=\"jump\" data-to=\"" + ["idea", "material", "adventure", "personal", "review"][index] + "\">" + label + "</button>"
        : "<span>" + label + "</span>";
      return "<li class=\"" + cls + "\">" + inner + "</li>";
    }).join("");
    return "<div class=\"learn-progress\"><p class=\"learn-stepnow\">Step " + (at + 1) + " of 5 · " + escape(LABELS[at]) + "</p>" +
      "<ol class=\"learn-steps\">" + items + "</ol><p class=\"learn-save\" id=\"learnSave\">Saved</p></div>";
  }

  function live(hooks) {
    var note = hooks.note();
    if (!note.text) return "";
    return "<p class=\"learn-live" + (note.bad ? " is-bad" : "") + "\" role=\"status\">" + hooks.escape(note.text) + "</p>";
  }

  function view(hooks) {
    var journey = hooks.get();
    var step = journey.uiStep;
    var body = step === "idea" ? viewIdea(hooks)
      : step === "material" ? viewMaterial(hooks)
      : step === "classpick" ? viewClass(hooks)
      : step === "found" ? viewFound(hooks)
      : step === "choices" ? viewChoices(hooks)
      : step === "storyboard" ? viewStory(hooks)
      : step === "adventure" ? viewAdventure(hooks)
      : step === "personal" ? viewPersonal(hooks)
      : step === "review" ? viewReview(hooks)
      : viewSaved(hooks);
    return progress(journey, hooks.escape) + body + live(hooks);
  }

  function viewIdea(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var text = journey.source && journey.source.text ? journey.source.text : "";
    var room = knownRoom(journey);
    var known = room
      ? "<p class=\"learn-note\">For " + escape(room.name) + " · " + room.pupils.length + " pupil" + (room.pupils.length === 1 ? "" : "s") + ". Wondii will not ask for the class again.</p>"
      : "";
    var examples = EXAMPLES.map(function (line) {
      return "<button type=\"button\" class=\"learn-example\" data-flow=\"example\">" + escape(line) + "</button>";
    }).join("");
    var resume = text
      ? "<div class=\"learn-resume\"><p><strong>A draft is still on this account.</strong></p><div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"resume\">Continue that draft</button><button type=\"button\" class=\"learn-ghost\" data-flow=\"fresh\">Start something new</button></div></div>"
      : "";
    var file = journey.source && journey.source.filename ? "<p class=\"learn-note\">Added: " + escape(journey.source.filename) + "</p>" : "";
    return "<h1 class=\"learn-title\">What are we learning today?</h1>" +
      "<p class=\"learn-lead\">Tell Wondii what you would like your class to learn.</p>" +
      known + resume +
      "<label class=\"learn-label\" for=\"learnIdea\">The lesson</label>" +
      "<textarea id=\"learnIdea\" placeholder=\"20 minute fractions recap using pizzas.\">" + escape(text) + "</textarea>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"continue\">Continue</button></div>" +
      "<p class=\"learn-or\">or give Wondii something to work from</p>" +
      "<div class=\"learn-drop\" id=\"learnDrop\"><strong>Already have something prepared?</strong>" +
      "<p class=\"learn-note\">Drop a worksheet, lesson plan, photo, PDF, or Word file. Plain text is read straight away. PDF, Word, and photos are kept with the adventure. Paste the important lines so Wondii can use them. PowerPoint is not read yet.</p>" +
      "<label class=\"learn-btn\" for=\"learnFile\">Choose a file</label>" +
      "<input class=\"learn-file\" id=\"learnFile\" type=\"file\" accept=\".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*\" /></div>" +
      file +
      "<div class=\"learn-examples\">" + examples + "</div>";
  }

  function viewMaterial(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var file = journey.source && journey.source.filename ? "<p class=\"learn-note\">Added: " + escape(journey.source.filename) + "</p>" : "";
    var thin = journey.source && journey.source.needsPaste
      ? "<p class=\"learn-note\">Plain text is read straight away. PDF, Word and photos are kept with the lesson. Paste the important lines so Wondii can use them.</p>"
      : "<p class=\"learn-note\">Plain text is read straight away. PDF, Word and photos are kept with the lesson. Paste the words you want Wondii to use.</p>";
    return "<h1 class=\"learn-title\">Add your lesson material</h1>" +
      "<p class=\"learn-lead\">Optional. Give Wondii something to work from, or continue with what you already wrote.</p>" +
      "<div class=\"learn-drop\" id=\"learnDrop\"><strong>Drop your lesson material here</strong>" + thin +
      "<label class=\"learn-btn\" for=\"learnFile\">Choose files</label>" +
      "<input class=\"learn-file\" id=\"learnFile\" type=\"file\" accept=\".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*\" /></div>" +
      file +
      "<p class=\"learn-or\">or paste text</p>" +
      "<label class=\"learn-label\" for=\"learnIdea\">Lesson text</label>" +
      "<textarea id=\"learnIdea\" placeholder=\"Paste the lesson, worksheet or objective\">" + escape((journey.source && journey.source.text) || "") + "</textarea>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"read\">Continue</button>" +
      "<button type=\"button\" class=\"learn-ghost\" data-flow=\"read\">Continue without more material</button></div>";
  }

  function viewFound(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var map = journey.learningMap || {};
    var askYear = !map.yearGroup;
    var askSubject = !!map.yearGroup && !map.subject;
    var goals = (map.learningObjectives || []).map(function (line) {
      return "<li>" + escape(line) + "</li>";
    }).join("");
    var words = (map.keyVocabulary || []).map(function (word) {
      return "<li>" + escape(word) + "</li>";
    }).join("");
    var edit = journey.editingMap ? editFields(hooks) : "";
    var follow = "";
    if (askYear) {
      follow = "<h2>Which year group is this for?</h2><div class=\"learn-actions\">" +
        (global.WondiiLearn.YEAR_GROUPS || []).map(function (group) {
          return "<button type=\"button\" class=\"learn-btn\" data-flow=\"year\" data-year=\"" + escape(group) + "\">" + escape(group) + "</button>";
        }).join("") + "</div>";
    } else if (askSubject) {
      follow = "<h2>Which subject is this?</h2><div class=\"learn-subjects\">" +
        (global.WondiiLearn.SUBJECTS || []).map(function (subject) {
          return "<button type=\"button\" class=\"learn-subject\" data-flow=\"pick-subject\" data-subject=\"" + escape(subject) + "\">" + escape(subject) + "</button>";
        }).join("") + "</div>";
    }
    return "<h1 class=\"learn-title\">Wondii understands</h1>" +
      "<p class=\"learn-lead\">" + escape(journey.analysisNote || "Check this before the adventure is built.") + "</p>" +
      "<article class=\"learn-card learn-found\"><p class=\"learn-kicker\">" + escape(map.subject || "Subject still needed") + "</p>" +
      "<h2>" + escape(map.topic || "Topic") + "</h2>" +
      "<p>" + escape(map.yearGroup || "Year group still needed") + "</p>" +
      (map.summary ? "<p>" + escape(map.summary) + "</p>" : "") +
      (goals ? "<h3>Learning goals</h3><ul class=\"learn-list\">" + goals + "</ul>" : "") +
      (words ? "<h3>Key vocabulary</h3><ul class=\"learn-words\">" + words + "</ul>" : "") +
      "</article>" + follow + edit +
      "<div class=\"learn-actions\">" +
      (askYear || askSubject ? "" : "<button type=\"button\" class=\"learn-btn\" data-flow=\"build\">Looks good</button>") +
      "<button type=\"button\" class=\"learn-ghost\" data-flow=\"choices\">Make changes</button></div>";
  }

  function editFields(hooks) {
    var map = hooks.get().learningMap;
    var escape = hooks.escape;
    var years = (global.WondiiLearn.YEAR_GROUPS || []).map(function (group) {
      return "<option" + (map.yearGroup === group ? " selected" : "") + ">" + escape(group) + "</option>";
    }).join("");
    var subjects = (global.WondiiLearn.SUBJECTS || []).map(function (subject) {
      return "<option" + (map.subject === subject ? " selected" : "") + ">" + escape(subject) + "</option>";
    }).join("");
    var goals = (map.learningObjectives || []).concat(["", ""]).slice(0, 4).map(function (line, index) {
      return "<label class=\"learn-label\" for=\"goal" + index + "\">Learning goal " + (index + 1) + "</label><input id=\"goal" + index + "\" data-goal value=\"" + escape(line) + "\" />";
    }).join("");
    return "<div class=\"learn-card\"><label class=\"learn-label\" for=\"editSubject\">Subject</label><select id=\"editSubject\">" + subjects + "</select>" +
      "<label class=\"learn-label\" for=\"editYear\">Year group</label><select id=\"editYear\"><option value=\"\">Choose</option>" + years + "</select>" +
      "<label class=\"learn-label\" for=\"editTopic\">Topic</label><input id=\"editTopic\" value=\"" + escape(map.topic) + "\" />" +
      goals +
      "<label class=\"learn-label\" for=\"editWords\">Key vocabulary</label><input id=\"editWords\" value=\"" + escape((map.keyVocabulary || []).join(", ")) + "\" />" +
      "<button type=\"button\" class=\"learn-btn\" data-flow=\"save-map\">Save these details</button></div>";
  }

  function viewAdventure(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var steps = (journey.plan && journey.plan.steps) || [];
    var cards = steps.map(function (step, index) {
      var item = activity(step.id);
      var kind = item ? item.title : step.id;
      return "<article class=\"learn-act\" draggable=\"true\" data-index=\"" + index + "\">" +
        "<div class=\"learn-act__no\">" + (index + 1) + "</div><div><p class=\"learn-kicker\">" + escape(kind) + "</p>" +
        "<h2>" + escape(step.title || kind) + "</h2><p>" + escape(step.summary || (item ? item.text : "")) + "</p>" +
        "<p class=\"learn-note\">" + minutes(step.id) + " min</p>" +
        (editing === index ? editor(step, index, escape) : "") +
        "<div class=\"learn-actions\">" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"edit-act\" data-index=\"" + index + "\">Edit</button>" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"change\" data-index=\"" + index + "\">Change</button>" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"up\" data-index=\"" + index + "\">Move up</button>" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"down\" data-index=\"" + index + "\">Move down</button>" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"swap\" data-index=\"" + index + "\">Try a different activity</button>" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"delete\" data-index=\"" + index + "\">Delete</button></div></div></article>";
    }).join("");
    var cover = covered(journey);
    var missing = cover.total && cover.done < cover.total
      ? "<p class=\"learn-note\">" + (cover.total - cover.done) + " learning goal" + (cover.total - cover.done === 1 ? "" : "s") + " still need a check. <button type=\"button\" class=\"learn-mini\" data-flow=\"fix\">Fix with Wondii</button></p>"
      : "<p class=\"learn-note\">Learning goals covered " + cover.done + " / " + cover.total + "</p>";
    var times = [10, 20, 30, 45, 60].map(function (mins) {
      var on = (journey.paceMinutes || 20) === mins ? " is-on" : "";
      return "<button type=\"button\" class=\"learn-mini" + on + "\" data-flow=\"fit\" data-minutes=\"" + mins + "\">" + mins + " min</button>";
    }).join("");
    return "<div class=\"learn-build\"><div><h1 class=\"learn-title\">Your Learning Adventure</h1>" +
      "<p class=\"learn-lead\">Built for the classroom screen. The class answers together. Change anything you want.</p>" +
      cards +
      "<button type=\"button\" class=\"learn-ghost\" data-flow=\"add\">Add activity</button>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"to-personal\">Continue</button></div></div>" +
      "<aside class=\"learn-side\"><p class=\"learn-kicker\">" + escape(journey.learningMap.subject || "") + "</p>" +
      "<p>" + escape(journey.learningMap.yearGroup || "") + "</p>" +
      "<p><strong>" + escape(global.WondiiLearn.estimateLabel(journey.estimateMinutes || 0)) + "</strong></p>" +
      "<p>" + steps.length + " activities</p>" + missing +
      "<h2>Target time</h2><div class=\"learn-actions\">" + times + "</div>" +
      "<button type=\"button\" class=\"learn-ghost\" data-flow=\"refit\">Fit adventure to " + (journey.paceMinutes || 20) + " minutes</button>" +
      "<p class=\"learn-note\">10 minutes drops the story. Longer targets keep the activities that belong to the lesson. Wondii does not add filler.</p></aside></div>" +
      sheet(hooks);
  }

  function editor(step, index, escape) {
    var questions = (step.questions || []).map(function (question, q) {
      return "<label class=\"learn-label\" for=\"q" + index + "_" + q + "\">Question</label><input id=\"q" + index + "_" + q + "\" data-question=\"" + q + "\" value=\"" + escape(question.prompt) + "\" />";
    }).join("");
    return "<div class=\"learn-card\"><label class=\"learn-label\" for=\"actTitle\">Title</label><input id=\"actTitle\" value=\"" + escape(step.title) + "\" />" +
      "<label class=\"learn-label\" for=\"actSummary\">What pupils do</label><textarea id=\"actSummary\">" + escape(step.summary) + "</textarea>" +
      questions +
      "<button type=\"button\" class=\"learn-btn\" data-flow=\"save-act\" data-index=\"" + index + "\">Save activity</button></div>";
  }

  function sheet(hooks) {
    if (!picker) return "";
    var journey = hooks.get();
    var escape = hooks.escape;
    var used = journey.selected || [];
    var list = KINDS.filter(function (id) {
      var item = activity(id);
      if (!item) return false;
      if (id === "circuit_game" && !(global.WondiiLearn.electricTopic && global.WondiiLearn.electricTopic(journey.learningMap))) return false;
      if (id === "comprehension" && used.indexOf("story") === -1 && picker !== "change") return false;
      return used.indexOf(id) === -1;
    }).map(function (id) {
      var item = activity(id);
      return "<button type=\"button\" class=\"learn-choice\" data-flow=\"use\" data-activity=\"" + id + "\"><strong>" + escape(item.title) + "</strong><span>" + escape(item.text) + "</span></button>";
    }).join("");
    return "<div class=\"learn-pop\"><div class=\"learn-pop__card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"learnPickTitle\">" +
      "<h2 id=\"learnPickTitle\">" + (picker === "add" ? "What would you like to add?" : "Choose another activity") + "</h2>" +
      "<div class=\"learn-choices\">" + (list || "<p>Every available activity is already in the lesson.</p>") + "</div>" +
      (picker === "add" ? "<button type=\"button\" class=\"learn-ghost\" data-flow=\"auto\">Let Wondii choose</button>" : "") +
      "<button type=\"button\" class=\"learn-ghost\" data-flow=\"close-pick\">Close</button></div></div>";
  }

  function viewPersonal(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var pictures = journey.demoElectricity && (journey.selected || []).indexOf("story") !== -1;
    var cast = pictures ? "<h2>Who's joining the adventure?</h2><div class=\"learn-cast\">" +
      (global.WondiiLearn.CHARACTERS || []).map(function (person) {
        var role = journey.characters.heroCharacterId === person.id ? "Guide" : journey.characters.buddyCharacterId === person.id ? "Buddy" : person.note;
        return "<button type=\"button\" class=\"learn-person\" data-flow=\"cast\" data-character=\"" + escape(person.id) + "\">" +
          "<img src=\"" + escape(person.image) + "\" alt=\"\" /><strong>" + escape(person.name) + "</strong><span>" + escape(role) + "</span></button>";
      }).join("") + "</div><button type=\"button\" class=\"learn-ghost\" data-flow=\"cast-auto\">Let Wondii choose</button>" : "";
    var plain = pictures ? "" : "<article class=\"learn-card\"><h2>This adventure uses your lesson</h2><p>The pupil view is built from your words and the activities you kept. Prepared picture characters are used when the adventure is the illustrated electricity story.</p></article>";
    var delivery = journey.deliveryMode || "whole_class";
    var play = journey.playfulness || "playful";
    function chip(kind, id, label, on) {
      return "<button type=\"button\" class=\"learn-mini" + (on ? " is-on" : "") + "\" data-flow=\"" + kind + "\" data-value=\"" + id + "\">" + label + "</button>";
    }
    return "<h1 class=\"learn-title\">Make it theirs</h1>" +
      "<p class=\"learn-lead\">Whole class is the usual way to teach this on the board.</p>" +
      "<h2>How are you teaching this?</h2><div class=\"learn-actions\">" +
      chip("delivery", "whole_class", "Whole class", delivery === "whole_class") +
      chip("delivery", "groups", "Groups", delivery === "groups") +
      chip("delivery", "individual", "Individual", delivery === "individual") +
      "</div><h2>How playful?</h2><div class=\"learn-actions\">" +
      chip("play", "calm", "Calm", play === "calm") +
      chip("play", "playful", "Playful", play === "playful") +
      chip("play", "game_show", "Game show", play === "game_show") +
      "</div><p class=\"learn-note\">Playful adds a fair spin so different children come to the board. Game show also adds a surprise and a door choice. Calm keeps the lesson straight.</p>" +
      plain + cast +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"to-review\">Continue</button></div>";
  }

  function viewReview(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var map = journey.learningMap || {};
    var steps = (journey.plan && journey.plan.steps) || [];
    var line = steps.map(function (step, index) {
      return "<li><span>" + (index + 1) + "</span><strong>" + escape(step.title) + "</strong></li>";
    }).join("");
    var goals = (map.learningObjectives || []).map(function (goal) {
      return "<li>" + escape(goal) + "</li>";
    }).join("");
    var cover = covered(journey);
    return "<h1 class=\"learn-title\">Ready for your class?</h1>" +
      "<article class=\"learn-card learn-hero\"><p class=\"learn-kicker\">" + escape(map.subject || "") + " · " + escape(map.yearGroup || "") + "</p>" +
      "<h2>" + escape((journey.plan && journey.plan.title) || map.topic || "Learning adventure") + "</h2>" +
      "<p>" + escape(global.WondiiLearn.estimateLabel(journey.estimateMinutes || 0)) + " · " + steps.length + " activities · " + (map.learningObjectives || []).length + " learning goal" + ((map.learningObjectives || []).length === 1 ? "" : "s") + "</p></article>" +
      "<ol class=\"learn-path\">" + line + "</ol>" +
      (goals ? "<h2>Learning goals</h2><ul class=\"learn-list\">" + goals + "</ul>" : "") +
      (cover.total && cover.done < cover.total ? "<p class=\"learn-note\">A learning goal still needs a check. <button type=\"button\" class=\"learn-mini\" data-flow=\"back-acts\">Back to activities</button></p>" : "<p class=\"learn-note\">Learning goals used in the knowledge check.</p>") +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"publish\">Save Learning Adventure</button>" +
      "<button type=\"button\" class=\"learn-ghost\" data-flow=\"preview\">Preview as pupil</button></div>";
  }

  function viewClass(hooks) {
    var escape = hooks.escape;
    var cards = classBook().classes.map(function (room) {
      var faces = room.pupils.slice(0, 4).map(function (pupil) {
        return "<img src=\"" + portrait(pupil, room.name) + "\" alt=\"\" />";
      }).join("");
      var year = yearLabel(room.name);
      return "<button type=\"button\" class=\"learn-class\" data-flow=\"pick-class\" data-class=\"" + escape(room.id) + "\">" +
        "<span class=\"learn-faces\">" + faces + "</span><strong>" + escape(room.name) + "</strong>" +
        "<span>" + room.pupils.length + " pupil" + (room.pupils.length === 1 ? "" : "s") + (year ? " · " + escape(year) : "") + "</span></button>";
    }).join("");
    return "<h1 class=\"learn-title\">Who's learning?</h1>" +
      "<p class=\"learn-lead\">Choose the class. Wondii will use their characters.</p>" +
      "<div class=\"learn-classes\">" + cards + "</div>" +
      "<p><a class=\"learn-ghost\" href=\"../../portal.html#home\">Create another class</a></p>";
  }

  function viewChoices(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var room = knownRoom(journey);
    var pace = journey.paceMinutes || inferPace(journey.source && journey.source.text) || 20;
    var play = journey.playfulness || inferPlay(journey.source && journey.source.text) || "playful";
    var delivery = journey.deliveryMode || "whole_class";
    var castOn = journey.useClassCharacters !== false && !!room;
    function chip(kind, id, label, on) {
      return "<button type=\"button\" class=\"learn-mini" + (on ? " is-on" : "") + "\" data-flow=\"" + kind + "\" data-value=\"" + id + "\">" + escape(label) + "</button>";
    }
    var times = [10, 20, 30, 45, 60].map(function (mins) {
      var label = mins === 60 ? "Full lesson" : mins + " mins";
      return chip("fit", String(mins), label, pace === mins);
    }).join("");
    var cast = room
      ? "<h2>Use my class characters</h2><div class=\"learn-actions\">" +
        chip("cast-toggle", "on", "On", castOn) + chip("cast-toggle", "off", "Off", !castOn) +
        "</div><p class=\"learn-note\">On uses " + escape(room.name) + ". Off keeps the adventure on generic Wondii characters.</p>"
      : "";
    return "<h1 class=\"learn-title\">How are we learning today?</h1>" +
      "<p class=\"learn-lead\">Whole class is ready for the board. Change only what you need.</p>" +
      "<h2>How are you teaching this?</h2><div class=\"learn-actions\">" +
      chip("delivery", "whole_class", "Whole class", delivery === "whole_class") +
      chip("delivery", "groups", "Groups", delivery === "groups") +
      chip("delivery", "individual", "Individual", delivery === "individual") +
      "</div><h2>How long?</h2><div class=\"learn-actions\">" + times + "</div>" +
      "<h2>How should it feel?</h2><div class=\"learn-actions\">" +
      chip("play", "calm", "Calm", play === "calm") +
      chip("play", "playful", "Playful", play === "playful") +
      chip("play", "game_show", "Game show", play === "game_show") +
      "</div>" + cast +
      "<details class=\"learn-advanced\"><summary>Advanced options</summary>" + editFields(hooks) + "</details>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-flow=\"build\">Create my adventure</button></div>";
  }

  function viewStory(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var map = journey.learningMap || {};
    var steps = (journey.plan && journey.plan.steps) || [];
    var room = knownRoom(journey);
    var cards = steps.map(function (step, index) {
      var cast = (step.cast || []).map(function (person) {
        var pupil = room && room.pupils.filter(function (item) { return item.id === person.id; })[0];
        var face = pupil ? "<img src=\"" + portrait(pupil, room.name) + "\" alt=\"\" />" : "";
        return "<span class=\"learn-face\">" + face + escape(person.firstName) + "</span>";
      }).join("");
      return "<article class=\"learn-act\"><div class=\"learn-act__no\">" + (index + 1) + "</div><div>" +
        "<h2>" + escape(step.title) + "</h2><p>" + escape(step.summary) + "</p>" +
        "<p class=\"learn-note\">" + (step.minutes || minutes(step.id)) + " min" + (cast ? " · Featuring " : "") + "</p>" +
        (cast ? "<p class=\"learn-castline\">" + cast + "</p>" : "") +
        "<details><summary>Why this activity?</summary><p>" + escape(step.why || step.summary) + "</p></details>" +
        "<div class=\"learn-actions\">" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"change\" data-index=\"" + index + "\">Replace</button>" +
        "<button type=\"button\" class=\"learn-mini\" data-flow=\"delete\" data-index=\"" + index + "\">Remove</button></div></div></article>";
    }).join("");
    var mode = journey.deliveryMode === "groups" ? "Groups" : journey.deliveryMode === "individual" ? "Individual" : "Whole class";
    var href = journey.classId
      ? "class.html?id=" + encodeURIComponent(journey.classId) + "&adventure=" + encodeURIComponent(journey.id)
      : "present.html?journey=" + encodeURIComponent(journey.id);
    var undo = journey.undoPlan ? "<p class=\"learn-note\">Adventure updated. <button type=\"button\" class=\"learn-mini\" data-flow=\"undo\">Undo</button></p>" : "";
    return "<h1 class=\"learn-title\">Your adventure is ready</h1>" +
      "<article class=\"learn-card learn-hero\"><p class=\"learn-kicker\">" + escape(journey.className || map.yearGroup || "") + "</p>" +
      "<h2>" + escape((journey.plan && journey.plan.title) || map.topic || "Learning adventure") + "</h2>" +
      "<p>" + escape([map.subject, map.yearGroup, (journey.paceMinutes || journey.estimateMinutes) ? ((journey.paceMinutes || journey.estimateMinutes) + " min") : "", mode].filter(Boolean).join(" · ")) + "</p></article>" +
      "<div class=\"learn-actions\"><a class=\"learn-btn\" href=\"" + href + "\">Start with class</a>" +
      "<a class=\"learn-ghost\" href=\"create.html?library=1\">Save for later</a></div>" +
      undo +
      "<p class=\"learn-note\">The plan uses your words" + (journey.demoElectricity ? " and the prepared electricity adventure." : ". New pictures are not generated for this lesson. Your class characters are named on the activities.") + "</p>" +
      cards +
      sheet(hooks) +
      "<form class=\"learn-magic\" id=\"magicForm\"><label class=\"learn-label\" for=\"magicLine\">Want to change anything?</label>" +
      "<input id=\"magicLine\" placeholder=\"Use Jack in the opening. Make it 10 minutes shorter.\" />" +
      "<button type=\"submit\" class=\"learn-btn\">Update adventure</button></form>";
  }

  function viewSaved(hooks) {
    var journey = hooks.get();
    var escape = hooks.escape;
    var id = encodeURIComponent(journey.id);
    return "<h1 class=\"learn-title\">Your Learning Adventure is ready</h1>" +
      "<p class=\"learn-lead\">" + escape((journey.plan && journey.plan.title) || "Saved in your adventures.") + "</p>" +
      "<div class=\"learn-actions\">" +
      "<a class=\"learn-btn\" href=\"present.html?journey=" + id + "\">Start with class</a>" +
      "<a class=\"learn-ghost\" href=\"present.html?journey=" + id + "&assign=1\">Groups or individual devices</a>" +
      "<a class=\"learn-ghost\" href=\"create.html?library=1\">My learning adventures</a>" +
      "<a class=\"learn-ghost\" href=\"present.html?journey=" + id + "&preview=1\">Preview</a></div>" +
      "<p class=\"learn-note\">Start with class opens the lesson on the board. Groups and individual devices use a join code. A mixed board-then-devices lesson is not available yet.</p>";
  }

  function readText(hooks) {
    var box = document.getElementById("learnIdea");
    var journey = hooks.get();
    if (!box) return;
    journey.source = journey.source || {};
    journey.source.text = box.value;
    if (!journey.source.filename) journey.source.type = "paste";
    hooks.save();
  }

  function topicFrom(text) {
    var line = String(text || "").split("\n").map(function (part) { return part.trim(); }).filter(Boolean)[0] || "Lesson";
    line = line.replace(/^(teach|help|create)\s+/i, "").replace(/^year\s*[1-6]\s*/i, "").replace(/^(about|practise|practice)\s+/i, "");
    line = line.replace(/[.?!]+$/, "").trim();
    line = line.charAt(0).toUpperCase() + line.slice(1);
    return line.slice(0, 80);
  }

  function rememberClass(journey) {
    var room = knownRoom(journey);
    if (room) applyRoom(journey, room);
  }

  function assignCast(journey) {
    var steps = (journey.plan && journey.plan.steps) || [];
    steps.forEach(function (step) { step.cast = []; });
    if (journey.useClassCharacters === false) return;
    var book = classBook();
    var room = null;
    for (var i = 0; i < book.classes.length; i++) if (book.classes[i].id === journey.classId) room = book.classes[i];
    if (!room || !room.pupils.length) return;
    var advance = false;
    if (journey.castStart == null) {
      journey.castStart = room.castCursor || 0;
      advance = true;
    }
    var pupils = room.pupils;
    var cursor = journey.castStart || 0;
    var used = 0;
    steps.forEach(function (step, index) {
      var last = index === steps.length - 1;
      var count = last ? Math.min(pupils.length, 4) : (index % 2 ? 1 : Math.min(2, pupils.length));
      var cast = [];
      var seen = {};
      var n;
      for (n = 0; n < count; n++) {
        var pupil = pupils[(cursor + used) % pupils.length];
        used += 1;
        if (seen[pupil.id]) continue;
        seen[pupil.id] = true;
        cast.push({ id: pupil.id, firstName: pupil.firstName });
      }
      step.cast = cast;
    });
    if (advance) {
      room.castCursor = (cursor + used) % pupils.length;
      saveClassBook(book);
    }
  }

  function buildAdventure(hooks) {
    var journey = hooks.get();
    var Learn = global.WondiiLearn;
    rememberClass(journey);
    if (!journey.learningMap.subject || !journey.learningMap.yearGroup) {
      hooks.notice("Add the year group and subject first.", true);
      hooks.go("found");
      return;
    }
    if (!journey.paceMinutes) journey.paceMinutes = inferPace(journey.source && journey.source.text) || 20;
    if (!journey.playfulness) journey.playfulness = inferPlay(journey.source && journey.source.text) || "playful";
    if (!journey.deliveryMode) journey.deliveryMode = "whole_class";
    journey.selected = Learn.activitiesForTime(journey.paceMinutes, journey.learningMap);
    if (journey.selected.indexOf("exit_ticket") === -1 && journey.paceMinutes > 10) journey.selected.push("exit_ticket");
    sync(journey);
    var quiz = (journey.plan.steps || []).filter(function (step) { return step.id === "quiz" || step.id === "exit_ticket"; })[0];
    if (quiz && Learn.questionsFor) quiz.questions = Learn.questionsFor(journey.learningMap, 3);
    (journey.plan.steps || []).forEach(function (step) {
      step.minutes = minutes(step.id);
      step.why = (step.id === "quiz" || step.id === "exit_ticket") && !journey.demoElectricity
        ? "A short check against the learning goal. These questions are drafts from your words, not a marked test."
        : (step.summary || "");
    });
    assignCast(journey);
    if (Learn.slidesFor) journey.plan.slides = Learn.slidesFor(journey);
    journey.status = "ready";
    journey.estimateMinutes = Learn.estimate(journey.selected);
    Learn.upsertLibrary(journey);
    if (Learn.touchRecent) Learn.touchRecent(journey.id);
    hooks.go("storyboard");
  }

  function understand(hooks) {
    readText(hooks);
    var journey = hooks.get();
    rememberClass(journey);
    var result = global.WondiiLearn.analyse(journey.source.text || "");
    if (!result.ok) {
      if (journey.source && journey.source.filename) {
        journey.analysisNote = "The file is kept with the adventure. Paste the important lines so Wondii can read them. PDF, Word, and photos are not extracted yet.";
        hooks.notice("", false);
        hooks.go("found");
        return;
      }
      hooks.notice(result.message, true);
      hooks.paint(false);
      return;
    }
    var hinted = journey.hintSubject;
    var classYear = journey.learningMap && journey.learningMap.confidence && journey.learningMap.confidence.yearGroup === "class" ? journey.learningMap.yearGroup : "";
    journey.learningMap = result.learningMap;
    if (classYear) {
      journey.learningMap.yearGroup = classYear;
      journey.learningMap.confidence.yearGroup = "class";
    }
    rememberClass(journey);
    if (!journey.learningMap.subject && hinted) {
      journey.learningMap.subject = hinted;
      journey.learningMap.confidence.subject = "chosen";
    }
    if (!journey.learningMap.topic) journey.learningMap.topic = topicFrom(journey.source.text);
    journey.demoElectricity = !!result.demoElectricity;
    journey.provider = "demo";
    journey.creationMode = "quick";
    journey.analysisNote = journey.demoElectricity
      ? "This matches a prepared science adventure, so the activities are ready to preview."
      : "Wondii used the words you gave it. Change anything that is not right.";
    if (journey.source.needsPaste && !(journey.source.text && journey.source.text.length > 40)) {
      journey.analysisNote = "The file is kept with the lesson. Wondii can read pasted or plain text, so the summary only includes words you typed.";
    }
    hooks.notice("", false);
    hooks.go("found");
  }

  function propose(hooks) {
    var journey = hooks.get();
    var Learn = global.WondiiLearn;
    if (!journey.learningMap.subject || !journey.learningMap.yearGroup) {
      hooks.notice("Add the year group and subject first.", true);
      hooks.paint(false);
      return;
    }
    journey.deliveryMode = "whole_class";
    journey.paceMinutes = journey.paceMinutes || 20;
    journey.selected = Learn.activitiesForTime(journey.paceMinutes, journey.learningMap);
    if (journey.selected.indexOf("exit_ticket") === -1 && journey.paceMinutes > 10) journey.selected.push("exit_ticket");
    sync(journey);
    var quiz = (journey.plan.steps || []).filter(function (step) { return step.id === "quiz" || step.id === "exit_ticket"; })[0];
    if (quiz && Learn.questionsFor) quiz.questions = Learn.questionsFor(journey.learningMap, quiz.id === "exit_ticket" ? 3 : 3);
    hooks.go("adventure");
  }

  function publish(hooks) {
    var journey = hooks.get();
    sync(journey);
    if ((journey.selected || []).indexOf("story") !== -1) {
      journey.characters.heroCharacterId = journey.characters.heroCharacterId || "alex";
      journey.characters.buddyCharacterId = journey.characters.buddyCharacterId || "fox";
    }
    journey.plan.slides = global.WondiiLearn.slidesFor(journey);
    journey.status = "ready";
    journey.estimateMinutes = global.WondiiLearn.estimate(journey.selected);
    global.WondiiLearn.upsertLibrary(journey);
    if (global.WondiiLearn.touchRecent) global.WondiiLearn.touchRecent(journey.id);
    hooks.save();
  }

  function magicEdit(hooks, line) {
    var journey = hooks.get();
    var lower = String(line || "").trim().toLowerCase();
    if (lower.length < 3) return;
    var room = knownRoom(journey);
    function pupilNamed(name) {
      var found = null;
      if (!room) return null;
      room.pupils.forEach(function (pupil) {
        if (pupil.firstName.toLowerCase() === name) found = pupil;
      });
      return found;
    }
    journey.undoPlan = {
      selected: (journey.selected || []).slice(),
      plan: JSON.parse(JSON.stringify(journey.plan)),
      paceMinutes: journey.paceMinutes,
      playfulness: journey.playfulness,
      deliveryMode: journey.deliveryMode,
      estimateMinutes: journey.estimateMinutes
    };
    var changed = false;
    var shorter = lower.match(/(\d+)\s*minutes?\s+shorter/);
    if (shorter) {
      journey.paceMinutes = Math.max(10, (journey.paceMinutes || journey.estimateMinutes || 20) - Number(shorter[1]));
      journey.selected = global.WondiiLearn.activitiesForTime(journey.paceMinutes, journey.learningMap);
      sync(journey);
      assignCast(journey);
      changed = true;
    }
    if (/calmer|make it calm/.test(lower)) {
      journey.playfulness = "calm";
      changed = true;
    }
    if (/game show/.test(lower)) {
      journey.playfulness = "game_show";
      changed = true;
    }
    if (/remove teams/.test(lower)) {
      journey.deliveryMode = "whole_class";
      changed = true;
    }
    if (/add (?:a |another )?quiz/.test(lower)) {
      if ((journey.selected || []).indexOf("quiz") === -1) journey.selected.push("quiz");
      sync(journey);
      assignCast(journey);
      changed = true;
    }
    var swap = lower.match(/\buse\s+([a-z]+)\s+instead of\s+([a-z]+)/);
    if (swap) {
      var nextPupil = pupilNamed(swap[1]);
      var swapped = false;
      if (nextPupil) {
        (journey.plan.steps || []).forEach(function (step) {
          (step.cast || []).forEach(function (person) {
            if (person.firstName.toLowerCase() === swap[2]) {
              person.id = nextPupil.id;
              person.firstName = nextPupil.firstName;
              swapped = true;
            }
          });
        });
      }
      if (!swapped) {
        hooks.notice(nextPupil ? "That pupil is not in this adventure." : "That pupil is not in this class.", true);
        if (!changed) journey.undoPlan = null;
        hooks.paint(false);
        return;
      }
      changed = true;
    }
    var opening = lower.match(/\buse\s+([a-z]+)(?:\s+and\s+([a-z]+))?\s+in the opening/);
    if (opening && journey.plan && journey.plan.steps && journey.plan.steps[0]) {
      var cast = [];
      [opening[1], opening[2]].forEach(function (name) {
        var pupil = name && pupilNamed(name);
        if (pupil) cast.push({ id: pupil.id, firstName: pupil.firstName });
      });
      if (cast.length) {
        journey.plan.steps[0].cast = cast;
        changed = true;
      } else {
        hooks.notice("Those names are not in this class.", true);
        if (!changed) journey.undoPlan = null;
        hooks.paint(false);
        return;
      }
    }
    if (!changed) {
      journey.undoPlan = null;
      hooks.notice("Wondii can shorten the time, swap a pupil in this class, calm it down, or add a quiz. It cannot rewrite the story with a live model yet.", true);
      hooks.paint(false);
      return;
    }
    if (global.WondiiLearn.slidesFor) journey.plan.slides = global.WondiiLearn.slidesFor(journey);
    journey.estimateMinutes = global.WondiiLearn.estimate(journey.selected);
    global.WondiiLearn.upsertLibrary(journey);
    hooks.notice("Adventure updated.", false);
    hooks.save();
    hooks.paint(false);
  }

  function bind(root, hooks) {
    var idea = document.getElementById("learnIdea");
    if (idea) idea.addEventListener("input", function () { readText(hooks); });
    var file = document.getElementById("learnFile");
    var drop = document.getElementById("learnDrop");
    if (file) file.addEventListener("change", function () { hooks.takeFile(file.files[0]); });
    if (drop) {
      ["dragenter", "dragover"].forEach(function (name) {
        drop.addEventListener(name, function (event) {
          event.preventDefault();
          drop.classList.add("is-over");
        });
      });
      drop.addEventListener("dragleave", function () { drop.classList.remove("is-over"); });
      drop.addEventListener("drop", function (event) {
        event.preventDefault();
        drop.classList.remove("is-over");
        hooks.takeFile(event.dataTransfer.files[0]);
      });
    }
    root.querySelectorAll("[data-flow]").forEach(function (btn) {
      btn.addEventListener("click", function () { act(btn, hooks); });
    });
    var magic = document.getElementById("magicForm");
    if (magic) magic.addEventListener("submit", function (event) {
      event.preventDefault();
      magicEdit(hooks, document.getElementById("magicLine").value);
    });
    root.querySelectorAll(".learn-act").forEach(function (card) {
      card.addEventListener("dragstart", function (event) {
        event.dataTransfer.setData("text/plain", card.getAttribute("data-index"));
      });
      card.addEventListener("dragover", function (event) { event.preventDefault(); });
      card.addEventListener("drop", function (event) {
        event.preventDefault();
        var from = Number(event.dataTransfer.getData("text/plain"));
        var to = Number(card.getAttribute("data-index"));
        move(hooks, from, to);
      });
    });
  }

  function move(hooks, from, to) {
    var journey = hooks.get();
    if (from === to || from < 0 || to < 0 || to >= journey.selected.length) return;
    var id = journey.selected.splice(from, 1)[0];
    journey.selected.splice(to, 0, id);
    sync(journey);
    hooks.save();
    hooks.paint(false);
  }

  function act(btn, hooks) {
    var name = btn.getAttribute("data-flow");
    var journey = hooks.get();
    var Learn = global.WondiiLearn;
    if (name === "example") {
      var box = document.getElementById("learnIdea");
      if (box) box.value = btn.textContent;
      readText(hooks);
      if (box) box.focus();
      return;
    }
    if (name === "subject") {
      var subject = btn.getAttribute("data-subject");
      journey.hintSubject = subject;
      var field = document.getElementById("learnIdea");
      if (field && !field.value.trim() && SUBJECT_LINE[subject]) field.value = SUBJECT_LINE[subject];
      readText(hooks);
      hooks.paint(false);
      return;
    }
    if (name === "continue") {
      readText(hooks);
      var written = (journey.source.text || "").trim();
      var kept = journey.source && journey.source.filename;
      if (written.length < 12 && !kept) {
        hooks.notice("Add a little more about the lesson, or drop a file.", true);
        hooks.paint(false);
        return;
      }
      if (!knownRoom(journey) && classBook().classes.length > 1) {
        hooks.go("classpick");
        return;
      }
      understand(hooks);
      return;
    }
    if (name === "pick-class") {
      applyRoom(journey, roomOf(btn.getAttribute("data-class")));
      understand(hooks);
      return;
    }
    if (name === "build") {
      buildAdventure(hooks);
      return;
    }
    if (name === "cast-toggle") {
      journey.useClassCharacters = btn.getAttribute("data-value") === "on";
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "undo" && journey.undoPlan) {
      var prev = journey.undoPlan;
      journey.selected = prev.selected;
      journey.plan = prev.plan;
      journey.paceMinutes = prev.paceMinutes;
      journey.playfulness = prev.playfulness;
      journey.deliveryMode = prev.deliveryMode;
      journey.estimateMinutes = prev.estimateMinutes;
      journey.undoPlan = null;
      global.WondiiLearn.upsertLibrary(journey);
      hooks.notice("Change undone.", false);
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "upload") {
      hooks.go("material");
      return;
    }
    if (name === "fresh") {
      picker = "";
      editing = -1;
      var fresh = Learn.blank();
      fresh.uiStep = "idea";
      hooks.set(fresh);
      hooks.save();
      hooks.paint(true);
      return;
    }
    if (name === "resume") {
      if (journey.plan && journey.plan.steps && journey.plan.steps.length) hooks.go("review");
      else understand(hooks);
      return;
    }
    if (name === "read") {
      understand(hooks);
      return;
    }
    if (name === "year") {
      journey.learningMap.yearGroup = btn.getAttribute("data-year");
      journey.learningMap.confidence.yearGroup = "high";
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "pick-subject") {
      journey.learningMap.subject = btn.getAttribute("data-subject");
      journey.learningMap.confidence.subject = "chosen";
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "edit-map") {
      journey.editingMap = !journey.editingMap;
      hooks.paint(false);
      return;
    }
    if (name === "save-map") {
      var map = journey.learningMap;
      map.subject = document.getElementById("editSubject").value;
      map.yearGroup = document.getElementById("editYear").value;
      map.topic = document.getElementById("editTopic").value.trim();
      map.keyVocabulary = document.getElementById("editWords").value.split(",").map(function (word) { return word.trim(); }).filter(Boolean);
      map.learningObjectives = Array.prototype.map.call(document.querySelectorAll("[data-goal]"), function (input) {
        return input.value.trim();
      }).filter(Boolean);
      journey.editingMap = false;
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "propose") {
      propose(hooks);
      return;
    }
    if (name === "jump") {
      var to = btn.getAttribute("data-to");
      if (to === "review" || to === "personal" || to === "adventure") {
        if (!(journey.plan && journey.plan.steps && journey.plan.steps.length)) return;
      }
      hooks.go(to);
      return;
    }
    if (name === "up" || name === "down") {
      var index = Number(btn.getAttribute("data-index"));
      move(hooks, index, name === "up" ? index - 1 : index + 1);
      return;
    }
    if (name === "delete") {
      var at = Number(btn.getAttribute("data-index"));
      if (!global.confirm("Remove this activity?")) return;
      journey.selected.splice(at, 1);
      sync(journey);
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "change" || name === "swap" || name === "add") {
      picker = name === "add" ? "add" : "change";
      journey.pickerIndex = name === "add" ? -1 : Number(btn.getAttribute("data-index"));
      hooks.paint(false);
      return;
    }
    if (name === "close-pick") {
      picker = "";
      hooks.paint(false);
      return;
    }
    if (name === "use") {
      var id = btn.getAttribute("data-activity");
      if (journey.pickerIndex === -1 || picker === "add") journey.selected.push(id);
      else journey.selected.splice(journey.pickerIndex, 1, id);
      picker = "";
      sync(journey);
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "auto") {
      var rec = Learn.recommendations(journey.learningMap).recommended;
      var next = rec.filter(function (id) { return journey.selected.indexOf(id) === -1; })[0] || "quiz";
      if (journey.selected.indexOf(next) === -1) journey.selected.push(next);
      picker = "";
      sync(journey);
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "edit-act") {
      editing = editing === Number(btn.getAttribute("data-index")) ? -1 : Number(btn.getAttribute("data-index"));
      hooks.paint(false);
      return;
    }
    if (name === "save-act") {
      var step = journey.plan.steps[Number(btn.getAttribute("data-index"))];
      step.title = document.getElementById("actTitle").value.trim() || step.title;
      step.summary = document.getElementById("actSummary").value.trim();
      (step.questions || []).forEach(function (question, q) {
        var input = document.querySelector("[data-question=\"" + q + "\"]");
        if (input && input.value.trim()) question.prompt = input.value.trim();
      });
      editing = -1;
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "fit" || name === "refit") {
      var mins = name === "fit" ? Number(btn.getAttribute("data-minutes") || btn.getAttribute("data-value")) : (journey.paceMinutes || 20);
      journey.paceMinutes = mins;
      if (journey.uiStep === "choices") {
        hooks.save();
        hooks.paint(false);
        return;
      }
      journey.selected = Learn.activitiesForTime(mins, journey.learningMap);
      if (mins > 10 && journey.selected.indexOf("exit_ticket") === -1) journey.selected.push("exit_ticket");
      sync(journey);
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "fix") {
      if (journey.selected.indexOf("quiz") === -1) journey.selected.push("quiz");
      sync(journey);
      var check = (journey.plan.steps || []).filter(function (step) { return step.id === "quiz"; })[0];
      if (check) check.questions = Learn.questionsFor(journey.learningMap, 3);
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "to-personal") {
      if (!journey.selected.length) {
        hooks.notice("Keep at least one activity.", true);
        hooks.paint(false);
        return;
      }
      hooks.go("personal");
      return;
    }
    if (name === "cast") {
      var who = btn.getAttribute("data-character");
      if (!journey.characters.heroCharacterId || journey.characters.heroCharacterId === who) journey.characters.heroCharacterId = who;
      else journey.characters.buddyCharacterId = who;
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "cast-auto") {
      journey.characters.heroCharacterId = "alex";
      journey.characters.buddyCharacterId = "fox";
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "delivery") {
      journey.deliveryMode = btn.getAttribute("data-value");
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "play") {
      journey.playfulness = btn.getAttribute("data-value");
      hooks.save();
      hooks.paint(false);
      return;
    }
    if (name === "to-review") {
      publish(hooks);
      hooks.go("review");
      return;
    }
    if (name === "back-acts") {
      hooks.go("adventure");
      return;
    }
    if (name === "preview") {
      publish(hooks);
      location.href = "present.html?journey=" + encodeURIComponent(journey.id) + "&preview=1";
      return;
    }
    if (name === "publish") {
      publish(hooks);
      hooks.go("saved");
    }
  }

  global.WondiiFlow = { handles: handles, view: view, bind: bind };
})(window);
