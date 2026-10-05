/* Teacher adventure draft. Not a live session and not a second class store.
   Suggestions come from the lesson text. They are not treated as facts. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiCreatorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var PLAY = [
    { id: "whole_class", engine: "none", title: "Whole class", text: "Everyone works together and earns one class reward." },
    { id: "teacher_class", engine: "teacher_class", title: "Teacher vs class", text: "Can the class beat the teacher?" },
    { id: "two", engine: "two", title: "2 teams", text: "Split the class into two teams." },
    { id: "multiple", engine: "multiple", title: "Multiple teams", text: "Split the class into three teams." },
    { id: "individual", engine: "none", title: "Individual turns", text: "Wondii chooses pupils during activities." },
    { id: "custom", engine: "custom", title: "Custom teams", text: "Choose exactly who is on each team." }
  ];

  var CAPABILITIES = [
    { id: "quiz", name: "Quiz", description: "A class question with a correct answer.", purpose: "Check understanding", minutes: 4, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "spin", name: "Spin a pupil", description: "Choose someone from today's class.", purpose: "Choose a pupil", minutes: 1, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "word_search", name: "Word search", description: "Find the lesson words in a grid.", purpose: "Vocabulary recap", minutes: 6, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "story", name: "Story", description: "Read a short passage together.", purpose: "Introduce the idea", minutes: 3, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "mystery", name: "Mystery", description: "Reveal one idea from the lesson.", purpose: "A surprise recall", minutes: 2, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "doors", name: "Pick a door", description: "The class chooses one of three doors.", purpose: "Choose together", minutes: 2, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] }
  ];

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8);
  }

  function adventureId() {
    var cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoObj && cryptoObj.randomUUID) return cryptoObj.randomUUID();
    return uid("adv");
  }

  function playMode(id) {
    for (var i = 0; i < PLAY.length; i++) if (PLAY[i].id === id) return PLAY[i];
    return PLAY[0];
  }

  function capabilities(registry) {
    return CAPABILITIES.filter(function (item) {
      if (!registry || !registry.resolve) return true;
      var info = registry.resolve(item.id);
      return info && !info.unknown && item.id !== "done" && item.id !== "complete";
    });
  }

  function capability(id, registry) {
    var list = capabilities(registry);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function blankDraft() {
    return {
      id: adventureId(),
      status: "draft",
      sourceKind: "",
      source: { type: "", filename: "", text: "", unsupported: false },
      title: "",
      subject: "",
      topic: "",
      year: "",
      yearSource: "",
      goals: [],
      vocabulary: [],
      classId: "",
      className: "",
      classYear: "",
      playMode: "whole_class",
      teamStyle: "auto",
      teams: [],
      away: [],
      guests: [],
      activities: [],
      notes: "",
      minutes: 0,
      targetMinutes: 0,
      generationError: "",
      notice: "",
      adaptedFrom: "",
      saved: false
    };
  }

  function yearFromText(text) {
    var match = String(text || "").match(/\byear\s*([1-6])\b/i);
    return match ? "Year " + match[1] : "";
  }

  function yearFromClass(room) {
    if (!room) return "";
    if (room.yearLabel) return String(room.yearLabel);
    return yearFromText(room.name || "");
  }

  function subjectFrom(text) {
    var lower = String(text || "").toLowerCase();
    if (/science|electric|plant|force|gravity|volcano|magnet|space|habitat|water cycle|evaporation|condensation/.test(lower)) return "Science";
    if (/\bmaths\b|mathematics|fraction|addition|times table|subtraction|multiplication/.test(lower)) return "Maths";
    if (/\benglish\b|phonics|grammar|adjective|sentence|writing|spelling|comprehension|\bsh\b|\bch\b/.test(lower)) return "English";
    if (/history|roman|tudor|viking|victorians/.test(lower)) return "History";
    if (/geograph|river|map skills/.test(lower)) return "Geography";
    return "";
  }

  function titleCaseTopic(topic) {
    return String(topic || "").split(/\s+/).filter(Boolean).map(function (word, index) {
      if (index && /^(of|and|the|a|an)$/i.test(word)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  }

  function interpretLesson(text) {
    var raw = String(text || "").replace(/\s+/g, " ").trim();
    var minutesMatch = raw.match(/\b(\d{1,3})\s*(?:min|mins|minute|minutes)\b/i);
    var minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    if (minutes < 5 || minutes > 90) minutes = 0;
    var topic = raw.replace(/\b(\d{1,3})\s*(?:min|mins|minute|minutes)\b/ig, " ");
    topic = topic.replace(/\byear\s*[1-6]\b/ig, " ");
    var sweep;
    for (sweep = 0; sweep < 3; sweep++) {
      topic = topic.replace(/\s+/g, " ").trim();
      topic = topic.replace(/^(?:please\s+)?(?:let'?s\s+)?(?:do\s+)?(?:a\s+)?(?:quick\s+)?(?:recap|lesson|teach|teaching|learn|learning|introducing|introduction)\s+(?:me\s+)?(?:about|of|on|to)?\s*/i, "");
      topic = topic.replace(/^(?:about|on|for|to)\s+/i, "");
      topic = topic.replace(/\b(?:for|about|on)(?:\s+(?:a\s+)?(?:quick\s+)?(?:lesson|recap|adventure)?)?\s*$/i, " ");
    }
    topic = topic.replace(/\b(?:quick|please|lesson|lessons|recap|learn|learning|teach|teaching|introducing|introduction|about|mins|minute|minutes)\b/ig, " ");
    topic = topic.replace(/[^a-z0-9' -]/gi, " ").replace(/\s+/g, " ").trim();
    topic = topic.replace(/^(?:children|pupils|kids|class)\s+/i, "");
    topic = topic.replace(/^(?:what|why|how)\s+/i, "");
    topic = topic.replace(/\s+(?:for|about|on|in)$/i, "");
    topic = topic.replace(/\s+(?:does|do)$/i, "");
    topic = topic.replace(/^(?:the|a|an)\s+/i, "");
    topic = topic.replace(/\s+/g, " ").trim();
    topic = titleCaseTopic(topic);
    return {
      raw: raw,
      topic: topic,
      title: topic ? topic + " Adventure" : "",
      minutes: minutes
    };
  }

  function broadPack(concept) {
    var lower = String(concept || "").toLowerCase().replace(/\s+using\s+.+$/, "").trim();
    if (lower === "fraction" || lower === "fractions") return "Fractions";
    if (lower === "electricity" || lower === "electric") return "Electricity";
    if (lower === "water cycle") return "Water cycle";
    if (lower === "phonics") return "Phonics";
    if (lower === "magnet" || lower === "magnets") return "Magnets";
    var times = lower.match(/^(\d{1,2}) times tables?$/);
    if (times && Number(times[1]) >= 2 && Number(times[1]) <= 12) return times[1] + " times table";
    return "";
  }

  function topicFrom(text) {
    var raw = String(text || "");
    var lower = raw.toLowerCase();
    var specific = interpretLesson(raw).topic;
    var times = (specific + " " + lower).match(/\b(\d{1,2})\s*times tables?\b/i);
    if (times && Number(times[1]) >= 2 && Number(times[1]) <= 12) return times[1] + " times table";
    var packed = broadPack(specific);
    if (packed) return packed;
    if (/\bphonics\b/.test(lower) && (!specific || /^phonics\b/i.test(specific))) return "Phonics";
    if (!specific) {
      if (/electric/.test(lower)) return "Electricity";
      if (/water cycle|evaporation|condensation/.test(lower)) return "Water cycle";
      if (/magnet/.test(lower)) return "Magnets";
    }
    if (/electric/.test(lower) && /\belectricity\b/.test(lower) && specific.split(/\s+/).length > 6) return "Electricity";
    return specific;
  }

  function linesAfter(text, label) {
    var parts = String(text || "").split(/\n/);
    var found = -1;
    var i;
    for (i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase().indexOf(label) !== -1) found = i;
    }
    if (found < 0) return [];
    var out = [];
    for (i = found + 1; i < parts.length; i++) {
      var line = parts[i].trim().replace(/^[-•]\s*/, "");
      if (!line) {
        if (out.length) break;
        continue;
      }
      if (/^[A-Za-z ]{0,40}:$/.test(line) && out.length) break;
      out.push(line);
    }
    return out;
  }

  function wordsFrom(text) {
    var listed = linesAfter(text, "vocabulary").concat(linesAfter(text, "key words"));
    var found = {};
    var words = [];
    function add(word) {
      var clean = String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (clean.length < 3 || clean.length > 14 || found[clean]) return;
      found[clean] = 1;
      words.push(clean);
    }
    listed.forEach(function (line) {
      line.split(/[,;/]/).forEach(add);
    });
    var hints = String(text || "").match(/\b(circuit|battery|switch|current|conductor|insulator|wire|bulb|fraction|quarter|half|numerator|denominator|magnet|force)\b/gi) || [];
    hints.forEach(add);
    return words.slice(0, 12);
  }

  function analyseSource(text) {
    var source = String(text || "").trim();
    if (source.length < 12) return { ok: false, message: "Add a little more about the lesson." };
    var year = yearFromText(source);
    var subject = subjectFrom(source);
    var topic = topicFrom(source);
    var goals = linesAfter(source, "objective").slice(0, 4);
    var vocabulary = wordsFrom(source);
    var requested = requestedMinutes(source);
    return {
      ok: true,
      subject: subject,
      subjectStated: !!subject,
      topic: topic,
      topicStated: !!topic,
      year: year,
      yearStated: !!year,
      goals: goals,
      vocabulary: vocabulary,
      requestedMinutes: requested,
      durationStated: requested > 0,
      title: topic ? topic + " Adventure" : "",
      example: exampleFrom(source),
      graphemes: graphemesFrom(source),
      notice: "Wondii only filled what the lesson text states. Check anything that looks uncertain."
    };
  }

  function requestedMinutes(text) {
    var match = String(text || "").match(/\b(\d{1,3})\s*(?:min|mins|minute|minutes)\b/i);
    var minutes = match ? Number(match[1]) : 0;
    if (!minutes || minutes < 5 || minutes > 90) return 0;
    return minutes;
  }

  function exampleFrom(text) {
    var match = String(text || "").toLowerCase().match(/\busing\s+([a-z][a-z\s]{1,28})/);
    if (!match) return "";
    return match[1].replace(/\b(for|with|and|the|a|an|to)\b[\s\S]*$/, "").replace(/[.?!].*$/, "").trim();
  }

  function graphemesFrom(text) {
    var lower = String(text || "").toLowerCase();
    return ["sh", "ch", "th", "ng", "ai", "ee", "oa", "oo"].filter(function (grapheme) {
      return new RegExp("\\b" + grapheme + "\\b").test(lower);
    });
  }

  function yearNumber(year) {
    var match = String(year || "").match(/([1-6])/);
    return match ? Number(match[1]) : 2;
  }

  function applyAnalysis(draft, analysis) {
    if (!analysis || !analysis.ok) return draft;
    if (analysis.subjectStated) draft.subject = analysis.subject;
    if (analysis.topicStated) draft.topic = analysis.topic;
    if (analysis.yearStated) {
      draft.year = analysis.year;
      draft.yearSource = "stated";
    }
    if (analysis.goals.length) draft.goals = analysis.goals.slice();
    if (analysis.vocabulary.length) draft.vocabulary = analysis.vocabulary.slice();
    draft.targetMinutes = analysis.durationStated ? analysis.requestedMinutes : (draft.targetMinutes || 15);
    draft.example = analysis.example || "";
    draft.graphemes = analysis.graphemes || [];
    draft.notice = analysis.notice;
    var raw = String(draft.source && draft.source.text || "").replace(/\s+/g, " ").trim().toLowerCase();
    var current = String(draft.title || "").trim().toLowerCase();
    var automatic = !current || current === "learning adventure" || (raw && current.indexOf(raw) !== -1);
    if (automatic && analysis.title) draft.title = analysis.title;
    return draft;
  }

  function setClass(draft, room) {
    draft.classId = room ? room.id : "";
    draft.className = room ? room.name : "";
    draft.classYear = yearFromClass(room);
    draft.away = [];
    draft.guests = [];
    draft.teams = [];
    if (draft.yearSource !== "teacher" && draft.yearSource !== "stated" && draft.classYear) {
      draft.year = draft.classYear;
      draft.yearSource = "class";
    }
    return draft;
  }

  function setLearningYear(draft, year) {
    draft.year = year;
    draft.yearSource = "teacher";
    return draft;
  }

  function takingPart(draft, room) {
    var away = {};
    (draft.away || []).forEach(function (id) { away[id] = 1; });
    return ((room && room.pupils) || []).filter(function (pupil) { return pupil && !away[pupil.id]; });
  }

  function excludePupil(draft, pupilId, away) {
    var next = (draft.away || []).filter(function (id) { return id !== pupilId; });
    if (away) next.push(pupilId);
    draft.away = next;
    return draft;
  }

  function addGuest(draft, name) {
    var clean = String(name || "").trim().split(/\s+/)[0].slice(0, 24);
    if (!clean) return draft;
    draft.guests = (draft.guests || []).concat([{ id: uid("guest"), name: clean, temporary: true }]);
    return draft;
  }

  function splitTeams(pupils, count) {
    var people = (pupils || []).slice().sort(function (a, b) {
      return String(a.firstName || "").localeCompare(String(b.firstName || "")) || String(a.id).localeCompare(String(b.id));
    });
    var teams = [];
    var i;
    for (i = 0; i < count; i++) teams.push([]);
    people.forEach(function (pupil, index) { teams[index % count].push(pupil.id); });
    return teams;
  }

  function presentationSplit(pupils) {
    var girls = [];
    var boys = [];
    var open = [];
    (pupils || []).forEach(function (pupil) {
      if (pupil.presentation === "girl") girls.push(pupil.id);
      else if (pupil.presentation === "boy") boys.push(pupil.id);
      else open.push(pupil.id);
    });
    return { girls: girls, boys: boys, open: open, available: girls.length > 0 && boys.length > 0 };
  }

  function ensureTeams(draft, pupils) {
    var mode = playMode(draft.playMode);
    if (mode.engine === "none") {
      draft.teams = [];
      return draft;
    }
    var names = mode.engine === "teacher_class" ? ["Teacher", "Class"]
      : mode.engine === "two" || draft.playMode === "custom" ? ["Red", "Blue"]
      : ["Red", "Blue", "Green"];
    if (draft.playMode === "custom" && draft.teams && draft.teams.length >= 2 && draft.teamStyle === "custom") return draft;
    var buckets;
    if (mode.engine === "teacher_class") buckets = [[], pupils.map(function (pupil) { return pupil.id; })];
    else buckets = splitTeams(pupils, names.length);
    draft.teams = names.map(function (name, index) {
      return { id: (draft.teams[index] && draft.teams[index].id) || uid("team"), name: name, pupilIds: buckets[index] || [] };
    });
    draft.teamStyle = draft.playMode === "custom" ? "custom" : "auto";
    return draft;
  }

  function assignPupil(draft, pupilId, teamId) {
    draft.teams = (draft.teams || []).map(function (team) {
      var ids = (team.pupilIds || []).filter(function (id) { return id !== pupilId; });
      if (team.id === teamId) ids.push(pupilId);
      return { id: team.id, name: team.name, pupilIds: ids };
    });
    draft.teamStyle = "custom";
    draft.playMode = "custom";
    return draft;
  }

  function quizFrom(prompt, choices, correct, points) {
    return {
      id: uid("quiz"),
      mechanic: "quiz",
      purpose: "Check understanding",
      title: "Quiz",
      minutes: choices && choices.length === 2 && (correct === "true" || correct === "false") ? 3 : 4,
      why: "A question from the lesson you provided.",
      config: {
        kind: correct === "true" || correct === "false" ? "boolean" : "multiple",
        prompt: prompt,
        choices: choices,
        correct: correct,
        points: points == null ? 1 : points,
        participation: "whole_class",
        askSelected: false
      }
    };
  }

  function thingWord(example) {
    var word = String(example || "").trim().toLowerCase();
    if (!word) return "shape";
    if (word.slice(-3) === "ies") return word.slice(0, -3) + "y";
    if (word.slice(-1) === "s" && word.length > 3) return word.slice(0, -1);
    return word;
  }

  function generationContext(draft, extra) {
    extra = extra || {};
    var target = draft.targetMinutes || 15;
    return {
      source: (draft.source && draft.source.text) || "",
      year: draft.year || draft.classYear || "",
      yearNumber: yearNumber(draft.year || draft.classYear),
      classId: draft.classId || "",
      className: draft.className || "",
      subject: draft.subject || "",
      topic: draft.topic || "today's lesson",
      example: draft.example || "",
      graphemes: draft.graphemes || [],
      vocabulary: (draft.vocabulary || []).slice(),
      goals: (draft.goals || []).slice(),
      targetMinutes: target,
      playMode: draft.playMode || "whole_class",
      teams: JSON.parse(JSON.stringify(draft.teams || [])),
      pupils: extra.pupils || [],
      teacher: extra.teacher || null,
      interests: extra.interests || []
    };
  }

  function durationBand(target) {
    var tol = Math.max(3, Math.round(target * 0.2));
    return { low: Math.max(5, target - tol), high: target + tol };
  }

  function questionSpec(prompt, choices, correct, explain, kind) {
    return {
      prompt: prompt,
      choices: choices,
      correct: correct,
      explain: explain || "",
      kind: kind || "multiple"
    };
  }

  function numericChoices(answer, step) {
    var correct = String(answer);
    var seen = {};
    var rest = [];
    [step, -step, step * 2, -step * 2, 1, -1, step * 3, 2, -2].forEach(function (delta) {
      var n = answer + delta;
      if (n <= 0 || seen[n] || String(n) === correct) return;
      seen[n] = 1;
      rest.push(String(n));
    });
    return [rest[0], correct, rest[1], rest[2]].filter(Boolean);
  }

  function timesQuestions(factor, year) {
    var max = year <= 2 ? 5 : 12;
    var list = [];
    var n;
    for (n = 1; n <= max; n++) {
      var product = factor * n;
      list.push(questionSpec(
        "What is " + factor + " × " + n + "?",
        numericChoices(product, factor),
        String(product),
        factor + " × " + n + " = " + product
      ));
    }
    if (year <= 4) {
      var pieces = [];
      var i;
      for (i = 0; i < 3; i++) pieces.push(String(factor));
      list.push(questionSpec(
        "What is " + pieces.join(" + ") + "?",
        numericChoices(factor * 3, factor),
        String(factor * 3),
        pieces.join(" + ") + " = " + (factor * 3)
      ));
    }
    list.push(questionSpec(
      factor + " bags contain " + factor + " apples each. How many apples altogether?",
      numericChoices(factor * factor, factor),
      String(factor * factor),
      factor + " groups of " + factor + " make " + (factor * factor) + "."
    ));
    list.push(questionSpec(
      "Which number is missing? " + factor + ", " + (factor * 2) + ", " + (factor * 3) + ", __, " + (factor * 5),
      numericChoices(factor * 4, factor),
      String(factor * 4),
      "The missing number is " + (factor * 4) + "."
    ));
    list.push(questionSpec(
      "Which multiplication gives " + (factor * 6) + "?",
      [factor + " × 6", factor + " × 4", (factor + 1) + " × 6", factor + " × 8"],
      factor + " × 6",
      factor + " × 6 = " + (factor * 6)
    ));
    if (year >= 3) {
      var left = factor + 3;
      list.push(questionSpec(
        "True or false: " + left + " × " + factor + " = " + (left * factor),
        ["True", "False"],
        "true",
        left + " × " + factor + " = " + (left * factor),
        "boolean"
      ));
    }
    return list;
  }

  function makeQuiz(title, specs, why, participation) {
    var first = specs[0];
    var activity = quizFrom(first.prompt, first.choices, first.correct, 1);
    activity.title = title;
    activity.why = why || first.explain || first.prompt;
    activity.config.kind = first.kind === "boolean" ? "boolean" : "multiple";
    activity.config.questions = specs;
    activity.config.explain = first.explain || "";
    activity.config.participation = participation || "whole_class";
    activity.minutes = Math.max(2, specs.length);
    return activity;
  }

  function storyMinutes(lines) {
    var words = lines.join(" ").split(/\s+/).filter(Boolean).length;
    return Math.max(2, Math.min(4, Math.round(words / 18) || 2));
  }

  function spinActivity(topic) {
    var name = topic && topic !== "today's lesson" ? topic : "this lesson";
    return {
      id: uid("spin"),
      mechanic: "spin",
      purpose: "Choose a pupil",
      title: "Choose someone",
      minutes: 1,
      why: "The chosen pupil answers about " + name + ".",
      config: {
        pool: "included",
        avoidRepeat: true,
        preferFresh: true,
        prompt: "Can you name one thing you know about " + name + "?"
      }
    };
  }

  function searchActivity(title, words, topic) {
    return {
      id: uid("word"),
      mechanic: "word_search",
      purpose: "Vocabulary recap",
      title: title,
      minutes: 6,
      why: "Find the words from this lesson.",
      config: {
        title: topic,
        instruction: "Find the words from this lesson.",
        words: words.slice(0, 8),
        points: 1,
        participation: "whole_class"
      }
    };
  }

  function readingActivity(mechanic, title, lines, minutes) {
    return {
      id: uid(mechanic),
      mechanic: mechanic,
      purpose: mechanic === "story" ? "Introduce the idea" : mechanic === "mystery" ? "A surprise recall" : "Choose together",
      title: title,
      minutes: minutes,
      why: lines[0],
      config: { lines: lines }
    };
  }

  function contentFor(ctx) {
    var topic = ctx.topic || "today's lesson";
    var thing = thingWord(ctx.example);
    var early = ctx.yearNumber <= 2;
    var questions = [];
    var words = [];
    var story = [];
    var mystery = [];
    var objective = "";
    if (topic === "Fractions") {
      words = ["HALF", "QUARTER", "EQUAL", "WHOLE", "SHARE", "PART"];
      if (thing !== "shape") {
        var extra = thing.toUpperCase().replace(/[^A-Z]/g, "");
        if (extra.length >= 3 && extra.length <= 14 && words.indexOf(extra) === -1) words.push(extra);
      }
      story = ["Today we are learning about fractions.", "We will look at halves and quarters" + (thing === "shape" ? "." : " of a " + thing + ".")];
      questions.push(questionSpec("A " + thing + " is shared fairly between 2 people. What does each person get?", ["A half", "The whole " + thing, "Nothing", "Three pieces"], "A half", "Each person gets a half."));
      questions.push(questionSpec("A " + thing + " is cut into 4 equal pieces. What is one piece called?", ["A quarter", "A half", "A whole", "A pair"], "A quarter", "One of four equal pieces is a quarter."));
      questions.push(questionSpec("Which is more of the " + thing + "?", ["A half", "A quarter", "None of it", "Two wholes"], "A half", "A half is more than a quarter."));
      questions.push(questionSpec("A " + thing + " is shared fairly between 4 people. What does each person get?", ["A quarter", "A half", "A whole", "Nothing"], "A quarter", "Each person gets a quarter."));
      questions.push(questionSpec("How many halves make a whole " + thing + "?", ["2", "4", "1", "3"], "2", "Two halves make one whole."));
      questions.push(questionSpec("How many quarters make a whole " + thing + "?", ["4", "2", "3", "1"], "4", "Four quarters make one whole."));
      questions.push(questionSpec("Which of these is one quarter?", ["1 of 4 equal pieces", "1 of 2 equal pieces", "The whole " + thing, "3 pieces that are not equal"], "1 of 4 equal pieces", "A quarter is 1 of 4 equal pieces."));
      questions.push(questionSpec("Two halves of a " + thing + " make...", ["A whole " + thing, "A quarter", "Nothing", "Three wholes"], "A whole " + thing, "Two halves make one whole."));
      if (!early) {
        questions.push(questionSpec("Two quarters of a " + thing + " make...", ["A half", "A whole", "Nothing", "Three wholes"], "A half", "Two quarters make a half."));
      }
      mystery = ["A half is bigger than a quarter."];
      objective = "Understand that a whole can be shared into equal halves and quarters.";
    } else if (topic === "Phonics") {
      var sounds = ctx.graphemes.length ? ctx.graphemes : ["sh", "ch"];
      var banks = {
        sh: ["SHIP", "SHOP", "FISH", "SHELL"],
        ch: ["CHIP", "CHAT", "CHIN", "MUCH"],
        th: ["THIS", "THAT", "THIN", "MOTH"],
        ng: ["RING", "SING", "KING", "SONG"],
        ai: ["RAIN", "TAIL", "PAIN", "WAIT"],
        ee: ["TREE", "FEET", "SEED", "KEEP"],
        oa: ["BOAT", "GOAT", "ROAD", "COAT"],
        oo: ["MOON", "BOOK", "FOOD", "POOL"]
      };
      sounds.forEach(function (sound) { words = words.concat(banks[sound] || []); });
      story = ["Today we are listening for " + sounds.join(" and ") + ".", "The class will spot those sounds in words."];
      sounds.slice(0, 3).forEach(function (sound) {
        var bank = banks[sound] || ["SHIP"];
        questions.push(questionSpec("Which word uses the sound " + sound + "?", [bank[0], "DOG", "LEG", "SUN"], bank[0], bank[0] + " uses the sound " + sound + "."));
        if (bank[1]) questions.push(questionSpec("Which other word uses the sound " + sound + "?", [bank[1], "MAP", "CUP", "RED"], bank[1], bank[1] + " uses the sound " + sound + "."));
      });
      if (sounds.length >= 2) {
        questions.push(questionSpec("Which word uses " + sounds[1] + ", not " + sounds[0] + "?", [(banks[sounds[1]] || ["CHAT"])[0], (banks[sounds[0]] || ["SHIP"])[0], "MAT", "PEN"], (banks[sounds[1]] || ["CHAT"])[0], "That word uses " + sounds[1] + "."));
      }
      mystery = ["Listen for the sound at the start of the word."];
      objective = "Hear and spot today's sounds in words.";
    } else if (topic === "Water cycle") {
      words = ["EVAPORATION", "CONDENSATION", "RAIN", "CLOUD", "WATER", "COLLECT"];
      story = ["Water moves from puddles to clouds and back again.", "That journey is called the water cycle."];
      questions.push(questionSpec("Water rising from a puddle into the air is called...", ["Evaporation", "Freezing", "Digging", "Melting"], "Evaporation", "That change is called evaporation."));
      questions.push(questionSpec("Water droplets gathering to make a cloud is called...", ["Condensation", "Evaporation", "Boiling", "Digging"], "Condensation", "That change is called condensation."));
      questions.push(questionSpec("Water falling from a cloud is called...", ["Precipitation", "Evaporation", "Collection", "Melting"], "Precipitation", "Rain falling is precipitation."));
      questions.push(questionSpec("What heats the water in a puddle?", ["The sun", "The moon", "A pencil", "A book"], "The sun", "The sun warms the water."));
      questions.push(questionSpec("Clouds are made of...", ["Tiny water droplets", "Dry sand", "Rocks", "Leaves"], "Tiny water droplets", "Clouds are made of tiny water droplets."));
      questions.push(questionSpec("The water cycle can...", ["Happen again and again", "Happen only once", "Stop the rain forever", "Remove all water"], "Happen again and again", "The same water can move around again."));
      questions.push(questionSpec("A puddle drying up in the sun is...", ["Evaporation", "Collection", "Freezing", "Digging"], "Evaporation", "The water rises as evaporation."));
      questions.push(questionSpec("Rain, snow and hail are all...", ["Precipitation", "Evaporation", "Condensation", "Collection"], "Precipitation", "Water falling from clouds is precipitation."));
      if (ctx.yearNumber >= 3) {
        questions.push(questionSpec("Water flowing back into rivers and the sea is called...", ["Collection", "Evaporation", "Freezing", "Digging"], "Collection", "Water returning is collection."));
        questions.push(questionSpec("Which comes first when a puddle warms up?", ["Evaporation", "Collection", "A river", "Digging"], "Evaporation", "Warm water evaporates first."));
        questions.push(questionSpec("True or false: clouds are made from water.", ["True", "False"], "true", "Clouds are made from water.", "boolean"));
        questions.push(questionSpec("Water vapour cooling into droplets is...", ["Condensation", "Evaporation", "Digging", "Melting a rock"], "Condensation", "Cooling vapour makes condensation."));
        questions.push(questionSpec("Where does collected water often end up?", ["Rivers and the sea", "Inside a pencil", "On the moon", "In a book"], "Rivers and the sea", "Collected water flows to rivers and the sea."));
        questions.push(questionSpec("What drives the water cycle?", ["The sun", "A ruler", "A chair", "A sock"], "The sun", "The sun gives the water cycle its energy."));
        questions.push(questionSpec("Snow falling from a cloud is a kind of...", ["Precipitation", "Evaporation", "Collection", "Digging"], "Precipitation", "Snow falling is precipitation."));
        questions.push(questionSpec("After it rains, water in rivers is part of...", ["Collection", "Evaporation only", "A times table", "A magnet"], "Collection", "Rivers collecting water is collection."));
      }
      mystery = ["The same water can rise, make a cloud, and fall again."];
      objective = "Understand how water moves from puddles to clouds and back again.";
    } else if (topic === "Electricity" || (ctx.vocabulary || []).length >= 3) {
      words = (ctx.vocabulary || []).slice(0, 8);
      if (words.length < 3) words = ["CIRCUIT", "BATTERY", "SWITCH", "BULB"];
      var shown = words.slice(0, 4).map(function (word) { return word.charAt(0) + word.slice(1).toLowerCase(); });
      story = ["Today the class is learning about " + topic + ".", "The important words include " + shown.slice(0, 3).join(", ") + "."];
      questions.push(questionSpec("Which word belongs with " + topic + "?", [shown[0], "Shadow", "Echo", "Friction"], shown[0], shown[0] + " belongs with " + topic + "."));
      if (shown[1]) questions.push(questionSpec("Which of these is also from " + topic + "?", [shown[1], "Shadow", "Echo", "Friction"], shown[1], shown[1] + " is from " + topic + "."));
      if (shown[2]) questions.push(questionSpec("Which word is from today's " + topic + " lesson?", [shown[2], "Shadow", "Echo", "Friction"], shown[2], shown[2] + " is from the lesson."));
      if ((ctx.goals || [])[0]) questions.push(questionSpec(ctx.goals[0] + " True or false?", ["True", "False"], "true", ctx.goals[0], "boolean"));
      mystery = ["A complete path is needed before a bulb can light."];
      objective = "Use the important words from " + topic + ".";
    } else {
      var timesMatch = String(topic).match(/^(\d{1,2}) times table$/);
      if (timesMatch) {
        var factor = Number(timesMatch[1]);
        story = [
          "The " + factor + " times table is groups of " + factor + ".",
          factor + " groups of 3 means " + factor + " + " + factor + " + " + factor + ", which equals " + (factor * 3) + "."
        ];
        questions = timesQuestions(factor, ctx.yearNumber);
        mystery = ["Groups of " + factor + " help the class remember the " + factor + " times table."];
        objective = "Remember the " + factor + " times table.";
      } else {
        story = [];
        mystery = [];
      }
    }
    return {
      questions: questions,
      words: words,
      story: story,
      mystery: mystery,
      objective: objective,
      title: topic + " recap",
      quizTitle: topic + " challenge",
      followTitle: "Your turn"
    };
  }

  function packActivities(ctx, bank) {
    var band = durationBand(ctx.targetMinutes);
    var activities = [];
    var sum = 0;
    var specs = (bank.questions || []).slice();
    function add(activity) {
      if (!activity || sum + activity.minutes > band.high) return false;
      activities.push(activity);
      sum += activity.minutes;
      return true;
    }
    function takeQuiz(title, count, participation) {
      if (count < 1 || !specs.length) return false;
      var batch = specs.splice(0, Math.min(count, specs.length));
      return add(makeQuiz(title, batch, batch[0].explain, participation));
    }
    if (ctx.targetMinutes >= 12 && bank.story.length) {
      add(readingActivity("story", ctx.topic + " together", bank.story, storyMinutes(bank.story)));
    }
    var wantSpin = ctx.targetMinutes >= 8;
    var search = null;
    if (bank.words.length >= 3) {
      search = searchActivity("Find the words", bank.words, ctx.topic);
      search.minutes = Math.min(6, Math.max(3, Math.round(bank.words.length * 0.8)));
    }
    var reserved = (wantSpin ? 1 : 0) + (search ? search.minutes : 0);
    var quizRoom = Math.max(0, band.high - sum - reserved);
    var aim = Math.min(quizRoom, Math.max(2, ctx.targetMinutes - sum - reserved));
    var keep = wantSpin && specs.length > 3 ? 2 : 0;
    var mainCount = Math.min(Math.max(0, specs.length - keep), Math.max(2, Math.round(aim * (wantSpin ? 0.6 : 1))));
    if (mainCount < 1) mainCount = Math.min(specs.length, Math.max(aim, 1));
    takeQuiz(bank.quizTitle || (ctx.topic + " challenge"), mainCount, "whole_class");
    if (search) add(search);
    if (wantSpin) add(spinActivity(ctx.topic));
    var followAim = Math.min(band.high - sum, Math.max(0, ctx.targetMinutes - sum));
    if (followAim >= 2 && specs.length) {
      takeQuiz(bank.followTitle || "Your turn", Math.min(specs.length, followAim), wantSpin ? "selected_pupil" : "whole_class");
    }
    while (sum < band.low && specs.length) {
      if (!takeQuiz(ctx.topic + " practice", Math.min(specs.length, Math.max(2, band.high - sum)), "whole_class")) break;
    }
    if (sum < band.low && bank.mystery.length) add(readingActivity("mystery", "Remember this", bank.mystery, 2));
    if (!activities.length || !activities.some(function (activity) { return activity.mechanic === "quiz" && activity.config && activity.config.prompt && !placeholderText(activity.config.prompt); })) {
      return { ok: false, activities: [], message: "We couldn't finish one of the activities." };
    }
    activities.forEach(function (activity) {
      var meta = capability(activity.mechanic);
      if (meta && !activity.purpose) activity.purpose = meta.purpose;
      if (activity.mechanic === "word_search" && playMode(ctx.playMode).engine !== "none") activity.config.participation = "team_turn";
    });
    return { ok: true, activities: activities, minutes: sum, title: bank.title, objective: bank.objective || "" };
  }

  function recommend(draft, extra) {
    var ctx = generationContext(draft, extra);
    var built = packActivities(ctx, contentFor(ctx));
    draft.targetMinutes = ctx.targetMinutes;
    if (!built.ok) {
      draft.activities = [];
      draft.minutes = 0;
      draft.generationError = built.message;
      return draft;
    }
    draft.generationError = "";
    draft.activities = built.activities;
    draft.minutes = built.minutes;
    if (!draft.title || draft.title === "Learning adventure") draft.title = built.title;
    if (!(draft.goals || []).length) {
      draft.goals = [built.objective || ("Understand " + (draft.topic || "the lesson") + ".")];
    }
    return draft;
  }

  function moveActivity(draft, index, dir) {
    var next = index + dir;
    if (next < 0 || next >= draft.activities.length) return draft;
    var copy = draft.activities.slice();
    var item = copy[index];
    copy[index] = copy[next];
    copy[next] = item;
    draft.activities = copy;
    return draft;
  }

  function duplicateActivity(draft, index) {
    var source = draft.activities[index];
    if (!source) return draft;
    var copy = JSON.parse(JSON.stringify(source));
    copy.id = uid("act");
    draft.activities.splice(index + 1, 0, copy);
    draft.minutes = draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    return draft;
  }

  function removeActivity(draft, index) {
    draft.activities.splice(index, 1);
    draft.minutes = draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    return draft;
  }

  function addActivity(draft, mechanic, registry) {
    var meta = capability(mechanic, registry);
    if (!meta) return draft;
    var activity = {
      id: uid("act"),
      mechanic: meta.id,
      purpose: meta.purpose,
      title: meta.name,
      minutes: meta.minutes,
      why: meta.description,
      config: {}
    };
    if (meta.id === "quiz") activity.config = { kind: "multiple", prompt: "", choices: ["", ""], correct: "", points: 1, participation: "whole_class", askSelected: false };
    if (meta.id === "spin") activity.config = { pool: "included", avoidRepeat: true, preferFresh: true };
    if (meta.id === "word_search") activity.config = { title: draft.topic || "Word search", instruction: "Find the lesson words.", words: [], points: 1, participation: playMode(draft.playMode).engine === "none" ? "whole_class" : "team_turn" };
    if (meta.id === "story" || meta.id === "mystery" || meta.id === "doors") activity.config = { lines: [draft.topic || "Today's idea."] };
    draft.activities.push(activity);
    draft.minutes += meta.minutes;
    return draft;
  }

  function questionIssue(item) {
    item = item || {};
    if (placeholderText(item.prompt)) return "This quiz needs a question.";
    var kind = item.kind === "boolean" ? "boolean" : "multiple";
    if (kind === "boolean") {
      if (String(item.correct) !== "true" && String(item.correct) !== "false") return "This quiz needs a correct answer.";
      return "";
    }
    var choices = (item.choices || []).map(function (choice) { return String(choice || "").trim(); }).filter(Boolean);
    if (choices.length < 2) return "Add at least two answers.";
    if (choices.length > 6) return "Use up to six answers.";
    if (!item.correct || choices.indexOf(String(item.correct)) === -1) return "This quiz needs a correct answer.";
    return "";
  }

  function questionPlayable(item) {
    return !questionIssue(item);
  }

  function slidesPlayable(slides) {
    return (slides || []).every(function (slide) {
      if (!slide || (slide.type !== "question" && slide.type !== "quiz")) return true;
      var list = slide.questions && slide.questions.length ? slide.questions : [slide.question || {}];
      return list.length > 0 && list.every(function (item) {
        var choices = (item.choices || []).map(function (choice) {
          return typeof choice === "string" ? choice : choice.text;
        });
        return questionPlayable({
          prompt: item.prompt,
          choices: choices,
          correct: item.correct,
          kind: item.kind
        });
      });
    });
  }

  function adventurePlayable(journey) {
    if (!journey) return false;
    if (journey.demoElectricity) return true;
    if (journey.plan && journey.plan.activities && journey.plan.activities.length && validateAdventure(journey).length) return false;
    var slides = journey.plan && journey.plan.slides;
    if (slides && slides.length) return slidesPlayable(slides);
    return !!(journey.plan && journey.plan.activities && journey.plan.activities.length);
  }

  function needsRepair(item) {
    if (!item || !item.plan) return false;
    if (item.plan.activities && item.plan.activities.length) return validateAdventure(item).length > 0;
    if (item.plan.slides && item.plan.slides.length) return !slidesPlayable(item.plan.slides);
    return false;
  }

  function placeholderText(value) {
    var text = String(value || "").trim().toLowerCase();
    if (!text) return true;
    return text === "question not written yet" || text === "this quiz needs a question." || text === "question goes here" || text === "add question" || text === "tbc" || text === "todo" || text === "example question" || text === "insert answer" || text === "a question from the lesson you provided.";
  }

  function activityIssue(activity, registry) {
    if (!activity || !capability(activity.mechanic, registry)) return "This activity cannot be played.";
    if (activity.mechanic === "quiz") {
      var quiz = activity.config || {};
      var head = questionIssue({ prompt: quiz.prompt, choices: quiz.choices, correct: quiz.correct, kind: quiz.kind });
      if (head) return head;
      var asked = [quiz].concat(quiz.questions || []);
      var q;
      for (q = 0; q < asked.length; q++) {
        var extraIssue = q === 0 ? "" : questionIssue(asked[q]);
        if (extraIssue) return extraIssue;
        var choices = (asked[q].choices || []).map(function (choice) { return String(choice || "").trim().toLowerCase(); });
        if (choices.indexOf("playtime") !== -1 || choices.indexOf("home time") !== -1 || choices.indexOf("the register") !== -1) {
          return "This question needs real answers from the lesson.";
        }
        var prompt = String(asked[q].prompt || "").trim().toLowerCase();
        if (prompt === "what is this lesson about?" || prompt.indexOf("which idea belongs with ") === 0) {
          return "This question does not teach the topic.";
        }
      }
      return "";
    }
    if (activity.mechanic === "word_search") {
      var words = ((activity.config && activity.config.words) || []).map(function (word) {
        return String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
      }).filter(Boolean);
      if (!words.length) return "Add at least one word.";
      if (words.length > 12) return "A word search can hold up to 12 words.";
      var long = words.filter(function (word) { return word.length > 14; })[0];
      if (long) return long + " is too long. Use 14 letters or fewer.";
      return "";
    }
    if (activity.mechanic === "story" || activity.mechanic === "mystery" || activity.mechanic === "doors") {
      var doorChoices = activity.mechanic === "doors" && activity.config && activity.config.choices && activity.config.choices.length
        ? activity.config.choices
        : ((activity.config && activity.config.lines) || []);
      var lines = doorChoices.map(function (line) { return String(line || "").trim(); }).filter(Boolean);
      if (!lines.length || lines.some(placeholderText)) return "This activity needs something for the class to read.";
      if (activity.mechanic === "mystery" && /^keep the main idea from today/i.test(lines.join(" "))) return "Remember this needs a fact from the lesson.";
      if (activity.mechanic === "doors") {
        if (lines.length < 3) return "Choose one needs three real options.";
        if (lines.some(function (line) { return /^door\s*[123]$/i.test(line) || /^look at the (first|another) idea/i.test(line); })) {
          return "Each choice needs a real option from the lesson.";
        }
      }
    }
    return "";
  }

  function validateActivity(activity, registry) {
    var message = activityIssue(activity, registry);
    return { ok: !message, message: message };
  }

  function brokenLesson(draft) {
    var raw = String(draft && draft.source && draft.source.text || "").replace(/\s+/g, " ").trim().toLowerCase();
    var activities = (draft && draft.activities) || [];
    if (!activities.length) return "Add at least one activity.";
    if (!(draft.goals || []).length) return "The lesson needs a learning objective.";
    if (!String(draft.title || "").trim()) return "The lesson needs a title.";
    var blob = JSON.stringify(activities).toLowerCase();
    if (raw.length >= 12 && blob.indexOf(raw) !== -1) return "The lesson repeated the teacher's request instead of teaching the topic.";
    var i;
    for (i = 0; i < activities.length; i++) {
      var issue = activityIssue(activities[i]);
      if (issue) return issue;
    }
    return "";
  }

  function validateAdventure(input, registry) {
    var activities = input && input.activities ? input.activities : (input && input.plan && input.plan.activities);
    if (!activities) return [];
    return issues({ activities: activities }, registry);
  }

  function issues(draft, registry) {
    var list = [];
    if (!draft.activities.length) list.push("Add at least one activity.");
    draft.activities.forEach(function (activity, index) {
      var issue = activityIssue(activity, registry);
      if (issue) list.push("Activity " + (index + 1) + ": " + issue);
    });
    return list;
  }

  function castRoles(people, characters, seed) {
    var roles = (characters || []).filter(function (role) {
      return role && role.id && !/\b(villain|fool|idiot|stupid|culprit|failure)\b/i.test(role.label || "");
    }).slice(0, 3);
    var names = (people || []).map(function (person) {
      return {
        id: person.id || "",
        name: person.firstName || person.displayName || person.name || ""
      };
    }).filter(function (person) { return person.name && person.name !== "Pupil"; });
    var n = 0;
    String(seed || "wondii").split("").forEach(function (ch, index) { n = (n + ch.charCodeAt(0) * (index + 1)) % 997; });
    var start = names.length ? n % names.length : 0;
    var cast = {};
    roles.forEach(function (role, index) {
      var person = index < names.length ? names[(start + index) % names.length] : null;
      cast[String(role.id).toLowerCase()] = {
        roleId: role.id,
        label: role.label || "",
        name: person ? person.name : "",
        participantId: person ? person.id : ""
      };
    });
    return cast;
  }

  function speakStory(text, cast) {
    return String(text == null ? "" : text).replace(/\{\{\s*([a-z0-9_-]+)\s*\}\}/gi, function (_match, id) {
      var key = String(id || "").toLowerCase();
      var person = cast && cast[key];
      if (person && person.name) return person.name;
      if (person && person.label) return person.label;
      return id;
    });
  }

  function speakSlides(slides, cast) {
    return (slides || []).map(function (slide) {
      var copy = JSON.parse(JSON.stringify(slide || {}));
      ["kicker", "prompt", "teacherCue", "reveal", "role", "mission", "adventureTitle"].forEach(function (key) {
        if (typeof copy[key] === "string") copy[key] = speakStory(copy[key], cast);
      });
      copy.speaker = "";
      if (copy.role && cast) {
        Object.keys(cast).forEach(function (key) {
          var person = cast[key];
          if (!copy.speaker && person && person.name && String(person.label || "").toLowerCase() === String(copy.role).toLowerCase()) {
            copy.speaker = person.name;
          }
        });
      }
      if (Array.isArray(copy.lines)) copy.lines = copy.lines.map(function (line) { return speakStory(line, cast); });
      if (Array.isArray(copy.choices)) copy.choices = copy.choices.map(function (line) { return speakStory(line, cast); });
      if (Array.isArray(copy.reveals)) copy.reveals = copy.reveals.map(function (line) { return speakStory(line, cast); });
      if (copy.question && typeof copy.question === "object") {
        if (copy.question.prompt) copy.question.prompt = speakStory(copy.question.prompt, cast);
        if (copy.question.explain) copy.question.explain = speakStory(copy.question.explain, cast);
        if (Array.isArray(copy.question.choices)) {
          copy.question.choices = copy.question.choices.map(function (choice) {
            if (choice && typeof choice === "object") {
              var next = JSON.parse(JSON.stringify(choice));
              if (next.text) next.text = speakStory(next.text, cast);
              return next;
            }
            return speakStory(choice, cast);
          });
        }
      }
      return copy;
    });
  }

  function brainApi() {
    if (typeof globalThis !== "undefined" && globalThis.WondiiLessonBrain) return globalThis.WondiiLessonBrain;
    if (typeof require === "function") {
      try { return require("../../js/lesson-brain.js"); } catch (e) { return null; }
    }
    return null;
  }

  function earthquakeMove(step) {
    if (!step || (step.type !== "move" && step.type !== "drag")) return false;
    return step.successCondition === "slip" && /^(plate|piece)$/.test(String(step.target || ""));
  }

  function sceneStep(step, beatIndex) {
    var copy = JSON.parse(JSON.stringify(step));
    if ((copy.type === "move" || copy.type === "drag") && !earthquakeMove(copy)) {
      copy = {
        type: "tap-to-reveal",
        sourceType: copy.type,
        target: copy.target || "world",
        instruction: copy.instruction || "Look more closely",
        successCondition: "looked",
        teachingReveal: copy.teachingReveal || ""
      };
    }
    copy.beatIndex = beatIndex;
    return copy;
  }

  function scenePlan(draft) {
    var brain = brainApi();
    if (!brain || !brain.planScenes) return null;
    var plan = draft.lessonPlan || {};
    try {
      return brain.planScenes(draft.activities || [], plan, {
        yearGroup: draft.year || plan.yearGroup || "",
        requestedMinutes: Number(draft.targetMinutes) || Number(plan.durationMinutes) || 0
      });
    } catch (e) {
      return null;
    }
  }

  function sceneSlides(draft, scenes) {
    var stages = stageSlides(draft);
    var byStage = {};
    (draft.activities || []).forEach(function (activity, index) {
      byStage[activity.slotId] = { activity: activity, slide: stages[index] };
    });
    function beatText(beat) {
      return String((beat && beat.pupil && beat.pupil.text) || "").trim();
    }
    return scenes.map(function (scene) {
      var primary = byStage[scene.visual.baseShot] || byStage[scene.stageIds[0]];
      var slide;
      if (scene.purpose === "challenge") {
        slide = JSON.parse(JSON.stringify(primary.slide));
        delete slide.beats;
      } else if (scene.purpose === "finish") {
        var outcome = [];
        var recap = [];
        ((byStage.resolution.activity.beats) || []).forEach(function (beat) { if (beatText(beat)) outcome.push(beatText(beat)); });
        ((byStage.recap.activity.beats) || []).forEach(function (beat) { if (beatText(beat)) recap.push(beatText(beat)); });
        if (!outcome.length) outcome = ((byStage.resolution.slide.lines) || []).filter(Boolean);
        if (!recap.length) recap = ((byStage.recap.slide.lines) || []).filter(Boolean);
        slide = JSON.parse(JSON.stringify(primary.slide));
        delete slide.beats;
        delete slide.interaction;
        delete slide.interactions;
        slide.type = "story";
        slide.kind = "debrief";
        slide.outcome = outcome;
        slide.recap = recap;
        slide.lines = outcome.concat(recap);
        slide.visualAction = { type: "sequence" };
      } else {
        slide = JSON.parse(JSON.stringify(primary.slide));
        delete slide.interaction;
        delete slide.interactions;
        var beats = [];
        var steps = [];
        scene.stageIds.forEach(function (id) {
          var source = byStage[id];
          var own = (source.activity.beats || []).filter(function (beat) { return scene.beatIds.indexOf(beat.id) !== -1; });
          if (!own.length) return;
          var at = beats.length;
          own.forEach(function (beat) { beats.push(JSON.parse(JSON.stringify(beat))); });
          var list = (source.slide.interactions && source.slide.interactions.length) ? source.slide.interactions : (source.slide.interaction ? [source.slide.interaction] : []);
          list.forEach(function (step) { if (step && step.type) steps.push(sceneStep(step, at)); });
          if (id === "hook" && source.slide.worldEffect) slide.worldEffect = source.slide.worldEffect;
        });
        slide.type = "story";
        slide.beats = beats;
        slide.lines = beats.map(beatText).filter(Boolean);
        if (steps.length) slide.interactions = steps;
        if (scene.purpose !== "synthesise") slide.visualAction = { type: "inspect" };
      }
      slide.kicker = scene.label;
      slide.sceneId = scene.id;
      slide.sceneLabel = scene.label;
      slide.purpose = scene.purpose;
      slide.stageIds = scene.stageIds.slice();
      slide.beatIds = scene.beatIds.slice();
      slide.knowledgeRefs = scene.knowledgeRefs.slice();
      slide.usesRefs = scene.usesRefs.slice();
      slide.sourceActivities = scene.stageIds.map(function (id) {
        return { slotId: id, id: (byStage[id].activity && byStage[id].activity.id) || "" };
      });
      slide.visualAssetId = scene.visual.assetId || slide.visualAssetId || "";
      return slide;
    });
  }

  function slidesFor(draft) {
    var scenes = scenePlan(draft || {});
    if (scenes && scenes.length) return sceneSlides(draft, scenes);
    return stageSlides(draft);
  }

  function sceneReportFor(draft) {
    var brain = brainApi();
    var scenes = scenePlan(draft || {});
    if (!scenes || !brain || !brain.sceneReport) return null;
    return brain.sceneReport(scenes);
  }

  function stageSlides(draft) {
    var slides = (draft.activities || []).map(function (activity) {
      if (activity.mechanic === "quiz") {
        var quiz = activity.config || {};
        var specs = (quiz.questions && quiz.questions.length) ? quiz.questions : [{
          prompt: quiz.prompt,
          choices: quiz.choices,
          correct: quiz.correct,
          kind: quiz.kind,
          explain: quiz.explain || ""
        }];
        function slideQuestion(item, index) {
          var boolean = item.kind === "boolean";
          var choices = boolean
            ? [{ id: "true", text: "True" }, { id: "false", text: "False" }]
            : (item.choices || []).map(function (choice) { return String(choice || "").trim(); }).filter(Boolean);
          return {
            id: activity.id + "-q" + index,
            kind: boolean ? "boolean" : "multiple",
            prompt: item.prompt,
            choices: choices,
            correct: boolean ? item.correct : item.correct,
            explain: item.explain || "",
            points: quiz.points == null ? 1 : Number(quiz.points)
          };
        }
        var questions = specs.map(slideQuestion);
        return {
          type: "question",
          kicker: activity.title || "Quiz",
          participation: quiz.participation || (quiz.askSelected ? "selected_pupil" : "whole_class"),
          teacherCue: (quiz.participation === "selected_pupil" || quiz.askSelected) ? "Ask the pupil Wondii has chosen." : "Choose an answer, then move to the next question.",
          lines: [],
          questions: questions,
          question: questions[0]
        };
      }
          if (activity.mechanic === "spin") {
        var ask = activity.config && activity.config.prompt;
        var bare = !ask || ask.length < 12 || /^spin for (a pupil|someone who is here)\.?$/i.test(String(ask).trim()) || /^you'?re up[.!]?$/i.test(String(ask).trim());
        return {
          type: "spin",
          kicker: activity.title || "Choose someone",
          teacherCue: bare ? "" : ask,
          prompt: bare ? "" : ask,
          role: (activity.config && activity.config.role) || "",
          reveal: (activity.config && activity.config.reveal) || "",
          avoidRepeat: activity.config && activity.config.avoidRepeat !== false,
          preferFresh: !activity.config || activity.config.preferFresh !== false,
          lines: bare ? [] : [ask]
        };
      }
      if (activity.mechanic === "word_search") {
        var search = activity.config || {};
        return {
          type: "word_search",
          participation: (activity.config && activity.config.participation) || "whole_class",
          kicker: activity.title || "Word search",
          teacherCue: activity.why || "",
          lines: [search.instruction || "Find the words."],
          words: (search.words || []).slice(),
          points: search.points == null ? 1 : Number(search.points)
        };
      }
      var doorConfig = activity.config || {};
      var doorChoices = doorConfig.choices && doorConfig.choices.length ? doorConfig.choices : (doorConfig.lines || []);
      return {
        type: activity.mechanic,
        kicker: activity.title || "Activity",
        teacherCue: activity.mechanic === "doors" ? (doorConfig.prompt || "") : "",
        prompt: activity.mechanic === "doors" ? (doorConfig.prompt || "") : "",
        lines: activity.mechanic === "doors" ? doorChoices : (doorConfig.lines || [activity.title || ""]),
        choices: activity.mechanic === "doors" ? doorChoices : undefined,
        reveals: activity.mechanic === "doors" ? (doorConfig.reveals || []) : undefined
      };
    });
    slides.forEach(function (slide, index) {
      var activity = (draft.activities || [])[index] || {};
      var scene = activity.scene || {};
      var story = draft.storyPlan || {};
      slide.mission = story.mission || "";
      slide.adventureTitle = story.title || "";
      slide.beat = scene.beat || "";
      slide.kind = scene.kind || "";
      slide.visualBrief = scene.visualBrief || null;
      slide.visualAssetId = scene.visualAssetId || "";
      if (!slide.role && scene.roleId) {
        (story.characters || []).forEach(function (role) {
          if (String(role.id) === String(scene.roleId)) slide.role = role.label || "";
        });
      }
      if (scene.characterId) slide.characterId = scene.characterId;
      else if (scene.roleId || slide.role) {
        (story.characters || []).forEach(function (role, roleIndex) {
          var same = (scene.roleId && String(role.id) === String(scene.roleId)) || (slide.role && String(role.label || "").toLowerCase() === String(slide.role).toLowerCase());
          if (same) slide.characterId = role.characterId || ["CHARACTER_A", "CHARACTER_B", "CHARACTER_C"][roleIndex] || "";
        });
      }
      if (activity.beats && activity.beats.length) slide.beats = activity.beats;
      if (scene.worldEffect) slide.worldEffect = scene.worldEffect;
      if (scene.interaction) slide.interaction = scene.interaction;
      if (scene.interactions && scene.interactions.length) slide.interactions = scene.interactions;
      if (scene.visualAction && scene.visualAction.type) slide.visualAction = scene.visualAction;
      else if (slide.type === "question") slide.visualAction = { type: "predict" };
      else if (slide.type === "spin") slide.visualAction = { type: "point" };
      else if (slide.type === "doors") slide.visualAction = { type: "choose" };
      else if (slide.type === "mystery" || slide.beat === "debrief") slide.visualAction = { type: "sequence" };
      else if (slide.beat === "discovery" || slide.beat === "development" || slide.kind === "teach") slide.visualAction = { type: "inspect" };
      else if (slide.beat === "application") slide.visualAction = { type: "compare" };
      else slide.visualAction = { type: "reveal" };
      if (slide.type !== "spin" || slide.prompt) return;
      var next = slides[index + 1];
      var question = next && (next.question || (next.questions && next.questions[0]));
      var part = next && next.participation;
      if (!question || !question.prompt) return;
      if (part !== "selected_pupil" && part !== "spin") return;
      slide.prompt = question.prompt;
      slide.teacherCue = question.prompt;
      slide.lines = [question.prompt];
      if (!slide.reveal && question.explain) slide.reveal = question.explain;
    });
    return slides;
  }

  function toAdventure(draft, orgId) {
    var copy = {
      id: draft.id,
      status: "ready",
      creator: "v2",
      organisationId: orgId || null,
      classId: draft.classId || "",
      className: draft.className || "",
      title: draft.title || draft.topic || "Learning adventure",
      source: { type: draft.sourceKind || draft.source.type || "paste", filename: draft.source.filename || "", text: draft.source.text || "" },
      learningMap: {
        subject: draft.subject || "",
        yearGroup: draft.year || "",
        topic: draft.topic || "",
        learningObjectives: (draft.goals || []).slice(),
        keyVocabulary: (draft.vocabulary || []).slice(),
        yearAssumption: draft.yearAssumption || "",
        keyKnowledge: (draft.lessonPlan && draft.lessonPlan.keyKnowledge) || [],
        lessonPlan: draft.lessonPlan || null,
        storyPlan: draft.storyPlan || null,
        visualAssets: draft.visualAssets || null,
        sceneReport: sceneReportFor(draft),
        featuredCast: (draft.featuredCast || []).map(function (item) {
          return { characterId: item.characterId, avatarId: item.avatarId, pupilId: item.pupilId || "", roleLabel: item.roleLabel || "" };
        })
      },
      plan: {
        title: draft.title || draft.topic || "Learning adventure",
        slides: slidesFor(draft),
        activities: JSON.parse(JSON.stringify(draft.activities || []))
      },
      playMode: draft.playMode,
      teams: JSON.parse(JSON.stringify(draft.teams || [])),
      targetMinutes: draft.targetMinutes || 0,
      estimateMinutes: draft.minutes || 0,
      notes: draft.notes || "",
      adaptedFrom: draft.adaptedFrom || "",
      updatedAt: new Date().toISOString()
    };
    return copy;
  }

  function fromAdventure(item) {
    var draft = blankDraft();
    if (!item) return draft;
    draft.id = adventureId();
    draft.adaptedFrom = item.id || "";
    draft.status = "draft";
    draft.title = item.title || (item.plan && item.plan.title) || "";
    draft.classId = "";
    draft.className = "";
    var map = item.learningMap || {};
    draft.subject = map.subject || "";
    draft.topic = map.topic || "";
    draft.year = map.yearGroup || "";
    draft.yearSource = draft.year ? "stated" : "";
    draft.goals = (map.learningObjectives || []).slice();
    draft.vocabulary = (map.keyVocabulary || []).slice();
    draft.yearAssumption = map.yearAssumption || "";
    draft.lessonPlan = map.lessonPlan || null;
    draft.storyPlan = map.storyPlan || null;
    draft.featuredCast = map.featuredCast || [];
    draft.visualAssets = map.visualAssets || null;
    draft.targetMinutes = item.targetMinutes || 0;
    draft.source = { type: item.source && item.source.type || "", filename: item.source && item.source.filename || "", text: item.source && item.source.text || "", unsupported: false };
    draft.sourceKind = draft.source.type;
    draft.playMode = item.playMode || "whole_class";
    draft.teams = JSON.parse(JSON.stringify(item.teams || []));
    draft.notes = item.notes || "";
    draft.activities = JSON.parse(JSON.stringify((item.plan && item.plan.activities) || []));
    if (!draft.activities.length && item.plan && item.plan.slides) draft.activities = activitiesFromSlides(item.plan.slides);
    draft.activities = draft.activities.filter(function (activity) { return capability(activity.mechanic); });
    draft.minutes = draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    draft.saved = false;
    return draft;
  }

  function activitiesFromSlides(slides) {
    return (slides || []).map(function (slide) {
      var type = slide.type === "question" ? "quiz" : (slide.type === "word-search" ? "word_search" : slide.type);
      var activity = { id: uid("act"), mechanic: type || "story", purpose: "", title: slide.kicker || "Activity", minutes: 4, why: "", config: {} };
      if (type === "quiz" && slide.question) {
        activity.config = {
          kind: slide.question.kind || "multiple",
          prompt: slide.question.prompt || "",
          choices: (slide.question.choices || []).map(function (choice) { return typeof choice === "string" ? choice : choice.text; }),
          correct: slide.question.correct || "",
          points: slide.question.points == null ? 1 : slide.question.points,
          participation: slide.participation || "whole_class",
          askSelected: slide.participation === "selected_pupil"
        };
      } else if (type === "word_search") {
        activity.config = { title: slide.kicker || "", instruction: (slide.lines || [])[0] || "", words: slide.words || [], points: slide.points == null ? 1 : slide.points, participation: slide.participation || "whole_class" };
      } else if (type === "spin") {
        activity.config = {
          pool: "included",
          avoidRepeat: slide.avoidRepeat !== false,
          preferFresh: slide.preferFresh !== false,
          prompt: (slide.lines || [])[0] || ""
        };
        activity.minutes = 1;
      } else if (type === "doors") {
        var labels = (slide.choices && slide.choices.length ? slide.choices : slide.lines) || [];
        activity.config = {
          prompt: slide.prompt || slide.teacherCue || "",
          choices: labels.slice(),
          lines: labels.slice(),
          reveals: (slide.reveals || []).slice()
        };
        activity.minutes = 2;
      } else activity.config = { lines: slide.lines || [] };
      return activity;
    }).filter(function (activity) { return capability(activity.mechanic); });
  }

  var PARTICIPATION = [
    { id: "whole_class", label: "Whole class", text: "The class answers together." },
    { id: "selected_pupil", label: "Selected pupil", text: "The pupil already chosen answers." },
    { id: "spin", label: "Spin a pupil", text: "Spin chooses who answers." },
    { id: "team_turn", label: "Team turn", text: "The active team answers." },
    { id: "teacher_class", label: "Teacher vs class", text: "The class plays against the teacher." }
  ];

  function participationOptions(mechanic, modeId) {
    if (mechanic === "spin" || mechanic === "story" || mechanic === "mystery" || mechanic === "doors") return ["whole_class"];
    var mode = playMode(modeId);
    return PARTICIPATION.map(function (item) { return item.id; }).filter(function (id) {
      if (id === "team_turn" && mode.engine === "none") return false;
      if (id === "teacher_class" && mode.engine !== "teacher_class") return false;
      return true;
    });
  }

  function participationOf(activity) {
    var config = (activity && activity.config) || {};
    if (config.participation) return config.participation;
    if (config.askSelected) return "selected_pupil";
    return "whole_class";
  }

  function participationLabel(id) {
    var i;
    for (i = 0; i < PARTICIPATION.length; i++) if (PARTICIPATION[i].id === id) return PARTICIPATION[i].label;
    return "Whole class";
  }

  function scoreCopy(activity, modeId) {
    var config = (activity && activity.config) || {};
    var points = config.points == null ? 1 : Number(config.points);
    var part = participationOf(activity);
    var teamed = playMode(modeId).engine !== "none";
    if (!activity || activity.mechanic === "spin") return "Chooses who goes next.";
    if (activity.mechanic !== "quiz" && activity.mechanic !== "word_search") return "The class follows this together.";
    var unit = activity.mechanic === "word_search" ? " per word" : "";
    if (part === "selected_pupil" || part === "spin") return "+" + points + unit + (teamed ? " to their team" : " class reward");
    if (part === "team_turn") return "+" + points + unit + " to the active team";
    if (part === "teacher_class") return "+" + points + unit + " to the class";
    return "+" + points + unit + " class reward";
  }

  function libraryActions(item) {
    if (!isCurrent(item)) return ["Update this adventure"];
    return ["Start", "Preview", "Adapt", "Duplicate"];
  }

  function isCurrent(item) {
    if (!item || item.creator !== "v2" || !item.plan || !item.plan.activities) return false;
    if (unsupportedMechanics(item).length) return false;
    return validateAdventure(item).length === 0;
  }

  function unsupportedMechanics(item) {
    var found = {};
    var list = [];
    var activities = (item && item.plan && item.plan.activities) || [];
    var slides = (item && item.plan && item.plan.slides) || [];
    activities.forEach(function (activity) {
      var id = activity && activity.mechanic;
      if (id && !capability(id) && !found[id]) { found[id] = 1; list.push(id); }
    });
    if (!activities.length) slides.forEach(function (slide) {
      var id = slide && (slide.type === "question" ? "quiz" : slide.type);
      if (id && !capability(id) && !found[id]) { found[id] = 1; list.push(id); }
    });
    return list;
  }

  function sessionPlan(draft, room) {
    var here = takingPart(draft, room);
    var guests = (draft.guests || []).map(function (guest) {
      return { id: guest.id, firstName: guest.name, temporary: true };
    });
    var people = here.concat(guests.map(function (guest) { return { id: guest.id, firstName: guest.firstName }; }));
    var mode = playMode(draft.playMode);
    var working = { playMode: draft.playMode, teamStyle: draft.playMode === "custom" ? "custom" : "auto", teams: JSON.parse(JSON.stringify(draft.teams || [])) };
    if (mode.engine !== "none") {
      var present = {};
      people.forEach(function (pupil) { present[pupil.id] = 1; });
      if (working.teams.length) {
        working.teams = working.teams.map(function (team) {
          return { id: team.id, name: team.name, pupilIds: (team.pupilIds || []).filter(function (id) { return present[id]; }) };
        });
      } else ensureTeams(working, people);
    } else working.teams = [];
    var assignments = [];
    if (mode.engine !== "none") {
      working.teams.forEach(function (team, index) {
        (team.pupilIds || []).forEach(function (id) { assignments.push({ id: id, teamIndex: index }); });
      });
    }
    return {
      classId: draft.classId || "",
      pupils: here.map(function (pupil) { return { id: pupil.id, firstName: pupil.firstName }; }),
      guests: guests,
      teamMode: mode.engine,
      teamNames: working.teams.map(function (team) { return team.name; }),
      teamIds: working.teams.map(function (team) { return team.id; }),
      assignments: mode.engine === "none" ? null : assignments,
      begin: true,
      playMode: draft.playMode
    };
  }

  function boundedIssues(list) {
    var kept = [];
    (list || []).forEach(function (item) {
      var text = String(item == null ? "" : item).replace(/\s+/g, " ").trim();
      if (!text || kept.length >= 8) return;
      kept.push(text.slice(0, 240));
    });
    return kept;
  }

  return {
    PLAY: PLAY,
    playMode: playMode,
    capabilities: capabilities,
    capability: capability,
    blankDraft: blankDraft,
    yearFromText: yearFromText,
    yearFromClass: yearFromClass,
    analyseSource: analyseSource,
    applyAnalysis: applyAnalysis,
    setClass: setClass,
    setLearningYear: setLearningYear,
    takingPart: takingPart,
    excludePupil: excludePupil,
    addGuest: addGuest,
    splitTeams: splitTeams,
    presentationSplit: presentationSplit,
    ensureTeams: ensureTeams,
    assignPupil: assignPupil,
    recommend: recommend,
    interpretLesson: interpretLesson,
    brokenLesson: brokenLesson,
    moveActivity: moveActivity,
    duplicateActivity: duplicateActivity,
    removeActivity: removeActivity,
    addActivity: addActivity,
    activityIssue: activityIssue,
    validateActivity: validateActivity,
    validateAdventure: validateAdventure,
    slidesPlayable: slidesPlayable,
    adventurePlayable: adventurePlayable,
    needsRepair: needsRepair,
    generationContext: generationContext,
    issues: issues,
    castRoles: castRoles,
    speakStory: speakStory,
    speakSlides: speakSlides,
    slidesFor: slidesFor,
    stageSlides: stageSlides,
    sceneReportFor: sceneReportFor,
    earthquakeMove: earthquakeMove,
    toAdventure: toAdventure,
    fromAdventure: fromAdventure,
    sessionPlan: sessionPlan,
    PARTICIPATION: PARTICIPATION,
    participationOptions: participationOptions,
    participationOf: participationOf,
    participationLabel: participationLabel,
    scoreCopy: scoreCopy,
    libraryActions: libraryActions,
    isCurrent: isCurrent,
    unsupportedMechanics: unsupportedMechanics,
    boundedIssues: boundedIssues
  };
});
