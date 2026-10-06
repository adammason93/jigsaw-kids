/* Classroom presentation. Reads WondiiSessionEngine. Does not score or advance on its own. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiLessonShell = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var ui = {
    menu: false,
    help: false,
    end: false,
    transition: null,
    moment: null,
    seenPupil: "",
    bump: null,
    feedback: null,
    entered: false,
    celebrate: false,
    sound: false,
    play: null
  };
  var audioCtx = null;
  var lastRoot = null;
  var lastModel = null;
  var momentTimer = null;
  var bumpTimer = null;

  function escape(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function reduced() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function activityName(mechanic) {
    var names = {
      story: "Story", quiz: "Quiz", question: "Quiz", spin: "Spin", mystery: "Mystery",
      doors: "Pick a door", "word-search": "Word search", word_search: "Word search", done: "Finish", complete: "Finish"
    };
    return names[mechanic] || "Activity";
  }

  function slideMechanic(slide) {
    if (!slide) return "story";
    if (slide.type === "question" || slide.type === "quiz" || slide.type === "boolean" || slide.type === "true_false") return "quiz";
    if (slide.type === "word-search" || slide.type === "word_search") return "word_search";
    return slide.type || "story";
  }

  function engineOf(view) {
    return view && view.engine ? view.engine : null;
  }

  function scoreMode(view) {
    var engine = engineOf(view);
    if (!engine || engine.teamMode === "none" || !engine.teams || !engine.teams.length) return "class";
    return engine.teamMode;
  }

  function screenFor(view, state, flags) {
    state = state || {};
    flags = flags || {};
    if (flags.edit) return "edit";
    if (!view) return flags.preview ? "stage" : "roster";
    var status = view.engineStatus || view.status;
    if (state.recover !== false && !state.entered && (status === "active" || status === "paused") && flags.offerRecover) return "recover";
    if (status === "recoverable_error") return "error";
    if (status === "completed") return "complete";
    if (status === "ended") return "ended";
    if (status === "waiting" && view.mode === "live") return "join";
    if (status === "waiting" || (view.mode === "board" && view.board && view.board.phase !== "play" && status !== "active")) return "ready";
    if (state.transition) return "transition";
    if (status === "paused") return "paused";
    return "stage";
  }

  function helpText(mechanic) {
    var copy = {
      story: "Read this part together. Next moves the class on.",
      quiz: "Choose an answer, then reveal it to the class.",
      question: "Choose an answer, then reveal it to the class.",
      spin: "Choose a pupil at random from today's participants.",
      mystery: "Open it when the class is ready, then continue.",
      doors: "The class picks one door. The idea is for everyone.",
      "word-search": "Drag across a word to find it in the grid.",
      word_search: "Drag across a word to find it in the grid."
    };
    return copy[mechanic] || "Next moves to the following activity. Pause keeps the lesson where it is.";
  }

  function teamLabel(team, index) {
    var name = team.name || "Team";
    var known = { Red: "red", Blue: "blue", Teacher: "teacher", Class: "class" };
    var tone = known[name] || ["red", "blue", "gold", "green"][index % 4];
    return { name: name, tone: tone };
  }

  function adventureNow(model) {
    var visuals = globalThis.WondiiVisuals;
    if (visuals && visuals.active && visuals.active()) return true;
    return !!(model && model.visualAssets && model.visualAssets.length);
  }

  function scoresHtml(view) {
    var engine = engineOf(view);
    var mode = scoreMode(view);
    if (adventureNow() && (!engine || mode === "class")) return "";
    if (!engine || mode === "class") {
      var total = engine ? engine.rewardTotal : (view && view.board ? view.board.reward : 0);
      var reward = (view && view.board && view.board.rewardName) || "Class reward";
      var bump = ui.bump && !ui.bump.teamId ? "<i class=\"lesson-plus\">+" + ui.bump.amount + "</i>" : "";
      return "<div class=\"lesson-score lesson-score--class" + (bump ? " is-up" : "") + "\"><span>" + escape(reward) + "</span><strong>" + total + "</strong>" + bump + "</div>";
    }
    return "<div class=\"lesson-scoreboard\">" + engine.teams.map(function (team, index) {
      var label = teamLabel(team, index);
      var up = ui.bump && ui.bump.teamId === team.id;
      return "<div class=\"lesson-score lesson-score--" + label.tone + (up ? " is-up" : "") + "\"><span>" + escape(label.name) + " team</span><strong>" + team.points + "</strong>" +
        (up ? "<i class=\"lesson-plus\">+" + ui.bump.amount + "</i>" : "") + "</div>";
    }).join("") + "</div>";
  }

  function missionStep(slide) {
    if (slide && slide.sceneId && slide.sceneLabel) return slide.sceneLabel;
    return {
      beginning: "Arrival",
      goal: "Mission",
      development: "Look",
      discovery: "Discovery",
      application: "Try it",
      resolution: "Home",
      debrief: "Recap"
    }[slide && slide.beat] || "Step";
  }

  function progressHtml(slides, index, adventure) {
    // Story-led lessons split a long story scene over several slides; those slides share a
    // progressGroup and show as one step, so the header stays short. Other lessons are unchanged.
    if ((slides || []).some(function (slide) { return slide && slide.progressGroup; })) {
      var groups = [];
      slides.forEach(function (slide, i) {
        var key = (slide && slide.progressGroup) || ("slide-" + i);
        var last = groups[groups.length - 1];
        if (last && last.key === key) last.end = i;
        else groups.push({ key: key, start: i, end: i, name: (slide && (slide.progressLabel || missionStep(slide))) || "Step" });
      });
      return "<ol class=\"lesson-progress lesson-progress--grouped\">" + groups.map(function (g) {
        var state = g.end < index ? "is-done" : (index >= g.start && index <= g.end) ? "is-now" : "";
        return "<li class=\"" + state + "\"><span>" + escape(g.name) + "</span></li>";
      }).join("") + "</ol>";
    }
    return "<ol class=\"lesson-progress\">" + (slides || []).map(function (slide, i) {
      var name = adventure || (slide && slide.sceneId) ? missionStep(slide) : ((slide && slide.kicker) || activityName(slideMechanic(slide)));
      var state = i < index ? "is-done" : i === index ? "is-now" : "";
      return "<li class=\"" + state + "\"><span>" + escape(name) + "</span></li>";
    }).join("") + "</ol>";
  }

  function topHtml(model, slides, index, statusText) {
    var org = model.orgName ? "<p class=\"lesson-school\">" +
      (model.orgLogo ? "<img src=\"" + escape(model.orgLogo) + "\" alt=\"\" />" : "") +
      "<span>" + escape(model.orgName) + "</span></p>" : "";
    var count = "";
    if (model.view && model.view.mode === "live" && model.joined != null) {
      count = "<p class=\"lesson-joined\">" + model.joined + " joined</p>";
    }
    var heading = escape(model.title || "Lesson");
    if (adventureNow(model)) {
      var mission = (model.storyPlan && (model.storyPlan.missionLabel || model.storyPlan.mission)) || model.title || "The mission";
      heading = escape(mission);
    }
    var grouped = (slides || []).some(function (slide) { return slide && slide.progressGroup; });
    return "<header class=\"lesson-top" + (grouped ? " lesson-top--story" : "") + "\"><div class=\"lesson-brand\"><p class=\"lesson-mark\">Wondii</p>" + org + "</div>" +
      "<div class=\"lesson-top-main\">" + (adventureNow(model) ? "<p class=\"lesson-kicker\">Mission</p>" : "") + "<h1>" + heading + "</h1>" +
      progressHtml(slides, index, adventureNow(model)) + "</div>" +
      "<div class=\"lesson-top-side\"><p class=\"lesson-round\">" + (slides.length ? ("Round " + (index + 1) + " of " + slides.length) : "") + "</p>" +
      (statusText ? "<p class=\"lesson-status\">" + escape(statusText) + "</p>" : "") + count + "</div></header>";
  }

  function dockHtml(primary, menuOpen) {
    return "<footer class=\"lesson-dock\"><div class=\"lesson-dock-scores\" id=\"lessonScores\"></div><div class=\"lesson-dock-actions\">" +
      (primary ? "<button type=\"button\" class=\"lesson-go\" id=\"lessonPrimary\">" + escape(primary) + "</button>" : "") +
      "<button type=\"button\" class=\"lesson-menu\" id=\"lessonMenu\" aria-expanded=\"" + (menuOpen ? "true" : "false") + "\">Teacher</button></div></footer>";
  }

  function menuHtml(model) {
    if (!ui.menu) return "";
    var engine = engineOf(model.view);
    var teams = engine && engine.teams && engine.teams.length ? engine.teams : [{ id: "", name: "Class" }];
    var scoreRows = teams.map(function (team) {
      return "<p class=\"lesson-adjust\"><span>" + escape(team.name) + "</span><button type=\"button\" data-score=\"1\" data-team=\"" + escape(team.id) + "\">+1</button><button type=\"button\" data-score=\"-1\" data-team=\"" + escape(team.id) + "\">−1</button></p>";
    }).join("");
    var people = (engine && engine.participants || []).filter(function (person) {
      return person.identity === "pupil" || person.identity === "anonymous";
    }).map(function (person) {
      var on = engine.selectedParticipantId === person.id ? " is-on" : "";
      return "<button type=\"button\" class=\"lesson-person" + on + "\" data-choose=\"" + escape(person.id) + "\">" + escape(person.displayName) + "</button>";
    }).join("");
    var pupilCount = (engine && engine.participants || []).filter(function (person) {
      return person.identity === "pupil" || person.identity === "anonymous";
    }).length;
    var cast = model.sessionCast || {};
    var castRows = Object.keys(cast).map(function (id) {
      var seat = cast[id];
      if (!seat || !seat.firstName) return "";
      return "<p class=\"lesson-cast\">" + escape(seat.firstName) + " · " + escape(seat.storyRole || "Explorer") + "</p>";
    }).join("");
    var objective = "";
    var fullMission = model.storyPlan && model.storyPlan.mission;
    var shortMission = model.storyPlan && model.storyPlan.missionLabel;
    if (fullMission && shortMission && fullMission !== shortMission) objective = "<p class=\"lesson-cast\">" + escape(fullMission) + "</p>";
    return "<div class=\"lesson-panel\" id=\"lessonPanel\"><div class=\"lesson-panel-head\"><strong>Teacher</strong><button type=\"button\" id=\"lessonPanelClose\">Close</button></div>" +
      objective +
      "<button type=\"button\" data-act=\"pause\">Pause</button><button type=\"button\" data-act=\"skip\">Skip activity</button>" +
      "<button type=\"button\" data-act=\"help\">Help</button><button type=\"button\" data-act=\"full\">Full screen</button>" +
      "<button type=\"button\" data-act=\"sound\">" + (ui.sound ? "Sound on" : "Sound off") + "</button>" +
      "<details class=\"lesson-fold\"" + (castRows ? " open" : "") + "><summary>Pupils" + (pupilCount ? " (" + pupilCount + ")" : "") + "</summary>" + castRows + (castRows ? "<p class=\"lesson-cast\">Change who this is</p>" : "") + "<div class=\"lesson-people\">" + (people || "<p>No one to choose yet.</p>") + "</div></details>" +
      "<details class=\"lesson-fold\"><summary>Adjust score</summary>" + scoreRows + "</details>" +
      "<button type=\"button\" class=\"lesson-danger\" data-act=\"end\">End lesson</button></div>";
  }

  function overlay(title, body, actions) {
    return "<div class=\"lesson-overlay\" role=\"dialog\" aria-modal=\"true\" aria-label=\"" + escape(title) + "\"><section class=\"lesson-card\"><h2>" + escape(title) + "</h2>" + body + "<div class=\"lesson-card-actions\">" + actions + "</div></section></div>";
  }

  function stageBody(model, slide, index) {
    var mechanics = globalThis.WondiiLessonMechanics;
    var engine = engineOf(model.view);
    var selected = null;
    if (engine && engine.selectedParticipantId) {
      engine.participants.forEach(function (person) {
        if (person.id === engine.selectedParticipantId) selected = person;
      });
    }
    var portrait = selected && model.portraits ? model.portraits[selected.pupilId || selected.id] : "";
    var ctx = {
      mechanic: slideMechanic(slide),
      activity: activityName(slideMechanic(slide)),
      reveal: !!(model.view && model.view.reveal) || !!model.reveal,
      interact: ui.play,
      pick: model.pick || "",
      question: model.question,
      mysteryOpen: !!model.mysteryOpen,
      mysteryText: model.mysteryText,
      door: model.door || "",
      doorText: model.doorText,
      selected: selected ? { name: selected.displayName, portrait: selected.identity === "pupil" ? portrait : "" } : null,
      immersed: adventureNow(model)
    };
    if (!mechanics) return { mode: "story", html: "<p class=\"lesson-copy\">The activity will appear here.</p>" };
    return mechanics.render(slide || {}, ctx);
  }

  function worldFor(slide, play) {
    var visuals = globalThis.WondiiVisuals;
    if (!visuals || !visuals.forSlide) return null;
    // Patch 6: a beat may carry its own picture (one teaching picture per unit).
    var beats = slide && Array.isArray(slide.beats) ? slide.beats : [];
    if (play && beats.length) {
      var beat = beats[Math.max(0, Math.min(Number(play.beat) || 0, beats.length - 1))];
      if (beat && beat.visualAssetId) slide = Object.assign({}, slide, { visualAssetId: beat.visualAssetId });
    }
    return visuals.forSlide(slide);
  }

  function shell(model, inner, slides, index, primary, statusText, world) {
    var cls = (reduced() ? " is-still" : "") + (ui.menu ? " is-menu" : "");
    if (world && world.url) cls += " has-world";
    if (world && world.fallback) cls += " has-fallback";
    var safe = (world && world.safe) || ((world && (world.url || world.fallback)) ? "LOWER_LEFT" : "");
    if (safe) cls += " lesson-safe-" + String(safe).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    var layer = (world && world.layer) || "";
    var backdrop = "";
    if (world && world.url) backdrop = "<div class=\"lesson-world" + (world.fx || "") + "\"><img class=\"lesson-world-plate\" alt=\"\" src=\"" + escape(world.url) + "\" />" + (world.tag ? "<p class=\"lesson-world-tag\">" + escape(world.tag) + "</p>" : "") + "</div>";
    else if (world && world.fallback) backdrop = "<div class=\"lesson-world lesson-world--fallback" + (world.fx || "") + "\"></div>";
    return "<div class=\"lesson" + cls + "\">" + backdrop + layer + topHtml(model, slides || [], index || 0, statusText) +
      "<main class=\"lesson-stage\" id=\"lessonStage\">" + inner + "</main>" +
      (primary ? dockHtml(primary, ui.menu) : "") + menuHtml(model) + "</div>";
  }

  function rosterHtml(model) {
    var rows = (model.pupils || []).map(function (pupil) {
      return "<li class=\"lesson-roster-row\">" + (pupil.portrait ? "<img alt=\"\" src=\"" + escape(pupil.portrait) + "\" />" : "") + "<label><input type=\"checkbox\" data-here checked data-id=\"" + escape(pupil.id) + "\" /> " + escape(pupil.firstName) + "</label></li>";
    }).join("");
    var year = model.year ? "<p class=\"lesson-kicker\">" + escape(model.year) + "</p>" : "";
    return "<section class=\"lesson-roster\">" + year + "<h2>Who is here?</h2><ul class=\"lesson-roster-list\">" + rows + "</ul>" +
      "<label class=\"lesson-kicker\" for=\"lessonAdd\">Add a first name</label><div class=\"lesson-add\"><input id=\"lessonAdd\" maxlength=\"24\" /><button type=\"button\" class=\"lesson-quiet\" id=\"lessonAddBtn\">Add</button></div>" +
      "<div class=\"lesson-modes\" role=\"group\" aria-label=\"Teams\"><button type=\"button\" class=\"is-on\" data-mode=\"none\">No teams</button><button type=\"button\" data-mode=\"two\">Red and Blue</button><button type=\"button\" data-mode=\"teacher_class\">Teacher and class</button></div>" +
      "<div class=\"lesson-card-actions\"><button type=\"button\" class=\"lesson-go\" id=\"lessonBoard\">Start on the board</button><button type=\"button\" class=\"lesson-quiet\" id=\"lessonJoinMode\">Pupils join with a code</button></div></section>";
  }

  function calloutHtml(slide) {
    var boxes = (slide && slide.characterRegions) || [];
    var box = boxes[0];
    if (!box || !slide.speaker) return "";
    var y = Number(box.y);
    var height = Number(box.height);
    var top = y > 0.12 ? y - 0.06 : y + height + 0.02;
    top = Math.max(0.02, Math.min(0.82, top));
    var left = Math.max(0.02, Math.min(0.7, Number(box.x)));
    var who = slide.role ? (slide.speaker + " · " + slide.role) : slide.speaker;
    return "<p class=\"lesson-callout\" style=\"left:" + (left * 100).toFixed(1) + "%;top:" + (top * 100).toFixed(1) + "%\"><strong>" + escape(who) + "</strong></p>";
  }

  function displaySlides(slides, model, view) {
    var story = model && model.storyPlan;
    var core = globalThis.WondiiCreatorCore;
    if (!story || !core || !core.speakSlides) return slides;
    var rawPeople = (view && view.engine && view.engine.participants) || (model && model.pupils) || [];
    var people = rawPeople.filter(function (person) {
      if (!person || person.here === false || person.absent) return false;
      if (person.identity && person.identity !== "pupil" && person.identity !== "anonymous") return false;
      return true;
    });
    var seed = (view && (view.code || view.sessionCode)) || "preview";
    var spoken = core.speakSlides(slides, core.castRoles(people, story.characters || [], seed));
    var adventure = globalThis.WondiiVisualAdventure;
    if (!adventure || !adventure.sessionCast) return spoken;
    var cast = adventure.sessionCast(people, story, seed, (model && model.castOverrides) || {}, (model && model.featuredCast) || []);
    if (model) model.sessionCast = cast;
    return spoken.map(function (slide) {
      var characterId = slide.characterId || (adventure.characterForRole ? adventure.characterForRole(story, slide.role) : "");
      var seat = characterId && cast[characterId];
      if (!seat && slide.role) {
        Object.keys(cast).forEach(function (id) {
          var item = cast[id];
          if (!seat && item && String(item.storyRole || "").toLowerCase() === String(slide.role).toLowerCase()) seat = item;
        });
      }
      if (!seat || !seat.firstName) return slide;
      slide.characterId = seat.characterId;
      slide.speaker = seat.firstName;
      slide.role = seat.storyRole || slide.role;
      slide.focusLook = seat.avatarId ? "" : [seat.clothing, seat.signatureItem].filter(Boolean).join(" · ");
      if (seat.avatarId && adventure.avatarUrl) slide.portrait = adventure.avatarUrl(seat.avatarId);
      var regions = adventure.reliableRegions ? adventure.reliableRegions(seat.characterRegions) : [];
      var world = globalThis.WondiiVisuals && globalThis.WondiiVisuals.forSlide ? globalThis.WondiiVisuals.forSlide(slide) : null;
      if (world && world.characterRegions && world.characterRegions.length) regions = world.characterRegions;
      slide.characterRegions = regions.filter(function (box) {
        return !box.characterId || box.characterId === seat.characterId;
      });
      return slide;
    });
  }

  function render(rootEl, model) {
    lastRoot = rootEl;
    lastModel = model;
    model = model || {};
    var view = model.view;
    var slides = displaySlides((view && view.slides && view.slides.length) ? view.slides : (model.slides || []), model, view);
    var index = view ? view.slide || 0 : (model.slideIndex || 0);
    if (index >= slides.length) index = Math.max(0, slides.length - 1);
    if (model.fresh) ui.entered = true;
    var flags = { preview: !!model.preview, edit: !!model.edit, offerRecover: !model.preview && !!view && !!view.startedAt };
    var screen = screenFor(view, ui, flags);
    var slide = slides[index] || null;
    var html = "";
    var primary = "";
    var statusText = "";

    var mechanicsApi = globalThis.WondiiLessonMechanics;
    if (mechanicsApi && mechanicsApi.destroy) mechanicsApi.destroy();
    if (screen === "roster") {
      html = shell(model, rosterHtml(model), [], 0, "", model.year || "");
    } else     if (screen === "ready") {
      statusText = "Ready";
      var story = model.storyPlan || {};
      var readyTitle = story.title || model.title;
      var readyMission = (story.missionLabel || story.mission) ? "<p class=\"lesson-copy\">" + escape(story.missionLabel || story.mission) + "</p>" : "";
      html = shell(model, "<section class=\"lesson-ready\"><p class=\"lesson-kicker\">" + escape(model.year || "Class") + "</p><h2>Are you ready?</h2><p class=\"lesson-copy\">" + escape(readyTitle) + "</p>" + readyMission + "<button type=\"button\" class=\"lesson-go\" id=\"lessonBegin\">Start the lesson</button></section>", slides, 0, "", statusText);
    } else if (screen === "join") {
      var joined = model.joined || 0;
      statusText = "Waiting";
      html = shell(model, "<section class=\"lesson-join\"><p class=\"lesson-kicker\">Join this lesson</p><p class=\"lesson-code\">" + escape(view.code) + "</p><p class=\"lesson-joined-lg\">" + joined + " joined</p><p class=\"lesson-copy\">wondii.co.uk/join</p><button type=\"button\" class=\"lesson-go\" id=\"lessonStartLive\">Start lesson</button></section>", slides, 0, "", statusText);
    } else if (screen === "recover") {
      html = shell(model, overlay("Continue your lesson?", "<p class=\"lesson-copy\">" + escape(model.title) + "</p><p class=\"lesson-round\">Round " + (index + 1) + " of " + slides.length + "</p>", "<button type=\"button\" class=\"lesson-go\" id=\"lessonResume\">Resume</button><button type=\"button\" class=\"lesson-quiet\" id=\"lessonEndNow\">End session</button>"), slides, index, "", "Ready to continue");
    } else if (screen === "error") {
      html = shell(model, overlay("Something went wrong with this activity.", "<p class=\"lesson-copy\">The lesson is still here. You can try this activity again, skip it, or end the lesson.</p>", "<button type=\"button\" class=\"lesson-go\" id=\"lessonRetry\">Try again</button><button type=\"button\" class=\"lesson-quiet\" id=\"lessonSkip\">Skip activity</button><button type=\"button\" class=\"lesson-quiet\" id=\"lessonEndNow\">End lesson</button>"), slides, index, "", "Needs a moment");
    } else if (screen === "complete" || screen === "ended") {
      var result = (engineOf(view) && engineOf(view).result) || view.result || {};
      if (adventureNow(model) && screen === "complete") {
        var recapItems = [];
        var scened = slides.some(function (item) { return item && item.sceneId; });
        slides.forEach(function (item) {
          var debrief = !scened && item && (item.type === "mystery" || item.beat === "debrief");
          if (!debrief) return;
          (item.lines || []).forEach(function (line) { if (line) recapItems.push(line); });
        });
        var recap = recapItems.map(function (line) { return "<li>" + escape(line) + "</li>"; }).join("");
        var ending = (model.storyPlan && model.storyPlan.missionLabel) || "The class used what it learned.";
        var world = worldFor(slides[slides.length - 1] || {});
        html = shell(model, "<section class=\"lesson-finish\" id=\"lessonSummary\"><p class=\"lesson-kicker\">Mission complete</p><h2>" + escape((model.storyPlan && model.storyPlan.title) || model.title || "Adventure") + "</h2><p class=\"lesson-copy\">" + escape(ending) + "</p>" +
          (recap ? "<p class=\"lesson-kicker\">You discovered</p><ul class=\"lesson-recap\">" + recap + "</ul>" : "") +
          "</section>", slides, slides.length ? slides.length - 1 : 0, "", "Complete", world);
        html = html.replace("</main>", "</main><div class=\"lesson-card-actions lesson-ready-go\"><a class=\"lesson-quiet\" href=\"" + escape(model.resultsHref || "#lessonSummary") + "\">Results</a><button type=\"button\" class=\"lesson-quiet\" data-act=\"replay\">Play again</button><a class=\"lesson-quiet\" href=\"" + escape(model.classHref || "../../portal.html#classes") + "\">Back to class</a><a class=\"lesson-go\" href=\"" + escape(model.homeHref || "../../portal.html") + "\">Home</a></div>");
      } else {
      var teams = (result.teamScores || []).map(function (team) {
        return "<p class=\"lesson-score\"><span>" + escape(team.name) + " team</span><strong>" + team.points + "</strong></p>";
      }).join("");
      var title = screen === "complete" ? "Adventure complete!" : "Lesson ended";
      var lead = screen === "ended" ? "What you finished has been kept." : "The class finished this adventure.";
      html = shell(model, "<section class=\"lesson-finish\" id=\"lessonSummary\"><p class=\"lesson-kicker\">" + escape(model.title) + "</p><h2>" + title + "</h2><p class=\"lesson-copy\">" + lead + "</p>" +
        (teams || "<p class=\"lesson-score lesson-score--class\"><span>Class reward</span><strong>" + (result.classReward || 0) + "</strong></p>") +
        "<p class=\"lesson-copy\">" + (result.roundsCompleted || 0) + " of " + (result.roundsTotal || slides.length) + " rounds. " + (((result.participation && result.participation.knownPupils) || 0) + ((result.participation && result.participation.anonymousJoiners) || 0)) + " taking part.</p>" +
        "<p class=\"lesson-copy\">" + ((result.responses && result.responses.correct) || 0) + " correct. " + ((result.responses && result.responses.incorrect) || 0) + " to look at again.</p></section>", slides, slides.length ? slides.length - 1 : 0, "", screen === "complete" ? "Complete" : "Ended");
      html = html.replace("</main>", "</main><div class=\"lesson-card-actions lesson-ready-go\"><a class=\"lesson-quiet\" href=\"" + escape(model.resultsHref || "#lessonSummary") + "\">View results</a><button type=\"button\" class=\"lesson-quiet\" data-act=\"replay\">Play again</button><a class=\"lesson-quiet\" href=\"" + escape(model.classHref || "../../portal.html#classes") + "\">Back to class</a><a class=\"lesson-go\" href=\"" + escape(model.homeHref || "../../portal.html") + "\">Home</a></div>");
      }
    } else if (screen === "transition") {
      var nextSlide = slides[ui.transition] || {};
      var nextTitle = nextSlide.kicker || activityName(slideMechanic(nextSlide));
      var bridge = {
        beginning: "Arrival",
        discovery: "Discovery unlocked",
        development: "Look more closely",
        application: "Use what you know",
        resolution: "The mission moves on",
        debrief: "What we discovered",
        goal: "The next step"
      }[nextSlide.beat] || "Discovery unlocked";
      if (adventureNow(model)) {
        html = shell(model, "<section class=\"lesson-transition\"><p class=\"lesson-kicker\">" + escape(bridge) + "</p><h2>" + escape(nextTitle) + "</h2></section>", slides, ui.transition, "Continue", "", worldFor(nextSlide) || worldFor(slide));
      } else {
        var scoreLine = scoresHtml(view);
        html = shell(model, "<section class=\"lesson-transition\"><p class=\"lesson-kicker\">Round " + (index + 1) + " complete</p>" + scoreLine + "<h2>" + escape(nextTitle) + "</h2><p class=\"lesson-copy\">Next up</p></section>", slides, index, "Continue", "Between activities");
      }
      primary = "Continue";
    } else {
      considerPupil(model, screen, slide);
      if (!ui.play || ui.play.index !== index) ui.play = { index: index, step: 0, beat: 0, stuck: false, slipped: false, revealed: false, boomed: false };
      var drawn = stageBody(model, slide, index);
      if (drawn.invalid && model.actions && model.actions.fail && ui.failRound !== index) {
        ui.failRound = index;
        setTimeout(function () { model.actions.fail(); }, 0);
      }
      var mechanic = slideMechanic(slide);
      var progress = quizProgress(view, slide, index);
      statusText = (slide && slide.kicker) || activityName(mechanic);
      var stepsNow = mechanicsApi && mechanicsApi.interactionsOf ? mechanicsApi.interactionsOf(slide) : [];
      var stepNow = stepsNow[Math.max(0, Math.min(ui.play.step || 0, Math.max(0, stepsNow.length - 1)))] || null;
      if (screen === "paused") {
        statusText = "Paused";
        primary = "Resume";
      } else primary = primaryLabel(slide, ui.play, index, slides.length, progress);
      var inner = (adventureNow(model) ? calloutHtml(slide) : "") + "<div class=\"lesson-play lesson-play--" + drawn.mode + "\">" + drawn.html + "</div>";
      if (screen === "paused") {
        inner += overlay("Paused", "<p class=\"lesson-copy\">The class is waiting. Scores stay as they are.</p>", "<button type=\"button\" class=\"lesson-go\" id=\"lessonUnpause\">Resume</button>");
      }
      if (ui.moment && !adventureNow(model)) {
        var face = ui.moment.portrait ? "<img class=\"lesson-face\" src=\"" + escape(ui.moment.portrait) + "\" alt=\"\" />" : "<p class=\"lesson-initial\" aria-hidden=\"true\">" + escape((ui.moment.name || "?").slice(0, 1)) + "</p>";
        var heading = ui.moment.role
          ? "<p class=\"lesson-kicker\">" + escape(ui.moment.hello) + "</p><p class=\"lesson-name\">" + escape(ui.moment.name) + "</p><p class=\"lesson-kicker\">" + escape(ui.moment.role) + "</p>"
          : "<p class=\"lesson-name\">" + escape(ui.moment.name) + "</p>";
        inner += "<div class=\"lesson-moment\"><div>" + face + heading + "<p class=\"lesson-copy\">" + escape(ui.moment.task) + "</p><button type=\"button\" class=\"lesson-go\" id=\"lessonMomentOk\">Continue</button></div></div>";
      }
      if (ui.feedback) {
        var response = worldFor(slide);
        if (response) inner += "<div class=\"lesson-world-response is-" + escape(ui.feedback.kind) + "\" aria-hidden=\"true\"></div>";
        var said = ui.feedback.text || "";
        if (adventureNow(model) && ui.feedback.extra) said = said + " " + ui.feedback.extra;
        inner += "<div class=\"lesson-feedback lesson-feedback--" + ui.feedback.kind + "\" role=\"status\"><p>" + escape(said) + "</p>" +
          (!adventureNow(model) && ui.feedback.extra ? "<p class=\"lesson-plus\">" + escape(ui.feedback.extra) + "</p>" : "") + "</div>";
      }
      if (ui.help) {
        inner += overlay("For the teacher", "<p class=\"lesson-copy\">" + escape(helpText(mechanic)) + "</p><p class=\"lesson-cue\">Scoring follows the lesson. Pause does not wipe it.</p>", "<button type=\"button\" class=\"lesson-go\" id=\"lessonHelpOk\">Close</button>");
      }
      if (ui.end) {
        inner += overlay("End this lesson?", "<p class=\"lesson-copy\">Everything completed so far will be saved.</p>", "<button type=\"button\" class=\"lesson-go\" id=\"lessonKeep\">Keep playing</button><button type=\"button\" class=\"lesson-quiet\" id=\"lessonEndNow\">End lesson</button>");
      }
      var world = worldFor(slide, ui.play) || null;
      if (world && adventureNow(model)) {
        var showEnter = slide && slide.worldEffect && slide.worldEffect.trigger !== "on-success" && !ui.play.boomed && !ui.play.slipped;
        if (showEnter) ui.play.boomed = true;
        var fxName = "";
        if (ui.play.slipped && stepNow && stepNow.responseEffect) fxName = stepNow.responseEffect.type;
        else if (showEnter && slide.worldEffect) fxName = slide.worldEffect.type;
        else if (ui.play.revealed && stepNow && stepNow.responseEffect) fxName = stepNow.responseEffect.type;
        if (fxName) world.fx = " is-fx-" + String(fxName).replace(/[^a-z-]/g, "") + (ui.play.slipped ? " is-fx-slip" : "");
        if (mechanicsApi && mechanicsApi.layerHtml) world.layer = mechanicsApi.layerHtml(slide, ui.play);
      }
      html = shell(model, inner, slides, index, primary, statusText, world);
    }
    rootEl.innerHTML = html;
    var scoreSlot = rootEl.querySelector("#lessonScores");
    if (scoreSlot && view) scoreSlot.innerHTML = scoresHtml(view);
    bind(rootEl, model, screen, slides, index);
    attachMechanic(rootEl, model, screen, slides, index);
    return screen;
  }

  function attachMechanic(rootEl, model, screen, slides, index) {
    if (screen !== "stage" && screen !== "paused") return;
    var host = rootEl.querySelector("#lessonMechanic");
    var api = globalThis.WondiiLessonMechanics;
    if (!host || !api || !api.mount) return;
    var engine = model.view && model.view.engine;
    var round = engine && engine.rounds ? engine.rounds[index] : null;
    var handle = api.mount(host, {
      mechanic: slideMechanic(slides[index]),
      slide: slides[index],
      view: model.view,
      portraits: model.portraits || {},
      paused: screen === "paused",
      reduced: reduced(),
      roundId: round ? round.id : "",
      actions: model.actions || {}
    });
    if (handle && handle.persist && model.actions && model.actions.play) {
      var packet = handle.persist;
      handle.persist = null;
      model.actions.play(packet);
    }
  }

  function queueTransition() {
    if (!lastModel || !lastModel.view) return;
    var slides = lastModel.view.slides || [];
    var index = lastModel.view.slide || 0;
    if (index >= slides.length - 1) return;
    if (slides[index] && slides[index].sceneId) return;
    ui.transition = index + 1;
  }

  function pupilTask(slide) {
    if (!slide) return "";
    var text = slide.prompt || "";
    if (!text && slide.lines && slide.lines.length) text = slide.lines[0];
    if (!text && slide.question) text = slide.question.prompt || "";
    var value = String(text || "").trim();
    var lower = value.toLowerCase();
    if (value.length < 12) return "";
    if (lower === "spin for a pupil." || lower === "spin for a pupil" || lower === "spin for someone who is here.") return "";
    if (/^you'?re up[.!]?$/.test(lower)) return "";
    return value;
  }

  function considerPupil(model, screen, slide) {
    if (screen !== "stage" && screen !== "paused") return;
    var engine = engineOf(model.view);
    if (!engine || !engine.selectedParticipantId || ui.moment) return;
    if (engine.selectedParticipantId === ui.seenPupil) return;
    var person = null;
    engine.participants.forEach(function (item) {
      if (item.id === engine.selectedParticipantId) person = item;
    });
    if (!person || person.identity === "team") return;
    var task = pupilTask(slide);
    if (!task) return;
    ui.seenPupil = person.id;
    var role = slide && slide.role;
    ui.moment = {
      name: person.displayName,
      hello: role ? "Mission control has chosen..." : person.displayName,
      role: role || "",
      task: task,
      portrait: !adventureNow(model) && person.identity === "pupil" && model.portraits ? (model.portraits[person.pupilId] || "") : ""
    };
    if (momentTimer) clearTimeout(momentTimer);
    momentTimer = setTimeout(function () {
      ui.moment = null;
      if (lastRoot && lastModel) render(lastRoot, lastModel);
    }, reduced() ? 0 : 2800);
  }

  function ensureAudio() {
    var Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
    return audioCtx;
  }

  function playCue(kind) {
    if (!ui.sound) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    if (kind === "shake" || kind === "rumble" || kind === "vibrate-object") {
      var frames = 2 * ctx.sampleRate;
      var buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      var i;
      for (i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      var noise = ctx.createBufferSource();
      noise.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 140;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 1.35);
      return;
    }
    var osc = ctx.createOscillator();
    var tone = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.18);
    tone.gain.setValueAtTime(0.0001, now);
    tone.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
    tone.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(tone);
    tone.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  function bind(rootEl, model, screen, slides, index) {
    function go(id, fn) {
      var node = rootEl.querySelector("#" + id);
      if (node) node.addEventListener("click", function () { fn(node); });
    }
    go("lessonMenu", function () { ui.menu = !ui.menu; render(rootEl, model); });
    go("lessonPanelClose", function () { ui.menu = false; render(rootEl, model); });
    go("lessonPrimary", function () { primary(model, slides, index); });
    go("lessonBegin", function () { ui.entered = true; if (model.actions.begin) model.actions.begin(); });
    go("lessonStartLive", function () { ui.entered = true; if (model.actions.startLiveSession) model.actions.startLiveSession(); });
    go("lessonBoard", function () { startBoard(rootEl, model); });
    go("lessonJoinMode", function () { if (model.actions.startJoin) model.actions.startJoin(rosterSpec(rootEl)); });
    go("lessonAddBtn", function () { addName(rootEl); });
    go("lessonResume", function () { ui.entered = true; render(rootEl, model); });
    go("lessonUnpause", function () { if (model.actions.resume) model.actions.resume(); });
    go("lessonRetry", function () { if (model.actions.retry) model.actions.retry(); });
    go("lessonSkip", function () { if (model.actions.skip) model.actions.skip(); });
    go("lessonKeep", function () { ui.end = false; render(rootEl, model); });
    go("lessonEndNow", function () { ui.end = false; ui.entered = true; if (model.actions.end) model.actions.end(); });
    go("lessonHelpOk", function () { ui.help = false; render(rootEl, model); });
    go("lessonMomentOk", function () { ui.moment = null; render(rootEl, model); });
    go("lessonTry", function () { if (model.actions.tryAgain) model.actions.tryAgain(); });
    go("lessonSpin", function () { if (model.actions.spin) model.actions.spin(); });
    go("lessonMystery", function () { if (model.actions.mystery) model.actions.mystery(); });
    rootEl.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        rootEl.querySelectorAll("[data-mode]").forEach(function (other) { other.classList.remove("is-on"); });
        btn.classList.add("is-on");
      });
    });
    rootEl.querySelectorAll("[data-pick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (model.actions.pick) model.actions.pick(btn.getAttribute("data-pick"));
      });
    });
    rootEl.querySelectorAll("[data-door]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (model.actions.door) model.actions.door(btn.getAttribute("data-door"));
      });
    });
    rootEl.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-act");
        if (act === "sound") {
          ui.sound = !ui.sound;
          if (ui.sound) ensureAudio();
          render(rootEl, model);
          return;
        }
        ui.menu = false;
        if (act === "pause" && model.actions.pause) model.actions.pause();
        else if (act === "skip" && model.actions.skip) model.actions.skip();
        else if (act === "help") { ui.help = true; render(rootEl, model); }
        else if (act === "full" && model.actions.fullscreen) model.actions.fullscreen();
        else if (act === "end") { ui.end = true; render(rootEl, model); }
        else if (act === "replay" && model.actions.replay) model.actions.replay();
      });
    });
    rootEl.querySelectorAll("[data-choose]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.menu = false;
        if (model.actions.choose) model.actions.choose(btn.getAttribute("data-choose"));
      });
    });
    rootEl.querySelectorAll("[data-world]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-world");
        var mechanics = globalThis.WondiiLessonMechanics;
        var steps = mechanics && mechanics.interactionsOf ? mechanics.interactionsOf(slides[index]) : [];
        var current = steps[ui.play.step] || {};
        if (kind === "spot") {
          if (current.responseEffect) playCue(current.responseEffect.type);
          ui.play = completeSpot(ui.play, steps);
          render(rootEl, model);
        } else if (kind === "choose") {
          var pick = Number(btn.getAttribute("data-option"));
          var picked = (current.choices || [])[pick];
          if (!picked) return;
          ui.play = choosePlay(ui.play, steps, pick, picked.correct === true);
          if (picked.correct === true && current.responseEffect) playCue(current.responseEffect.type);
          render(rootEl, model);
        } else if (kind === "push") {
          if (!ui.play.stuck) {
            ui.play.stuck = true;
            render(rootEl, model);
            return;
          }
          ui.play.slipped = true;
          var response = (steps[ui.play.step] && steps[ui.play.step].responseEffect) || current.responseEffect;
          playCue(response && response.type);
          render(rootEl, model);
        }
      });
    });
    rootEl.querySelectorAll("[data-score]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var delta = Number(btn.getAttribute("data-score"));
        var teamId = btn.getAttribute("data-team") || null;
        if (model.actions.adjust) model.actions.adjust(teamId, delta);
      });
    });
    var first = rootEl.querySelector("#lessonResume, #lessonUnpause, #lessonKeep, #lessonRetry, #lessonMomentOk, #lessonHelpOk");
    if (first && (screen === "recover" || screen === "error" || screen === "paused" || ui.end || ui.help || ui.moment)) first.focus();
  }

  function rosterSpec(rootEl) {
    var modeBtn = rootEl.querySelector("[data-mode].is-on");
    var pupils = [];
    rootEl.querySelectorAll(".lesson-roster-row").forEach(function (row) {
      var box = row.querySelector("[data-here]");
      var name = row.textContent.replace(/\s+/g, " ").trim();
      pupils.push({
        id: box ? box.getAttribute("data-id") : "",
        firstName: name,
        here: !!(box && box.checked),
        portrait: (row.querySelector("img") || {}).src || ""
      });
    });
    var typed = rootEl.querySelector("#lessonAdd");
    if (typed && typed.value.trim()) pupils.push({ id: "", firstName: typed.value.trim().split(/\s+/)[0], here: true, portrait: "" });
    return { teamMode: modeBtn ? modeBtn.getAttribute("data-mode") : "none", pupils: pupils };
  }

  function addName(rootEl) {
    var input = rootEl.querySelector("#lessonAdd");
    var list = rootEl.querySelector(".lesson-roster-list");
    if (!input || !list || !input.value.trim()) return;
    var name = input.value.trim().split(/\s+/)[0].slice(0, 24);
    var li = document.createElement("li");
    li.className = "lesson-roster-row";
    li.innerHTML = "<label><input type=\"checkbox\" data-here checked /> " + escape(name) + "</label>";
    list.appendChild(li);
    input.value = "";
  }

  function startBoard(rootEl, model) {
    ui.entered = true;
    if (model.actions.startBoard) model.actions.startBoard(rosterSpec(rootEl));
  }

  function waitingOn(step, play) {
    if (!step || !play) return false;
    if (step.beatIndex != null && (Number(play.beat) || 0) < Number(step.beatIndex)) return false;
    if ((step.type === "move" || step.type === "drag") && !play.slipped && !play.revealed) return true;
    if ((step.type === "hotspot" || step.type === "tap-to-reveal" || step.type === "inspect") && !play.revealed) return true;
    if (step.type === "choose" && Array.isArray(step.choices) && step.choices.length && !play.revealed) return true;
    return false;
  }

  // Patch 6: record a choice on a choose step. A wrong choice shows its own feedback and stays
  // on the step; the correct choice solves it (revealed), which lets Next appear.
  function choosePlay(play, steps, pick, correct) {
    var tried = ((play && play.tried) || []).slice();
    if (tried.indexOf(pick) === -1) tried.push(pick);
    var next = Object.assign({}, play || {}, { chosen: pick, tried: tried, revealed: !!correct });
    if (correct && (next.step || 0) < (steps || []).length - 1) {
      next.step = (next.step || 0) + 1;
      next.revealed = false;
      next.chosen = null;
      next.tried = [];
    }
    return next;
  }

  function completeSpot(play, steps) {
    var next = {
      index: play.index,
      step: play.step || 0,
      // Keep the beat: tapping a look-closer spot must not send the story back to its first line.
      beat: Number(play.beat) || 0,
      stuck: !!play.stuck,
      slipped: !!play.slipped,
      revealed: true,
      boomed: !!play.boomed
    };
    if (next.step < (steps || []).length - 1) {
      next.step += 1;
      next.revealed = false;
    }
    return next;
  }

  function primaryLabel(slide, play, index, total, quiz) {
    var mechanic = slideMechanic(slide);
    var progress = quiz || { answered: false, index: 0, count: 1 };
    var label;
    if (mechanic === "quiz" && progress.answered && progress.index < progress.count - 1) label = "Next question";
    else if (mechanic === "quiz" && !progress.answered) label = "";
    else if (index >= total - 1) label = "Finish";
    else label = "Next";
    var steps = [];
    if (slide && Array.isArray(slide.interactions) && slide.interactions.length) steps = slide.interactions;
    else if (slide && slide.interaction && slide.interaction.type) steps = [slide.interaction];
    var step = steps[Math.max(0, Math.min((play && play.step) || 0, Math.max(0, steps.length - 1)))] || null;
    if (waitingOn(step, play)) label = "";
    return label;
  }

  function quizProgress(view, slide, index) {
    var questions = slide && slide.questions && slide.questions.length ? slide.questions : (slide && slide.question ? [slide.question] : []);
    var engine = view && view.engine;
    var round = engine && engine.rounds ? engine.rounds[index] : null;
    var saved = engine && round && engine.mechanicStore ? engine.mechanicStore[round.id] : null;
    var qIndex = saved && saved.index ? Number(saved.index) : 0;
    var answered = !!(saved && saved.answers && saved.answers[String(qIndex)]);
    return { count: questions.length || 1, index: qIndex, answered: answered };
  }

  function primary(model, slides, index) {
    var view = model.view;
    var slide = slides[index];
    var mechanic = slideMechanic(slide);
    if (ui.transition != null) {
      var target = ui.transition;
      ui.transition = null;
      if (model.actions.goTo) model.actions.goTo(target);
      return;
    }
    if (view && view.engineStatus === "paused") {
      if (model.actions.resume) model.actions.resume();
      return;
    }
    var progress = quizProgress(view, slide, index);
    if (mechanic === "quiz" && progress.answered && progress.index < progress.count - 1) {
      if (model.actions.nextQuestion) model.actions.nextQuestion();
      return;
    }
    if (mechanic === "quiz" && !progress.answered) return;
    if (mechanic === "quiz" && view && !view.reveal && progress.count < 2) {
      if (model.actions.reveal) model.actions.reveal();
      return;
    }
    if (!view) {
      if (model.actions.previewNext) model.actions.previewNext(index);
      return;
    }
    if (!ui.play || ui.play.index !== index) ui.play = { index: index, step: 0, beat: 0, stuck: false, slipped: false, revealed: false, boomed: false };
    var stepped = advancePlay(slide, ui.play);
    if (!stepped.stage) {
      ui.play = Object.assign({}, ui.play, stepped.play, { index: index });
      render(lastRoot, model);
      return;
    }
    if (index >= slides.length - 1) {
      ui.celebrate = true;
      if (model.actions.complete) model.actions.complete();
      return;
    }
    if (slide && slide.sceneId && model.actions.goTo) {
      model.actions.goTo(index + 1);
      return;
    }
    ui.transition = index + 1;
    render(lastRoot, model);
  }

  function advancePlay(slide, play) {
    var beats = slide && Array.isArray(slide.beats) ? slide.beats : [];
    var current = play ? Number(play.beat) || 0 : 0;
    if (beats.length > 1 && current < beats.length - 1) {
      return { stage: false, play: Object.assign({}, play || {}, { beat: current + 1 }) };
    }
    return { stage: true, play: play || { beat: 0 } };
  }

  function noteScore(view, previous) {
    var engine = engineOf(view);
    var before = engineOf(previous);
    if (!engine || !before) return;
    engine.teams.forEach(function (team) {
      var old = 0;
      before.teams.forEach(function (item) { if (item.id === team.id) old = item.points; });
      if (team.points > old) ui.bump = { teamId: team.id, amount: team.points - old };
    });
    if (engine.rewardTotal > before.rewardTotal) ui.bump = { teamId: "", amount: engine.rewardTotal - before.rewardTotal };
    if (!ui.bump) return;
    if (bumpTimer) clearTimeout(bumpTimer);
    bumpTimer = setTimeout(function () {
      ui.bump = null;
      if (lastRoot && lastModel) render(lastRoot, lastModel);
    }, reduced() ? 0 : 900);
  }

  function noteFeedback(kind, text, extra) {
    ui.feedback = { kind: kind, text: text, extra: extra || "" };
  }

  function clearFeedback() {
    ui.feedback = null;
  }

  function resetFlow() {
    ui.transition = null;
    ui.moment = null;
    ui.end = false;
    ui.help = false;
    ui.menu = false;
    ui.seenPupil = "";
  }

  return {
    render: render,
    waitingOn: waitingOn,
    completeSpot: completeSpot,
    choosePlay: choosePlay,
    worldFor: worldFor,
    primaryLabel: primaryLabel,
    advancePlay: advancePlay,
    screenFor: screenFor,
    scoreMode: scoreMode,
    activityName: activityName,
    noteScore: noteScore,
    noteFeedback: noteFeedback,
    clearFeedback: clearFeedback,
    resetFlow: resetFlow,
    enter: function () { ui.entered = true; },
    queueTransition: queueTransition,
    helpText: helpText
  };
});
