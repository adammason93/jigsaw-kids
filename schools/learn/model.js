/* Learning Adventure model.
   Demo provider only. No live story, quiz, or image generation.
   Drafts stay in this browser. A shared school library needs an approved database change. */
(function (global) {
  "use strict";

  var DRAFT_KEY = "wondii-learning-draft";
  var LIBRARY_KEY = "wondii-learning-adventures";
  var MAX_BYTES = 8 * 1024 * 1024;
  var NAVY = "#141b4d";

  var SAMPLE = [
    "YEAR 4 SCIENCE",
    "",
    "ELECTRICITY",
    "",
    "Learning objective:",
    "Identify whether or not a lamp will light in a simple series circuit.",
    "",
    "Key vocabulary:",
    "Circuit",
    "Cell",
    "Bulb",
    "Wire",
    "Switch",
    "",
    "Students should understand that a complete circuit is required for a bulb to light and that a switch can open or close a circuit."
  ].join("\n");

  var ACTIVITIES = [
    { id: "story", title: "Story", text: "A personalised illustrated adventure built around the learning objective." },
    { id: "word_search", title: "Word search", text: "A vocabulary word search using the lesson’s important words." },
    { id: "quiz", title: "Pop quiz", text: "Short questions based on the learning objectives." },
    { id: "circuit_game", title: "Circuit mini game", text: "Complete a simple circuit so the bulb lights.", topic: /electric/i },
    { id: "comprehension", title: "Comprehension", text: "Questions based on the story and the lesson.", needs: "story" },
    { id: "maths", title: "Maths challenge", text: "Age-appropriate maths woven into the topic, only when it belongs there." },
    { id: "stem", title: "STEM challenge", text: "A science, technology, engineering or maths problem." },
    { id: "matching", title: "Matching game", text: "Match words, components or definitions." },
    { id: "sequencing", title: "Sequencing", text: "Put steps, events or a process in order." },
    { id: "creative", title: "Creative challenge", text: "Apply the learning through design or problem solving." },
    { id: "exit_ticket", title: "Exit ticket", text: "Three short questions at the end of the lesson, tied to the learning objectives." }
  ];

  var CHARACTERS = [
    { id: "alex", name: "Alex", note: "Story hero", image: "../../games/images/schools/demo/lights-click-900.webp", focus: "22% 58%" },
    { id: "fox", name: "Fox", note: "Story buddy", image: "../../games/images/schools/demo/lights-tree-900.webp", focus: "46% 72%" }
  ];

  var YEAR_GROUPS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

  function uid() {
    if (global.WondiiSchoolDomain && global.WondiiSchoolDomain.uuid) return global.WondiiSchoolDomain.uuid();
    return "lj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function now() {
    return new Date().toISOString();
  }

  function blank() {
    var stamp = now();
    return {
      id: uid(),
      provider: "demo",
      status: "draft",
      organisationId: null,
      createdBy: null,
      source: { type: "paste", filename: "", text: "" },
      learningMap: {
        subject: "",
        yearGroup: "",
        topic: "",
        learningObjectives: [],
        keyVocabulary: [],
        level: "expected",
        groundingMode: "source",
        summary: "",
        confidence: { subject: "low", yearGroup: "low", topic: "low" }
      },
      characters: { heroCharacterId: "", buddyCharacterId: "" },
      selected: [],
      plan: null,
      demoElectricity: false,
      createdAt: stamp,
      updatedAt: stamp
    };
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadDraft() {
    var saved = readJson(DRAFT_KEY);
    if (!saved || !saved.id) return blank();
    var base = blank();
    saved.learningMap = Object.assign(base.learningMap, saved.learningMap || {});
    saved.characters = Object.assign(base.characters, saved.characters || {});
    saved.source = Object.assign(base.source, saved.source || {});
    return Object.assign(base, saved);
  }

  function saveDraft(journey) {
    journey.updatedAt = now();
    try {
      var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
      if (org && org.organisationId) journey.organisationId = org.organisationId;
    } catch (e) {}
    writeJson(DRAFT_KEY, journey);
    return journey;
  }

  function library() {
    var list = readJson(LIBRARY_KEY);
    return Array.isArray(list) ? list : [];
  }

  function saveLibrary(list) {
    writeJson(LIBRARY_KEY, list);
    if (!global.WondiiSchoolData || !global.WondiiSchoolData.syncAdventures) return Promise.resolve(true);
    return Promise.resolve(global.WondiiSchoolData.syncAdventures(list)).then(function (ok) {
      return ok !== false;
    });
  }

  function visibleLibrary() {
    var orgId = "";
    try {
      var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
      orgId = org && org.organisationId ? org.organisationId : "";
    } catch (e) {}
    return library().filter(function (item) {
      if (item.status === "archived") return false;
      if (!orgId) return !item.organisationId;
      return item.organisationId === orgId;
    });
  }

  function upsertLibrary(journey, previousId) {
    var list = library().filter(function (item) { return item.id !== journey.id && item.id !== previousId; });
    list.unshift(JSON.parse(JSON.stringify(journey)));
    return saveLibrary(list);
  }

  function archive(id) {
    var list = library().map(function (item) {
      if (item.id === id) item.status = "archived";
      return item;
    });
    saveLibrary(list);
  }

  function duplicate(id) {
    var found = library().filter(function (item) { return item.id === id; })[0];
    if (!found) return null;
    var copy = JSON.parse(JSON.stringify(found));
    copy.id = uid();
    copy.status = "plan_ready";
    copy.createdAt = now();
    copy.updatedAt = copy.createdAt;
    copy.plan = copy.plan || null;
    if (copy.plan && copy.plan.title) copy.plan.title = copy.plan.title + " (copy)";
    saveDraft(copy);
    upsertLibrary(copy);
    return copy;
  }

  function openJourney(journey) {
    saveDraft(journey);
  }

  function extensionOf(name) {
    var parts = String(name || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function sniff(bytes) {
    if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf";
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "docx";
    var text = true;
    var n = Math.min(bytes.length, 800);
    for (var i = 0; i < n; i++) {
      if (bytes[i] === 0) text = false;
    }
    return text ? "txt" : "";
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("Choose a file first."));
        return;
      }
      if (file.size > MAX_BYTES) {
        reject(new Error("That file is over 8 MB. Use a shorter lesson, or paste the text."));
        return;
      }
      var ext = extensionOf(file.name);
      var allowedExt = { txt: 1, pdf: 1, docx: 1, png: 1, jpg: 1, jpeg: 1, webp: 1 };
      if (!allowedExt[ext]) {
        reject(new Error("Use a PDF, Word, text, or image file."));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("That file could not be read.")); };
      reader.onload = function () {
        var bytes = new Uint8Array(reader.result);
        var kind = sniff(bytes);
        var expected = ext === "jpg" ? "jpeg" : ext;
        if (ext === "txt" && kind !== "txt") {
          reject(new Error("That text file could not be read. Paste the lesson instead."));
          return;
        }
        if (ext !== "txt" && kind !== expected) {
          reject(new Error("That file does not match its type. Try another copy, or paste the lesson."));
          return;
        }
        if (kind !== "txt") {
          resolve({
            type: kind === "jpeg" || kind === "png" || kind === "webp" ? "image" : kind,
            filename: file.name,
            text: "",
            needsPaste: true
          });
          return;
        }
        var decoder = new TextDecoder("utf-8", { fatal: false });
        resolve({ type: "txt", filename: file.name, text: decoder.decode(bytes).trim(), needsPaste: false });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function yearFrom(text) {
    var match = String(text || "").match(/year\s*([1-6])\b/i);
    return match ? "Year " + match[1] : "";
  }

  function isElectricityDemo(text) {
    var t = String(text || "").toLowerCase();
    var score = 0;
    if (/year\s*4/.test(t)) score += 1;
    if (/electric/.test(t)) score += 1;
    if (/circuit/.test(t)) score += 1;
    if (/bulb|lamp/.test(t)) score += 1;
    if (/\bcell\b|battery/.test(t)) score += 1;
    if (/switch/.test(t)) score += 1;
    return score >= 4;
  }

  function linesAfter(text, label) {
    var parts = String(text || "").split(/\n/);
    var found = -1;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase().indexOf(label) !== -1) found = i;
    }
    if (found < 0) return [];
    var out = [];
    for (var j = found + 1; j < parts.length; j++) {
      var line = parts[j].trim();
      if (!line) {
        if (out.length) break;
        continue;
      }
      if (/^[A-Z][A-Za-z ]{0,40}:?$/.test(line) && out.length) break;
      out.push(line.replace(/^[-•]\s*/, ""));
    }
    return out;
  }

  function analyse(text) {
    var source = String(text || "").trim();
    if (source.length < 12) {
      return { ok: false, message: "Add a little more of the lesson before Wondii maps it." };
    }
    if (isElectricityDemo(source)) {
      return {
        ok: true,
        provider: "demo",
        demoElectricity: true,
        notice: "Demonstration map. This lesson matches the prepared Year 4 electricity adventure. It was not analysed by a live model.",
        learningMap: {
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
          summary: "Pupils learn that a lamp lights only when the circuit is complete, and that a switch can open or close that path.",
          confidence: { subject: "high", yearGroup: "high", topic: "high" }
        }
      };
    }
    var year = yearFrom(source);
    var lower = source.toLowerCase();
    var subject = "";
    var subjectConfidence = "low";
    if (/science|electric|plant|force|magnet|space/.test(lower)) {
      subject = "Science";
      subjectConfidence = "medium";
    } else if (/\bmaths\b|mathematics|addition|fractions|times tables|subtraction|multiplication|number bond|place value|division|counting/.test(lower)) {
      subject = "Maths";
      subjectConfidence = "medium";
    } else if (/\benglish\b|reading|writing|grammar|spelling|phonics|comprehension/.test(lower)) {
      subject = "English";
      subjectConfidence = "medium";
    } else if (/history|ancient|victorians|roman|tudor|viking/.test(lower)) {
      subject = "History";
      subjectConfidence = "medium";
    } else if (/geograph|river|map skills/.test(lower)) {
      subject = "Geography";
      subjectConfidence = "medium";
    }
    var topic = "";
    var topicConfidence = "low";
    if (/electric/.test(lower)) {
      topic = "Electricity";
      topicConfidence = "medium";
    }
    var objectives = linesAfter(source, "objective");
    if (!objectives.length) {
      var sentence = source.split(/\n/).map(function (line) { return line.trim(); }).filter(Boolean);
      if (sentence.length) objectives = [sentence[0].slice(0, 180)];
    }
    return {
      ok: true,
      provider: "demo",
      demoElectricity: false,
      notice: "Live lesson analysis is not connected yet. Wondii filled only what the text states, and left anything uncertain for you.",
      learningMap: {
        subject: subject,
        yearGroup: year,
        topic: topic,
        learningObjectives: objectives.slice(0, 4),
        keyVocabulary: linesAfter(source, "vocabulary").slice(0, 8).map(function (word) { return word.toLowerCase(); }),
        level: "expected",
        groundingMode: "source",
        summary: "",
        confidence: { subject: subjectConfidence, yearGroup: year ? "high" : "low", topic: topicConfidence }
      }
    };
  }

  function offeredActivities(map) {
    return ACTIVITIES.filter(function (item) {
      if (item.topic && !item.topic.test(map.topic || "")) return false;
      return true;
    });
  }

  function recommendations(map) {
    var topic = (map.topic || "").toLowerCase();
    var subject = (map.subject || "").toLowerCase();
    var ids;
    if (/electric/.test(topic)) ids = ["story", "circuit_game", "word_search", "quiz"];
    else if (subject === "maths") ids = ["maths", "quiz", "matching"];
    else if (subject === "english") ids = ["story", "word_search", "comprehension", "quiz"];
    else if (subject === "history" || subject === "geography") ids = ["story", "word_search", "quiz"];
    else if (subject === "science") ids = ["story", "word_search", "matching", "quiz"];
    else ids = ["word_search", "quiz", "matching"];
    var offered = offeredActivities(map).map(function (item) { return item.id; });
    ids = ids.filter(function (id) { return offered.indexOf(id) !== -1; });
    return { recommended: ids, available: offered.filter(function (id) { return ids.indexOf(id) === -1; }) };
  }

  function activityById(id) {
    for (var i = 0; i < ACTIVITIES.length; i++) if (ACTIVITIES[i].id === id) return ACTIVITIES[i];
    return null;
  }

  function planFor(journey) {
    var map = journey.learningMap;
    var selected = journey.selected.slice();
    if (journey.demoElectricity) {
      var order = ["story", "word_search", "circuit_game", "quiz", "stem", "maths", "comprehension", "matching", "sequencing", "creative"];
      selected.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
      return {
        provider: "demo",
        title: "The Night the Lights Went Out",
        introduction: "Alex and Fox arrive in Wondii Town and find every light has gone out. To bring the town back, they need a complete circuit.",
        prepared: true,
        steps: selected.map(function (id) { return demoStep(id, map); }).filter(Boolean)
      };
    }
    var subject = (map.subject || "").toLowerCase();
    var topic = map.topic || "Lesson";
    var titles = {
      story: "Story",
      word_search: "Word search",
      quiz: "Pop quiz",
      maths: "Number game",
      matching: "Matching game",
      sequencing: "Put it in order",
      comprehension: "Comprehension",
      stem: "Challenge",
      creative: "Make something",
      exit_ticket: "Exit ticket",
      circuit_game: "Circuit game"
    };
    var blurbs = {
      story: "A short story about " + topic + ", using the words from your lesson.",
      word_search: "Find the important words from " + topic + ".",
      quiz: "A pop quiz at the end, based on your lesson.",
      maths: "Number games based on " + topic + ".",
      matching: "Match the ideas from the lesson.",
      sequencing: "Put the parts of the lesson in order.",
      comprehension: "Questions about the story you have just read.",
      stem: "A challenge based on " + topic + ".",
      creative: "Make something that shows " + topic + ".",
      exit_ticket: "Three quick questions to finish.",
      circuit_game: "Complete a circuit so the bulb lights."
    };
    return {
      provider: "demo",
      title: subject === "maths" ? topic : (selected.indexOf("story") !== -1 ? "A story about " + topic : topic),
      introduction: subject === "maths"
        ? "Number games and a pop quiz from your lesson. No story book."
        : "A story from your lesson, then a word search and a pop quiz.",
      prepared: false,
      steps: selected.map(function (id) {
        var item = activityById(id);
        return {
          id: id,
          title: titles[id] || (item ? item.title : id),
          summary: blurbs[id] || (item ? item.text : "")
        };
      })
    };
  }

  function demoStep(id, map) {
    var words = (map.keyVocabulary || []).join(", ");
    var steps = {
      story: { id: "story", title: "Story", summary: "Six scenes. Alex and Fox investigate the blackout and learn how a complete circuit works." },
      word_search: { id: "word_search", title: "Word search", summary: "Vocabulary: " + (words || "circuit, cell, bulb, wire, switch") + "." },
      circuit_game: { id: "circuit_game", title: "Circuit game", summary: "Complete a circuit to light a bulb." },
      quiz: { id: "quiz", title: "Pop quiz", summary: "Five questions based on the approved learning objectives." },
      stem: { id: "stem", title: "STEM challenge", summary: "Design a lighting circuit for Alex’s treehouse." },
      maths: { id: "maths", title: "Maths challenge", summary: "Bulbs and wires counted inside the town, using the electricity story." },
      comprehension: { id: "comprehension", title: "Comprehension", summary: "Questions about the story the class has just read." },
      matching: { id: "matching", title: "Matching", summary: "Match each component with what it does in the circuit." },
      sequencing: { id: "sequencing", title: "Sequencing", summary: "Order the steps that make the bulb light." },
      creative: { id: "creative", title: "Creative challenge", summary: "Design how the town could save power overnight." },
      exit_ticket: { id: "exit_ticket", title: "Exit ticket", summary: "Three quick questions on complete circuits, switches and the cell." }
    };
    return steps[id] || null;
  }

  function validateMap(map) {
    var issues = [];
    if (!map.subject) issues.push("Add a subject.");
    if (!map.yearGroup) issues.push("Choose a year group.");
    if (!map.topic) issues.push("Add a topic.");
    if (!map.learningObjectives.filter(Boolean).length) issues.push("Add at least one learning objective.");
    return issues;
  }

  function validatePlan(journey) {
    var issues = validateMap(journey.learningMap);
    if (!journey.selected.length) issues.push("Choose at least one activity.");
    if (journey.selected.indexOf("comprehension") !== -1 && journey.selected.indexOf("story") === -1) {
      issues.push("Comprehension needs the story as well.");
    }
    if (!journey.characters.heroCharacterId) issues.push("Choose a main character.");
    if (journey.characters.buddyCharacterId && journey.characters.buddyCharacterId === journey.characters.heroCharacterId) {
      issues.push("Choose a different buddy, or leave the buddy empty.");
    }
    if (!journey.plan || !journey.plan.steps || !journey.plan.steps.length) issues.push("Plan the adventure before generating it.");
    return issues;
  }

  function generationSummary(journey) {
    var labels = {
      story: "6-scene illustrated story",
      word_search: "Word search",
      circuit_game: "Interactive circuit challenge",
      quiz: "5-question quiz",
      stem: "STEM activity",
      maths: "Maths challenge",
      comprehension: "Comprehension questions",
      matching: "Matching game",
      sequencing: "Sequencing activity",
      creative: "Creative challenge"
    };
    return (journey.plan ? journey.plan.steps : []).map(function (step) {
      return labels[step.id] || step.title;
    });
  }

  global.WondiiLearn = {
    NAVY: NAVY,
    SAMPLE: SAMPLE,
    YEAR_GROUPS: YEAR_GROUPS,
    CHARACTERS: CHARACTERS,
    ACTIVITIES: ACTIVITIES,
    blank: blank,
    loadDraft: loadDraft,
    saveDraft: saveDraft,
    visibleLibrary: visibleLibrary,
    allJourneys: library,
    upsertLibrary: upsertLibrary,
    archive: archive,
    duplicate: duplicate,
    openJourney: openJourney,
    readFile: readFile,
    analyse: analyse,
    recommendations: recommendations,
    activityById: activityById,
    offeredActivities: offeredActivities,
    planFor: planFor,
    validateMap: validateMap,
    validatePlan: validatePlan,
    generationSummary: generationSummary
  };
})(window);
