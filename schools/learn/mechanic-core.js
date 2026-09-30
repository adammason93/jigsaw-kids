/* Pure classroom mechanic logic. No DOM and no score store.
   Quiz, Spin, and Word Search report outcomes. The session engine applies them. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiMechanicCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var CANONICAL = { quiz: 1, spin: 1, word_search: 1 };
  var ALIAS = {
    question: "quiz", quiz: "quiz", boolean: "quiz", true_false: "quiz",
    spin: "spin",
    "word-search": "word_search", word_search: "word_search"
  };
  var ADAPTERS = { story: 1, mystery: 1, doors: 1, done: 1, complete: 1 };

  function resolve(type) {
    var key = ALIAS[type] || type || "story";
    if (CANONICAL[key]) return { id: key, canonical: true, adapter: false, unknown: false };
    if (ADAPTERS[key]) return { id: key, canonical: false, adapter: true, unknown: false };
    return { id: key, canonical: false, adapter: false, unknown: true };
  }

  function allowsInput(status) {
    return status === "active";
  }

  function hashString(value) {
    var text = String(value || "");
    var hash = 2166136261;
    var i;
    for (i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    var next = seed >>> 0;
    return function () {
      next = next + 0x6D2B79F5 | 0;
      var t = Math.imul(next ^ next >>> 15, 1 | next);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function normaliseQuiz(config) {
    config = config || {};
    var source = config.question || config;
    var kind = source.kind || source.questionType || source.type || "";
    var prompt = String(source.prompt || config.prompt || "").trim();
    var promptKey = prompt.toLowerCase();
    if (!promptKey || promptKey === "question" || promptKey === "question not written yet" || promptKey === "this quiz needs a question." || promptKey === "question goes here" || promptKey === "add question" || promptKey === "tbc" || promptKey === "todo" || promptKey === "a question from the lesson you provided.") {
      return { ok: false, error: "quiz_prompt", kind: "multiple", prompt: prompt, choices: [] };
    }
    var explain = String(source.explain || "");
    var points = source.points == null && config.points == null ? 1 : Number(source.points != null ? source.points : config.points);
    if (isNaN(points) || points < 0) points = 0;
    if (kind === "boolean" || kind === "true_false" || source.correct === true || source.correct === false) {
      if (kind === "boolean" || kind === "true_false" || source.choices == null) {
        var yes = !(source.correct === false || source.correct === "false" || source.correct === "F");
        return {
          ok: true,
          kind: "boolean",
          prompt: prompt,
          explain: explain,
          points: points,
          correct: yes ? "true" : "false",
          choices: [{ id: "true", text: "True" }, { id: "false", text: "False" }]
        };
      }
    }
    var choices = (source.choices || []).map(function (choice, index) {
      if (typeof choice === "string") return { id: String.fromCharCode(65 + index), text: choice };
      return { id: String(choice.id || String.fromCharCode(65 + index)), text: String(choice.text || "") };
    }).filter(function (choice) { return choice.text; });
    if (choices.length > 6) choices = choices.slice(0, 6);
    if (choices.length < 2) return { ok: false, error: "quiz_choices", kind: "multiple", choices: choices, prompt: prompt };
    var correct = String(source.correct || choices[0].id);
    var known = false;
    choices.forEach(function (choice) {
      if (choice.id === correct || choice.text === correct) known = true;
      if (choice.text === correct) correct = choice.id;
    });
    if (!known) return { ok: false, error: "quiz_correct", kind: "multiple", choices: choices, prompt: prompt };
    return { ok: true, kind: "multiple", prompt: prompt, explain: explain, points: points, correct: correct, choices: choices };
  }

  function answeringPerson(ctx) {
    var selected = ctx && ctx.selected;
    if (!selected) return null;
    if (selected.identity === "pupil" || selected.identity === "anonymous") return selected;
    return null;
  }

  function configuredParticipation(config, ctx) {
    ctx = ctx || {};
    if (ctx.participation) return ctx.participation;
    var slide = config || {};
    if (slide.participation) return slide.participation;
    if (slide.question && slide.question.participation) return slide.question.participation;
    return "";
  }

  function quizOutcome(config, choiceId, ctx) {
    ctx = ctx || {};
    var quiz = normaliseQuiz(config);
    if (!quiz.ok) return quiz;
    var correct = String(choiceId) === String(quiz.correct);
    var mode = configuredParticipation(config, ctx);
    var person = (!mode || mode === "selected_pupil" || mode === "spin") ? answeringPerson(ctx) : null;
    var response = {
      participantId: person ? person.id : "",
      classVoice: !person,
      responseType: quiz.kind === "boolean" ? "boolean" : "choice",
      value: String(choiceId),
      correct: correct
    };
    var score = null;
    if (correct && quiz.points > 0) {
      if (!mode) {
        var teamId = person && person.teamId ? person.teamId : null;
        if (!(ctx.teams && ctx.teams.length) || teamId) {
          score = { teamId: teamId, amount: quiz.points, reason: "quiz-" + (ctx.roundId || "round") };
        }
      } else {
        var target = scoreTarget({
          teams: ctx.teams || [],
          teamMode: ctx.teamMode || ((ctx.teams && ctx.teams.length) ? "two" : "none"),
          participants: person ? [person] : [],
          selectedParticipantId: person ? person.id : null,
          activeTeamId: ctx.activeTeamId || null
        }, mode === "spin" ? "selected_pupil" : mode);
        if (target.kind === "team" || target.kind === "class") {
          score = { teamId: target.teamId, amount: quiz.points, reason: "quiz-" + (ctx.roundId || "round") };
        }
      }
    }
    return { ok: true, correct: correct, quiz: quiz, response: response, score: score };
  }

  function eligiblePeople(participants) {
    return (participants || []).filter(function (person) {
      return person && !person.demo && (person.identity === "pupil" || person.identity === "anonymous");
    });
  }

  function seededShuffle(list, seed) {
    var rng = mulberry32(hashString(seed));
    var copy = list.slice();
    var i;
    for (i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function spinNext(participants, saved, seed, config) {
    config = config || {};
    saved = saved || {};
    var people = eligiblePeople(participants);
    if (!people.length) return { ok: false, error: "nobody" };
    var ids = people.map(function (person) { return person.id; });
    var avoid = config.avoidRepeat !== false;
    var order = (saved.order || []).filter(function (id) { return ids.indexOf(id) !== -1; });
    if (!saved.order || !saved.order.length) order = seededShuffle(ids, seed || "spin");
    ids.forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
    var cursor = Number(saved.cursor) || 0;
    var lastId = saved.lastId || "";
    if (cursor >= order.length) {
      order = seededShuffle(ids, (seed || "spin") + ":cycle:" + cursor);
      if (avoid && order.length > 1 && order[0] === lastId) {
        order.push(order.shift());
      }
      cursor = 0;
    }
    var id = order[cursor];
    if (avoid && id === lastId && order.length > 1) {
      cursor = (cursor + 1) % order.length;
      id = order[cursor];
    }
    var picked = (saved.picked || []).slice();
    if (picked.indexOf(id) === -1) picked.push(id);
    return {
      ok: true,
      id: id,
      state: { kind: "spin", order: order, cursor: cursor + 1, lastId: id, picked: picked }
    };
  }

  function spinWindow(participants, order, id) {
    var byId = {};
    (participants || []).forEach(function (person) { byId[person.id] = person; });
    var list = order && order.length ? order : (participants || []).map(function (person) { return person.id; });
    var index = list.indexOf(id);
    if (index < 0) index = 0;
    if (list.length <= 5) {
      return list.map(function (pid) { return byId[pid]; }).filter(Boolean);
    }
    var slots = [];
    var offset;
    for (offset = -2; offset <= 2; offset++) {
      var at = (index + offset + list.length) % list.length;
      slots.push(byId[list[at]]);
    }
    return slots.filter(Boolean);
  }

  function normaliseWords(words) {
    var out = [];
    (words || []).forEach(function (word) {
      var clean = String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (clean.length >= 2 && out.indexOf(clean) === -1) out.push(clean);
    });
    return out;
  }

  function directionsFor(difficulty) {
    if (difficulty === "easy") return [[0, 1], [1, 0]];
    return [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]];
  }

  function tryGrid(words, size, dirs, seed) {
    var rng = mulberry32(hashString(seed));
    var grid = [];
    var r;
    var c;
    for (r = 0; r < size; r++) {
      grid[r] = [];
      for (c = 0; c < size; c++) grid[r][c] = "";
    }
    var placements = [];
    var ordered = words.slice().sort(function (a, b) { return b.length - a.length; });
    var w;
    for (w = 0; w < ordered.length; w++) {
      var word = ordered[w];
      var placed = false;
      var attempt;
      for (attempt = 0; attempt < 160 && !placed; attempt++) {
        var dir = dirs[Math.floor(rng() * dirs.length)];
        var r0 = Math.floor(rng() * size);
        var c0 = Math.floor(rng() * size);
        var cells = [];
        var ok = true;
        var i;
        for (i = 0; i < word.length; i++) {
          var rr = r0 + dir[0] * i;
          var cc = c0 + dir[1] * i;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) { ok = false; break; }
          if (grid[rr][cc] && grid[rr][cc] !== word.charAt(i)) { ok = false; break; }
          cells.push({ r: rr, c: cc });
        }
        if (!ok) continue;
        for (i = 0; i < cells.length; i++) grid[cells[i].r][cells[i].c] = word.charAt(i);
        placements.push({ word: word, cells: cells });
        placed = true;
      }
      if (!placed) return null;
    }
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        if (!grid[r][c]) grid[r][c] = alphabet.charAt(Math.floor(rng() * alphabet.length));
      }
    }
    return { grid: grid, placements: placements };
  }

  function generateWordSearch(config, seed) {
    config = config || {};
    var words = normaliseWords(config.words);
    if (!words.length) return { ok: false, error: "no_words" };
    if (words.length > 12) return { ok: false, error: "too_many_words" };
    var longest = 0;
    words.forEach(function (word) { if (word.length > longest) longest = word.length; });
    if (longest > 14) return { ok: false, error: "word_too_long" };
    var minSize = Math.max(longest, Number(config.gridSize) || 0, 8);
    if (minSize > 14) return { ok: false, error: "words_do_not_fit" };
    var dirs = directionsFor(config.difficulty);
    var size;
    for (size = minSize; size <= 14; size++) {
      var made = tryGrid(words, size, dirs, String(seed || "word") + ":" + size);
      if (!made) continue;
      return {
        ok: true,
        kind: "word_search",
        seed: String(seed || "word"),
        rows: size,
        cols: size,
        grid: made.grid,
        placements: made.placements,
        words: words,
        found: [],
        activeTeamId: ""
      };
    }
    return { ok: false, error: "words_do_not_fit" };
  }

  function sameCells(left, right) {
    if (!left || !right || left.length !== right.length) return false;
    var i;
    for (i = 0; i < left.length; i++) {
      if (left[i].r !== right[i].r || left[i].c !== right[i].c) return false;
    }
    return true;
  }

  function checkPath(puzzle, cells) {
    if (!puzzle || !puzzle.placements || !cells || cells.length < 2) return null;
    var reversed = cells.slice().reverse();
    var word = "";
    puzzle.placements.forEach(function (place) {
      if (word) return;
      if (sameCells(place.cells, cells) || sameCells(place.cells, reversed)) word = place.word;
    });
    if (!word) return null;
    var found = puzzle.found || [];
    return { word: word, already: found.indexOf(word) !== -1 };
  }

  function linePath(r0, c0, r1, c1) {
    var dr = r1 - r0;
    var dc = c1 - c0;
    if (!dr && !dc) return [{ r: r0, c: c0 }];
    var sr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    var sc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
    if (sr && sc && Math.abs(dr) !== Math.abs(dc)) return null;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    var path = [];
    var i;
    for (i = 0; i <= steps; i++) path.push({ r: r0 + sr * i, c: c0 + sc * i });
    return path;
  }

  function scoreTarget(engine, participation) {
    engine = engine || {};
    var teams = engine.teams || [];
    var teamed = teams.length && engine.teamMode && engine.teamMode !== "none";
    if (participation === "selected_pupil") {
      var chosen = null;
      (engine.participants || []).forEach(function (item) {
        if (item.id === engine.selectedParticipantId) chosen = item;
      });
      if (chosen && chosen.teamId && teamed) return { teamId: chosen.teamId, kind: "team" };
      if (!teamed) return { teamId: null, kind: "class" };
      return { teamId: null, kind: "none" };
    }
    if (participation === "team_turn") {
      return engine.activeTeamId ? { teamId: engine.activeTeamId, kind: "team" } : { teamId: null, kind: "none" };
    }
    if (participation === "teacher_class") {
      var classTeam = null;
      teams.forEach(function (team) { if (team.name === "Class") classTeam = team; });
      return classTeam ? { teamId: classTeam.id, kind: "team" } : { teamId: null, kind: "none" };
    }
    return { teamId: null, kind: "class" };
  }

  function wordAward(config, word, ctx) {
    ctx = ctx || {};
    config = config || {};
    var points = config.points == null ? 1 : Number(config.points);
    if (config.score === "none" || !points || points < 0) return null;
    var mode = configuredParticipation(config, ctx);
    if (mode) {
      var person = mode === "selected_pupil" || mode === "spin" ? answeringPerson(ctx) : null;
      var target = scoreTarget({
        teams: ctx.teams || [],
        teamMode: ctx.teamMode || ((ctx.teams && ctx.teams.length) ? "two" : "none"),
        participants: person ? [person] : [],
        selectedParticipantId: person ? person.id : null,
        activeTeamId: ctx.activeTeamId || null
      }, mode === "spin" ? "selected_pupil" : mode);
      if (target.kind !== "team" && target.kind !== "class") return null;
      return { teamId: target.teamId, amount: points, reason: "word-" + (ctx.roundId || "round") + "-" + word };
    }
    var teamId = ctx.activeTeamId || (ctx.selected && ctx.selected.teamId) || null;
    if (ctx.teams && ctx.teams.length && !teamId) return null;
    return { teamId: teamId || null, amount: points, reason: "word-" + (ctx.roundId || "round") + "-" + word };
  }

  function wordResponse(word, ctx) {
    var person = answeringPerson(ctx);
    return {
      participantId: person ? person.id : "",
      classVoice: !person,
      responseType: "word-found",
      value: word,
      correct: true
    };
  }

  function commitMechanic(Engine, state, packet) {
    packet = packet || {};
    if (!Engine || !state) return { ok: false, state: state, error: "missing" };
    if (packet.mechanicState && packet.roundId && Engine.saveMechanicState) {
      var kept = Engine.saveMechanicState(state, packet.roundId, packet.mechanicState);
      if (!kept.ok) return kept;
      state = kept.state;
    }
    var emission = packet.emission ? JSON.parse(JSON.stringify(packet.emission)) : null;
    if (emission && emission.response && emission.response.classVoice) {
      var voice = null;
      state.participants.forEach(function (person) { if (person.identity === "teacher") voice = person; });
      if (!voice && Engine.addParticipant) {
        var added = Engine.addParticipant(state, { displayName: "Class", identity: "teacher" });
        if (added.ok) {
          state = added.state;
          voice = state.participants[state.participants.length - 1];
        }
      }
      if (voice) emission.response.participantId = voice.id;
      delete emission.response.classVoice;
    }
    if (emission && Engine.applyMechanicResult) {
      var applied = Engine.applyMechanicResult(state, emission);
      if (!applied.ok) return applied;
      state = applied.state;
    }
    if (packet.reveal && Engine.revealAnswer) {
      var shown = Engine.revealAnswer(state);
      if (shown.ok) state = shown.state;
    }
    if (packet.hide && Engine.hideAnswer) {
      var hidden = Engine.hideAnswer(state);
      if (hidden.ok) state = hidden.state;
    }
    return { ok: true, state: state, error: "" };
  }

  function fixtureSlides() {
    return [
      {
        type: "question",
        kicker: "Quiz",
        question: {
          kind: "multiple",
          prompt: "Which material conducts electricity?",
          choices: [
            { id: "A", text: "Rubber" },
            { id: "B", text: "Copper" },
            { id: "C", text: "Wood" },
            { id: "D", text: "Plastic" }
          ],
          correct: "B",
          explain: "Copper is a metal. Metals let electricity pass."
        }
      },
      { type: "spin", kicker: "Spin a pupil", lines: ["Who will try the next question?"] },
      {
        type: "question",
        kicker: "True or false",
        question: {
          kind: "boolean",
          prompt: "A complete circuit can light a bulb.",
          correct: true,
          explain: "The path has to be closed."
        }
      },
      {
        type: "word-search",
        kicker: "Word search",
        instruction: "Find the electricity words.",
        words: ["CIRCUIT", "BATTERY", "SWITCH", "CURRENT"],
        points: 1
      },
      {
        type: "question",
        kicker: "Quiz",
        question: {
          kind: "multiple",
          prompt: "What does a switch do when it is open?",
          choices: [
            { id: "A", text: "It joins the path" },
            { id: "B", text: "It leaves a gap" }
          ],
          correct: "B",
          explain: "An open switch breaks the circuit."
        }
      }
    ];
  }

  return {
    resolve: resolve,
    allowsInput: allowsInput,
    hashString: hashString,
    normaliseQuiz: normaliseQuiz,
    quizOutcome: quizOutcome,
    eligiblePeople: eligiblePeople,
    spinNext: spinNext,
    spinWindow: spinWindow,
    normaliseWords: normaliseWords,
    generateWordSearch: generateWordSearch,
    checkPath: checkPath,
    linePath: linePath,
    scoreTarget: scoreTarget,
    wordAward: wordAward,
    wordResponse: wordResponse,
    commitMechanic: commitMechanic,
    fixtureSlides: fixtureSlides
  };
});
