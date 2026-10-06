/* Classroom mechanics inside LessonStage.
   Quiz, Spin, and Word Search mount and destroy their own listeners.
   Story, mystery, and doors stay as adapters. */
(function (root, factory) {
  var api = factory(root.WondiiMechanicCore || (typeof require === "function" ? require("./mechanic-core.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiLessonMechanics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  var current = null;

  function escape(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function listen(bag, node, type, fn) {
    if (!node || !node.addEventListener) return;
    node.addEventListener(type, fn);
    bag.push(function () { node.removeEventListener(type, fn); });
  }

  function destroyCurrent() {
    if (current && current.destroy) current.destroy();
    current = null;
  }

  function lines(slide) {
    return (slide && slide.lines || []).map(function (line) {
      return "<p class=\"lesson-copy\">" + escape(line) + "</p>";
    }).join("");
  }

  function beatLabel(beat) {
    return {
      beginning: "Arrival",
      goal: "The mission",
      development: "What happens",
      discovery: "Discovery",
      application: "Use what you know",
      resolution: "The way home",
      debrief: "What we discovered"
    }[beat] || "";
  }

  function sceneNote(slide, ctx) {
    if (ctx && ctx.immersed) return "";
    var mission = slide && slide.mission ? "<p class=\"lesson-cue\">" + escape(slide.mission) + "</p>" : "";
    var beat = slide && slide.sceneId ? "" : beatLabel(slide && slide.beat);
    return mission + (beat ? "<p class=\"lesson-kicker\">" + escape(beat) + "</p>" : "");
  }

  function actionOf(slide) {
    if (slide && slide.visualAction && slide.visualAction.type) return slide.visualAction;
    var type = slide && slide.type;
    var beat = slide && slide.beat;
    if (type === "question") return { type: "predict" };
    if (type === "spin") return { type: "point" };
    if (type === "doors") return { type: "choose" };
    if (type === "mystery" || beat === "debrief") return { type: "sequence" };
    if (beat === "discovery" || beat === "development" || (slide && slide.kind === "teach")) return { type: "inspect" };
    if (beat === "application") return { type: "compare" };
    return { type: "reveal" };
  }

  function echoOfMission(line, mission) {
    var plain = String(line || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    var goal = String(mission || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (plain.length < 18 || goal.length < 18) return false;
    return plain.indexOf(goal.slice(0, 36)) !== -1 || goal.indexOf(plain.slice(0, 36)) !== -1;
  }

  function usefulLines(slide, ctx) {
    var list = (slide && slide.lines || []).map(function (line) { return String(line || "").trim(); }).filter(Boolean);
    if (ctx && ctx.immersed) {
      list = list.filter(function (line) { return !echoOfMission(line, slide.mission); });
      if (!list.length) list = (slide.lines || []).map(function (line) { return String(line || "").trim(); }).filter(Boolean).slice(0, 1);
      list = list.slice(0, 2);
    }
    return list;
  }

  function focusHtml(slide) {
    if (!slide || !slide.focusLook) return "";
    var swatch = slide.characterId ? "<i class=\"lesson-swatch\" data-character=\"" + escape(slide.characterId) + "\"></i>" : "";
    return "<em class=\"lesson-focus\">" + swatch + escape(slide.focusLook) + "</em>";
  }

  function faceOf(slide) {
    return slide && slide.portrait ? "<img class=\"lesson-avatar\" src=\"" + escape(slide.portrait) + "\" alt=\"\" />" : "";
  }

  function pupilLine(slide) {
    if (!slide || !slide.speaker) return "";
    var label = slide.role ? (slide.speaker + " · " + slide.role) : slide.speaker;
    return "<p class=\"lesson-pupil\">" + faceOf(slide) + "<strong>" + escape(label) + "</strong>" + focusHtml(slide) + "</p>";
  }

  function interactionsOf(slide) {
    var list = [];
    if (slide && Array.isArray(slide.interactions) && slide.interactions.length) list = slide.interactions.slice();
    else if (slide && slide.interaction && slide.interaction.type) list = [slide.interaction];
    return list.filter(function (item) { return item && item.type; });
  }

  function sceneSlide(slide) {
    return !!(slide && slide.sceneId);
  }

  function stepReached(step, state) {
    if (!step || step.beatIndex == null) return true;
    return (Number(state && state.beat) || 0) >= Number(step.beatIndex);
  }

  function earthquakeMove(step) {
    if (!step || (step.type !== "move" && step.type !== "drag")) return false;
    return step.successCondition === "slip" && /^(plate|piece)$/.test(String(step.target || ""));
  }

  function currentInteraction(slide, state) {
    var steps = interactionsOf(slide);
    if (!steps.length) return null;
    var step = Math.max(0, Math.min(Number(state && state.step) || 0, steps.length - 1));
    if (!stepReached(steps[step], state)) return null;
    return steps[step];
  }

  // Patch 6: a choose step is a meaningful choice on a new example. Each choice carries its own
  // feedback; the step is solved only when the class picks the correct choice (observable:
  // the right choice turns green, its feedback shows, and Next appears). Class screen only.
  function chooseStep(slide, state) {
    var step = currentInteraction(slide, state);
    return step && step.type === "choose" && Array.isArray(step.choices) && step.choices.length ? step : null;
  }

  function chooseHtml(step, state) {
    var picked = state && state.chosen != null && state.chosen !== "" ? Number(state.chosen) : -1;
    var tried = (state && state.tried) || [];
    var pickedChoice = picked >= 0 ? step.choices[picked] : null;
    var solved = !!(pickedChoice && pickedChoice.correct === true && state && state.revealed);
    var example = step.newCase && step.newCase.text ? "<p class=\"lesson-copy lesson-case\">" + escape(step.newCase.text) + "</p>" : "";
    var buttons = step.choices.map(function (choice, i) {
      var right = solved && choice.correct === true;
      var again = tried.indexOf(i) !== -1 && choice.correct !== true;
      return "<button type=\"button\" class=\"lesson-choice" + (right ? " is-right" : "") + (again ? " is-again" : "") + "\" data-world=\"choose\" data-pick=\"" + i + "\"" + (solved || again ? " disabled" : "") + "><span>" + escape(choice.text) + "</span></button>";
    }).join("");
    var feedback = "";
    if (pickedChoice) {
      feedback = "<p class=\"lesson-react " + (pickedChoice.correct === true ? "lesson-react--yes" : "lesson-react--again") + "\" role=\"status\" data-choose-feedback=\"" + (pickedChoice.correct === true ? "right" : "again") + "\">" + escape((pickedChoice.correct === true ? "Yes. " : "Not quite. ") + (pickedChoice.feedback || "")) + "</p>";
      if (pickedChoice.correct !== true) feedback += "<p class=\"lesson-cue lesson-choose-again\">Try another choice.</p>";
    }
    var success = solved ? "<p class=\"lesson-kicker lesson-choose-done\" data-choose-success=\"1\">Solved</p>" : "";
    return "<div class=\"lesson-choose\" data-interaction=\"choose\"><p class=\"lesson-kicker\">" + escape(step.instruction || "Choose one") + "</p>" + example +
      "<div class=\"lesson-choices\">" + buttons + "</div>" + feedback + success + "</div>";
  }

  function againScaffold(quiz, choiceId) {
    var picked = "";
    ((quiz && quiz.choices) || []).forEach(function (choice) {
      if (choice && choice.id === choiceId) picked = String(choice.text || "").trim();
    });
    if (!picked) return "Look again at what is moving, then try once more. The story stays on this path.";
    return picked + " does not make this happen. Look again at what is moving, then try once more.";
  }

  function spokenTo(name, text) {
    var line = String(text || "").trim();
    var who = String(name || "").trim();
    if (!who || !line) return line;
    if (line.toLowerCase().indexOf(who.toLowerCase()) !== -1) return line;
    return who + ", " + line.charAt(0).toLowerCase() + line.slice(1);
  }

  function shownBeat(slide, ctx) {
    var beats = slide && Array.isArray(slide.beats) ? slide.beats : [];
    if (!beats.length) return null;
    var index = Math.max(0, Math.min(Number(ctx && ctx.interact && ctx.interact.beat) || 0, beats.length - 1));
    var pupil = (beats[index] && beats[index].pupil) || {};
    var lines = [];
    if (sceneSlide(slide)) {
      beats.slice(0, index).forEach(function (beat) {
        var said = beat && beat.pupil && beat.pupil.text;
        if (said) lines.push(String(said));
      });
    }
    if (pupil.cue) lines.push(String(pupil.cue));
    if (pupil.text) lines.push(String(pupil.text));
    return lines;
  }

  function finishScene(slide, ctx) {
    var outcome = (slide.outcome || []).map(function (line) { return "<p class=\"lesson-copy\">" + escape(line) + "</p>"; }).join("");
    var recap = (slide.recap || []).map(function (line) { return "<li>" + escape(line) + "</li>"; }).join("");
    return "<div class=\"lesson-story lesson-act lesson-act--sequence lesson-finish-scene\">" +
      "<div>" + sceneNote(slide, ctx) + "<p class=\"lesson-kicker\">" + escape(slide.sceneLabel || "Finish") + "</p>" + outcome +
      (recap ? "<p class=\"lesson-kicker\">What we discovered</p><ul class=\"lesson-recap\">" + recap + "</ul>" : "") +
      "</div></div>";
  }

  function sceneStory(slide, ctx) {
    var shown = shownBeat(slide, ctx) || usefulLines(slide, ctx);
    if (ctx.immersed && slide.speaker && shown.length) shown = shown.map(function (line, index) {
      return index === 0 ? spokenTo(slide.speaker, line) : line;
    });
    var current = ctx.immersed ? currentInteraction(slide, ctx.interact) : null;
    var state = ctx.interact || {};
    var lead = slide.sceneLabel || "";
    var actType = "inspect";
    if (current && earthquakeMove(current)) {
      actType = "move";
      lead = current.instruction || "Push";
      var moved = state.slipped ? current.teachingReveal : current.instruction;
      if (moved && shown.indexOf(moved) === -1) shown = shown.concat([moved]);
    } else if (current && (current.type === "hotspot" || current.type === "tap-to-reveal") && state.revealed && current.teachingReveal) {
      if (shown.indexOf(current.teachingReveal) === -1) shown = shown.concat([current.teachingReveal]);
    }
    var body = shown.map(function (line, index) {
      return "<p class=\"lesson-copy" + (index === shown.length - 1 && shown.length > 1 ? " is-new" : "") + "\">" + escape(line) + "</p>";
    }).join("");
    var choosing = chooseStep(slide, state);
    if (choosing) {
      actType = "choose";
      body += chooseHtml(choosing, state);
    }
    return "<div class=\"lesson-story lesson-act lesson-act--" + actType + " lesson-scene-story\">" +
      (slide.image && !ctx.immersed ? "<img class=\"lesson-scene\" src=\"" + escape(slide.image) + "\" alt=\"" + escape(slide.alt || "") + "\" />" : "") +
      "<div>" + sceneNote(slide, ctx) + pupilLine(slide) + "<p class=\"lesson-kicker\">" + escape(lead) + "</p>" + body +
      (slide.teacherCue && !ctx.immersed ? "<p class=\"lesson-cue\">" + escape(slide.teacherCue) + "</p>" : "") +
      "</div></div>";
  }

  function story(slide, ctx) {
    ctx = ctx || {};
    if (sceneSlide(slide)) return slide.purpose === "finish" ? finishScene(slide, ctx) : sceneStory(slide, ctx);
    var action = actionOf(slide);
    var beatLines = shownBeat(slide, ctx);
    var shown = beatLines || usefulLines(slide, ctx);
    if (ctx.immersed && slide.speaker && shown.length) shown = shown.map(function (line, index) {
      return index === 0 ? spokenTo(slide.speaker, line) : line;
    });
    var current = ctx.immersed ? currentInteraction(slide, ctx.interact) : null;
    var slipped = ctx.interact && ctx.interact.slipped;
    if (current && current.type === "move" && !slipped) shown = [current.instruction || "Push one side."];
    if (current && current.type === "move" && slipped) shown = [current.teachingReveal || shown[0] || ""];
    if (current && (current.type === "hotspot" || current.type === "tap-to-reveal") && ctx.interact && ctx.interact.revealed && current.teachingReveal) {
      shown = [current.teachingReveal];
    }
    var body = shown.map(function (line) { return "<p class=\"lesson-copy\">" + escape(line) + "</p>"; }).join("");
    var lead = beatLabel(slide && slide.beat) || (slide && slide.kicker) || "Story";
    if (ctx.immersed && current && current.type === "move") lead = current.instruction || "Push";
    else if (ctx.immersed && action.type === "inspect") lead = "Look closely";
    if (ctx.immersed && action.type === "compare") lead = "Compare";
    if (ctx.immersed && action.type === "sequence") {
      body = "<ol class=\"lesson-recap\">" + shown.map(function (line) { return "<li>" + escape(line) + "</li>"; }).join("") + "</ol>";
    } else if (ctx.immersed && action.type === "compare" && shown.length > 1) {
      body = "<div class=\"lesson-compare\"><p>" + escape(shown[0]) + "</p><p>" + escape(shown[1]) + "</p></div>";
    } else if (ctx.immersed && action.type === "hotspot") {
      body = "<details class=\"lesson-hotspot\"><summary>Look here</summary>" + body + "</details>";
    }
    var actType = current && current.type === "move" ? "move" : action.type;
    var choosing = chooseStep(slide, ctx.interact || {});
    if (choosing) {
      actType = "choose";
      body += chooseHtml(choosing, ctx.interact || {});
    }
    return "<div class=\"lesson-story lesson-act lesson-act--" + escape(actType) + "\">" +
      (slide.image && !ctx.immersed ? "<img class=\"lesson-scene\" src=\"" + escape(slide.image) + "\" alt=\"" + escape(slide.alt || "") + "\" />" : "") +
      "<div>" + sceneNote(slide, ctx) + pupilLine(slide) + "<p class=\"lesson-kicker\">" + escape(lead) + "</p>" + body +
      (slide.teacherCue && !ctx.immersed ? "<p class=\"lesson-cue\">" + escape(slide.teacherCue) + "</p>" : "") +
      "</div></div>";
  }

  function mystery(slide, ctx) {
    if (shownBeat(slide, ctx)) return story(slide, ctx);
    var open = !!ctx.mysteryOpen;
    var fact = (slide.lines || []).map(function (line) { return String(line || "").trim(); }).filter(Boolean).join(" ");
    var reveal = fact || (ctx && ctx.mysteryText) || "";
    return "<div class=\"lesson-mystery lesson-act lesson-act--sequence\">" + sceneNote(slide, ctx) + pupilLine(slide) + "<p class=\"lesson-kicker\">" + escape((ctx && ctx.immersed) ? "What we discovered" : (slide.kicker || "What we discovered")) + "</p>" +
      (open ? "<p class=\"lesson-react lesson-react--yes\">" + escape(reveal) + "</p>" : "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonMystery\">Open it</button>") +
      "</div>";
  }

  function doors(slide, ctx) {
    var labels = (slide.choices && slide.choices.length ? slide.choices : (slide.lines || [])).slice(0, 3);
    var prompt = slide.prompt || slide.teacherCue || "The class chooses one.";
    var row = [0, 1, 2].map(function (index) {
      var n = index + 1;
      var on = String(ctx.door || "") === String(n);
      var label = labels[index] || ("Choice " + n);
      return "<button type=\"button\" class=\"lesson-door" + (on ? " is-on" : "") + "\" data-door=\"" + n + "\"><span>" + escape(label) + "</span></button>";
    }).join("");
    var reveal = "";
    if (ctx.door) {
      var picked = Number(ctx.door) - 1;
      reveal = (slide.reveals && slide.reveals[picked]) || "";
    }
    var decision = slide.kind === "decision" ? "<p class=\"lesson-copy\">The class decides.</p>" : "";
    return "<div class=\"lesson-doors lesson-act lesson-act--choose\">" + sceneNote(slide, ctx) + pupilLine(slide) + "<p class=\"lesson-kicker\">" + escape((ctx && ctx.immersed) ? "Choose" : (slide.kicker || "Choose one")) + "</p>" + (ctx && ctx.immersed ? "" : decision) + "<p class=\"lesson-copy\">" + escape(prompt) + "</p><div class=\"lesson-door-row\">" + row + "</div>" +
      (reveal ? "<p class=\"lesson-react\">" + escape(reveal) + "</p>" : "") +
      "</div>";
  }

  function engineOf(ctx) {
    return ctx && ctx.view && ctx.view.engine ? ctx.view.engine : null;
  }

  function selectedOf(ctx) {
    var engine = engineOf(ctx);
    if (!engine || !engine.selectedParticipantId) return null;
    var found = null;
    (engine.participants || []).forEach(function (person) {
      if (person.id === engine.selectedParticipantId) found = person;
    });
    return found;
  }

  function stored(ctx) {
    var engine = engineOf(ctx);
    var reader = globalThis.WondiiSessionEngine;
    if (!engine || !ctx.roundId || !reader || !reader.readMechanicState) return null;
    return reader.readMechanicState(engine, ctx.roundId);
  }

  function play(ctx, packet) {
    if (ctx.actions && ctx.actions.play) ctx.actions.play(packet);
  }

  function teamCalled(teams, id) {
    var name = "";
    (teams || []).forEach(function (team) { if (team.id === id) name = team.name; });
    return name;
  }

  function pupilCountCopy(count) {
    var n = Number(count) || 0;
    if (n === 1) return "1 pupil today";
    return n + " pupils today";
  }

  function mountQuiz(host, ctx) {
    var bag = [];
    var saved = stored(ctx) || {};
    var list = (ctx.slide && ctx.slide.questions && ctx.slide.questions.length) ? ctx.slide.questions : [(ctx.slide && ctx.slide.question) || {}];
    var index = Math.max(0, Math.min(Number(saved.index) || 0, list.length - 1));
    var quiz = Core.normaliseQuiz({ question: list[index], participation: ctx.slide && ctx.slide.participation });
    if (!quiz.ok) {
      if (ctx.actions && ctx.actions.fail) ctx.actions.fail();
      return { destroy: function () { bag.forEach(function (fn) { fn(); }); } };
    }
    var engine = engineOf(ctx);
    var revealed = !!(saved.answers && saved.answers[String(index)]);
    var paused = !!ctx.paused || !Core.allowsInput(engine && engine.status);
    var selected = selectedOf(ctx);
    var part = (ctx.slide && ctx.slide.participation) || "";
    var named = selected && (selected.identity === "pupil" || selected.identity === "anonymous");
    var who = (part === "selected_pupil" || part === "spin") && named
      ? "<p class=\"lesson-kicker\">" + escape(selected.displayName) + ", you're up!</p>" : "";
    if ((part === "selected_pupil" || part === "spin") && !named) who = "<p class=\"lesson-kicker\">Spin chooses who answers.</p>";
    var teams = engine && engine.teams || [];
    var teamRow = "";
    if (part === "team_turn" && teams.length) {
      teamRow = "<div class=\"lesson-word-teams\" role=\"group\" aria-label=\"Team answering\"><p class=\"lesson-kicker\">Team turn</p>" + teams.map(function (team) {
        var on = saved.activeTeamId === team.id ? " is-on" : "";
        return "<button type=\"button\" class=\"lesson-quiet" + on + "\" data-team=\"" + escape(team.id) + "\">" + escape(team.name) + "</button>";
      }).join("") + "</div>";
    }
    var immersed = !!(host.closest && host.closest(".has-world, .has-fallback"));
    var choices = quiz.choices.map(function (choice) {
      var right = (revealed || saved.correct) && choice.id === quiz.correct;
      var again = !right && saved.choice === choice.id && saved.correct === false;
      var label = quiz.kind === "boolean" || immersed ? "<span>" + escape(choice.text) + "</span>" : "<b>" + escape(choice.id) + "</b><span>" + escape(choice.text) + "</span>";
      return "<button type=\"button\" class=\"lesson-choice" + (right ? " is-right" : "") + (again ? " is-again" : "") + "\" data-choice=\"" + escape(choice.id) + "\"" + (paused || revealed ? " disabled" : "") + ">" + label + "</button>";
    }).join("");
    var againBtn = !paused && !revealed && saved.choice && saved.correct === false
      ? "<button type=\"button\" class=\"lesson-quiet\" id=\"lessonTry\">Try again</button>" : "";
    var explain = "";
    var counter = list.length > 1 ? "<p class=\"lesson-qcount\">Question " + (index + 1) + " of " + list.length + "</p>" : "";
    var kicker = (ctx.slide && ctx.slide.kicker) || (immersed ? "Make your prediction" : "Quiz");
    if (immersed && /^quiz$/i.test(kicker)) kicker = "Make your prediction";
    if (immersed) kicker = "Make your prediction";
    var sceneQuiz = !!(ctx.slide && ctx.slide.sceneId);
    if (sceneQuiz) kicker = ctx.slide.sceneLabel || "Challenge";
    if (immersed && (named || (ctx.slide && ctx.slide.speaker))) {
      var pupilName = named ? selected.displayName : ctx.slide.speaker;
      var pupilRole = (ctx.slide && ctx.slide.role) || "";
      who = "<p class=\"lesson-pupil\">" + faceOf(ctx.slide) + "<strong>" + escape(pupilRole ? pupilName + " · " + pupilRole : pupilName) + "</strong>" + focusHtml(ctx.slide) + "</p>";
    }
    host.innerHTML = "<div class=\"lesson-question\"><p class=\"lesson-kicker\">" + escape(kicker) + "</p>" + (immersed && !sceneQuiz ? "" : counter) + who +
      "<h2 class=\"lesson-prompt\">" + escape(quiz.prompt) + "</h2>" + teamRow + "<div class=\"lesson-choices\">" + choices + "</div>" + explain + againBtn + "</div>";
    Array.prototype.forEach.call(host.querySelectorAll("[data-choice]"), function (button) {
      listen(bag, button, "click", function () {
        if (paused || revealed) return;
        var choiceId = button.getAttribute("data-choice");
        var outcome = Core.quizOutcome({ question: list[index], participation: ctx.slide && ctx.slide.participation }, choiceId, {
          selected: selected,
          teams: engine && engine.teams,
          teamMode: engine && engine.teamMode,
          activeTeamId: saved.activeTeamId || "",
          participation: (ctx.slide && ctx.slide.participation) || "",
          roundId: ctx.roundId
        });
        if (!outcome.ok) return;
        var extra = "";
        if (outcome.score) {
          var called = teamCalled(engine && engine.teams, outcome.score.teamId);
          extra = called ? "+" + outcome.score.amount + " " + called + " team" : "+" + outcome.score.amount;
        }
        var answers = saved.answers ? JSON.parse(JSON.stringify(saved.answers)) : {};
        answers[String(index)] = { choice: choiceId, correct: outcome.correct };
        play(ctx, {
          roundId: ctx.roundId,
          mechanicState: { kind: "quiz", index: index, answers: answers, choice: choiceId, correct: outcome.correct, activeTeamId: saved.activeTeamId || "" },
          emission: {
            response: outcome.response,
            score: outcome.score,
            actionId: "quiz-" + ctx.roundId + "-q" + index + "-" + choiceId
          },
          reveal: outcome.correct,
          feedback: immersed ? {
            kind: outcome.correct ? "yes" : "again",
            text: outcome.correct ? "That matches what we can see." : "Look again.",
            extra: outcome.correct ? (quiz.explain || "Carry on with what the class can see.") : againScaffold(quiz, choiceId)
          } : {
            kind: outcome.correct ? "yes" : "again",
            text: outcome.correct ? "Brilliant!" : "Nearly!",
            extra: quiz.explain || extra
          }
        });
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll("[data-team]"), function (button) {
      listen(bag, button, "click", function () {
        var next = JSON.parse(JSON.stringify(saved));
        next.kind = "quiz";
        next.index = index;
        next.activeTeamId = button.getAttribute("data-team");
        play(ctx, { roundId: ctx.roundId, mechanicState: next });
      });
    });
    var retry = host.querySelector("#lessonTry");
    listen(bag, retry, "click", function () {
      var next = JSON.parse(JSON.stringify(saved));
      next.kind = "quiz";
      next.index = index;
      if (next.answers) delete next.answers[String(index)];
      next.choice = "";
      next.correct = null;
      play(ctx, { roundId: ctx.roundId, mechanicState: next, clearFeedback: true });
    });
    return { destroy: function () { bag.forEach(function (fn) { fn(); }); } };
  }

  function faceHtml(person, portraits, chosen) {
    var portrait = person && person.identity === "pupil" && portraits ? portraits[person.pupilId || ""] : "";
    var face = portrait
      ? "<img class=\"lesson-face\" src=\"" + escape(portrait) + "\" alt=\"\" />"
      : "<p class=\"lesson-initial\" aria-hidden=\"true\">" + escape(((person && person.displayName) || "?").slice(0, 1)) + "</p>";
    return "<div class=\"lesson-spin-face" + (chosen ? " is-chosen" : "") + "\">" + face +
      "<p class=\"lesson-spin-name\">" + escape(person ? person.displayName : "") + "</p></div>";
  }

  function wheelRotation(people, id, spins) {
    var n = Math.max(people.length, 1);
    var index = 0;
    people.forEach(function (person, i) { if (person && person.id === id) index = i; });
    var center = ((index + 0.5) / n) * 360;
    return (spins || 0) * 360 - center;
  }

  function wheelHtml(people, rotation) {
    var n = Math.max(people.length, 1);
    var colors = ["#ffe08a", "#b7e4c7", "#a8d8ff", "#ffc2d1", "#d7c4f8", "#ffd6a5"];
    var stops = [];
    var labels = [];
    var i;
    for (i = 0; i < n; i++) {
      var person = people[i] || { displayName: "" };
      stops.push(colors[i % colors.length] + " " + ((i / n) * 100) + "% " + (((i + 1) / n) * 100) + "%");
      var angle = ((i + 0.5) / n) * 360;
      labels.push("<span class=\"lesson-wheel-label\" style=\"transform: rotate(" + angle + "deg) translateY(-132px)\"><b style=\"transform: rotate(" + (-angle) + "deg)\">" + escape(person.displayName || "") + "</b></span>");
    }
    return "<div class=\"lesson-wheel-stage\"><div class=\"lesson-wheel-pointer\" aria-hidden=\"true\"></div>" +
      "<div class=\"lesson-wheel\" style=\"transform: rotate(" + rotation + "deg); background: conic-gradient(" + stops.join(", ") + ")\">" + labels.join("") + "</div></div>";
  }

  function mountSpin(host, ctx) {
    var bag = [];
    var timer = 0;
    var engine = engineOf(ctx);
    var people = Core.eligiblePeople(engine && engine.participants);
    var saved = stored(ctx) || { kind: "spin", order: [], cursor: 0, lastId: "", picked: [] };
    var selected = selectedOf(ctx);
    var already = selected && (selected.identity === "pupil" || selected.identity === "anonymous") ? selected.id : (saved.lastId || "");
    var paused = !!ctx.paused || !Core.allowsInput(engine && engine.status);
    var shown = people.length ? people : [{ id: "", displayName: "Pupil" }];
    var rotation = already ? wheelRotation(shown, already, 0) : 0;
    var slide = ctx.slide || {};
    var name = (selected && selected.displayName) || "";
    var task = String(slide.prompt || (slide.lines && slide.lines[0]) || "").trim();
    var count = people.length ? "<p class=\"lesson-copy\">" + pupilCountCopy(people.length) + "</p>" : "<p class=\"lesson-copy\">Add the class, then spin.</p>";
    var chosen = "";
    var immersed = !!(host.closest && host.closest(".has-world, .has-fallback"));
    if (already && name) {
      if (slide.role && immersed) {
        chosen = "<p class=\"lesson-pupil\">" + faceOf(slide) + "<strong>" + escape(name + " · " + slide.role) + "</strong>" + focusHtml(slide) + "</p>" +
          (task ? "<p class=\"lesson-copy\">" + escape(spokenTo(name, task)) + "</p>" : "");
      } else if (slide.role) {
        chosen = "<p class=\"lesson-kicker\">Mission control has chosen...</p>" +
          "<p class=\"lesson-spin-name\">" + escape(name) + "</p>" +
          "<p class=\"lesson-kicker\">" + escape(slide.role) + "</p>" +
          (task ? "<p class=\"lesson-copy\">" + escape(task) + "</p>" : "");
      } else {
        chosen = "<p class=\"lesson-kicker\">" + escape(name) + "</p>" +
          (task ? "<p class=\"lesson-copy\">" + escape(task) + "</p>" : "");
      }
      if (slide.reveal) {
        chosen += "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonSpinReveal\">Show the idea</button>" +
          "<p class=\"lesson-react lesson-react--yes\" id=\"lessonSpinIdea\" hidden>" + escape(slide.reveal) + "</p>";
      }
    }
    var castName = (already && name) || (immersed && slide.speaker) || "";
    if (immersed && castName && slide.role && !chosen) {
      chosen = "<p class=\"lesson-pupil\">" + faceOf(slide) + "<strong>" + escape(castName + " · " + slide.role) + "</strong>" + focusHtml(slide) + "</p>" +
        (task ? "<p class=\"lesson-copy\">" + escape(spokenTo(castName, task)) + "</p>" : "");
    }
    var named = already || (immersed && castName);
    var button = named ? "" : "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonSpin\"" + (paused || !people.length ? " disabled" : "") + ">" + (immersed ? "Choose someone" : "Spin") + "</button>";
    var intro = already || (immersed && castName) ? "" : "<p class=\"lesson-copy\">" + (immersed ? "Someone in the class will look." : "Spin to choose someone.") + "</p>";
    host.innerHTML = "<div class=\"lesson-spin lesson-act lesson-act--point\"><p class=\"lesson-kicker\">" + escape(immersed ? (slide.role || "Look closely") : (slide.kicker || "Choose someone")) + "</p>" +
      intro + (already || immersed ? "" : count) + (immersed ? "" : wheelHtml(shown, rotation)) + chosen + button + "</div>";
    var revealButton = host.querySelector("#lessonSpinReveal");
    listen(bag, revealButton, "click", function () {
      var idea = host.querySelector("#lessonSpinIdea");
      if (idea) idea.hidden = false;
      revealButton.hidden = true;
    });
    var spinButton = host.querySelector("#lessonSpin");
    listen(bag, spinButton, "click", function () {
      if (paused || already || spinButton.disabled) return;
      spinButton.disabled = true;
      var plan = Core.spinNext(engine.participants, saved, (engine.sessionId || "spin") + ":" + ctx.roundId, ctx.slide || {});
      if (!plan.ok) return;
      var wheel = host.querySelector(".lesson-wheel");
      var target = wheelRotation(people, plan.id, 4);
      function finish() {
        play(ctx, {
          roundId: ctx.roundId,
          mechanicState: plan.state,
          emission: { participantId: plan.id, actionId: "spin-" + ctx.roundId + "-" + plan.state.cursor }
        });
      }
      if (ctx.reduced) {
        finish();
        return;
      }
      if (wheel && wheel.style) {
        wheel.style.transition = "transform 3.2s cubic-bezier(.12,.72,.08,1)";
        wheel.style.transform = "rotate(" + target + "deg)";
      }
      timer = setTimeout(finish, 3300);
    });
    return {
      destroy: function () {
        if (timer) clearTimeout(timer);
        bag.forEach(function (fn) { fn(); });
      }
    };
  }

  function cellFromEvent(host, event) {
    var node = event.target;
    if (node && node.closest) node = node.closest("[data-r]");
    if (!node || !node.getAttribute) return null;
    if (!host.contains || host.contains(node)) {
      var r = Number(node.getAttribute("data-r"));
      var c = Number(node.getAttribute("data-c"));
      if (isNaN(r) || isNaN(c)) return null;
      return { r: r, c: c, node: node };
    }
    return null;
  }

  function mountWordSearch(host, ctx) {
    var bag = [];
    var engine = engineOf(ctx);
    var saved = stored(ctx);
    var slide = ctx.slide || {};
    if (!saved || !saved.grid) {
      var made = Core.generateWordSearch(slide, (engine && engine.sessionId ? engine.sessionId : "word") + ":" + (ctx.roundId || "round"));
      if (!made.ok) {
        if (ctx.actions && ctx.actions.fail) ctx.actions.fail();
        return { destroy: function () {} };
      }
      saved = made;
    }
    var persist = (!stored(ctx) || !stored(ctx).grid) ? { roundId: ctx.roundId, mechanicState: saved } : null;
    var paused = !!ctx.paused || !Core.allowsInput(engine && engine.status);
    var found = saved.found || [];
    var words = (saved.words || []).map(function (word) {
      var on = found.indexOf(word) !== -1;
      return "<li class=\"lesson-word" + (on ? " is-found" : "") + "\">" + escape(word) + "</li>";
    }).join("");
    var cells = "";
    var r;
    var c;
    for (r = 0; r < saved.rows; r++) {
      for (c = 0; c < saved.cols; c++) {
        var hit = false;
        saved.placements.forEach(function (place) {
          if (found.indexOf(place.word) === -1) return;
          place.cells.forEach(function (cell) { if (cell.r === r && cell.c === c) hit = true; });
        });
        cells += "<button type=\"button\" class=\"lesson-cell" + (hit ? " is-found" : "") + "\" data-r=\"" + r + "\" data-c=\"" + c + "\" tabindex=\"0\">" + escape(saved.grid[r][c]) + "</button>";
      }
    }
    var teams = engine && engine.teams || [];
    var wordPart = slide.participation || "";
    var teamRow = "";
    if ((wordPart === "team_turn" || !wordPart) && teams.length > 1) {
      teamRow = "<div class=\"lesson-word-teams\" role=\"group\" aria-label=\"Team for this word\">" + teams.map(function (team) {
        var on = saved.activeTeamId === team.id ? " is-on" : "";
        return "<button type=\"button\" class=\"lesson-quiet" + on + "\" data-team=\"" + escape(team.id) + "\">" + escape(team.name) + " team</button>";
      }).join("") + "</div>";
    }
    host.innerHTML = "<div class=\"lesson-words" + (paused ? " is-paused" : "") + "\"><div><p class=\"lesson-kicker\">" + escape(slide.kicker || "Word search") + "</p>" +
      "<p class=\"lesson-copy\">" + escape(slide.instruction || "Drag across a word.") + "</p>" + teamRow +
      "<div class=\"lesson-grid\" style=\"--ws-cols:" + saved.cols + "\" role=\"grid\">" + cells + "</div></div>" +
      "<ol class=\"lesson-wordlist\">" + words + "</ol></div>";
    var drag = null;
    function paintPath(path) {
      Array.prototype.forEach.call(host.querySelectorAll(".lesson-cell"), function (cell) {
        cell.classList.remove("is-hot");
      });
      (path || []).forEach(function (cell) {
        var node = host.querySelector("[data-r=\"" + cell.r + "\"][data-c=\"" + cell.c + "\"]");
        if (node) node.classList.add("is-hot");
      });
    }
    function release(path) {
      paintPath([]);
      if (paused || !path || path.length < 2) return;
      var result = Core.checkPath(saved, path);
      if (!result || result.already) return;
      var nextFound = found.concat([result.word]);
      var next = JSON.parse(JSON.stringify(saved));
      next.found = nextFound;
      var person = selectedOf(ctx);
      var award = Core.wordAward(slide, result.word, {
        selected: person,
        teams: teams,
        teamMode: engine && engine.teamMode,
        activeTeamId: saved.activeTeamId,
        participation: slide.participation || "",
        roundId: ctx.roundId
      });
      var extra = "";
      if (award) {
        var called = teamCalled(teams, award.teamId);
        extra = called ? "+" + award.amount + " " + called + " team" : "+" + award.amount;
      }
      var done = nextFound.length === (saved.words || []).length;
      var emission = {
        response: Core.wordResponse(result.word, { selected: person }),
        score: award,
        actionId: "word-" + ctx.roundId + "-" + result.word
      };
      if (done) emission.completion = "mechanic";
      play(ctx, {
        roundId: ctx.roundId,
        mechanicState: next,
        emission: emission,
        feedback: { kind: "yes", text: "Great work!", extra: extra },
        done: done
      });
    }
    if (!paused) {
      listen(bag, host, "pointerdown", function (event) {
        var cell = cellFromEvent(host, event);
        if (!cell) return;
        drag = { r: cell.r, c: cell.c };
        if (host.setPointerCapture && event.pointerId != null) {
          try { host.setPointerCapture(event.pointerId); } catch (err) {}
        }
        paintPath([cell]);
      });
      listen(bag, host, "pointermove", function (event) {
        if (!drag) return;
        var cell = cellFromEvent(host, event);
        if (!cell) return;
        paintPath(Core.linePath(drag.r, drag.c, cell.r, cell.c));
      });
      listen(bag, host, "pointerup", function (event) {
        if (!drag) return;
        var cell = cellFromEvent(host, event) || { r: drag.r, c: drag.c };
        var path = Core.linePath(drag.r, drag.c, cell.r, cell.c);
        drag = null;
        release(path);
      });
      listen(bag, host, "keydown", function (event) {
        var currentCell = host.querySelector(".is-focus") || host.querySelector(".lesson-cell");
        if (!currentCell) return;
        var r0 = Number(currentCell.getAttribute("data-r"));
        var c0 = Number(currentCell.getAttribute("data-c"));
        var key = event.key;
        var dr = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
        var dc = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
        if (dr || dc) {
          event.preventDefault();
          var nr = r0 + dr;
          var nc = c0 + dc;
          var nextCell = host.querySelector("[data-r=\"" + nr + "\"][data-c=\"" + nc + "\"]");
          if (!nextCell) return;
          currentCell.classList.remove("is-focus");
          nextCell.classList.add("is-focus");
          nextCell.focus();
          if (drag) paintPath(Core.linePath(drag.r, drag.c, nr, nc));
          return;
        }
        if (key === "Enter" || key === " ") {
          event.preventDefault();
          if (!drag) {
            drag = { r: r0, c: c0, keyboard: true };
            paintPath([{ r: r0, c: c0 }]);
            return;
          }
          var path = Core.linePath(drag.r, drag.c, r0, c0);
          drag = null;
          release(path);
        }
        if (key === "Escape" && drag) {
          drag = null;
          paintPath([]);
        }
      });
      Array.prototype.forEach.call(host.querySelectorAll("[data-team]"), function (button) {
        listen(bag, button, "click", function () {
          var next = JSON.parse(JSON.stringify(saved));
          next.activeTeamId = button.getAttribute("data-team");
          play(ctx, { roundId: ctx.roundId, mechanicState: next });
        });
      });
    }
    return { destroy: function () { bag.forEach(function (fn) { fn(); }); }, persist: persist };
  }

  function mount(host, ctx) {
    destroyCurrent();
    if (!host || !Core) return null;
    ctx = ctx || {};
    var kind = Core.resolve(ctx.mechanic || (ctx.slide && ctx.slide.type)).id;
    if (kind === "quiz") current = mountQuiz(host, ctx);
    else if (kind === "spin") current = mountSpin(host, ctx);
    else if (kind === "word_search") current = mountWordSearch(host, ctx);
    return current;
  }

  function layerHtml(slide, state) {
    var steps = interactionsOf(slide);
    if (!steps.length) return "";
    var step = Math.max(0, Math.min(Number(state && state.step) || 0, steps.length - 1));
    var current = steps[step];
    if (!current || !stepReached(current, state)) return "";
    if ((current.type === "hotspot" || current.type === "tap-to-reveal") && state && state.revealed && steps[step + 1] && steps[step + 1].type === "move" && stepReached(steps[step + 1], state)) {
      current = steps[step + 1];
    }
    var slabs = (current.type === "move" || current.type === "drag") && (!sceneSlide(slide) || earthquakeMove(current));
    if ((current.type === "move" || current.type === "drag") && !slabs) {
      current = { type: "tap-to-reveal", instruction: current.instruction };
    }
    if (slabs) {
      var stage = state && state.slipped ? "slip" : (state && state.stuck ? "meet" : "apart");
      return "<div class=\"lesson-layer\" data-interaction=\"move\">" +
        "<div class=\"lesson-move is-" + stage + "\">" +
        "<svg class=\"lesson-move-svg\" viewBox=\"0 0 640 280\" aria-hidden=\"true\"><rect class=\"lesson-slab lesson-slab-a\" x=\"36\" y=\"78\" width=\"250\" height=\"124\" rx=\"22\"></rect><rect class=\"lesson-slab lesson-slab-b\" x=\"354\" y=\"78\" width=\"250\" height=\"124\" rx=\"22\"></rect></svg>" +
        (stage === "slip" ? "<p class=\"lesson-dust\" aria-hidden=\"true\"></p>" : "<button type=\"button\" class=\"lesson-go lesson-push\" data-world=\"push\">" + escape(current.instruction || "Push") + "</button>") +
        "</div></div>";
    }
    if (current.type === "hotspot" || current.type === "tap-to-reveal" || current.type === "inspect") {
      if (state && state.revealed) return "<div class=\"lesson-layer is-lit\" data-interaction=\"hotspot\"></div>";
      return "<div class=\"lesson-layer\" data-interaction=\"hotspot\"><button type=\"button\" class=\"lesson-spot\" data-world=\"spot\">" + escape(current.instruction || "Look more closely") + "</button></div>";
    }
    return "";
  }

  function render(slide, ctx) {
    ctx = ctx || {};
    var type = (slide && slide.type) || ctx.mechanic || "story";
    var info = Core ? Core.resolve(type) : { id: type, canonical: false, unknown: false, adapter: type === "story" };
    if (info.canonical) {
      return {
        mode: info.id === "quiz" ? "question" : "game",
        html: "<div id=\"lessonMechanic\" class=\"lesson-mechanic lesson-mechanic--" + info.id + "\"></div>",
        live: true
      };
    }
    if (info.unknown) return { mode: "standard", html: "<div id=\"lessonMechanic\"></div>", invalid: true };
    if (type === "mystery") return { mode: "game", html: mystery(slide || {}, ctx) };
    if (type === "doors") return { mode: "game", html: doors(slide || {}, ctx) };
    if (type === "done" || type === "complete") return { mode: "celebration", html: "<div class=\"lesson-pending\"><p class=\"lesson-kicker\">Finish</p>" + lines(slide) + "</div>" };
    return { mode: "story", html: story(slide || {}, ctx) };
  }

  return { render: render, mount: mount, destroy: destroyCurrent, pupilsToday: pupilCountCopy, actionOf: actionOf, interactionsOf: interactionsOf, layerHtml: layerHtml, earthquakeMove: earthquakeMove, stepReached: stepReached, chooseStep: chooseStep, chooseHtml: chooseHtml };
});
