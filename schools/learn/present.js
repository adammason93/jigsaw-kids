/* Teacher classroom display. Present does not create a pupil session.
   Assign creates a new session and leaves the saved adventure unchanged. */
(function () {
  "use strict";

  var Rooms = window.ClassRooms;
  var root = document.getElementById("classRoot");
  var params = new URLSearchParams(location.search);
  var journeyId = params.get("journey") || "";
  var memoryJourney = null;
  if (!journeyId && params.get("example") === "lights" && window.WondiiLearn && WondiiLearn.openExample) {
    memoryJourney = WondiiLearn.openExample("lights");
    if (memoryJourney) journeyId = memoryJourney.id;
  }
  var sessionCode = (params.get("session") || "").toUpperCase();
  var mode = params.get("assign") === "1" ? "assign" : "present";
  var allowNames = false;
  var confirmEnd = false;
  var journey = null;
  var deviceChoice = "";
  var groupCount = 6;
  var hideJoin = false;
  var usefulReason = false;

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function findJourney() {
    if (!window.WondiiLearn) return null;
    var list = WondiiLearn.allJourneys ? WondiiLearn.allJourneys() : WondiiLearn.visibleLibrary();
    for (var i = 0; i < list.length; i++) if (list[i].id === journeyId) return list[i];
    var draft = WondiiLearn.loadDraft && WondiiLearn.loadDraft();
    if (draft && draft.id === journeyId && draft.plan) return draft;
    if (memoryJourney && memoryJourney.id === journeyId) return memoryJourney;
    return null;
  }

  function session() {
    return sessionCode ? Rooms.get(sessionCode) : null;
  }

  function slidesNow(current) {
    if (current && current.slides && current.slides.length) return current.slides;
    if (journey && journey.plan && journey.plan.slides && journey.plan.slides.length) return journey.plan.slides;
    if (journey && journey.demoElectricity) return Rooms.deck();
    return [];
  }

  function liveQuestion(slide) {
    var question = (slide && Rooms.questionOf(slide)) || Rooms.QUESTION;
    var edits = journey && journey.questionEdits && journey.questionEdits[question.id];
    if (!edits || (slide && slide.question)) return question;
    var copy = JSON.parse(JSON.stringify(question));
    if (edits.prompt) copy.prompt = edits.prompt;
    if (edits.explain) copy.explain = edits.explain;
    if (edits.correct) copy.correct = edits.correct;
    if (edits.choices) copy.choices = edits.choices;
    return copy;
  }

  function paint() {
    journey = findJourney();
    var current = session();
    if (params.get("edit") === "1" && !current) root.innerHTML = viewPreview();
    else if (params.get("preview") === "1" && !current) root.innerHTML = viewStage(null);
    else if (mode === "assign" && !current) root.innerHTML = viewAssign();
    else if (current && current.status === "waiting") root.innerHTML = viewLobby(current);
    else if (current && (current.status === "completed" || current.status === "ended")) root.innerHTML = viewResults(current);
    else if (params.get("preview") === "1" && !current && params.get("play") !== "1") root.innerHTML = viewGate();
    else if (!current && params.get("preview") !== "1") root.innerHTML = viewRoster();
    else if (current && current.mode === "board" && current.board && current.board.phase !== "play") root.innerHTML = viewGate();
    else root.innerHTML = viewStage(current);
    bind();
  }

  function viewAssign() {
    var title = journey && journey.plan ? journey.plan.title : "This adventure";
    var meta = journey ? [journey.learningMap.yearGroup, journey.learningMap.subject, journey.learningMap.topic].filter(Boolean).join(" · ") : "";
    return "<section class=\"class-sheet\"><p class=\"class-kicker\">How are you teaching this?</p><h1>" + escape(title) + "</h1><p class=\"class-lead\">" + escape(meta) + "</p>" +
      "<div class=\"class-modes\">" +
      "<button type=\"button\" class=\"class-mode class-mode--main\" id=\"deviceBoard\"><strong>Whole class</strong><span>Present on your interactive board. Pupils learn, answer and play together.</span></button>" +
      "<button type=\"button\" class=\"class-mode\" id=\"deviceShared\"><strong>Groups</strong><span>Small groups take turns on classroom devices.</span></button>" +
      "<button type=\"button\" class=\"class-mode\" id=\"deviceEach\"><strong>Individual</strong><span>Pupils join with a class code on their own device.</span></button>" +
      "<button type=\"button\" class=\"class-mode\" id=\"deviceAuto\"><strong>Let Wondii decide</strong><span>For a lesson with the class, Wondii uses the board.</span></button>" +
      "</div>" +
      (deviceChoice === "shared" ? "<div class=\"class-card\"><label>How many groups? <input id=\"groupCount\" class=\"class-field\" type=\"number\" min=\"2\" max=\"8\" value=\"" + groupCount + "\" /></label><button type=\"button\" class=\"class-btn\" id=\"startGroups\">Create the teams</button></div>" : "") +
      (deviceChoice === "each" ? "<div class=\"class-card\"><label class=\"class-check\"><input type=\"checkbox\" id=\"allowNames\" /> Let pupils type a first name. Leave this off to use Explorer names only.</label><button type=\"button\" class=\"class-btn\" id=\"modeLive\">Create the join code</button></div>" : "") +
      "<p><a href=\"create.html?library=1\">Back to adventures</a></p></section>";
  }

  function viewLobby(current) {
    var people = current.participants.map(function (person) {
      return "<li>" + escape(person.name) + (person.demo ? "" : "") + " <button type=\"button\" class=\"class-mini\" data-remove=\"" + person.id + "\">Remove</button></li>";
    }).join("");
    var qr = Rooms.qrSvg(Rooms.joinUrl(current.code));
    return "<section class=\"class-sheet\"><p class=\"class-kicker\">Ready to start</p><h1>" + escape(current.title) + "</h1>" +
      "<p class=\"class-lead\">Ask pupils to visit wondii.co.uk/join and enter the code. This is not a link for other teachers.</p>" +
      (current.demo ? "<p class=\"class-note\">Demonstration class. These Explorers are sample pupils, not children in the room.</p>" : "") +
      "<div class=\"class-card\"><p>Join code</p><p class=\"class-code\">" + escape(current.code) + "</p><div class=\"class-qr\">" + qr + "</div>" +
      "<p>" + (current.groupCount ? current.participants.filter(function (person) { return person.claimed; }).length + " of " + current.groupCount + " teams joined" : current.participants.length + " pupils joined") + "</p><ul class=\"class-people\">" + people + "</ul></div>" +
      "<div class=\"class-choices\" style=\"margin-top:1rem\">" +
      "<button type=\"button\" class=\"class-btn\" id=\"startClass\">Start adventure</button>" +
      (current.groupCount ? "" : "<button type=\"button\" class=\"class-ghost\" id=\"demoClass\">Add a demonstration class</button>") +
      "<button type=\"button\" class=\"class-ghost\" id=\"copyCode\">Copy join code</button>" +
      "</div></section>";
  }

  var GIRL_SET = {};
  var BOY_SET = {};
  "sofia sophia sophie sofie emma olivia amelia isla ava mia isabella freya grace poppy lily ella charlotte emily jessica hannah lucy chloe ruby evie eva maya zara aisha fatima noor priya leah alice daisy florence harper willow iris nora anna maria layla lila sienna imogen phoebe matilda rosie esme scarlett violet hazel penelope luna aria amira yasmin hana".split(" ").forEach(function (name) { GIRL_SET[name] = 1; });
  "jack noah oliver liam ethan leo freddie jacob harry george oscar arthur muhammad mohammed ali thomas james william henry alfie theo finley arlo teddy hugo joshua daniel samuel joseph alexander lucas mason logan benjamin jake max adam ryan callum dylan harrison sebastian isaac jonah eli kai omar yusuf hassan ravi arjun ibrahim charlie".split(" ").forEach(function (name) { BOY_SET[name] = 1; });

  function presentationOf(value) {
    var key = String(value || "").trim().split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (GIRL_SET[key]) return "girl";
    if (BOY_SET[key]) return "boy";
    return "";
  }

  function classPupils() {
    var classId = params.get("class") || "";
    if (!classId) return null;
    try {
      var book = JSON.parse(localStorage.getItem("wondii-school-classes") || "null");
      if (!book || !Array.isArray(book.classes)) return null;
      var room = null;
      book.classes.forEach(function (item) { if (item.id === classId) room = item; });
      if (!room || !room.pupils || !room.pupils.length) return null;
      return room.pupils.map(function (pupil) {
        var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
        var who = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : presentationOf(pupil.firstName);
        var length = who === "girl" ? "long" : (who === "boy" ? "short" : (pupil.length === "long" ? "long" : "short"));
        var yearText = String(room.name || "").toLowerCase();
        var yearMatch = yearText.match(/\b(?:year|yr|y)\s*([1-6])(?!\d)/) || yearText.match(/\by([1-6])(?!\d)/);
        var lead = yearText.trim().match(/^([1-6])\s*[a-z]$/i);
        var year = /\breception\b|\bnursery\b/.test(yearText) ? 0 : (yearMatch ? Number(yearMatch[1]) : (lead ? Number(lead[1]) : null));
        var prefix = year === null || year === 4 ? "" : (year <= 1 ? "5-" : (year <= 3 ? "6-" : "10-"));
        return {
          id: pupil.id || "",
          firstName: pupil.firstName,
          portrait: "../../games/images/schools/room/kid-" + prefix + hair + "-" + length + ".webp"
        };
      });
    } catch (e) {
      return null;
    }
  }

  function chosenIds() {
    var classId = params.get("class") || "";
    if (!classId) return null;
    try {
      var saved = JSON.parse(sessionStorage.getItem("wondii-class-pick") || "null");
      if (!saved || saved.classId !== classId || !Array.isArray(saved.ids) || !saved.ids.length) return null;
      return saved.ids;
    } catch (e2) {
      return null;
    }
  }

  function viewRoster() {
    var C = window.Classroom;
    var fromClass = classPupils();
    var names = fromClass ? fromClass.map(function (pupil) { return pupil.firstName; }) : (C ? C.savedNames() : []);
    var rows = (fromClass || names.map(function (name) { return { firstName: name }; })).map(function (pupil, index) {
      var name = pupil.firstName || names[index];
      var picked = chosenIds();
      var inPick = !picked || picked.indexOf(pupil.id) !== -1;
      return "<li data-portrait=\"" + escape(pupil.portrait || "") + "\"><label><input type=\"checkbox\" data-here checked /> " + escape(name) + "</label> <label><input type=\"checkbox\" data-wheel " + (inPick ? "checked" : "") + " /> Can be chosen</label></li>";
    }).join("");
    var year = journey && journey.learningMap ? journey.learningMap.yearGroup : "";
    return "<section class=\"class-sheet\"><p class=\"class-kicker\">Who's playing today?</p><h1>" + escape((journey && journey.plan && journey.plan.title) || "Today's adventure") + "</h1>" +
      "<p class=\"class-lead\">" + escape(year ? year + ". First names only. No one needs to log in." : "First names only. No one needs to log in.") + "</p>" +
      "<ul class=\"class-roster\" id=\"rosterList\">" + rows + "</ul>" +
      "<label class=\"class-lead\" for=\"rosterAdd\">Add a first name</label>" +
      "<div class=\"class-add\"><input id=\"rosterAdd\" maxlength=\"24\" /><button type=\"button\" class=\"class-btn\" id=\"rosterAddBtn\">Add</button></div>" +
      "<h2>Teams</h2><div class=\"class-actions\"><button type=\"button\" class=\"class-mini\" data-teams=\"0\">No teams</button><button type=\"button\" class=\"class-mini\" data-teams=\"2\">2 teams</button><button type=\"button\" class=\"class-mini\" data-teams=\"3\">3 teams</button><button type=\"button\" class=\"class-mini\" data-teams=\"4\">4 teams</button></div>" +
      "<p class=\"class-note\" id=\"teamNote\">Rewards belong to the class, not a public ranking.</p>" +
      "<button type=\"button\" class=\"class-go\" id=\"rosterStart\">Start adventure</button></section>";
  }

  function rosterFromForm() {
    var C = window.Classroom;
    var topic = journey && journey.learningMap ? journey.learningMap.topic : "";
    var board = C.blankBoard(topic, (journey && journey.playfulness) || "playful");
    document.querySelectorAll("#rosterList li").forEach(function (row) {
      var label = row.querySelector("label");
      var name = label ? label.textContent.replace("Can be chosen", "").trim() : "";
      var pupil = C.addPupil(board, name);
      if (!pupil) return;
      var here = row.querySelector("[data-here]");
      var wheel = row.querySelector("[data-wheel]");
      pupil.here = !!(here && here.checked);
      pupil.inWheel = !!(wheel && wheel.checked);
      pupil.portrait = row.getAttribute("data-portrait") || "";
    });
    var typed = document.getElementById("rosterAdd");
    if (typed && typed.value.trim()) C.addPupil(board, typed.value);
    var teamButtons = document.querySelector("[data-teams].is-on");
    var count = teamButtons ? Number(teamButtons.getAttribute("data-teams")) : (window._boardTeams || 0);
    C.makeTeams(board, count);
    board.phase = "gate";
    C.remember(board.roster.map(function (pupil) { return pupil.firstName; }));
    return board;
  }

  function viewGate() {
    var slides = slidesNow(null);
    var title = (journey && journey.plan && journey.plan.title) || (journey && journey.learningMap && journey.learningMap.topic) || "Today's adventure";
    var year = journey && journey.learningMap ? journey.learningMap.yearGroup : "";
    var subject = journey && journey.learningMap ? journey.learningMap.subject : "";
    var scene = null;
    for (var i = 0; i < slides.length; i++) if (slides[i].image) { scene = slides[i]; break; }
    return "<section class=\"class-gate\">" +
      (scene ? "<img src=\"" + scene.image + "\" alt=\"" + escape(scene.alt || "") + "\" />" : "") +
      "<div><p class=\"class-kicker\">" + escape([year, subject].filter(Boolean).join(" · ")) + "</p>" +
      "<h1>" + escape(title) + "</h1>" +
      "<p class=\"class-ready\">" + (year ? "Are you ready, " + escape(year) + "?" : "Are you ready?") + "</p>" +
      "<button type=\"button\" class=\"class-go\" id=\"startAdventure\">Start adventure</button>" +
      "<p><a href=\"present.html?journey=" + encodeURIComponent(journeyId) + "&assign=1\">Other ways to teach</a></p></div></section>";
  }

  function viewStage(current) {
    var slides = slidesNow(current);
    var index = current ? current.slide : Number(params.get("slide") || "0");
    if (!slides.length) {
      return "<section class=\"class-sheet\"><h1>This adventure is not ready to open</h1><p class=\"class-lead\">Go back to the builder and save it while you are signed in. Wondii will not substitute a different lesson.</p><p><a href=\"create.html\">Back to the builder</a></p></section>";
    }
    if (index < 0) index = 0;
    if (index >= slides.length) index = slides.length - 1;
    var slide = slides[index] || slides[0];
    var total = slides.length;
    var localReveal = !current && params.get("reveal") === "1";
    var body = slide.type === "question" ? questionHtml(current, localReveal, slide)
      : slide.type === "done" ? doneHtml(slide)
      : slide.type === "spin" ? spinHtml(slide)
      : slide.type === "mystery" ? mysteryHtml(slide)
      : slide.type === "doors" ? doorsHtml(slide)
      : storyHtml(slide);
    var reveal = current && current.reveal;
    var previewing = params.get("preview") === "1" && !current;
    var board = !current;
    var tools = "<details class=\"class-tools\"><summary>Teacher</summary>" +
      (previewing ? "<p>Preview. This is not saved as a pupil result.</p>" : "") +
      (current && current.mode === "board" ? "<button type=\"button\" id=\"spinSkip\">Another explorer</button>" : "") +
      "<button type=\"button\" id=\"fullScreen\">Full screen</button>" +
      (current ? "<button type=\"button\" id=\"endAsk\">End session</button>" : "<a href=\"" + (previewing ? "create.html" : "create.html?library=1") + "\">Exit</a>") +
      "</details>";
    return "<section class=\"class-present" + (board ? " class-board" : "") + "\">" +
      (board ? "" : "<header><div><p class=\"class-kicker\">Present to class</p><h1>" + escape((current && current.title) || "Lesson") + "</h1></div>" + tools + "</header>") +
      "<div class=\"class-stage\">" + (board ? tools : "") + rewardBar(current) + body + "</div>" +
      "<div class=\"class-bar\"><button type=\"button\" class=\"class-ghost\" id=\"prevSlide\">Previous</button><span class=\"class-count\">" + (index + 1) + " / " + total + (current && slide.type === "question" ? " · " + Rooms.answered(current, (liveQuestion(slide) || Rooms.QUESTION).id) + " answered" : "") + "</span>" +
      (slide.type === "question" && !reveal && !localReveal && !board ? "<button type=\"button\" class=\"class-ghost\" id=\"revealAnswer\">Reveal answer</button>" : "") +
      "<button type=\"button\" class=\"class-btn\" id=\"nextSlide\">" + (index === total - 1 ? "Finish" : "Next") + "</button></div>" +
      (confirmEnd ? "<p class=\"class-note\">End this lesson for everyone? <button type=\"button\" class=\"class-btn\" id=\"endYes\">End session</button> <button type=\"button\" class=\"class-ghost\" id=\"endNo\">Cancel</button></p>" : "") +
      (current && current.mode === "live" && !hideJoin ? "<aside class=\"class-joinchip\"><p>Join</p><strong>" + escape(current.code) + "</strong><p>wondii.co.uk/join</p><button type=\"button\" class=\"class-mini\" id=\"hideJoin\">Hide</button></aside>" : "") +
      "</section>";
  }

  function rewardBar(current) {
    if (!current || current.mode !== "board" || !current.board || current.board.rewards === "none") return "";
    var board = current.board;
    var pips = "";
    var goal = board.rewardGoal || 5;
    for (var i = 0; i < goal; i++) pips += "<i" + (i < board.reward ? " class=\"is-on\"" : "") + "></i>";
    return "<p class=\"class-reward\">" + escape(board.rewardName) + " · " + board.reward + " / " + goal + "</p><p class=\"class-pips\" aria-hidden=\"true\">" + pips + "</p>";
  }

  function spinHtml(slide) {
    var current = session();
    var pupil = current && current.board && window.Classroom ? window.Classroom.byId(current.board, current.board.currentId) : null;
    var face = "";
    if (pupil) {
      var art = pupil.portrait ? { image: pupil.portrait } : window.Classroom.avatar(pupil.avatar);
      face = "<img class=\"class-avatar\" src=\"" + art.image + "\" alt=\"\" /><p class=\"class-copy\">" + escape(pupil.firstName) + "</p>";
    }
    return "<p class=\"class-kicker\">" + escape(slide.kicker || "An explorer's turn") + "</p>" +
      (slide.lines || []).map(function (line) { return "<p class=\"class-copy\">" + escape(line) + "</p>"; }).join("") +
      face + "<button type=\"button\" class=\"class-go\" id=\"spinGo\">Spin for an explorer</button>" +
      (slide.teacherCue ? "<p class=\"class-cue\">" + escape(slide.teacherCue) + "</p>" : "");
  }

  function mysteryHtml(slide) {
    var open = params.get("mystery") === "1";
    var word = journey && journey.learningMap && journey.learningMap.keyVocabulary && journey.learningMap.keyVocabulary[0];
    var fact = word ? "A word from today: " + word + "." : "Keep the idea you have just learned.";
    return "<p class=\"class-kicker\">" + escape(slide.kicker || "A surprise") + "</p><p class=\"class-copy\">" + escape((slide.lines && slide.lines[0]) || "Something from the lesson is waiting.") + "</p>" +
      (open ? "<p class=\"class-react\">" + escape(fact) + "</p>" : "<button type=\"button\" class=\"class-go\" id=\"mysteryGo\">Open it</button>");
  }

  function doorsHtml(slide) {
    var picked = params.get("door") || "";
    var goals = journey && journey.learningMap ? journey.learningMap.learningObjectives || [] : [];
    var line = goals[Number(picked) - 1] || goals[0] || "Today's idea stays with the class.";
    var doors = [1, 2, 3].map(function (n) {
      return "<button type=\"button\" class=\"class-door\" data-door=\"" + n + "\">Door " + n + "</button>";
    }).join("");
    return "<p class=\"class-kicker\">" + escape(slide.kicker || "Pick a door") + "</p><p class=\"class-copy\">The class chooses a door.</p><div class=\"class-doors\">" + doors + "</div>" +
      (picked ? "<p class=\"class-react\">" + escape(line) + "</p>" : "") +
      (slide.teacherCue ? "<p class=\"class-cue\">" + escape(slide.teacherCue) + "</p>" : "");
  }

  function storyHtml(slide) {
    return (slide.image ? "<img src=\"" + slide.image + "\" alt=\"" + escape(slide.alt || "") + "\" />" : "") +
      "<p class=\"class-kicker\">" + escape(slide.kicker || "") + "</p>" +
      (slide.lines || []).map(function (line) { return "<p class=\"class-copy\">" + escape(line) + "</p>"; }).join("") +
      (slide.teacherCue ? "<p class=\"class-cue\">" + escape(slide.teacherCue) + "</p>" : "") +
      (slide.href ? "<p class=\"class-copy\"><a href=\"" + slide.href + "\">Open the circuit board</a></p>" : "");
  }

  function questionHtml(current, localReveal, slide) {
    var q = liveQuestion(slide);
    var shown = (current && current.reveal) || localReveal;
    var counts = current ? Rooms.totals(current, q.id) : { A: 0, B: 0, C: 0 };
    var max = Math.max(1, counts.A, counts.B, counts.C);
    var picked = params.get("pick") || "";
    var choices = q.choices.map(function (choice) {
      var right = shown && choice.id === q.correct;
      var chosen = shown && picked === choice.id;
      return "<button type=\"button\" class=\"class-choice" + (right ? " is-right" : "") + (chosen && !right ? " is-pick" : "") + "\" data-pick=\"" + choice.id + "\"><b>" + choice.id + "</b><span>" + escape(choice.text) + "</span></button>";
    }).join("");
    var bars = shown && current ? "<div class=\"class-bars\">" + q.choices.map(function (choice) {
      var n = counts[choice.id] || 0;
      return "<div><b>" + choice.id + "</b><span><i style=\"width:" + Math.round((n / max) * 100) + "%\"></i></span><b>" + n + "</b></div>";
    }).join("") + "</div>" : "";
    var explain = shown ? "<p class=\"class-react\">" + (picked && picked === q.correct ? "Yes. " : picked ? "Nearly! Let's have another look. " : "") + escape(q.explain) + "</p>" +
      (picked && picked !== q.correct ? "<button type=\"button\" class=\"class-ghost\" id=\"tryAgain\">Try again</button>" : "") : "";
    var cue = !shown && slide && slide.teacherCue ? "<p class=\"class-cue\">" + escape(slide.teacherCue) + "</p>" : "";
    return "<p class=\"class-kicker\">" + escape((slide && slide.kicker) || "Class question") + "</p><p class=\"class-copy\">" + escape(q.prompt) + "</p>" + cue + "<div class=\"class-choices\">" + choices + "</div>" + bars + explain;
  }

  function doneHtml(slide) {
    var lines = (slide && slide.lines) || ["You finished the adventure."];
    var goals = journey && journey.learningMap ? journey.learningMap.learningObjectives || [] : [];
    var board = session();
    var reward = board && board.board ? board.board.reward + " " + board.board.rewardName : "";
    return "<p class=\"class-kicker\">Mission complete</p>" + lines.map(function (line) { return "<p class=\"class-copy\">" + escape(line) + "</p>"; }).join("") +
      (goals.length ? "<h2>What we learned</h2><ul class=\"class-goals\">" + goals.map(function (goal) { return "<li>" + escape(goal) + "</li>"; }).join("") + "</ul>" : "") +
      (reward ? "<p class=\"class-react\">Class reward: " + escape(reward) + "</p>" : "");
  }

  function viewResults(current) {
    var stats = Rooms.summary(current);
    return "<section class=\"class-sheet\"><p class=\"class-kicker\">Session complete</p><h1>" + escape(current.title) + "</h1>" +
      "<p class=\"class-lead\">" + escape(current.yearGroup) + " · " + escape(current.subject) + " · " + escape(current.topic) + "</p>" +
      (current.demo ? "<p class=\"class-note\">Includes a demonstration class. Sample answers are not real pupil records.</p>" : "") +
      "<div class=\"class-card\"><h2>Class understanding</h2>" + (stats.objectives || []).map(function (item) {
        if (item.percent == null) return "<p>" + escape(item.label) + " — no answers yet</p>";
        return "<p>" + escape(item.label) + " — <strong>" + item.percent + "%</strong> correct</p>";
      }).join("") +
      "<p>No pupil is ranked, and nobody is labelled by ability.</p></div>" +
      (function () {
        var low = (stats.objectives || []).filter(function (item) { return item.percent != null && item.percent < 70; })[0];
        if (!low) return "";
        return "<div class=\"class-card\"><h2>Worth a second look</h2><p>Responses suggest <strong>" + escape(low.label) + "</strong> may be worth revisiting.</p>" +
          "<p><a href=\"create.html?follow=" + encodeURIComponent(current.code) + "&kind=recap\">5-minute recap</a> · <a href=\"create.html?follow=" + encodeURIComponent(current.code) + "&kind=starter\">Tomorrow's starter</a></p></div>";
      })() +
      "<div class=\"class-card\"><p>Was this useful?</p><button type=\"button\" class=\"class-mini\" id=\"usefulYes\">Yes</button> <button type=\"button\" class=\"class-mini\" id=\"usefulNo\">Not really</button>" +
      (usefulReason ? "<p><button type=\"button\" class=\"class-mini\" data-reason=\"easy\">Too easy</button> <button type=\"button\" class=\"class-mini\" data-reason=\"hard\">Too difficult</button> <button type=\"button\" class=\"class-mini\" data-reason=\"questions\">Questions were not useful</button> <button type=\"button\" class=\"class-mini\" data-reason=\"time\">Took too long</button></p>" : "") +
      "</div>" +
      "<p><a href=\"create.html?library=1\">Back to the adventure</a> · <a href=\"present.html?journey=" + encodeURIComponent(current.journeyId) + "&assign=1\">Assign again</a></p>" +
      "<p class=\"class-lead\">The saved adventure is unchanged. Assign it again for another class.</p></section>";
  }

  function viewPreview() {
    var slides = slidesNow(null);
    var blocks = slides.map(function (slide) {
      if (slide.type !== "question") {
        return "<section class=\"class-card\"><h2>" + escape(slide.kicker || "Activity") + "</h2>" + (slide.lines || []).map(function (line) { return "<p>" + escape(line) + "</p>"; }).join("") + "</section>";
      }
      var q = liveQuestion(slide);
      return "<section class=\"class-card\" data-qid=\"" + escape(q.id) + "\"><h2>Teacher answers</h2><label>Question<input class=\"class-field\" data-edit=\"prompt\" value=\"" + escape(q.prompt) + "\" /></label>" +
        q.choices.map(function (choice) {
          return "<label>" + choice.id + "<input class=\"class-field\" data-choice=\"" + choice.id + "\" value=\"" + escape(choice.text) + "\" /></label>";
        }).join("") +
        "<p>Correct: " + escape(q.correct) + "</p><label>Explanation<input class=\"class-field\" data-edit=\"explain\" value=\"" + escape(q.explain) + "\" /></label>" +
        (q.draft ? "<p>This question is a draft from the learning objective. Edit it before the lesson. Saving does not call Wondii again.</p>" : "") +
        "</section>";
    }).join("");
    var title = journey && journey.plan ? journey.plan.title : "Preview";
    return "<section class=\"class-sheet\"><p class=\"class-kicker\">Teacher preview</p><h1>" + escape(title) + "</h1><p class=\"class-lead\">Answers stay on this screen. Pupils do not see them until you reveal.</p>" +
      blocks + "<button type=\"button\" class=\"class-btn\" id=\"saveEdits\">Save edits</button> <a class=\"class-btn\" href=\"present.html?journey=" + encodeURIComponent(journeyId) + "\">Start lesson</a></section>";
  }

  function move(delta) {
    var current = session();
    var slides = slidesNow(current);
    if (!current) {
      params.delete("reveal");
      params.delete("pick");
      var index = Number(params.get("slide") || "0") + delta;
      if (index < 0) {
        params.delete("play");
        params.delete("slide");
        history.replaceState(null, "", location.pathname + "?" + params.toString());
        paint();
        return;
      }
      if (index >= slides.length) {
        location.href = "create.html?library=1";
        return;
      }
      params.set("slide", String(index));
      history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
      return;
    }
    var next = current.slide + delta;
    if (next >= slides.length) {
      Rooms.complete(current.code);
      paint();
      return;
    }
    Rooms.setSlide(current.code, next, false);
    paint();
  }

  function bind() {
    var names = document.getElementById("allowNames");
    if (names) names.addEventListener("change", function () { allowNames = names.checked; });
    var board = document.getElementById("deviceBoard");
    var auto = document.getElementById("deviceAuto");
    function openBoard() {
      params.delete("assign");
      params.set("play", "1");
      params.set("slide", "0");
      location.href = "present.html?" + params.toString();
    }
    if (board) board.addEventListener("click", openBoard);
    if (auto) auto.addEventListener("click", openBoard);
    var begin = document.getElementById("startAdventure");
    if (begin) begin.addEventListener("click", function () {
      var current = session();
      if (current && current.mode === "board" && current.board) {
        current.board.phase = "play";
        current.slide = 0;
        Rooms.replace(current);
      } else {
        params.set("play", "1");
        params.set("slide", "0");
        history.replaceState(null, "", location.pathname + "?" + params.toString());
      }
      if (document.documentElement.requestFullscreen) {
        var req = document.documentElement.requestFullscreen();
        if (req && req.catch) req.catch(function () {});
      }
      paint();
    });
    var addName = document.getElementById("rosterAddBtn");
    if (addName) addName.addEventListener("click", function () {
      var input = document.getElementById("rosterAdd");
      var name = window.Classroom ? window.Classroom.firstName(input.value) : "";
      if (!name) return;
      var li = document.createElement("li");
      var here = document.createElement("label");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.setAttribute("data-here", "");
      box.checked = true;
      here.appendChild(box);
      here.appendChild(document.createTextNode(" " + name));
      var wheelLabel = document.createElement("label");
      var wheel = document.createElement("input");
      wheel.type = "checkbox";
      wheel.setAttribute("data-wheel", "");
      wheel.checked = true;
      wheelLabel.appendChild(wheel);
      wheelLabel.appendChild(document.createTextNode(" Can be chosen"));
      li.appendChild(here);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(wheelLabel);
      document.getElementById("rosterList").appendChild(li);
      input.value = "";
    });
    document.querySelectorAll("[data-teams]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-teams]").forEach(function (other) { other.classList.remove("is-on"); });
        btn.classList.add("is-on");
        window._boardTeams = Number(btn.getAttribute("data-teams"));
      });
    });
    var rosterStart = document.getElementById("rosterStart");
    if (rosterStart) rosterStart.addEventListener("click", function () {
      if (!journey || !window.Classroom) return;
      var board = rosterFromForm();
      if (!board.roster.length) return;
      var created = Rooms.createSession(journey, "board", false, { board: board });
      location.href = "present.html?session=" + created.code;
    });
    var spinSkip = document.getElementById("spinSkip");
    if (spinSkip) spinSkip.addEventListener("click", function () {
      var current = session();
      if (!current || !current.board || !window.Classroom) return;
      window.Classroom.skip(current.board);
      Rooms.replace(current);
      paint();
    });
    var spin = document.getElementById("spinGo");
    if (spin) spin.addEventListener("click", function () {
      var current = session();
      if (!current || !current.board || !window.Classroom) return;
      window.Classroom.take(current.board);
      Rooms.replace(current);
      paint();
    });
    var mystery = document.getElementById("mysteryGo");
    if (mystery) mystery.addEventListener("click", function () {
      var current = session();
      params.set("mystery", "1");
      if (current && current.board) {
        Rooms.award(current.code, null, 1, "mystery");
        Rooms.replace(current);
      }
      if (!current) history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
    });
    document.querySelectorAll("[data-door]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        params.set("door", btn.getAttribute("data-door"));
        var current = session();
        if (current && current.board) {
          Rooms.award(current.code, null, 1, "door");
          Rooms.replace(current);
        }
        if (!current) history.replaceState(null, "", location.pathname + "?" + params.toString());
        paint();
      });
    });
    var again = document.getElementById("tryAgain");
    if (again) again.addEventListener("click", function () {
      params.delete("pick");
      params.delete("reveal");
      var current = session();
      if (current) {
        current.reveal = false;
        Rooms.replace(current);
      } else history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
    });
    document.querySelectorAll("[data-pick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        params.set("pick", btn.getAttribute("data-pick"));
        params.set("reveal", "1");
        var current = session();
        if (!current) {
          history.replaceState(null, "", location.pathname + "?" + params.toString());
          paint();
          return;
        }
        if (current.mode === "board" && current.board && window.Classroom) {
          var question = liveQuestion(slidesNow(current)[current.slide] || {});
          if (question && btn.getAttribute("data-pick") === question.correct) Rooms.award(current.code, null, 1, "q-" + current.slide);
          current.reveal = true;
          Rooms.replace(current);
          paint();
          return;
        }
        Rooms.setSlide(current.code, current.slide, true);
        paint();
      });
    });
    var shared = document.getElementById("deviceShared");
    if (shared) shared.addEventListener("click", function () { deviceChoice = "shared"; paint(); });
    var each = document.getElementById("deviceEach");
    if (each) each.addEventListener("click", function () { deviceChoice = "each"; paint(); });
    var groups = document.getElementById("startGroups");
    if (groups) groups.addEventListener("click", function () {
      if (!journey) return;
      var input = document.getElementById("groupCount");
      var count = Math.max(2, Math.min(8, Number(input && input.value) || 6));
      var created = Rooms.createSession(journey, "live", false, { groups: count });
      sessionCode = created.code;
      mode = "live";
      history.replaceState(null, "", "present.html?session=" + created.code);
      paint();
    });
    var hide = document.getElementById("hideJoin");
    if (hide) hide.addEventListener("click", function () { hideJoin = true; paint(); });
    var saveEdits = document.getElementById("saveEdits");
    if (saveEdits) saveEdits.addEventListener("click", function () {
      if (!journey || !window.WondiiLearn) return;
      journey.questionEdits = journey.questionEdits || {};
      document.querySelectorAll("[data-qid]").forEach(function (card) {
        var id = card.getAttribute("data-qid");
        var prompt = card.querySelector("[data-edit=\"prompt\"]");
        var explain = card.querySelector("[data-edit=\"explain\"]");
        var choices = [];
        card.querySelectorAll("[data-choice]").forEach(function (input) {
          choices.push({ id: input.getAttribute("data-choice"), text: input.value });
        });
        journey.questionEdits[id] = {
          prompt: prompt ? prompt.value : "",
          explain: explain ? explain.value : "",
          choices: choices
        };
      });
      if (journey.plan && journey.plan.slides) {
        journey.plan.slides.forEach(function (slide) {
          var edit = slide.question && journey.questionEdits[slide.question.id];
          if (!edit) return;
          if (edit.prompt) slide.question.prompt = edit.prompt;
          if (edit.explain) slide.question.explain = edit.explain;
          if (edit.choices) slide.question.choices = edit.choices;
        });
      }
      WondiiLearn.upsertLibrary(journey);
      WondiiLearn.saveDraft(journey);
    });
    var yes = document.getElementById("usefulYes");
    if (yes) yes.addEventListener("click", function () {
      if (window.WondiiLearn) WondiiLearn.saveUsefulness({ useful: true, code: sessionCode });
    });
    var no = document.getElementById("usefulNo");
    if (no) no.addEventListener("click", function () {
      usefulReason = true;
      if (window.WondiiLearn) WondiiLearn.saveUsefulness({ useful: false, code: sessionCode });
      paint();
    });
    document.querySelectorAll("[data-reason]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.WondiiLearn) WondiiLearn.saveUsefulness({ useful: false, code: sessionCode, reason: btn.getAttribute("data-reason") });
      });
    });
    var live = document.getElementById("modeLive");
    if (live) live.addEventListener("click", function () {
      if (!journey) return;
      var created = Rooms.createSession(journey, "live", allowNames);
      sessionCode = created.code;
      mode = "live";
      history.replaceState(null, "", "present.html?session=" + created.code);
      paint();
    });
    var whole = document.getElementById("modeWhole");
    if (whole) whole.addEventListener("click", function () {
      location.href = "present.html?journey=" + encodeURIComponent(journeyId);
    });
    var demo = document.getElementById("demoClass");
    if (demo) demo.addEventListener("click", function () {
      Rooms.addDemoClass(sessionCode);
      paint();
    });
    var copy = document.getElementById("copyCode");
    if (copy) copy.addEventListener("click", function () {
      var current = session();
      if (current && navigator.clipboard) navigator.clipboard.writeText(current.code);
    });
    document.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Rooms.removeParticipant(sessionCode, btn.getAttribute("data-remove"));
        paint();
      });
    });
    var start = document.getElementById("startClass");
    if (start) start.addEventListener("click", function () {
      Rooms.start(sessionCode);
      paint();
    });
    var prev = document.getElementById("prevSlide");
    if (prev) prev.addEventListener("click", function () { move(-1); });
    var next = document.getElementById("nextSlide");
    if (next) next.addEventListener("click", function () { move(1); });
    var skip = document.getElementById("skipSlide");
    if (skip) skip.addEventListener("click", function () { move(1); });
    var reveal = document.getElementById("revealAnswer");
    if (reveal) reveal.addEventListener("click", function () {
      var current = session();
      if (!current) {
        params.set("reveal", "1");
        history.replaceState(null, "", location.pathname + "?" + params.toString());
        paint();
        return;
      }
      Rooms.setSlide(current.code, current.slide, true);
      paint();
    });
    var endAsk = document.getElementById("endAsk");
    if (endAsk) endAsk.addEventListener("click", function () { confirmEnd = true; paint(); });
    var endNo = document.getElementById("endNo");
    if (endNo) endNo.addEventListener("click", function () { confirmEnd = false; paint(); });
    var endYes = document.getElementById("endYes");
    if (endYes) endYes.addEventListener("click", function () {
      confirmEnd = false;
      Rooms.end(sessionCode);
      paint();
    });
    var full = document.getElementById("fullScreen");
    if (full) full.addEventListener("click", function () {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });
  }

  Rooms.subscribe(paint);
  Rooms.connectCloud(function (message) {
    if (message && sessionCode && message.code === sessionCode) {
      if (message.type === "hello") Rooms.publish(Rooms.get(sessionCode));
      else {
        window.ClassRooms && Rooms.get(sessionCode);
      }
    }
    paint();
  });
  paint();
  window.WondiiPresent = { reload: paint };
})();
