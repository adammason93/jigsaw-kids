/* Fast teacher paths on top of the Learning Adventure model.
   Quick Create, templates, defaults, favourites and follow-ups stay in this browser.
   Nothing here calls a live model or redraws illustrations. */
(function (global) {
  "use strict";

  var Learn = global.WondiiLearn;
  if (!Learn) return;

  var PREFS_KEY = "wondii-teach-prefs";
  var FAV_KEY = "wondii-teach-favs";
  var RECENT_KEY = "wondii-teach-recent";
  var FEED_KEY = "wondii-teach-feedback";
  var SEEN_KEY = "wondii-teach-seen";
  var LIBRARY_KEY = "wondii-learning-adventures";
  var SESSION_KEY = "wondii-class-sessions";

  var MINUTES = {
    quiz: 5, exit_ticket: 4, word_search: 6, matching: 6, sequencing: 6,
    circuit_game: 5, story: 12, stem: 10, comprehension: 6, maths: 6, creative: 8
  };

  var TEMPLATES = [
    { id: "quick_quiz", title: "Quick quiz", text: "A short knowledge check.", activities: ["quiz"], minutes: 5, images: false },
    { id: "vocabulary", title: "Vocabulary blast", text: "Key words and what they mean.", activities: ["word_search", "matching"], minutes: 10, images: false },
    { id: "story", title: "Story adventure", text: "Learning through a narrative.", activities: ["story", "quiz"], minutes: 20, images: true },
    { id: "stem", title: "STEM mission", text: "A problem-solving challenge.", activities: ["stem"], minutes: 15, images: false },
    { id: "retrieval", title: "Retrieval practice", text: "Recall something already taught.", activities: ["quiz"], minutes: 5, images: false },
    { id: "exit_ticket", title: "Exit ticket", text: "A short check before the lesson ends.", activities: ["exit_ticket"], minutes: 5, images: false },
    { id: "starter", title: "Lesson starter", text: "A quick activity to begin.", activities: ["quiz"], minutes: 5, images: false },
    { id: "matching", title: "Match and sort", text: "Match words, parts or meanings.", activities: ["matching"], minutes: 8, images: false },
    { id: "sequencing", title: "Sequencing challenge", text: "Put a process or events in order.", activities: ["sequencing"], minutes: 8, images: false },
    { id: "end_topic", title: "End-of-topic challenge", text: "Review several learning objectives.", activities: ["quiz", "matching", "stem"], minutes: 20, images: false }
  ];

  var SUBJECTS = ["Science", "Maths", "English", "History", "Geography"];

  var ELECTRIC_QUESTIONS = [
    {
      id: "gap",
      objective: "Complete circuits",
      prompt: "Why won't the bulb light?",
      choices: [
        { id: "A", text: "The circuit has a gap" },
        { id: "B", text: "The bulb is too small" },
        { id: "C", text: "The wire is blue" }
      ],
      correct: "A",
      explain: "Electricity needs a complete path around the circuit."
    },
    {
      id: "switch",
      objective: "Role of a switch",
      prompt: "What happens when the switch opens?",
      choices: [
        { id: "A", text: "The path is broken" },
        { id: "B", text: "The cell gets bigger" },
        { id: "C", text: "The wire changes colour" }
      ],
      correct: "A",
      explain: "An open switch leaves a gap, so the bulb goes out."
    },
    {
      id: "cell",
      objective: "Cells",
      prompt: "Which component provides the energy?",
      choices: [
        { id: "A", text: "The cell" },
        { id: "B", text: "The switch" },
        { id: "C", text: "The colour of the wire" }
      ],
      correct: "A",
      explain: "The cell provides the energy. The wires only carry it round."
    }
  ];

  function read(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function prefs() {
    var saved = read(PREFS_KEY, {});
    return {
      yearGroup: saved.yearGroup || "",
      level: saved.level || "expected",
      heroCharacterId: saved.heroCharacterId || "alex",
      buddyCharacterId: saved.buddyCharacterId || "fox",
      classroomMode: saved.classroomMode || "present",
      minutes: saved.minutes || 15,
      favouriteTemplates: saved.favouriteTemplates || []
    };
  }

  function savePrefs(next) {
    write(PREFS_KEY, next);
    return next;
  }

  function favs() {
    var saved = read(FAV_KEY, {});
    return { adventures: saved.adventures || [], templates: saved.templates || [] };
  }

  function toggleFav(kind, id) {
    var book = favs();
    var list = kind === "template" ? book.templates : book.adventures;
    var at = list.indexOf(id);
    if (at === -1) list.push(id);
    else list.splice(at, 1);
    if (kind === "template") book.templates = list;
    else book.adventures = list;
    write(FAV_KEY, book);
    return book;
  }

  function isFav(kind, id) {
    var book = favs();
    var list = kind === "template" ? book.templates : book.adventures;
    return list.indexOf(id) !== -1;
  }

  function touchRecent(id) {
    if (!id) return;
    var list = read(RECENT_KEY, []).filter(function (item) { return item !== id; });
    list.unshift(id);
    write(RECENT_KEY, list.slice(0, 8));
  }

  function recentJourneys() {
    var ids = read(RECENT_KEY, []);
    var all = Learn.visibleLibrary();
    return ids.map(function (id) {
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
      return null;
    }).filter(Boolean);
  }

  function estimate(selected) {
    var total = 0;
    (selected || []).forEach(function (id) { total += MINUTES[id] || 5; });
    return total || 5;
  }

  function estimateLabel(minutes) {
    return "About " + minutes + " minutes";
  }

  function electricTopic(map) {
    return /electric/i.test((map && (map.topic || map.summary)) || "");
  }

  function questionsFor(map, count) {
    if (electricTopic(map)) return ELECTRIC_QUESTIONS.slice(0, count || 3);
    var objectives = (map.learningObjectives || []).filter(Boolean);
    if (!objectives.length && map.topic) objectives = [map.topic];
    return objectives.slice(0, count || 3).map(function (objective, index) {
      return {
        id: "draft_" + index,
        objective: objective,
        prompt: objective,
        draft: true,
        choices: [
          { id: "A", text: "This matches today's lesson" },
          { id: "B", text: "This is a different idea" },
          { id: "C", text: "This was not in the lesson" }
        ],
        correct: "A",
        explain: "Check this against the learning objective before the lesson. It is a draft, not a checked question."
      };
    });
  }

  function activitiesForTime(minutes, map) {
    var ids = Learn.recommendations(map).recommended.slice();
    if (minutes <= 5) {
      return ids.filter(function (id) { return id === "quiz" || id === "maths" || id === "circuit_game"; }).slice(0, 2);
    }
    if (minutes <= 10) return ids.filter(function (id) { return id !== "story"; }).slice(0, 3);
    return ids;
  }

  function templateById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i];
    return null;
  }

  function applyDefaults(journey) {
    var saved = prefs();
    var map = journey.learningMap;
    map.confidence = map.confidence || {};
    if (!map.yearGroup && saved.yearGroup) {
      map.yearGroup = saved.yearGroup;
      map.confidence.yearGroup = "preference";
      map.yearFromPreference = true;
    }
    if (!map.level) map.level = saved.level || "expected";
    return journey;
  }

  function gaps(journey) {
    var map = journey.learningMap || {};
    var missing = [];
    if (!map.yearGroup) missing.push("yearGroup");
    if (!map.subject) missing.push("subject");
    if (!map.topic) missing.push("topic");
    return missing;
  }

  function libraryAll() {
    var list = read(LIBRARY_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function findJourney(id) {
    var found = null;
    libraryAll().forEach(function (item) { if (item.id === id) found = item; });
    return found;
  }

  function schoolShelf() {
    return Learn.visibleLibrary().filter(function (item) { return item.sharedWithSchool || item.preparedExample; });
  }

  function matchExisting(journey) {
    var topic = ((journey.learningMap && journey.learningMap.topic) || "").toLowerCase();
    if (!topic) return [];
    return Learn.visibleLibrary().filter(function (item) {
      if (item.id === journey.id) return false;
      if (item.status === "archived") return false;
      var theirs = ((item.learningMap && item.learningMap.topic) || "").toLowerCase();
      return theirs && (theirs === topic || topic.indexOf(theirs) !== -1 || theirs.indexOf(topic) !== -1);
    });
  }

  function shareToSchool(id) {
    var item = findJourney(id);
    if (!item) return null;
    item.sharedWithSchool = true;
    Learn.upsertLibrary(item);
    return item;
  }

  function illustratedScenes() {
    var img = "../../games/images/schools/demo/";
    return [
      { type: "story", kicker: "The problem", image: img + "lights-click-900.webp", alt: "Alex and Fox as the town lights go out", lines: ["Evening was settling over Wondii Town. Alex and Fox waited for the lamps to twinkle on.", "CLICK! Every light went out."] },
      { type: "story", kicker: "A complete circuit", image: img + "lights-glows-760.webp", alt: "Alex holds a glowing bulb joined to a cell", lines: ["Alex joined the pieces. Cell. Wire. Bulb. Wire. Back to the cell.", "GLOWS! The path was whole."] }
    ];
  }

  function guideLines(map) {
    var lines = ((map && map.learningObjectives) || []).filter(Boolean);
    if (lines.length) return lines;
    if (map && map.topic) return [map.topic];
    return ["Today's lesson"];
  }

  function lessonWords(map, extra) {
    var words = (map.keyVocabulary || []).filter(Boolean);
    if (words.length) return words.slice(0, 8);
    var blob = guideLines(map).join(" ") + " " + (map.topic || "") + " " + (extra || "");
    var seen = {};
    blob.split(/[^A-Za-z]+/).forEach(function (word) {
      var clean = word.toLowerCase();
      if (clean.length < 4) return;
      if (/^(this|that|with|from|your|have|they|them|then|than|into|about|lesson|today|history|maths|english|science|geography|year)$/.test(clean)) return;
      seen[clean] = word;
    });
    var list = Object.keys(seen).map(function (key) { return seen[key]; });
    if (!list.length && map.topic) list = [map.topic];
    return list.slice(0, 8);
  }

  function packQuestion(id, prompt, answer, wrongs, explain) {
    var texts = [String(answer)].concat(wrongs.map(function (item) { return String(item); }));
    var letters = ["A", "B", "C"];
    var shift = (String(answer).length + texts.length) % 3;
    var ordered = texts.slice(shift).concat(texts.slice(0, shift));
    var correct = letters[ordered.indexOf(String(answer))];
    return {
      id: id,
      prompt: prompt,
      choices: ordered.map(function (text, index) { return { id: letters[index], text: text }; }),
      correct: correct || "A",
      explain: explain
    };
  }

  function mathsKind(journey) {
    var map = journey.learningMap || {};
    var blob = [map.topic, map.summary, journey.source && journey.source.text].join(" ").toLowerCase();
    if (/times|multipl|×/.test(blob)) return "times";
    if (/subtract|take away|minus|−/.test(blob)) return "minus";
    if (/divid|÷/.test(blob)) return "divide";
    return "add";
  }

  function sumsIn(text) {
    var found = [];
    var re = /(\d+)\s*([+\-−×x*÷/])\s*(\d+)/g;
    var match;
    var source = String(text || "");
    while ((match = re.exec(source)) && found.length < 8) {
      found.push({ a: Number(match[1]), op: match[2], b: Number(match[3]) });
    }
    return found;
  }

  function solveSum(item) {
    if (/[×x*]/.test(item.op)) return { prompt: item.a + " × " + item.b, answer: item.a * item.b };
    if (/[÷/]/.test(item.op) && item.b) return { prompt: item.a + " ÷ " + item.b, answer: Math.round(item.a / item.b) };
    if (/[-−]/.test(item.op)) return { prompt: item.a + " − " + item.b, answer: item.a - item.b };
    return { prompt: item.a + " + " + item.b, answer: item.a + item.b };
  }

  function madeSums(journey, count, start) {
    var kind = mathsKind(journey);
    var map = journey.learningMap || {};
    var blob = [map.topic, map.summary, journey.source && journey.source.text].join(" ").toLowerCase();
    var year = /([1-6])/.exec(map.yearGroup || "");
    var yearNum = year ? Number(year[1]) : 3;
    var twoDigit = /two-digit|column|tens/.test(blob) || (yearNum >= 3 && kind === "add");
    var list = [];
    for (var n = 0; n < count; n++) {
      var i = (start || 0) + n + 1;
      var a = twoDigit ? 14 + (i * 7) % 50 : 2 + (i * 3) % 10;
      var b = twoDigit ? 12 + (i * 5) % 40 : 1 + (i % 8);
      if (kind === "minus" && a < b) {
        var swap = a;
        a = b;
        b = swap;
      }
      if (kind === "times") list.push({ a: Math.max(2, a % 12), op: "×", b: Math.max(2, b % 12) });
      else if (kind === "minus") list.push({ a: a, op: "−", b: b });
      else if (kind === "divide") list.push({ a: a * Math.max(2, b % 9), op: "÷", b: Math.max(2, b % 9) });
      else list.push({ a: a, op: "+", b: b });
    }
    return list;
  }

  function numberSlides(journey, label, count, skip) {
    var written = sumsIn(journey.source && journey.source.text);
    var fromGuide = written.slice(skip || 0);
    var need = Math.max(0, count - fromGuide.length);
    var sums = fromGuide.concat(need ? madeSums(journey, need, (skip || 0) + written.length) : []).slice(0, count);
    return sums.map(function (item, index) {
      var solved = solveSum(item);
      var wrongA = solved.answer + 1 + index;
      var wrongB = Math.max(0, solved.answer - 2);
      if (wrongB === solved.answer) wrongB = solved.answer + 3;
      return {
        type: "question",
        kicker: label,
        id: "num_" + index + "_" + label,
        question: packQuestion(
          "num_" + label + "_" + index,
          "What is " + solved.prompt + "?",
          solved.answer,
          [wrongA, wrongB],
          solved.prompt + " = " + solved.answer
        )
      };
    });
  }

  function storyPages(journey) {
    var map = journey.learningMap || {};
    var topic = map.topic || "today's lesson";
    var source = String((journey.source && journey.source.text) || "");
    var sentences = source.split(/[.\n]+/).map(function (line) { return line.trim(); }).filter(function (line) { return line.length > 12; });
    var lines = sentences.length ? sentences : guideLines(map);
    var words = lessonWords(map, source);
    var pages = [{ type: "story", kicker: topic, lines: [lines[0]] }];
    if (lines[1]) pages.push({ type: "story", kicker: "What happens", lines: [lines[1]] });
    if (lines[2]) pages.push({ type: "story", kicker: "And then", lines: [lines[2]] });
    pages.push({ type: "story", kicker: "Words to keep", lines: ["Keep these words from the lesson.", words.join(", ")] });
    return pages;
  }

  function quizSlides(map, count) {
    var lines = guideLines(map);
    var topic = map.topic || "today's lesson";
    return lines.slice(0, count).map(function (line, index) {
      return {
        type: "question",
        kicker: "Pop quiz",
        id: "quiz_" + index,
        question: packQuestion(
          "guide_" + index,
          index === 0 ? "Which of these is in today's lesson?" : "Which idea belongs with " + topic + "?",
          line.slice(0, 110),
          ["A different lesson", "Something we did not learn"],
          line
        )
      };
    });
  }

  function predictionSlide(map) {
    var topic = map.topic || "today's lesson";
    var idea = ((map.learningObjectives || []).filter(Boolean)[0]) || topic;
    return {
      type: "question",
      kicker: "What do you think?",
      teacherCue: "Ask the class. A pupil can come to the board and tap.",
      id: "predict_0",
      question: packQuestion(
        "predict_0",
        "What belongs with " + topic + "?",
        idea.slice(0, 110),
        ["A different lesson", "Something we did not learn"],
        idea
      )
    };
  }

  function shapeBoardMoments(journey, slides) {
    var level = journey.playfulness || "playful";
    if (level === "calm") return;
    var at = Math.min(2, slides.length);
    slides.splice(at, 0, {
      type: "spin",
      kicker: "An explorer's turn",
      teacherCue: "Spin for someone who is here. They come to the board.",
      lines: ["Spin for an explorer."]
    });
    if (level !== "game_show") return;
    slides.splice(Math.min(at + 2, slides.length), 0, {
      type: "mystery",
      kicker: "A surprise",
      teacherCue: "Tap to reveal something from today's lesson.",
      lines: ["Something from the lesson is waiting."]
    });
    slides.splice(Math.min(at + 3, slides.length), 0, {
      type: "doors",
      kicker: "Pick a door",
      teacherCue: "The class chooses. Each door leads back to today's learning.",
      lines: ["Three doors. One choice."]
    });
  }

  function slidesFor(journey) {
    if (!journey) return null;
    if (journey.creationMode === "guided" && journey.demoElectricity && (journey.selected || []).indexOf("story") !== -1 && !journey.paceMinutes && !journey.templateId) {
      return null;
    }
    var map = journey.learningMap || {};
    var steps = (journey.plan && journey.plan.steps) || [];
    var slides = [];
    var asked = 0;
    var maths = (map.subject || "").toLowerCase() === "maths";
    var board = journey.deliveryMode !== "groups" && journey.deliveryMode !== "individual";
    var storyCount = 0;
    steps.forEach(function (step) {
      if (step.id === "story") {
        var scenes = journey.demoElectricity ? illustratedScenes() : storyPages(journey);
        scenes.forEach(function (scene) {
          if (board && storyCount === 0) scene.teacherCue = "Read this together, then continue.";
          storyCount += 1;
          slides.push(scene);
        });
        if (board) slides.push(predictionSlide(map));
        return;
      }
      if (step.id === "maths") {
        numberSlides(journey, board ? "Class question" : "Number game", board ? 3 : 4).forEach(function (slide) {
          asked += 1;
          if (board) slide.teacherCue = "Come up and tap the answer.";
          slides.push(slide);
        });
        return;
      }
      if (step.id === "quiz" || step.id === "exit_ticket") {
        var count = step.id === "exit_ticket" ? 3 : (board ? 3 : 3);
        var label = step.id === "exit_ticket" ? (board ? "Exit challenge" : "Exit ticket") : (board ? "Class question" : "Pop quiz");
        var bank = maths ? numberSlides(journey, label, count, 4) : quizSlides(map, count);
        if (!maths && step.questions && step.questions.length && electricTopic(map)) {
          bank = step.questions.map(function (question) {
            return { type: "question", kicker: label, id: question.id, question: question };
          });
        }
        if (board) bank.forEach(function (slide) { slide.kicker = label; slide.teacherCue = "Ask the class. Someone can come up and tap."; });
        bank.forEach(function (slide) {
          asked += 1;
          slides.push(slide);
        });
        return;
      }
      if (step.id === "word_search") {
        slides.push({
          type: "activity",
          kicker: "Word search",
          teacherCue: board ? "A pupil can come to the board and find a word." : "",
          lines: ["Find these words from the lesson.", lessonWords(map, journey.source && journey.source.text).join("  ·  ")]
        });
        return;
      }
      if (step.id === "matching") {
        var idea = guideLines(map)[0];
        slides.push({
          type: "question",
          kicker: board ? "Together on the board" : "Matching game",
          teacherCue: board ? "Ask the class, then tap the answer they choose." : "",
          id: "match_0",
          question: packQuestion("match_0", "Which one matches " + (map.topic || "the lesson") + "?", idea.slice(0, 110), ["A different lesson", "Something we did not learn"], idea)
        });
        return;
      }
      if (step.id === "circuit_game") {
        slides.push({
          type: "activity",
          kicker: "Circuit challenge",
          teacherCue: board ? "Build it together on the big screen." : "",
          lines: ["Leave a gap in the circuit. Then close the path so the bulb lights.", "Talk it through on the board, or open the prepared circuit."],
          href: "../demo/electricity.html"
        });
        return;
      }
      slides.push({ type: "activity", kicker: step.title || "Activity", lines: [step.summary || ""] });
    });
    if (board && !storyCount) slides.unshift(predictionSlide(map));
    if (!asked && electricTopic(map)) {
      questionsFor(map, 3).forEach(function (question) {
        slides.push({ type: "question", kicker: "Pop quiz", id: question.id, question: question });
      });
    }
    if (board) shapeBoardMoments(journey, slides);
    slides.push({
      type: "done",
      kicker: "Complete",
      lines: journey.demoElectricity
        ? ["You brought the lights back.", "Today you explored complete circuits, cells, bulbs and switches."]
        : maths
          ? ["You finished the number games.", "Every question came from " + (map.topic || "your lesson") + "."]
          : ["You finished the story.", "The word search and the pop quiz used " + (map.topic || "your lesson") + "."]
    });
    return slides;
  }

  function attachQuestions(journey) {
    var count = journey.paceMinutes && journey.paceMinutes <= 5 ? 3 : 3;
    (journey.plan.steps || []).forEach(function (step) {
      if (step.id === "quiz" || step.id === "exit_ticket") step.questions = questionsFor(journey.learningMap, count);
    });
  }

  function finishQuick(journey) {
    var saved = prefs();
    var template = journey.templateId ? templateById(journey.templateId) : null;
    if (template) journey.selected = template.activities.slice();
    else if (journey.paceMinutes) journey.selected = activitiesForTime(journey.paceMinutes, journey.learningMap);
    else if (!journey.selected || !journey.selected.length) journey.selected = activitiesForTime(saved.minutes || 20, journey.learningMap);
    if (journey.selected.indexOf("circuit_game") !== -1 && !electricTopic(journey.learningMap)) {
      journey.selected = journey.selected.filter(function (id) { return id !== "circuit_game"; });
    }
    if (journey.selected.indexOf("story") !== -1) {
      journey.characters.heroCharacterId = journey.characters.heroCharacterId || saved.heroCharacterId || "alex";
      journey.characters.buddyCharacterId = journey.characters.buddyCharacterId || saved.buddyCharacterId || "fox";
    }
    journey.plan = Learn.planFor(journey);
    if (journey.paceMinutes && journey.paceMinutes <= 5 && journey.plan) {
      var focus = journey.learningMap.topic || "today";
      journey.plan.title = (journey.templateId === "exit_ticket" ? "Exit ticket" : "Quick check") + " — " + focus;
    }
    journey.selected.forEach(function (id) {
      var has = (journey.plan.steps || []).some(function (step) { return step.id === id; });
      if (!has) {
        var item = Learn.activityById(id);
        journey.plan.steps.push({ id: id, title: item ? item.title : id, summary: item ? item.text : "" });
      }
    });
    attachQuestions(journey);
    journey.estimateMinutes = estimate(journey.selected);
    journey.imageWork = journey.selected.indexOf("story") !== -1;
    if (!journey.deliveryMode) journey.deliveryMode = "whole_class";
    journey.plan.slides = slidesFor(journey);
    journey.status = "ready";
    journey.uiStep = "ready";
    journey.creationMode = journey.creationMode || "quick";
    Learn.upsertLibrary(journey);
    Learn.saveDraft(journey);
    touchRecent(journey.id);
    return journey;
  }

  function ensureSchoolExample(orgId) {
    var existing = findJourney("lj_school_lights");
    if (existing) {
      if (orgId && !existing.organisationId) {
        existing.organisationId = orgId;
        Learn.upsertLibrary(existing);
      }
      return existing;
    }
    var journey = Learn.blank();
    journey.id = "lj_school_lights";
    journey.provider = "demo";
    journey.status = "ready";
    journey.sharedWithSchool = true;
    journey.preparedExample = true;
    journey.createdByLabel = "Prepared example";
    journey.organisationId = orgId || null;
    journey.demoElectricity = true;
    journey.creationMode = "guided";
    journey.source = { type: "sample", filename: "year-4-electricity.txt", text: Learn.SAMPLE };
    journey.learningMap = {
      subject: "Science",
      yearGroup: "Year 4",
      topic: "Electricity",
      learningObjectives: [
        "Identify common components in a simple electrical circuit",
        "Recognise whether a circuit is complete",
        "Explain why a bulb may not light"
      ],
      keyVocabulary: ["circuit", "cell", "bulb", "wire", "switch"],
      level: "expected",
      groundingMode: "source",
      summary: "Pupils learn that a lamp lights only when the circuit is complete.",
      confidence: { subject: "high", yearGroup: "high", topic: "high" }
    };
    journey.characters = { heroCharacterId: "alex", buddyCharacterId: "fox" };
    journey.selected = ["story", "word_search", "circuit_game", "quiz", "stem"];
    journey.plan = Learn.planFor(journey);
    journey.estimateMinutes = estimate(journey.selected);
    journey.imageWork = true;
    Learn.upsertLibrary(journey);
    return journey;
  }

  function preparedSamples() {
    return [
      {
        id: "sample-lights",
        title: "The Night the Lights Went Out",
        meta: "Year 4 · Science · Electricity",
        href: "create.html?example=lights"
      },
      {
        id: "sample-magnet",
        title: "The Mystery of the Moving Magnet",
        meta: "Year 3 · Science · Forces and magnets",
        href: "create.html?example=magnet"
      },
      {
        id: "sample-garden",
        title: "The Secret Garden",
        meta: "Year 2 · Science · Plants",
        href: "create.html?example=garden"
      }
    ];
  }

  function openExample(which) {
    if (which === "lights") {
      var existing = findJourney("lj_school_lights");
      var orgId = "";
      try {
        var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
        orgId = org && org.organisation && org.organisation.id ? org.organisation.id : "";
      } catch (e) {}
      var item = existing || ensureSchoolExample(orgId);
      Learn.openJourney(item);
      touchRecent(item.id);
      return item;
    }
    var specs = {
      magnet: { year: "Year 3", topic: "Forces and magnets", subject: "Science", title: "The Mystery of the Moving Magnet", objective: "Notice that magnets can attract and repel." },
      garden: { year: "Year 2", topic: "Plants", subject: "Science", title: "The Secret Garden", objective: "Name the main parts of a plant and what they do." }
    };
    var spec = specs[which];
    if (!spec) return null;
    var journey = Learn.blank();
    journey.creationMode = "quick";
    journey.learningMap.subject = spec.subject;
    journey.learningMap.yearGroup = spec.year;
    journey.learningMap.topic = spec.topic;
    journey.learningMap.learningObjectives = [spec.objective];
    journey.learningMap.confidence = { subject: "high", yearGroup: "high", topic: "high" };
    journey.source = { type: "sample", filename: "", text: spec.year + " " + spec.subject + " — " + spec.topic + ". " + spec.objective };
    journey.selected = ["quiz"];
    journey.templateId = "quick_quiz";
    finishQuick(journey);
    if (journey.plan) journey.plan.title = spec.title;
    Learn.upsertLibrary(journey);
    return journey;
  }

  function sessions() {
    var list = read(SESSION_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function makeFollowUp(sessionCode, kind) {
    var session = null;
    sessions().forEach(function (item) {
      if (item.code === String(sessionCode || "").toUpperCase()) session = item;
    });
    var source = session ? findJourney(session.journeyId) : null;
    var journey = Learn.blank();
    journey.creationMode = "quick";
    journey.paceMinutes = 5;
    if (source) {
      journey.learningMap = JSON.parse(JSON.stringify(source.learningMap));
      journey.source = JSON.parse(JSON.stringify(source.source || journey.source));
      journey.demoElectricity = !!source.demoElectricity;
      journey.organisationId = source.organisationId || null;
    } else if (session) {
      journey.learningMap.subject = session.subject || "";
      journey.learningMap.yearGroup = session.yearGroup || "";
      journey.learningMap.topic = session.topic || "";
      journey.learningMap.learningObjectives = ["Revisit " + (session.topic || "today's idea")];
    }
    var weak = "this idea";
    if (session && global.ClassRooms && global.ClassRooms.summary) {
      var stats = global.ClassRooms.summary(session);
      var low = (stats.objectives || []).filter(function (item) { return item.percent != null && item.percent < 70; })[0];
      if (low) weak = low.label;
    }
    journey.templateId = kind === "recap" ? "retrieval" : "starter";
    journey.learningMap.summary = "Follow-up from class responses. Responses suggest " + weak + " may be worth revisiting.";
    finishQuick(journey);
    if (journey.plan) {
      journey.plan.title = kind === "recap" ? "5-minute recap" : "Tomorrow's starter";
      if (journey.learningMap.topic) journey.plan.title += " — " + journey.learningMap.topic;
    }
    journey.followUpOf = session ? session.journeyId : "";
    journey.followNote = "Built from the same learning map. The original adventure was not changed, and no new illustrations were made.";
    Learn.upsertLibrary(journey);
    return journey;
  }

  function adaptCopy(sourceId, change) {
    var source = findJourney(sourceId);
    if (!source) return null;
    var copy = JSON.parse(JSON.stringify(source));
    copy.id = "lj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    copy.createdAt = new Date().toISOString();
    copy.preparedExample = false;
    copy.sharedWithSchool = false;
    copy.creationMode = "quick";
    copy.regenScope = [];
    copy.regenNote = "";
    if (change === "year") {
      copy.regenNote = "Choose the year on the next screen. The pictures stay. Questions can be edited without starting again.";
    } else if (change === "support") {
      copy.learningMap.level = "supported";
      copy.regenScope = ["quiz", "exit_ticket"];
      copy.regenNote = "Marked as Supported. The quiz can be edited. The story and pictures were kept.";
    } else if (change === "challenge") {
      copy.learningMap.level = "challenge";
      copy.regenScope = ["quiz", "exit_ticket"];
      copy.regenNote = "Marked as more challenging. The quiz can be edited. The story and pictures were kept.";
    } else if (change === "characters") {
      copy.regenScope = ["story"];
      copy.regenNote = "Story illustrations may need to be regenerated if the hero changes. This demonstration will not redraw them. The quiz, word search and games stay.";
    } else if (change === "activities") {
      copy.regenNote = "Change the activities on the next screen. Anything you leave selected keeps its current words and pictures.";
    } else if (change === "objective") {
      copy.regenScope = ["quiz", "exit_ticket"];
      copy.regenNote = "Update the learning objective, then edit the questions. Pictures are left as they are.";
    } else {
      copy.regenNote = "This is your own copy. Edit it directly. Nothing is regenerated unless you ask.";
    }
    if (copy.plan && copy.plan.title) copy.plan.title = copy.plan.title.replace(/ \(copy\)$/, "") + " (adapted)";
    Learn.upsertLibrary(copy);
    Learn.openJourney(copy);
    touchRecent(copy.id);
    return copy;
  }

  function useNextYear(id) {
    var copy = adaptCopy(id, "year");
    if (!copy) return null;
    var next = new Date().getFullYear() + 1;
    if (copy.plan && copy.plan.title.indexOf(String(next)) === -1) copy.plan.title = copy.plan.title.replace(" (adapted)", "") + " — " + next;
    copy.regenScope = [];
    copy.regenNote = "Same adventure for another year. Pictures are referenced, not copied or redrawn.";
    Learn.upsertLibrary(copy);
    return copy;
  }

  function saveFeedback(entry) {
    var list = read(FEED_KEY, []);
    list.unshift({
      kind: entry.kind || "idea",
      text: String(entry.text || "").slice(0, 500),
      at: new Date().toISOString()
    });
    write(FEED_KEY, list.slice(0, 30));
  }

  function saveUsefulness(entry) {
    var list = read(FEED_KEY, []);
    list.unshift({
      kind: "session",
      useful: !!entry.useful,
      reason: entry.reason || "",
      code: entry.code || "",
      at: new Date().toISOString()
    });
    write(FEED_KEY, list.slice(0, 30));
  }

  function seen() {
    return localStorage.getItem(SEEN_KEY) === "1";
  }

  function markSeen() {
    localStorage.setItem(SEEN_KEY, "1");
  }

  function recentTopics() {
    var seenTopic = {};
    var out = [];
    recentJourneys().concat(Learn.visibleLibrary()).forEach(function (item) {
      var topic = item.learningMap && item.learningMap.topic;
      if (!topic || seenTopic[topic]) return;
      seenTopic[topic] = true;
      out.push(topic);
    });
    return out.slice(0, 4);
  }

  Learn.TEMPLATES = TEMPLATES;
  Learn.SUBJECTS = SUBJECTS;
  Learn.prefs = prefs;
  Learn.savePrefs = savePrefs;
  Learn.favs = favs;
  Learn.toggleFav = toggleFav;
  Learn.isFav = isFav;
  Learn.touchRecent = touchRecent;
  Learn.recentJourneys = recentJourneys;
  Learn.estimate = estimate;
  Learn.estimateLabel = estimateLabel;
  Learn.questionsFor = questionsFor;
  Learn.activitiesForTime = activitiesForTime;
  Learn.templateById = templateById;
  Learn.applyDefaults = applyDefaults;
  Learn.gaps = gaps;
  Learn.schoolShelf = schoolShelf;
  Learn.matchExisting = matchExisting;
  Learn.shareToSchool = shareToSchool;
  Learn.slidesFor = slidesFor;
  Learn.finishQuick = finishQuick;
  Learn.ensureSchoolExample = ensureSchoolExample;
  Learn.preparedSamples = preparedSamples;
  Learn.openExample = openExample;
  Learn.makeFollowUp = makeFollowUp;
  Learn.adaptCopy = adaptCopy;
  Learn.useNextYear = useNextYear;
  Learn.findJourney = findJourney;
  Learn.saveFeedback = saveFeedback;
  Learn.saveUsefulness = saveUsefulness;
  Learn.seen = seen;
  Learn.markSeen = markSeen;
  Learn.recentTopics = recentTopics;
  Learn.electricTopic = electricTopic;
})(window);
