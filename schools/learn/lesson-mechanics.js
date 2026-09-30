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

  function story(slide) {
    return "<div class=\"lesson-story\">" +
      (slide.image ? "<img class=\"lesson-scene\" src=\"" + escape(slide.image) + "\" alt=\"" + escape(slide.alt || "") + "\" />" : "") +
      "<div><p class=\"lesson-kicker\">" + escape(slide.kicker || "Story") + "</p>" + lines(slide) +
      (slide.teacherCue ? "<p class=\"lesson-cue\">" + escape(slide.teacherCue) + "</p>" : "") +
      "</div></div>";
  }

  function mystery(slide, ctx) {
    var open = !!ctx.mysteryOpen;
    return "<div class=\"lesson-mystery\"><p class=\"lesson-kicker\">" + escape(slide.kicker || "Mystery") + "</p>" + lines(slide) +
      (open ? "<p class=\"lesson-react lesson-react--yes\">" + escape(ctx.mysteryText || "Keep the idea you have just learned.") + "</p>" : "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonMystery\">Open it</button>") +
      "</div>";
  }

  function doors(slide, ctx) {
    var row = [1, 2, 3].map(function (n) {
      var on = String(ctx.door || "") === String(n);
      return "<button type=\"button\" class=\"lesson-door" + (on ? " is-on" : "") + "\" data-door=\"" + n + "\"><span>Door</span><strong>" + n + "</strong></button>";
    }).join("");
    return "<div class=\"lesson-doors\"><p class=\"lesson-kicker\">" + escape(slide.kicker || "Pick a door") + "</p><p class=\"lesson-copy\">The class chooses one door.</p><div class=\"lesson-door-row\">" + row + "</div>" +
      (ctx.door ? "<p class=\"lesson-react\">" + escape(ctx.doorText || "Today's idea stays with the class.") + "</p>" : "") +
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

  function mountQuiz(host, ctx) {
    var bag = [];
    var quiz = Core.normaliseQuiz(ctx.slide || {});
    if (!quiz.ok) {
      if (ctx.actions && ctx.actions.fail) ctx.actions.fail();
      return { destroy: function () { bag.forEach(function (fn) { fn(); }); } };
    }
    var engine = engineOf(ctx);
    var saved = stored(ctx) || {};
    var revealed = !!(engine && engine.reveal);
    var paused = !!ctx.paused || !Core.allowsInput(engine && engine.status);
    var selected = selectedOf(ctx);
    var part = (ctx.slide && ctx.slide.participation) || "";
    var named = selected && (selected.identity === "pupil" || selected.identity === "anonymous");
    var who = (part === "selected_pupil" || part === "spin" || !part) && named
      ? "<p class=\"lesson-kicker\">" + escape(selected.displayName) + "</p>" : "";
    if ((part === "selected_pupil" || part === "spin") && !named) who = "<p class=\"lesson-kicker\">The selected pupil answers</p>";
    var teams = engine && engine.teams || [];
    var teamRow = "";
    if (part === "team_turn" && teams.length) {
      teamRow = "<div class=\"lesson-word-teams\" role=\"group\" aria-label=\"Team answering\"><p class=\"lesson-kicker\">Team turn</p>" + teams.map(function (team) {
        var on = saved.activeTeamId === team.id ? " is-on" : "";
        return "<button type=\"button\" class=\"lesson-quiet" + on + "\" data-team=\"" + escape(team.id) + "\">" + escape(team.name) + "</button>";
      }).join("") + "</div>";
    }
    var choices = quiz.choices.map(function (choice) {
      var right = (revealed || saved.correct) && choice.id === quiz.correct;
      var again = !right && saved.choice === choice.id && saved.correct === false;
      var label = quiz.kind === "boolean" ? escape(choice.text) : "<b>" + escape(choice.id) + "</b><span>" + escape(choice.text) + "</span>";
      return "<button type=\"button\" class=\"lesson-choice" + (right ? " is-right" : "") + (again ? " is-again" : "") + "\" data-choice=\"" + escape(choice.id) + "\"" + (paused || revealed ? " disabled" : "") + ">" + label + "</button>";
    }).join("");
    var againBtn = !paused && !revealed && saved.choice && saved.correct === false
      ? "<button type=\"button\" class=\"lesson-quiet\" id=\"lessonTry\">Try again</button>" : "";
    var explain = revealed && quiz.explain ? "<p class=\"lesson-cue\">" + escape(quiz.explain) + "</p>" : "";
    host.innerHTML = "<div class=\"lesson-question\"><p class=\"lesson-kicker\">" + escape((ctx.slide && ctx.slide.kicker) || "Quiz") + "</p>" + who +
      "<h2 class=\"lesson-prompt\">" + escape(quiz.prompt) + "</h2>" + teamRow + "<div class=\"lesson-choices\">" + choices + "</div>" + explain + againBtn + "</div>";
    Array.prototype.forEach.call(host.querySelectorAll("[data-choice]"), function (button) {
      listen(bag, button, "click", function () {
        if (paused || revealed) return;
        var choiceId = button.getAttribute("data-choice");
        var outcome = Core.quizOutcome(ctx.slide, choiceId, {
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
        play(ctx, {
          roundId: ctx.roundId,
          mechanicState: { kind: "quiz", choice: choiceId, correct: outcome.correct, activeTeamId: saved.activeTeamId || "" },
          emission: {
            response: outcome.response,
            score: outcome.score,
            actionId: "quiz-" + ctx.roundId + "-" + choiceId + "-" + Date.now()
          },
          reveal: outcome.correct,
          feedback: {
            kind: outcome.correct ? "yes" : "again",
            text: outcome.correct ? "Great work!" : "Nearly! Let's have another look.",
            extra: extra
          }
        });
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll("[data-team]"), function (button) {
      listen(bag, button, "click", function () {
        play(ctx, { roundId: ctx.roundId, mechanicState: { kind: "quiz", activeTeamId: button.getAttribute("data-team"), choice: saved.choice, correct: saved.correct } });
      });
    });
    var retry = host.querySelector("#lessonTry");
    listen(bag, retry, "click", function () {
      play(ctx, { roundId: ctx.roundId, mechanicState: { kind: "quiz" }, clearFeedback: true });
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

  function mountSpin(host, ctx) {
    var bag = [];
    var timer = 0;
    var engine = engineOf(ctx);
    var people = Core.eligiblePeople(engine && engine.participants);
    var saved = stored(ctx) || { kind: "spin", order: [], cursor: 0, lastId: "", picked: [] };
    var selected = selectedOf(ctx);
    if (selected && (selected.identity === "pupil" || selected.identity === "anonymous")) saved.lastId = selected.id;
    var order = saved.order && saved.order.length ? saved.order : people.map(function (person) { return person.id; });
    var focusId = selected && (selected.identity === "pupil" || selected.identity === "anonymous") ? selected.id : (saved.lastId || "");
    var windowPeople = focusId ? Core.spinWindow(people, order, focusId) : people.slice(0, 5);
    var paused = !!ctx.paused || !Core.allowsInput(engine && engine.status);
    var strip = windowPeople.map(function (person) {
      return faceHtml(person, ctx.portraits, person && person.id === focusId);
    }).join("");
    var count = people.length ? "<p class=\"lesson-copy\">" + people.length + " pupils today</p>" : "<p class=\"lesson-copy\">Add the class, then spin.</p>";
    host.innerHTML = "<div class=\"lesson-spin\"><p class=\"lesson-kicker\">" + escape((ctx.slide && ctx.slide.kicker) || "Spin a pupil") + "</p>" +
      lines(ctx.slide) + count + "<div class=\"lesson-spin-strip\" aria-live=\"polite\">" + strip + "</div>" +
      "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonSpin\"" + (paused || !people.length ? " disabled" : "") + ">Spin</button></div>";
    var button = host.querySelector("#lessonSpin");
    listen(bag, button, "click", function () {
      if (paused) return;
      var plan = Core.spinNext(engine.participants, saved, (engine.sessionId || "spin") + ":" + ctx.roundId, ctx.slide || {});
      if (!plan.ok) return;
      var landed = null;
      people.forEach(function (person) { if (person.id === plan.id) landed = person; });
      var stripNode = host.querySelector(".lesson-spin-strip");
      if (stripNode) {
        stripNode.innerHTML = Core.spinWindow(people, plan.state.order, plan.id).map(function (person) {
          return faceHtml(person, ctx.portraits, person && person.id === plan.id);
        }).join("");
      }
      function finish() {
        play(ctx, {
          roundId: ctx.roundId,
          mechanicState: plan.state,
          emission: { participantId: plan.id, actionId: "spin-" + ctx.roundId + "-" + plan.state.cursor }
        });
      }
      if (ctx.reduced) finish();
      else {
        host.classList.add("is-spinning");
        timer = setTimeout(finish, 1400);
      }
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
    return { mode: "story", html: story(slide || {}) };
  }

  return { render: render, mount: mount, destroy: destroyCurrent };
});
