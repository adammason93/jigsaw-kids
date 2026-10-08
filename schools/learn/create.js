/* Teacher builder. The electricity adventure is a prepared demonstration. */
(function () {
  "use strict";

  var Learn = window.WondiiLearn;
  var root = document.getElementById("learnMain");
  var journey = Learn.loadDraft();
  var notice = "";
  var noticeBad = false;
  var params = new URLSearchParams(window.location.search);
  var edited = false;
  window.addEventListener("kids-scorecard-refresh", function () {
    if (edited) return;
    if (params.get("adapt") || params.get("template") || params.get("example") || params.get("follow") || params.get("demo") || params.get("library") || params.get("guided") || params.get("prefs") || params.get("feedback") || params.get("pace") || params.get("custom")) return;
    var again = Learn.loadDraft();
    if (!again || !again.id) return;
    again.uiStep = again.uiStep || "idea";
    journey = again;
    paint(false);
  });
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var shareId = "";

  if (params.get("library") === "1") journey.uiStep = "library";
  else if (params.get("guided") === "1") journey.uiStep = "source";
  else if (params.get("prefs") === "1") journey.uiStep = "prefs";
  else if (params.get("feedback") === "1") journey.uiStep = "feedback";
  else if (params.get("pace") === "1") journey.uiStep = "pace";
  else if (params.get("custom") === "1") journey.uiStep = "source";
  else if (params.get("adapt") && Learn.findJourney) {
    var adaptSource = Learn.findJourney(params.get("adapt"));
    if (adaptSource) {
      journey = JSON.parse(JSON.stringify(adaptSource));
      journey.uiStep = "adapt";
    }
  } else if (params.get("follow") && Learn.makeFollowUp) {
    var followed = Learn.makeFollowUp(params.get("follow"), params.get("kind") || "starter");
    if (followed) journey = followed;
    journey.uiStep = "ready";
  } else if (params.get("example") && Learn.openExample) {
    var opened = Learn.openExample(params.get("example"));
    if (opened) journey = opened;
    journey.uiStep = "ready";
  } else if (params.get("template") && Learn.templateById && Learn.templateById(params.get("template"))) {
    journey = Learn.blank();
    journey.templateId = params.get("template");
    journey.creationMode = "quick";
    journey.uiStep = "quick";
  } else if (params.get("idea") && (!journey.uiStep || journey.uiStep === "idea")) {
    journey.source = journey.source || { type: "paste", filename: "", text: "" };
    journey.source.text = String(params.get("idea")).slice(0, 600);
    journey.uiStep = "idea";
  } else if (params.get("demo") === "1" && !journey.source.text) {
    journey.source.text = Learn.SAMPLE;
    journey.source.type = "paste";
    journey.uiStep = "source";
    Learn.saveDraft(journey);
  } else if (!journey.uiStep || journey.uiStep === "quick" || journey.uiStep === "source" || journey.uiStep === "suggest" || journey.uiStep === "gap" || journey.uiStep === "map" || journey.uiStep === "activities" || journey.uiStep === "existing" || journey.status === "draft") {
    journey.uiStep = "idea";
  }
  if (!journey.uiStep) journey.uiStep = "idea";

  function save() {
    edited = true;
    Learn.saveDraft(journey);
    var el = document.getElementById("learnSave");
    if (!el) return;
    el.textContent = "Saving…";
    window.setTimeout(function () {
      if (el.isConnected) el.textContent = "Saved";
    }, 160);
  }

  function flowHooks() {
    return {
      get: function () { return journey; },
      set: function (next) { journey = next; },
      save: save,
      go: go,
      paint: paint,
      takeFile: takeFile,
      escape: escape,
      note: function () { return { text: notice, bad: noticeBad }; },
      notice: function (text, bad) { notice = text || ""; noticeBad = !!bad; }
    };
  }

  function go(step) {
    journey.uiStep = step;
    notice = "";
    noticeBad = false;
    save();
    paint(true);
  }

  function paint(focus) {
    if (window.WondiiFlow && WondiiFlow.handles(journey.uiStep)) {
      root.classList.toggle("learn-wide", journey.uiStep === "adventure" || journey.uiStep === "review");
      root.innerHTML = WondiiFlow.view(flowHooks());
      WondiiFlow.bind(root, flowHooks());
      if (focus) {
        var head = root.querySelector("h1");
        if (head) {
          head.tabIndex = -1;
          head.focus();
        }
      }
      return;
    }
    root.classList.remove("learn-wide");
    var view = {
      quick: viewQuick,
      suggest: viewSuggest,
      gap: viewGap,
      existing: viewExisting,
      pace: viewPace,
      prefs: viewPrefs,
      adapt: viewAdapt,
      feedback: viewFeedback,
      source: viewSource,
      map: viewMap,
      activities: viewActivities,
      level: viewLevel,
      characters: viewCharacters,
      plan: viewPlan,
      confirm: viewConfirm,
      generating: viewGenerating,
      ready: viewReady,
      library: viewLibrary
    }[journey.uiStep] || viewSource;
    root.innerHTML = view();
    bind();
    if (focus) {
      var head = root.querySelector("h1");
      if (head) {
        head.tabIndex = -1;
        head.focus();
      }
    }
    if (journey.uiStep === "generating") runGenerate();
  }

  var genLock = false;

  function shell(kicker, title, lead, body) {
    return "<p class=\"learn-kicker\">" + kicker + "</p><h1 class=\"learn-title\">" + title + "</h1>" +
      (lead ? "<p class=\"learn-lead\">" + lead + "</p>" : "") + body + live();
  }

  function live() {
    if (!notice) return "";
    return "<p class=\"learn-live" + (noticeBad ? " is-bad" : "") + "\" role=\"status\">" + escape(notice) + "</p>";
  }

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function icon(id) {
    var paths = {
      story: "<path d=\"M5 6.2c2-.9 4.2-.9 6.4.4 2.2-1.3 4.4-1.3 6.4-.4V18c-2-.9-4.2-.9-6.4.4-2.2-1.3-4.4-1.3-6.4-.4z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M11.4 6.6v11.8\" stroke=\"currentColor\" stroke-width=\"1.7\"/>",
      word_search: "<circle cx=\"10\" cy=\"10\" r=\"5.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M14 14.2 18 18\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>",
      quiz: "<circle cx=\"12\" cy=\"12\" r=\"8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M9.2 9.2a2.8 2.8 0 1 1 3.6 2.7c-.7.3-1.2.9-1.2 1.6V14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><circle cx=\"11.6\" cy=\"16.6\" r=\"0.8\" fill=\"currentColor\"/>",
      circuit_game: "<path d=\"M8 7v4H5v2h3v4h2v-4h6v4h2v-4h3v-2h-3V7h-2v4H10V7z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/>",
      stem: "<path d=\"M12 3.5 14 8l5 .6-3.7 3.4.9 4.8L12 14.4 7.8 16.8l.9-4.8L5 8.6 10 8z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/>",
      maths: "<path d=\"M7 7h4M9 5v4M15 8h4M7 16h4M15 15l4 4M19 15l-4 4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>",
      comprehension: "<path d=\"M6 6h12v9H9l-3 3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/>",
      matching: "<path d=\"M8 7h3v3H8zM13 14h3v3h-3zM11 8.5h2.2M13.2 15.5H11\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/>",
      sequencing: "<path d=\"M7 7h10M7 12h10M7 17h10\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>",
      creative: "<path d=\"M12 4.5a4 4 0 0 1 2 7.4V14H10v-2.1A4 4 0 0 1 12 4.5zM10 17h4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/>"
    };
    return "<span class=\"learn-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\">" + (paths[id] || paths.story) + "</svg></span>";
  }

  function yearOptions() {
    var chosen = (journey.learningMap && journey.learningMap.yearGroup) || "";
    return ["<option value=\"\">Choose year group</option>"].concat(Learn.YEAR_GROUPS.map(function (group) {
      return "<option" + (chosen === group ? " selected" : "") + ">" + escape(group) + "</option>";
    })).join("");
  }

  function subjectPopup() {
    if (!journey.askSubject) return "";
    var subjects = Learn.SUBJECTS || ["Maths", "English", "Science", "History", "Geography"];
    return "<div class=\"learn-pop\" role=\"presentation\"><div class=\"learn-pop__card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"learnSubjectTitle\">" +
      "<h2 id=\"learnSubjectTitle\">What subject is this?</h2>" +
      "<p>Wondii couldn't tell from the page. Pick one and the lesson will be made.</p>" +
      "<div class=\"learn-actions\">" + subjects.map(function (subject) {
        return "<button type=\"button\" class=\"learn-btn\" data-act=\"pick-subject\" data-subject=\"" + escape(subject) + "\">" + escape(subject) + "</button>";
      }).join("") + "</div></div></div>";
  }

  function viewQuick() {
    return shell(
      "New lesson",
      "Create a lesson",
      "Upload a page, or describe what you're teaching. Then choose the year and generate.",
      "<div class=\"learn-drop\" id=\"learnDrop\">" +
        "<strong>Upload a page</strong>" +
        "<p>A worksheet, lesson page, PDF, or photo.</p>" +
        "<label class=\"learn-btn\" for=\"learnFile\">Upload a page</label>" +
        "<input class=\"learn-file\" id=\"learnFile\" type=\"file\" accept=\".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*\" />" +
      "</div>" +
      (journey.source.filename ? "<p class=\"learn-note\">Page added: " + escape(journey.source.filename) + "</p>" : "") +
      "<p class=\"learn-or\">or</p>" +
      "<label class=\"learn-label\" for=\"learnText\">Describe the lesson</label>" +
      "<textarea id=\"learnText\" placeholder=\"How a complete circuit makes a bulb light\">" + escape(journey.source.text) + "</textarea>" +
      "<label class=\"learn-label\" for=\"learnYear\">Year group</label>" +
      "<select id=\"learnYear\">" + yearOptions() + "</select>" +
      "<div class=\"learn-actions\">" +
        "<button type=\"button\" class=\"learn-btn\" data-act=\"make\">Generate</button>" +
      "</div>" +
      subjectPopup()
    );
  }

  function viewPace() {
    return shell(
      "Something quick",
      "How much time have you got?",
      "Wondii will pick a short activity for that slot. You can still change it.",
      "<div class=\"learn-actions\">" +
        [5, 10, 20].map(function (minutes) {
          return "<button type=\"button\" class=\"learn-btn\" data-act=\"minutes\" data-minutes=\"" + minutes + "\">" + minutes + " minutes</button>";
        }).join("") +
        "<button type=\"button\" class=\"learn-btn\" data-act=\"minutes\" data-minutes=\"40\">Full lesson</button>" +
      "</div><div class=\"learn-actions\">" +
        ["quick_quiz", "exit_ticket", "starter", "vocabulary"].map(function (id) {
          var template = Learn.templateById(id);
          return "<button type=\"button\" class=\"learn-ghost\" data-act=\"template\" data-template=\"" + id + "\">" + escape(template.title) + "</button>";
        }).join("") +
      "</div>"
    );
  }

  function viewSuggest() {
    var map = journey.learningMap;
    var picks = (journey.selected && journey.selected.length ? journey.selected : Learn.activitiesForTime(journey.paceMinutes || 20, map));
    var minutes = Learn.estimate(picks);
    var yearNote = map.yearFromPreference ? " — from your teaching preference, not from the lesson text" : "";
    return shell(
      "Quick create",
      "I think you're teaching",
      "",
      "<div class=\"learn-card\"><p><strong>" + escape(map.yearGroup || "Year not set") + "</strong>" + escape(yearNote) + "</p>" +
        "<p>" + escape(map.subject || "Subject not set") + "</p><p>" + escape(map.topic || "Topic not set") + "</p>" +
        (map.learningObjectives && map.learningObjectives[0] ? "<p>Learning focus: " + escape(map.learningObjectives[0]) + "</p>" : "") +
        (map.summary ? "<p>" + escape(map.summary) + "</p>" : "") +
        "<ul class=\"learn-list\">" + picks.map(function (id) {
          var item = Learn.activityById(id);
          return "<li><span>" + escape(item ? item.title : id) + "</span></li>";
        }).join("") + "</ul>" +
        "<p class=\"learn-note\">" + escape(Learn.estimateLabel(minutes)) + ". An estimate, not a timer.</p>" +
        (picks.indexOf("story") === -1 ? "<p class=\"learn-note\">No illustrations. This is questions and activities only, so it is ready straight away.</p>" : "<p class=\"learn-note\">A story uses the prepared pictures when this is the electricity adventure. Nothing new is drawn.</p>") +
      "</div>" +
      "<div class=\"learn-actions\">" +
        "<button type=\"button\" class=\"learn-btn\" data-act=\"confirm-quick\">Looks good — create it</button>" +
        "<button type=\"button\" class=\"learn-ghost\" data-act=\"customise\">Customise</button>" +
      "</div>"
    );
  }

  function viewGap() {
    var map = journey.learningMap;
    var missing = Learn.gaps(journey);
    var fields = "";
    if (missing.indexOf("yearGroup") !== -1) {
      fields += "<label class=\"learn-label\" for=\"gapYear\">Year group</label><select id=\"gapYear\">" +
        ["<option value=\"\">Choose</option>"].concat(Learn.YEAR_GROUPS.map(function (group) {
          return "<option>" + group + "</option>";
        })).join("") + "</select>";
    }
    if (missing.indexOf("subject") !== -1) {
      fields += "<label class=\"learn-label\" for=\"gapSubject\">Subject</label><select id=\"gapSubject\"><option value=\"\">Choose</option>" +
        Learn.SUBJECTS.map(function (subject) { return "<option>" + subject + "</option>"; }).join("") + "</select>";
    }
    if (missing.indexOf("topic") !== -1) {
      fields += "<label class=\"learn-label\" for=\"gapTopic\">Topic</label><input id=\"gapTopic\" value=\"" + escape(map.topic) + "\" />";
    }
    var ask = missing[0] === "yearGroup" ? "I couldn't confidently identify the year group." : "One thing is still missing.";
    return shell("Quick create", ask, "You don't need to re-enter anything Wondii already has.", fields +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-act=\"save-gap\">Continue</button></div>");
  }

  function viewExisting() {
    var matches = Learn.matchExisting(journey);
    var cards = matches.map(function (item) {
      var title = item.plan && item.plan.title ? item.plan.title : item.learningMap.topic;
      return "<article class=\"learn-tile\"><strong>" + escape(title) + "</strong><span>" +
        escape(item.createdByLabel || "Already in your library") + " · " + escape(item.learningMap.yearGroup) + " · " + escape(item.learningMap.subject) + "</span>" +
        "<div class=\"learn-actions\">" +
        "<a class=\"learn-btn\" href=\"present.html?journey=" + encodeURIComponent(item.id) + "\">Use with my class</a>" +
        "<a class=\"learn-ghost\" href=\"present.html?journey=" + encodeURIComponent(item.id) + "&preview=1\">Preview</a>" +
        "<a class=\"learn-ghost\" href=\"create.html?adapt=" + encodeURIComponent(item.id) + "\">Adapt a copy</a>" +
        "</div></article>";
    }).join("");
    return shell("Before creating another", "A resource already exists for this topic", "You can use it as it is. Making a new one is still there if you need a different version.",
      cards + "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" data-act=\"make-anyway\">Make a new one anyway</button></div>");
  }

  function viewPrefs() {
    var saved = Learn.prefs();
    var years = ["<option value=\"\">No default</option>"].concat(Learn.YEAR_GROUPS.map(function (group) {
      return "<option" + (saved.yearGroup === group ? " selected" : "") + ">" + group + "</option>";
    })).join("");
    return shell("My teaching preferences", "Defaults, not rules", "Wondii uses these when a lesson doesn't say. You can change them on any adventure.",
      "<label class=\"learn-label\" for=\"prefYear\">Default year group</label><select id=\"prefYear\">" + years + "</select>" +
      "<label class=\"learn-label\" for=\"prefLevel\">Default learning level</label><select id=\"prefLevel\">" +
        ["supported", "expected", "challenge"].map(function (level) {
          return "<option value=\"" + level + "\"" + (saved.level === level ? " selected" : "") + ">" + levelLabel(level) + "</option>";
        }).join("") + "</select>" +
      "<label class=\"learn-label\" for=\"prefMinutes\">Preferred activity length</label><select id=\"prefMinutes\">" +
        [5, 10, 15, 20, 40].map(function (minutes) {
          return "<option value=\"" + minutes + "\"" + (Number(saved.minutes) === minutes ? " selected" : "") + ">" + (minutes === 40 ? "Full lesson" : minutes + " minutes") + "</option>";
        }).join("") + "</select>" +
      "<p class=\"learn-note\">Default adventurers stay Alex and Fox. Whole class is the usual classroom mode. These stay on this browser, for you, not as a school-wide setting.</p>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-act=\"save-prefs\">Save preferences</button></div>");
  }

  function viewAdapt() {
    var title = journey.plan && journey.plan.title ? journey.plan.title : "This adventure";
    var options = [
      ["year", "Different year group"],
      ["support", "Supported version"],
      ["challenge", "More challenging"],
      ["characters", "Different characters"],
      ["activities", "Different activities"],
      ["objective", "Different learning objective"],
      ["else", "Something else"]
    ];
    return shell("Adapt", "What would you like to change?", escape(title) + " stays as it is. This makes your own copy and only marks what would need to be rebuilt.",
      "<div class=\"learn-actions\">" + options.map(function (option) {
        return "<button type=\"button\" class=\"learn-btn\" data-act=\"adapt\" data-change=\"" + option[0] + "\">" + option[1] + "</button>";
      }).join("") + "</div>" +
      (journey.regenNote ? "<p class=\"learn-note\">" + escape(journey.regenNote) + "</p>" : ""));
  }

  function viewFeedback() {
    return shell("Give feedback", "What should we know?", "Idea, problem, something confusing, or a feature request. It stays on this browser for the pilot.",
      "<label class=\"learn-label\" for=\"feedKind\">What is it?</label><select id=\"feedKind\"><option value=\"idea\">Idea</option><option value=\"problem\">Problem</option><option value=\"confusing\">Something confusing</option><option value=\"request\">Feature request</option></select>" +
      "<label class=\"learn-label\" for=\"feedText\">Note</label><textarea id=\"feedText\"></textarea>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-btn\" data-act=\"send-feedback\">Send note</button></div>");
  }

  function startGenerate() {
    var result = Learn.analyse(journey.source.text);
    if (!result.ok) {
      notice = result.message;
      noticeBad = true;
      paint(false);
      return;
    }
    var year = journey.learningMap.yearGroup;
    journey.learningMap = result.learningMap;
    journey.learningMap.yearGroup = year;
    journey.learningMap.confidence.yearGroup = "high";
    journey.learningMap.yearFromPreference = false;
    if (!journey.learningMap.topic) {
      var line = String(journey.source.text || "").split("\n").map(function (part) { return part.trim(); }).filter(Boolean)[0] || "";
      journey.learningMap.topic = line.slice(0, 80) || "Lesson";
    }
    journey.demoElectricity = !!result.demoElectricity;
    journey.provider = "demo";
    journey.creationMode = "quick";
    journey.askSubject = false;
    if (Learn.applyDefaults) Learn.applyDefaults(journey);
    journey.learningMap.yearGroup = year;
    if (!journey.learningMap.subject) {
      journey.askSubject = true;
      notice = "";
      noticeBad = false;
      save();
      paint(false);
      var first = root.querySelector("[data-act=\"pick-subject\"]");
      if (first) first.focus();
      return;
    }
    beginGenerate();
  }

  function beginGenerate() {
    notice = "";
    noticeBad = false;
    journey.askSubject = false;
    if (Learn.finishQuick) Learn.finishQuick(journey);
    journey.generateAt = 0;
    journey.creationMode = "quick";
    save();
    go("generating");
  }

  function applyQuickAnalysis() {
    var result = Learn.analyse(journey.source.text);
    if (!result.ok) {
      notice = result.message;
      noticeBad = true;
      paint(false);
      return;
    }
    journey.learningMap = result.learningMap;
    journey.demoElectricity = !!result.demoElectricity;
    journey.provider = "demo";
    journey.analysisNotice = result.notice;
    journey.creationMode = journey.creationMode || "quick";
    if (Learn.applyDefaults) Learn.applyDefaults(journey);
    if (journey.paceMinutes && Learn.activitiesForTime) journey.selected = Learn.activitiesForTime(journey.paceMinutes, journey.learningMap);
    else if (journey.templateId && Learn.templateById) journey.selected = Learn.templateById(journey.templateId).activities.slice();
    save();
    if (Learn.gaps(journey).length) {
      go("gap");
      return;
    }
    var matches = Learn.matchExisting ? Learn.matchExisting(journey) : [];
    if (matches.length && !journey.skipExisting && !journey.paceMinutes && !journey.templateId) {
      go("existing");
      return;
    }
    go("suggest");
  }

  function viewSource() {
    return shell(
      "Learning adventure",
      "What are we learning today?",
      "Upload something you’re teaching and Wondii will help turn it into stories, games, questions and activities.",
      "<div class=\"learn-drop\" id=\"learnDrop\">" +
        "<strong>Drop your lesson material here</strong>" +
        "<p>PDF, Word, worksheet, lesson notes, image, or a text file.</p>" +
        "<label class=\"learn-btn\" for=\"learnFile\">Choose file</label>" +
        "<input class=\"learn-file\" id=\"learnFile\" type=\"file\" accept=\".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*\" />" +
      "</div>" +
      "<p class=\"learn-or\">or</p>" +
      "<label class=\"learn-label\" for=\"learnText\">Paste your lesson or learning objective</label>" +
      "<textarea id=\"learnText\" placeholder=\"Year 4 Science — understand how a simple electrical circuit works.\">" + escape(journey.source.text) + "</textarea>" +
      "<div class=\"learn-actions\">" +
        "<button type=\"button\" class=\"learn-btn\" id=\"learnAnalyse\">Analyse with Wondii</button>" +
        "<button type=\"button\" class=\"learn-ghost\" id=\"learnSample\">Use the Year 4 electricity sample</button>" +
      "</div>" +
      "<p class=\"learn-note\">This demonstration reads pasted text and .txt files in this browser. It does not upload the file to a school library. PDF, Word and photos need the words pasted as well, until extraction is connected.</p>"
    );
  }

  function viewMap() {
    var map = journey.learningMap;
    var year = map.confidence && map.confidence.yearGroup !== "high";
    var options = "<option value=\"\">Please choose</option>" + Learn.YEAR_GROUPS.map(function (group) {
      return "<option" + (map.yearGroup === group ? " selected" : "") + ">" + group + "</option>";
    }).join("");
    return shell(
      "Learning map",
      "I’ve mapped your lesson",
      journey.analysisNotice || "",
      "<div class=\"learn-card\"><h2>Subject</h2><input class=\"learn-input\" id=\"mapSubject\" value=\"" + escape(map.subject) + "\" /></div>" +
      "<div class=\"learn-card\"><h2>Year group</h2>" +
        (year && !map.yearGroup ? "<p class=\"learn-uncertain\">Please choose a year group. It was not clear from the lesson.</p>" : "") +
        "<label class=\"learn-label\" for=\"mapYear\">Year group</label><select class=\"learn-input\" id=\"mapYear\">" + options + "</select></div>" +
      "<div class=\"learn-card\"><h2>Topic</h2><input class=\"learn-input\" id=\"mapTopic\" value=\"" + escape(map.topic) + "\" /></div>" +
      "<div class=\"learn-card\"><h2>Learning objectives</h2>" + objectiveFields(map) + "</div>" +
      "<div class=\"learn-card\"><h2>Key vocabulary</h2><input class=\"learn-input\" id=\"mapWords\" value=\"" + escape((map.keyVocabulary || []).join(", ")) + "\" /></div>" +
      "<div class=\"learn-card\"><h2>Content source</h2><div class=\"learn-choices\">" +
        groundChoice("source", "Stick closely to my uploaded material", "Use the lesson material as the primary source.") +
        groundChoice("source_plus_supporting", "My material + supporting knowledge", "Use the lesson as the foundation, and add suitable supporting knowledge only where it helps.") +
      "</div></div>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" id=\"learnBack\">Back</button><button type=\"button\" class=\"learn-btn\" id=\"learnMapNext\">Looks good — continue</button></div>"
    );
  }

  function objectiveFields(map) {
    var list = (map.learningObjectives || []).slice();
    while (list.length < 3) list.push("");
    return list.map(function (line, index) {
      return "<label class=\"learn-label\" for=\"obj" + index + "\">Objective " + (index + 1) + "</label><input class=\"learn-input\" id=\"obj" + index + "\" data-obj=\"" + index + "\" value=\"" + escape(line) + "\" />";
    }).join("");
  }

  function groundChoice(id, title, text) {
    var on = journey.learningMap.groundingMode === id;
    return "<button type=\"button\" class=\"learn-choice" + (on ? " is-on" : "") + "\" data-ground=\"" + id + "\" aria-pressed=\"" + on + "\"><strong>" + title + "</strong><span>" + text + "</span></button>";
  }

  function viewActivities() {
    var picks = Learn.recommendations(journey.learningMap);
    return shell(
      "Activities",
      "Build your learning adventure",
      "Choose what you’d like Wondii to create. Recommended activities fit this lesson. You can still change them.",
      "<h2 class=\"learn-kicker\">Recommended</h2><div class=\"learn-grid\">" + picks.recommended.map(card).join("") + "</div>" +
      "<h2 class=\"learn-kicker\" style=\"margin-top:1.2rem\">Available</h2><div class=\"learn-grid\">" + picks.available.map(card).join("") + "</div>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" id=\"learnBack\">Back</button><button type=\"button\" class=\"learn-btn\" id=\"learnActivitiesNext\">Continue</button></div>"
    );
  }

  function card(id) {
    var item = Learn.activityById(id);
    if (!item) return "";
    var on = journey.selected.indexOf(id) !== -1;
    return "<button type=\"button\" class=\"learn-activity" + (on ? " is-on" : "") + "\" data-activity=\"" + id + "\" aria-pressed=\"" + on + "\">" +
      "<span class=\"learn-mark\">" + (on ? "Added" : "Add") + "</span><strong>" + item.title + "</strong><span>" + item.text + "</span></button>";
  }

  function viewLevel() {
    var map = journey.learningMap;
    var options = Learn.YEAR_GROUPS.map(function (group) {
      return "<option" + (map.yearGroup === group ? " selected" : "") + ">" + group + "</option>";
    }).join("");
    return shell(
      "Differentiation",
      "Who is this for?",
      "One level for this demonstration, so Wondii does not generate three adventures at once.",
      "<label class=\"learn-label\" for=\"levelYear\">Year group</label><select class=\"learn-input\" id=\"levelYear\">" + options + "</select>" +
      "<div class=\"learn-levels\" style=\"margin-top:0.8rem\">" +
        levelButton("supported", "Supported", "Shorter sentences, more visual clues, more scaffolding and smaller steps.") +
        levelButton("expected", "Expected", "Age-appropriate vocabulary and the usual curriculum-level challenge.") +
        levelButton("challenge", "Challenge", "Richer vocabulary, more reasoning and less scaffolding.") +
      "</div>" +
      "<p class=\"learn-note\">Creating Supported, Expected and Challenge together is ready in the plan, and switched off here so a demo does not triple the work.</p>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" id=\"learnBack\">Back</button><button type=\"button\" class=\"learn-btn\" id=\"learnLevelNext\">Continue</button></div>"
    );
  }

  function levelButton(id, title, text) {
    var on = journey.learningMap.level === id;
    return "<button type=\"button\" class=\"learn-level" + (on ? " is-on" : "") + "\" data-level=\"" + id + "\" aria-pressed=\"" + on + "\"><strong>" + title + "</strong><span>" + text + "</span></button>";
  }

  function viewCharacters() {
    return shell(
      "Characters",
      "Choose your adventurers",
      "Pick the characters who will bring this lesson to life. These are the same premade Wondii characters used in the prepared adventure.",
      "<div class=\"learn-cast\">" + Learn.CHARACTERS.map(function (person) {
        var role = journey.characters.heroCharacterId === person.id ? "Main" : (journey.characters.buddyCharacterId === person.id ? "Buddy" : "Choose");
        var cls = journey.characters.heroCharacterId === person.id ? " is-hero" : (journey.characters.buddyCharacterId === person.id ? " is-buddy" : "");
        return "<button type=\"button\" class=\"learn-person" + cls + "\" data-character=\"" + person.id + "\">" +
          "<img src=\"" + person.image + "\" alt=\"\" style=\"object-position:" + person.focus + "\" />" +
          "<span>" + person.name + "<small>" + role + "</small></span></button>";
      }).join("") + "</div>" +
      "<p class=\"learn-note\">The first choice is the main character. The second is the buddy. Choose the main character again to clear both. Saved characters and pupil photos are not part of this demonstration.</p>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" id=\"learnBack\">Back</button><button type=\"button\" class=\"learn-btn\" id=\"learnCastNext\">Plan my adventure</button></div>"
    );
  }

  function viewPlan() {
    var plan = journey.plan || { title: "", introduction: "", steps: [] };
    return shell(
      "Journey plan",
      escape(plan.title || "Your adventure"),
      plan.prepared ? "Prepared demonstration plan. You can edit, remove or reorder it before anything is opened." : "Drafted from the learning map you approved. Live planning is not connected yet.",
      "<p class=\"learn-lead\">" + escape(plan.introduction || "") + "</p>" +
      "<ol class=\"learn-path\">" + (plan.steps || []).map(function (step, index) {
        return "<li>" + icon(step.id) + "<div><h3>" + escape(step.title) + "</h3><label class=\"learn-label\" for=\"step" + index + "\">What happens</label><textarea id=\"step" + index + "\" data-step=\"" + index + "\">" + escape(step.summary) + "</textarea></div>" +
          "<div><button type=\"button\" class=\"learn-mini\" data-up=\"" + index + "\">Up</button> <button type=\"button\" class=\"learn-mini\" data-down=\"" + index + "\">Down</button> <button type=\"button\" class=\"learn-mini\" data-remove=\"" + index + "\">Remove</button></div></li>";
      }).join("") + "</ol>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" id=\"learnBack\">Back</button><button type=\"button\" class=\"learn-btn\" id=\"learnConfirm\">Generate adventure</button></div>"
    );
  }

  function viewConfirm() {
    var names = characterNames();
    return shell(
      "Before you generate",
      "You’re about to open",
      journey.demoElectricity ? "This is the prepared Year 4 electricity demonstration. Wondii will not generate a new story or new pictures." : "Live generation is not connected. You can save this plan, and the prepared electricity adventure is the one that can be previewed.",
      "<ul class=\"learn-checks\">" + Learn.generationSummary(journey).map(function (line) {
        return "<li>" + escape(line) + "</li>";
      }).join("") + "</ul>" +
      "<div class=\"learn-card\"><h2>Characters</h2><p>" + escape(names) + "</p><h2>Level</h2><p>" + escape(journey.learningMap.yearGroup) + " — " + escape(levelLabel(journey.learningMap.level)) + "</p></div>" +
      "<div class=\"learn-actions\"><button type=\"button\" class=\"learn-ghost\" id=\"learnBack\">Edit plan</button><button type=\"button\" class=\"learn-btn\" id=\"learnGenerate\">Generate learning adventure</button></div>"
    );
  }

  function viewGenerating() {
    var maths = ((journey.learningMap && journey.learningMap.subject) || "").toLowerCase() === "maths";
    var stages = maths
      ? ["Reading your lesson", "Building number games", "Writing the pop quiz", "Checking the year group", "Getting it ready to start"]
      : ["Reading your lesson", "Writing the story", "Adding a word search", "Writing the pop quiz", "Getting it ready to start"];
    var at = journey.generateAt || 0;
    return shell(
      journey.learningMap.yearGroup + " · " + journey.learningMap.subject,
      maths ? "Making the number games" : "Making the story",
      maths
        ? "Number games and a pop quiz, using the lesson you gave us."
        : "A story from your lesson, then a word search and a pop quiz.",
      "<ul class=\"learn-checks\">" + stages.map(function (stage, index) {
        var cls = index < at ? "" : " class=\"is-wait\"";
        return "<li" + cls + ">" + (index < at ? "Ready — " : "") + stage + "</li>";
      }).join("") + "</ul>"
    );
  }

  function viewReady() {
    var plan = journey.plan || { title: "Learning adventure", steps: [] };
    var preview = journey.demoElectricity && (journey.selected || []).indexOf("story") !== -1
      ? "<a class=\"learn-btn\" href=\"../demo/electricity.html\">Preview as pupil</a>"
      : "";
    var readyLead = journey.plan && journey.plan.slides && journey.plan.slides.length
      ? "This lesson is saved. Start it when the class is ready. It also stays on your school home."
      : (journey.demoElectricity ? "Prepared demonstration. Preview uses the curated electricity journey, not a story created just now." : "Saved in this browser.");
    return shell(
      journey.learningMap.yearGroup + " · " + journey.learningMap.subject + " · " + journey.learningMap.topic,
      escape(plan.title),
      readyLead,
      "<p class=\"learn-note\">" + escape(Learn.estimateLabel ? Learn.estimateLabel(journey.estimateMinutes || (Learn.estimate ? Learn.estimate(journey.selected) : 0)) : "") + ".</p>" +
      (journey.imageWork === false ? "<p class=\"learn-note\">No illustrations were created. Questions and activities are ready now.</p>" : "") +
      (journey.regenNote ? "<p class=\"learn-note\">" + escape(journey.regenNote) + "</p>" : "") +
      (journey.followNote ? "<p class=\"learn-note\">" + escape(journey.followNote) + "</p>" : "") +
      "<div class=\"learn-actions\">" + classActions(journey) + "</div>" +
      "<div class=\"learn-actions\">" +
        "<a class=\"learn-ghost\" href=\"present.html?journey=" + encodeURIComponent(journey.id) + "&preview=1\">Teacher preview</a>" +
        "<button type=\"button\" class=\"learn-ghost\" data-act=\"fav\" data-id=\"" + journey.id + "\">" + (Learn.isFav && Learn.isFav("adventure", journey.id) ? "Favourited" : "Favourite") + "</button>" +
        "<a class=\"learn-ghost\" href=\"create.html?adapt=" + encodeURIComponent(journey.id) + "\">Adapt</a>" +
        "<button type=\"button\" class=\"learn-ghost\" data-act=\"next-year\" data-id=\"" + journey.id + "\">Use next year</button>" +
      "</div>" +
      "<label class=\"learn-label\" for=\"teacherNotes\">Teacher notes</label><textarea id=\"teacherNotes\" placeholder=\"Only you see this. Pupils do not.\">" + escape(journey.teacherNotes || "") + "</textarea>" +
      shareBox(journey.id) +
      pastSessions(journey.id) +
      "<div class=\"learn-tiles\">" + (plan.steps || []).map(function (step) {
        var href = journey.demoElectricity && (journey.selected || []).indexOf("story") !== -1
          ? "../demo/electricity.html"
          : "present.html?journey=" + encodeURIComponent(journey.id) + "&preview=1";
        return "<a class=\"learn-tile\" href=\"" + href + "\"><strong>" + escape(step.title) + "</strong><span>" + escape(step.summary) + "</span></a>";
      }).join("") + "</div>" +
      "<div class=\"learn-actions\">" + preview +
        "<button type=\"button\" class=\"learn-ghost\" id=\"learnSave\">Save to library</button>" +
        "<a class=\"learn-ghost\" href=\"create.html?library=1\">My learning adventures</a>" +
      "</div>" +
      "<p class=\"learn-note\">Edits in Teacher preview are saved as they are. This demonstration does not redraw pictures.</p>"
    );
  }

  function libraryCard(item) {
    var count = item.plan && item.plan.steps ? item.plan.steps.length : item.selected.length;
    var minutes = item.estimateMinutes || (Learn.estimate ? Learn.estimate(item.selected) : 0);
    return "<article class=\"learn-tile\"><strong>" + escape(item.plan && item.plan.title ? item.plan.title : "Untitled adventure") + "</strong><span>" +
      escape(item.learningMap.yearGroup) + " · " + escape(item.learningMap.subject) + " · " + escape(item.learningMap.topic) +
      (item.createdByLabel ? " · " + escape(item.createdByLabel) : "") +
      " · " + count + " activities · " + escape(Learn.estimateLabel ? Learn.estimateLabel(minutes) : "") + "</span>" +
      "<div class=\"learn-actions\">" + classActions(item) + "</div>" + shareBox(item.id) + pastSessions(item.id) +
      "<div class=\"learn-actions\"><a class=\"learn-mini\" href=\"present.html?journey=" + encodeURIComponent(item.id) + "&preview=1\">Teacher preview</a> " +
      "<button type=\"button\" class=\"learn-mini\" data-act=\"fav\" data-id=\"" + item.id + "\">" + (Learn.isFav && Learn.isFav("adventure", item.id) ? "Favourited" : "Favourite") + "</button> " +
      "<a class=\"learn-mini\" href=\"create.html?adapt=" + encodeURIComponent(item.id) + "\">Adapt</a> " +
      "<button type=\"button\" class=\"learn-mini\" data-open=\"" + item.id + "\">Edit</button> <button type=\"button\" class=\"learn-mini\" data-copy=\"" + item.id + "\">Duplicate</button> <button type=\"button\" class=\"learn-mini\" data-archive=\"" + item.id + "\">Archive</button>" +
      (item.demoElectricity ? " <a class=\"learn-mini\" href=\"../demo/electricity.html\">Pupil preview</a>" : "") +
      "</div></article>";
  }

  function viewLibrary() {
    var shelf = params.get("shelf") || "mine";
    var query = (params.get("q") || "").toLowerCase();
    var yearFilter = params.get("year") || "";
    var subjectFilter = params.get("subject") || "";
    function match(item) {
      var blob = [item.plan && item.plan.title, item.learningMap.topic, item.learningMap.subject, item.learningMap.yearGroup].join(" ").toLowerCase();
      if (query && blob.indexOf(query) === -1) return false;
      if (yearFilter && item.learningMap.yearGroup !== yearFilter) return false;
      if (subjectFilter && item.learningMap.subject !== subjectFilter) return false;
      return true;
    }
    var mine = Learn.visibleLibrary().filter(function (item) { return !item.preparedExample; }).filter(match);
    var school = (Learn.schoolShelf ? Learn.schoolShelf() : []).filter(match);
    var recent = (Learn.recentJourneys ? Learn.recentJourneys() : []).filter(match);
    var favouriteIds = Learn.favs ? Learn.favs().adventures : [];
    var favourites = Learn.visibleLibrary().filter(function (item) { return favouriteIds.indexOf(item.id) !== -1; }).filter(match);
    var samples = Learn.preparedSamples ? Learn.preparedSamples() : [];
    var tabs = "<div class=\"learn-actions\">" +
      "<a class=\"learn-mini\" href=\"create.html?library=1&shelf=mine\">My adventures</a>" +
      "<a class=\"learn-mini\" href=\"create.html?library=1&shelf=school\">School library</a>" +
      "<a class=\"learn-mini\" href=\"create.html?library=1&shelf=prepared\">Prepared examples</a>" +
      "</div>";
    var filters = "<form class=\"learn-actions\" id=\"shelfFilters\"><input id=\"shelfQuery\" placeholder=\"Search, for example electricity\" value=\"" + escape(params.get("q") || "") + "\" />" +
      "<select id=\"shelfYear\"><option value=\"\">Year</option>" + Learn.YEAR_GROUPS.map(function (group) {
        return "<option" + (yearFilter === group ? " selected" : "") + ">" + group + "</option>";
      }).join("") + "</select>" +
      "<select id=\"shelfSubject\"><option value=\"\">Subject</option>" + (Learn.SUBJECTS || []).map(function (subject) {
        return "<option" + (subjectFilter === subject ? " selected" : "") + ">" + subject + "</option>";
      }).join("") + "</select><button type=\"submit\" class=\"learn-mini\">Search</button></form>";
    var body = "";
    if (shelf === "school") {
      body = school.length ? school.map(libraryCard).join("") : "<p class=\"learn-lead\">Nothing in the school library on this browser yet. Share with teacher adds an adventure here. It is not sent to another login yet.</p>";
    } else if (shelf === "prepared") {
      body = samples.map(function (sample) {
        return "<article class=\"learn-tile\"><strong>" + escape(sample.title) + "</strong><span>" + escape(sample.meta) + "</span><div class=\"learn-actions\"><a class=\"learn-btn\" href=\"" + sample.href + "\">Open example</a></div></article>";
      }).join("") + "<p class=\"learn-note\">These are prepared examples, not generated each time. A future Wondii Library can sit beside My adventures, Shared with me, and School library. That marketplace is not built.</p>";
    } else {
      body = (recent.length ? "<h2 class=\"learn-title\" style=\"font-size:1.3rem\">Recently used</h2>" + recent.map(libraryCard).join("") : "") +
        (favourites.length ? "<h2 class=\"learn-title\" style=\"font-size:1.3rem\">Your favourites</h2>" + favourites.map(libraryCard).join("") : "") +
        "<h2 class=\"learn-title\" style=\"font-size:1.3rem\">My adventures</h2>" +
        (mine.length ? mine.map(libraryCard).join("") : "<p class=\"learn-lead\">No saved adventures on this browser yet.</p>");
    }
    return shell("Library", shelf === "school" ? "School library" : "My learning adventures", "Use with my class does not copy the adventure. Adapt a copy does.", tabs + filters + body +
      "<div class=\"learn-actions\"><a class=\"learn-btn\" href=\"create.html\">Quick create</a> <a class=\"learn-ghost\" href=\"create.html?guided=1\">Guided create</a></div>");
  }

  function classActions(item) {
    var id = encodeURIComponent(item.id);
    return "<a class=\"learn-btn\" href=\"present.html?journey=" + id + "\">Start with class</a>" +
      "<a class=\"learn-ghost\" href=\"present.html?journey=" + id + "&assign=1\">Groups or devices</a>" +
      "<button type=\"button\" class=\"learn-ghost\" data-share=\"" + item.id + "\">Share with teacher</button>";
  }

  function shareBox(id) {
    if (shareId !== id) return "";
    return "<div class=\"learn-card\"><h2>Share with a teacher</h2><p>This puts the saved adventure in your school library so a colleague on this browser can use it. It does not create a class code, and pupils cannot join from it.</p><button type=\"button\" class=\"learn-btn\" data-act=\"school\" data-id=\"" + id + "\">Add to school library</button><p class=\"learn-note\">Sending it to another teacher’s login is not connected yet.</p></div>";
  }

  function pastSessions(id) {
    if (!window.ClassRooms) return "";
    var list = ClassRooms.forJourney(id);
    if (!list.length) return "";
    return "<div class=\"learn-card\"><h2>Past sessions</h2><ul class=\"learn-list\">" + list.map(function (item) {
      var when = item.createdAt ? item.createdAt.slice(0, 10) : "";
      return "<li><span>" + escape(when) + " · " + escape(item.code) + " · " + item.participants.length + " joined · " + escape(item.status) + "</span></li>";
    }).join("") + "</ul><p class=\"learn-note\">Each session is one use of the adventure. Assigning again starts a new one.</p></div>";
  }

  function levelLabel(id) {
    return { supported: "Supported", expected: "Expected", challenge: "Challenge" }[id] || "Expected";
  }

  function characterNames() {
    var hero = Learn.CHARACTERS.filter(function (person) { return person.id === journey.characters.heroCharacterId; })[0];
    var buddy = Learn.CHARACTERS.filter(function (person) { return person.id === journey.characters.buddyCharacterId; })[0];
    if (hero && buddy) return hero.name + " + " + buddy.name;
    if (hero) return hero.name;
    return "Not chosen yet";
  }

  function readMapFromForm() {
    var subject = document.getElementById("mapSubject");
    var year = document.getElementById("mapYear");
    var topic = document.getElementById("mapTopic");
    var words = document.getElementById("mapWords");
    if (subject) journey.learningMap.subject = subject.value.trim();
    if (year) {
      journey.learningMap.yearGroup = year.value;
      if (year.value) journey.learningMap.confidence.yearGroup = "high";
    }
    if (topic) journey.learningMap.topic = topic.value.trim();
    if (words) {
      journey.learningMap.keyVocabulary = words.value.split(",").map(function (word) { return word.trim(); }).filter(Boolean);
    }
    journey.learningMap.learningObjectives = Array.prototype.map.call(document.querySelectorAll("[data-obj]"), function (input) {
      return input.value.trim();
    }).filter(Boolean);
  }

  function bind() {
    var file = document.getElementById("learnFile");
    var drop = document.getElementById("learnDrop");
    var text = document.getElementById("learnText");
    if (text) {
      text.addEventListener("input", function () {
        journey.source.text = text.value;
        journey.source.type = journey.source.filename ? journey.source.type : "paste";
        save();
      });
    }
    var yearPick = document.getElementById("learnYear");
    if (yearPick) {
      yearPick.addEventListener("change", function () {
        journey.learningMap.yearGroup = yearPick.value;
        save();
      });
    }
    if (file) file.addEventListener("change", function () { takeFile(file.files[0]); });
    var photo = document.getElementById("learnPhoto");
    if (photo) photo.addEventListener("change", function () { takeFile(photo.files[0]); });
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
        takeFile(event.dataTransfer.files[0]);
      });
    }
    var sample = document.getElementById("learnSample");
    if (sample) sample.addEventListener("click", function () {
      journey.source.text = Learn.SAMPLE;
      journey.source.filename = "year-4-electricity.txt";
      journey.source.type = "sample";
      save();
      paint(false);
      var box = document.getElementById("learnText");
      if (box) box.focus();
    });
    var analyse = document.getElementById("learnAnalyse");
    if (analyse) analyse.addEventListener("click", function () {
      var result = Learn.analyse(journey.source.text);
      if (!result.ok) {
        notice = result.message;
        noticeBad = true;
        paint(false);
        return;
      }
      journey.learningMap = result.learningMap;
      journey.demoElectricity = !!result.demoElectricity;
      journey.provider = "demo";
      journey.analysisNotice = result.notice;
      journey.status = "map_ready";
      if (journey.demoElectricity) {
        journey.characters.heroCharacterId = journey.characters.heroCharacterId || "alex";
        journey.characters.buddyCharacterId = journey.characters.buddyCharacterId || "fox";
        journey.selected = Learn.recommendations(journey.learningMap).recommended.slice();
      }
      go("map");
    });
    document.querySelectorAll("[data-ground]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        journey.learningMap.groundingMode = btn.getAttribute("data-ground");
        save();
        paint(false);
      });
    });
    document.querySelectorAll("[data-activity]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-activity");
        var at = journey.selected.indexOf(id);
        if (at === -1) journey.selected.push(id);
        else journey.selected.splice(at, 1);
        save();
        paint(false);
        var again = root.querySelector("[data-activity=\"" + id + "\"]");
        if (again) again.focus();
      });
    });
    document.querySelectorAll("[data-level]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        journey.learningMap.level = btn.getAttribute("data-level");
        save();
        paint(false);
      });
    });
    document.querySelectorAll("[data-character]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-character");
        if (!journey.characters.heroCharacterId || journey.characters.heroCharacterId === id) {
          if (journey.characters.heroCharacterId === id) {
            journey.characters.heroCharacterId = "";
            journey.characters.buddyCharacterId = "";
          } else journey.characters.heroCharacterId = id;
        } else if (journey.characters.buddyCharacterId === id) {
          journey.characters.buddyCharacterId = "";
        } else journey.characters.buddyCharacterId = id;
        save();
        paint(false);
      });
    });
    var mapNext = document.getElementById("learnMapNext");
    if (mapNext) mapNext.addEventListener("click", function () {
      readMapFromForm();
      var issues = Learn.validateMap(journey.learningMap);
      if (issues.length) {
        notice = issues[0];
        noticeBad = true;
        save();
        paint(false);
        return;
      }
      journey.status = "map_ready";
      go("activities");
    });
    var actNext = document.getElementById("learnActivitiesNext");
    if (actNext) actNext.addEventListener("click", function () {
      if (!journey.selected.length) {
        notice = "Choose at least one activity.";
        noticeBad = true;
        paint(false);
        return;
      }
      go("level");
    });
    var levelNext = document.getElementById("learnLevelNext");
    if (levelNext) levelNext.addEventListener("click", function () {
      var year = document.getElementById("levelYear");
      if (year) journey.learningMap.yearGroup = year.value;
      go("characters");
    });
    var castNext = document.getElementById("learnCastNext");
    if (castNext) castNext.addEventListener("click", function () {
      if (!journey.characters.heroCharacterId) {
        notice = "Choose a main character.";
        noticeBad = true;
        paint(false);
        return;
      }
      journey.plan = Learn.planFor(journey);
      journey.status = "plan_ready";
      go("plan");
    });
    document.querySelectorAll("[data-step]").forEach(function (box) {
      box.addEventListener("input", function () {
        var index = Number(box.getAttribute("data-step"));
        if (journey.plan && journey.plan.steps[index]) journey.plan.steps[index].summary = box.value;
        save();
      });
    });
    document.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var index = Number(btn.getAttribute("data-remove"));
        var step = journey.plan.steps[index];
        journey.plan.steps.splice(index, 1);
        journey.selected = journey.selected.filter(function (id) { return id !== step.id; });
        save();
        paint(false);
      });
    });
    document.querySelectorAll("[data-up], [data-down]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var index = Number(btn.getAttribute("data-up") || btn.getAttribute("data-down"));
        var next = btn.hasAttribute("data-up") ? index - 1 : index + 1;
        var steps = journey.plan.steps;
        if (next < 0 || next >= steps.length) return;
        var swap = steps[index];
        steps[index] = steps[next];
        steps[next] = swap;
        save();
        paint(false);
      });
    });
    var confirm = document.getElementById("learnConfirm");
    if (confirm) confirm.addEventListener("click", function () {
      var issues = Learn.validatePlan(journey);
      if (issues.length) {
        notice = issues[0];
        noticeBad = true;
        paint(false);
        return;
      }
      go("confirm");
    });
    var generate = document.getElementById("learnGenerate");
    if (generate) generate.addEventListener("click", function () {
      journey.generateAt = 0;
      journey.status = "generating";
      go("generating");
    });
    var back = document.getElementById("learnBack");
    if (back) back.addEventListener("click", function () {
      var order = ["source", "map", "activities", "level", "characters", "plan", "confirm"];
      var at = order.indexOf(journey.uiStep);
      go(order[Math.max(0, at - 1)]);
    });
    var keep = document.getElementById("learnSave");
    if (keep) keep.addEventListener("click", function () {
      journey.status = "ready";
      Learn.upsertLibrary(journey);
      notice = "Saved in this browser.";
      paint(false);
    });
    document.querySelectorAll("[data-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-open");
        var found = Learn.visibleLibrary().filter(function (item) { return item.id === id; })[0];
        if (!found) return;
        journey = found;
        go(found.plan ? "plan" : "map");
      });
    });
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var copy = Learn.duplicate(btn.getAttribute("data-copy"));
        if (!copy) return;
        journey = copy;
        go("level");
      });
    });
    document.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        shareId = shareId === btn.getAttribute("data-share") ? "" : btn.getAttribute("data-share");
        paint(false);
      });
    });
    document.querySelectorAll("[data-archive]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Learn.archive(btn.getAttribute("data-archive"));
        paint(false);
      });
    });
  }

  function takeFile(file) {
    Learn.readFile(file).then(function (result) {
      journey.source.filename = result.filename;
      journey.source.type = result.type;
      if (result.needsPaste) {
        journey.source.needsPaste = true;
        notice = "File kept with the lesson. Paste the important lines so Wondii can read them.";
        noticeBad = false;
        save();
        paint(false);
        return;
      }
      journey.source.needsPaste = false;
      journey.source.text = result.text;
      notice = "Text added.";
      noticeBad = false;
      save();
      paint(false);
    }).catch(function (err) {
      notice = err.message || "That file could not be used.";
      noticeBad = true;
      paint(false);
    });
  }

  function runGenerate() {
    if (genLock) return;
    genLock = true;
    function tick() {
      journey.generateAt = (journey.generateAt || 0) + 1;
      if (journey.generateAt < 5) {
        save();
        paint(false);
        window.setTimeout(tick, reduced ? 0 : 650);
        return;
      }
      genLock = false;
      journey.status = "ready";
      journey.creationMode = journey.creationMode || "guided";
      journey.uiStep = "ready";
      if (!journey.estimateMinutes && Learn.estimate) journey.estimateMinutes = Learn.estimate(journey.selected);
      Learn.upsertLibrary(journey);
      if (Learn.touchRecent) Learn.touchRecent(journey.id);
      save();
      paint(true);
    }
    window.setTimeout(tick, reduced ? 0 : 650);
  }

  function parkExample() {
    if (!Learn.ensureSchoolExample) return;
    var orgId = "";
    try {
      var view = window.WondiiOrg && window.WondiiOrg.get && window.WondiiOrg.get();
      orgId = view && view.organisation && view.organisation.id ? view.organisation.id : "";
    } catch (e) {}
    Learn.ensureSchoolExample(orgId);
  }

  root.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-act]");
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    if (act === "template") {
      journey = Learn.blank();
      journey.templateId = btn.getAttribute("data-template");
      journey.creationMode = "quick";
      journey.uiStep = "quick";
      save();
      paint(true);
      return;
    }
    if (act === "minutes") {
      journey.paceMinutes = Number(btn.getAttribute("data-minutes")) || 5;
      journey.creationMode = "quick";
      journey.uiStep = "quick";
      save();
      paint(true);
      return;
    }
    if (act === "make") {
      var typed = document.getElementById("learnText");
      var yearPick = document.getElementById("learnYear");
      if (typed) journey.source.text = typed.value;
      if (yearPick) journey.learningMap.yearGroup = yearPick.value;
      if (!journey.learningMap.yearGroup) {
        notice = "Choose the year group.";
        noticeBad = true;
        paint(false);
        return;
      }
      if ((journey.source.text || "").trim().length < 8 && !journey.source.filename) {
        notice = "Upload a page or describe the lesson.";
        noticeBad = true;
        paint(false);
        return;
      }
      if ((journey.source.text || "").trim().length < 8 && journey.source.filename) {
        journey.source.text = "Lesson page: " + journey.source.filename.replace(/\.[^.]+$/, "");
      }
      startGenerate();
      return;
    }
    if (act === "pick-subject") {
      journey.learningMap.subject = btn.getAttribute("data-subject") || "";
      if (journey.learningMap.confidence) journey.learningMap.confidence.subject = "high";
      journey.askSubject = false;
      beginGenerate();
      return;
    }
    if (act === "customise") {
      journey.creationMode = params.get("custom") === "1" ? "custom" : "guided";
      journey.uiStep = journey.learningMap && journey.learningMap.topic ? "map" : "source";
      save();
      paint(true);
      return;
    }
    if (act === "save-gap") {
      var year = document.getElementById("gapYear");
      var subject = document.getElementById("gapSubject");
      var topic = document.getElementById("gapTopic");
      if (year && year.value) {
        journey.learningMap.yearGroup = year.value;
        journey.learningMap.confidence.yearGroup = "high";
        journey.learningMap.yearFromPreference = false;
      }
      if (subject && subject.value) journey.learningMap.subject = subject.value;
      if (topic) journey.learningMap.topic = topic.value.trim();
      save();
      if (Learn.gaps(journey).length) {
        paint(false);
        return;
      }
      var matches = Learn.matchExisting ? Learn.matchExisting(journey) : [];
      go(matches.length && !journey.skipExisting && !journey.paceMinutes && !journey.templateId ? "existing" : "suggest");
      return;
    }
    if (act === "make-anyway") {
      journey.skipExisting = true;
      go("suggest");
      return;
    }
    if (act === "confirm-quick") {
      Learn.finishQuick(journey);
      journey = Learn.loadDraft();
      journey.uiStep = "ready";
      paint(true);
      return;
    }
    if (act === "save-prefs") {
      var current = Learn.prefs();
      current.yearGroup = document.getElementById("prefYear").value;
      current.level = document.getElementById("prefLevel").value;
      current.minutes = Number(document.getElementById("prefMinutes").value) || 15;
      Learn.savePrefs(current);
      notice = "Saved. The next adventure can use these when the lesson doesn't say.";
      noticeBad = false;
      paint(false);
      return;
    }
    if (act === "adapt") {
      var copy = Learn.adaptCopy(params.get("adapt"), btn.getAttribute("data-change"));
      if (!copy) return;
      journey = copy;
      var change = btn.getAttribute("data-change");
      if (change === "characters") go("characters");
      else if (change === "activities") go("activities");
      else if (change === "year" || change === "objective") go("map");
      else go("ready");
      return;
    }
    if (act === "fav") {
      Learn.toggleFav("adventure", btn.getAttribute("data-id"));
      paint(false);
      return;
    }
    if (act === "school") {
      Learn.shareToSchool(btn.getAttribute("data-id"));
      notice = "Added to the school library on this browser.";
      noticeBad = false;
      paint(false);
      return;
    }
    if (act === "next-year") {
      var next = Learn.useNextYear(btn.getAttribute("data-id"));
      if (!next) return;
      journey = next;
      journey.uiStep = "ready";
      paint(true);
      return;
    }
    if (act === "send-feedback") {
      Learn.saveFeedback({
        kind: document.getElementById("feedKind").value,
        text: document.getElementById("feedText").value
      });
      notice = "Saved on this browser. It is not sent to a server yet.";
      noticeBad = false;
      paint(false);
    }
  });

  root.addEventListener("input", function (event) {
    if (event.target && event.target.id === "teacherNotes") {
      journey.teacherNotes = event.target.value;
      save();
      Learn.upsertLibrary(journey);
    }
  });

  root.addEventListener("submit", function (event) {
    if (!event.target || event.target.id !== "shelfFilters") return;
    event.preventDefault();
    var next = new URLSearchParams(location.search);
    next.set("library", "1");
    next.set("q", document.getElementById("shelfQuery").value);
    next.set("year", document.getElementById("shelfYear").value);
    next.set("subject", document.getElementById("shelfSubject").value);
    location.href = "create.html?" + next.toString();
  });

  if (params.get("class")) journey.classId = params.get("class");
  parkExample();
  if (window.WondiiOrg && window.WondiiOrg.subscribe) window.WondiiOrg.subscribe(parkExample);
  paint(false);
  window.WondiiCreate = {
    go: go,
    set: function (next) { journey = next; paint(false); }
  };
})();
