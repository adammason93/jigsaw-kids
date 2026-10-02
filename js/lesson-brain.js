/* Turns a teacher's lesson request into a checked Wondii adventure.
   Model output is data. It is never HTML, and it is not shown until this accepts it.
   The deterministic packs in creator-core stay as the fallback. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiLessonBrain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var MECHANICS = ["story", "quiz", "word_search", "spin", "mystery", "doors"];
  var PARTICIPATION = ["whole_class", "selected_pupil", "spin", "team_turn", "teacher_class"];
  var PLACEHOLDERS = {
    "question not written yet": 1,
    "this quiz needs a question.": 1,
    "question goes here": 1,
    "add question": 1,
    "example question": 1,
    "insert answer": 1,
    "tbc": 1,
    "todo": 1,
    "a question from the lesson you provided.": 1
  };
  var AGE_FALLBACK = "Year 3, about 7 to 8 years old";
  var STOP = {
    about: 1, after: 1, again: 1, also: 1, because: 1, before: 1, class: 1, could: 1,
    from: 1, have: 1, into: 1, lesson: 1, lessons: 1, make: 1, minute: 1, minutes: 1,
    practical: 1, primary: 1, recap: 1, school: 1, should: 1, teach: 1, teaching: 1,
    that: 1, their: 1, there: 1, these: 1, they: 1, this: 1, today: 1, using: 1,
    what: 1, when: 1, where: 1, which: 1, with: 1, would: 1, year: 1, your: 1,
    introducing: 1, introduction: 1, adventure: 1, pupils: 1, children: 1, please: 1,
    fun: 1, more: 1, some: 1, them: 1, than: 1, then: 1, each: 1, only: 1
  };
  var SILLY = { playtime: 1, "home time": 1, "the register": 1, pillow: 1, sandwich: 1, sock: 1 };

  function clean(value, max) {
    var text = String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/javascript:/gi, "").replace(/\s+/g, " ").trim();
    if (max && text.length > max) text = text.slice(0, max).trim();
    return text;
  }

  function unsafe(value) {
    return /<\s*\/?\s*script|onerror\s*=|javascript:/i.test(String(value || ""));
  }

  function placeholder(value) {
    var text = clean(value).toLowerCase();
    if (!text) return true;
    return !!PLACEHOLDERS[text];
  }

  function yearDigit(year) {
    var match = String(year || "").match(/([1-6])/);
    return match ? match[1] : "";
  }

  function ageRange(year) {
    var n = Number(yearDigit(year));
    if (!n) return "";
    return (n + 4) + " to " + (n + 5) + " years";
  }

  function durationBand(target) {
    var minutes = Number(target) || 15;
    var tol = Math.max(3, Math.round(minutes * 0.2));
    return { low: Math.max(5, minutes - tol), high: minutes + tol, target: minutes };
  }

  var FUNCTION = {
    between: 1, difference: 1, compare: 1, comparison: 1, versus: 1, causes: 1, cause: 1, caused: 1,
    why: 1, how: 1, what: 1, when: 1, where: 1, happens: 1, happen: 1, works: 1, work: 1,
    teach: 1, teaching: 1, learn: 1, learning: 1, about: 1, came: 1, come: 1, have: 1, has: 1,
    does: 1, into: 1, from: 1, with: 1, this: 1, that: 1, your: 1, their: 1, them: 1, they: 1,
    explaining: 1, introducing: 1, introduction: 1, lesson: 1, lessons: 1, recap: 1, using: 1,
    science: 1, maths: 1, english: 1, history: 1, geography: 1, primary: 1, children: 1, pupils: 1,
    class: 1, minute: 1, minutes: 1, practical: 1, please: 1, quick: 1,
    and: 1, the: 1, for: 1, are: 1, was: 1, were: 1, our: 1, you: 1, but: 1, can: 1, not: 1,
    its: 1, all: 1, any: 1, too: 1, very: 1, just: 1, like: 1
  };

  function words(value) {
    return clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(function (word) {
      return word.length > 3 && !STOP[word];
    });
  }

  function contentWords(value) {
    return clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(function (word) {
      return word.length >= 3 && !STOP[word] && !FUNCTION[word];
    });
  }

  function lessonSemantics(raw) {
    var text = clean(raw, 500).toLowerCase();
    var intent = "explain";
    var relationship = "";
    if (/\bdifference between\b|\bcompare\b/.test(text)) {
      intent = "compare";
      relationship = "difference";
    } else if (/\bwhy\b|\bcauses?\b|\bhow\b[^.]{0,48}\bcauses?\b/.test(text)) {
      intent = "why";
      relationship = "cause";
    } else if (/\bhow to\b/.test(text)) {
      intent = "procedure";
      relationship = "steps";
    } else if (/\bhow\b/.test(text)) {
      intent = "process";
      relationship = "process";
    } else if (/\bwhat is\b|\bwhat are\b/.test(text)) {
      intent = "definition";
      relationship = "definition";
    }
    var concepts = [];
    var pair = text.match(/\b(?:difference between|compare)\s+(.+?)\s+and\s+(.+?)(?:[.?]|$)/);
    var howCause = text.match(/\bhow\s+(.+?)\s+causes?\s+(.+?)(?:[.?]|$)/);
    var howTo = text.match(/\bhow to\s+(.+?)(?:[.?]|$)/);
    var howWorks = text.match(/\bhow\s+(.+?)\s+works?\b/);
    var whatIs = text.match(/\bwhat (?:is|are)\s+(.+?)(?:[.?]|$)/);
    var body = text.replace(/\byear\s*[1-6]\b/g, " ").replace(/\busing\s+[a-z0-9]+\b/g, " ").replace(/^\d+\s*/, "");
    if (pair) concepts = contentWords(pair[1]).concat(contentWords(pair[2]));
    else if (howCause) concepts = contentWords(howCause[1]).concat(contentWords(howCause[2]));
    else if (howTo) concepts = contentWords(howTo[1]);
    else if (howWorks) concepts = contentWords(howWorks[1]);
    else if (whatIs) concepts = contentWords(whatIs[1]);
    else if (intent === "why" || intent === "process" || intent === "procedure" || intent === "definition") {
      concepts = contentWords(body).filter(function (word) {
        return !(intent === "process" || intent === "procedure") || !/^(improve|improves|improving|help|helps|helping|make|makes|change|changes)$/.test(word);
      });
    }
    var seen = {};
    concepts = concepts.filter(function (word) {
      if (seen[word]) return false;
      seen[word] = 1;
      return true;
    }).slice(0, 4);
    return { intent: intent, relationship: relationship, concepts: concepts };
  }

  var PRESENTATION = {
    fun: 1, playful: 1, hands: 1, short: 1, quick: 1, please: 1, pls: 1,
    something: 1, help: 1, understand: 1, understanding: 1, mins: 1, minute: 1, minutes: 1,
    already: 1, know: 1, knows: 1, reteach: 1, reteaching: 1, forgetting: 1, keep: 1
  };
  var SUBJECT_NAMES = { science: "Science", maths: "Maths", mathematics: "Maths", english: "English", history: "History", geography: "Geography" };

  function phraseList(value, max, limit) {
    var list = Array.isArray(value) ? value : [];
    var seen = {};
    var out = [];
    list.forEach(function (item) {
      var text = clean(typeof item === "string" ? item : "", max || 80);
      var key = text.toLowerCase();
      if (!text || seen[key]) return;
      seen[key] = 1;
      out.push(text);
    });
    return out.slice(0, limit || 4);
  }

  function curriculumPhrase(phrase) {
    var text = clean(phrase, 80);
    if (text.length < 3) return false;
    var parts = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!parts.length) return false;
    if (parts.length === 1 && (PRESENTATION[parts[0]] || FUNCTION[parts[0]])) return false;
    if (parts.every(function (part) { return PRESENTATION[part] || FUNCTION[part]; })) return false;
    return true;
  }

  function listedAs(list, phrase) {
    var key = clean(phrase, 80).toLowerCase();
    return (list || []).some(function (item) { return clean(item, 80).toLowerCase() === key; });
  }

  function teacherIntentBrief(ctx) {
    var raw = clean((ctx && (ctx.lessonText || ctx.teacherInstructions)) || "", 500);
    return {
      system: [
        "You interpret one primary teacher's request. Return one JSON object and nothing else.",
        "Do not write a lesson, stages, activities, mechanics, questions, or facts to teach.",
        "Separate the request into distinct fields. A word is not a focus concept merely because it appears in the request.",
        "learningGoal is one sentence: what pupils should understand or be able to do by the end of this lesson.",
        "focusConcepts are one to four short curriculum ideas required for that new goal. They are ideas, not the teacher's instructions.",
        "priorKnowledge is what the teacher says pupils already understand. Do not copy those items into focusConcepts.",
        "exclusions are what the teacher says not to reteach. Do not copy those items into focusConcepts.",
        "preferences are presentation requests such as fun, playful, hands-on, short, or story-based. They are not curriculum ideas.",
        "durationMinutes is a number from 5 to 90, or null when no duration was asked for. A duration is not a curriculum idea.",
        "yearGroup is Year 1 to Year 6 when the teacher names it, otherwise an empty string. Do not invent a year.",
        "subject is Science, Maths, English, History, or Geography. If the teacher names one, keep it and set subjectConfidence to explicit.",
        "If the teacher does not name a subject, set subject and subjectConfidence to inferred only when the topic is unmistakably that subject. Otherwise subject is an empty string and subjectConfidence is uncertain.",
        "If the teacher names a misconception, keep the mistake out of focusConcepts and make learningGoal the idea that corrects it.",
        "The lesson should build from what pupils already know toward the new goal. The new goal is the teaching target.",
        "Do not invent a different topic. If the request is unclear, keep learningGoal close to what was asked and leave uncertain fields empty.",
        "JSON shape: {\"yearGroup\":\"\",\"subject\":\"\",\"subjectConfidence\":\"explicit\" or \"inferred\" or \"uncertain\",\"learningGoal\":\"\",\"focusConcepts\":[],\"priorKnowledge\":[],\"exclusions\":[],\"preferences\":[],\"durationMinutes\":null}."
      ].join(" "),
      user: JSON.stringify({
        request: raw,
        statedYear: clean(ctx && ctx.yearGroup, 20),
        statedSubject: clean(ctx && ctx.subject, 40),
        statedMinutes: ctx && ctx.requestedMinutes || null
      })
    };
  }

  function normaliseTeacherIntent(raw, ctx) {
    var body = raw && typeof raw === "object" ? raw : null;
    var goal = clean(body && body.learningGoal, 240);
    if (!body || goal.length < 12) return { ok: false, reason: "malformed" };
    var prior = phraseList(body.priorKnowledge, 120, 4);
    var exclusions = phraseList(body.exclusions, 120, 4);
    var preferences = phraseList(body.preferences, 40, 4);
    var focus = phraseList(body.focusConcepts, 80, 6).filter(function (phrase) {
      return curriculumPhrase(phrase) && !listedAs(prior, phrase) && !listedAs(exclusions, phrase) && !listedAs(preferences, phrase);
    }).slice(0, 4);
    var minutes = body.durationMinutes;
    if (typeof minutes === "string" && /^\d{1,3}$/.test(minutes.trim())) minutes = Number(minutes.trim());
    if (typeof minutes !== "number" || minutes < 5 || minutes > 90) minutes = null;
    var confidence = clean(body.subjectConfidence, 20).toLowerCase();
    if (confidence !== "explicit" && confidence !== "inferred" && confidence !== "uncertain") confidence = "uncertain";
    var subject = SUBJECT_NAMES[clean(body.subject, 40).toLowerCase()] || "";
    if (!subject) confidence = subject ? confidence : "uncertain";
    if (confidence === "uncertain") subject = "";
    var year = clean(body.yearGroup, 20);
    if (!/^Year\s*[1-6]$/i.test(year)) year = "";
    else year = "Year " + year.replace(/\D/g, "");
    if (ctx && ctx.yearGroup) year = ctx.yearGroup;
    if (ctx && ctx.subject) {
      subject = ctx.subject;
      confidence = "explicit";
    }
    return {
      ok: true,
      yearGroup: year,
      subject: subject,
      subjectConfidence: confidence,
      learningGoal: goal,
      focusConcepts: focus,
      priorKnowledge: prior,
      exclusions: exclusions,
      preferences: preferences,
      durationMinutes: minutes
    };
  }

  function explicitMinutes(ctx) {
    var raw = String((ctx && (ctx.lessonText || ctx.teacherInstructions)) || "");
    var match = raw.match(/\b(\d{1,3})\s*(?:min|mins|minute|minutes)\b/i);
    if (!match) return 0;
    var minutes = Number(match[1]);
    return minutes >= 5 && minutes <= 90 ? minutes : 0;
  }

  function applyTeacherIntent(ctx, intent) {
    ctx = ctx || {};
    ctx.lessonBrief = ctx.lessonBrief || {};
    if (!intent || !intent.ok) {
      ctx.lessonBrief.teacherIntent = { ok: false, reason: (intent && intent.reason) || "malformed" };
      ctx.lessonBrief.concepts = [];
      ctx.lessonBrief.focusConcepts = [];
      return ctx;
    }
    ctx.lessonBrief.teacherIntent = intent;
    ctx.lessonBrief.learningGoal = intent.learningGoal;
    ctx.lessonBrief.focusConcepts = intent.focusConcepts.slice();
    ctx.lessonBrief.concepts = intent.focusConcepts.slice();
    ctx.lessonBrief.priorKnowledge = intent.priorKnowledge.slice();
    ctx.lessonBrief.exclusions = intent.exclusions.slice();
    ctx.lessonBrief.preferences = intent.preferences.slice();
    if (!ctx.subject && intent.subject && (intent.subjectConfidence === "inferred" || intent.subjectConfidence === "explicit")) {
      ctx.subject = intent.subject;
      ctx.lessonBrief.subject = intent.subject;
    }
    var stated = explicitMinutes(ctx);
    if (!stated && intent.durationMinutes) {
      ctx.requestedMinutes = intent.durationMinutes;
      ctx.lessonBrief.durationMinutes = intent.durationMinutes;
    }
    return ctx;
  }

  function knowledgeLines(ctx) {
    return ((ctx && ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).map(function (item) {
      if (typeof item === "string") return item;
      return (item && (item.text || item.statement)) || "";
    }).filter(Boolean);
  }

  function conceptCoverageIssues(blob, ctx) {
    blob = String(blob || "").toLowerCase();
    var brief = (ctx && ctx.lessonBrief) || {};
    var intent = brief.teacherIntent;
    var topic = clean((ctx && ctx.topic) || "", 120);
    var concepts = brief.concepts || [];
    function mentioned(token) {
      if (!token) return false;
      if (blob.indexOf(token) !== -1) return true;
      var stem = token;
      if (token.length > 5 && /(?:ches|shes|xes|zes|ses|es)$/.test(token)) stem = token.replace(/es$/, "");
      else if (token.length > 4 && token.slice(-1) === "s") stem = token.slice(0, -1);
      else if (token.length > 5 && token.slice(-2) === "ed") stem = token.slice(0, -2);
      else if (token.length > 6 && token.slice(-3) === "ing") stem = token.slice(0, -3);
      if (stem !== token && stem.length > 3 && blob.indexOf(stem) !== -1) return true;
      if (token.slice(-2) === "ed" && blob.indexOf(token.slice(0, -1)) !== -1) return true;
      return false;
    }
    function looseHit(phrase) {
      var text = clean(phrase, 180).toLowerCase();
      if (!text) return false;
      if (text.length > 12 && blob.indexOf(text) !== -1) return true;
      var keys = contentWords(text).filter(function (word) {
        return word.length >= 4 && !PRESENTATION[word];
      });
      return keys.some(mentioned);
    }
    if (intent && intent.ok) {
      var targets = (intent.focusConcepts || []).concat(intent.learningGoal ? [intent.learningGoal] : []);
      var facts = knowledgeLines(ctx);
      if (targets.some(looseHit) || facts.some(looseHit)) return [];
      return ["The activities do not teach the requested idea."];
    }
    if (intent && intent.ok === false) {
      var planned = knowledgeLines(ctx);
      if (planned.length && !planned.some(looseHit)) return ["The activities do not teach the planned knowledge."];
      return [];
    }
    var tokens = concepts.length ? concepts.slice() : words(topic).filter(function (word) { return !FUNCTION[word]; });
    var issues = [];
    tokens.forEach(function (token) {
      if (!mentioned(token)) issues.push("The activities do not teach " + token + ".");
    });
    if (!tokens.length && topic && blob.indexOf(topic.toLowerCase()) === -1) issues.push("The activities do not match the requested topic.");
    return issues;
  }

  function contextFrom(draft, extra) {
    extra = extra || {};
    draft = draft || {};
    var source = (draft.source && draft.source.text) || "";
    var year = draft.year || draft.classYear || "";
    var assumed = !year;
    var target = draft.targetMinutes || 15;
    var semantics = lessonSemantics(source);
    return {
      lessonText: clean(source, 8000),
      classId: draft.classId || "",
      organisationId: extra.organisationId || "",
      yearGroup: year,
      ageRange: year ? ageRange(year) : "7 to 8",
      yearAssumed: assumed,
      yearAssumption: assumed ? AGE_FALLBACK : "",
      subject: clean(draft.subject, 80),
      topic: clean(draft.topic, 120),
      requestedMinutes: target,
      lessonBrief: {
        rawRequest: clean(source, 500),
        topic: clean(draft.topic, 120),
        title: clean(draft.title, 80),
        durationMinutes: target,
        yearGroup: year,
        ageRange: year ? ageRange(year) : "7 to 8",
        yearAssumed: assumed,
        yearAssumption: assumed ? AGE_FALLBACK : "",
        learningObjective: clean((draft.goals || [])[0], 240),
        vocabulary: (draft.vocabulary || []).map(function (word) { return clean(word, 40); }).filter(Boolean).slice(0, 12),
        intent: semantics.intent,
        relationship: semantics.relationship,
        concepts: semantics.concepts
      },
      learningObjectives: (draft.goals || []).map(function (goal) { return clean(goal, 240); }).filter(Boolean).slice(0, 6),
      sourceText: clean(source, 8000),
      uploadedMaterialSummary: draft.source && draft.source.filename ? clean(source, 8000) : "",
      playMode: draft.playMode || "whole_class",
      pupilCount: Number(extra.pupilCount) || 0,
      availableMechanics: (extra.availableMechanics || MECHANICS).slice(),
      curriculumContext: "England primary classroom. The year group in this request is authoritative. Do not change it.",
      teacherInstructions: clean(source, 8000)
    };
  }

  function forModel(ctx) {
    var copy = {};
    var key;
    for (key in ctx) {
      if (key === "organisationId" || key === "classId") continue;
      copy[key] = ctx[key];
    }
    copy.durationBand = durationBand(ctx.requestedMinutes);
    return copy;
  }

  function subjectGuide(subject, topic) {
    var text = (String(subject || "") + " " + String(topic || "")).toLowerCase();
    if (/math|fraction|number|times|shape|measure/.test(text)) return "Mathematics: show a worked example and the reasoning, then a guided question, then one the class tries. Do not only describe the maths.";
    if (/english|grammar|adjective|sentence|writing|phonics|\bstory\b/.test(text)) return "English: use real sentences. Model the language, compare two examples, and let the class improve or make a sentence. If a sentence has more than one adjective, do not mark only one of them as the only adjective.";
    if (/history|roman|empire|ancient|viking|tudor/.test(text)) return "History: keep time order, use people and events that are well established, and separate a cause from a guess. Do not present an uncertain interpretation as a fact.";
    if (/geograph|river|map|climate|place/.test(text)) return "Geography: name the place, the process, and a comparison. Describe a diagram in words the teacher can sketch.";
    if (/science|force|gravity|volcano|material|plant|animal|space|magnet|electric/.test(text)) return "Science: help the class notice something, explain it, make a prediction, and then use the idea. A demonstration can use ordinary classroom objects.";
    return "Choose the teaching moves that suit this subject. Explain the idea before a scored question.";
  }

  function planBrief(ctx) {
    var safe = forModel(ctx || {});
    var system = [
      "You are planning one primary lesson. This response is the internal lesson plan only.",
      "Return one JSON object and nothing else. Do not write pupil activities, questions, or HTML.",
      "Decide what the children should understand. Then decide what to teach so they can understand it. The classroom activities are chosen in a later step.",
      "Work in this order: the teacher's request, the context, one learning objective, the key knowledge, prior knowledge, misconceptions, vocabulary, the teaching sequence, then where a check or a recap belongs.",
      "learningObjective is one sentence a teacher could say. successCriteria are two or three things the class can do if the lesson worked.",
      "keyKnowledge is two to four short facts that are established and safe to teach. If you are unsure, choose a simpler true fact. Do not invent quotations, dates, or events. A simplified explanation must still be true. If the request is about a cause, or about how something forms, keyKnowledge is the steps of that mechanism in order. The first fact is not the whole answer in one sentence. For a young year, use a simple true model: the parts, how they move, and what that movement does. Do not teach the visible effect as the cause. The ground shaking is what an earthquake does, not why it happens.",
      "misconceptions are mistakes children of this age often make. priorKnowledge is what you will treat as already known, or an empty list.",
      "vocabulary is only the words worth teaching at this age.",
      "lessonBrief.intent says whether this lesson is why, process, compare, definition, procedure, or explain. When lessonBrief.teacherIntent is present, lessonBrief.learningGoal is the only new teaching target, lessonBrief.focusConcepts are the ideas to teach, lessonBrief.priorKnowledge is already known and may be the starting point, and lessonBrief.exclusions must not be retaught. lessonBrief.preferences and the duration are presentation, not keyKnowledge. Do not turn prior knowledge or an exclusion into the lesson target.",
      "When teacherIntent is absent, lessonBrief.concepts are the ideas to teach. Do not treat words such as between, difference, why, or how as the concept.",
      "keyKnowledge items are strings or { text, knowledgeType }. knowledgeType is fact, cause, effect, reason, process, definition, comparison, or procedure. A why or process lesson needs at least one cause, reason, or process of six words or more. That item explains why, using because, when, so that, or and then. Do not only restate what is seen.",
      "lessonArc may name hook, investigate, teach, apply, check, resolution, and recap. The system places each keyKnowledge fact on the teach stage and the recap. The hook and the investigate stage must not contain it.",
      "Age changes the plan: vocabulary, how long the sentences are, how deep the explanation goes, the examples, and how hard the reasoning is. Year 1 and Year 2 key knowledge stays in everyday words.",
      "If yearAssumed is true, plan for yearAssumption and say so in yearGroup. Do not pretend the teacher named that year.",
      "lessonBrief.topic is the specific concept to teach. Do not widen it into a broader topic.",
      "teachingApproach is two sentences on how to teach this subject. narrativeTheme is a light classroom frame, or an empty string if a story frame would get in the way.",
      subjectGuide(safe.subject, (safe.lessonBrief && safe.lessonBrief.topic) || safe.topic),
      "JSON shape: { title, subject, topic, yearGroup, durationMinutes, learningObjective, successCriteria, priorKnowledge, keyKnowledge, vocabulary, misconceptions, teachingApproach, narrativeTheme, lessonArc: [{ purpose, learningRole, concept }] }."
    ].join(" ");
    return { system: system, user: JSON.stringify(safe) };
  }

  function contractArc(arc, knowledge) {
    var alias = { model: "teach", explain: "teach", guided_practice: "apply", practice: "apply" };
    var given = {};
    (arc || []).forEach(function (stage) {
      stage = stage || {};
      var purpose = alias[stage.purpose] || stage.purpose;
      if (purpose && !given[purpose]) given[purpose] = stage;
    });
    var slots = [
      ["hook", "beginning", false, false, false, "Show the unsolved problem."],
      ["investigate", "goal", false, false, false, "Look and ask. Do not explain yet."],
      ["teach", "discovery", true, true, false, "Explain the key knowledge."],
      ["apply", "application", false, true, false, "Use the new knowledge."],
      ["check", "development", false, false, true, "Check the taught idea."],
      ["resolution", "resolution", false, true, false, "Settle the mission after the check."],
      ["recap", "debrief", false, true, false, "Say the key knowledge as facts."]
    ];
    return slots.map(function (slot, index) {
      var prior = given[slot[0]] || {};
      var required = slot[0] === "teach" || slot[0] === "recap" || slot[0] === "apply" ? knowledge.slice() : (slot[0] === "check" ? knowledge.slice(0, 1) : []);
      var reveal = slot[0] === "hook" || slot[0] === "investigate";
      return {
        purpose: slot[0],
        beat: slot[1],
        learningRole: reveal ? slot[5] : (clean(prior.learningRole, 180) || slot[5]),
        concept: slot[2] ? (clean(prior.concept, 120) || knowledge[0] || "") : "",
        mayTeachNewKnowledge: slot[2],
        mayRevealAnswer: slot[3],
        mayAssess: slot[4],
        requiredKnowledge: required,
        dependsOn: index ? slots[index - 1][0] : ""
      };
    });
  }

  function pedagogy(subject, topic) {
    var text = (String(subject || "") + " " + String(topic || "")).toLowerCase();
    if (/math|fraction|number|times|shape|measure/.test(text)) return { investigate: "compare", apply: "match" };
    if (/english|grammar|adjective|sentence|writing|phonics/.test(text)) return { investigate: "compare", apply: "sort" };
    if (/history|roman|empire|ancient|viking|tudor/.test(text)) return { investigate: "inspect", apply: "sequence" };
    if (/geograph|river|map|climate|place|weather/.test(text)) return { investigate: "compare", apply: "sort" };
    if (/science|force|gravity|volcano|material|plant|animal|space|magnet|electric/.test(text)) return { investigate: "inspect", apply: "move" };
    return { investigate: "inspect", apply: "sort" };
  }

  function skeletonMinutes(target) {
    var band = durationBand(target || 15);
    var minutes = Number(target) || 15;
    var scaled = [2, 2, 3, 3, 2, 1, 2].map(function (value) {
      return Math.max(1, Math.round(value * minutes / 15));
    });
    function total() {
      return scaled.reduce(function (sum, value) { return sum + value; }, 0);
    }
    while (total() > band.high && scaled[2] > 2) scaled[2] -= 1;
    while (total() < band.low) scaled[2] += 1;
    return scaled;
  }

  function slotBudget(id, ctx, plan) {
    var year = Number(yearDigit((ctx && ctx.yearGroup) || (plan && plan.yearGroup))) || 3;
    var requested = Number(ctx && ctx.requestedMinutes) || Number(plan && plan.durationMinutes) || 15;
    var teachTurns = year <= 2 || requested < 12 ? 1 : 2;
    var minimum = { hook: 1, investigate: 1, teach: teachTurns, apply: 1, check: 1, resolution: 1, recap: 1 };
    var depth = {
      hook: "one teacher prompt",
      investigate: "one observation",
      teach: "guided teaching",
      apply: "one pupil action",
      check: "one check",
      resolution: "one outcome",
      recap: "one retrieval"
    };
    return { minimumParticipation: minimum[id] || 1, contentDepth: depth[id] || "one turn" };
  }

  function lessonSkeleton(plan, ctx) {
    plan = plan || {};
    ctx = ctx || {};
    var knowledge = textList(plan.keyKnowledge, 180, 6);
    var arc = contractArc(plan.lessonArc, knowledge);
    var family = pedagogy(plan.subject || ctx.subject, plan.topic || ctx.topic);
    var minutes = skeletonMinutes(Number(ctx.requestedMinutes) || Number(plan.durationMinutes) || 15);
    var who = Number(ctx.pupilCount) >= 2 ? "random" : "whole-class";
    return arc.map(function (stage, index) {
      var purpose = stage.purpose;
      var interaction = purpose === "investigate" ? family.investigate : (purpose === "apply" ? family.apply : "");
      var mechanic = purpose === "check" ? "quiz" : (purpose === "recap" ? "mystery" : "story");
      var selection = purpose === "investigate" || purpose === "apply";
      var budget = slotBudget(purpose, ctx, plan);
      return {
        id: purpose,
        beat: stage.beat,
        pedagogicalPurpose: stage.learningRole,
        mechanic: mechanic,
        allowedMechanicFamilies: [mechanic],
        requiredKnowledge: stage.requiredKnowledge || [],
        interactionIntent: interaction,
        participantSelectionAllowed: selection,
        participantSelection: { mode: selection ? who : "whole-class" },
        learningActionRequired: selection,
        mayRevealAnswer: stage.mayRevealAnswer,
        mayAssess: stage.mayAssess,
        dependsOn: stage.dependsOn,
        minutes: minutes[index] || 2,
        minimumParticipation: budget.minimumParticipation,
        contentDepth: budget.contentDepth
      };
    });
  }

  function slotContent(raw) {
    raw = raw || {};
    var config = raw.config && typeof raw.config === "object" ? raw.config : raw;
    var lines = Array.isArray(config.lines) ? config.lines : (Array.isArray(raw.lines) ? raw.lines : []);
    if (!lines.length && typeof config.lines === "string") lines = [config.lines];
    var question = (Array.isArray(config.questions) && config.questions[0]) || {};
    var interaction = raw.scene && raw.scene.interaction && typeof raw.scene.interaction === "object" ? raw.scene.interaction : {};
    return {
      title: clean(raw.title || config.title, 80),
      lines: lines.map(function (line) { return textOf(line, 280); }).filter(Boolean).slice(0, 4),
      instruction: clean(raw.applyInstruction || config.instruction || raw.instruction || interaction.instruction || config.prompt || question.prompt, 180),
      target: clean(config.target || raw.target || interaction.target, 80),
      knowledgeUsed: clean(raw.knowledgeUsed || config.knowledgeUsed, 180),
      successCondition: clean(raw.successCondition || config.successCondition, 180),
      teachingConnection: clean(raw.teachingConnection || config.teachingConnection, 180),
      prompt: clean(question.prompt || config.prompt || raw.prompt, 240),
      choices: (question.choices || config.choices || raw.choices || []).map(function (choice) { return textOf(choice, 80); }).filter(Boolean).slice(0, 4),
      correct: textOf(question.correct || config.correct || raw.correct, 80),
      explain: clean(question.explain || config.explain || raw.explain, 240),
      knowledgeChecked: clean(question.knowledgeChecked || config.knowledgeChecked || raw.knowledgeChecked, 180),
      successEvidence: clean(question.successEvidence || config.successEvidence || raw.successEvidence, 180)
    };
  }

  var FAMILY_TARGET = {
    move: "model", sort: "sets", match: "pairs", compare: "examples", inspect: "scene",
    sequence: "steps", predict: "idea", hotspot: "scene", "tap-to-reveal": "scene", choose: "choices", drag: "pieces"
  };
  var WEAK_LINK = { called: 1, named: 1, large: 1, huge: 1, made: 1, same: 1, other: 1, another: 1 };

  function sameWord(left, right) {
    if (left === right) return true;
    if (left.length > 4 && right.length > 4 && (left.indexOf(right) === 0 || right.indexOf(left) === 0)) return true;
    return false;
  }

  function linkWords(text) {
    return contentWords(text).filter(function (word) { return !WEAK_LINK[word]; });
  }

  function knowledgeLink(text, required) {
    var used = linkWords(text);
    var best = "";
    var bestHits = 0;
    (required || []).forEach(function (item) {
      var bits = linkWords(item).filter(function (word) { return word.length >= 4; });
      if (!bits.length) return;
      var hits = bits.filter(function (bit) {
        return used.some(function (word) { return sameWord(word, bit); });
      });
      var strong = hits.some(function (bit) { return bit.length >= 5; });
      if (!(strong || hits.length >= 2)) return;
      if (hits.length > bestHits) {
        bestHits = hits.length;
        best = item;
      }
    });
    return best;
  }

  function applyInstructionOf(activity) {
    var interaction = activity && activity.scene && activity.scene.interaction;
    var config = (activity && activity.config) || {};
    return clean(activity && activity.applyInstruction || (interaction && interaction.instruction) || ((config.lines || []).join(" ")), 180);
  }

  function doingTask(instruction) {
    return /\b(sort|group|classify|separate|match|pair|move|push|slide|drag|show|slip|sequence|order|arrange|compare|inspect|look|observe|point|find|predict|use|uses|using|label|build|choose|explain|decide|shade|complete|finish|identify|spot|create|creating|write|writing|draw|drawing|make|making)\b/i.test(instruction || "");
  }

  function bareTask(instruction) {
    var text = clean(instruction).toLowerCase();
    if (/^(sort|move|sequence|match|order|group|classify)\b/.test(text) && linkWords(text).length < 1) return true;
    return /^(sort|move|match|sequence) (the )?(cards|these|this|them|it)\.?$/.test(text) || /^put these (events|cards|things) in order\.?$/.test(text);
  }

  function recallOnly(instruction) {
    if (doingTask(instruction)) return false;
    return /^(what|why|which|who|when|where)\b/i.test(clean(instruction));
  }

  function selectionOnly(instruction) {
    return /\b(spin for a pupil|whose turn|pick a pupil|choose a pupil|choose someone)\b/i.test(instruction || "");
  }

  function topicDepiction(instruction) {
    var text = clean(instruction).toLowerCase();
    if (/\b(picture of|sentence about)\b/.test(text)) return true;
    return /^draw an?\b/.test(text) && !/\band\b/.test(text);
  }

  function restatementVerb(instruction) {
    return linkWords(instruction).some(function (word) { return RESTATE[word]; });
  }

  function applyMatched(activity, required) {
    var instruction = applyInstructionOf(activity);
    var named = activity && activity.knowledgeUsed || "";
    if (named) return knowledgeLink(named, required) || "";
    return knowledgeLink(instruction, required) || "";
  }

  function linkBits(text) {
    var seen = {};
    return linkWords(text).filter(function (word) {
      if (word.length < 4 || seen[word]) return false;
      seen[word] = 1;
      return true;
    });
  }

  function hitBits(instruction, sentence) {
    var used = linkWords(instruction);
    return linkBits(sentence).filter(function (bit) {
      return used.some(function (word) { return sameWord(word, bit); });
    });
  }

  var RESTATE = {
    explain: 1, describe: 1, describing: 1, tell: 1, tells: 1, say: 1, says: 1,
    state: 1, states: 1, name: 1, names: 1, recall: 1, define: 1, discuss: 1
  };

  function restatesNamed(instruction, sentence) {
    var words = linkWords(instruction).filter(function (word) { return word.length >= 4; });
    if (!words.some(function (word) { return RESTATE[word]; })) return false;
    var sentenceWords = linkWords(sentence);
    return !words.some(function (word) {
      if (RESTATE[word]) return false;
      return !sentenceWords.some(function (bit) { return sameWord(word, bit); });
    });
  }

  function applyAlignment(activity, required) {
    var instruction = applyInstructionOf(activity);
    var named = activity && activity.knowledgeUsed || "";
    var sentences = (required || []).filter(Boolean);
    if (recallOnly(instruction)) return { status: "fail", reason: "recall-only", matchedKnowledge: "", evidence: [] };
    if (selectionOnly(instruction)) return { status: "fail", reason: "pupil-selection", matchedKnowledge: "", evidence: [] };
    if (bareTask(instruction)) return { status: "fail", reason: "bare-interaction", matchedKnowledge: "", evidence: [] };
    var matched = applyMatched(activity, sentences);
    if (named && !matched) return { status: "fail", reason: "knowledge-unidentified", matchedKnowledge: "", evidence: [] };
    if (!matched) return { status: "unresolved", reason: "no-named-knowledge", matchedKnowledge: "", evidence: [] };
    var hits = hitBits(instruction, matched);
    var bits = linkBits(matched);
    var ratio = bits.length ? hits.length / bits.length : 0;
    var competitor = "";
    var competitorHits = 0;
    var competitorRatio = 0;
    sentences.forEach(function (sentence) {
      if (sentence === matched) return;
      var otherHits = hitBits(instruction, sentence);
      var otherBits = linkBits(sentence);
      var otherRatio = otherBits.length ? otherHits.length / otherBits.length : 0;
      if (otherHits.length > hits.length && otherRatio > ratio && ratio < 0.5 && otherHits.length > competitorHits) {
        competitor = sentence;
        competitorHits = otherHits.length;
        competitorRatio = otherRatio;
      }
    });
    if (competitor && (!hits.length || competitorRatio >= 0.5)) {
      return { status: "fail", reason: "different-knowledge", matchedKnowledge: matched, evidence: hits };
    }
    if (competitor) return { status: "unresolved", reason: "shared-knowledge", matchedKnowledge: matched, evidence: hits };
    if (!doingTask(instruction)) {
      var short = clean(instruction).split(/\s+/).filter(Boolean).length < 4;
      var copiesFact = restatementVerb(instruction) && (restatesNamed(instruction, matched) || hits.length >= 2);
      if (short || copiesFact) return { status: "fail", reason: "not-an-action", matchedKnowledge: matched, evidence: hits };
      return { status: "unresolved", reason: "unlisted-action", matchedKnowledge: matched, evidence: hits };
    }
    if (restatesNamed(instruction, matched)) return { status: "unresolved", reason: "restatement", matchedKnowledge: matched, evidence: hits };
    if (hits.length >= 2 || (hits.length >= 1 && bits.length > 0 && hits.length === bits.length && bits.length <= 2)) {
      return { status: "pass", reason: "relation-covered", matchedKnowledge: matched, evidence: hits };
    }
    if (hits.length === 1 && bits.length >= 3) {
      if (topicDepiction(instruction)) return { status: "fail", reason: "topic-word-only", matchedKnowledge: matched, evidence: hits };
      return { status: "unresolved", reason: "single-stem", matchedKnowledge: matched, evidence: hits };
    }
    if (!hits.length) return { status: "unresolved", reason: "no-lexical-overlap", matchedKnowledge: matched, evidence: [] };
    return { status: "unresolved", reason: "partial-overlap", matchedKnowledge: matched, evidence: hits };
  }

  function applyReady(activity, required) {
    var aligned = applyAlignment(activity, required);
    return aligned.status === "pass" ? aligned.matchedKnowledge : "";
  }

  function settleApply(activity, slot) {
    var matched = applyReady(activity, (slot && slot.requiredKnowledge) || []);
    if (!matched) return;
    if (!activity.knowledgeUsed) activity.knowledgeUsed = clean(matched, 180);
    var success = clean(activity.successCondition);
    if (!success || /^(done|ok|okay|finished|complete|completed)$/i.test(success)) {
      activity.successCondition = "The pupil has used this idea: " + clean(matched, 90);
    }
    if (!activity.teachingConnection) activity.teachingConnection = "The task uses this teaching: " + clean(matched, 90);
    if (activity.scene && activity.scene.interaction) activity.scene.interaction.successCondition = clean(activity.successCondition, 40);
  }

  function applySemanticInput(activity, slot, ctx) {
    return {
      instruction: applyInstructionOf(activity),
      knowledgeUsed: activity && activity.knowledgeUsed || "",
      requiredKnowledge: ((slot && slot.requiredKnowledge) || []).slice(0, 6),
      successCondition: activity && activity.successCondition || "",
      teachingConnection: activity && activity.teachingConnection || "",
      subject: ctx && ctx.subject || "",
      yearGroup: ctx && ctx.yearGroup || ""
    };
  }

  function applySemanticBrief(input) {
    var payload = {
      instruction: clean(input && input.instruction, 180),
      knowledgeUsed: clean(input && input.knowledgeUsed, 180),
      requiredKnowledge: textList(input && input.requiredKnowledge, 180, 6),
      successCondition: clean(input && input.successCondition, 180),
      teachingConnection: clean(input && input.teachingConnection, 180),
      subject: clean(input && input.subject, 80),
      yearGroup: clean(input && input.yearGroup, 40)
    };
    return {
      system: [
        "You judge only the task explicitly required by instruction. Do not imagine later activities, future uses, or follow-up work for the pupil's answer. Return one JSON object and nothing else.",
        "Classify the relationship between this instruction and knowledgeUsed as exactly one of reproduce, apply, or unrelated.",
        "reproduce means the instruction asks the pupil to give back substantially the taught knowledge itself. That includes recall, stating, naming, defining, explaining the named fact itself, describing the named fact itself, paraphrasing the named fact, or answering a direct question whose answer is essentially knowledgeUsed.",
        "apply means the instruction requires the taught knowledge as information so that some other requested result or action is correct. The knowledge is a tool for classification, selection, construction, manipulation, representation, comparison, prediction, inference, or solving a new case. It is not substantially the requested outcome itself.",
        "unrelated means the instruction does not genuinely require the named knowledge. That includes topic-only overlap, a generic activity, an action that could be completed without the named knowledge, or a semantic mismatch.",
        "A question is not reproduce by itself. A physical action, a drawing, or a topic word is not apply by itself. The reason must mention only what this instruction requires.",
        "Do not rewrite the task. Do not choose a mechanic, an interaction, or a fact. Do not judge the rest of the lesson.",
        "JSON shape: {\"relationship\": \"reproduce\" or \"apply\" or \"unrelated\", \"reason\": \"one short sentence\"}."
      ].join(" "),
      user: JSON.stringify(payload)
    };
  }

  function applySemanticDecision(relationship) {
    var name = typeof relationship === "string" ? relationship.trim().toLowerCase() : "";
    if (name === "apply") return { ok: true, relationship: "apply", outcome: "semantic-pass", issue: "" };
    if (name === "reproduce") return { ok: true, relationship: "reproduce", outcome: "semantic-reproduce", issue: "The apply slot reproduces the named taught knowledge instead of applying it." };
    if (name === "unrelated") return { ok: true, relationship: "unrelated", outcome: "semantic-unrelated", issue: "The apply slot can be completed without using the named taught knowledge." };
    return { ok: false, relationship: null, outcome: "semantic-error", issue: "The apply slot needs semantic knowledge alignment." };
  }

  function parseApplySemantic(raw) {
    var body = raw;
    if (typeof raw === "string") {
      try { body = JSON.parse(raw); } catch (e) { body = null; }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, relationship: null, reason: "" };
    var decision = applySemanticDecision(body.relationship);
    if (!decision.ok) return { ok: false, relationship: null, reason: "" };
    return { ok: true, relationship: decision.relationship, reason: clean(body.reason, 240) };
  }

  function applyReportOf(activities, ctx) {
    if (!ctx || !ctx.lessonSkeleton) return null;
    var activity = null;
    var slot = null;
    (activities || []).forEach(function (item) { if (item && item.slotId === "apply") activity = item; });
    ctx.lessonSkeleton.forEach(function (item) { if (item && item.id === "apply") slot = item; });
    if (!activity) return null;
    var aligned = applyAlignment(activity, (slot && slot.requiredKnowledge) || []);
    return { deterministicStatus: aligned.status, deterministicReason: aligned.reason };
  }

  function applyJudgePlan(result) {
    if (!result) return "skip";
    if (result.ok) return "skip-pass";
    if (result.structuralOk === false) return "skip-structure";
    var status = result.applyAlignment && result.applyAlignment.deterministicStatus;
    if (status === "unresolved") return "judge";
    if (status === "pass") return "skip-pass";
    return "skip-fail";
  }

  function applySlotIssues(activity, slot, ctx) {
    var issues = [];
    var instruction = applyInstructionOf(activity);
    var required = (slot && slot.requiredKnowledge) || [];
    if (clean(instruction).split(/\s+/).filter(Boolean).length < 4) issues.push("The apply slot has no learning instruction.");
    var interaction = activity && activity.scene && activity.scene.interaction;
    if (clean(instruction).split(/\s+/).filter(Boolean).length >= 4 && (!interaction || !clean(interaction.target))) {
      issues.push("The apply slot has no interaction target.");
    }
    var aligned = applyAlignment(activity, required);
    var given = ctx && ctx.applySemantic;
    if (aligned.status === "unresolved") {
      var decision = applySemanticDecision(given && given.relationship);
      if (decision.ok && decision.issue) issues.push(decision.issue);
      else if (!decision.ok) issues.push(decision.issue);
    } else if (aligned.status === "fail") {
      if (aligned.reason === "recall-only") issues.push("The apply slot asks for recall instead of using the knowledge.");
      else if (aligned.reason === "pupil-selection") issues.push("The apply slot selects a pupil instead of using the knowledge.");
      else issues.push("The apply slot does not use the taught knowledge.");
    }
    var success = clean(activity && activity.successCondition);
    if (!success || /^(done|ok|okay|finished|complete|completed)$/i.test(success)) issues.push("The apply slot has no success condition.");
    return issues;
  }

  function learningGoalOf(ctx) {
    var intent = ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent;
    if (!intent || intent.ok !== true) return "";
    return clean(intent.learningGoal, 240);
  }

  function checkQuestionOf(activity) {
    var config = (activity && activity.config) || {};
    var question = (config.questions && config.questions[0]) || config;
    return {
      prompt: clean(question.prompt || config.prompt, 240),
      choices: question.choices || config.choices || [],
      correct: clean(question.correct || config.correct, 80),
      explain: clean(question.explain || config.explain, 240),
      knowledgeChecked: clean(question.knowledgeChecked || config.knowledgeChecked, 180),
      successEvidence: clean(question.successEvidence || config.successEvidence, 180),
      teachingConnection: clean(question.teachingConnection || config.teachingConnection, 180)
    };
  }

  function checkAlignment(activity, ctx) {
    if (!learningGoalOf(ctx)) return { status: "skip", reason: "no-learning-goal" };
    var question = checkQuestionOf(activity);
    var wordsInPrompt = question.prompt.split(/\s+/).filter(Boolean).length;
    if (wordsInPrompt < 4 || question.choices.length < 2 || !question.correct) {
      return { status: "fail", reason: "incomplete-question" };
    }
    if (!question.knowledgeChecked || !question.successEvidence || !question.teachingConnection) {
      return { status: "fail", reason: "incomplete-contract" };
    }
    return { status: "unresolved", reason: "goal-alignment" };
  }

  function checkSemanticDecision(relationship) {
    var name = typeof relationship === "string" ? relationship.trim().toLowerCase() : "";
    if (name === "aligned") return { ok: true, relationship: "aligned", outcome: "check-pass", issue: "" };
    if (name === "prerequisite") return { ok: true, relationship: "prerequisite", outcome: "check-prerequisite", issue: "The check slot asks for a nearby definition instead of the learning goal." };
    if (name === "unrelated") return { ok: true, relationship: "unrelated", outcome: "check-unrelated", issue: "The check slot does not test the learning goal." };
    return { ok: false, relationship: null, outcome: "check-error", issue: "The check slot needs semantic goal alignment." };
  }

  function checkSlotIssues(activity, ctx) {
    var aligned = checkAlignment(activity, ctx);
    if (aligned.status === "skip") return [];
    if (aligned.status === "fail") {
      if (aligned.reason === "incomplete-question") return ["The check slot has no real question."];
      return ["The check slot does not say what learning it checks."];
    }
    var decision = checkSemanticDecision(ctx && ctx.checkSemantic && ctx.checkSemantic.relationship);
    if (!decision.ok) return [decision.issue];
    if (decision.issue) return [decision.issue];
    return [];
  }

  function checkReportOf(activities, ctx) {
    if (!ctx || !ctx.lessonSkeleton) return null;
    var activity = null;
    (activities || []).forEach(function (item) { if (item && item.slotId === "check") activity = item; });
    if (!activity) return null;
    var aligned = checkAlignment(activity, ctx);
    return { deterministicStatus: aligned.status, deterministicReason: aligned.reason };
  }

  function checkJudgePlan(result) {
    if (!result) return "skip";
    var status = result.checkAlignment && result.checkAlignment.deterministicStatus;
    if (status === "unresolved") return "judge";
    return "skip";
  }

  function checkSemanticInput(activity, ctx, taught) {
    var question = checkQuestionOf(activity);
    var intent = (ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent) || {};
    return {
      yearGroup: (ctx && ctx.yearGroup) || "",
      subject: (ctx && ctx.subject) || "",
      learningGoal: learningGoalOf(ctx),
      focusConcepts: (intent.focusConcepts || []).slice(0, 4),
      requiredKnowledge: knowledgeLines(ctx).slice(0, 4),
      taught: clean(taught, 400),
      prompt: question.prompt,
      choices: (question.choices || []).slice(0, 4),
      correct: question.correct,
      explain: question.explain,
      knowledgeChecked: question.knowledgeChecked,
      successEvidence: question.successEvidence,
      teachingConnection: question.teachingConnection
    };
  }

  function checkSemanticBrief(input) {
    var payload = {
      yearGroup: clean(input && input.yearGroup, 40),
      subject: clean(input && input.subject, 80),
      learningGoal: clean(input && input.learningGoal, 240),
      focusConcepts: textList(input && input.focusConcepts, 80, 4),
      requiredKnowledge: textList(input && input.requiredKnowledge, 180, 4),
      taught: clean(input && input.taught, 400),
      prompt: clean(input && input.prompt, 240),
      choices: textList(input && input.choices, 80, 4),
      correct: clean(input && input.correct, 80),
      explain: clean(input && input.explain, 240),
      knowledgeChecked: clean(input && input.knowledgeChecked, 180),
      successEvidence: clean(input && input.successEvidence, 180),
      teachingConnection: clean(input && input.teachingConnection, 180)
    };
    return {
      system: [
        "You judge only whether a correct answer to this check is evidence that the pupil achieved the teacher's learningGoal. Return one JSON object and nothing else.",
        "Ask this: if the pupil answers the prompt correctly, can we reasonably conclude they achieved the learning goal, including the action the goal asks for?",
        "First name the action the learning goal requires and the action the correct answer performs. If they are not the same action, classify prerequisite. Identifying, naming, defining, or recalling is not measuring, sequencing a whole process, comparing two things, explaining a cause, writing, or using a mark or a tool. A goal that runs from a beginning to an end is not shown by one stage.",
        "Compare the learningGoal, the prompt, and the correct answer. knowledgeChecked, successEvidence, and teachingConnection are the author's claims. They must not override the prompt and the correct answer.",
        "Classify the relationship as exactly one of aligned, prerequisite, or unrelated.",
        "aligned means a correct answer demonstrates the requested learning, or the same action on a smaller example. A smaller example of the same action can be aligned. A different, easier action cannot. The check does not need to repeat the whole apply task. It does not need to cover every fact in the lesson. It does need to show the central action. Do not rewrite the goal into an easier action. If the goal itself is only to identify, name, or define one thing, a simple identification or definition is aligned. Short year-group language can still be aligned.",
        "prerequisite means a correct answer is related, but we still cannot conclude the pupil achieved the goal. Related to the goal is not evidence of the goal. The correct answer itself must be that evidence. Use prerequisite when the question names, defines, or recalls a piece instead of doing the action the goal names. That includes a definition when the goal is to use or apply, a label when the goal is to measure, one stage when the goal describes a process from a start to an end, one side when the goal compares two things, one component when the goal is to write or create a complete piece, identifying an example when the goal is to produce or use one, and naming a tool or a symbol when the goal is to use it. Knowing one part of a multi-part goal is prerequisite unless the goal itself asks only for that part.",
        "unrelated means a correct answer shows knowledge outside the requested learning.",
        "Do not rewrite the question. Do not choose a mechanic or another stage. Do not make the question harder than the year group.",
        "JSON shape: {\"relationship\": \"aligned\" or \"prerequisite\" or \"unrelated\", \"reason\": \"one short sentence\"}."
      ].join(" "),
      user: JSON.stringify(payload)
    };
  }

  function parseCheckSemantic(raw) {
    var body = raw;
    if (typeof raw === "string") {
      try { body = JSON.parse(raw); } catch (e) { body = null; }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, relationship: null, reason: "" };
    var decision = checkSemanticDecision(body.relationship);
    if (!decision.ok) return { ok: false, relationship: null, reason: "" };
    return { ok: true, relationship: decision.relationship, reason: clean(body.reason, 240) };
  }

  function slotIdOf(activity) {
    var known = { hook: 1, investigate: 1, teach: 1, apply: 1, check: 1, resolution: 1, recap: 1 };
    var id = clean(activity && (activity.slotId || activity.purpose || activity.id), 24).toLowerCase();
    if (known[id]) return id;
    var beat = activity && activity.scene && activity.scene.beat;
    var byBeat = { beginning: "hook", goal: "investigate", discovery: "teach", application: "apply", development: "check", resolution: "resolution", debrief: "recap" };
    if (byBeat[beat]) return byBeat[beat];
    if (activity && activity.mechanic === "quiz") return "check";
    if (activity && activity.mechanic === "mystery") return "recap";
    return "";
  }

  function readSlotMap(raw) {
    var map = {};
    var slots = raw && raw.slots;
    if (slots && typeof slots === "object" && !Array.isArray(slots)) {
      Object.keys(slots).forEach(function (key) {
        var id = clean(key, 24).toLowerCase();
        if (id) map[id] = slotContent(slots[key]);
      });
    }
    var activities = raw && Array.isArray(raw.activities) ? raw.activities : [];
    activities.forEach(function (activity) {
      var id = slotIdOf(activity);
      if (!id || map[id]) return;
      map[id] = slotContent(activity);
    });
    return map;
  }

  function materialiseSkeleton(skeleton, raw, ctx) {
    raw = raw && typeof raw === "object" ? raw : {};
    var map = readSlotMap(raw);
    var plan = (ctx && ctx.lessonPlan) || {};
    var activities = (skeleton || []).map(function (slot) {
      var content = map[slot.id] || {};
      var spoken = (content.lines || []).slice();
      if (slot.id === "apply" && content.instruction && !spoken.length) spoken = [content.instruction];
      var interaction = null;
      if (slot.interactionIntent) {
        interaction = {
          type: slot.interactionIntent,
          target: content.target || FAMILY_TARGET[slot.interactionIntent] || "world",
          instruction: content.instruction || (spoken[0] || ""),
          successCondition: content.successCondition || ""
        };
      }
      var config = slot.mechanic === "quiz"
        ? { points: 1, participation: "whole_class", questions: [{ prompt: content.prompt, choices: content.choices || [], correct: content.correct, explain: content.explain, knowledgeChecked: content.knowledgeChecked, successEvidence: content.successEvidence, teachingConnection: content.teachingConnection }] }
        : { lines: spoken };
      return {
        slotId: slot.id,
        mechanic: slot.mechanic,
        title: content.title || slot.pedagogicalPurpose,
        purpose: slot.pedagogicalPurpose,
        minutes: slot.minutes,
        why: slot.pedagogicalPurpose,
        participantSelection: slot.participantSelection,
        learningInteraction: slot.interactionIntent ? { type: slot.interactionIntent } : null,
        applyInstruction: slot.id === "apply" ? (content.instruction || spoken[0] || "") : "",
        knowledgeUsed: slot.id === "apply" ? (content.knowledgeUsed || "") : "",
        successCondition: slot.id === "apply" ? (content.successCondition || "") : "",
        teachingConnection: slot.id === "apply" ? (content.teachingConnection || "") : "",
        scene: { beat: slot.beat, kind: slot.id === "teach" ? "teach" : (slot.id === "resolution" ? "resolution" : (slot.id === "recap" ? "debrief" : "challenge")), interaction: interaction },
        config: config
      };
    });
    return {
      subject: clean(raw.subject || plan.subject || (ctx && ctx.subject), 80),
      topic: clean(raw.topic || plan.topic || (ctx && ctx.topic), 120),
      yearGroup: clean(raw.yearGroup || plan.yearGroup || (ctx && ctx.yearGroup), 40),
      title: clean(raw.title || (plan.title || ""), 80),
      objectives: raw.objectives || (plan.learningObjective ? [plan.learningObjective] : []),
      vocabulary: raw.vocabulary || plan.vocabulary || [],
      activities: activities
    };
  }

  function mergeSlotContent(previous, patch) {
    var map = readSlotMap(previous);
    var incoming = readSlotMap(patch);
    Object.keys(incoming).forEach(function (id) {
      if (incoming[id]) map[id] = incoming[id];
    });
    return { slots: map, title: (patch && patch.title) || (previous && previous.title), objectives: (patch && patch.objectives) || (previous && previous.objectives) };
  }

  function ownIssue(slotIssues, slotId, message) {
    if (!slotIssues || !slotId || !message) return;
    if (!slotIssues[slotId]) slotIssues[slotId] = [];
    if (slotIssues[slotId].indexOf(message) === -1) slotIssues[slotId].push(message);
  }

  function slotsOwnedBy(issue, activities) {
    var text = String(issue || "");
    var ids = [];
    function add(id) {
      if (id && ids.indexOf(id) === -1) ids.push(id);
    }
    var named = text.match(/The (hook|investigate|teach|apply|check|resolution|recap) slot/);
    if (named) add(named[1]);
    var match = text.match(/Activity (\d+)/);
    if (match) add((activities[Number(match[1]) - 1] || {}).slotId);
    if (/opening states/.test(text)) add("hook");
    if (/investigate slot|missing the investigate/.test(text)) add("investigate");
    if (/apply slot|missing the apply|apply stage/.test(text)) add("apply");
    if (/correct answer|explanation of the reason|wrong answer|what happens|misconception|no real question|not one of the choices|at least two choices/.test(text)) add("check");
    if (/does not teach |does not explain it|enough teaching|cause is not taught/.test(text)) add("teach");
    if (/debrief does not|recap does not|needs a fact/.test(text)) add("recap");
    return ids;
  }

  function slotIssuesFrom(issues, activities, preset) {
    var map = {};
    Object.keys(preset || {}).forEach(function (id) {
      (preset[id] || []).forEach(function (message) { ownIssue(map, id, message); });
    });
    (issues || []).forEach(function (issue) {
      var placed = false;
      Object.keys(map).forEach(function (id) {
        if (map[id].indexOf(issue) !== -1) placed = true;
      });
      if (placed) return;
      slotsOwnedBy(issue, activities).forEach(function (id) { ownIssue(map, id, issue); });
    });
    return map;
  }

  function slotIdsFrom(issues, activities) {
    var ids = [];
    var map = issues && issues.slotIssues;
    (issues || []).forEach(function (issue) {
      var owned = [];
      if (map) {
        Object.keys(map).forEach(function (id) {
          if (map[id].indexOf(issue) !== -1) owned.push(id);
        });
      }
      if (!owned.length) owned = slotsOwnedBy(issue, activities);
      owned.forEach(function (id) {
        if (ids.indexOf(id) === -1) ids.push(id);
      });
    });
    return ids;
  }

  function skeletonDrift(activities, skeleton) {
    var issues = [];
    if (!skeleton || activities.length !== skeleton.length) issues.push("The lesson skeleton lost a slot.");
    (skeleton || []).forEach(function (slot, index) {
      var activity = activities[index];
      if (!activity || activity.slotId !== slot.id) issues.push("The lesson is missing the " + slot.id + " stage.");
      else if (activity.mechanic !== slot.mechanic || activity.mechanic === "spin") issues.push("The " + slot.id + " stage uses the wrong mechanic.");
    });
    var checkAt = -1;
    var resolutionAt = -1;
    var recapAt = -1;
    (activities || []).forEach(function (activity, index) {
      if (activity.slotId === "check") checkAt = index;
      if (activity.slotId === "resolution") resolutionAt = index;
      if (activity.slotId === "recap") recapAt = index;
    });
    if (checkAt !== -1 && resolutionAt !== -1 && resolutionAt < checkAt) issues.push("The resolution slot comes before the check.");
    if (resolutionAt !== -1 && recapAt !== -1 && recapAt < resolutionAt) issues.push("The recap slot comes before the resolution.");
    return issues;
  }

  function repairClass(issues) {
    var text = (issues || []).join(" ");
    var structural = /opening states|does not explain it|mission ends|before the class has been taught|no debrief|settle the mission|does not teach |drifted into|written for Year|wrong year|source material|add up to|too much reading|adventure objective is not|debrief does not reflect|repeated the teacher's request|missing the |apply stage/;
    var local = /correct answer is the effect|not the cause|wrong answer|explanation of the reason|not one of the choices|no real question|needs a true or false|needs at least two|needs three|needs a reveal|door number|needs something for the class|needs a fact|recap does not state|name placeholder|unrelated to the idea|asks what happens|not a misconception|not a real alternative|is a joke/;
    if (structural.test(text)) return "structural";
    if (local.test(text)) return "local";
    return "structural";
  }

  function pupilConceptLine(safe) {
    var brief = (safe && safe.lessonBrief) || {};
    var intent = brief.teacherIntent;
    if (intent && intent.ok) {
      return "Teach this learning goal. Paraphrase is fine: " + intent.learningGoal + ". Focus ideas: " + ((intent.focusConcepts || []).join("; ") || "the learning goal") + ". Pupils already know: " + ((intent.priorKnowledge || []).join("; ") || "nothing stated") + ". Do not reteach: " + ((intent.exclusions || []).join("; ") || "nothing stated") + ". Presentation only: " + ((intent.preferences || []).join(", ") || "none") + ". Do not copy the teacher's wording, and do not teach the presentation words or the duration.";
    }
    if (intent && intent.ok === false) return "Teach the lesson plan's key knowledge. Do not treat incidental words from the teacher's wording as ideas that must appear.";
    return "The pupil-facing text must include every concept: " + ((((brief.concepts || []).filter(Boolean).length ? brief.concepts : words(brief.topic || (safe && safe.topic) || "").filter(function (word) { return !FUNCTION[word]; })).join(", ")) || "the topic") + ".";
  }

  function contentBrief(ctx, plan, story) {
    var safe = forModel(ctx || {});
    var sourcePlan = plan || (ctx && ctx.lessonPlan) || null;
    var skeleton = (ctx && ctx.lessonSkeleton) || lessonSkeleton(sourcePlan || {}, ctx || {});
    if (sourcePlan) {
      safe.lessonPlan = Object.assign({}, sourcePlan, {
        lessonArc: contractArc(sourcePlan.lessonArc, textList(sourcePlan.keyKnowledge, 180, 6))
      });
    } else safe.lessonPlan = null;
    safe.storyPlan = story || (ctx && ctx.storyPlan) || null;
    safe.lessonSkeleton = skeleton;
    var system = [
      "You are writing the words for a Wondii lesson. Return one JSON object and nothing else.",
      pupilConceptLine(safe),
      "Do not return HTML, CSS, JavaScript, markdown, or a worksheet.",
      "lessonSkeleton is already decided. Return slots keyed by the skeleton ids. Do not return an activities array. Do not choose a mechanic, a beat, an order, or a new stage. A spin is not a slot.",
      "JSON shape: { title, objectives, slots: { hook, investigate, teach, apply, check, resolution, recap } }.",
      "hook, investigate, teach, resolution, and recap use { title, lines }. lines is an array of short spoken sentences. investigate uses { instruction, target }. apply uses { instruction, target, knowledgeUsed, successCondition, teachingConnection }. check uses { title, prompt, choices, correct, explain, knowledgeChecked, successEvidence, teachingConnection }. choices are strings. correct is one of those strings copied exactly.",
      "Each slot already has minutes, minimumParticipation, and contentDepth. Meet that participation with short turns: a teacher prompt, an observation, a pupil action, a check, or a retrieval. Do not pad a slot into a long paragraph.",
      "hook creates the unsolved problem and must not reveal the answer. investigate asks the class to look, using the slot's interactionIntent. It must not explain the answer and it must not be a pupil spin. teach states every requiredKnowledge fact in short sentences this age can hear. apply must make the pupil use at least one requiredKnowledge item through the slot's interactionIntent. instruction is that task. knowledgeUsed names the requiredKnowledge item the task uses. successCondition says what a finished action shows. teachingConnection says how the task follows the teaching. Sort the cards, move this, or put these in order is not an apply task unless the taught idea is in the instruction. Choosing a pupil is not the apply slot. check comes after teaching and assesses teacherIntent.learningGoal. A correct answer must be evidence that the pupil achieved that goal, not merely a nearby definition, label, tool name, isolated stage, or single component, unless the goal itself asks only for that identification or definition. knowledgeChecked names the learning the question tests. successEvidence says what a correct answer shows. teachingConnection says how the question follows the learning goal. Keep the question as easy to read as the year group. resolution is the mission outcome after the check. recap states the taught facts. Do not say that the screen is a recap or a mystery.",
      "A stage with mayRevealAnswer false must not state requiredKnowledge and must not use because, caused by, or due to. Do not add a fact that is not in keyKnowledge.",
      "For a why lesson, the check correct answer is the cause, reason, or process in keyKnowledge. The visible outcome can be the question or a wrong choice.",
      "When teacherIntent is present, paraphrase the learning goal and the focus concepts. Do not make the class meet preference words, duration words, prior-knowledge labels, or exclusions. Otherwise lessonBrief.concepts are the ideas the class must meet. Do not treat between, difference, why, or how as ideas to teach.",
      "storyPlan is the setting and the mission. Do not turn the lesson into a lesson about stories unless lessonBrief.topic is about stories.",
      "Put the teaching in the teach slot before the first scored quiz.",
      "Sound like a teacher talking to the class. Use short, natural sentences. Do not start screens with Let's explore, Let's discover, Great job, Can you identify, or Which of the following.",
      "Match the age. Year 1 and 2 lines are one short sentence each. If yearAssumed is true, do not name a year in the pupil text.",
      "Wrong answers are plausible, age-appropriate, and clearly incorrect. Use a misconception from lessonPlan.misconceptions when the question asks why, compares, or asks the class to reason, and a misconception fits. A simple recall or definition question may use a short wrong alternative that was not taught. Do not use jokes, magic, vanishing, singing, 'say nothing', 'do nothing', or 'I don't know'.",
      "A why, comparison, or reasoning question needs an explain of at least six words that gives the reason. A recall or definition question needs a short true reinforcement of at least three words. Correct or Great job on its own is not an explanation.",
      "Stay with the facts in the lesson plan. Do not add a quotation, a date, or an event that is not already in the plan.",
      "The exact lessonBrief.rawRequest sentence must not appear in any field. objectives is an array with the learning objective.",
      "Never use Playtime, Home time, The register, Pillow, Sandwich, Sock, or Door 1 as labels or answers.",
      "The year group in the request is authoritative. Do not write the lesson for a different year.",
      "title must not repeat the teacher's request.",
      "A hook may describe the unsolved visible event. Do not invent a mechanic for it. If that event is something the class can see, name a worldEffect type the player already allows: shake, rumble, pulse, glow, highlight, zoom, pan, reveal, crack, move-object, vibrate-object, fade, particles, flash, or sound-cue.",
      "Do not write {name} or a pupil name. participantSelection on a slot chooses who acts. The slot's instruction is what they do."
    ].join(" ");
    var schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        objectives: { type: "array", items: { type: "string" } },
        slots: {
          type: "object",
          additionalProperties: false,
          properties: {},
          required: skeleton.map(function (slot) { return slot.id; })
        }
      },
      required: ["title", "objectives", "slots"]
    };
    skeleton.forEach(function (slot) {
      var fields = slot.mechanic === "quiz"
        ? { title: { type: "string" }, prompt: { type: "string" }, choices: { type: "array", items: { type: "string" } }, correct: { type: "string" }, explain: { type: "string" }, knowledgeChecked: { type: "string" }, successEvidence: { type: "string" }, teachingConnection: { type: "string" } }
        : { title: { type: "string" }, lines: { type: "array", items: { type: "string" } }, instruction: { type: "string" }, target: { type: "string" } };
      if (slot.id === "apply") {
        fields.knowledgeUsed = { type: "string" };
        fields.successCondition = { type: "string" };
        fields.teachingConnection = { type: "string" };
      }
      schema.properties.slots.properties[slot.id] = { type: "object", additionalProperties: false, properties: fields };
    });
    return { system: system, user: JSON.stringify(safe), schema: schema };
  }

  function modelBrief(ctx) {
    return contentBrief(ctx, ctx && ctx.lessonPlan, ctx && ctx.storyPlan);
  }

  function repairBrief(ctx, issues, previous, forced) {
    var kind = forced || repairClass(issues);
    var brief = contentBrief(ctx, ctx && ctx.lessonPlan, ctx && ctx.storyPlan);
    brief.user = JSON.stringify({
      lesson: forModel(ctx),
      lessonPlan: (ctx && ctx.lessonPlan) || null,
      storyPlan: (ctx && ctx.storyPlan) || null,
      problems: issues || [],
      previous: kind === "local" ? (previous || null) : null,
      instruction: kind === "local"
        ? "Repair only the listed activity. Keep every other activity, the order, the topic, the year, and the lesson plan. If the correct answer is the effect, set correct to the mechanism already in lessonPlan.keyKnowledge and leave the visible result as a wrong choice. Do not invent a mechanism that is not in the lesson plan. Return the full JSON adventure."
        : "The previous activities failed the lesson structure. Do not patch them and do not reorder strings. Write the adventure again by filling lessonPlan.lessonArc from the first stage to the last. Obey mayRevealAnswer and requiredKnowledge on each stage. Keep the same topic, year, key knowledge, and story setting. Do not invent a mechanism that is not in keyKnowledge. Keep the minutes inside durationBand. Return the full JSON adventure."
    });
    return brief;
  }

  function localRepairBrief(ctx, issues, previous) {
    var brief = repairBrief(ctx, issues, previous, "local");
    var activities = (previous && previous.activities) || [];
    var failed = [];
    (issues || []).forEach(function (issue) {
      var match = String(issue).match(/Activity (\d+)/);
      if (!match) return;
      var activity = activities[Number(match[1]) - 1];
      if (activity && failed.indexOf(activity) === -1) failed.push(activity);
    });
    if (!failed.length) {
      activities.forEach(function (activity) {
        if (activity && activity.mechanic === "quiz") failed.push(activity);
      });
    }
    var payload = JSON.parse(brief.user);
    payload.failedActivities = failed;
    payload.planKnowledge = ((ctx && ctx.lessonPlan && (ctx.lessonPlan.knowledge || ctx.lessonPlan.keyKnowledge)) || []);
    payload.requiredCorrection = "Rewrite only the failed activity so each listed problem is gone. Keep the other activities. Use the plan knowledge. A why, comparison, or reasoning answer must match a cause, reason, process, or comparison in that knowledge. A recall or definition question may use a plausible wrong choice that was not taught as a misconception. Return the full adventure.";
    brief.user = JSON.stringify(payload);
    return brief;
  }

  function failuresForSlot(slotId, issues, activities) {
    var map = issues && issues.slotIssues;
    if (map) return (map[slotId] || []).slice();
    return (issues || []).filter(function (issue) {
      return slotsOwnedBy(issue, activities).indexOf(slotId) !== -1;
    });
  }

  function slotRepairBrief(ctx, slotIds, issues, previous) {
    var skeleton = (ctx && ctx.lessonSkeleton) || [];
    var wanted = slotIds && slotIds.length ? slotIds : [];
    var brief = contentBrief(ctx, ctx && ctx.lessonPlan, ctx && ctx.storyPlan);
    var current = readSlotMap(previous);
    var specs = [];
    skeleton.forEach(function (slot) {
      if (wanted.indexOf(slot.id) === -1) return;
      var now = current[slot.id] || {};
      specs.push({
        slotType: String(slot.id || "").toUpperCase(),
        subject: (ctx && ctx.subject) || "",
        year: (ctx && ctx.yearGroup) || "",
        minutes: slot.minutes,
        minimumParticipation: slot.minimumParticipation,
        contentDepth: slot.contentDepth,
        requiredKnowledge: slot.requiredKnowledge || [],
        interactionFamily: slot.interactionIntent || "",
        originalInstruction: now.instruction || (now.lines || []).join(" "),
        failure: failuresForSlot(slot.id, issues, (previous && previous.activities) || []),
        output: slot.id === "apply"
          ? { instruction: "", knowledgeUsed: "", successCondition: "", teachingConnection: "", target: "" }
          : slot.id === "check"
            ? { prompt: "", choices: [], correct: "", explain: "", knowledgeChecked: "", successEvidence: "", teachingConnection: "" }
            : { title: "", lines: [] }
      });
      if (slot.id === "check") {
        var intent = ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent;
        specs[specs.length - 1].learningGoal = learningGoalOf(ctx);
        specs[specs.length - 1].focusConcepts = intent && intent.focusConcepts ? intent.focusConcepts.slice(0, 4) : [];
      }
    });
    var apply = null;
    specs.forEach(function (spec) { if (spec.slotType === "APPLY") apply = spec; });
    var instruction = apply
      ? "Return JSON { slots } for only the listed slot ids. The APPLY task MUST require the pupil to use this knowledge: " + ((apply.requiredKnowledge || []).join(" | ") || "the taught idea") + ". The mechanic and interaction family cannot change. Return instruction, knowledgeUsed, successCondition, and teachingConnection for that slot. knowledgeUsed must name one requiredKnowledge item. A bare sort, move, or sequence is invalid."
      : "Return JSON { slots } for only the listed slot ids.";
    var checkSpec = null;
    specs.forEach(function (spec) { if (spec.slotType === "CHECK") checkSpec = spec; });
    if (checkSpec) {
      instruction += " The CHECK slot must stay a quiz. Rewrite only its prompt, choices, correct, explain, knowledgeChecked, successEvidence, and teachingConnection. The question must assess this learning goal: " + (checkSpec.learningGoal || "the requested learning") + ". A correct answer must be evidence the pupil achieved that goal. Do not merely ask for a definition, a label, an isolated fact, or a single component when the goal requires a higher or multi-part action. A smaller example is fine. Use words this year group can read. Do not make the question more abstract than the goal.";
    }
    if (specs.some(function (spec) { return spec.slotType !== "APPLY"; })) {
      var otherFailures = [];
      specs.forEach(function (spec) {
        if (spec.slotType === "APPLY") return;
        (spec.failure || []).forEach(function (item) { otherFailures.push(String(item)); });
      });
      instruction += " For any other listed slot, correct only the failures listed for that slot. Those failure texts are the reason that slot must change.";
      if (otherFailures.some(function (item) { return /enough participation/.test(item); })) {
        instruction += " If a failure says the slot does not have enough participation, add the missing turns up to minimumParticipation. Each turn is one short sentence: a teacher prompt, an observation, a pupil action, a check, or a retrieval. Do not pad with a long paragraph. Do not copy teaching into a slot that already has it.";
      }
    }
    instruction += " Do not return activities, mechanics, beats, or a new stage.";
    brief.user = JSON.stringify({
      slotsToRewrite: specs,
      instruction: instruction
    });
    return brief;
  }

  function planRepairBrief(ctx, issues, previous) {
    var brief = planBrief(ctx);
    brief.user = JSON.stringify({
      lesson: forModel(ctx),
      problems: issues || [],
      previous: previous || null,
      instruction: "Repair the internal lesson plan only. Do not write pupil activities. If the problem says the key knowledge states the outcome, not the reason, add at least one keyKnowledge item of six words or more that explains why, with knowledgeType cause, reason, or process. Do not only restate what is seen. Return the full plan JSON again."
    });
    return brief;
  }

  function storyBrief(ctx, plan) {
    var safe = forModel(ctx || {});
    safe.lessonPlan = plan || (ctx && ctx.lessonPlan) || null;
    var year = Number(yearDigit((ctx && ctx.yearGroup) || (plan && plan.yearGroup))) || ((ctx && ctx.yearAssumed) ? 3 : 4);
    var age = year <= 2
      ? "Year 1 to 2: a very short, concrete problem, one simple positive role, and almost no reading. A teacher can narrate it."
      : (year >= 5
        ? "Year 5 to 6: evidence, reasoning, and a decision that matters. Do not write a nursery story."
        : "Year 3 to 4: a clear mission, a simple problem, and one class decision.");
    var system = [
      "You are writing one internal story plan from a lesson plan. Return one JSON object and nothing else.",
      "Do not write the pupil activities yet. The lesson plan is authoritative for the learning objective, key knowledge, misconceptions, progression, and age. The story serves that lesson. Do not change the learning to make the plot more exciting.",
      "Choose one structure that fits this subject, topic, year, objective, and duration: mission, mystery, journey, problem, investigation, time-travel, challenge, creative, or real-world.",
      "Science often fits an investigation, a mission, or a discovery. History often fits time travel, a historical investigation, or an evidence mystery. English often fits a creative world, a broken story, or a language challenge. Maths often fits a real problem, a puzzle, or sharing resources. Geography often fits an expedition, a journey, or an investigation. These are guides, not templates.",
      "Use a realistic situation when fantasy would not help. Do not welcome every class to the same planet or spaceship.",
      age,
      "The adventure objective motivates the class. It is not a copy of the learning objective, and it is still about the same learning.",
      "narrativeArc needs a beginning, a goal, development, a discovery, application, a resolution, and a debrief. The beginning and the goal name the unsolved problem. Discovery names the key knowledge. Resolution comes after that knowledge has been used. The debrief names the key knowledge again. Do not change the lesson topic into story structure.",
      "characters are one to three temporary roles. Each has id, label, and visualRole. id is a short slug such as scientist or navigator. label is a job this lesson needs, such as someone who investigates, predicts, compares, or decides, named for this subject. visualRole describes a fictional illustrated character, never a real child. Roles are positive or neutral.",
      "Do not use a real pupil name. Adventures are replayed by other classes. Do not copy the teacher's request into the mission, the setting, or a character label.",
      "continuity records the setting, mission, discovered facts, important objects, and role ids so later scenes stay consistent.",
      "missionLabel is the child-facing mission, at most eight words, shown on the board. mission is the full objective and is not pasted as a paragraph on screen.",
      "JSON shape: { enabled: true, structure, title, premise, setting, tone, mission, missionLabel, characters: [{ id, label, visualRole }], narrativeArc: [{ beat, learning }], learningIntegration, ending, continuity: { setting, mission, discovered, objects, roles } }."
    ].join(" ");
    return { system: system, user: JSON.stringify(safe) };
  }

  function storyRepairBrief(ctx, issues, previous) {
    var brief = storyBrief(ctx, ctx && ctx.lessonPlan);
    brief.user = JSON.stringify({
      lesson: forModel(ctx),
      lessonPlan: (ctx && ctx.lessonPlan) || null,
      problems: issues || [],
      previous: previous || null,
      instruction: "Repair the internal story plan only. Keep it tied to the lesson plan. Do not write pupil activities. Return the full story JSON again."
    });
    return brief;
  }

  function storyFromPlan(plan, ctx) {
    plan = plan || {};
    ctx = ctx || {};
    var year = Number(yearDigit(ctx.yearGroup || plan.yearGroup)) || (ctx.yearAssumed ? 3 : 4);
    var knowledge = textList(plan.keyKnowledge, 180, 4);
    var objective = clean(plan.learningObjective, 240) || clean((ctx.learningObjectives || [])[0], 240);
    var topic = clean(plan.topic || ctx.topic, 120) || "the lesson";
    var subject = clean(plan.subject || ctx.subject, 40).toLowerCase();
    var structure = "investigation";
    if (year <= 2 || /math/.test(subject)) structure = "problem";
    else if (/histor/.test(subject)) structure = "investigation";
    else if (/english|writ/.test(subject)) structure = "creative";
    else if (/geograph/.test(subject)) structure = "journey";
    var mission = objective || ("Find out about " + topic);
    return {
      enabled: true,
      structure: structure,
      title: clean((plan.title || topic) + " mission", 80),
      premise: objective || topic,
      setting: topic,
      tone: year <= 2 ? "concrete" : (year >= 5 ? "reasoned" : "clear"),
      mission: mission,
      missionLabel: shortMission(mission, ""),
      characters: [{ id: "guide", label: "Guide", visualRole: "young fictional explorer" }],
      narrativeArc: [
        { beat: "beginning", learning: "The class can see the problem and does not know the explanation yet." },
        { beat: "goal", learning: mission },
        { beat: "development", learning: "The class looks more closely before the explanation." },
        { beat: "discovery", learning: knowledge.join(" ") || objective || topic },
        { beat: "application", learning: objective || topic },
        { beat: "resolution", learning: objective || topic },
        { beat: "debrief", learning: knowledge.join(" ") || objective || topic }
      ],
      learningIntegration: "Each scene teaches the next fact from the lesson plan, then the class uses it.",
      ending: "The situation settles because the class uses what it learned, and the class names the key facts.",
      continuity: {
        setting: topic,
        mission: mission,
        discovered: knowledge.slice(),
        objects: [],
        roles: ["guide"]
      },
      fallback: true
    };
  }

  function roleSlug(value) {
    return clean(value, 40).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16);
  }

  function unfairRole(label) {
    return /\b(villain|fool|idiot|stupid|culprit|failure)\b/i.test(String(label || ""));
  }

  function normaliseStory(raw, ctx) {
    ctx = ctx || {};
    var parsed = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, issues: ["The story plan was not valid structured data."] };
    if (parsed.storyPlan && typeof parsed.storyPlan === "object") parsed = parsed.storyPlan;
    var plan = ctx.lessonPlan || {};
    var issues = [];
    var mission = clean(parsed.mission || parsed.adventureObjective, 240);
    var setting = clean(parsed.setting, 160);
    var title = clean(parsed.title, 80);
    if (mission.length < 12) issues.push("The story plan needs a mission.");
    if (setting.length < 3) issues.push("The story plan needs a setting.");
    if (title.length < 3) issues.push("The story plan needs a title.");
    var beatAlias = {
      arrival: "beginning", hook: "beginning", start: "beginning",
      teach: "development", investigate: "development",
      escalation: "discovery", discover: "discovery",
      apply: "application", practice: "application",
      ending: "resolution", end: "resolution", complete: "resolution",
      recap: "debrief", remember: "debrief"
    };
    var allowedBeats = { beginning: 1, goal: 1, development: 1, discovery: 1, application: 1, resolution: 1, debrief: 1 };
    var arc = (Array.isArray(parsed.narrativeArc) ? parsed.narrativeArc : []).map(function (item) {
      item = item || {};
      var beat = clean(item.beat, 40).toLowerCase();
      beat = beatAlias[beat] || beat;
      if (!allowedBeats[beat]) return null;
      return { beat: beat, learning: clean(item.learning || item.knowledge, 180) };
    }).filter(function (item) { return item && item.learning; }).slice(0, 8);
    var seenBeat = {};
    arc.forEach(function (item) { seenBeat[item.beat] = 1; });
    if (!seenBeat.beginning) issues.push("The story plan needs a beginning.");
    if (!seenBeat.resolution && !seenBeat.debrief) issues.push("The story plan needs a resolution.");
    var characterIds = ["CHARACTER_A", "CHARACTER_B", "CHARACTER_C"];
    var characters = (Array.isArray(parsed.characters) ? parsed.characters : []).map(function (role) {
      role = role || {};
      var label = clean(role.label || role.role, 40);
      var id = roleSlug(role.id || label);
      if (!id || !label || unfairRole(label)) return null;
      return { id: id, label: label, visualRole: clean(role.visualRole, 80) || "young fictional explorer" };
    }).filter(Boolean).slice(0, 3);
    characters.forEach(function (role, index) { role.characterId = characterIds[index]; });
    var request = teacherRequest(ctx);
    characters.forEach(function (role) {
      if (request && role.label.toLowerCase().indexOf(request) !== -1) role.label = "Explorer";
    });
    if (!characters.length) characters = [{ id: "guide", label: "Guide", visualRole: "young fictional explorer", characterId: "CHARACTER_A" }];
    var knowledge = textList(plan.keyKnowledge, 180, 4).join(" ");
    var tieSource = words(knowledge + " " + (plan.learningObjective || "") + " " + (plan.topic || ctx.topic || ""));
    var arcText = (arc.map(function (item) { return item.learning; }).join(" ") + " " + mission + " " + clean(parsed.premise, 280)).toLowerCase();
    if (tieSource.length && !tieSource.some(function (word) { return arcText.indexOf(word) !== -1; })) {
      issues.push("The story plan is not about the lesson.");
    }
    if (issues.length) return { ok: false, issues: issues, previous: parsed };
    var structure = clean(parsed.structure, 40).toLowerCase() || "mission";
    var phrase = requestReplacement(request, plan.topic || ctx.topic || "");
    if (request.length >= 12) {
      mission = withoutRequest(mission, request, phrase);
      setting = withoutRequest(setting, request, phrase);
      title = withoutRequest(title, request, phrase);
    }
    return {
      ok: true,
      story: {
        enabled: true,
        structure: structure,
        title: title,
        premise: withoutRequest(clean(parsed.premise, 280) || mission, request, phrase),
        setting: setting,
        tone: clean(parsed.tone, 40) || "clear",
        mission: mission,
        missionLabel: shortMission(mission, parsed.missionLabel),
        characters: characters,
        narrativeArc: arc,
        learningIntegration: clean(parsed.learningIntegration, 240) || "Each scene teaches the next fact from the lesson plan.",
        ending: clean(parsed.ending, 240) || "The class uses what it learned and the situation settles.",
        continuity: {
          setting: setting,
          mission: mission,
          discovered: textList(parsed.continuity && parsed.continuity.discovered, 120, 6),
          objects: textList(parsed.continuity && parsed.continuity.objects, 40, 6),
          roles: characters.map(function (role) { return role.id; })
        },
        fallback: false
      }
    };
  }

  function textList(value, limit, count) {
    var source = Array.isArray(value) ? value : (value ? [value] : []);
    return source.map(function (item) { return clean(item, limit); }).filter(Boolean).slice(0, count || 4);
  }

  function reasonText(text) {
    return /\b(because|so that|in order to|due to|caused by|the reason|and then|which makes|which causes)\b/i.test(String(text || ""));
  }

  function knowledgeRole(text, labeled) {
    var allowed = { fact: 1, cause: 1, effect: 1, reason: 1, process: 1, definition: 1, comparison: 1, procedure: 1 };
    var label = clean(labeled, 20).toLowerCase();
    var size = clean(text).split(/\s+/).filter(Boolean).length;
    if (allowed[label] && (label === "cause" || label === "reason" || label === "process")) {
      if (size >= 6) return label;
    } else if (allowed[label]) return label;
    if (reasonText(text)) return "reason";
    if (/\b(difference|unlike|whereas)\b/i.test(text)) return "comparison";
    if (/\b(is|are|means|called)\b/i.test(text)) return "definition";
    if (size <= 8) return "effect";
    return "fact";
  }

  function knowledgeEntries(value) {
    var source = Array.isArray(value) ? value : (value ? [value] : []);
    return source.map(function (item) {
      if (item && typeof item === "object") {
        var text = clean(item.text || item.fact || item.knowledge, 180);
        return text ? { text: text, knowledgeType: knowledgeRole(text, item.knowledgeType || item.type) } : null;
      }
      var line = clean(item, 180);
      return line ? { text: line, knowledgeType: knowledgeRole(line, "") } : null;
    }).filter(Boolean).slice(0, 6);
  }

  function asksWhy(ctx) {
    var brief = (ctx && ctx.lessonBrief) || {};
    if (brief.intent === "why") return true;
    var focus = [ctx && ctx.topic, ctx && ctx.lessonText, brief.rawRequest].join(" ").toLowerCase();
    return /\bwhy\b|\bcauses?\b|\bhow\b[^.]{0,48}\bcauses?\b/.test(focus);
  }

  function normalisePlan(raw, ctx) {
    ctx = ctx || {};
    var parsed = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, issues: ["The lesson plan was not valid structured data."] };
    if (parsed.lessonPlan && typeof parsed.lessonPlan === "object") parsed = parsed.lessonPlan;
    var objective = clean(parsed.learningObjective || (Array.isArray(parsed.objectives) ? parsed.objectives[0] : parsed.objective) || "", 240);
    var entries = knowledgeEntries(parsed.keyKnowledge);
    var knowledge = entries.map(function (item) { return item.text; });
    var arc = (Array.isArray(parsed.lessonArc) ? parsed.lessonArc : []).map(function (stage) {
      stage = stage || {};
      return {
        purpose: clean(stage.purpose, 40).toLowerCase().replace(/\s+/g, "_"),
        learningRole: clean(stage.learningRole || stage.role || "", 180),
        concept: clean(stage.concept, 120)
      };
    }).filter(function (stage) { return stage.purpose || stage.concept; }).slice(0, 8);
    var issues = [];
    if (objective.length < 12) issues.push("The lesson plan needs a learning objective.");
    if (knowledge.length < 2) issues.push("The lesson plan needs the key knowledge.");
    if (asksWhy(Object.assign({}, ctx, { lessonPlan: { learningObjective: objective, topic: parsed.topic || ctx.topic } })) && !entries.some(function (item) {
      return item.knowledgeType === "cause" || item.knowledgeType === "reason" || item.knowledgeType === "process";
    })) {
      issues.push("The key knowledge states the outcome, not the reason.");
    }
    var purposes = arc.map(function (stage) { return stage.purpose; }).join(" ");
    if (!/teach|model|explain/.test(purposes)) issues.push("The lesson plan needs a teaching stage.");
    if (!/check|recap|apply|practice/.test(purposes)) issues.push("The lesson plan needs a check or a recap.");
    if (ctx.yearGroup && parsed.yearGroup && yearDigit(parsed.yearGroup) && yearDigit(parsed.yearGroup) !== yearDigit(ctx.yearGroup)) {
      issues.push("The plan changed the year group.");
    }
    if (issues.length) return { ok: false, issues: issues, previous: parsed };
    return {
      ok: true,
      plan: {
        title: clean(parsed.title, 80),
        subject: clean(parsed.subject || ctx.subject, 80),
        topic: clean(parsed.topic || ctx.topic, 120),
        yearGroup: clean(parsed.yearGroup || ctx.yearGroup || ctx.yearAssumption, 40),
        durationMinutes: Number(ctx.requestedMinutes) || Number(parsed.durationMinutes) || 0,
        learningObjective: objective,
        successCriteria: textList(parsed.successCriteria, 160, 4),
        priorKnowledge: textList(parsed.priorKnowledge, 160, 4),
        keyKnowledge: knowledge,
        knowledge: entries,
        vocabulary: textList(parsed.vocabulary, 40, 8),
        misconceptions: textList(parsed.misconceptions, 160, 4),
        teachingApproach: clean(parsed.teachingApproach, 400),
        narrativeTheme: clean(parsed.narrativeTheme, 120),
        lessonArc: contractArc(arc, knowledge)
      }
    };
  }

  function freshId(prefix) {
    var cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoObj && cryptoObj.randomUUID) return cryptoObj.randomUUID();
    return prefix + "_" + Math.random().toString(36).slice(2, 10);
  }

  function visualOf(raw) {
    if (!raw || typeof raw !== "object") return null;
    var objects = Array.isArray(raw.importantObjects) ? raw.importantObjects.map(function (item) {
      return clean(item, 40);
    }).filter(Boolean).slice(0, 6) : [];
    var visual = {
      useful: raw.useful !== false,
      concept: clean(raw.concept, 160),
      suggestedScene: clean(raw.suggestedScene, 200),
      importantObjects: objects,
      interactionIdea: clean(raw.interactionIdea, 200)
    };
    if (!visual.concept && !visual.suggestedScene) return null;
    return visual;
  }

  function textOf(value, max) {
    if (value && typeof value === "object") {
      return clean(value.text || value.label || value.choice || value.option || value.value || value.name || "", max);
    }
    return clean(value, max);
  }

  function sameChoice(left, right) {
    return clean(left, 80).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === clean(right, 80).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function matchChoice(correct, choices) {
    var wanted = clean(correct, 80);
    if (!wanted) return "";
    var i;
    for (i = 0; i < choices.length; i++) {
      if (choices[i] === wanted || sameChoice(choices[i], wanted)) return choices[i];
    }
    var letter = wanted.toLowerCase().match(/^([a-d])(?:\b|[.)])/);
    if (letter) {
      var index = letter[1].charCodeAt(0) - 97;
      if (choices[index]) return choices[index];
    }
    return "";
  }

  function questionOf(raw) {
    raw = raw || {};
    var kind = raw.kind === "boolean" || raw.kind === "true_false" ? "boolean" : "multiple";
    var prompt = clean(raw.prompt || raw.question || raw.text, 240);
    var explain = clean(raw.explain || raw.explanation || raw.reason || raw.rationale || raw.feedback || raw.why, 240);
    var choices;
    var correct;
    var given = raw.correct != null ? raw.correct : (raw.correctAnswer != null ? raw.correctAnswer : (raw.correctOption != null ? raw.correctOption : raw.answer));
    if (kind === "boolean") {
      choices = ["True", "False"];
      var flag = String(given == null ? "" : given).toLowerCase();
      correct = flag === "false" || flag === "f" || flag === "no" ? "false" : (flag === "true" || flag === "t" || flag === "yes" ? "true" : "");
    } else {
      choices = (raw.choices || raw.options || []).map(function (choice) {
        return textOf(choice, 80);
      }).filter(Boolean).slice(0, 4);
      correct = matchChoice(textOf(given, 80) || given, choices);
    }
    return {
      prompt: prompt,
      choices: choices,
      correct: correct,
      explain: explain,
      kind: kind,
      knowledgeChecked: clean(raw.knowledgeChecked, 180),
      successEvidence: clean(raw.successEvidence, 180),
      teachingConnection: clean(raw.teachingConnection, 180)
    };
  }

  function playableMechanic(raw) {
    raw = raw || {};
    var mechanic = String(raw.mechanic || "").toLowerCase().replace(/-/g, "_");
    if (mechanic === "question" || mechanic === "true_false" || mechanic === "multiple_choice" || mechanic === "mcq" || mechanic === "check" || mechanic === "assessment") return "quiz";
    if (mechanic === "remember" || mechanic === "fact" || mechanic === "recall" || mechanic === "recap") return "mystery";
    if (mechanic === "choose" || mechanic === "choose_one" || mechanic === "pick") return "doors";
    if (mechanic === "guided_practice" || mechanic === "practice" || mechanic === "model" || mechanic === "explain" || mechanic === "teach" || mechanic === "hook" || mechanic === "introduction" || mechanic === "demo") {
      var config = raw.config && typeof raw.config === "object" ? raw.config : {};
      if ((config.questions && config.questions.length) || (config.prompt && config.choices)) return "quiz";
      if (config.words && config.words.length) return "word_search";
      return "story";
    }
    return mechanic;
  }

  function activityFrom(raw, allowed) {
    raw = raw || {};
    var mechanic = playableMechanic(raw);
    if (allowed.indexOf(mechanic) === -1 || MECHANICS.indexOf(mechanic) === -1) return null;
    var activity = {
      id: freshId(mechanic),
      mechanic: mechanic,
      purpose: clean(raw.purpose, 80) || mechanic,
      title: clean(raw.title, 80) || mechanic,
      minutes: Math.max(1, Math.min(12, Math.round(Number(raw.minutes) || 0) || 1)),
      why: clean(raw.why, 180),
      config: {}
    };
    if (raw.slotId) activity.slotId = clean(raw.slotId, 24);
    if (raw.participantSelection && typeof raw.participantSelection === "object") {
      var mode = clean(raw.participantSelection.mode, 20);
      activity.participantSelection = { mode: mode === "random" || mode === "named-role" || mode === "teacher-choice" || mode === "whole-class" ? mode : "whole-class" };
    }
    if (raw.learningInteraction && raw.learningInteraction.type) activity.learningInteraction = { type: clean(raw.learningInteraction.type, 40) };
    if (raw.applyInstruction) activity.applyInstruction = clean(raw.applyInstruction, 180);
    if (raw.knowledgeUsed) activity.knowledgeUsed = clean(raw.knowledgeUsed, 180);
    if (raw.successCondition) activity.successCondition = clean(raw.successCondition, 180);
    if (raw.teachingConnection) activity.teachingConnection = clean(raw.teachingConnection, 180);
    var visual = visualOf(raw.visualContext);
    if (visual) activity.visualContext = visual;
    if (mechanic === "quiz") {
      var config = raw.config && typeof raw.config === "object" ? raw.config : {};
      if ((!config.questions || !config.questions.length) && Array.isArray(raw.questions)) config = Object.assign({}, config, { questions: raw.questions });
      var specs = (config.questions && config.questions.length ? config.questions : [config]).map(questionOf);
      specs = specs.filter(function (item) { return item.prompt; });
      if (!specs.length) specs = [questionOf(config)];
      var part = PARTICIPATION.indexOf(config.participation) === -1 ? "whole_class" : config.participation;
      activity.config = {
        kind: specs[0].kind,
        prompt: specs[0].prompt,
        choices: specs[0].choices.slice(),
        correct: specs[0].correct,
        explain: specs[0].explain,
        knowledgeChecked: specs[0].knowledgeChecked,
        successEvidence: specs[0].successEvidence,
        teachingConnection: specs[0].teachingConnection,
        points: Math.max(0, Math.min(5, Number(config.points == null ? 1 : config.points) || 0)),
        participation: part,
        askSelected: part === "selected_pupil",
        questions: specs
      };
      activity.minutes = Math.max(activity.minutes, Math.max(2, specs.length));
    } else if (mechanic === "word_search") {
      var search = raw.config || {};
      var list = (search.words || []).map(function (word) {
        return clean(word, 20).toUpperCase().replace(/[^A-Z]/g, "");
      }).filter(function (word) { return word.length >= 3 && word.length <= 14; });
      activity.config = {
        title: activity.title,
        instruction: clean(search.instruction, 120) || "Find the words from this lesson.",
        words: list.slice(0, 12),
        points: 1,
        participation: search.participation === "team_turn" ? "team_turn" : "whole_class"
      };
      activity.minutes = Math.max(3, Math.min(activity.minutes, 8));
    } else if (mechanic === "spin") {
      activity.minutes = 1;
      var ask = clean((raw.config && (raw.config.prompt || raw.config.question)) || raw.why || raw.prompt, 180);
      var spinConfig = raw.config && typeof raw.config === "object" ? raw.config : {};
      activity.config = {
        pool: "included",
        avoidRepeat: true,
        preferFresh: true,
        prompt: ask,
        role: clean(spinConfig.role, 40),
        reveal: clean(spinConfig.reveal || spinConfig.explain, 180)
      };
      if (ask) activity.why = ask;
    } else if (mechanic === "doors") {
      var door = raw.config && typeof raw.config === "object" ? raw.config : {};
      var rawChoices = door.choices && door.choices.length ? door.choices : (door.options && door.options.length ? door.options : (door.lines || []));
      var choices = [];
      var reveals = (door.reveals || []).map(function (line) { return textOf(line, 180); });
      rawChoices.forEach(function (item, index) {
        var label = textOf(item, 80);
        if (!label) return;
        choices.push(label);
        if (!reveals[index] && item && typeof item === "object") reveals[index] = clean(item.reveal || item.explanation || item.outcome || "", 180);
      });
      choices = choices.slice(0, 3);
      reveals = reveals.filter(Boolean).slice(0, 3);
      activity.config = { prompt: clean(door.prompt || door.question || raw.prompt, 160), choices: choices, lines: choices.slice(), reveals: reveals };
      activity.minutes = Math.max(2, Math.min(activity.minutes, 4));
    } else {
      var reading = raw.config && typeof raw.config === "object" ? raw.config : {};
      var lineSource = Array.isArray(reading.lines) ? reading.lines : (Array.isArray(reading.fact) ? reading.fact : (Array.isArray(raw.lines) ? raw.lines : []));
      if (!lineSource.length && typeof reading.lines === "string") lineSource = [reading.lines];
      var lines = lineSource.map(function (line) { return textOf(line, 280); }).filter(Boolean).slice(0, 6);
      var sceneAction = raw.scene && typeof raw.scene === "object" ? (raw.scene.action || (raw.scene.visualBrief && raw.scene.visualBrief.action) || "") : "";
      var spoken = lines.join(" ");
      if (spoken.split(/\s+/).filter(Boolean).length < 6) {
        var fact = clean(reading.fact || reading.text || reading.narration || reading.script || reading.body || reading.story || raw.text || raw.narration || raw.why || raw.prompt || sceneAction || "", 280);
        if (fact.split(/\s+/).filter(Boolean).length >= 6) lines = [fact];
      }
      activity.config = { lines: lines };
      activity.minutes = Math.max(2, Math.min(activity.minutes, 6));
    }
    var sceneInput = raw.scene && typeof raw.scene === "object" ? Object.assign({}, raw.scene) : {};
    if (!sceneInput.beat && raw.beat) sceneInput.beat = raw.beat;
    if (!sceneInput.kind && raw.kind) sceneInput.kind = raw.kind;
    var scene = sceneOf(sceneInput);
    if (scene) activity.scene = scene;
    return activity;
  }

  function sceneOf(raw) {
    if (!raw || typeof raw !== "object") return null;
    var beats = { beginning: 1, goal: 1, development: 1, discovery: 1, application: 1, resolution: 1, debrief: 1 };
    var kinds = { arrival: 1, teach: 1, role: 1, decision: 1, discovery: 1, challenge: 1, resolution: 1, debrief: 1 };
    var beatAlias = {
      arrival: "beginning", hook: "beginning", start: "beginning",
      teach: "development", investigate: "development", decision: "development",
      escalation: "discovery", discover: "discovery",
      apply: "application", practice: "application",
      ending: "resolution", end: "resolution", complete: "resolution",
      resolve: "resolution", resolved: "resolution", conclusion: "resolution", finale: "resolution", settled: "resolution", wrapup: "resolution", "wrap-up": "resolution",
      recap: "debrief", remember: "debrief"
    };
    var beat = beatAlias[clean(raw.beat, 40).toLowerCase()] || clean(raw.beat, 40).toLowerCase();
    var kind = clean(raw.kind, 40).toLowerCase();
    if (clean(raw.beat, 40).toLowerCase() === "decision") kind = kind || "decision";
    var brief = raw.visualBrief && typeof raw.visualBrief === "object" ? raw.visualBrief : null;
    var scene = {};
    if (beats[beat]) scene.beat = beat;
    if (kinds[kind]) scene.kind = kind;
    var roleId = roleSlug(raw.roleId || "");
    if (roleId) scene.roleId = roleId;
    if (brief) {
      scene.visualBrief = {
        sceneType: clean(brief.sceneType, 40),
        setting: clean(brief.setting, 160),
        subjects: textList(brief.subjects, 80, 4),
        action: clean(brief.action, 180),
        importantObjects: textList(brief.importantObjects, 40, 6),
        educationalFocus: clean(brief.educationalFocus, 160),
        mood: clean(brief.mood, 40)
      };
    }
    var effect = cleanEffect(raw.worldEffect);
    if (effect) scene.worldEffect = effect;
    var interaction = cleanInteraction(raw.interaction);
    if (interaction) scene.interaction = interaction;
    if (Array.isArray(raw.interactions)) {
      var steps = raw.interactions.map(cleanInteraction).filter(Boolean);
      if (steps.length) scene.interactions = steps;
    }
    return Object.keys(scene).length ? scene : null;
  }

  function ensureScenes(activities, story) {
    (activities || []).forEach(function (activity) {
      var scene = activity.scene && typeof activity.scene === "object" ? activity.scene : {};
      if (!scene.visualBrief) {
        scene.visualBrief = {
          sceneType: activity.mechanic || "story",
          setting: (story && story.setting) || "",
          subjects: ["fictional guide"],
          action: clean(activity.purpose, 120),
          importantObjects: (story && story.continuity && story.continuity.objects) || [],
          educationalFocus: clean(activity.why || activity.purpose, 160),
          mood: (story && story.tone) || "clear"
        };
      }
      activity.scene = scene;
    });
    return activities;
  }

  function alignRoles(activities, story) {
    var characters = (story && story.characters) || [];
    if (!characters.length) return;
    (activities || []).forEach(function (activity) {
      if (!activity || activity.mechanic !== "spin" || !activity.config) return;
      var label = clean(activity.config.role).toLowerCase();
      var roleId = activity.scene && activity.scene.roleId;
      var known = characters.some(function (item) {
        var name = clean(item.label).toLowerCase();
        return item.id === roleId || (label && name && (name === label || label.indexOf(name) !== -1 || name.indexOf(label) !== -1));
      });
      if (activity.config.role && !known) {
        activity.config.role = characters[0].label;
        activity.scene = activity.scene || {};
        activity.scene.roleId = characters[0].id;
      }
    });
  }

  function repairShallowChoices(activities, plan, ctx) {
    var pool = ((plan && plan.misconceptions) || []).map(function (item) { return clean(item, 90); }).filter(Boolean);
    if (!pool.length) return;
    var factBag = (((plan && plan.keyKnowledge) || []).join(" ") + " " + ((plan && plan.misconceptions) || []).join(" ")).toLowerCase();
    var used = 0;
    function nextIdea(correct) {
      var idea = pool[used % pool.length];
      used += 1;
      if (clean(idea) === clean(correct)) {
        idea = pool[used % pool.length];
        used += 1;
      }
      return idea;
    }
    function fix(item) {
      if (!item || !Array.isArray(item.choices)) return;
      item.choices = item.choices.map(function (choice) {
        if (choice === item.correct) return choice;
        var lower = clean(choice).toLowerCase();
        var weather = /\b(it rains|the sun shines|sunny days?|at night only|only at night|night only)\b/.test(lower);
        if (weather || unrelatedChoice(choice, factBag)) return nextIdea(item.correct);
        return choice;
      });
    }
    (activities || []).forEach(function (activity) {
      if (!activity || activity.mechanic !== "quiz" || !activity.config) return;
      if (ctx && !causalRequest(Object.assign({}, ctx, { lessonPlan: plan || ctx.lessonPlan }))) return;
      fix(activity.config);
      (activity.config.questions || []).forEach(fix);
    });
  }

  function repairJokeChoices(activities, plan) {
    var pool = ((plan && plan.misconceptions) || []).map(function (item) { return clean(item, 80); }).filter(function (item) {
      return item && !jokeChoice(item);
    });
    var used = 0;
    function fix(item) {
      if (!item || !Array.isArray(item.choices)) return;
      item.choices = item.choices.map(function (choice) {
        if (!jokeChoice(choice) || choice === item.correct) return choice;
        var next = pool[used] || ("A related idea that does not explain this");
        used += 1;
        return next;
      });
    }
    (activities || []).forEach(function (activity) {
      if (!activity || activity.mechanic !== "quiz" || !activity.config) return;
      fix(activity.config);
      (activity.config.questions || []).forEach(fix);
    });
  }

  function markSpokenResolution(activities) {
    (activities || []).forEach(function (activity) {
      if (activity.scene && activity.scene.beat === "resolution") return;
      var label = ((activity.title || "") + " " + (activity.purpose || "") + " " + ((activity.scene && activity.scene.kind) || "")).toLowerCase();
      if (/\b(resolution|resolve|resolves|resolved|mission settles|mission is settled|how it ends)\b/.test(label)) {
        activity.scene = activity.scene || {};
        activity.scene.beat = "resolution";
        if (!activity.scene.kind) activity.scene.kind = "resolution";
      }
    });
  }

  function placeResolution(activities, story, plan) {
    story = story || {};
    plan = plan || {};
    var ending = clean(story.ending, 240);
    var mission = clean(story.mission, 200);
    var knowledge = clean((plan.keyKnowledge || [])[0], 180);
    var line = ending;
    if (knowledge && line.toLowerCase().indexOf(knowledge.toLowerCase().slice(0, 24)) === -1) line = clean(line + " " + knowledge, 280);
    if (line.split(/\s+/).filter(Boolean).length < 12) line = clean(line + " " + mission, 280);
    if (line.split(/\s+/).filter(Boolean).length < 12) return activities;
    var activity = {
      id: freshId("story"),
      mechanic: "story",
      purpose: "Resolve the mission",
      title: "The mission settles",
      minutes: 2,
      why: mission || ending,
      scene: {
        beat: "resolution",
        kind: "resolution",
        visualBrief: {
          sceneType: "story",
          setting: story.setting || "",
          subjects: ["fictional guide"],
          action: line,
          importantObjects: (story.continuity && story.continuity.objects) || [],
          educationalFocus: mission || ending,
          mood: story.tone || "clear"
        }
      },
      config: { lines: [line] }
    };
    var at = activities.length;
    activities.forEach(function (item, index) {
      if (item.mechanic === "mystery" || (item.scene && item.scene.beat === "debrief")) at = index;
    });
    activities.splice(at, 0, activity);
    var donor = null;
    activities.forEach(function (item) {
      if (item === activity) return;
      if (!donor || item.minutes > donor.minutes) donor = item;
    });
    if (donor && donor.minutes > 2) donor.minutes -= 2;
    return activities;
  }

  function mechanismText(text) {
    return /\b(plates?|pieces?|stuck|push(?:es|ing)?|pull(?:s|ing)?|energy|crust|fault|charges?|clouds?|spark)\b|\bmov(?:e|es|ing|ement)\b/i.test(String(text || ""));
  }

  function endingScene(activity) {
    var beat = activity && activity.scene && activity.scene.beat;
    return beat === "resolution" || beat === "debrief" || (activity && activity.mechanic === "mystery");
  }

  function orderJourney(activities) {
    var body = [];
    var resolution = [];
    var debrief = [];
    (activities || []).forEach(function (activity) {
      var beat = activity.scene && activity.scene.beat;
      if (activity.mechanic === "mystery" || beat === "debrief") debrief.push(activity);
      else if (beat === "resolution") resolution.push(activity);
      else body.push(activity);
    });
    return body.concat(resolution, debrief);
  }

  function journeyOrderIssue(activities) {
    var seenCheck = false;
    var seenResolution = false;
    var bad = false;
    (activities || []).forEach(function (activity) {
      var beat = activity.scene && activity.scene.beat;
      var ending = beat === "resolution" || activity.mechanic === "mystery" || beat === "debrief";
      if (seenResolution && !ending) bad = true;
      if ((activity.mechanic === "mystery" || beat === "debrief") && !seenResolution && (activities || []).some(function (item) { return item.scene && item.scene.beat === "resolution"; })) bad = true;
      if (activity.mechanic === "quiz") seenCheck = true;
      if (beat === "resolution") {
        if (!seenCheck && (activities || []).some(function (item) { return item.mechanic === "quiz"; })) bad = true;
        seenResolution = true;
      }
    });
    return bad;
  }

  function pupilTask(role, index) {
    var label = (role && role.label) || "Explorer";
    if (index === 1) return "What do you think will happen next?";
    if (index >= 2) return "Which of these should we check first?";
    return "You're our " + label + ". Which part should we investigate?";
  }

  function pupilAction(index) {
    return ["inspect", "predict", "choose"][index] || "inspect";
  }

  function spareMinutes(activities, amount) {
    var donor = null;
    (activities || []).forEach(function (item) {
      if (!item || item.mechanic === "spin") return;
      if (!donor || item.minutes > donor.minutes) donor = item;
    });
    if (donor && donor.minutes - amount >= 1) {
      donor.minutes -= amount;
      return amount;
    }
    if (donor && donor.minutes > 1) {
      var take = donor.minutes - 1;
      donor.minutes = 1;
      return take;
    }
    return 1;
  }

  function placePupilTurn(activities, story, ctx) {
    if (!ctx || Number(ctx.pupilCount) < 2) return activities;
    if ((activities || []).some(function (activity) { return activity.mechanic === "doors"; })) return activities;
    var ids = ["CHARACTER_A", "CHARACTER_B", "CHARACTER_C"];
    var roles = ((story && story.characters) || []).slice(0, 3);
    if (!roles.length) roles = [{ id: "explorer", label: "Explorer", characterId: "CHARACTER_A" }];
    roles.forEach(function (role, index) { if (role && !role.characterId) role.characterId = ids[index]; });
    var limit = Math.min(roles.length, Number(ctx.pupilCount) >= 4 ? 3 : 2);
    var spins = (activities || []).filter(function (activity) { return activity.mechanic === "spin"; });
    spins.forEach(function (activity, index) {
      if (index >= limit || !roles[index]) return;
      var role = roles[index];
      activity.config = activity.config || {};
      if (!activity.config.role) activity.config.role = role.label || "Explorer";
      if (!activity.config.prompt || bareSpin(activity.config.prompt)) activity.config.prompt = pupilTask(role, index);
      activity.scene = activity.scene || {};
      if (!activity.scene.roleId) activity.scene.roleId = role.id || "";
      if (!activity.scene.characterId) activity.scene.characterId = role.characterId;
      if (!activity.scene.visualAction) activity.scene.visualAction = { type: pupilAction(index) };
    });
    return activities;
  }

  function needsCause(ctx) {
    var plan = (ctx && ctx.lessonPlan) || {};
    var focus = [ctx && ctx.topic, ctx && ctx.lessonText, plan.learningObjective, plan.topic].join(" ").toLowerCase();
    return /\bcauses?\b|\bforms?\b|\bearthquake|\blightning/.test(focus);
  }

  function effectAnswer(text) {
    var value = clean(text);
    return !!(value && !mechanismText(value) && /\b(shake|shakes|shaking)\b/i.test(value));
  }

  function causeSentence(list) {
    var found = "";
    (list || []).forEach(function (item) {
      var sentence = clean(item, 90);
      if (!found && mechanismText(sentence) && !effectAnswer(sentence)) found = sentence;
    });
    return found;
  }

  function repairEffectAnswer(activities, ctx) {
    if (!needsCause(ctx) && !asksWhy(ctx)) return;
    var taught = [];
    var knowledge = ((ctx && ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).slice();
    var passedQuiz = false;
    (activities || []).forEach(function (activity) {
      if (!activity || activity.mechanic !== "quiz" || !activity.config) {
        if (!passedQuiz && activity && activity.mechanic === "story" && !endingScene(activity)) {
          taught = taught.concat((activity.config && activity.config.lines) || []);
        }
        return;
      }
      passedQuiz = true;
      var items = activity.config.questions && activity.config.questions.length ? activity.config.questions : [activity.config];
      items.forEach(function (item) {
        var needsSwap = effectAnswer(item.correct) || (whyPrompt(item.prompt) && causeBits(ctx).length && !sharesCause(item.correct, ctx));
        if (!item || !needsSwap) return;
        var cause = "";
        (item.choices || []).forEach(function (choice) {
          if (!cause && choice !== item.correct && sharesCause(choice, ctx)) cause = choice;
        });
        if (!cause) (item.choices || []).forEach(function (choice) {
          if (!cause && mechanismText(choice) && !effectAnswer(choice)) cause = choice;
        });
        if (!cause) cause = causeSentence(taught);
        if (!cause) cause = causeSentence(knowledge);
        if (!cause) return;
        var previous = item.correct;
        item.correct = cause;
        if (!Array.isArray(item.choices)) item.choices = [];
        if (item.choices.indexOf(cause) === -1) {
          var swapped = false;
          item.choices = item.choices.map(function (choice) {
            if (!swapped && choice === previous) {
              swapped = true;
              return cause;
            }
            return choice;
          });
          if (!swapped) item.choices.push(cause);
        }
        if (!mechanismText(item.explain)) {
          var reason = "The cause is " + String(cause).replace(/[.]+$/, "") + ".";
          if (reason.split(/\s+/).filter(Boolean).length < 6) reason += " That is what makes it happen.";
          item.explain = clean(reason, 180);
        }
      });
      var first = items[0];
      if (first && first !== activity.config) {
        activity.config.correct = first.correct;
        activity.config.choices = (first.choices || []).slice();
        activity.config.explain = first.explain;
      }
    });
  }

  function causeBits(ctx) {
    var plan = (ctx && ctx.lessonPlan) || {};
    var entries = plan.knowledge && plan.knowledge.length ? plan.knowledge : knowledgeEntries(plan.keyKnowledge);
    var reasons = entries.filter(function (item) {
      return item.knowledgeType === "cause" || item.knowledgeType === "reason" || item.knowledgeType === "process";
    });
    return words(reasons.map(function (item) { return item.text; }).join(" ")).filter(function (word) {
      return word.length > 3;
    });
  }

  function sharesCause(text, ctx) {
    var value = clean(text).toLowerCase();
    return causeBits(ctx).some(function (word) { return value.indexOf(word) !== -1; });
  }

  function whyPrompt(text) {
    return /\bwhy\b|\bwhat causes\b|\bwhat caused\b|\bwhat makes\b/i.test(clean(text));
  }

  function causeAlignment(activities, ctx) {
    if (!needsCause(ctx) && !asksWhy(ctx)) return [];
    var issues = [];
    var before = [];
    var asked = false;
    var bits = causeBits(ctx);
    (activities || []).forEach(function (activity) {
      if (activity.mechanic === "quiz") {
        asked = true;
        ((activity.config && activity.config.questions) || [activity.config || {}]).forEach(function (item) {
          var prompt = clean(item && item.prompt).toLowerCase();
          if (whyPrompt(prompt) && /what happens during|what do we see during/.test(prompt)) {
            issues.push("The check asks what happens, not the cause.");
          }
          if (item && whyPrompt(prompt) && item.correct && bits.length && !sharesCause(item.correct, ctx)) {
            issues.push("The correct answer is the effect, not the cause.");
          }
        });
        return;
      }
      if (!asked && activity.mechanic === "story" && !endingScene(activity)) before.push(((activity.config && activity.config.lines) || []).join(" "));
    });
    if (asked && bits.length >= 2) {
      var taught = bits.filter(function (word) { return before.join(" ").toLowerCase().indexOf(word) !== -1; }).length;
      if (taught < 2) issues.push("The cause is not taught before the question.");
    }
    return issues;
  }

  function teachingLine(line) {
    var text = clean(line).toLowerCase();
    var count = text.split(/\s+/).filter(Boolean).length;
    if (count < 8) return false;
    if (/^welcome\b|today,? we will learn|this story will|help students|successfully completes/.test(text)) return false;
    return true;
  }

  function teachingTurn(line) {
    var text = clean(line);
    var count = text.split(/\s+/).filter(Boolean).length;
    if (count < 4) return false;
    if (/^welcome\b|today,? we will learn|this story will|help students|successfully completes/i.test(text)) return false;
    return true;
  }

  function participationTurns(activity, slot) {
    var config = (activity && activity.config) || {};
    var lines = (config.lines || []).filter(teachingTurn);
    var instruction = applyInstructionOf(activity);
    var id = slot && slot.id;
    if (id === "hook" || id === "resolution" || id === "recap") return lines.length ? 1 : 0;
    if (id === "investigate") return instruction || lines.length ? 1 : 0;
    if (id === "teach") return lines.length;
    if (id === "apply") return instruction || lines.length ? 1 : 0;
    if (id === "check") {
      var questions = config.questions || [];
      return questions.some(function (item) { return item && clean(item.prompt); }) ? 1 : 0;
    }
    return lines.length ? 1 : 0;
  }

  function participationIssues(activities, skeleton) {
    var issues = [];
    (skeleton || []).forEach(function (slot) {
      var activity = null;
      (activities || []).forEach(function (item) {
        if (item.slotId === slot.id) activity = item;
      });
      if (!activity) return;
      if (participationTurns(activity, slot) < (slot.minimumParticipation || 1)) {
        issues.push("The " + slot.id + " slot does not have enough participation for its time.");
      }
    });
    return issues;
  }

  function substanceIssues(activities, ctx) {
    if (ctx && ctx.lessonSkeleton) return participationIssues(activities, ctx.lessonSkeleton);
    var target = Number(ctx && ctx.requestedMinutes) || 15;
    if (target < 12) return [];
    var taught = 0;
    var seenCheck = false;
    (activities || []).forEach(function (activity) {
      if (activity.mechanic === "quiz") seenCheck = true;
      if (seenCheck || endingScene(activity) || activity.mechanic === "spin") return;
      ((activity.config && activity.config.lines) || []).forEach(function (line) {
        if (teachingLine(line)) taught += 1;
      });
    });
    if (taught < 2) return ["The lesson does not contain enough teaching and participation for the requested time."];
    return [];
  }

  function knowledgeHits(activity, knowledge) {
    var config = activity && activity.config || {};
    var text = ((config.lines || []).join(" ") + " " + (config.prompt || "") + " " + (config.explain || "")).toLowerCase();
    return knowledge.filter(function (word) { return text.indexOf(word) !== -1; }).length;
  }

  function placeTeaching(activities, plan, ctx) {
    if (ctx && !causalRequest(Object.assign({}, ctx, { lessonPlan: plan || ctx.lessonPlan }))) return activities;
    var knowledge = words(((plan && plan.keyKnowledge) || []).join(" ")).filter(function (word) { return word.length > 4; });
    if (knowledge.length < 2) return activities;
    var quizAt = -1;
    (activities || []).forEach(function (activity, index) {
      var points = activity.config && activity.config.points;
      if (quizAt < 0 && activity.mechanic === "quiz" && Number(points) !== 0) quizAt = index;
    });
    if (quizAt < 0) return activities;
    var taught = false;
    activities.forEach(function (activity, index) {
      if (index === 0 || index >= quizAt || activity.mechanic !== "story" || endingScene(activity)) return;
      if (knowledgeHits(activity, knowledge) >= 2 && mechanismText(((activity.config && activity.config.lines) || []).join(" "))) taught = true;
    });
    if (taught) return activities;
    var moved = false;
    activities.forEach(function (activity, index) {
      if (moved || index <= quizAt || activity.mechanic !== "story" || endingScene(activity)) return;
      if (knowledgeHits(activity, knowledge) < 2 || !mechanismText(((activity.config && activity.config.lines) || []).join(" "))) return;
      activities.splice(index, 1);
      activities.splice(quizAt, 0, activity);
      moved = true;
    });
    if (moved) return activities;
    var lines = ((plan && plan.keyKnowledge) || []).map(function (item) { return clean(item, 180); }).filter(Boolean).slice(0, 4);
    if (!lines.length) return activities;
    activities.splice(quizAt, 0, {
      id: freshId("story"),
      mechanic: "story",
      purpose: "Teach the idea before the check",
      title: "Look more closely",
      minutes: 3,
      why: lines[0],
      scene: { beat: "discovery", kind: "teach" },
      config: { lines: lines }
    });
    var donor = null;
    activities.forEach(function (item, index) {
      if (index === quizAt) return;
      if (!donor || item.minutes > donor.minutes) donor = item;
    });
    if (donor && donor.minutes > 3) donor.minutes -= 2;
    return activities;
  }

  function placeDebrief(activities, plan) {
    var has = (activities || []).some(function (activity) {
      return activity.mechanic === "mystery" || (activity.scene && activity.scene.beat === "debrief");
    });
    if (has) return activities;
    var lines = ((plan && plan.keyKnowledge) || []).map(function (item) { return clean(item, 180); }).filter(Boolean).slice(0, 4);
    if (!lines.length) return activities;
    activities.push({
      id: freshId("mystery"),
      mechanic: "mystery",
      purpose: "State what the class discovered",
      title: "You discovered",
      minutes: 2,
      why: lines[0],
      scene: { beat: "debrief", kind: "debrief" },
      config: { lines: lines }
    });
    var donor = null;
    activities.forEach(function (item) {
      if (item.mechanic === "mystery") return;
      if (!donor || item.minutes > donor.minutes) donor = item;
    });
    if (donor && donor.minutes > 2) donor.minutes -= 2;
    return activities;
  }

  function bareSpin(text) {
    var value = clean(text).toLowerCase();
    if (!value || value.length < 12) return true;
    if (value === "spin for a pupil." || value === "spin for a pupil" || value === "spin for someone who is here.") return true;
    return /^you'?re up[.!]?$/.test(value);
  }

  function shortMission(mission, provided) {
    var given = clean(provided, 90);
    var givenWords = given.split(/\s+/).filter(Boolean);
    if (givenWords.length >= 3 && givenWords.length <= 8) return given.replace(/[.!?]+$/, "");
    var sentence = clean(mission, 200).split(/[.!?]/)[0];
    var words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= 8) return sentence;
    return words.slice(0, 8).join(" ");
  }

  var WORLD_EFFECTS = { shake: 1, rumble: 1, pulse: 1, glow: 1, highlight: 1, zoom: 1, pan: 1, reveal: 1, crack: 1, "move-object": 1, "vibrate-object": 1, fade: 1, particles: 1, flash: 1, "sound-cue": 1 };
  var WORLD_INTERACTIONS = { hotspot: 1, "tap-to-reveal": 1, choose: 1, drag: 1, move: 1, sort: 1, sequence: 1, match: 1, predict: 1, inspect: 1, compare: 1, "class-vote": 1 };

  function cleanEffect(raw) {
    if (!raw || typeof raw !== "object" || !WORLD_EFFECTS[raw.type]) return null;
    var purpose = clean(raw.educationalPurpose, 180);
    if (purpose.length < 8) return null;
    var duration = Number(raw.duration);
    return {
      type: raw.type,
      target: clean(raw.target, 40) || "world",
      trigger: raw.trigger === "on-success" || raw.trigger === "on-action" ? raw.trigger : "on-enter",
      intensity: raw.intensity === "medium" || raw.intensity === "strong" ? raw.intensity : "subtle",
      duration: duration >= 400 && duration <= 4000 ? duration : 1400,
      educationalPurpose: purpose
    };
  }

  function cleanInteraction(raw) {
    if (!raw || typeof raw !== "object" || !WORLD_INTERACTIONS[raw.type]) return null;
    var instruction = clean(raw.instruction, 120);
    if (instruction.length < 4) return null;
    return {
      type: raw.type,
      target: clean(raw.target, 40) || "world",
      instruction: instruction,
      successCondition: clean(raw.successCondition, 40) || "done",
      responseEffect: cleanEffect(raw.responseEffect),
      teachingReveal: clean(raw.teachingReveal, 220)
    };
  }

  function effectForText(text) {
    var blob = String(text || "").toLowerCase();
    if (/\b(shake|shakes|shaking|tremor)\b/.test(blob)) return "shake";
    if (/\blightning\b|\bflash\b/.test(blob)) return "flash";
    if (/\brumble\b|\berupt/.test(blob)) return "rumble";
    if (/\bglow\b|\bmagma\b/.test(blob)) return "glow";
    return "";
  }

  function lessonPhenomenon(activities, ctx) {
    var bits = [];
    (activities || []).forEach(function (activity) {
      var config = activity.config || {};
      bits.push((config.lines || []).join(" "), config.explain || "", config.prompt || "");
    });
    var plan = (ctx && ctx.lessonPlan) || {};
    bits.push((plan.keyKnowledge || []).join(" "), plan.learningObjective || "");
    return bits.join(" ");
  }

  function teachingStories(activities) {
    var list = [];
    var asked = false;
    (activities || []).forEach(function (activity) {
      if (activity.mechanic === "quiz") asked = true;
      if (asked || activity.mechanic !== "story" || endingScene(activity)) return;
      list.push(activity);
    });
    return list;
  }

  function mechanismLines(activities) {
    var lines = [];
    (activities || []).forEach(function (activity) {
      ((activity.config && activity.config.lines) || []).forEach(function (line) {
        if (teachingLine(line) && mechanismText(line)) lines.push(clean(line, 220));
      });
    });
    return lines;
  }

  function tuneShots(activities) {
    (activities || []).forEach(function (activity) {
      var scene = activity.scene;
      if (!scene) return;
      var beat = scene.beat;
      var hint = beat === "beginning" ? "Wide arrival of the whole place. Characters small. Not a close-up."
        : (beat === "discovery" || beat === "development" ? "Closer cutaway of the idea being taught. Different camera from the arrival."
          : (beat === "resolution" ? "A new composition back at the exploration base. Not the arrival camera and not the cutaway." : ""));
      if (!hint) return;
      var brief = scene.visualBrief || {
        sceneType: activity.mechanic || "story",
        setting: "",
        subjects: [],
        action: "",
        importantObjects: [],
        educationalFocus: "",
        mood: ""
      };
      scene.visualBrief = brief;
      if (String(brief.action || "").indexOf(hint) === -1) brief.action = clean((brief.action ? brief.action + " " : "") + hint, 360);
    });
  }

  function ensureLivingWorld(activities, ctx) {
    (activities || []).forEach(function (activity) {
      var scene = activity.scene;
      if (!scene) return;
      if (scene.worldEffect) {
        var kept = cleanEffect(scene.worldEffect);
        if (kept) scene.worldEffect = kept;
        else delete scene.worldEffect;
      }
      if (scene.interaction) {
        var keptInteraction = cleanInteraction(scene.interaction);
        if (keptInteraction) scene.interaction = keptInteraction;
        else delete scene.interaction;
      }
      if (Array.isArray(scene.interactions)) {
        scene.interactions = scene.interactions.map(cleanInteraction).filter(Boolean);
        if (!scene.interactions.length) delete scene.interactions;
      }
    });
    var blob = lessonPhenomenon(activities, ctx);
    var effect = effectForText(blob);
    if (!effect) return activities;
    var stories = teachingStories(activities);
    if (!stories.length) return activities;
    var lines = mechanismLines(activities);
    var plateLine = "";
    var effectLine = "";
    lines.forEach(function (line) {
      if (!plateLine && /\b(plates?|pieces?)\b/i.test(line)) plateLine = line;
      if (!effectLine && /\b(shake|shakes|shaking|energy|sudden)\b/i.test(line)) effectLine = line;
    });
    var reveal = plateLine || lines[0] || clean(((ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || [])[0], 220);
    var notice = stories[0];
    notice.scene = notice.scene || {};
    if (!notice.scene.worldEffect) {
      notice.scene.worldEffect = {
        type: effect,
        target: "world",
        trigger: "on-enter",
        intensity: "subtle",
        duration: 1400,
        educationalPurpose: "The class notices the effect before the cause is named."
      };
    }
    var hasHotspot = stories.some(function (activity) {
      var scene = activity.scene || {};
      var kind = scene.interaction && scene.interaction.type;
      return kind === "hotspot" || kind === "tap-to-reveal" || (scene.interactions || []).some(function (item) {
        return item.type === "hotspot" || item.type === "tap-to-reveal";
      });
    });
    if (!hasHotspot) {
      notice.scene.interaction = notice.scene.interaction || {
        type: "hotspot",
        target: "the place where it happens",
        instruction: "Look more closely",
        successCondition: "looked",
        responseEffect: {
          type: "highlight",
          target: "interaction",
          trigger: "on-success",
          intensity: "subtle",
          duration: 900,
          educationalPurpose: "Attention moves to the part that causes the effect."
        },
        teachingReveal: reveal
      };
    }
    var canMove = /\b(plates?|pieces?|push|slip|stuck)\b/i.test(blob);
    var hasMove = (activities || []).some(function (activity) {
      var scene = activity.scene || {};
      return (scene.interaction && scene.interaction.type === "move") || (scene.interactions || []).some(function (item) { return item.type === "move"; });
    });
    if (!canMove || hasMove) return activities;
    var plate = /\bplates?\b/i.test(blob);
    var move = {
      type: "move",
      target: plate ? "plate" : "piece",
      instruction: plate ? "Can you move the plate?" : "Can you move this piece?",
      successCondition: "slip",
      responseEffect: {
        type: effect,
        target: "world",
        trigger: "on-success",
        intensity: "medium",
        duration: 1600,
        educationalPurpose: "A sudden movement causes the effect the class can see."
      },
      teachingReveal: effectLine && effectLine !== reveal ? effectLine : (lines[1] || reveal)
    };
    var demo = stories.length > 1 ? stories[1] : notice;
    demo.scene = demo.scene || {};
    if (demo === notice && notice.scene.interaction && notice.scene.interaction.type !== "move") {
      notice.scene.interactions = [notice.scene.interaction, move];
      delete notice.scene.interaction;
    } else {
      demo.scene.interaction = move;
    }
    return activities;
  }

  function teacherRequest(ctx) {
    return clean(ctx && (ctx.lessonText || ctx.teacherInstructions) || "", 240).toLowerCase();
  }

  function requestReplacement(request, topic) {
    var learned = String(request || "").match(/^learn about\s+(.+)$/);
    if (learned && learned[1]) return learned[1];
    return clean(topic, 80) || "the idea";
  }

  function withoutRequest(value, request, replacement) {
    if (typeof value !== "string" || !request || request.length < 12) return value;
    if (value.toLowerCase().indexOf(request) === -1) return value;
    var escaped = request.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return value.replace(new RegExp(escaped, "ig"), replacement).replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
  }

  function scrubRequest(node, request, replacement) {
    if (typeof node === "string") return withoutRequest(node, request, replacement);
    if (Array.isArray(node)) return node.map(function (item) { return scrubRequest(item, request, replacement); });
    if (node && typeof node === "object") {
      Object.keys(node).forEach(function (key) {
        node[key] = scrubRequest(node[key], request, replacement);
      });
    }
    return node;
  }

  function blobOf(activities) {
    return activities.map(function (activity) {
      var config = activity.config || {};
      var bits = [activity.title, activity.why, activity.purpose, config.prompt, config.role, config.reveal].concat(config.lines || []).concat(config.words || []).concat(config.choices || []).concat(config.reveals || []);
      (config.questions || []).forEach(function (item) {
        bits.push(item.prompt, item.explain, item.correct);
        bits = bits.concat(item.choices || []);
      });
      return bits.join(" ");
    }).join(" ").toLowerCase();
  }

  function structuralIssues(activities) {
    var issues = [];
    if (!activities.length) issues.push("The adventure has no activities.");
    activities.forEach(function (activity, index) {
      var label = "Activity " + (index + 1);
      var config = activity.config || {};
      if (activity.mechanic === "quiz") {
        (config.questions || []).forEach(function (item, q) {
          var where = label + " question " + (q + 1);
          if (placeholder(item.prompt)) issues.push(where + " has no real question.");
          if (item.kind === "boolean") {
            if (item.correct !== "true" && item.correct !== "false") issues.push(where + " needs a true or false answer.");
          } else {
            if ((item.choices || []).length < 2) issues.push(where + " needs at least two choices.");
            if (!item.correct || (item.choices || []).indexOf(item.correct) === -1) issues.push(where + " correct answer is not one of the choices.");
          }
        });
      } else if (activity.mechanic === "word_search") {
        if (!(config.words || []).length) issues.push(label + " needs lesson words.");
      } else if (activity.mechanic === "spin") {
        var ask = clean(config.prompt, 180);
        if (index === activities.length - 1 && bareSpin(ask)) issues.push(label + " spins for a pupil but no task follows.");
      } else if (activity.mechanic === "doors") {
        var labels = (config.choices && config.choices.length ? config.choices : config.lines) || [];
        if (labels.length < 3) issues.push(label + " needs three real choices.");
        if (labels.some(function (line) { return /^door\s*[123]$/i.test(clean(line)); })) issues.push(label + " needs a real choice, not a door number.");
        if ((config.reveals || []).filter(Boolean).length < labels.length) issues.push(label + " needs a reveal for each choice.");
      } else if (!(config.lines || []).length || (config.lines || []).some(placeholder)) {
        issues.push(label + " needs something for the class to read.");
      }
    });
    return issues;
  }

  function educationalIssues(activities, ctx, owners) {
    var issues = structuralIssues(activities);
    var blob = blobOf(activities);
    var topic = clean(ctx.topic || "", 120);
    conceptCoverageIssues(blob, ctx).forEach(function (issue) { issues.push(issue); });
    var year = yearDigit(ctx.yearGroup);
    var mentioned = blob.match(/year\s*([1-6])/i);
    if (year && mentioned && mentioned[1] !== year) issues.push("The lesson is written for Year " + mentioned[1] + " instead of Year " + year + ".");
    if (ctx.yearGroup && activities.some(function (activity) { return /year\s*[1-6]/i.test(activity.title) && activity.title.indexOf(ctx.yearGroup) === -1; })) {
      issues.push("An activity title names the wrong year.");
    }
    var prompts = {};
    activities.forEach(function (activity) {
      ((activity.config && activity.config.questions) || []).forEach(function (item) {
        var key = clean(item.prompt).toLowerCase();
        if (!key) return;
        if (prompts[key]) issues.push("Two questions are the same: " + item.prompt);
        prompts[key] = 1;
        var reason = clean(item.explain);
        var reasonWords = reason.split(/\s+/).filter(Boolean).length;
        var praise = /^(correct|yes|great job|well done|good job|nice work)[.!]*$/i.test(reason);
        var kind = checkKind(item.prompt);
        var needsReason = kind === "cause-effect" || kind === "comparison" || kind === "reasoning";
        if (praise || reasonWords < (needsReason ? 6 : 3)) {
          issues.push("A question needs an explanation of the reason.");
        }
        var factBag = (((ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).join(" ") + " " + ((ctx.lessonPlan && ctx.lessonPlan.misconceptions) || []).join(" ")).toLowerCase();
        (item.choices || []).forEach(function (choice) {
          if (SILLY[clean(choice).toLowerCase()] && topic.toLowerCase().indexOf(clean(choice).toLowerCase()) === -1) {
            issues.push("A choice is not a real alternative: " + choice);
          }
          if (jokeChoice(choice) && !jokeChoice(topic)) issues.push("A wrong answer is a joke rather than a misconception: " + choice);
          if (thinChoice(choice)) issues.push("A wrong answer is not a misconception: " + choice);
          var recall = checkKind(item.prompt) === "definition" || checkKind(item.prompt) === "recall";
          if (!recall && choice !== item.correct && unrelatedChoice(choice, factBag)) issues.push("A wrong answer is not a misconception from the lesson: " + choice);
        });
      });
    });
    var topicLower = topic.toLowerCase();
    if (topicLower.indexOf("fraction") === -1 && blob.indexOf("half") !== -1 && blob.indexOf("quarter") !== -1) {
      issues.push("The lesson drifted into fractions.");
    }
    activities.forEach(function (activity, index) {
      if (activity.mechanic === "story" && activity.scene && activity.scene.beat === "discovery") {
        var text = ((activity.config && activity.config.lines) || []).join(" ");
        var count = text.split(/\s+/).filter(Boolean).length;
        if (count < 12) issues.push("Activity " + (index + 1) + " names the topic but does not explain it.");
      }
      if (activity.mechanic === "mystery") {
        var fact = ((activity.config && activity.config.lines) || []).join(" ");
        if (fact.split(/\s+/).filter(Boolean).length < 6) issues.push("Activity " + (index + 1) + " needs a fact from the lesson.");
        if (metaRecap(fact, ctx)) issues.push("Activity " + (index + 1) + " recap does not state the fact from the lesson.");
      }
    });
    activities.forEach(function (activity, index) {
      if (activity.mechanic !== "spin") return;
      var ask = clean(activity.config && activity.config.prompt, 180);
      var hasTask = !bareSpin(ask);
      if (/\{name\}|\[name\]|\[pupil\]/i.test(ask)) issues.push("Activity " + (index + 1) + " pupil task includes a name placeholder.");
      var next = activities[index + 1];
      var part = next && next.config && next.config.participation;
      var followed = next && next.mechanic === "quiz" && (part === "selected_pupil" || part === "spin");
      if (!hasTask && !followed) issues.push("Activity " + (index + 1) + " chooses a pupil without a real turn afterwards.");
    });
    var sum = activities.reduce(function (total, activity) { return total + (Number(activity.minutes) || 0); }, 0);
    var band = durationBand(ctx.requestedMinutes || 15);
    if (sum < band.low || sum > band.high) issues.push("The activities add up to " + sum + " minutes. The lesson needs between " + band.low + " and " + band.high + ".");
    var rawRequest = clean(ctx.lessonText || ctx.teacherInstructions || "", 240).toLowerCase();
    if (rawRequest.length >= 12 && blob.indexOf(rawRequest) !== -1) issues.push("The lesson repeated the teacher's request instead of teaching the topic.");
    if (unsafe(JSON.stringify(activities))) issues.push("The lesson included markup that Wondii cannot show.");
    if (scoredBeforeTeaching(activities) || !mechanismBeforeCheck(activities, ctx)) issues.push("A scored question comes before the class has been taught the idea.");
    causeAlignment(activities, ctx).forEach(function (issue) { issues.push(issue); });
    substanceIssues(activities, ctx).forEach(function (issue) { issues.push(issue); });
    if (journeyOrderIssue(activities)) issues.push("The mission ends before the class has learned and checked the idea.");
    shallowAssessment(activities, ctx).forEach(function (issue) { issues.push(issue); });
    if (spoilsDiscovery(activities, ctx)) {
      var openingIssue = "The opening states the explanation before the class has investigated.";
      issues.push(openingIssue);
      var opener = (activities || [])[0];
      ownIssue(owners, (opener && opener.slotId) || "hook", openingIssue);
    }
    storyIssues(activities, ctx).forEach(function (issue) { issues.push(issue); });
    stageIssues(activities, ctx).forEach(function (issue) { issues.push(issue); });
    return issues;
  }

  function checkKind(prompt) {
    var text = clean(prompt).toLowerCase();
    if (/\bwhy\b|\bwhat causes\b|\bwhat caused\b|\bwhat makes\b/.test(text)) return "cause-effect";
    if (/\bdifference\b|\bcompare\b|\bunlike\b|\bwhereas\b/.test(text)) return "comparison";
    if (/\bwhich\b.+\bshould\b|\buse the\b|\bapply\b/.test(text)) return "reasoning";
    if (/\bwhat is\b|\bwhat are\b|\bwhat do\b|\bwhat does\b|\bwhich of these is\b/.test(text)) return "definition";
    return "recall";
  }

  function learningAction(activity, ctx) {
    var config = (activity && activity.config) || {};
    var prompt = clean(config.prompt || config.reveal || ((config.lines || []).join(" ")));
    if (activity && activity.mechanic === "spin" && bareSpin(config.prompt)) return false;
    if (!/\b(predict|sort|choose|label|compare|explain|show|point|build|match|decide|use|move|name|describe|finish|shade|group|order|complete)\b/i.test(prompt)) return false;
    if (prompt.split(/\s+/).filter(Boolean).length < 6) return false;
    var plan = (ctx && ctx.lessonPlan) || {};
    var concepts = ((ctx && ctx.lessonBrief && ctx.lessonBrief.concepts) || []).concat(words((plan.keyKnowledge || []).join(" ")));
    if (!concepts.length) return true;
    var lower = prompt.toLowerCase();
    return concepts.some(function (token) { return token && token.length > 3 && lower.indexOf(token) !== -1; });
  }

  function stageIssues(activities, ctx) {
    var arc = (ctx && ctx.lessonPlan && ctx.lessonPlan.lessonArc) || [];
    if (!arc.length || arc[0].mayRevealAnswer === undefined) return [];
    var issues = [];
    function present(purpose) {
      if (purpose === "hook") return activities.some(function (activity) { return activity.scene && activity.scene.beat === "beginning"; });
      if (purpose === "investigate") return activities.some(function (activity) { return activity.mechanic === "story" && activity.scene && activity.scene.beat === "goal"; });
      if (purpose === "teach") return activities.some(function (activity) { return activity.mechanic === "story" && activity.scene && activity.scene.beat === "discovery"; });
      if (purpose === "apply") {
        var apply = null;
        activities.forEach(function (activity) {
          if (!apply && activity.scene && activity.scene.beat === "application") apply = activity;
        });
        if (apply && apply.mechanic === "spin") return false;
        if (ctx && ctx.lessonSkeleton && apply) return true;
        return !!(apply && learningAction(apply, ctx));
      }
      if (purpose === "check") return activities.some(function (activity) { return activity.mechanic === "quiz"; });
      if (purpose === "resolution") return activities.some(function (activity) { return activity.mechanic === "story" && activity.scene && activity.scene.beat === "resolution"; });
      if (purpose === "recap") return activities.some(function (activity) { return activity.mechanic === "mystery" || (activity.scene && activity.scene.beat === "debrief"); });
      return true;
    }
    arc.forEach(function (stage) {
      if (!stage || stage.optional || !stage.purpose) return;
      if (present(stage.purpose)) return;
      if (stage.purpose === "apply" && activities.some(function (activity) {
        return activity.scene && activity.scene.beat === "application" && activity.mechanic === "spin";
      })) {
        issues.push("The apply stage selects a pupil but does not use the new knowledge.");
        return;
      }
      issues.push("The lesson is missing the " + stage.purpose + " stage.");
    });
    return issues;
  }

  function storyIssues(activities, ctx) {
    var story = ctx && ctx.storyPlan;
    if (!story || story.enabled === false) return [];
    var issues = [];
    if (clean(story.mission).length < 12) issues.push("The adventure needs a mission.");
    var beats = {};
    var doors = 0;
    var year = Number(yearDigit(ctx.yearGroup || (ctx.lessonPlan && ctx.lessonPlan.yearGroup))) || (ctx.yearAssumed ? 3 : 0);
    activities.forEach(function (activity, index) {
      var beat = activity.scene && activity.scene.beat;
      if (beat) beats[beat] = 1;
      if (activity.mechanic === "mystery") beats.debrief = 1;
      if (activity.mechanic === "doors") doors += 1;
      if (activity.mechanic === "story") {
        var storyWords = String(((activity.config && activity.config.lines) || []).join(" ")).split(/\s+/).filter(Boolean).length;
        var cap = year <= 2 ? 80 : (year <= 4 ? 150 : 260);
        if (year && storyWords > cap) issues.push("Activity " + (index + 1) + " is too much reading for this age.");
      }
      if (activity.mechanic === "spin") {
        var role = (activity.config && activity.config.role) || (activity.scene && activity.scene.roleId);
        if (role && bareSpin(activity.config && activity.config.prompt)) issues.push("Activity " + (index + 1) + " gives a pupil a role without a task.");
        var label = clean(activity.config && activity.config.role).toLowerCase();
        var known = (story.characters || []).some(function (item) {
          var name = clean(item.label).toLowerCase();
          return item.id === (activity.scene && activity.scene.roleId) || (label && name && (name === label || label.indexOf(name) !== -1 || name.indexOf(label) !== -1));
        });
        if (role && (story.characters || []).length && !known) issues.push("Activity " + (index + 1) + " uses a role that is not part of this adventure.");
        if (unfairRole((activity.config && activity.config.role) || "")) issues.push("Activity " + (index + 1) + " gives a pupil an unfair role.");
      }
      if (activity.mechanic === "doors") {
        var reveals = (activity.config && activity.config.reveals) || [];
        var same = reveals.length >= 3 && reveals.every(function (line) { return clean(line) && clean(line) === clean(reveals[0]); });
        if (same) issues.push("Activity " + (index + 1) + " choice does not change what the class sees.");
        if (!activities[index + 1]) issues.push("Activity " + (index + 1) + " branch does not return to the lesson.");
      }
    });
    if (!beats.resolution) issues.push("One scene must settle the mission. Set that activity's scene.beat to the exact word resolution, before the debrief, and keep the minutes inside the duration band.");
    if (!beats.debrief) issues.push("The adventure has no debrief.");
    if (doors > 1) issues.push("The adventure branches more than once.");
    (story.characters || []).forEach(function (role) {
      if (unfairRole(role.label)) issues.push("A pupil role is not a fair part.");
    });
    var knowledge = ((ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).join(" ");
    var tie = words(knowledge + " " + ((ctx.lessonPlan && ctx.lessonPlan.learningObjective) || "") + " " + (ctx.topic || ""));
    var arcText = (((story.narrativeArc || []).map(function (item) { return item.learning || ""; }).join(" ")) + " " + (story.mission || "") + " " + (story.premise || "")).toLowerCase();
    if (tie.length && !tie.some(function (word) { return arcText.indexOf(word) !== -1; })) issues.push("The adventure objective is not about the lesson.");
    var mystery = "";
    activities.forEach(function (activity) {
      var debrief = activity.mechanic === "mystery" || (activity.scene && activity.scene.beat === "debrief");
      if (debrief) mystery += " " + ((activity.config && activity.config.lines) || []).join(" ");
    });
    if (mystery && tie.length && !tie.some(function (word) { return mystery.toLowerCase().indexOf(word) !== -1; })) {
      issues.push("The debrief does not reflect the key knowledge.");
    }
    var blob = JSON.stringify(activities);
    if (/\{name\}|\[pupil\]/i.test(blob)) issues.push("The adventure includes a pupil name placeholder.");
    return issues;
  }

  function metaRecap(fact, ctx) {
    var text = String(fact || "").toLowerCase();
    var meta = /this (recap|activity|mystery)\b|reinforces the|key points about|what we learned|main ideas learned|helps us remember|helps clarify/.test(text);
    if (!meta) return false;
    var knowledge = (((ctx && ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).join(" ")).toLowerCase();
    var topicWords = {};
    words((ctx && ctx.topic) || "").forEach(function (token) { topicWords[token] = 1; });
    var sharesFact = knowledge.split(/[^a-z]+/).some(function (word) {
      return word.length > 4 && !topicWords[word] && text.indexOf(word) !== -1;
    });
    return !sharesFact;
  }

  function jokeChoice(text) {
    return /\b(turns into|disappears|vanishes|starts singing|becomes a dragon|becomes a bird)\b/i.test(String(text || ""));
  }

  function causalRequest(ctx) {
    var plan = (ctx && ctx.lessonPlan) || {};
    var focus = [ctx && ctx.topic, ctx && ctx.lessonText, plan.learningObjective, plan.topic].join(" ").toLowerCase();
    return /\bcauses?\b|\bhow\b[^.]{0,40}\bforms?\b|\bwhy\b/.test(focus);
  }

  function shallowAssessment(activities, ctx) {
    if (!causalRequest(ctx)) return [];
    var knowledgeWords = words((((ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).join(" "))).filter(function (word) {
      return word.length > 4;
    });
    var found = [];
    (activities || []).forEach(function (activity) {
      if (activity.mechanic !== "quiz") return;
      ((activity.config && activity.config.questions) || []).forEach(function (item) {
        var prompt = clean(item.prompt).toLowerCase();
        var choices = (item.choices || []).map(function (choice) { return clean(choice).toLowerCase(); });
        choices.forEach(function (choice) {
          if (/\b(it rains|the sun shines|sunny days?|at night only|only at night|night only)\b/.test(choice)) {
            found.push("A wrong answer is unrelated to the idea: " + choice);
          }
        });
        var shallowPrompt = /what happens during|when does .+ happen/.test(prompt);
        var promptShares = knowledgeWords.some(function (word) { return prompt.indexOf(word) !== -1; });
        if (shallowPrompt && knowledgeWords.length && !promptShares) {
          found.push("The check asks what happens, not the cause or process the lesson is about.");
        }
      });
    });
    return found;
  }

  function problemOpening() {
    return ["The class can see that something has happened, and they still need to find out why."];
  }

  function knowledgeWords(text) {
    return String(text || "").toLowerCase().split(/\W+/).filter(function (word) { return word.length > 4; });
  }

  function statesKnowledge(line, knowledge) {
    var text = String(line || "").toLowerCase();
    if (/\b(because of|caused by|due to)\b/.test(text)) return true;
    if (/\b(happen|happens|are caused|is caused)\b[^.]{0,50}\b(because|by)\b/.test(text)) return true;
    var found = false;
    (knowledge || []).forEach(function (fact) {
      if (found) return;
      var bits = knowledgeWords(fact);
      var hits = bits.filter(function (word) { return text.indexOf(word) !== -1; }).length;
      if (bits.length >= 3 && hits >= 2) found = true;
    });
    return found;
  }

  function holdDiscovery(activities, ctx) {
    if (!causalRequest(ctx) || !spoilsDiscovery(activities, ctx)) return;
    var first = activities[0];
    if (!first || first.mechanic !== "story" || !first.config) return;
    var knowledge = ((ctx && ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).map(function (item) { return clean(item, 180); }).filter(Boolean);
    var moved = [];
    var kept = [];
    (first.config.lines || []).forEach(function (line) {
      if (statesKnowledge(line, knowledge)) moved.push(line);
      else kept.push(line);
    });
    if (kept.join(" ").split(/\s+/).filter(Boolean).length < 12) kept = problemOpening();
    first.config.lines = kept.slice(0, 2);
    var facts = moved.length ? moved : knowledge.slice(0, 2);
    if (!facts.length) return;
    var quizAt = activities.length;
    var teach = null;
    activities.forEach(function (activity, index) {
      if (activity.mechanic === "quiz" && quizAt === activities.length) quizAt = index;
      if (!teach && index > 0 && activity.mechanic === "story" && !endingScene(activity)) teach = activity;
    });
    if (!teach) {
      activities.splice(quizAt, 0, {
        id: freshId("story"),
        mechanic: "story",
        purpose: "Teach the idea before the check",
        title: "Look more closely",
        minutes: 3,
        why: facts[0],
        scene: { beat: "discovery", kind: "teach" },
        config: { lines: facts.slice(0, 4) }
      });
      return;
    }
    var lines = (teach.config && teach.config.lines) || [];
    facts.forEach(function (line) {
      if (lines.join(" ").toLowerCase().indexOf(String(line).toLowerCase().slice(0, 24)) === -1) lines.push(line);
    });
    teach.config = teach.config || {};
    teach.config.lines = lines.slice(0, 4);
  }

  function explainShortStories(activities, ctx) {
    var knowledge = ((ctx && ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).map(function (item) { return clean(item, 180); }).filter(Boolean);
    if (!knowledge.length) return;
    (activities || []).forEach(function (activity, index) {
      if (!activity || activity.mechanic !== "story" || endingScene(activity) || !activity.config) return;
      if (index === 0 && causalRequest(ctx)) return;
      var lines = (activity.config.lines || []).slice();
      if (lines.join(" ").split(/\s+/).filter(Boolean).length >= 12) return;
      knowledge.forEach(function (fact) {
        if (lines.join(" ").toLowerCase().indexOf(fact.toLowerCase().slice(0, 24)) === -1) lines.push(fact);
      });
      activity.config.lines = lines.slice(0, 4);
    });
  }

  function settleDebrief(activities) {
    (activities || []).forEach(function (activity) {
      if (!activity || activity.mechanic !== "mystery" || !activity.scene) return;
      if (activity.scene.beat === "resolution") activity.scene.beat = "debrief";
    });
  }

  function spoilsDiscovery(activities, ctx) {
    var knowledge = ((ctx && ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []);
    var fact = String(knowledge[0] || "").toLowerCase();
    var bits = fact.split(/\W+/).filter(function (word) { return word.length > 4; });
    if (bits.length < 3) return false;
    var first = (activities || [])[0];
    if (!first || first.mechanic !== "story") return false;
    var beat = first.scene && first.scene.beat;
    if (beat && beat !== "beginning" && beat !== "goal") return false;
    var text = ((first.config && first.config.lines) || []).join(" ").toLowerCase();
    var hits = bits.filter(function (word) { return text.indexOf(word) !== -1; }).length;
    if (hits >= Math.min(4, bits.length) && hits / bits.length >= 0.6) return true;
    if (!causalRequest(ctx)) return false;
    if (/\b(this story will|help students|students will understand)\b/.test(text)) return true;
    if (bits.length >= 3 && hits >= 2) return true;
    return /\b(because of|caused by|due to)\b/.test(text) || /\b(happen|happens|are caused|is caused)\b[^.]{0,50}\b(because|by)\b/.test(text);
  }

  function unrelatedChoice(choice, factBag) {
    var bag = String(factBag || "").toLowerCase();
    var known = bag.split(/\W+/).filter(function (word) { return word.length > 3; });
    if (known.length < 2) return false;
    if (clean(choice).split(/\s+/).filter(Boolean).length > 2) return false;
    var bits = clean(choice).toLowerCase().split(/\W+/).filter(function (word) { return word.length > 3; });
    if (!bits.length) return false;
    return bits.every(function (word) { return bag.indexOf(word) === -1; });
  }

  function thinChoice(text) {
    return /\b(say nothing|do nothing|wait and say nothing|i don't know|nothing happens)\b/i.test(String(text || ""));
  }

  function mechanismBeforeCheck(activities, ctx) {
    if (!causalRequest(ctx)) return true;
    var knowledge = words((((ctx.lessonPlan && ctx.lessonPlan.keyKnowledge) || []).join(" "))).filter(function (word) {
      return word.length > 4;
    });
    if (knowledge.length < 2) return true;
    var taught = false;
    var ok = true;
    (activities || []).forEach(function (activity, index) {
      var points = activity.config && activity.config.points;
      if (activity.mechanic === "quiz" && Number(points) !== 0 && !taught) ok = false;
      if (index === 0 || activity.mechanic !== "story") return;
      var text = ((activity.config && activity.config.lines) || []).join(" ").toLowerCase();
      if (/\b(this story will|help students|students will understand)\b/.test(text)) return;
      var hits = knowledge.filter(function (word) { return text.indexOf(word) !== -1; }).length;
      if (hits >= 2) taught = true;
    });
    return ok;
  }

  function scoredBeforeTeaching(activities) {
    var taught = false;
    var early = false;
    (activities || []).forEach(function (activity) {
      var mechanic = activity.mechanic;
      if (mechanic === "story" || mechanic === "mystery" || mechanic === "doors") taught = true;
      if (mechanic === "quiz" && !taught) {
        var hook = /hook|predict/i.test((activity.purpose || "") + " " + (activity.why || ""));
        var points = activity.config && activity.config.points;
        if (!(hook && Number(points) === 0)) early = true;
      }
    });
    return early;
  }

  function fitDuration(activities, band) {
    var floorOf = { quiz: 2, word_search: 3, spin: 1, mystery: 2, doors: 2, story: 2 };
    function total() {
      return activities.reduce(function (sum, activity) { return sum + (Number(activity.minutes) || 0); }, 0);
    }
    if (total() > band.high) activities = activities.filter(function (activity) { return activity.mechanic !== "word_search"; });
    var guard = 0;
    while (total() > band.high && guard < 12) {
      guard += 1;
      var quizCount = activities.filter(function (activity) { return activity.mechanic === "quiz"; }).length;
      if (quizCount > 1) {
        var q;
        for (q = activities.length - 1; q >= 0; q--) {
          if (activities[q].mechanic === "quiz") { activities.splice(q, 1); break; }
        }
        continue;
      }
      var quiz = null;
      activities.forEach(function (activity) { if (activity.mechanic === "quiz") quiz = activity; });
      var questions = quiz && quiz.config && quiz.config.questions;
      if (questions && questions.length > 1) {
        questions.pop();
        quiz.config.prompt = questions[0].prompt;
        quiz.config.choices = (questions[0].choices || []).slice();
        quiz.config.correct = questions[0].correct;
        quiz.config.explain = questions[0].explain || "";
        quiz.config.kind = questions[0].kind;
        quiz.minutes = Math.max(2, questions.length);
        continue;
      }
      var shrunk = false;
      activities.forEach(function (activity) {
        var floor = floorOf[activity.mechanic] || 1;
        if (!shrunk && activity.minutes > floor && total() > band.high) {
          activity.minutes -= Math.min(activity.minutes - floor, total() - band.high);
          shrunk = true;
        }
      });
      if (!shrunk) break;
    }
    if (total() < band.low) {
      var main = null;
      activities.forEach(function (activity) {
        if (!main && (activity.mechanic === "quiz" || activity.mechanic === "story")) main = activity;
      });
      if (main) main.minutes = Math.min(main.mechanic === "quiz" ? 8 : 6, main.minutes + (band.low - total()));
    }
    return activities;
  }

  function accept(raw, ctx) {
    ctx = ctx || {};
    var parsed = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    if (parsed && ctx.lessonSkeleton) parsed = materialiseSkeleton(ctx.lessonSkeleton, parsed, ctx);
    if (!parsed || typeof parsed !== "object") return { ok: false, issues: ["The lesson was not valid structured data."], structuralOk: !ctx.lessonSkeleton };
    if (parsed.adventure && typeof parsed.adventure === "object") parsed = parsed.adventure;
    var allowed = ctx.availableMechanics && ctx.availableMechanics.length ? ctx.availableMechanics : MECHANICS;
    var incoming = Array.isArray(parsed.activities) ? parsed.activities : [];
    var dropped = incoming.some(function (item) {
      var mechanic = playableMechanic(item);
      return MECHANICS.indexOf(mechanic) === -1 || allowed.indexOf(mechanic) === -1;
    });
    var activities = incoming.map(function (item) { return activityFrom(item, allowed); }).filter(Boolean);
    activities = fitDuration(activities, durationBand(ctx.requestedMinutes || 15));
    var storyPlan = ctx.storyPlan || parsed.storyPlan || null;
    if (storyPlan && storyPlan.enabled !== false) {
      activities = ensureScenes(activities, storyPlan);
      activities = placePupilTurn(activities, storyPlan, ctx);
      repairJokeChoices(activities, ctx.lessonPlan || parsed.lessonPlan || null);
      repairShallowChoices(activities, ctx.lessonPlan || parsed.lessonPlan || null, ctx);
      alignRoles(activities, storyPlan);
    }
    activities = orderJourney(activities);
    var request = teacherRequest(ctx);
    if (request.length >= 12) {
      scrubRequest(activities, request, requestReplacement(request, ctx.topic || (ctx.lessonPlan && ctx.lessonPlan.topic) || ""));
    }
    var issueCtx = Object.assign({}, ctx, {
      lessonPlan: ctx.lessonPlan || parsed.lessonPlan || null,
      storyPlan: storyPlan
    });
    if (storyPlan && storyPlan.enabled !== false) {
      tuneShots(activities);
      ensureLivingWorld(activities, issueCtx);
    }
    repairEffectAnswer(activities, issueCtx);
    if (ctx.lessonSkeleton) {
      activities.forEach(function (activity) {
        if (activity.slotId !== "apply") return;
        var applySlot = null;
        ctx.lessonSkeleton.forEach(function (slot) { if (slot.id === "apply") applySlot = slot; });
        settleApply(activity, applySlot);
      });
    }
    var owners = {};
    var issues = educationalIssues(activities, issueCtx, owners);
    if (ctx.lessonSkeleton) {
      activities.forEach(function (activity) {
        if (activity.slotId === "investigate") {
          var looked = ((activity.config && activity.config.lines) || []).join(" ");
          if (looked.split(/\s+/).filter(Boolean).length < 6 || bareSpin(looked)) {
            var lookIssue = "The investigate slot does not ask the class to look.";
            issues.push(lookIssue);
            ownIssue(owners, activity.slotId, lookIssue);
          }
        }
        if (activity.slotId === "apply") {
          var applySlot = null;
          ctx.lessonSkeleton.forEach(function (slot) { if (slot.id === "apply") applySlot = slot; });
          applySlotIssues(activity, applySlot, issueCtx).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, activity.slotId, issue);
          });
        }
        if (activity.slotId === "check") {
          checkSlotIssues(activity, issueCtx).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, activity.slotId, issue);
          });
        }
      });
    }
    if (dropped) issues.push("An activity uses a game Wondii cannot play.");
    if (ctx.yearGroup && parsed.yearGroup && yearDigit(parsed.yearGroup) && yearDigit(parsed.yearGroup) !== yearDigit(ctx.yearGroup)) {
      issues.push("The plan changed the year group.");
    }
    var applyReport = applyReportOf(activities, ctx);
    var checkReport = checkReportOf(activities, issueCtx);
    if (issues.length) {
      var structure = ctx.lessonSkeleton ? skeletonDrift(activities, ctx.lessonSkeleton) : [];
      var reported = structure.concat(issues);
      reported.slotIssues = slotIssuesFrom(reported, activities, owners);
      return { ok: false, structuralOk: !structure.length, slotIds: slotIdsFrom(reported, activities), slotIssues: reported.slotIssues, issues: reported, previous: parsed, applyAlignment: applyReport, checkAlignment: checkReport };
    }
    var objectiveSource = parsed.objectives || parsed.learningObjectives || parsed.learningObjective || parsed.objective || ctx.learningObjectives || [];
    if (!Array.isArray(objectiveSource)) objectiveSource = [objectiveSource];
    var objectives = objectiveSource.map(function (item) { return clean(item, 240); }).filter(Boolean).slice(0, 6);
    var plannedObjective = clean((ctx.lessonPlan && ctx.lessonPlan.learningObjective) || "", 240);
    if (!objectives.length && plannedObjective) objectives = [plannedObjective];
    if (!objectives.length) return { ok: false, issues: ["The lesson needs a learning objective."], previous: parsed, applyAlignment: applyReport };
    var title = withoutRequest(clean(parsed.title, 80), request, requestReplacement(request, ctx.topic || ""));
    var rawRequest = request;
    if (rawRequest.length >= 12 && title.toLowerCase().indexOf(rawRequest) !== -1) {
      return { ok: false, issues: ["The title repeated the teacher's request."], previous: parsed, applyAlignment: applyReport };
    }
    var sum = activities.reduce(function (total, activity) { return total + activity.minutes; }, 0);
    var lessonPlan = ctx.lessonPlan || parsed.lessonPlan || null;
    var keptStory = ctx.storyPlan || parsed.storyPlan || null;
    return {
      ok: true,
      adventure: {
        subject: clean(parsed.subject || ctx.subject, 80),
        topic: clean(parsed.topic || ctx.topic, 120),
        yearGroup: ctx.yearGroup || "",
        yearAssumed: !!ctx.yearAssumed,
        yearAssumption: ctx.yearAssumed ? (ctx.yearAssumption || AGE_FALLBACK) : "",
        title: title || ((ctx.topic || "Learning") + " Adventure"),
        objectives: objectives,
        vocabulary: (parsed.vocabulary || []).map(function (item) { return clean(item, 40); }).filter(Boolean).slice(0, 12),
        lessonPlan: lessonPlan,
        lessonSkeleton: ctx.lessonSkeleton || null,
        storyPlan: keptStory,
        activities: activities,
        targetMinutes: Number(ctx.requestedMinutes) || sum,
        estimateMinutes: sum
      },
      applyAlignment: applyReport,
      checkAlignment: checkReport
    };
  }

  function alignmentMeta(first, final, calls) {
    var last = calls.length ? calls[calls.length - 1] : null;
    var ms = 0;
    calls.forEach(function (call) { ms += call.ms || 0; });
    return {
      deterministicStatus: first && first.deterministicStatus || "",
      deterministicReason: first && first.deterministicReason || "",
      finalDeterministicStatus: final && final.deterministicStatus || "",
      finalDeterministicReason: final && final.deterministicReason || "",
      semanticJudgeUsed: calls.length > 0,
      semanticRelationship: last ? last.relationship : null,
      semanticReason: last ? (last.reason || "") : "",
      semanticOutcome: last ? last.outcome : null,
      semanticMs: calls.length ? ms : null,
      semanticCalls: calls.length,
      semanticOutcomes: calls.map(function (call) { return call.outcome; })
    };
  }

  function verdictOf(value) {
    var ms = value && typeof value.ms === "number" ? value.ms : null;
    if (!value || typeof value !== "object" || value.ok === false) {
      return { ok: false, relationship: null, outcome: "semantic-error", reason: clean(value && value.reason, 80), ms: ms };
    }
    var decision = applySemanticDecision(value.relationship);
    if (!decision.ok) return { ok: false, relationship: null, outcome: "semantic-error", reason: clean(value.reason, 80), ms: ms };
    return { ok: true, relationship: decision.relationship, outcome: decision.outcome, reason: clean(value.reason, 240), ms: ms };
  }

  function checkVerdictOf(value) {
    var ms = value && typeof value.ms === "number" ? value.ms : null;
    if (!value || typeof value !== "object" || value.ok === false) {
      return { ok: false, relationship: null, outcome: "check-error", reason: clean(value && value.reason, 80), ms: ms };
    }
    var decision = checkSemanticDecision(value.relationship);
    if (!decision.ok) return { ok: false, relationship: null, outcome: "check-error", reason: clean(value.reason, 80), ms: ms };
    return { ok: true, relationship: decision.relationship, outcome: decision.outcome, reason: clean(value.reason, 240), ms: ms };
  }

  function resolveLessonContent(raw, ctx, ports) {
    ports = ports || {};
    var calls = [];
    var checkCalls = [];
    var repairedSlots = [];
    var heldApply = null;
    function pack(result, repairUsed) {
      return {
        ok: !!result.ok,
        adventure: result.adventure,
        issues: result.issues,
        structuralOk: result.structuralOk !== false,
        slotIds: result.slotIds || [],
        previous: result.previous,
        repairUsed: !!repairUsed,
        repairedSlots: repairedSlots.slice(),
        applyAlignment: alignmentMeta(firstReport, result.applyAlignment, calls),
        checkAlignment: alignmentMeta(firstCheck, result.checkAlignment, checkCalls)
      };
    }
    function judged(source, result) {
      if (applyJudgePlan(result) !== "judge") return Promise.resolve(null);
      var activity = null;
      var slot = null;
      (((result.previous && result.previous.activities) || (result.adventure && result.adventure.activities) || [])).forEach(function (item) {
        if (item && item.slotId === "apply") activity = item;
      });
      ((ctx && ctx.lessonSkeleton) || []).forEach(function (item) { if (item && item.id === "apply") slot = item; });
      return Promise.resolve().then(function () {
        if (!ports.judge) return { ok: false, reason: "error", ms: null };
        return ports.judge(applySemanticInput(activity, slot, ctx));
      }).then(function (value) {
        var verdict = verdictOf(value);
        calls.push({ relationship: verdict.relationship, outcome: verdict.outcome, reason: verdict.reason, ms: verdict.ms });
        if (!verdict.ok) return { stop: true, result: result };
        heldApply = { relationship: verdict.relationship, reason: verdict.reason };
        var next = accept(source, Object.assign({}, ctx, { applySemantic: heldApply }));
        return { stop: false, result: next };
      }).catch(function () {
        calls.push({ relationship: null, outcome: "semantic-error", reason: "error", ms: null });
        return { stop: true, result: result };
      });
    }
    function judgedCheck(source, result) {
      if (checkJudgePlan(result) !== "judge") return Promise.resolve(null);
      var activity = null;
      var taught = [];
      (((result.previous && result.previous.activities) || (result.adventure && result.adventure.activities) || [])).forEach(function (item) {
        if (item && item.slotId === "check") activity = item;
        if (item && item.slotId === "teach") taught = taught.concat((item.config && item.config.lines) || []);
      });
      return Promise.resolve().then(function () {
        if (!ports.checkJudge) return { ok: false, reason: "error", ms: null };
        return ports.checkJudge(checkSemanticInput(activity, ctx, taught.join(" ")));
      }).then(function (value) {
        var verdict = checkVerdictOf(value);
        checkCalls.push({ relationship: verdict.relationship, outcome: verdict.outcome, reason: verdict.reason, ms: verdict.ms });
        if (!verdict.ok) return { stop: true, result: result };
        var nextCtx = Object.assign({}, ctx, { checkSemantic: { relationship: verdict.relationship, reason: verdict.reason } });
        if (heldApply) nextCtx.applySemantic = heldApply;
        return { stop: false, result: accept(source, nextCtx) };
      }).catch(function () {
        checkCalls.push({ relationship: null, outcome: "check-error", reason: "error", ms: null });
        return { stop: true, result: result };
      });
    }
    var accepted = accept(raw, ctx);
    var firstReport = accepted.applyAlignment || null;
    var firstCheck = accepted.checkAlignment || null;
    if (accepted.ok || accepted.structuralOk === false) return Promise.resolve(pack(accepted, false));
    return judged(raw, accepted).then(function (firstJudge) {
      if (firstJudge && firstJudge.stop) return pack(firstJudge.result, false);
      if (firstJudge && firstJudge.result) accepted = firstJudge.result;
      if (accepted.ok) return pack(accepted, false);
      return judgedCheck(raw, accepted).then(function (checkJudge) {
        if (checkJudge && checkJudge.stop) return pack(checkJudge.result, false);
        if (checkJudge && checkJudge.result) accepted = checkJudge.result;
        if (accepted.ok) return pack(accepted, false);
        if (!ports.repair) return pack(accepted, false);
        repairedSlots = (accepted.slotIds || []).slice();
        return Promise.resolve(ports.repair(accepted)).then(function (second) {
          var merged = mergeSlotContent(accepted.previous, second);
          heldApply = null;
          var repaired = accept(merged, ctx);
          return judged(merged, repaired).then(function (secondJudge) {
            if (secondJudge && secondJudge.result) repaired = secondJudge.result;
            if (repaired.ok) return pack(repaired, true);
            return judgedCheck(merged, repaired).then(function (again) {
              if (again && again.result) repaired = again.result;
              return pack(repaired, true);
            });
          });
        });
      });
    });
  }

  function runPipeline(ctx, callModel) {
    var started = Date.now();
    var planRepaired = false;
    return Promise.resolve().then(function () {
      return callModel(planBrief(ctx), null);
    }).then(function (firstPlan) {
      var plan = normalisePlan(firstPlan, ctx);
      if (plan.ok) return plan.plan;
      planRepaired = true;
      return Promise.resolve(callModel(planRepairBrief(ctx, plan.issues, plan.previous), plan.issues)).then(function (secondPlan) {
        var again = normalisePlan(secondPlan, ctx);
        if (!again.ok) {
          var failed = new Error("plan");
          failed.planFailed = true;
          failed.issues = again.issues;
          throw failed;
        }
        return again.plan;
      });
    }).then(function (lessonPlan) {
      var withPlan = Object.assign({}, ctx, { lessonPlan: lessonPlan });
      return loadStory(withPlan, lessonPlan, callModel).then(function (story) {
        return { plan: lessonPlan, story: story };
      });
    }).then(function (framed) {
      var skeleton = lessonSkeleton(framed.plan, Object.assign({}, ctx, { lessonPlan: framed.plan }));
      var withStory = Object.assign({}, ctx, { lessonPlan: framed.plan, storyPlan: framed.story, lessonSkeleton: skeleton });
      return Promise.resolve(callModel(contentBrief(withStory, framed.plan, framed.story), null)).then(function (first) {
        var accepted = accept(first, withStory);
        if (accepted.ok) {
          accepted.adventure.meta = { durationMs: Date.now() - started, repairUsed: planRepaired, repairKind: "none", structuralOk: true, fallbackUsed: false, storyFallback: !!(framed.story && framed.story.fallback) };
          return accepted;
        }
        if (accepted.structuralOk === false) {
          return { ok: false, category: "invalid", stage: "STRUCTURAL_VALIDATION_FAILED", issues: accepted.issues, structuralOk: false, repairUsed: false, fallbackUsed: true, durationMs: Date.now() - started };
        }
        return Promise.resolve(callModel(slotRepairBrief(withStory, accepted.slotIds, accepted.issues, accepted.previous), accepted.issues)).then(function (second) {
          var repaired = accept(mergeSlotContent(accepted.previous, second), withStory);
          if (repaired.ok) {
            repaired.adventure.meta = { durationMs: Date.now() - started, repairUsed: true, repairKind: "slot", structuralOk: true, fallbackUsed: false, storyFallback: !!(framed.story && framed.story.fallback) };
            return repaired;
          }
          return { ok: false, category: "invalid", issues: repaired.issues, structuralOk: repaired.structuralOk !== false, repairUsed: true, repairKind: "slot", fallbackUsed: true, durationMs: Date.now() - started };
        });
      });
    }).catch(function (error) {
      if (error && error.planFailed) {
        return { ok: false, category: "invalid", issues: error.issues || [], repairUsed: true, fallbackUsed: true, durationMs: Date.now() - started };
      }
      var category = error && error.category ? error.category : "provider";
      return { ok: false, category: category, repairUsed: false, fallbackUsed: true, durationMs: Date.now() - started };
    });
  }

  function loadStory(ctx, lessonPlan, callModel) {
    return Promise.resolve().then(function () {
      return callModel(storyBrief(ctx, lessonPlan), null);
    }).then(function (firstStory) {
      var story = normaliseStory(firstStory, ctx);
      if (story.ok) return story.story;
      return Promise.resolve(callModel(storyRepairBrief(ctx, story.issues, story.previous), story.issues)).then(function (secondStory) {
        var again = normaliseStory(secondStory, ctx);
        return again.ok ? again.story : storyFromPlan(lessonPlan, ctx);
      });
    }).catch(function () {
      return storyFromPlan(lessonPlan, ctx);
    });
  }

  function request(ctx) {
    var cloud = typeof window !== "undefined" ? window.KidsScoreCloud : null;
    var sync = typeof window !== "undefined" && window.SCORE_SYNC ? window.SCORE_SYNC : {};
    function send(token) {
      var headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = "Bearer " + token;
      if (sync.supabaseAnonKey) headers.apikey = sync.supabaseAnonKey;
      var control = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(95000) } : {};
      return fetch("/api/learn/generate", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ context: ctx, attemptId: freshId("try") }),
        signal: control.signal
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false, category: "provider" }; });
      }).then(function (body) {
        if (!body || !body.ok || !body.adventure) return { ok: false, category: (body && body.category) || "provider", stage: body && body.stage || "" };
        var checked = accept(body.adventure, ctx);
        if (!checked.ok) return { ok: false, category: "invalid", issues: checked.issues };
        var meta = body.meta || {};
        checked.adventure.meta = {
          durationMs: meta.durationMs,
          planMs: meta.planMs,
          contentMs: meta.contentMs,
          storyMs: meta.storyMs,
          repairMs: meta.repairMs,
          repairUsed: !!meta.repairUsed,
          fallbackUsed: false
        };
        return { ok: true, adventure: checked.adventure };
      }).catch(function (error) {
        var name = error && error.name;
        return { ok: false, category: name === "TimeoutError" || name === "AbortError" ? "timeout" : "provider", stage: "AI_REQUEST_FAILED" };
      });
    }
    if (!cloud || !cloud.getSession) return Promise.resolve({ ok: false, category: "unauthorised" });
    return new Promise(function (resolve) {
      cloud.getSession(function (session) {
        var token = session && session.access_token;
        if (!token) resolve({ ok: false, category: "unauthorised" });
        else resolve(send(token));
      });
    });
  }

  function qualityChecklist(adventure, ctx) {
    var plan = (adventure && adventure.lessonPlan) || {};
    var activities = (adventure && adventure.activities) || [];
    var blob = blobOf(activities);
    var objective = ((adventure && adventure.objectives) || [])[0] || plan.learningObjective || "";
    var knowledge = plan.keyKnowledge || [];
    var filler = (blob.match(/let's explore|let's discover|great job|can you identify|which of the following/g) || []).length;
    var questions = [];
    activities.forEach(function (activity) {
      ((activity.config && activity.config.questions) || []).forEach(function (item) { questions.push(item); });
    });
    var reasons = questions.filter(function (item) {
      return clean(item.explain).split(/\s+/).filter(Boolean).length >= 6;
    }).length;
    var band = durationBand((ctx && ctx.requestedMinutes) || (adventure && adventure.targetMinutes) || 15);
    var sum = activities.reduce(function (total, activity) { return total + (Number(activity.minutes) || 0); }, 0);
    var recap = activities.filter(function (activity) { return activity.mechanic === "mystery" || /recap/i.test(activity.purpose || ""); });
    var recapText = recap.map(function (activity) { return ((activity.config && activity.config.lines) || []).join(" "); }).join(" ");
    var taughtWord = knowledge.some(function (fact) {
      var word = String(fact || "").toLowerCase().split(/\s+/).filter(function (part) { return part.length > 4; })[0];
      return word && recapText.toLowerCase().indexOf(word) !== -1;
    });
    function row(id, ok, note) {
      return { id: id, ok: !!ok, note: note };
    }
    return [
      row("objective", objective.length > 12, "A clear learning objective."),
      row("age", !!(ctx && (ctx.yearGroup || ctx.yearAssumption || (adventure && adventure.yearAssumption))), "An age or an explicit assumption."),
      row("facts", knowledge.length >= 2, "Key knowledge is recorded for the teacher."),
      row("teach-first", !scoredBeforeTeaching(activities), "A scored question follows teaching."),
      row("sequence", activities.length >= 2 && activities.some(function (activity) { return activity.mechanic === "story" || activity.mechanic === "mystery" || activity.mechanic === "doors"; }), "The sequence teaches and then does something with the idea."),
      row("progression", questions.length < 2 || questions[0].prompt !== questions[questions.length - 1].prompt, "Questions are not the same check repeated."),
      row("purpose", activities.every(function (activity) { return clean(activity.purpose || activity.why); }), "Each activity says why it is there."),
      row("distractors", blob.indexOf("turns into") === -1 && blob.indexOf("disappears") === -1, "Wrong answers are not jokes."),
      row("explanations", !questions.length || reasons === questions.length, "Answers explain the reason."),
      row("vocabulary", !plan.vocabulary || plan.vocabulary.length <= 8, "Vocabulary is a short list."),
      row("filler", filler === 0, "The script avoids stock AI phrases."),
      row("recap", !knowledge.length || !recap.length || taughtWord || blob.indexOf(String(knowledge[0] || "").toLowerCase().split(/\s+/)[0] || "___") !== -1, "The recap uses the taught idea."),
      row("duration", sum >= band.low && sum <= band.high, "The minutes sit in the requested band.")
    ];
  }

  return {
    MECHANICS: MECHANICS,
    durationBand: durationBand,
    contextFrom: contextFrom,
    forModel: forModel,
    planBrief: planBrief,
    contentBrief: contentBrief,
    modelBrief: modelBrief,
    repairBrief: repairBrief,
    planRepairBrief: planRepairBrief,
    storyBrief: storyBrief,
    storyRepairBrief: storyRepairBrief,
    normaliseStory: normaliseStory,
    storyFromPlan: storyFromPlan,
    normalisePlan: normalisePlan,
    repairClass: repairClass,
    localRepairBrief: localRepairBrief,
    slotRepairBrief: slotRepairBrief,
    lessonSkeleton: lessonSkeleton,
    mergeSlotContent: mergeSlotContent,
    contractArc: contractArc,
    qualityChecklist: qualityChecklist,
    accept: accept,
    applySemanticBrief: applySemanticBrief,
    applySemanticDecision: applySemanticDecision,
    parseApplySemantic: parseApplySemantic,
    applyJudgePlan: applyJudgePlan,
    applySemanticInput: applySemanticInput,
    checkSemanticBrief: checkSemanticBrief,
    checkSemanticDecision: checkSemanticDecision,
    parseCheckSemantic: parseCheckSemantic,
    checkJudgePlan: checkJudgePlan,
    checkSemanticInput: checkSemanticInput,
    teacherIntentBrief: teacherIntentBrief,
    normaliseTeacherIntent: normaliseTeacherIntent,
    applyTeacherIntent: applyTeacherIntent,
    conceptCoverageIssues: conceptCoverageIssues,
    resolveLessonContent: resolveLessonContent,
    runPipeline: runPipeline,
    request: request
  };
});
