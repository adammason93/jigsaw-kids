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

  // Intent framing (hypothesis under test, Oct 2026). Years 3 to 6 only.
  // An open-ended topic request gets one explanatory objective; a stated objective
  // is kept as stated. Years 1 and 2, and requests with no known year, keep the
  // original prompt unchanged.
  var EXPLICIT_OBJECTIVE = /\b(?:name|names|naming|label|labels|labelling|labeling|identify|identifying|classify|classifying|sort|sorting|group|grouping|recall|recalling|list|listing|recognise|recognize|describe|describing|compare|comparing|explain|explaining|measure|measuring|calculate|calculating|count|counting|add|adding|subtract|subtracting|multiply|multiplying|divide|dividing|spell|spelling|write|writing|read|reading|use|using|order|ordering|sequence|draw|drawing|plot|locate|find|retell|summarise|summarize|practise|practice|know|learn|memorise|memorize|remember|understand|state|match|solve|investigate|interpret|estimate|convert|punctuate|perform|create|design|make|how|why|what|which|when|where|that)\b/i;
  var INTENT_FRAMING_OPEN = "This request names a topic but states no objective. For this year group, propose one concrete, age-appropriate explanatory learningGoal within the teacher's topic: how something in that topic works or happens, or why it happens or matters. Choose one relationship, not a list of types, names, or facts. Stay within the topic the teacher gave. requiredEvidence then names that how or why relationship, and focusConcepts are the ideas needed for it.";
  var INTENT_FRAMING_EXPLICIT = "The teacher states an objective. Keep that objective as stated in learningGoal, whether it is naming, labelling, identifying, classifying, sorting, recalling facts, a skill, or an explanation. Do not rewrite it as a how or why objective, and do not add an explanation the teacher did not ask for.";

  function intentFraming(ctx) {
    var raw = clean((ctx && (ctx.lessonText || ctx.teacherInstructions)) || "", 500);
    var yearText = clean(ctx && ctx.yearGroup, 20) || ((raw.match(/\byear\s*[1-6]\b/i) || [])[0] || "");
    var year = Number((yearText.match(/[1-6]/) || [])[0] || 0);
    if (year < 3 || year > 6) return { mode: "unchanged", year: year || null };
    var request = raw.replace(/\byear\s*[1-6]\b/gi, " ");
    return { mode: EXPLICIT_OBJECTIVE.test(request) ? "preserve-explicit" : "explanatory-objective", year: year };
  }

  function teacherIntentBrief(ctx) {
    var raw = clean((ctx && (ctx.lessonText || ctx.teacherInstructions)) || "", 500);
    var framing = intentFraming(ctx);
    var framingLine = framing.mode === "explanatory-objective" ? [INTENT_FRAMING_OPEN] : framing.mode === "preserve-explicit" ? [INTENT_FRAMING_EXPLICIT] : [];
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
        "requiredEvidence is one short statement of what a pupil must show before the teacher can conclude the learning goal was achieved. Name the thinking the pupil does and the content or relationship that must be covered. A comparison names both sides. A sequence names the whole order, not one stage. Using or measuring is not replaced by naming or defining. Do not make the evidence harder than the goal. Do not turn prior knowledge, exclusions, or presentation preferences into the evidence unless they are the goal itself. Do not put a count of types, kinds, examples, or features into requiredEvidence unless the teacher asked for that count.",
        "Do not invent a different topic. If the request is unclear, keep learningGoal close to what was asked and leave uncertain fields empty."
      ].concat(framingLine, [
        "JSON shape: {\"yearGroup\":\"\",\"subject\":\"\",\"subjectConfidence\":\"explicit\" or \"inferred\" or \"uncertain\",\"learningGoal\":\"\",\"requiredEvidence\":\"\",\"focusConcepts\":[],\"priorKnowledge\":[],\"exclusions\":[],\"preferences\":[],\"durationMinutes\":null}."
      ]).join(" "),
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
    var evidence = evidenceWithoutInventedQuota(clean(body.requiredEvidence, 280), (ctx && (ctx.lessonText || ctx.teacherInstructions)) || "");
    if (evidence.length < 16 || listedAs(prior, evidence) || listedAs(exclusions, evidence) || listedAs(preferences, evidence)) {
      return { ok: false, reason: "missing-evidence" };
    }
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
      requiredEvidence: evidence,
      focusConcepts: focus,
      priorKnowledge: prior,
      exclusions: exclusions,
      preferences: preferences,
      durationMinutes: minutes
    };
  }

  var QUOTA_WORD = { "2": "two", "3": "three", "4": "four", "5": "five", "6": "six" };

  function requestHasCount(request, count) {
    var text = String(request || "").toLowerCase().replace(/\byear\s*[1-6]\b/g, " ");
    var word = QUOTA_WORD[count] || String(count || "").toLowerCase();
    if (!word) return false;
    if (new RegExp("\\b" + word + "\\b").test(text)) return true;
    var digit = "";
    Object.keys(QUOTA_WORD).forEach(function (key) { if (QUOTA_WORD[key] === word) digit = key; });
    return !!digit && new RegExp("\\b" + digit + "\\b").test(text);
  }

  // A count of types or features is a requirement only when the teacher asked for it.
  // An invented count is removed. A count the teacher asked for is kept.
  function evidenceWithoutInventedQuota(evidence, request) {
    var next = String(evidence || "").replace(/\b(?:at least\s+|more than\s+)?(two|three|four|five|six|\d+)\s+different\s+(?=(?:types|kinds|examples|features|characteristics)\b)/gi, function (phrase, count) {
      return requestHasCount(request, count) ? phrase : "";
    }).replace(/\b(?:at least\s+|more than\s+)?(two|three|four|five|six|\d+)\s+(?=(?:types|kinds|examples|features|characteristics)\b)/gi, function (phrase, count) {
      return requestHasCount(request, count) ? phrase : "";
    }).replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
    if (clean(next, 280).length < 16) return evidence;
    return next;
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
    ctx.lessonBrief.requiredEvidence = intent.requiredEvidence;
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

  var PACK_PROVENANCE = { model: 1, teacher_material: 1, retrieved: 1, curated: 1, curriculum_planning: 1 };
  var PACK_KIND = { fact: 1, mechanism: 1, definition: 1, process: 1, caveat: 1, concept: 1, example: 1 };
  var PACK_STRIP = { lessonArc: 1, beats: 1, questions: 1, activities: 1, narrative: 1, narrativeTheme: 1, pupilWording: 1, stages: 1, lessonPlan: 1, interactions: 1 };

  function stableClaimId(text) {
    var norm = clean(text, 180).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    var hash = 5381;
    var i;
    for (i = 0; i < norm.length; i++) {
      hash = ((hash << 5) + hash) ^ norm.charCodeAt(i);
      hash = hash | 0;
    }
    return "c" + (hash >>> 0).toString(36);
  }

  function claimOverlap(text, corpus) {
    var left = contentWords(text);
    if (!left.length) return 0;
    var right = contentWords(corpus);
    var shared = 0;
    left.forEach(function (word) {
      if (right.some(function (other) { return sameStem(word, other); })) shared += 1;
    });
    return shared / left.length;
  }

  function wordCovered(word, claimWords) {
    return claimWords.some(function (other) {
      if (sameStem(word, other)) return true;
      return word.length >= 4 && other.length >= 4 && word.slice(0, 4) === other.slice(0, 4);
    });
  }

  function wordsCovered(text, claims) {
    var pointWords = contentWords(text);
    if (!pointWords.length) return false;
    var claimWords = [];
    (claims || []).forEach(function (claim) {
      contentWords(claim && claim.text).forEach(function (word) { claimWords.push(word); });
    });
    return pointWords.every(function (word) { return wordCovered(word, claimWords); });
  }

  // Source-grounded packs (Oct 2026). Research mode is on only when ctx.researchEvidence
  // carries passages that were fetched from allowlisted pages. Search snippets are never
  // passages. A claim is admitted only when its quote is found, verbatim after whitespace,
  // case, and typographic-quote normalisation, in a passage it cites. The automated
  // entailment check runs after that. Neither step is human verification, and model
  // confidence is never read as support. factuallyVerified stays false.
  var SOURCE_SUPPORT_LABEL = "quote-verified + automated entailment check";
  var SOURCE_QUOTE_MIN_WORDS = 5;

  function quoteKey(value) {
    var text = String(value == null ? "" : value);
    if (text.normalize) text = text.normalize("NFKC");
    return text
      .replace(/[\u2018\u2019\u201a\u201b\u2032`]/g, "'")
      .replace(/[\u201c\u201d\u201e\u201f\u2033]/g, "\"")
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
      .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function trimQuote(value) {
    return quoteKey(value).replace(/^["'\s]+|["'\s]+$/g, "").replace(/^[.,;:]+|[,;:]+$/g, "").trim();
  }

  // Verbatim containment after normalisation. Ellipses are refused: one contiguous extract.
  function quoteInPassage(quote, passageText) {
    var needle = trimQuote(quote);
    if (!needle) return { ok: false, reason: "QUOTE_MISSING" };
    if (/\.\.\.|\u2026/.test(String(quote || ""))) return { ok: false, reason: "QUOTE_NOT_CONTIGUOUS" };
    if (needle.split(/\s+/).filter(Boolean).length < SOURCE_QUOTE_MIN_WORDS) return { ok: false, reason: "QUOTE_TOO_SHORT" };
    var hay = quoteKey(passageText);
    if (hay.indexOf(needle) !== -1) return { ok: true, reason: "" };
    var bare = needle.replace(/[.!?]+$/, "");
    if (bare && bare.split(/\s+/).length >= SOURCE_QUOTE_MIN_WORDS && hay.indexOf(bare) !== -1) return { ok: true, reason: "" };
    return { ok: false, reason: "QUOTE_NOT_FOUND" };
  }

  // Source tiers (patch 6): only evidence-tier passages (museums, universities, scientific
  // organisations, government bodies, established educational publishers) may support a
  // pupil-facing fact. Wikipedia and Simple English Wikipedia are discovery only.
  var DISCOVERY_ONLY_URL = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:wikipedia|wikimedia|wikibooks|wikiversity|wiktionary|fandom)\.(?:org|com)(?:[\/?#]|$)/i;
  function passageIsEvidence(item) {
    if (!item) return false;
    if (item.tier && item.tier !== "evidence") return false;
    return !DISCOVERY_ONLY_URL.test(String(item.url || ""));
  }

  function researchPassages(ctx) {
    var evidence = ctx && ctx.researchEvidence;
    var list = evidence && Array.isArray(evidence.passages) ? evidence.passages : null;
    if (!list || !list.length) return null;
    var byId = {};
    list.forEach(function (item) {
      if (item && item.id && item.text) byId[String(item.id)] = item;
    });
    return Object.keys(byId).length ? byId : null;
  }

  function sourceRefsOf(item) {
    var raw = item && (item.sourceRef != null ? item.sourceRef : (item.sourceRefs != null ? item.sourceRefs : item.passageIds));
    var list = Array.isArray(raw) ? raw : (raw == null || raw === "" ? [] : String(raw).split(/[\s,;]+/));
    var out = [];
    list.forEach(function (ref) {
      var id = clean(ref && typeof ref === "object" ? (ref.id || ref.passageId) : ref, 40);
      if (id && out.indexOf(id) === -1) out.push(id);
    });
    return out.slice(0, 4);
  }

  // Resolves the cited passage ids and checks the quote. A claim with no resolvable
  // passage, or a quote that is not in a cited passage, is not admitted.
  function sourceCheck(item, passages) {
    var refs = sourceRefsOf(item);
    var quote = clean(item && (item.quote || item.sourceQuote || item.supportingQuote), 400);
    if (!refs.length) return { ok: false, reason: "UNRESOLVED_SOURCE", refs: [], quote: quote };
    var resolved = refs.filter(function (id) { return !!passages[id]; });
    if (!resolved.length) return { ok: false, reason: "UNRESOLVED_SOURCE", refs: refs, quote: quote };
    var found = resolved.filter(function (id) { return passageIsEvidence(passages[id]); });
    if (!found.length) return { ok: false, reason: "SOURCE_NOT_EVIDENCE", refs: resolved, quote: quote };
    var verdict = { ok: false, reason: "QUOTE_MISSING" };
    var matched = "";
    found.forEach(function (id) {
      if (verdict.ok) return;
      var check = quoteInPassage(quote, passages[id].text);
      if (check.ok) { verdict = check; matched = id; }
      else if (verdict.reason === "QUOTE_MISSING" || check.reason === "QUOTE_NOT_FOUND") verdict = check;
    });
    if (!verdict.ok) return { ok: false, reason: verdict.reason, refs: found, quote: quote };
    var ordered = [matched].concat(found.filter(function (id) { return id !== matched; }));
    return {
      ok: true,
      refs: ordered,
      quote: quote,
      passageText: String(passages[matched].text || ""),
      urls: ordered.map(function (id) { return clean(passages[id].url, 300); }),
      titles: ordered.map(function (id) { return clean(passages[id].title, 160); })
    };
  }

  function researchPassagesForBrief(ctx) {
    var evidence = (ctx && ctx.researchEvidence) || {};
    var all = Array.isArray(evidence.passages) ? evidence.passages : [];
    var chosen = Array.isArray(evidence.selectedPassageIds) && evidence.selectedPassageIds.length ? evidence.selectedPassageIds : null;
    var list = (chosen ? all.filter(function (item) { return chosen.indexOf(item.id) !== -1; }) : all).filter(passageIsEvidence);
    return list.slice(0, 40).map(function (item) {
      return { id: clean(item.id, 40), title: clean(item.title, 160), section: clean(item.section, 120), url: clean(item.url, 300), text: clean(item.text, 1600) };
    });
  }

  // Sentences in the passages that state a cause, purpose or result in their own words.
  // Listing them points the model at quotes that can carry a mechanism; it adds no fact and
  // changes no check (the link gate still reads the quote the model picks).
  function linkSentencesForBrief(ctx) {
    var out = [];
    researchPassagesForBrief(ctx).forEach(function (item) {
      String(item.text || "").split(/(?<=[.!?])\s+(?=[A-Z"'(])/).forEach(function (sentence) {
        var text = clean(sentence, 320);
        if (out.length >= 40 || text.split(/\s+/).length < 6 || !quoteStatesLink(text)) return;
        out.push({ sourceRef: item.id, sentence: text });
      });
    });
    return out;
  }

  function researchPackBrief(ctx) {
    return {
      system: [
        "You select and adapt subject knowledge for one primary lesson from retrieved source passages. Return one JSON object and nothing else.",
        "Do not write a lesson, stages, activities, beats, questions, interactions, narrative, or pupil wording.",
        "sources in the request are passages fetched from trusted pages. They are the only factual source in this step. Do not use your own knowledge to add a fact, name, date, number, cause, or feature that the passages do not state. A claim that no passage supports must be left out.",
        "Every claim, mechanism, and vocabulary item carries sourceRef, an array of one or two passage ids from sources, and quote, one contiguous extract of 6 to 40 words copied character for character from one cited passage that supports the claim. Do not join extracts, do not use an ellipsis, and do not change words inside the quote. Code checks the quote against the passage. A claim whose quote is not found in a cited passage is dropped.",
        "The claim text may use simpler words for the year group, but it must keep the meaning of the quote and must not add anything the quote does not say. Keep a hedge such as may, probably, or scientists think when the source hedges.",
        "Write a knowledge pack with more claims than one lesson will teach. A later step selects a subset for the year, the goal, and the duration. Each claim is one sentence a teacher could check against its quote. Tag depth as concrete, mechanism, or system.",
        "teacherIntent.learningGoal is the objective. Aim the pack at that objective while staying inside the teacher's topic. strandPairsRequired is how many distinct feature-and-explanation pairs this lesson needs. A pair is two separate claims. The feature claim is concrete and names one feature, part, or piece of evidence in at least six words. The mechanism claim says how or why that same feature works or what it shows, and it states the link in words such as because, so that, so it could, which lets, which means, or allowed. A sentence that only names the feature, or only says it helped, is not the explanation. Both claims of a pair cite passages that support them. The mechanism's own quote must state the how or why, for example what the feature was used for, what it did, or why it worked. A quote that only names or lists the feature does not support a mechanism, even when the feature claim uses the same quote. Do not add a purpose, cause, or result that the quote does not state. If no passage states how or why a feature works, leave that pair out. Write the mechanism with the working part and what it does, the way a passage states it, for example \"long legs let them take longer strides, so they could run faster\", but only when a passage says so. \"X helped them Y\" on its own does not say how: write what the feature did, using the passage's own link words such as allowed, let, so, because, or used to. A claim that links two facts needs a quote that states that link; two facts a passage only lists side by side are not a link.",
        "linkSentences lists sentences from the passages that state a cause, purpose, or result in their own words. A mechanism quote should come from one of them or from another sentence that states the link itself. A feature claim says only what its own quote says; do not add a detail from the next sentence.",
        "mechanisms repeats each mechanism claim with the same text, sourceRef, and quote, plus feature: a short phrase of two to four words copied from its feature claim. The words of that feature phrase must appear in the feature claim and the mechanism claim, and in no other claim, so the pair is unambiguous. Each pair must be a different teaching idea about a different feature. Supply strandPairsRequired pairs when the passages support them. If the passages support fewer, supply fewer. Never invent a feature or a function to reach the number.",
        "ageFit is { from, to } using years 1 to 6. Concrete claims can start at Year 1. A simple mechanism may start at Year 2. A harder mechanism starts at Year 3 or 4. A system claim starts at Year 5 or 6. Leave out passage content that is not suitable for the requested year, such as graphic injury or frightening detail.",
        "provenance is retrieved for every claim. factuallyVerified must be false: a quote shows where a claim came from, and it is not human verification. confidence is high, medium, or low, and it is not evidence. teacherRequested is true only when the teacher asked for that specific claim.",
        "Do not state a counted list of main types, kinds, or groups unless a cited passage states that list. contested is true when the passages say scientists disagree or are unsure; put that in uncertainty.",
        "If the request assumes something false, set falsePremise to a short statement of that assumption and admit a correction, with correctsPremise true, only when a passage supports it. status is usable when the claims are ordinary, qualified when a claim is contested or support is thin, and blocked when the passages cannot support a lesson on the topic.",
        "vocabulary is words worth knowing, each with a short gloss supported by its quote. misconceptions are optional mistakes children make, each with corrects naming the claim that corrects it. A misconception is not a fact to teach.",
        "JSON shape: { status, falsePremise, blockReason, niche, claims: [{ text, kind, depth, confidence, provenance, sourceRef: [], quote, teacherRequested, factuallyVerified, contested, uncertainty, ageFit: { from, to }, correctsPremise, importance, accepted }], mechanisms: [{ text, feature, sourceRef: [], quote }], concepts: [], vocabulary: [{ term, gloss, sourceRef: [], quote }], misconceptions: [{ text, corrects }], openQuestions: [] }."
      ].join(" "),
      user: JSON.stringify({
        request: clean(ctx.lessonText || ctx.teacherInstructions || "", 4000),
        yearGroup: clean(ctx.yearGroup, 20),
        subject: clean(ctx.subject, 40),
        topic: clean(ctx.topic, 120),
        requestedMinutes: ctx.requestedMinutes || null,
        teacherIntent: (ctx.lessonBrief && ctx.lessonBrief.teacherIntent) || null,
        strandPairsRequired: strandsRequiredFor(ctx),
        sources: researchPassagesForBrief(ctx),
        linkSentences: linkSentencesForBrief(ctx),
        curriculumContext: "England primary. The curriculum note is planning guidance only. It is not a factual source in this step."
      })
    };
  }

  // One automated entailment pass over quote-verified claims. It labels support; it does
  // not verify. A claim without a supported verdict is held out of the lesson.
  function sourceEntailmentBrief(pack, ctx) {
    var passages = researchPassages(ctx) || {};
    var items = ((pack && pack.claims) || []).filter(function (claim) {
      return claim && claim.provenance === "retrieved" && claim.quoteVerified;
    }).slice(0, 24).map(function (claim) {
      var first = passages[(claim.sourceRef || [])[0]] || {};
      var item = { claimId: claim.claimId, claim: claim.text, quote: claim.sourceQuote, passage: clean(first.text, 1600) };
      if ((claim.wordsNotInSource || []).length) item.wordsNotInSource = claim.wordsNotInSource.slice();
      return item;
    });
    return {
      system: [
        "You check whether a source extract supports a sentence written for a primary lesson. Return one JSON object and nothing else.",
        "For each item, read quote and its passage. verdict is supported only when the quote, read in its passage, states everything the claim says. Simpler wording for children is fine when the meaning is the same. verdict is partial when part of the claim is supported and part is added. verdict is unsupported when the claim adds a fact, number, name, cause, purpose, or generalisation the quote does not state, drops a hedge the source keeps, or contradicts it. When the claim links two things with which, so, because, helped, allowed, or to, the quote must state that link. Two facts that the quote only lists side by side do not support a link between them.",
        "Do not use your own knowledge to fill a gap. Do not judge whether the claim is true in the world, only whether this quote supports it.",
        "linkQuote: when the claim states a purpose, cause, result, or how-or-why link and you judge it supported, copy the exact words from quote (at least five, no ellipsis) that state that link. Code checks them. Otherwise linkQuote is an empty string.",
        "wordsNotInSource lists claim words that appear in neither the quote nor its passage. Put each one either in wording, when it is only simpler wording for words in the quote, or in addedFacts, when the claim uses it to state something the quote does not say (for example a place, a part, a habit, a speed, or a purpose). A claim with any addedFacts is not supported. A word you do not place counts as added.",
        "JSON shape: { \"results\": [{ \"claimId\": \"\", \"verdict\": \"supported\" or \"partial\" or \"unsupported\", \"missing\": \"\", \"linkQuote\": \"\", \"wording\": [], \"addedFacts\": [] }] }."
      ].join(" "),
      user: JSON.stringify({ items: items })
    };
  }

  // Claim words that appear in neither the quote nor its passage (topic words aside). The
  // entailment step must account for each one as simpler wording; anything else holds the
  // claim (live case: "Dinosaurs laid eggs in nests" from "Like other reptiles, they laid
  // eggs.", where the passage never mentions nests).
  var SOURCE_WORD_STOP = { the: 1, and: 1, that: 1, this: 1, with: 1, from: 1, into: 1, they: 1, them: 1, their: 1, there: 1, these: 1, those: 1, were: 1, have: 1, been: 1, being: 1, some: 1, many: 1, most: 1, more: 1, much: 1, very: 1, also: 1, than: 1, then: 1, which: 1, what: 1, when: 1, where: 1, while: 1, would: 1, could: 1, should: 1, might: 1, about: 1, other: 1, such: 1, like: 1, each: 1, every: 1, only: 1, just: 1, does: 1, did: 1, done: 1, make: 1, made: 1, makes: 1, help: 1, helps: 1, helped: 1, helping: 1, lets: 1, allowed: 1, allow: 1, allows: 1, because: 1, over: 1, onto: 1, upon: 1, your: 1, its: 1, it: 1 };
  function sourceWords(text) {
    return String(text || "").toLowerCase().replace(/[\u2019']s\b/g, "").split(/[^a-z]+/).filter(function (word) { return word.length >= 4 && !SOURCE_WORD_STOP[word]; });
  }
  function sourceStem(word) { return word.replace(/ies$/, "y").replace(/(?:es|s|ed|ing|ly)$/, "").slice(0, 5); }
  function wordsNotInSource(claimText, quote, passageText, topic) {
    var have = {};
    sourceWords([quote, passageText, topic].join(" ")).forEach(function (word) { have[sourceStem(word)] = 1; });
    var out = [];
    sourceWords(claimText).forEach(function (word) { if (!have[sourceStem(word)] && out.indexOf(word) === -1) out.push(word); });
    return out.slice(0, 12);
  }

  function parseSourceEntailment(raw) {
    var body = raw && typeof raw === "object" ? raw : null;
    var rows = body && Array.isArray(body.results) ? body.results : null;
    if (!rows) return { ok: false, results: {} };
    var out = {};
    rows.forEach(function (row) {
      if (!row || typeof row !== "object") return;
      var id = clean(row.claimId, 40);
      var verdict = clean(row.verdict, 20).toLowerCase();
      if (!id || (verdict !== "supported" && verdict !== "partial" && verdict !== "unsupported")) return;
      function list(value) { return (Array.isArray(value) ? value : []).map(function (word) { return clean(word, 40).toLowerCase(); }).filter(Boolean).slice(0, 20); }
      out[id] = { verdict: verdict, missing: clean(row.missing, 200), linkQuote: clean(row.linkQuote, 300), wording: list(row.wording), addedFacts: list(row.addedFacts) };
    });
    return { ok: true, results: out };
  }

  // A claim that links a feature to a purpose, cause or result needs a quote that states
  // that link itself. Two facts that a passage only lists side by side (for example
  // "had feathers, and were probably warm-blooded") do not support "feathers helped
  // them stay warm". This runs in code after the model verdict and can only hold a claim.
  var CLAIM_LINK = /\b(?:because|so that|so (?:it|they|that|the|its|their)\b|which (?:may have |might have |probably )?(?:help(?:ed|s)?|let|lets|allowed|allows|meant|means|made|makes|kept|keeps|gave|gives|enabled|enables)|help(?:ed|s)?|help (?:it|them)|allow(?:s|ed|ing)?|enabl(?:e|es|ed|ing)|lets? (?:it|them|the|a)|in order to|to help|for (?:protection|defen[cs]e|safety)|used (?:for|to)|as a result|caus(?:e|es|ed|ing)|therefore|thanks to|meaning|made it possible)\b/i;
  var QUOTE_LINK = /\b(?:because|so that|so (?:it|they|that|the|its|their)\b|which (?:may have |might have |probably )?(?:help(?:ed|s)?|let|lets|allowed|allows|meant|means|made|makes|kept|keeps|gave|gives|enabled|enables)|help(?:ed|s)?|help(?:ing)? (?:it|them|to)|allow(?:s|ed|ing)?|enabl(?:e|es|ed|ing)|lets? (?:it|them|the|a)|in order to|to help|for (?:protection|defen[cs]e|safety|eating|fighting|display)|used (?:for|to|as)|as a result|caus(?:e|es|ed|ing)|therefore|thus|hence|thanks to|meaning|made it possible|reasons?|why|this (?:allowed|meant|made|let|help(?:ed)?|gave|would|means|makes|lets)|would (?:make|have|help|allow)|gave (?:it|them)|to (?:protect|defend|reach|catch|eat|grind|crush|slice|tear|cut|support|keep|stay|run|move|attract|show|scare|fight|hunt|find|breathe|cool|warm|walk|swim|fly|bite|chew|hold|carry|balance|signal|communicate))\b/i;

  // The link words a linkQuote must contain: QUOTE_LINK without its bare "to + verb" branch.
  var LINK_WORDS = new RegExp(QUOTE_LINK.source.replace(/\|to \(\?:protect[^)]*\)\)\\b$/, ")\\b"), "i");
  function claimStatesLink(text) { return CLAIM_LINK.test(String(text || "")); }
  function quoteStatesLink(text) { return QUOTE_LINK.test(String(text || "")); }

  function applySourceEntailment(pack, parsed) {
    if (!pack || pack.sourceMode !== "retrieved") return pack;
    var results = (parsed && parsed.ok && parsed.results) || {};
    var counts = { supported: 0, partial: 0, unsupported: 0, unchecked: 0 };
    (pack.claims || []).forEach(function (claim) {
      if (claim.provenance !== "retrieved") return;
      var row = results[claim.claimId];
      var verdict = row ? row.verdict : "unchecked";
      var note = row ? row.missing : "no entailment verdict was returned";
      if (verdict === "supported" && claimStatesLink(claim.text) && !quoteStatesLink(claim.sourceQuote)) {
        verdict = "unsupported";
        note = "LINK_NOT_IN_QUOTE: the claim states a purpose, cause or result, and the quote does not state that link.";
        counts.linkHeld = (counts.linkHeld || 0) + 1;
      }
      // Link-quote rule: a how/why claim needs the exact passage words that state the link.
      // They must sit inside the claim's own verified quote and use link words themselves.
      if (verdict === "supported" && claimStatesLink(claim.text)) {
        var linkQuote = row && row.linkQuote || "";
        var linkOk = linkQuote.split(/\s+/).filter(Boolean).length >= 5 && quoteKey(claim.sourceQuote).indexOf(quoteKey(linkQuote)) !== -1 && LINK_WORDS.test(linkQuote);
        if (linkOk) claim.linkQuote = linkQuote;
        else {
          verdict = "partial";
          note = "LINK_NOT_QUOTED: the check did not give words from the quote that state the how-or-why link" + (linkQuote ? " (gave \"" + clean(linkQuote, 120) + "\")" : "") + ".";
          counts.linkNotQuoted = (counts.linkNotQuoted || 0) + 1;
        }
      }
      // Added-detail rule: every claim word absent from the quote and passage must be
      // accounted for as simpler wording.
      if (verdict === "supported" && (claim.wordsNotInSource || []).length) {
        var wording = (row && row.wording) || [];
        var addedFacts = (row && row.addedFacts) || [];
        var unexplained = claim.wordsNotInSource.filter(function (word) { return wording.indexOf(word) === -1 || addedFacts.indexOf(word) !== -1; });
        if (unexplained.length) {
          verdict = "partial";
          note = "ADDED_DETAIL: the claim adds words its source does not state (" + unexplained.join(", ") + ").";
          counts.addedDetail = (counts.addedDetail || 0) + 1;
        }
      }
      claim.entailment = verdict;
      claim.entailmentNote = note;
      counts[verdict] += 1;
      if (verdict === "supported") {
        claim.sourceSupport = SOURCE_SUPPORT_LABEL;
        claim.sourceHold = false;
        claim.provenanceNote = "retrieved; quote found verbatim in cited passage; automated entailment check: supported; not human-verified";
      } else {
        claim.sourceSupport = "quote-verified; automated entailment check: " + verdict;
        claim.sourceHold = true;
        claim.provenanceNote = "retrieved; quote found verbatim; automated entailment check: " + verdict + "; held out of the lesson";
      }
      claim.factuallyVerified = false;
    });
    pack.sourceAudit = pack.sourceAudit || {};
    pack.sourceAudit.entailment = counts;
    pack.sourceAudit.entailmentRan = !!(parsed && parsed.ok);
    if (!(pack.claims || []).some(function (claim) { return claim.provenance === "retrieved" && !claim.sourceHold; }) && pack.status !== "blocked") {
      pack.status = "blocked";
      pack.needsSource = true;
      pack.localAdmission = "needs_source";
      pack.statusReason = "NEEDS_SOURCE: no retrieved claim passed the quote check and the automated entailment check.";
    }
    return pack;
  }

  function closestSentence(quote, text) {
    var want = quoteKey(quote).split(/[^a-z0-9']+/).filter(function (w) { return w.length > 2; });
    if (!want.length) return "";
    var best = "";
    var bestScore = 0;
    String(text || "").split(/(?<=[.!?])\s+/).forEach(function (sentence) {
      var have = quoteKey(sentence);
      var score = want.filter(function (w) { return have.indexOf(w) !== -1; }).length / want.length;
      if (score > bestScore) { bestScore = score; best = sentence.trim(); }
    });
    return bestScore >= 0.5 ? clean(best, 400) : "";
  }

  // The exact reasons each item failed, for one source-repair call. Feedback only: the
  // repaired pack goes back through the same quote check, entailment and readiness gate.
  function sourceRepairFeedback(pack, selection, readiness, ctx) {
    var passages = researchPassages(ctx) || {};
    var rows = [];
    ((pack && pack.sourceAudit && pack.sourceAudit.rejected) || []).forEach(function (row) {
      var item = { item: row.text, problem: row.reason, cited: row.sourceRef || [], quoteGiven: row.quote || "" };
      if (row.reason === "QUOTE_NOT_FOUND" || row.reason === "UNRESOLVED_SOURCE") {
        var elsewhere = Object.keys(passages).filter(function (id) { return row.quote && quoteInPassage(row.quote, passages[id].text).ok; });
        if (elsewhere.length) {
          item.problem = "WRONG_PASSAGE";
          item.fix = "The quote is in " + elsewhere.join(", ") + ", not in the cited passage. Cite the passage that contains it.";
        } else {
          var near = "";
          (row.sourceRef || []).some(function (id) { near = passages[id] ? closestSentence(row.quote, passages[id].text) : ""; return !!near; });
          item.problem = row.reason === "UNRESOLVED_SOURCE" ? "UNRESOLVED_SOURCE" : "REWORDED_QUOTE";
          item.fix = near
            ? "The quote was reworded. The closest sentence in the cited passage is: \"" + near + "\". Copy a quote character for character, or drop the item if that sentence does not support it."
            : "No cited passage contains this quote. Copy a quote character for character from a passage that supports the item, or drop the item.";
        }
      } else if (row.reason === "SOURCE_NOT_EVIDENCE") {
        item.fix = "The cited passage is from a discovery-only source (for example Wikipedia). It cannot support a pupil-facing fact. Cite a passage from a museum, university, scientific organisation, government body or educational publisher that states it, or drop the item.";
      } else if (row.reason === "QUOTE_NOT_CONTIGUOUS") {
        item.fix = "Use one contiguous extract with no ellipsis.";
      } else if (row.reason === "QUOTE_TOO_SHORT") {
        item.fix = "Use a quote of at least six words.";
      }
      rows.push(item);
    });
    ((pack && pack.claims) || []).forEach(function (claim) {
      if (claim.provenance !== "retrieved" || !claim.sourceHold) return;
      rows.push({
        item: claim.text,
        claimId: claim.claimId,
        problem: "ENTAILMENT_" + String(claim.entailment || "unchecked").toUpperCase(),
        cited: claim.sourceRef || [],
        quoteGiven: claim.sourceQuote || "",
        fix: (claim.entailmentNote ? claim.entailmentNote + " " : "") + "Rewrite the claim so it says only what the quote states, or cite a quote that states the link, or drop it."
      });
    });
    var MECHANISM_FIX = "A mechanism must state how or why the feature works, in words such as because, so it could, which lets, allowed, or let, as the passage states it. A verb such as helped with no stated job (\"features helped dinosaurs\") does not state a mechanism. The feature phrase must appear in exactly one concrete feature claim.";
    var goalList = [];
    goalWords(ctx).forEach(function (word) { if (goalList.indexOf(word) === -1) goalList.push(word); });
    ((readiness && readiness.pairs) || []).forEach(function (pair) {
      if (pair.ready) return;
      var gaps = pair.gaps || [];
      var irrelevant = gaps.some(function (gap) { return /not relevant to the learning goal/.test(gap); });
      var otherGaps = gaps.some(function (gap) { return !/not relevant to the learning goal/.test(gap); });
      // A pair held only for relevance has a working mechanism. The relevance check is a word
      // match against the goal, so say which words it reads instead of the mechanism advice.
      var fix = irrelevant
        ? "Code could not link this pair to the learning goal: no word of the feature claim or explanation matches a goal word (" + goalList.slice(0, 16).join(", ") + "). If the passage supports it, keep the pair and rewrite this explanation item so it uses one of those words, for example adding the topic word to the name of a group the passage places in the topic, or saying what the feature did in the goal's terms. Keep the same quote. Add only wording the passage supports; never add a fact." + (otherGaps ? " " + MECHANISM_FIX : "")
        : MECHANISM_FIX;
      rows.push({
        item: pair.explanation || "",
        problem: irrelevant && !otherGaps ? "PAIR_NOT_LINKED_TO_GOAL" : "PAIR_NOT_READY",
        feature: pair.feature || "",
        gaps: gaps.slice(0, 4),
        fix: fix
      });
    });
    return rows.slice(0, 40);
  }

  function sourceRepairBrief(pack, selection, readiness, ctx) {
    var first = researchPackBrief(ctx);
    var previous = ((pack && pack.claims) || []).map(function (claim) {
      return { claimId: claim.claimId, text: claim.text, depth: claim.depth, ageFit: claim.ageFit || null, sourceRef: claim.sourceRef || [], quote: claim.sourceQuote || "", entailment: claim.entailment || "", held: !!claim.sourceHold };
    });
    var readyPairs = ((readiness && readiness.pairs) || []).filter(function (pair) { return pair.ready; }).map(function (pair) { return { feature: pair.feature, featureClaimId: pair.featureClaimId, explanation: pair.explanation }; });
    var user = JSON.parse(first.user);
    user.previousPack = { claims: previous, mechanisms: ((pack && pack.mechanisms) || []).map(function (m) { return { text: m.text, feature: m.feature }; }) };
    user.rejections = sourceRepairFeedback(pack, selection, readiness, ctx);
    user.readiness = { requiredPairs: readiness && readiness.requiredPairs, readyPairCount: readiness && readiness.distinctReady, readyPairs: readyPairs };
    return {
      system: first.system + " This is the single repair of a knowledge pack that failed checks. rejections lists each failed item with the exact problem and how to fix it. Return a complete new knowledge pack in the same JSON shape. Copy every claim that passed (held is false and it is not in rejections) and every pair in readiness.readyPairs unchanged, with the same text, sourceRef, quote, and ageFit. Fix an item only from the sources; if the sources cannot support it, drop it. The repaired pack goes through the same quote check, entailment check, and readiness check. There is no further repair.",
      user: JSON.stringify(user)
    };
  }

  function knowledgePackBrief(ctx) {
    ctx = ctx || {};
    if (researchPassages(ctx)) return researchPackBrief(ctx);
    return {
      system: [
        "You ground subject knowledge for one primary lesson. Return one JSON object and nothing else.",
        "Do not write a lesson, stages, activities, beats, questions, interactions, narrative, or pupil wording.",
        "Write a knowledge pack with more true claims than one lesson will teach. A later step selects a subset for the year, the goal, and the duration.",
        "Each claim is one sentence a teacher could check. Include concrete claims a child can observe or name, mechanism claims that say how or why, and system claims that say how several mechanisms work together. A mechanism names one concrete feature and the job that feature does, in words a child in the requested year can say. When the topic is broad, include several mechanisms, each about a different feature, and only when that feature and its job can be stated without guessing. A sentence that only says the subject is adapted, or that an environment influenced its features or behaviour, is not a mechanism. Do not invent a feature or a function to widen the pack. Tag depth as concrete, mechanism, or system.",
        "strandPairsRequired in the request is how many distinct feature-and-explanation pairs this lesson's breadth needs. A pair is two selected claims: a concrete claim that names one feature or concept, and a different mechanism claim that states how or why that feature works. The mechanisms list repeats each explanation. Its feature field is a short phrase copied from the naming claim, not a new fact. Each pair must be a different teaching idea. Two explanations of the same feature count as one pair. An id on its own is not a pair, and a sentence that only names the feature is not the explanation. Supply that many pairs when the feature and the function can be stated without guessing. Do not invent a feature or a function to reach the number. factuallyVerified stays false: a complete pair is not verification, and verification is not a pair.",
        "ageFit is { from, to } using years 1 to 6. Concrete claims can start at Year 1. A simple mechanism may start at Year 2. A harder mechanism starts at Year 3 or 4. A system claim starts at Year 5 or 6. Age fit is metadata. Do not write a different lesson for each year.",
        "confidence is high, medium, or low. If you are unsure of a name, date, measurement, or local detail, omit that claim. Do not invent it. A named place by itself is allowed. Do not bind that place to specific geology, a mechanism, a date, or a cause unless the teacher material states that binding. High confidence does not make a local binding true, and it does not verify a claim. Do not state a counted list of main types, kinds, or groups unless the teacher asked for that count or the teacher material states that list. If the lesson cannot be taught without an unsupported local binding, set status to blocked and say a source is needed.",
        "provenance is model, unless the sentence is taken from uploadedMaterialSummary, in which case use teacher_material. Do not use retrieved, curated, or curriculum_planning. This step has no web search, curated pack, or curriculum document.",
        "factuallyVerified must be false. You cannot verify your own knowledge. teacherRequested is true only when the teacher asked for that specific claim, not because the claim is about the same topic. Teacher material is not automatic truth.",
        "If the request assumes something false, set falsePremise to a short statement of that assumption. Do not admit the falsehood as a claim. Admit a correction, with correctsPremise true, only when you can state it without guessing. Set status to qualified when a correction is included. Set status to blocked when you cannot correct the premise without guessing, or when teaching the topic would require invented facts.",
        "status is usable when the claims are ordinary and you are not flagging a premise problem, a contested point, or a thin topic. status is qualified when a claim is contested, the topic is niche or local, confidence is limited, or a false premise was corrected. status is blocked when the pack must not be taught.",
        "contested is true when historians or scientists still disagree. Put that in uncertainty. Do not present one side as the only fact.",
        "mechanisms repeats the how or why claims. Each one includes feature, the concrete feature that mechanism explains. concepts are short labels, not sentences. vocabulary is words worth knowing, with a short gloss. misconceptions are optional mistakes children make. A misconception is not a fact to teach.",
        "JSON shape: { status, falsePremise, blockReason, niche, claims: [{ text, kind, depth, confidence, provenance, teacherRequested, factuallyVerified, contested, uncertainty, ageFit: { from, to }, correctsPremise, importance, accepted }], mechanisms: [{ text, feature }], concepts: [], vocabulary: [{ term, gloss }], misconceptions: [{ text, corrects }], openQuestions: [] }."
      ].join(" "),
      user: JSON.stringify({
        request: clean(ctx.lessonText || ctx.teacherInstructions || "", 4000),
        uploadedMaterialSummary: clean(ctx.uploadedMaterialSummary || "", 4000),
        yearGroup: clean(ctx.yearGroup, 20),
        subject: clean(ctx.subject, 40),
        topic: clean(ctx.topic, 120),
        requestedMinutes: ctx.requestedMinutes || null,
        teacherIntent: (ctx.lessonBrief && ctx.lessonBrief.teacherIntent) || null,
        strandPairsRequired: strandsRequiredFor(ctx),
        curriculumContext: "England primary. The curriculum note is planning guidance only. It is not a factual source in this step."
      })
    };
  }

  function packDepth(raw, text, kind) {
    var given = clean(raw && raw.depth, 20).toLowerCase();
    if (given === "concrete" || given === "mechanism" || given === "system") return given;
    if (kind === "mechanism" || kind === "process") return "mechanism";
    if (/\b(system|cycle|work together|working together)\b/i.test(text)) return "system";
    if (statesRelation(text) || statesFunction(text)) return "mechanism";
    return "concrete";
  }

  function packAgeFit(raw, depth) {
    var from = depth === "system" ? 5 : (depth === "mechanism" ? 3 : 1);
    var to = 6;
    var given = false;
    var body = raw && typeof raw.ageFit === "object" ? raw.ageFit : null;
    if (raw && typeof raw.ageFit === "string") {
      var nums = String(raw.ageFit).match(/[1-6]/g) || [];
      if (nums.length === 1) { from = to = Number(nums[0]); given = true; }
      else if (nums.length >= 2) { from = Number(nums[0]); to = Number(nums[1]); given = true; }
    }
    if (body) {
      var start = Number(body.from != null ? body.from : body.min);
      var end = Number(body.to != null ? body.to : body.max);
      if (start >= 1 && start <= 6) { from = start; given = true; }
      if (end >= 1 && end <= 6) { to = end; given = true; }
    }
    if (!given) {
      from = depth === "system" ? 5 : (depth === "mechanism" ? 3 : 1);
      to = 6;
    }
    if (to < from) to = from;
    return { from: from, to: to };
  }

  function packProvenance(rawValue, text, ctx) {
    var asked = clean(rawValue, 40).toLowerCase().replace(/[\s-]+/g, "_");
    if (asked === "llm" || asked === "parametric") asked = "model";
    if (asked === "upload" || asked === "teacher") asked = "teacher_material";
    if (!PACK_PROVENANCE[asked]) asked = "model";
  var material = clean((ctx && ctx.uploadedMaterialSummary) || "", 8000);
  var fromMaterial = !!(material && claimOverlap(text, material) >= 0.6);
  var ignored = "";
  if (asked === "retrieved" || asked === "curated" || asked === "curriculum_planning") {
    ignored = asked;
    asked = "model";
  }
  if (fromMaterial) {
    return {
      provenance: "teacher_material",
      provenanceNote: "teacher-material/unverified" + (ignored ? "; ignored " + ignored + " label" : "")
    };
  }
  if (asked === "teacher_material" || ignored) {
    var note = ignored
      ? "downgraded from " + ignored + ": phase 1 has no external source; model-originated/unverified"
      : "downgraded: the claim is not in the teacher material; model-originated/unverified";
    return { provenance: "model", provenanceNote: note };
  }
  return { provenance: "model", provenanceNote: "model-originated/unverified" };
}

  function teacherAskedClaim(rawFlag, text, ctx) {
    var request = clean((ctx && (ctx.lessonText || ctx.teacherInstructions)) || "", 4000);
    var words = contentWords(text);
    var flagged = rawFlag === true || String(rawFlag).toLowerCase() === "true";
    if (words.length >= 2 && claimOverlap(text, request) >= 0.75) return true;
    var intent = (ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent) || {};
    var focus = (intent.focusConcepts || []).concat(intent.learningGoal ? [intent.learningGoal] : []).join(" ");
    return !!(flagged && words.length >= 2 && claimOverlap(text, focus) >= 0.75);
  }

  function affirmsPremise(text, premise) {
    if (!premise) return false;
    if (/\b(not|never|aren't|isn't|cannot|can't)\b/i.test(text)) return false;
    var premiseWords = contentWords(premise);
    var claimWords = contentWords(text);
    if (premiseWords.length < 2 || !claimWords.length) return false;
    var shared = 0;
    premiseWords.forEach(function (word) {
      if (claimWords.some(function (other) { return sameStem(word, other); })) shared += 1;
    });
    return shared >= Math.min(2, premiseWords.length) && shared / premiseWords.length >= 0.6;
  }

  function claimCandidates(raw) {
    var out = [];
    function push(item, fallbackKind, fallbackDepth) {
      if (!item) return;
      if (typeof item === "string") {
        out.push({ text: item, kind: fallbackKind, depth: fallbackDepth });
        return;
      }
      if (typeof item !== "object") return;
      var copy = {};
      var key;
      for (key in item) copy[key] = item[key];
      copy.text = item.text || item.claim || item.statement || item.knowledge || "";
      if (!copy.kind && fallbackKind) copy.kind = fallbackKind;
      if (!copy.depth && fallbackDepth) copy.depth = fallbackDepth;
      out.push(copy);
    }
    var claims = Array.isArray(raw && raw.claims) ? raw.claims : [];
    var mechanisms = Array.isArray(raw && raw.mechanisms) ? raw.mechanisms : [];
    claims.forEach(function (item) { push(item, "fact", ""); });
    mechanisms.forEach(function (item) { push(item, "mechanism", "mechanism"); });
    return out.slice(0, 24);
  }

  // Place-bound admission is deterministic. It does not read model confidence, usable, or niche.
  // A named place is not enough. The risk is binding that place to geology, a mechanism, a date, or a cause.
  var PLACE_STOP = {
    The: 1, This: 1, That: 1, These: 1, Those: 1, There: 1, Then: 1, They: 1, Their: 1,
    Year: 1, Years: 1, Teach: 1, Teaching: 1, Children: 1, Child: 1, Pupils: 1, Students: 1,
    Explain: 1, How: 1, Why: 1, What: 1, When: 1, Where: 1, Which: 1, Who: 1,
    Science: 1, History: 1, Geography: 1, English: 1, Maths: 1, Mathematics: 1,
    Please: 1, Primary: 1, Class: 1, Today: 1, Some: 1, Many: 1, Most: 1,
    Heavy: 1, Steep: 1, High: 1, Low: 1, Large: 1, Small: 1,
    Act: 1, Church: 1, King: 1, Queen: 1, Pope: 1, Sir: 1, Saint: 1, Lord: 1
  };
  var LOCAL_GEO = /\b(?:geolog\w*|stratum|strata|shale|limestone|sandstone|chalk|granite|slate|bedrock|sediment\w*|minerals?|escarpments?|clay|rock\s+layers?|layers?\s+of\s+\w+)\b/i;
  var LOCAL_EVENT = /\b(?:landslips?|landslides?|rockfalls?|subsidence|erupt(?:ed|ion|s)?|earthquakes?|flood(?:ed|s|ing)?|collapsed|collapse|slippage)\b/i;
  var LOCAL_CAUSE = /\b(?:caused|causes|causing|because|due to|so that|formed|forming|formation|saturat\w*|erod\w*|slipped|slips)\b/i;
  var LOCAL_YEAR = /\b(?:1[0-9]{3}|20[0-9]{2})\b/;
  var LOCAL_PHYSICAL = /\b(?:soil|rocks?|water|rain|rainfall|slopes?|hillsides?|cliffs?|coasts?|rivers?|ice|lava|waves?|layers?|geology|geological)\b/i;

  function collapsePlaces(list) {
    var found = [];
    (list || []).forEach(function (name) {
      var label = clean(name, 60).replace(/['’]s$/, "");
      if (!label || label.length < 3) return;
      var key = label.toLowerCase();
      if (found.some(function (item) { return item.toLowerCase() === key; })) return;
      found.push(label);
    });
    return found.filter(function (name) {
      var key = name.toLowerCase();
      return !found.some(function (other) {
        var rest = other.toLowerCase();
        return rest !== key && rest.indexOf(key) !== -1 && rest.length > key.length;
      });
    });
  }

  function properPlaces(text) {
    var value = String(text || "");
    var found = [];
    function add(name) {
      var label = clean(name, 60).replace(/['’]s$/, "");
      if (!label || label.length < 3) return;
      var parts = label.split(/\s+/);
      if (parts.length === 1 && PLACE_STOP[parts[0]]) return;
      if (parts.every(function (part) { return PLACE_STOP[part]; })) return;
      found.push(label);
    }
    var multi = /\b([A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+){1,3})\b/g;
    var prep = /\b(?:at|in|on|near|around|above|below|beside|from|of|about)\s+([A-Z][A-Za-z'’]+)\b/g;
    var poss = /\b([A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+){0,2})['’]s\b/g;
    var theName = /\bThe\s+([A-Z][A-Za-z'’]+)\b/g;
    var match;
    while ((match = multi.exec(value))) add(match[1]);
    while ((match = prep.exec(value))) add(match[1]);
    while ((match = poss.exec(value))) add(match[1]);
    while ((match = theName.exec(value))) add(match[1]);
    return collapsePlaces(found);
  }

  function mentionsPlace(text, places) {
    var lower = String(text || "").toLowerCase();
    var hit = [];
    (places || []).forEach(function (place) {
      if (lower.indexOf(String(place).toLowerCase()) !== -1 && hit.indexOf(place) === -1) hit.push(place);
    });
    return hit;
  }

  function placeBoundClaim(text, places) {
    var named = mentionsPlace(text, places);
    properPlaces(text).forEach(function (place) {
      if (named.indexOf(place) === -1) named.push(place);
    });
    named = collapsePlaces(named);
    if (!named.length) return { bound: false, places: [] };
    var geo = LOCAL_GEO.test(text);
    var event = LOCAL_EVENT.test(text);
    var cause = LOCAL_CAUSE.test(text);
    var year = LOCAL_YEAR.test(text);
    var physical = LOCAL_PHYSICAL.test(text);
    var bound = geo || event || (year && (cause || physical || geo || event)) || (cause && physical);
    return { bound: !!bound, places: named };
  }

  function requestNeedsPlaceBound(request, extraPlaces) {
    var text = String(request || "");
    var places = collapsePlaces(properPlaces(text).concat(extraPlaces || []));
    var mentioned = places.filter(function (place) {
      return text.toLowerCase().indexOf(place.toLowerCase()) !== -1;
    });
    var asks = /\b(?:how|why|caused|causes|causing|cause|formed|forming|formation|when)\b/i.test(text);
    var physical = LOCAL_GEO.test(text) || LOCAL_EVENT.test(text) || LOCAL_PHYSICAL.test(text);
    return { needs: !!(mentioned.length && asks && physical), places: mentioned };
  }

  function placesOverlap(left, right) {
    return (left || []).some(function (place) {
      var key = place.toLowerCase();
      return (right || []).some(function (other) {
        var rest = other.toLowerCase();
        return key === rest || key.indexOf(rest) !== -1 || rest.indexOf(key) !== -1;
      });
    });
  }

  function lessonRequestText(ctx) {
    ctx = ctx || {};
    var brief = ctx.lessonBrief || {};
    var intent = brief.teacherIntent || {};
    return clean([
      ctx.lessonText, ctx.teacherInstructions, ctx.topic, brief.rawRequest, brief.learningGoal, intent.learningGoal
    ].join(" "), 4000);
  }

  function classificationCount(text) {
    var match = String(text || "").match(/\b(two|three|four|five|six|\d+)\s+(?:main\s+)?(?:types|kinds|groups|classes|categories)\b/i);
    if (match) return match[1];
    match = String(text || "").match(/\b(?:there\s+(?:are|were)|these\s+are)\s+(?:only\s+)?(?:the\s+)?(two|three|four|five|six|\d+)\s+(?:different\s+)?(?:types|kinds|groups|classes|categories)\b/i);
    return match ? match[1] : "";
  }

  // A counted inventory of types is a classification. Model confidence does not verify it.
  function unsupportedClassification(text, provenance, teacherRequested, ctx) {
    var count = classificationCount(text);
    if (!count || provenance !== "model" || teacherRequested) return false;
    return !requestHasCount(lessonRequestText(ctx), count);
  }

  function normaliseKnowledgePack(raw, ctx) {
    ctx = ctx || {};
    var body = raw && typeof raw === "object" ? raw : {};
    var mechanismFeatureByText = {};
    (Array.isArray(body.mechanisms) ? body.mechanisms : []).forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var featureText = clean(item.feature || "", 80);
      var mechanismText = clean(item.text || item.claim || item.statement || "", 180).toLowerCase();
      if (!mechanismText || !featureText) return;
      mechanismFeatureByText[mechanismText] = featureText;
    });
    var stripped = [];
    Object.keys(PACK_STRIP).forEach(function (key) {
      if (body[key] != null) stripped.push(key);
    });
    var falsePremise = clean(body.falsePremise || body.false_premise || "", 200);
    var rejected = [];
    var seen = {};
    var overrides = 0;
    var claims = [];
    var passages = researchPassages(ctx);
    var sourceRejected = [];
    var sourceChecked = 0;
    claimCandidates(body).forEach(function (item) {
      var text = clean(item.text, 180);
      if (!text || text.length < 8) return;
      var key = text.toLowerCase();
      if (item.accepted === false || String(item.status || "").toLowerCase() === "rejected") {
        rejected.push({ text: text, reason: "not accepted" });
        return;
      }
      if (affirmsPremise(text, falsePremise)) {
        rejected.push({ text: text, reason: "false premise" });
        return;
      }
      if (seen[key]) return;
      seen[key] = 1;
      var sourced = null;
      if (passages) {
        sourceChecked += 1;
        sourced = sourceCheck(item, passages);
        if (!sourced.ok) {
          var refusal = { text: text, reason: sourced.reason, sourceRef: sourced.refs, quote: clean(sourced.quote, 300) };
          rejected.push(refusal);
          sourceRejected.push(refusal);
          return;
        }
      }
      var kind = clean(item.kind, 20).toLowerCase();
      if (!PACK_KIND[kind]) kind = "fact";
      var depth = packDepth(item, text, kind);
      var origin = sourced
        ? { provenance: "retrieved", provenanceNote: "retrieved; quote found verbatim in cited passage; automated entailment check pending; not human-verified" }
        : packProvenance(item.provenance || item.origin, text, ctx);
      var verifiedFlag = item.factuallyVerified === true || String(item.factuallyVerified).toLowerCase() === "true" || item.verified === true;
      if (verifiedFlag) overrides += 1;
      var importance = clean(item.importance, 20).toLowerCase();
      if (importance !== "supporting" && importance !== "optional") importance = "core";
      var confidence = clean(item.confidence, 20).toLowerCase();
      if (confidence !== "high" && confidence !== "medium" && confidence !== "low") confidence = "medium";
      var teacherRequested = teacherAskedClaim(item.teacherRequested, text, ctx);
      claims.push({
        claimId: stableClaimId(text),
        text: text,
        kind: kind,
        depth: depth,
        confidence: confidence,
        provenance: origin.provenance,
        provenanceNote: origin.provenanceNote,
        teacherRequested: teacherRequested,
        factuallyVerified: false,
        contested: item.contested === true || String(item.contested).toLowerCase() === "true",
        uncertainty: clean(item.uncertainty, 140),
        ageFit: packAgeFit(item, depth),
        correctsPremise: item.correctsPremise === true || String(item.correctsPremise).toLowerCase() === "true",
        importance: importance,
        classificationHold: unsupportedClassification(text, origin.provenance, teacherRequested, ctx)
      });
      if (sourced) {
        var entry = claims[claims.length - 1];
        entry.sourceRef = sourced.refs.slice();
        entry.sourceQuote = clean(sourced.quote, 400);
        entry.sourceUrls = sourced.urls.slice();
        entry.sourceTitles = sourced.titles.slice();
        entry.quoteVerified = true;
        entry.wordsNotInSource = wordsNotInSource(entry.text, sourced.quote, sourced.passageText, ctx && ctx.topic);
        entry.entailment = "pending";
        entry.sourceSupport = "quote-verified; automated entailment check pending";
        entry.sourceHold = true;
      }
    });
    var used = {};
    claims.forEach(function (claim) {
      if (!used[claim.claimId]) { used[claim.claimId] = 1; return; }
      var n = 2;
      while (used[claim.claimId + n]) n += 1;
      claim.claimId = claim.claimId + n;
      used[claim.claimId] = 1;
    });
    var mechanisms = claims.filter(function (claim) {
      return claim.depth === "mechanism" || claim.kind === "mechanism" || claim.kind === "process";
    }).map(function (claim) {
      var feature = mechanismFeatureByText[claim.text.toLowerCase()] || "";
      return {
        claimId: claim.claimId,
        text: claim.text,
        feature: feature,
        featureClaimId: feature ? featureClaimFor(feature, claims, claim.text, ctx) : ""
      };
    });
    var concepts = (Array.isArray(body.concepts) ? body.concepts : []).map(function (item) {
      return clean(typeof item === "string" ? item : (item && (item.term || item.label || item.text)) || "", 40);
    }).filter(function (text) {
      return text && text.split(/\s+/).length <= 6 && text.indexOf(".") === -1;
    }).slice(0, 8);
    var vocabulary = (Array.isArray(body.vocabulary) ? body.vocabulary : []).map(function (item) {
      if (typeof item === "string") return passages ? null : { term: clean(item, 40), gloss: "" };
      var word = { term: clean(item && (item.term || item.word), 40), gloss: clean(item && (item.gloss || item.definition), 120) };
      if (!passages) return word;
      var check = sourceCheck(item, passages);
      if (!check.ok) {
        sourceRejected.push({ text: "vocabulary: " + word.term, reason: check.reason, sourceRef: check.refs, quote: clean(check.quote, 300) });
        return null;
      }
      word.sourceRef = check.refs.slice();
      word.sourceQuote = clean(check.quote, 400);
      return word;
    }).filter(function (item) { return item && item.term; }).slice(0, 8);
    var misconceptions = (Array.isArray(body.misconceptions) ? body.misconceptions : []).map(function (item, index) {
      var text = clean(typeof item === "string" ? item : (item && (item.text || item.mistake)) || "", 160);
      if (!text) return null;
      var hint = clean(item && (item.corrects || item.correction || item.correctClaimId) || "", 180);
      var claimId = "";
      claims.forEach(function (claim) {
        if (claimId) return;
        if (hint && (claim.claimId === hint || claimOverlap(hint, claim.text) >= 0.6)) claimId = claim.claimId;
      });
      if (passages && !claimId) return null;
      return { id: "m" + (index + 1), text: text, correctsClaimId: claimId };
    }).filter(Boolean).slice(0, 6);
    var seenPlaces = [];
    claims.forEach(function (claim) {
      properPlaces(claim.text).forEach(function (place) { seenPlaces.push(place); });
    });
    var requestText = lessonRequestText(ctx);
    var requestLocal = requestNeedsPlaceBound(requestText, seenPlaces);
    var placeIndex = collapsePlaces(requestLocal.places.concat(seenPlaces));
    claims.forEach(function (claim) {
      var bound = placeBoundClaim(claim.text, placeIndex);
      claim.placeBound = bound.bound;
      claim.placeNames = bound.places;
      claim.supplied = claim.provenance === "teacher_material";
      claim.factuallyVerified = false;
      if (!claim.placeBound) {
        claim.support = "generic";
        claim.localHold = false;
      } else if (claim.supplied) {
        claim.support = "supplied";
        claim.localHold = false;
      } else if (claim.provenance === "retrieved" && claim.quoteVerified) {
        claim.support = "retrieved";
        claim.localHold = false;
      } else {
        claim.support = "unsupported";
        claim.localHold = true;
      }
    });
    var covering = claims.some(function (claim) {
      return (claim.supplied || (claim.provenance === "retrieved" && claim.quoteVerified)) && claim.placeBound && placesOverlap(claim.placeNames, requestLocal.places);
    });
    var needsSource = !!(requestLocal.needs && !covering);
    var localHolds = claims.filter(function (claim) { return claim.localHold; });
    var modelStatus = clean(body.status, 20).toLowerCase();
    if (modelStatus !== "usable" && modelStatus !== "qualified" && modelStatus !== "blocked") modelStatus = "";
    var modelNiche = body.niche === true || String(body.niche).toLowerCase() === "true";
    var qualifiers = [];
    if (falsePremise) qualifiers.push(claims.length ? "false premise removed from the claims" : "false premise and no correction");
    if (claims.some(function (claim) { return claim.contested; })) qualifiers.push("contested claims stay in the pack and out of the lesson");
    if (claims.length && claims.every(function (claim) { return claim.confidence === "low"; })) qualifiers.push("every claim is low confidence");
    if (modelNiche) qualifiers.push("niche topic; model knowledge is unverified");
    if (claims.length && claims.length < 3) qualifiers.push("thin pack");
    if (localHolds.length) qualifiers.push("unsupported place-bound claims are held out of the lesson");
    if (claims.some(function (claim) { return claim.classificationHold; })) qualifiers.push("an unverified classification is held out of the lesson; model confidence does not verify it");
    if (claims.some(function (claim) { return claim.placeBound && claim.supplied; })) qualifiers.push("teacher-supplied place detail is unverified");
    var localAdmission = needsSource ? "needs_source" : (localHolds.length || claims.some(function (claim) { return claim.placeBound; }) ? "hold" : "clear");
    var status = "usable";
    var statusReason = "Enough claims to select from. Every claim is still unverified.";
    if (!claims.length) {
      status = "blocked";
      statusReason = needsSource
        ? "NEEDS_SOURCE: the lesson needs a place-bound explanation and the pack has no supported claim for that place."
        : (clean(body.blockReason, 200) || (falsePremise ? "false premise and no claims that can be taught" : "no admitted claims"));
      if (needsSource) localAdmission = "needs_source";
    } else if (needsSource) {
      status = "blocked";
      statusReason = "NEEDS_SOURCE: the lesson needs a place-bound explanation and the pack has no supported claim for that place. Model confidence does not make a local claim a teaching fact.";
      localAdmission = "needs_source";
    } else if (modelStatus === "blocked") {
      status = "blocked";
      statusReason = clean(body.blockReason, 200) || "the pack is blocked and must not be taught";
    } else if (qualifiers.length || modelStatus === "qualified" || localAdmission === "hold") {
      status = "qualified";
      statusReason = qualifiers.join("; ") || clean(body.blockReason, 200) || "the pack can be selected only with the recorded limits";
    }
    if (passages && !claims.length) {
      status = "blocked";
      localAdmission = "needs_source";
      statusReason = "NEEDS_SOURCE: no claim had a quote found in a cited retrieved passage. Model confidence and search snippets are not support.";
    }
    var idSource = claims.map(function (claim) { return claim.claimId; }).join(".");
    var sourceFields = passages ? {
      sourceMode: "retrieved",
      sourceAudit: {
        label: SOURCE_SUPPORT_LABEL,
        checked: sourceChecked,
        admitted: claims.length,
        rejected: sourceRejected.slice(0, 40),
        rejectedByReason: sourceRejected.reduce(function (acc, row) { acc[row.reason] = (acc[row.reason] || 0) + 1; return acc; }, {}),
        entailmentRan: false,
        humanVerified: false
      }
    } : null;
    var packOut = {
      id: "kp_" + stableClaimId(idSource || clean(body.topic || (ctx && ctx.topic) || "empty", 80)).slice(1),
      version: 1,
      phase: 1,
      topic: clean(body.topic || (ctx && ctx.topic) || "", 120),
      subject: clean(body.subject || (ctx && ctx.subject) || "", 40),
      status: status,
      statusReason: statusReason,
      modelStatus: modelStatus,
      modelNiche: modelNiche,
      localAdmission: localAdmission,
      needsSource: status === "blocked" && localAdmission === "needs_source",
      falsePremise: falsePremise,
      provenanceSummary: passages
        ? "Retrieved mode: every admitted claim cites a fetched passage and carries a quote that code found verbatim in that passage after whitespace, case, and typographic-quote normalisation. An automated entailment check then labels support; a claim without a supported verdict is held out of the lesson. Support label: " + SOURCE_SUPPORT_LABEL + ". No claim is human-verified and factuallyVerified stays false. Model confidence and search snippets are not support."
        : "Phase 1: no claim is factually verified. Supplied teacher material, support for a claim, and verification are separate. Model-originated claims are unverified. Teacher material is not treated as truth. Retrieved, curated, and curriculum origins are not available in this phase.",
      verificationOverrides: overrides,
      claims: claims,
      mechanisms: mechanisms,
      concepts: concepts,
      vocabulary: vocabulary,
      misconceptions: misconceptions,
      openQuestions: phraseList(body.openQuestions, 160, 4),
      rejectedClaims: rejected.slice(0, 8),
      strippedFields: stripped
    };
    if (sourceFields) {
      packOut.sourceMode = sourceFields.sourceMode;
      packOut.sourceAudit = sourceFields.sourceAudit;
    }
    return packOut;
  }

  function selectPackForLesson(pack, ctx) {
    ctx = ctx || {};
    pack = pack || {};
    var year = Number(yearDigit(ctx.yearGroup || ctx.yearAssumption || (ctx.lessonBrief && ctx.lessonBrief.yearGroup))) || 0;
    if (!year) year = ctx.yearAssumed ? 3 : 3;
    var mode = year <= 2 ? "concrete" : (year <= 4 ? "mechanism" : "system");
    if (!pack.claims || !pack.claims.length || pack.status === "blocked") {
      return {
        status: "blocked",
        reason: pack.status === "blocked" ? (pack.statusReason || "knowledge pack is blocked") : "no claims to select",
        depthMode: mode,
        year: year,
        claimIds: [],
        heldBack: (pack.claims || []).map(function (claim) {
          return { claimId: claim.claimId, reason: claim.localHold ? "unsupported local claim" : "pack blocked" };
        })
      };
    }
    var held = [];
    var eligible = [];
    pack.claims.forEach(function (claim) {
      if (claim.localHold) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "unsupported local claim" });
        return;
      }
      if (claim.classificationHold) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "unsupported classification" });
        return;
      }
      if (pack.sourceMode === "retrieved" && (claim.sourceHold || claim.entailment !== "supported")) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "source support not confirmed (" + (claim.entailment || "unchecked") + ")" });
        return;
      }
      var fit = claim.ageFit || { from: 1, to: 6 };
      if (year < fit.from || year > fit.to) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "outside age fit" });
        return;
      }
      if (claim.contested) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "contested" });
        return;
      }
      if (claim.importance === "optional") {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "optional" });
        return;
      }
      var depthOk = false;
      if (mode === "concrete") depthOk = claim.depth === "concrete" || (claim.depth === "mechanism" && fit.from <= 2);
      else if (mode === "mechanism") depthOk = claim.depth === "concrete" || claim.depth === "mechanism";
      else depthOk = claim.depth === "concrete" || claim.depth === "mechanism" || claim.depth === "system";
      if (!depthOk) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "other depth" });
        return;
      }
      eligible.push(claim);
    });
    var confidenceRank = { high: 0, medium: 1, low: 2 };
    var depthRank = { concrete: 0, mechanism: 1, system: 2 };
    eligible.sort(function (a, b) {
      return (depthRank[a.depth] || 0) - (depthRank[b.depth] || 0) || (confidenceRank[a.confidence] || 1) - (confidenceRank[b.confidence] || 1) || (a.claimId < b.claimId ? -1 : 1);
    });
    var strong = eligible.filter(function (claim) { return claim.confidence !== "low"; });
    if (strong.length >= 2) {
      eligible.filter(function (claim) { return claim.confidence === "low"; }).forEach(function (claim) {
        held.push({ claimId: claim.claimId, depth: claim.depth, reason: "low confidence" });
      });
      eligible = strong;
    }
    var hasPrimary = eligible.some(function (claim) {
      if (mode === "concrete") return claim.depth === "concrete" || claim.depth === "mechanism";
      return claim.depth === mode;
    });
    var status = "ready";
    var reason = "";
    if (!hasPrimary) {
      status = eligible.length >= 2 ? "qualified" : "blocked";
      reason = "The pack has no " + mode + " claim that fits Year " + year + ".";
    } else if (eligible.length < 2) {
      status = "blocked";
      reason = "Not enough claims fit Year " + year + " without inventing facts.";
    } else if (mode === "concrete") {
      reason = "Year " + year + " selects concrete claims, and a mechanism only when its age fit starts at Year 2 or earlier. System claims stay in the pack.";
    } else if (mode === "mechanism") {
      reason = "Year " + year + " selects concrete claims and mechanisms. System claims stay in the pack.";
    } else {
      reason = "Year " + year + " selects concrete claims, mechanisms, and system claims. Younger years do not receive the system claims.";
    }
    if (pack.status === "qualified" && status === "ready") status = "qualified";
    return {
      status: status,
      reason: reason,
      depthMode: mode,
      year: year,
      claimIds: eligible.map(function (claim) { return claim.claimId; }),
      heldBack: held
    };
  }

  function packForPlanner(pack) {
    pack = pack || {};
    return {
      id: pack.id,
      status: pack.status,
      statusReason: pack.statusReason,
      falsePremise: pack.falsePremise || "",
      provenanceSummary: pack.provenanceSummary,
      claims: (pack.claims || []).filter(function (claim) {
        return !(pack.sourceMode === "retrieved" && claim.sourceHold);
      }).map(function (claim) {
        var row = {
          claimId: claim.claimId,
          text: claim.text,
          kind: claim.kind,
          depth: claim.depth,
          confidence: claim.confidence,
          provenance: claim.provenance,
          provenanceNote: claim.provenanceNote,
          teacherRequested: !!claim.teacherRequested,
          factuallyVerified: false,
          contested: !!claim.contested,
          uncertainty: claim.uncertainty || "",
          ageFit: claim.ageFit,
          importance: claim.importance,
          correctsPremise: !!claim.correctsPremise,
          supplied: !!claim.supplied,
          support: claim.support || "",
          placeBound: !!claim.placeBound,
          localHold: !!claim.localHold
        };
        if (claim.sourceRef) {
          row.sourceRef = claim.sourceRef.slice();
          row.sourceSupport = claim.sourceSupport || "";
        }
        return row;
      }),
      mechanisms: pack.mechanisms || [],
      concepts: pack.concepts || [],
      vocabulary: pack.vocabulary || [],
      misconceptions: pack.misconceptions || [],
      rejectedClaims: pack.rejectedClaims || [],
      doNotTeach: (pack.claims || []).filter(function (claim) { return claim.localHold || claim.classificationHold || (pack.sourceMode === "retrieved" && claim.sourceHold); }).map(function (claim) { return claim.text; }).concat((pack.rejectedClaims || []).map(function (item) { return item.text; })).concat(pack.falsePremise ? [pack.falsePremise] : []).slice(0, 12)
    };
  }

  function packConstraint(ctx) {
    if (!ctx || !ctx.knowledgePack || ctx.knowledgePack.status === "blocked" || !(ctx.knowledgePack.claims || []).length) return "";
    return "knowledgePack.claims is the only source of subject facts. Each learningMap point must include claimIds, an array of claimId values from that pack. knowledgeSelection.claimIds are the only claims eligible for this year, intent, and duration. The knowledge sentence may shorten the cited claim. It must not add a subject fact, name, date, measurement, or mechanism that the cited claim does not already state. The pack holds more claims than this lesson should teach. Select a subset that fits the depth budget. knowledgeSelection.depthMode is concrete, mechanism, or system: concrete names what a child can observe, mechanism says how or why a part works, and system says how several mechanisms work together. Do not satisfy an older year by writing longer words for the same claim. Do not teach falsePremise, doNotTeach, or rejectedClaims. narrativeTheme may be imaginative. The learning map may not invent facts.";
  }

  function knowledgePackLog(pack, selection) {
    pack = pack || {};
    selection = selection || {};
    return {
      packId: pack.id || "",
      status: pack.status || "",
      statusReason: clean(pack.statusReason, 220),
      modelStatus: pack.modelStatus || "",
      modelNiche: !!pack.modelNiche,
      localAdmission: pack.localAdmission || "",
      needsSource: !!pack.needsSource,
      falsePremise: clean(pack.falsePremise, 180),
      provenanceSummary: clean(pack.provenanceSummary, 280),
      verificationOverrides: pack.verificationOverrides || 0,
      claimCount: (pack.claims || []).length,
      claims: (pack.claims || []).slice(0, 18).map(function (claim) {
        var row = {
          claimId: claim.claimId,
          text: clean(claim.text, 180),
          kind: claim.kind,
          depth: claim.depth,
          confidence: claim.confidence,
          provenance: claim.provenance,
          provenanceNote: clean(claim.provenanceNote, 140),
          teacherRequested: !!claim.teacherRequested,
          factuallyVerified: false,
          contested: !!claim.contested,
          uncertainty: clean(claim.uncertainty, 120),
          ageFit: claim.ageFit || null,
          importance: claim.importance || "",
          correctsPremise: !!claim.correctsPremise,
          supplied: !!claim.supplied,
          support: claim.support || "",
          placeBound: !!claim.placeBound,
          localHold: !!claim.localHold,
          classificationHold: !!claim.classificationHold
        };
        return claim.sourceRef ? Object.assign(row, {
          sourceRef: claim.sourceRef.slice(),
          sourceQuote: clean(claim.sourceQuote, 300),
          sourceUrls: (claim.sourceUrls || []).slice(0, 2),
          quoteVerified: !!claim.quoteVerified,
          entailment: claim.entailment || "",
          sourceSupport: claim.sourceSupport || "",
          sourceHold: !!claim.sourceHold
        }) : row;
      }),
      mechanisms: (pack.mechanisms || []).slice(0, 12).map(function (item) {
        return { claimId: item.claimId, text: clean(item.text, 160), feature: clean(item.feature, 80), featureClaimId: item.featureClaimId || "" };
      }),
      concepts: (pack.concepts || []).slice(0, 8),
      vocabulary: (pack.vocabulary || []).slice(0, 8),
      misconceptions: (pack.misconceptions || []).slice(0, 6),
      openQuestions: (pack.openQuestions || []).slice(0, 4),
      rejectedClaims: (pack.rejectedClaims || []).slice(0, 8),
      strippedFields: pack.strippedFields || [],
      sourceMode: pack.sourceMode || "",
      sourceAudit: pack.sourceAudit ? {
        label: pack.sourceAudit.label,
        checked: pack.sourceAudit.checked,
        admitted: pack.sourceAudit.admitted,
        rejectedByReason: pack.sourceAudit.rejectedByReason,
        rejected: (pack.sourceAudit.rejected || []).slice(0, 12),
        entailment: pack.sourceAudit.entailment || null,
        entailmentRan: !!pack.sourceAudit.entailmentRan,
        humanVerified: false
      } : null,
      selection: {
        status: selection.status || "",
        reason: clean(selection.reason, 240),
        depthMode: selection.depthMode || "",
        year: selection.year || 0,
        claimIds: (selection.claimIds || []).slice(0, 18),
        heldBack: (selection.heldBack || []).slice(0, 18)
      }
    };
  }

  function knowledgeTrace(plan, slots, ctx) {
    plan = plan || {};
    ctx = ctx || {};
    var pack = ctx.knowledgePack || {};
    var byClaim = {};
    (pack.claims || []).forEach(function (claim) { byClaim[claim.claimId] = claim; });
    var byPoint = {};
    (plan.learningMap || []).forEach(function (item) { byPoint[item.id] = item; });
    function claimsFor(refs) {
      var ids = [];
      (refs || []).forEach(function (ref) {
        var point = byPoint[ref];
        ((point && point.claimIds) || []).forEach(function (id) {
          if (ids.indexOf(id) === -1) ids.push(id);
        });
      });
      return ids;
    }
    var beats = [];
    (slots || []).forEach(function (slot) {
      if (!slot) return;
      (slot.beats || []).forEach(function (beat) {
        if (beats.length >= 40) return;
        beats.push({
          stage: slot.id,
          beatId: beat.id,
          move: beat.move,
          mapIds: (beat.knowledgeRefs || []).slice(0, 4),
          claimIds: claimsFor(beat.knowledgeRefs).slice(0, 4)
        });
      });
    });
    return {
      packId: pack.id || "",
      packStatus: pack.status || "",
      provenanceSummary: clean(pack.provenanceSummary, 280),
      depthMode: (ctx.knowledgeSelection && ctx.knowledgeSelection.depthMode) || "",
      depthReason: clean((ctx.knowledgeSelection && ctx.knowledgeSelection.reason) || "", 240),
      map: (plan.learningMap || []).slice(0, 14).map(function (item) {
        return {
          mapId: item.id,
          knowledge: clean(item.knowledge, 160),
          claimIds: (item.claimIds || []).slice(0, 4),
          provenance: (item.claimIds || []).map(function (id) { return byClaim[id] ? byClaim[id].provenance : ""; }).slice(0, 4),
          sourceRef: (item.claimIds || []).map(function (id) { return byClaim[id] && byClaim[id].sourceRef ? byClaim[id].sourceRef.slice() : []; }).slice(0, 4),
          factuallyVerified: false
        };
      }),
      teach: beats.filter(function (beat) { return beat.stage === "teach"; }).slice(0, 24),
      apply: beats.filter(function (beat) { return beat.stage === "apply"; }),
      check: beats.filter(function (beat) { return beat.stage === "check"; })
    };
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

  function publishPlan(plan) {
    if (!plan || typeof plan !== "object") return plan || null;
    var copy = Object.assign({}, plan);
    delete copy.droppedKnowledge;
    delete copy.mapRejected;
    delete copy.depthBudget;
    if (copy.teachingPlan) {
      copy.teachingThreads = (copy.teachingPlan.strands || []).map(function (row) {
        return { id: row.id, purpose: row.purpose, knowledgeRefs: (row.knowledgeRefs || []).slice() };
      });
      delete copy.teachingPlan;
    }
    return copy;
  }

  function forModel(ctx) {
    var copy = {};
    var key;
    for (key in ctx) {
      if (key === "organisationId" || key === "classId" || key === "knowledgePack" || key === "knowledgeSelection" || key === "researchEvidence") continue;
      copy[key] = ctx[key];
    }
    if (copy.lessonPlan) copy.lessonPlan = publishPlan(copy.lessonPlan);
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

  function scopeGuide(ctx, depth) {
    var scope = teachingScope(ctx);
    var span = strandRange(depth);
    var year = beatYear((ctx && (ctx.yearGroup || ctx.yearAssumption)) || "");
    if (scope.scope === "broad") {
      var youngLine = year && year <= 2
        ? " For Year 1 and Year 2, two developed strands are enough. Each strand is one everyday sentence that names an idea and one sentence that says how or why it works, with dependsOn linking that explanation to the name. Two linked strands are better than six unlinked facts. Do not fill the point target with extra names that have no how or why."
        : "";
      return "Scope: the teacher named a broad topic. Choose a coherent scope yourself for this year and duration: at most one shared foundation, then " + (span.low === span.high ? span.low : span.low + " to " + span.high) + " strands about the ideas that matter most for understanding this topic at this age, and a connection point if the strands work together. A shared foundation is optional when it adds no teaching value. Do not invent one to satisfy the format. Each strand head is a feature or concept, not another foundation. Its function or mechanism dependsOn that feature. Each developed strand contains both the named idea and its linked how or why. Do not shrink the lesson to one fact, do not write an encyclopedia list, and do not wait for the teacher to name the subtopics." + youngLine;
    }
    var depthLine = "";
    if (planSeeksDepth(ctx)) {
      var minimum = seekingStrandMinimum(ctx, depth);
      var count = String(minimum);
      if (year <= 2) {
        depthLine = " Year 1 and Year 2 stay in everyday words: one foundation, then " + count + " developed strand" + (minimum === 1 ? "" : "s") + ". Each strand names a feature and says how or why it works. A short true how or why is enough; do not inflate the wording.";
      } else if (year <= 4) {
        depthLine = " Year 3 and Year 4 need " + count + " developed strands: several important ideas inside this goal. Each strand names a feature or event, then how or why it works, then the consequence where it matters. Keep the foundation in a simple sentence.";
      } else {
        depthLine = " Year 5 and Year 6 need " + count + " developed strands with real mechanisms and a connection between them. Deeper means a clearer how or why, richer vocabulary and reasoning, not a fourth strand of names.";
      }
      depthLine += " Use at most one shared foundation, and only when it adds teaching value before every strand. A foundation is optional. Do not invent a foundation to satisfy the format. The named feature or concept is the strand head, and its function or mechanism dependsOn that feature, not the foundation. Each developed strand contains both the named idea and its linked how or why. A sentence that only names what something has is not a developed strand until a later point in the same strand explains it and depends on that name. Do not label that name as foundation.";
    }
    return "Scope: the teacher asked about one relationship, method, or idea. Stay inside it: every strand must lead to the learning goal. Go deeper, not wider: the parts or steps involved, how each one works, and what that achieves for the goal. Do not add other aspects of the wider topic." + depthLine;
  }

  function planBrief(ctx) {
    var safe = forModel(ctx || {});
    var packNote = packConstraint(ctx);
    if (packNote) {
      safe.knowledgePack = packForPlanner(ctx.knowledgePack);
      safe.knowledgeSelection = ctx.knowledgeSelection || null;
    }
    var depth = depthBudget((ctx || {}).yearGroup || (ctx || {}).yearAssumption, (ctx || {}).requestedMinutes);
    var system = [
      "You are planning one primary lesson. This response is the internal lesson plan only.",
      "Return one JSON object and nothing else. Do not write pupil activities, questions, or HTML.",
      "Decide what the children should understand. Then decide what to teach so they can understand it. The classroom activities are chosen in a later step.",
      "Work in this order: the teacher's request, the context, one learning objective, the key knowledge, prior knowledge, misconceptions, vocabulary, the teaching sequence, then where a check or a recap belongs.",
      "learningObjective is one sentence a teacher could say. successCriteria are two or three things the class can do if the lesson worked.",
      "learningMap is the connected journey of learning points a pupil needs in order to achieve lessonBrief.learningGoal. Each point is one child-sized idea in one sentence. Together the points must be sufficient. Build it from strands. Use at most one shared foundation in the whole map. A shared foundation is optional: include it only when that sentence adds teaching value before every strand, and omit it when it does not. Do not invent a foundation to satisfy the format. Do not give a feature, a part, or an adaptation the role foundation. A strand develops one idea: the strand head names the feature, part, event, step, or idea with role feature or concept; then a point explains how or why it works (a function, mechanism, cause, process, or procedure); then, where it matters, a point says what that leads to. When a foundation exists, the strand head lists only that foundation in dependsOn. When it does not, the strand head has an empty dependsOn. The function or mechanism dependsOn that specific feature, not the foundation, and explains records that same id. Each developed strand contains both the named idea and its linked how or why. A function that depends only on the foundation is a separate fact, not a developed strand. A connection point lists the last points of two or more strands and says how they work together. An example point lists the point it shows. Every point adds new information: do not restate an earlier point in other words, do not write a point that only says these things help, and do not write a point about learning the topic itself. Do not write a disconnected list of facts about the topic. For this year and about " + depth.minutes + " minutes, aim for about " + depth.floor + " to " + depth.max + " points. This is a target, not a quota: a narrow goal about one specific feature may need fewer, and never more than " + depth.max + ". Do not reach the number with a restatement, a paraphrase, trivia, or a second example of the same idea. Do not invent quotations, dates, or events. A simplified explanation must still be true. When the goal asks how something helps, causes, affects, works, changes, gets, carries, or transports, or why something happens or matters, the points must lead to the goal: at least one point states the relationship the goal asks about, and every other point is a step towards it. A nearby fact about the same topic that leads nowhere does not belong. importance is core for a point the goal cannot do without and supporting for a helpful step.",
      scopeGuide(ctx || {}, depth),
      "Match the goal. Why or cause: state the reason, not only what is seen or where it happens. Significance or importance: state the change, event, or contribution and why it mattered. Compare: include what is needed about both sides. Process: state the change or sequence, not only the parts, inputs, places, or outputs. Procedure or use: write the actions the pupil carries out, not only the name of the step. Definition: a short definition and only the characteristics or examples needed to use it. Explain: the facts that specific goal needs, not a generic list about the topic.",
      "A sentence that only names the topic, states identity, gives a famous number or date, says something is important or significant, or says where something happens does not meet a relationship the goal requires.",
      "For a young year, use a simple true model: the parts, how they move, and what that movement does. Do not teach the visible effect as the cause. The ground shaking is what an earthquake does, not why it happens.",
      "misconceptions are mistakes children of this age often make. priorKnowledge is what you will treat as already known, or an empty list.",
      "vocabulary is only the words worth teaching at this age.",
      "lessonBrief.intent says whether this lesson is why, process, compare, definition, procedure, or explain. When lessonBrief.teacherIntent is present, lessonBrief.learningGoal is the only new teaching target, lessonBrief.focusConcepts are the ideas to teach, lessonBrief.priorKnowledge is already known and may be the starting point, and lessonBrief.exclusions must not be retaught. lessonBrief.teacherIntent.requiredEvidence says what a correct check must show. It is not an extra learning point. lessonBrief.preferences and the duration are presentation, not learning points. Do not turn prior knowledge or an exclusion into the lesson target.",
      "When teacherIntent is absent, lessonBrief.concepts are the ideas to teach. Do not treat words such as between, difference, why, or how as the concept.",
      "Each learningMap point is { id, knowledge, role, importance, dependsOn, explains" + (packNote ? ", claimIds" : "") + " }. id is p1, p2, and so on. role is foundation, feature, concept, function, cause, effect, mechanism, process, procedure, comparison, example, or connection. Use role foundation at most once. An adaptation's named feature is role feature or concept. A role is only a label: a sentence of six words or a place does not become a cause, function, or process because of its role. The sentence itself must state the relationship. explains is the id of the feature, concept, or earlier point this sentence explains. A mechanism, function, cause, or process sets explains to that feature's id and lists the same id in dependsOn. A foundation, and a strand head with nothing before it, sets explains to an empty string. explains must be an existing point id. Do not point explains at a point the sentence does not explain, and do not choose an id because it is the previous point. A connection point says how earlier points work together. An example point shows an earlier point in use.",
      "lessonArc purpose must be exactly one of these words: hook, investigate, teach, apply, check, resolution, recap. Do not write a sentence as the purpose. The system decides which learning points are taught, in what order, and which are checked, and places them on the teach stage and the recap. The hook and the investigate stage must not contain them.",
      "Age changes the plan: vocabulary, how long the sentences are, how deep the explanation goes, the examples, and how hard the reasoning is. Year 1 and Year 2 key knowledge stays in everyday words.",
      "If yearAssumed is true, plan for yearAssumption and say so in yearGroup. Do not pretend the teacher named that year.",
      "lessonBrief.topic is the specific concept to teach. Do not widen it into a broader topic.",
      "teachingApproach is two sentences on how to teach this subject. narrativeTheme is a light classroom frame, or an empty string if a story frame would get in the way.",
      subjectGuide(safe.subject, (safe.lessonBrief && safe.lessonBrief.topic) || safe.topic),
      "JSON shape: { title, subject, topic, yearGroup, durationMinutes, learningObjective, successCriteria, priorKnowledge, learningMap: [{ id, knowledge, role, importance, dependsOn, explains }], vocabulary, misconceptions, teachingApproach, narrativeTheme, lessonArc: [{ purpose, learningRole, concept }] }."
    ].concat(packNote ? [packNote] : []).join(" ");
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
      ["investigate", "goal", false, false, false, "Ask one question about what the class can see. Do not explain yet."],
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
    var knowledge = textList(plan.keyKnowledge, 180, 12);
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

  var BEAT_MOVES = { notice: 1, predict: 1, name: 1, explain: 1, exemplify: 1, model: 1, compare: 1, connect: 1, practise: 1, apply: 1, retrieve: 1, reveal: 1, consolidate: 1 };

  function beatYear(year) {
    var digit = Number(yearDigit(year));
    if (digit) return digit;
    var number = Number(year);
    return number >= 1 && number <= 6 ? number : 3;
  }

  function beatLimit(year) {
    year = beatYear(year);
    if (year <= 2) return { items: 2, cap: 4 };
    if (year <= 4) return { items: 3, cap: 6 };
    return { items: 4, cap: 8 };
  }

  var DEPTH_BANDS = {
    young: { low: 5, target: 6, high: 7, questions: 2 },
    middle: { low: 6, target: 8, high: 9, questions: 3 },
    older: { low: 7, target: 8, high: 10, questions: 4 }
  };

  function depthBudget(year, minutes) {
    var level = beatYear(year);
    var band = level <= 2 ? DEPTH_BANDS.young : (level <= 4 ? DEPTH_BANDS.middle : DEPTH_BANDS.older);
    var known = Number(minutes) > 0;
    var length = known ? Number(minutes) : 15;
    var max = length <= 8 ? band.low - 2 : (length <= 12 ? band.low : (length <= 17 ? band.target : band.high));
    var floor = Math.min(length <= 8 ? 2 : (length <= 12 ? band.low - 2 : band.low), max);
    return {
      year: level,
      minutes: length,
      durationKnown: known,
      floor: floor,
      narrowFloor: Math.min(Math.max(2, floor - 2), max),
      max: max,
      questions: length <= 8 ? 1 : band.questions
    };
  }

  function beatKind(item) {
    item = item || {};
    var text = item.text || "";
    var labeled = item.knowledgeType || "";
    if (labeled === "cause" || labeled === "reason" || labeled === "process" || statesRelation(text) || statesFunction(text)) return "relationship";
    if (labeled === "procedure" || statesSteps(text)) return "procedure";
    if (labeled === "comparison" || /\b(difference|unlike|whereas)\b/i.test(text)) return "comparison";
    if (labeled === "definition" || /\b(is|are|means|called)\b/i.test(text)) return "definition";
    return "fact";
  }

  function hasLearningMap(plan) {
    return !!(plan && Array.isArray(plan.learningMap) && plan.learningMap.length);
  }

  function mapBeatItems(plan) {
    var known = {};
    plan.learningMap.forEach(function (entry) { if (entry && entry.id) known[entry.id] = true; });
    return plan.learningMap.map(function (entry) {
      entry = entry || {};
      var deps = (entry.dependsOn || []).filter(function (id) { return known[id] && id !== entry.id; });
      return {
        id: entry.id,
        text: entry.knowledge || "",
        kind: mapKind(entry.knowledge || "", entry.role, deps.length),
        role: entry.role || "",
        importance: entry.importance === "supporting" ? "supporting" : "core",
        dependsOn: deps,
        answers: !!entry.answers
      };
    }).filter(function (item) { return item.id && item.text; });
  }

  function beatKnowledge(plan, year) {
    plan = plan || {};
    if (hasLearningMap(plan)) return mapBeatItems(plan);
    var entries = plan.knowledge && plan.knowledge.length ? plan.knowledge : knowledgeEntries(plan.keyKnowledge);
    var limit = beatLimit(year).items;
    return entries.slice(0, limit).map(function (item, index) {
      return { id: "k" + (index + 1), text: item.text, kind: beatKind(item) };
    }).filter(function (item) { return item.text; });
  }

  function makeBeat(stageId, index, move, refs) {
    var limit = move === "consolidate" ? 4 : 2;
    return {
      id: stageId + ":" + index,
      stageId: stageId,
      move: move,
      knowledgeRefs: (refs || []).filter(Boolean).slice(0, limit)
    };
  }

  function soleMove(list, index, move) {
    var ref = (list[index].refs || [])[0];
    if (!ref) return false;
    return !list.some(function (other, otherIndex) {
      return otherIndex !== index && other.move === move && (other.refs || [])[0] === ref;
    });
  }

  function trimMoves(list, cap) {
    var next = (list || []).slice();
    function dropMove(move, keepSole) {
      while (next.length > cap) {
        var index = -1;
        for (var i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].move !== move) continue;
          if (keepSole && soleMove(next, i, move)) continue;
          index = i;
          break;
        }
        if (index === -1) break;
        next.splice(index, 1);
      }
    }
    ["predict", "compare", "connect"].forEach(function (move) { dropMove(move, false); });
    ["exemplify", "model"].forEach(function (move) { dropMove(move, true); });
    while (next.length > cap && next.length > 1) {
      var drop = -1;
      for (var end = next.length - 1; end >= 0; end -= 1) {
        var move = next[end].move;
        if (move === "name" || move === "explain") continue;
        if ((move === "model" || move === "exemplify") && soleMove(next, end, move)) continue;
        drop = end;
        break;
      }
      if (drop === -1) break;
      next.splice(drop, 1);
    }
    return next;
  }

  function packBeats(stageId, list, cap) {
    return trimMoves(list, cap).map(function (item, index) {
      return makeBeat(stageId, index, item.move, item.refs);
    });
  }

  var TEACHING_MOVES = { name: 1, explain: 1, model: 1, connect: 1, exemplify: 1 };
  var ASSESSABLE = { relationship: 4, connection: 4, procedure: 3, comparison: 2, definition: 2 };

  function chunkRefs(list, size) {
    var out = [];
    for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  function teachingLookup(plan) {
    var tp = plan && plan.teachingPlan;
    if (!tp || tp.version !== 1 || !Array.isArray(tp.points)) return null;
    var point = {};
    tp.points.forEach(function (row) { if (row && row.id) point[row.id] = row; });
    return { plan: tp, point: point };
  }

  function strandItems(items, look, strand) {
    return items.filter(function (item) { return look.point[item.id] && look.point[item.id].strand === strand; });
  }

  function teachingApplication(plan, items, look) {
    var strands = (look.plan.strands || []).filter(function (row) { return /^t/.test(row.id); });
    function explainedIn(id) {
      return strandItems(items, look, id).filter(function (item) { return look.point[item.id].explained; });
    }
    var answer = items.filter(function (item) {
      var point = look.point[item.id] || {};
      return item.answers && item.kind === "relationship" && point.strand !== "synthesis";
    })[0];
    var chosen = answer ? { id: look.point[answer.id].strand } : strands.slice().sort(function (a, b) {
      return explainedIn(b.id).length - explainedIn(a.id).length || b.knowledgeRefs.length - a.knowledgeRefs.length || strands.indexOf(a) - strands.indexOf(b);
    })[0];
    var pool = chosen ? strandItems(items, look, chosen.id).filter(function (item) { return item.role !== "example"; }) : [];
    if (!pool.length) pool = items.filter(function (item) { return item.role !== "example"; });
    if (!pool.length) pool = items.slice();
    var explained = pool.filter(function (item) { return look.point[item.id] && look.point[item.id].explained; });
    var focus = answer || explained.slice(-1)[0] || pool[pool.length - 1];
    var used = pool.slice(0, 4);
    if (used.indexOf(focus) === -1) used = used.slice(0, 3).concat([focus]);
    return {
      strand: chosen ? chosen.id : "",
      focus: focus,
      refs: used.map(function (item) { return item.id; }),
      knowledge: used.map(function (item) { return item.text; }),
      evidence: "The pupil uses the taught explanation to get a new case right: " + clean(focus.text, 160)
    };
  }

  function recapChunks(refs, look, year) {
    var size = year >= 4 ? 4 : (refs.length <= 4 ? 1 : 3);
    var groups = [];
    refs.forEach(function (ref) {
      var strand = (look.point[ref] || {}).strand || "";
      var last = groups[groups.length - 1];
      if (last && (last.strand === strand || last.strand === "f" || strand === "synthesis")) {
        last.refs.push(ref);
        if (last.strand === "f") last.strand = strand;
      } else groups.push({ strand: strand, refs: [ref] });
    });
    var chunks = [];
    groups.forEach(function (group) {
      var current = chunks[chunks.length - 1];
      if (current && current.length + group.refs.length <= size) {
        group.refs.forEach(function (ref) { current.push(ref); });
        return;
      }
      for (var i = 0; i < group.refs.length; i += size) chunks.push(group.refs.slice(i, i + size));
    });
    return chunks;
  }

  function planThreadBeats(skeleton, plan, year, look) {
    var bounds = beatLimit(year);
    var depth = depthBudget(year, plan.durationMinutes);
    var items = mapBeatItems(plan);
    if (!items.length) return (skeleton || []).map(function (slot) { return Object.assign({}, slot, { beats: [] }); });
    var textOf = {};
    var byId = {};
    items.forEach(function (item) { textOf[item.id] = item.text; byId[item.id] = item; });
    function strandOf(id) { return (look.point[id] || {}).strand || ""; }
    var hasExample = items.some(function (item) { return item.role === "example" && item.dependsOn.length; });
    var exemplified = false;
    var teach = [];
    items.forEach(function (item) {
      var point = look.point[item.id] || {};
      var strand = strandOf(item.id);
      var inStrand = items.filter(function (other) { return strandOf(other.id) === strand; });
      var parent = item.dependsOn.filter(function (dep) { return strandOf(dep) === strand; }).slice(-1)[0] || "";
      var last = inStrand[inStrand.length - 1] === item;
      if (item.role === "connection" && item.dependsOn.length) {
        teach.push({ move: "connect", refs: [item.id, item.dependsOn[item.dependsOn.length - 1]] });
        return;
      }
      if (item.role === "example" && item.dependsOn.length) {
        teach.push({ move: "exemplify", refs: [item.id, item.dependsOn[0]] });
        return;
      }
      if (item.kind === "procedure") {
        teach.push({ move: "name", refs: [item.id] });
        if (year >= 3) teach.push({ move: "model", refs: [item.id] });
        return;
      }
      if (point.explained || item.kind === "relationship") {
        if (!item.dependsOn.length) teach.push({ move: "name", refs: [item.id] });
        var consequence = parent && last && inStrand.length >= 3 && (look.point[parent] || {}).explained;
        teach.push({ move: consequence ? "connect" : "explain", refs: consequence ? [item.id, parent] : [item.id] });
        return;
      }
      teach.push({ move: "name", refs: [item.id] });
      if (item.kind === "definition" && !hasExample && !exemplified) {
        teach.push({ move: "exemplify", refs: [item.id] });
        exemplified = true;
      }
    });
    var taught = [];
    teach.forEach(function (step) {
      if (TEACHING_MOVES[step.move]) step.refs.forEach(function (ref) { if (taught.indexOf(ref) === -1) taught.push(ref); });
    });
    var taughtItems = taught.map(function (ref) { return byId[ref]; }).filter(Boolean);
    var application = teachingApplication(plan, taughtItems, look);
    var focus = application.focus.id;
    var ranked = taughtItems.map(function (item, order) {
      var point = look.point[item.id] || {};
      var base = item.role === "example" ? 0 : (ASSESSABLE[item.kind] || (point.explained ? 4 : 0));
      return { item: item, order: order, score: base ? base + (item.answers ? 3 : 0) + (item.importance === "core" ? 2 : 0) : 0 };
    }).filter(function (row) { return row.score > 0; }).sort(function (a, b) {
      return b.score - a.score || a.order - b.order;
    });
    var picked = [];
    var used = {};
    ranked.forEach(function (row) {
      var strand = strandOf(row.item.id);
      if (picked.length < depth.questions && !used[strand]) { picked.push(row.item); used[strand] = true; }
    });
    ranked.forEach(function (row) {
      if (picked.length < depth.questions && picked.indexOf(row.item) === -1) picked.push(row.item);
    });
    if (!picked.length) picked = [application.focus];
    picked.sort(function (a, b) { return taughtItems.indexOf(a) - taughtItems.indexOf(b); });
    var checkRefs = picked.map(function (item) { return item.id; });
    var recapRefs = recapChunks(taught, look, year);
    var first = items[0].id;
    var comparison = items.filter(function (item) { return item.kind === "comparison"; });
    var hook = [{ move: "notice", refs: [first] }];
    if (year >= 3) hook.push({ move: "predict", refs: [first] });
    var investigate = [{ move: "notice", refs: [first] }];
    if (year >= 3 && comparison.length) investigate.push({ move: "compare", refs: comparison.slice(0, 2).map(function (item) { return item.id; }) });
    var shaped = {
      hook: hook,
      investigate: investigate,
      teach: teach,
      apply: [{ move: year <= 3 ? "practise" : "apply", refs: [focus] }],
      check: checkRefs.map(function (ref) { return { move: "retrieve", refs: [ref] }; }),
      resolution: [{ move: "reveal", refs: [checkRefs[0]] }],
      recap: recapRefs.map(function (refs) { return { move: "consolidate", refs: refs }; })
    };
    return (skeleton || []).map(function (slot) {
      var list = shaped[slot.id] || [];
      var cap = slot.id === "teach" || slot.id === "check" || slot.id === "recap" ? Math.max(list.length, 1) : bounds.cap;
      var beats = packBeats(slot.id, list, cap).filter(function (beat) { return BEAT_MOVES[beat.move]; });
      var next = Object.assign({}, slot, { beats: beats });
      if (slot.id === "check") next.requiredKnowledge = checkRefs.map(function (ref) { return textOf[ref]; });
      if (slot.id === "apply") {
        next.applicationTarget = { strand: application.strand, knowledgeRefs: application.refs.slice(), knowledge: application.knowledge.slice(), evidence: application.evidence };
      }
      return next;
    });
  }

  function planMapBeats(skeleton, plan, year) {
    var look = teachingLookup(plan);
    if (look) return planThreadBeats(skeleton, plan, year, look);
    var bounds = beatLimit(year);
    var depth = depthBudget(year, plan.durationMinutes);
    var items = mapBeatItems(plan);
    if (!items.length) return (skeleton || []).map(function (slot) { return Object.assign({}, slot, { beats: [] }); });
    var first = items[0].id;
    var textOf = {};
    items.forEach(function (item) { textOf[item.id] = item.text; });
    var hasExample = items.some(function (item) { return item.kind === "example"; });
    var exemplified = false;
    var teach = [];
    items.forEach(function (item) {
      if (item.kind === "connection") { teach.push({ move: "connect", refs: [item.id] }); return; }
      if (item.kind === "example") { teach.push({ move: "exemplify", refs: [item.id] }); return; }
      if (item.kind === "relationship") {
        if (!item.dependsOn.length) teach.push({ move: "name", refs: [item.id] });
        teach.push({ move: "explain", refs: [item.id] });
        return;
      }
      teach.push({ move: "name", refs: [item.id] });
      if (item.kind === "procedure" && year >= 3) teach.push({ move: "model", refs: [item.id] });
      if (item.kind === "definition" && !hasExample && !exemplified) {
        teach.push({ move: "exemplify", refs: [item.id] });
        exemplified = true;
      }
    });
    var taught = {};
    teach.forEach(function (step) {
      if (TEACHING_MOVES[step.move]) step.refs.forEach(function (ref) { taught[ref] = true; });
    });
    var taughtItems = items.filter(function (item) { return taught[item.id]; });
    var focusItem = taughtItems.filter(function (item) { return item.kind === "relationship" && item.answers; })[0] ||
      taughtItems.filter(function (item) { return item.kind === "relationship"; })[0] ||
      (year >= 3 ? taughtItems.filter(function (item) { return item.kind === "procedure"; })[0] : null) ||
      taughtItems[0];
    var focus = focusItem.id;
    var ranked = taughtItems.map(function (item, order) {
      var base = ASSESSABLE[item.kind];
      return { item: item, order: order, score: base ? base + (item.answers ? 3 : 0) + (item.importance === "core" ? 2 : 0) : 0 };
    }).filter(function (row) { return row.score > 0; }).sort(function (a, b) {
      return b.score - a.score || a.order - b.order;
    });
    var picked = ranked.slice(0, depth.questions).map(function (row) { return row.item; });
    if (!picked.length) picked = [focusItem];
    picked.sort(function (a, b) { return taughtItems.indexOf(a) - taughtItems.indexOf(b); });
    var checkRefs = picked.map(function (item) { return item.id; });
    var named = taughtItems.map(function (item) { return item.id; });
    var recapRefs;
    if (year >= 4) recapRefs = chunkRefs(named, 4);
    else if (named.length <= 4) recapRefs = chunkRefs(named, 1);
    else recapRefs = chunkRefs(named, year <= 2 ? 2 : 3);
    var comparison = items.filter(function (item) { return item.kind === "comparison"; });
    var hook = [{ move: "notice", refs: [first] }];
    if (year >= 3) hook.push({ move: "predict", refs: [first] });
    var investigate = [{ move: "notice", refs: [first] }];
    if (year >= 3 && comparison.length) investigate.push({ move: "compare", refs: comparison.slice(0, 2).map(function (item) { return item.id; }) });
    var shaped = {
      hook: hook,
      investigate: investigate,
      teach: teach,
      apply: [{ move: year <= 3 ? "practise" : "apply", refs: [focus] }],
      check: checkRefs.map(function (ref) { return { move: "retrieve", refs: [ref] }; }),
      resolution: [{ move: "reveal", refs: [checkRefs[0]] }],
      recap: recapRefs.map(function (refs) { return { move: "consolidate", refs: refs }; })
    };
    return (skeleton || []).map(function (slot) {
      var list = shaped[slot.id] || [];
      var cap = slot.id === "teach" || slot.id === "check" || slot.id === "recap" ? Math.max(list.length, 1) : bounds.cap;
      var beats = packBeats(slot.id, list, cap).filter(function (beat) { return BEAT_MOVES[beat.move]; });
      var next = Object.assign({}, slot, { beats: beats });
      if (slot.id === "check") next.requiredKnowledge = checkRefs.map(function (ref) { return textOf[ref]; });
      return next;
    });
  }

  function taughtLedger(slots) {
    var at = {};
    var order = [];
    var before = {};
    (slots || []).forEach(function (slot) {
      if (!slot) return;
      before[slot.id] = order.slice();
      (slot.beats || []).forEach(function (beat) {
        if (!TEACHING_MOVES[beat.move]) return;
        (beat.knowledgeRefs || []).forEach(function (ref) {
          if (at[ref]) return;
          at[ref] = { stage: slot.id, beatId: beat.id, move: beat.move };
          order.push(ref);
        });
      });
    });
    return { taught: order, at: at, before: before };
  }

  function teachingTrace(plan, slots, ctx) {
    plan = plan || {};
    ctx = ctx || {};
    var year = beatYear((ctx.yearGroup || ctx.yearAssumption) || plan.yearGroup);
    var depth = plan.depthBudget || depthBudget(year, plan.durationMinutes);
    var items = beatKnowledge(plan, year);
    var textOf = {};
    items.forEach(function (item) { textOf[item.id] = item.text; });
    var look = teachingLookup(plan);
    var ledger = taughtLedger(slots);
    function strandOf(ref) {
      return look && look.point[ref] ? look.point[ref].strand : "";
    }
    var beats = [];
    var byRef = {};
    (slots || []).forEach(function (slot) {
      if (!slot) return;
      (slot.beats || []).forEach(function (beat) {
        (beat.knowledgeRefs || []).forEach(function (ref) {
          var row = {
            stage: slot.id,
            beatId: beat.id,
            move: beat.move,
            ref: ref,
            strand: strandOf(ref),
            knowledge: textOf[ref] || ""
          };
          beats.push(row);
          if (!byRef[ref]) byRef[ref] = { ref: ref, strand: row.strand, knowledge: row.knowledge, learned: "", used: "", checked: "", consolidated: "" };
          var entry = byRef[ref];
          if (TEACHING_MOVES[beat.move]) {
            var learned = beat.move + " in " + slot.id;
            if (!entry.learned) entry.learned = learned;
            else if (entry.learned.indexOf(beat.move + " ") !== 0 && entry.learned.indexOf(", " + beat.move) === -1) entry.learned += ", then " + beat.move;
          }
          if (!entry.used && (beat.move === "practise" || beat.move === "apply")) entry.used = beat.move + " in " + slot.id;
          if (!entry.checked && beat.move === "retrieve") entry.checked = beat.id;
          if (!entry.consolidated && beat.move === "consolidate") entry.consolidated = beat.id;
        });
      });
    });
    var check = (slots || []).filter(function (slot) { return slot && slot.id === "check"; })[0];
    var checkStrands = [];
    ((check && check.beats) || []).forEach(function (beat) {
      var strand = strandOf((beat.knowledgeRefs || [])[0]);
      if (strand && checkStrands.indexOf(strand) === -1) checkStrands.push(strand);
    });
    return {
      year: depth.year,
      minutes: depth.minutes,
      depthFloor: depth.floor,
      depthMax: depth.max,
      questionBudget: depth.questions,
      checkQuestions: ((check && check.beats) || []).filter(function (beat) { return beat.move === "retrieve"; }).length,
      checkStrands: checkStrands,
      taughtBeforeApply: (ledger.before.apply || []).slice(),
      taughtBeforeCheck: (ledger.before.check || []).slice(),
      beats: beats,
      knowledge: Object.keys(byRef).map(function (ref) { return byRef[ref]; })
    };
  }

  function learningMapReport(plan, slots, ctx) {
    plan = plan || {};
    var map = Array.isArray(plan.learningMap) ? plan.learningMap : [];
    var ledger = taughtLedger(slots);
    var beats = [];
    var stageRefs = {};
    (slots || []).forEach(function (slot) {
      if (!slot) return;
      var refs = stageRefs[slot.id] = [];
      (slot.beats || []).forEach(function (beat) {
        (beat.knowledgeRefs || []).forEach(function (ref) { if (refs.indexOf(ref) === -1) refs.push(ref); });
        if (beats.length < 40) beats.push({ beatId: beat.id, move: beat.move, refs: (beat.knowledgeRefs || []).slice(0, 4) });
      });
    });
    var budget = plan.depthBudget || null;
    return {
      teacherGoal: clean(learningGoalOf(ctx || {}) || plan.learningObjective, 200),
      learningMapCount: map.length,
      learningMapIds: map.map(function (item) { return item.id; }).slice(0, 14),
      learningMap: map.slice(0, 14).map(function (item) {
        return {
          id: item.id,
          knowledge: clean(item.knowledge, 140),
          role: item.role || "",
          importance: item.importance || "",
          dependsOn: (item.dependsOn || []).slice(0, 6),
          claimIds: (item.claimIds || []).slice(0, 4)
        };
      }),
      admitted: map.map(function (item) { return item.id; }).slice(0, 14),
      rejected: (plan.mapRejected || []).slice(0, 8).map(function (item) {
        return { knowledge: clean(item.knowledge, 140), reason: clean(item.reason, 60) };
      }),
      depthBudget: budget ? { year: budget.year, minutes: budget.minutes, durationKnown: !!budget.durationKnown, floor: budget.floor, narrowFloor: budget.narrowFloor, max: budget.max, questions: budget.questions } : null,
      beats: beats,
      taughtBeforeApply: (ledger.before.apply || []).slice(),
      taughtBeforeCheck: (ledger.before.check || []).slice(),
      applyRefs: stageRefs.apply || [],
      checkRefs: stageRefs.check || [],
      recapRefs: stageRefs.recap || []
    };
  }

  function slotById(slots, id) {
    return (slots || []).filter(function (slot) { return slot && (slot.id === id || slot.slotId === id); })[0] || null;
  }

  function assessmentCandidates(plan, slots) {
    var look = teachingLookup(plan);
    if (!look) return [];
    var ledger = taughtLedger(slots);
    var before = ledger.before.check || ledger.taught;
    var apply = slotById(slots, "apply");
    var applyRefs = (apply && apply.applicationTarget && apply.applicationTarget.knowledgeRefs) || [];
    var focus = ((apply && apply.beats && apply.beats[0] && apply.beats[0].knowledgeRefs) || [])[0] || "";
    var textOf = {};
    (plan.learningMap || []).forEach(function (item) { textOf[item.id] = item.knowledge; });
    return look.plan.points.filter(function (point) {
      return point.category === "substantive" || point.category === "synthesis";
    }).slice(0, 10).map(function (point) {
      var level = point.id === focus || (point.explained && applyRefs.indexOf(point.id) !== -1 && point.category === "substantive") ? "application" : (point.explained || point.category === "synthesis" ? "explanation" : "retrieval");
      return {
        strand: point.strand,
        knowledgeRefs: [point.id],
        evidence: clean((level === "retrieval" ? "The pupil recalls that " : "The pupil explains that ") + String(textOf[point.id] || "").replace(/^./, function (c) { return c.toLowerCase(); }), 180),
        taughtBefore: before.indexOf(point.id) !== -1,
        level: level
      };
    });
  }

  function recapTakeaways(plan, slots) {
    var look = teachingLookup(plan);
    var recap = slotById(slots, "recap");
    if (!recap) return [];
    var textOf = {};
    (plan.learningMap || []).forEach(function (item) { textOf[item.id] = item.knowledge; });
    var out = [];
    (recap.beats || []).filter(function (beat) { return beat.move === "consolidate"; }).forEach(function (beat) {
      var refs = beat.knowledgeRefs || [];
      var groups = [];
      refs.forEach(function (ref) {
        var strand = look && look.point[ref] ? look.point[ref].strand : "";
        var group = groups.filter(function (row) { return row.strand === strand; })[0];
        if (!group) groups.push(group = { strand: strand, refs: [] });
        group.refs.push(ref);
      });
      var major = groups.filter(function (row) { return row.strand !== "f"; });
      (major.length ? major : groups).forEach(function (group) {
        var key = look ? group.refs.filter(function (ref) { return look.point[ref] && (look.point[ref].explained || look.point[ref].category === "synthesis"); }).slice(-1)[0] : "";
        var ref = key || group.refs[group.refs.length - 1] || "";
        out.push({ beatId: beat.id, knowledgeRefs: group.refs.slice(), strand: group.strand, takeaway: clean(textOf[ref], 140) });
      });
    });
    return out.slice(0, 6);
  }

  function teachingPlanReport(plan, slots, ctx) {
    plan = plan || {};
    var look = teachingLookup(plan);
    if (!look) return null;
    var tp = look.plan;
    var teach = slotById(slots, "teach");
    var apply = slotById(slots, "apply");
    var scenes = null;
    try { scenes = planScenes(slots, plan, ctx || {}); } catch (e) { scenes = null; }
    function strandsFor(refs) {
      var out = [];
      (refs || []).forEach(function (ref) {
        var strand = look.point[ref] && look.point[ref].strand;
        if (strand && out.indexOf(strand) === -1) out.push(strand);
      });
      return out;
    }
    var target = apply && apply.applicationTarget;
    return {
      scope: tp.scope,
      scopeReason: clean(tp.scopeReason, 140),
      substantiveDepth: Object.assign({}, tp.substantiveDepth),
      threads: (tp.strands || []).slice(0, 8).map(function (row) {
        return {
          id: row.id,
          purpose: clean(row.purpose, 100),
          knowledgeRefs: (row.knowledgeRefs || []).slice(0, 8),
          dependencies: (row.dependencies || []).slice(0, 6),
          substantivePoints: (row.substantivePoints || []).slice(0, 8),
          supportingPoints: (row.supportingPoints || []).slice(0, 8),
          developed: !!row.developed
        };
      }),
      teachingProgression: ((teach && teach.beats) || []).slice(0, 24).map(function (beat) {
        return { beatId: beat.id, move: beat.move, knowledgeRefs: (beat.knowledgeRefs || []).slice(0, 4), threadId: strandsFor(beat.knowledgeRefs)[0] || "" };
      }),
      sceneCoverage: (scenes || []).slice(0, 12).map(function (scene) {
        var refs = (scene.knowledgeRefs || []).concat(scene.usesRefs || []);
        return { sceneId: scene.id, purpose: scene.purpose, threadIds: strandsFor(refs), knowledgeRefs: (scene.knowledgeRefs || []).slice(0, 12) };
      }),
      applicationCandidate: target ? { thread: target.strand, knowledgeRefs: (target.knowledgeRefs || []).slice(0, 4), expectedEvidence: clean(target.evidence, 200) } : null,
      assessmentCandidates: assessmentCandidates(plan, slots),
      checkRefs: (((slotById(slots, "check") || {}).beats) || []).map(function (beat) { return (beat.knowledgeRefs || [])[0] || ""; }),
      recapTakeaways: recapTakeaways(plan, slots),
      rejectedAsDepth: (tp.rejectedAsDepth || []).slice(0, 10)
    };
  }

  var SCENE_STAGES = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];
  var SCENE_LABELS = { investigate: "Explore", learn: "Discover", connect: "Connect", synthesise: "Try it", challenge: "Challenge", finish: "Finish" };
  var SCENE_SHOTS = { investigate: "hook", learn: "teach", connect: "teach", synthesise: "apply", challenge: "check", finish: "resolution" };

  function sceneTeachBudget(minutes) {
    var length = Number(minutes) > 0 ? Number(minutes) : 15;
    if (length <= 8) return 1;
    if (length <= 12) return 2;
    if (length <= 17) return 3;
    if (length <= 24) return 4;
    return 5;
  }

  function sceneStageInteraction(slot) {
    var scene = (slot && slot.scene) || {};
    var first = (scene.interactions && scene.interactions[0]) || scene.interaction || null;
    if (first && first.type) return String(first.type);
    return slot && slot.interactionIntent ? String(slot.interactionIntent) : "";
  }

  function planScenes(slots, plan, ctx) {
    plan = plan || {};
    ctx = ctx || {};
    var list = (slots || []).filter(Boolean);
    if (list.length !== SCENE_STAGES.length) return null;
    var byStage = {};
    for (var s = 0; s < list.length; s += 1) {
      var stageId = list[s].slotId || list[s].id;
      if (stageId !== SCENE_STAGES[s] || !Array.isArray(list[s].beats)) return null;
      byStage[stageId] = list[s];
    }
    var teachBeats = byStage.teach.beats.filter(function (beat) { return beat && beat.id; });
    if (!teachBeats.length) return null;
    var year = beatYear(ctx.yearGroup || plan.yearGroup);
    var cap = beatLimit(year).cap;
    var budget = sceneTeachBudget(Number(ctx.requestedMinutes) || Number(plan.durationMinutes) || 15);
    var info = {};
    beatKnowledge(plan, year).forEach(function (item) { info[item.id] = item; });
    function teaches(beat) {
      return TEACHING_MOVES[beat.move] ? (beat.knowledgeRefs || []) : [];
    }
    function anchorOf(ref, seen) {
      var item = info[ref];
      if (!item) return ref;
      var joins = item.kind === "example" || item.role === "example" || item.importance === "supporting";
      if (joins && item.dependsOn && item.dependsOn.length && !seen[ref]) {
        seen[ref] = true;
        return anchorOf(item.dependsOn[0], seen);
      }
      return ref;
    }
    var look = teachingLookup(plan);
    function strandOf(beat) {
      var ref = (beat.knowledgeRefs || [])[0];
      return look && ref && look.point[ref] ? look.point[ref].strand : "";
    }
    function connective(beat) {
      var ref = (beat.knowledgeRefs || [])[0];
      if (strandOf(beat)) return strandOf(beat) === "synthesis";
      return beat.move === "connect" || !!(ref && info[ref] && info[ref].kind === "connection");
    }
    function keyOf(beat) {
      if (connective(beat)) return "connect";
      return anchorOf((beat.knowledgeRefs || [])[0] || beat.id, {});
    }
    function group(beats) {
      var refs = [];
      beats.forEach(function (beat) {
        (beat.knowledgeRefs || []).forEach(function (ref) { if (refs.indexOf(ref) === -1) refs.push(ref); });
      });
      return { beats: beats, refs: refs, connect: beats.every(connective) };
    }
    var raw = [];
    teachBeats.forEach(function (beat) {
      var key = keyOf(beat);
      var last = raw[raw.length - 1];
      if (last && last.key === key) last.beats.push(beat);
      else raw.push({ key: key, beats: [beat] });
    });
    var taught = {};
    var groups = [];
    raw.forEach(function (item) {
      var fresh = false;
      item.beats.forEach(function (beat) {
        teaches(beat).forEach(function (ref) {
          if (!taught[ref]) fresh = true;
          taught[ref] = true;
        });
      });
      if (!fresh && groups.length) groups[groups.length - 1] = group(groups[groups.length - 1].beats.concat(item.beats));
      else groups.push(group(item.beats));
    });
    if (groups.length > 1 && !groups[0].beats.some(function (beat) { return teaches(beat).length; })) {
      groups[1] = group(groups[0].beats.concat(groups[1].beats));
      groups.shift();
    }
    var split = [];
    groups.forEach(function (item) {
      if (item.beats.length <= cap) { split.push(item); return; }
      var seen = {};
      var chunk = [];
      item.beats.forEach(function (beat) {
        var fresh = teaches(beat).some(function (ref) { return !seen[ref]; });
        if (chunk.length >= cap && fresh) {
          split.push(group(chunk));
          chunk = [];
        }
        chunk.push(beat);
        teaches(beat).forEach(function (ref) { seen[ref] = true; });
      });
      if (chunk.length) split.push(group(chunk));
    });
    groups = split;
    function strandsIn(item) {
      var out = [];
      if (!look) return out;
      item.refs.forEach(function (ref) {
        var strand = look.point[ref] && look.point[ref].strand;
        if (strand && /^t/.test(strand) && out.indexOf(strand) === -1) out.push(strand);
      });
      return out;
    }
    function affinity(a, b) {
      var shared = strandsIn(a);
      if (strandsIn(b).some(function (strand) { return shared.indexOf(strand) !== -1; })) return true;
      if (look && strandsIn(a).length && strandsIn(b).length) return false;
      return b.refs.some(function (ref) {
        var deps = (info[ref] && info[ref].dependsOn) || [];
        return deps.some(function (dep) { return a.refs.indexOf(dep) !== -1; });
      });
    }
    while (groups.length > budget) {
      var best = -1;
      var bestScore = null;
      for (var g = 0; g < groups.length - 1; g += 1) {
        var size = groups[g].beats.length + groups[g + 1].beats.length;
        if (size > cap) continue;
        var score = [groups[g].connect || groups[g + 1].connect ? 1 : 0, affinity(groups[g], groups[g + 1]) ? 0 : 1, size, g];
        var better = !bestScore;
        for (var k = 0; !better && k < score.length; k += 1) {
          if (score[k] < bestScore[k]) better = true;
          else if (score[k] > bestScore[k]) break;
        }
        if (better) { best = g; bestScore = score; }
      }
      if (best === -1) break;
      groups.splice(best, 2, group(groups[best].beats.concat(groups[best + 1].beats)));
    }
    var opening = (byStage.hook.beats || []).concat(byStage.investigate.beats || []).filter(function (beat) { return beat && beat.id; });
    var openingTeach = [];
    var lead = groups[0];
    var firstRef = lead.connect ? "" : (teaches(lead.beats[0])[0] || "");
    if (firstRef) {
      var unit = [];
      for (var u = 0; u < lead.beats.length; u += 1) {
        var refs = teaches(lead.beats[u]);
        if (refs.length !== 1 || refs[0] !== firstRef) break;
        unit.push(lead.beats[u]);
      }
      var remains = lead.beats.length > unit.length || groups.length > 1;
      if (unit.length && remains && opening.length + unit.length <= cap) {
        openingTeach = unit;
        if (lead.beats.length > unit.length) groups[0] = group(lead.beats.slice(unit.length));
        else groups.shift();
      }
    }
    var scenes = [];
    var known = {};
    function asset(shot) {
      var slot = byStage[shot] || {};
      return (slot.scene && slot.scene.visualAssetId) || shot;
    }
    function addScene(purpose, stageIds, beats) {
      var fresh = [];
      var uses = [];
      beats.forEach(function (beat) {
        var taughtHere = teaches(beat);
        (beat.knowledgeRefs || []).forEach(function (ref) {
          if (taughtHere.indexOf(ref) !== -1 && !known[ref]) {
            known[ref] = true;
            fresh.push(ref);
          }
        });
      });
      beats.forEach(function (beat) {
        (beat.knowledgeRefs || []).forEach(function (ref) {
          if (fresh.indexOf(ref) === -1 && uses.indexOf(ref) === -1) uses.push(ref);
        });
      });
      var interaction = null;
      stageIds.forEach(function (id) {
        if (interaction || id === "teach" || id === "check" || id === "resolution" || id === "recap") return;
        var family = sceneStageInteraction(byStage[id]);
        var owner = beats.filter(function (beat) { return beat.stageId === id || String(beat.id).indexOf(id + ":") === 0; })[0];
        if (family && owner) interaction = { family: family, refId: (owner.knowledgeRefs || [])[0] || "", beatId: owner.id };
      });
      var shot = SCENE_SHOTS[purpose];
      scenes.push({
        id: "s" + (scenes.length + 1),
        purpose: purpose,
        stageIds: stageIds.slice(),
        beatIds: beats.map(function (beat) { return beat.id; }),
        knowledgeRefs: fresh,
        usesRefs: uses,
        visual: { assetId: asset(shot), baseShot: shot, focus: null },
        interaction: interaction,
        retrieval: null,
        label: SCENE_LABELS[purpose]
      });
    }
    addScene("investigate", openingTeach.length ? ["hook", "investigate", "teach"] : ["hook", "investigate"], opening.concat(openingTeach));
    groups.forEach(function (item) { addScene(item.connect ? "connect" : "learn", ["teach"], item.beats); });
    addScene("synthesise", ["apply"], byStage.apply.beats || []);
    addScene("challenge", ["check"], byStage.check.beats || []);
    addScene("finish", ["resolution", "recap"], (byStage.resolution.beats || []).concat(byStage.recap.beats || []));
    return scenes;
  }

  function sceneReport(scenes) {
    return (scenes || []).slice(0, 12).map(function (scene) {
      return {
        sceneId: scene.id,
        purpose: scene.purpose,
        stageIds: (scene.stageIds || []).slice(0, 7),
        beatIds: (scene.beatIds || []).slice(0, 12),
        knowledgeRefs: (scene.knowledgeRefs || []).slice(0, 12),
        usesRefs: (scene.usesRefs || []).slice(0, 12),
        interaction: (scene.interaction && scene.interaction.family) || "",
        visualAssetId: (scene.visual && scene.visual.assetId) || ""
      };
    });
  }

  function planBeats(skeleton, plan, year) {
    year = beatYear(year);
    if (hasLearningMap(plan)) return planMapBeats(skeleton, plan, year);
    var bounds = beatLimit(year);
    var depth = depthBudget(year, plan && plan.durationMinutes);
    var items = beatKnowledge(plan, year);
    if (!items.length) return (skeleton || []).map(function (slot) { return Object.assign({}, slot, { beats: [] }); });
    var first = items[0].id;
    var english = /english|writ|grammar/i.test((plan && plan.subject) || "");
    var comparison = items.filter(function (item) { return item.kind === "comparison"; });
    var teach = [];
    items.forEach(function (item, index) {
      teach.push({ move: "name", refs: [item.id] });
      if (item.kind === "relationship") {
        teach.push({ move: "explain", refs: [item.id] });
      }
      if (item.kind === "procedure" && year >= 3) teach.push({ move: "model", refs: [item.id] });
      var example = item.kind === "definition" || (english && (item.kind === "definition" || item.kind === "procedure"));
      if (example && (year >= 3 || index === 0)) teach.push({ move: "exemplify", refs: [item.id] });
    });
    if (year >= 3 && items.length >= 2) teach.push({ move: "connect", refs: [items[0].id, items[1].id] });
    var taught = {};
    var teachCap = Math.max(teach.length, 1);
    packBeats("teach", teach, teachCap).forEach(function (beat) {
      if (beat.move === "name" || beat.move === "explain" || beat.move === "model" || beat.move === "exemplify") {
        (beat.knowledgeRefs || []).forEach(function (ref) { taught[ref] = true; });
      }
    });
    var focus = first;
    var focused = false;
    packBeats("teach", teach, teachCap).forEach(function (beat) {
      if (!focused && (beat.move === "explain" || beat.move === "model") && beat.knowledgeRefs[0]) {
        focus = beat.knowledgeRefs[0];
        focused = true;
      }
    });
    var teachBeats = packBeats("teach", teach, teachCap);
    var connect = null;
    teachBeats.forEach(function (beat) { if (beat.move === "connect") connect = beat; });
    var named = items.filter(function (item) { return taught[item.id]; }).map(function (item) { return item.id; });
    if (!named.length) named = [first];
    var checkPool = items.filter(function (item) { return taught[item.id] && (ASSESSABLE[item.kind] || item.id === focus); });
    if (!checkPool.length) checkPool = items.filter(function (item) { return item.id === focus; });
    var checkRefs = checkPool.slice(0, depth.questions).map(function (item) { return item.id; });
    if (year >= 5 && connect) {
      connect.knowledgeRefs.forEach(function (ref) {
        if (checkRefs.length < depth.questions && checkRefs.indexOf(ref) === -1) checkRefs.push(ref);
      });
    }
    if (!checkRefs.length) checkRefs = [focus];
    var checkBeats = checkRefs.map(function (ref) { return { move: "retrieve", refs: [ref] }; });
    var recap = year >= 4
      ? [{ move: "consolidate", refs: named.slice() }]
      : named.map(function (ref) { return { move: "consolidate", refs: [ref] }; });
    var hook = [{ move: "notice", refs: [first] }];
    if (year >= 3) hook.push({ move: "predict", refs: [first] });
    var investigate = [{ move: "notice", refs: [first] }];
    if (year >= 3 && comparison.length) investigate.push({ move: "compare", refs: comparison.slice(0, 2).map(function (item) { return item.id; }) });
    var shaped = {
      hook: hook,
      investigate: investigate,
      teach: teach,
      apply: [{ move: year <= 3 ? "practise" : "apply", refs: [focus] }],
      check: checkBeats,
      resolution: [{ move: "reveal", refs: [checkRefs[0] || focus] }],
      recap: recap
    };
    return (skeleton || []).map(function (slot) {
      var list = shaped[slot.id] || [];
      var cap = slot.id === "teach" || slot.id === "check" || slot.id === "recap" ? Math.max(list.length, 1) : bounds.cap;
      var beats = packBeats(slot.id, list, cap).filter(function (beat) { return BEAT_MOVES[beat.move]; });
      var next = Object.assign({}, slot, { beats: beats });
      if (slot.id === "check") {
        var textOf = {};
        items.forEach(function (item) { textOf[item.id] = item.text; });
        next.requiredKnowledge = checkRefs.map(function (ref) { return textOf[ref]; }).filter(Boolean);
      }
      return next;
    });
  }

  function keepBeatPlan(planned, returned) {
    var byId = {};
    (returned || []).forEach(function (beat) {
      if (!beat) return;
      var pupil = beat.pupil && typeof beat.pupil === "object" ? beat.pupil : beat;
      if (beat.id) byId[beat.id] = { cue: clean(pupil.cue, 180), text: clean(pupil.text || pupil.pupilText, 280) };
    });
    return (planned || []).map(function (beat) {
      var got = byId[beat.id] || {};
      return {
        id: beat.id,
        stageId: beat.stageId,
        move: beat.move,
        knowledgeRefs: (beat.knowledgeRefs || []).slice(),
        pupil: { cue: got.cue || "", text: got.text || "" }
      };
    });
  }

  function beatProblems(slots) {
    var flat = [];
    (slots || []).forEach(function (slot) {
      ((slot && slot.beats) || []).forEach(function (beat) { flat.push(beat); });
    });
    var issues = [];
    var taught = {};
    flat.forEach(function (beat) {
      var refs = beat.knowledgeRefs || [];
      if (beat.move === "practise" || beat.move === "apply" || beat.move === "retrieve" || beat.move === "reveal" || beat.move === "consolidate") {
        refs.forEach(function (ref) {
          if (!taught[ref]) issues.push("The " + beat.id + " beat uses " + ref + " before it is taught.");
        });
        refs.forEach(function (ref) {
          var waiting = flat.some(function (other) {
            return (other.move === "explain" || other.move === "model") && (other.knowledgeRefs || []).indexOf(ref) !== -1;
          });
          var done = flat.some(function (other) {
            return flat.indexOf(other) < flat.indexOf(beat) && (other.move === "explain" || other.move === "model") && (other.knowledgeRefs || []).indexOf(ref) !== -1;
          });
          if (waiting && !done && (beat.move === "practise" || beat.move === "apply")) {
            issues.push("The " + beat.id + " beat uses " + ref + " before it is explained.");
          }
        });
      }
      if (TEACHING_MOVES[beat.move]) {
        refs.forEach(function (ref) { taught[ref] = true; });
      }
    });
    var covered = {};
    flat.forEach(function (beat) {
      if (beat.move !== "consolidate") return;
      (beat.knowledgeRefs || []).forEach(function (ref) { covered[ref] = true; });
    });
    Object.keys(taught).forEach(function (ref) {
      if (!covered[ref]) issues.push("The recap misses " + ref + ".");
    });
    return issues;
  }

  function pupilSentence(text, year, minimum) {
    var value = clean(text, 280);
    if (!/[.?!]$/.test(value)) return false;
    var words = value.split(/\s+/).filter(Boolean);
    if (words.length < (minimum || 4)) return false;
    var count = value.split(/[.?!]+/).filter(function (part) { return clean(part); }).length;
    if (beatYear(year) <= 2) return count === 1;
    return count >= 1 && count <= 2;
  }

  function sameSentence(left, right) {
    function norm(value) {
      return clean(value).toLowerCase().replace(/[.?!]+$/g, "").trim();
    }
    var a = norm(left);
    return !!a && a === norm(right);
  }

  function teachStructureIssues(activity, ctx) {
    var year = (ctx && (ctx.yearGroup || (ctx.lessonPlan && ctx.lessonPlan.yearGroup))) || "";
    var planned = planBeats([{ id: "teach" }], (ctx && ctx.lessonPlan) || {}, year);
    var expected = (planned[0] && planned[0].beats) || [];
    var beats = (activity && activity.beats) || [];
    var issues = [];
    expected.forEach(function (need) {
      if (need.move !== "explain" && need.move !== "model" && need.move !== "exemplify") return;
      var ref = (need.knowledgeRefs || [])[0] || "";
      var found = beats.some(function (beat) {
        return beat.move === need.move && (beat.knowledgeRefs || []).indexOf(ref) !== -1;
      });
      if (!found) issues.push("The teach stage names " + (ref || "the idea") + " without the required " + need.move + " beat.");
    });
    return issues;
  }

  function quizBackedRetrieve(slot, beat) {
    return !!(slot && slot.id === "check" && slot.mechanic === "quiz" && beat && beat.move === "retrieve");
  }

  function moveGuide(skeleton, year) {
    var seen = {};
    (skeleton || []).forEach(function (slot) {
      (slot.beats || []).forEach(function (beat) { if (beat && beat.move) seen[beat.move] = true; });
    });
    var meaning = {
      notice: "notice directs attention to one concrete unsolved problem and does not give the later explanation. It is not an empty question such as what lives here." + (beatYear(year) <= 2 ? " A Year 1 or Year 2 notice beat is one sentence: one looking question or one looking instruction. It is never an instruction followed by a question." : ""),
      predict: "predict asks for a prediction from what the class can already use.",
      name: "name states the planned knowledge clearly in one short everyday sentence. It says what the thing is, not only a bare label.",
      explain: "explain says how or why the referenced knowledge works, in new words and in one short sentence. Naming the thing is not an explanation.",
      exemplify: "exemplify gives one concrete example of the referenced knowledge. Do not say only that an example exists.",
      model: "model shows the step or action of the referenced knowledge. Do not say only that there is a worked step.",
      compare: "compare points to a relevant similarity or difference.",
      connect: "connect states how the referenced knowledge joins the ideas taught before it.",
      practise: "practise is short pupil-facing preparation for the task. It refers to the knowledge the child is about to use on a new case. It does not merely say use your knowledge. It does not write only 'use it in what you make'. It does not duplicate the entire task instruction or repeat the taught sentence.",
      apply: "apply is a short pupil-facing bridge from the taught knowledge into the task. It names the idea the pupil should use. It does not replace the task itself, and it is not a request to repeat the fact.",
      reveal: "reveal settles the adventure by stating the taught knowledge. When the adventure has a mission, the sentence is that mission's payoff. Do not say only that the class can now use the idea.",
      consolidate: "consolidate restates the learned knowledge itself, including the how or why when that was taught. Do not say only that the lesson is finished or that the class can now use the idea."
    };
    var lines = Object.keys(meaning).filter(function (move) { return seen[move]; }).map(function (move) { return meaning[move]; });
    return lines.length ? "Pupil text for each planned move: " + lines.join(" ") : "";
  }

  function beatResponseExample(skeleton) {
    var slots = {};
    (skeleton || []).forEach(function (slot) {
      if (!slot.beats || !slot.beats.length) return;
      var quiz = slot.mechanic === "quiz" && slot.beats.some(function (beat) { return beat.move === "retrieve"; });
      if (quiz) {
        var retrieves = slot.beats.filter(function (beat) { return beat.move === "retrieve"; });
        if (retrieves.length > 1) {
          slots[slot.id] = {
            questions: retrieves.map(function (beat) {
              return { id: beat.id, prompt: "...", choices: ["...", "..."], correct: "...", explain: "...", successEvidence: "...", teachingConnection: "..." };
            })
          };
        } else {
          slots[slot.id] = { prompt: "...", choices: ["...", "..."], correct: "...", explain: "...", successEvidence: "...", teachingConnection: "..." };
        }
        return;
      }
      var body = {
        beats: slot.beats.map(function (beat) { return { id: beat.id, cue: "...", text: "..." }; })
      };
      if (slot.id === "apply") {
        body.instruction = "...";
        body.target = "...";
        body.successCondition = "...";
        body.teachingConnection = "...";
      }
      slots[slot.id] = body;
    });
    if (!Object.keys(slots).length) return "";
    return "Beat slots use this shape and no other pupil prose: " + JSON.stringify({ title: "...", objectives: ["..."], slots: slots }) + " Return those beat ids with cue and text. Do not add title or lines to a beat slot.";
  }

  function pupilCopyContract(year) {
    var young = beatYear(year) <= 2;
    var age = young
      ? "Year 1 and Year 2 pupil sentences are exactly one sentence."
      : "Later years use one or two pupil sentences.";
    var consolidate = young
      ? "A Year 1 or Year 2 consolidate beat is exactly one pupil-facing sentence of at least four words. It states the learned knowledge itself. Do not use generic meta language about the lesson, the idea, what we learned, or the class. Do not merely celebrate completion."
      : "A consolidate beat is one or two pupil-facing sentences of at least four words. It states the learned knowledge itself.";
    return age + " Every pupil sentence ends with . or ? or !. Investigate text is at least six words. Every other pupil sentence is at least four words. " + consolidate;
  }

  function pupilCopyReason(text, year, minimum, blocked) {
    var value = clean(text, 280);
    if (!value) return "missing";
    if (!/[.?!]$/.test(value)) return "missing terminal punctuation";
    var words = value.split(/\s+/).filter(Boolean);
    if (words.length < (minimum || 4)) return "fewer than minimum words";
    var count = value.split(/[.?!]+/).filter(function (part) { return clean(part); }).length;
    if (beatYear(year) <= 2) {
      if (count !== 1) return "too many sentences for year";
    } else if (count < 1 || count > 2) return "too many sentences for year";
    if ((blocked || []).some(function (field) { return sameSentence(value, field); })) return "internal-copy collision";
    return "";
  }

  function pupilBeatDiagnostics(slot, beats, items, year) {
    var rows = [];
    var names = {};
    (beats || []).forEach(function (beat) {
      if (quizBackedRetrieve(slot, beat)) return;
      var pupil = beat.pupil || {};
      var text = pupil.text || "";
      var cue = pupil.cue || "";
      var minimum = slot && slot.id === "investigate" ? 6 : 4;
      var blocked = [slot && slot.pedagogicalPurpose, slot && slot.interactionIntent, slot && slot.id, slot && slot.contentDepth, beat.move, beat.id, beat.stageId];
      function row(reason) {
        rows.push({
          stageId: (slot && slot.id) || beat.stageId || "",
          beatId: beat.id || "",
          move: beat.move || "",
          knowledgeRefs: (beat.knowledgeRefs || []).slice(),
          cue: clean(cue, 180),
          text: clean(text, 280),
          reason: reason
        });
      }
      var textReason = pupilCopyReason(text, year, minimum, blocked);
      if (!textReason) textReason = beatSubstanceReason(beat, text, items);
      if (textReason) row(textReason);
      if (cue) {
        var cueReason = pupilCopyReason(cue, year, 4, blocked);
        if (cueReason) row(cueReason);
      }
      var ref = (beat.knowledgeRefs || [])[0];
      var item = null;
      (items || []).forEach(function (entry) { if (entry.id === ref) item = entry; });
      var reveal = !!TEACHING_MOVES[beat.move];
      if (!reveal && item && sameSentence(text, item.text)) row("copies a knowledge sentence");
      if (beat.move === "name" && ref) names[ref] = text;
      if (beat.move === "explain" && ref && sameSentence(text, names[ref])) row("copies the name sentence");
    });
    return rows;
  }

  function beatRepairFix(reason, year) {
    var young = beatYear(year) <= 2;
    var fixes = {
      "missing": "It is empty. Write one pupil sentence.",
      "missing terminal punctuation": "End the sentence with . or ? or !.",
      "fewer than minimum words": "It is too short. Write at least four words.",
      "too many sentences for year": young ? "It has more than one sentence. Year 1 and Year 2 need exactly one sentence. Do not write an instruction followed by a question. Keep one of them as the whole sentence." : "It has more than two sentences. Use one or two sentences.",
      "internal-copy collision": "It copies an internal label. Write words a pupil would hear.",
      "copies a knowledge sentence": "It copies the knowledge sentence word for word. Say the same idea in new words.",
      "copies the name sentence": "It repeats the name sentence. Explain the idea in new words.",
      "does not explain": "It names the thing but does not say how or why. Add the cause, the step, or what it does.",
      "does not give an example": "It does not give a real example. Name one concrete case of the taught idea.",
      "does not demonstrate": "It does not show the step. Walk through the action the pupil should watch.",
      "does not use the taught knowledge": "It does not ask the pupil to use the taught idea. Give a new case that needs that idea.",
      "does not transfer the taught knowledge": "It does not name the taught idea the task will use. Point at that idea, not at the lesson in general.",
      "does not settle the taught knowledge": "It celebrates finishing. State the taught idea that settles the mission.",
      "does not bring the learning together": "It talks about the lesson. State the knowledge the class can now say."
    };
    return fixes[reason] || "Rewrite this beat.";
  }

  var ACTION_VERB = /\b(grip|grips|gripping|breathe|breathes|breathing|push|pushes|pushing|pull|pulls|pulling|lift|lifts|lifting|steer|steers|steering|carry|carries|carrying|soak|soaks|soaking|move|moves|moving|turn|turns|turning|slide|slides|sliding|spread|spreads|sweep|sweeps|drive|drives|catch|catches|hold|holds|keep|keeps|slow|slows|flow|flows|flowing|flood|floods|multiply|multiplies|add|adds|divide|divides|wear|wears|drop|drops|join|joins|balance|balances|pick|picks|picking|drag|drags|dragging|build|builds|building|feed|feeds|feeding|grow|grows|growing)\b/i;
  var META_SHELL = /\b(the class can now|we learned|what we learned|the idea about|today we|you now know|idea from this lesson|let'?s think)\b/i;

  function knowledgeOverlap(text, knowledge) {
    var used = contentWords(text);
    var seen = {};
    return contentWords(knowledge).filter(function (bit) {
      if (bit.length < 4 || seen[bit]) return false;
      if (!used.some(function (word) { return sameStem(word, bit); })) return false;
      seen[bit] = 1;
      return true;
    });
  }

  function knowledgeOf(refs, items) {
    return (refs || []).map(function (ref) {
      var found = "";
      (items || []).forEach(function (item) { if (item.id === ref) found = item.text; });
      return found;
    }).filter(Boolean).join(" ");
  }

  function resultSo(text) {
    return /\bso\b(?!\s+(?:that|far|much|many|easily|well))/i.test(String(text || ""));
  }

  function bareLabel(text) {
    return /^(a |an |the )?[a-z0-9' -]{0,48}\b(is|are|was|were|has|have)\b/i.test(clean(text));
  }

  function explainsBeat(text, knowledge) {
    var body = String(text || "").replace(/^\s*this matters because\s+/i, "");
    var causal = statesRelation(body) || statesFunction(body) || ACTION_VERB.test(body) || resultSo(body);
    var hits = knowledgeOverlap(text, knowledge);
    if (causal && hits.length >= 1) return true;
    return hits.length >= 3 && !bareLabel(body);
  }

  function genericExample(text) {
    return /\bhere is one clear example\b/i.test(text) || /\bexample of (the |this )?idea\b/i.test(text) || /\bthe idea in use\b/i.test(text);
  }

  function bareUse(text) {
    var norm = clean(text).toLowerCase().replace(/[.?!]+$/g, "").trim();
    return /^use\b.+\bin what you make$/.test(norm) || /\buse your knowledge\b/.test(norm);
  }

  function emptyMeta(text, knowledge) {
    return META_SHELL.test(text) && knowledgeOverlap(text, knowledge).length < 2;
  }

  function beatSubstanceReason(beat, text, items) {
    var knowledge = knowledgeOf(beat.knowledgeRefs, items);
    if (!knowledge || !beat || !beat.move) return "";
    var hits = knowledgeOverlap(text, knowledge);
    if (beat.move === "explain") return explainsBeat(text, knowledge) ? "" : "does not explain";
    if (beat.move === "exemplify") {
      if ((genericExample(text) && hits.length < 2) || !hits.length) return "does not give an example";
      return "";
    }
    if (beat.move === "model") {
      if ((!hits.length && /\b(worked step|say what changes)\b/i.test(text)) || !hits.length) return "does not demonstrate";
      if (!/\b(first|then|next|step|watch)\b/i.test(text) && !explainsBeat(text, knowledge)) return "does not demonstrate";
      return "";
    }
    if (beat.move === "practise") {
      if (bareUse(text) || emptyMeta(text, knowledge) || !hits.length) return "does not use the taught knowledge";
      if (!/\b(show|choose|find|point|sort|decide|build|label|match|move|push|complete|pick|try|shade|group|order|arrange|compare|predict|use|make|place|put|trace)\b/i.test(text)) return "does not use the taught knowledge";
      return "";
    }
    if (beat.move === "apply") {
      if (bareUse(text) || emptyMeta(text, knowledge) || !hits.length) return "does not transfer the taught knowledge";
      if (/^(what|why|which|who)\b/i.test(clean(text))) return "does not transfer the taught knowledge";
      return "";
    }
    if (beat.move === "reveal") return emptyMeta(text, knowledge) || !hits.length ? "does not settle the taught knowledge" : "";
    if (beat.move === "consolidate") return emptyMeta(text, knowledge) || !hits.length ? "does not bring the learning together" : "";
    return "";
  }

  function substanceIssue(beat, reason) {
    var phrase = {
      "does not explain": "does not explain the idea",
      "does not give an example": "does not give an example",
      "does not demonstrate": "does not demonstrate the idea",
      "does not use the taught knowledge": "does not use the taught knowledge",
      "does not transfer the taught knowledge": "does not use the taught knowledge",
      "does not settle the taught knowledge": "does not settle the taught knowledge",
      "does not bring the learning together": "does not bring the learning together"
    }[reason] || "does not teach";
    return "The " + beat.id + " beat " + phrase + ".";
  }

  var APPLY_REPAIR_FIX = {
    "recall-only": "The task only asks the pupil to recall the fact. Ask the pupil to do something that uses it.",
    "pupil-selection": "The task only asks the pupil to choose. Ask the pupil to do something that uses the taught idea.",
    "bare-interaction": "The task is a bare sort, move, or sequence. Make the action depend on the taught idea.",
    "knowledge-unidentified": "The task does not use the knowledge it names.",
    "different-knowledge": "The task uses a different taught idea from the one it names.",
    "not-an-action": "The instruction asks the pupil to discuss, explain, or describe the fact instead of doing an action that uses it."
  };

  function pupilBeatProblems(slot, beats, items, year) {
    var issues = [];
    var names = {};
    (beats || []).forEach(function (beat) {
      if (quizBackedRetrieve(slot, beat)) return;
      var pupil = beat.pupil || {};
      var text = pupil.text || "";
      var minimum = slot && slot.id === "investigate" ? 6 : 4;
      var blocked = [slot && slot.pedagogicalPurpose, slot && slot.interactionIntent, slot && slot.id, slot && slot.contentDepth, beat.move, beat.id, beat.stageId];
      if (!pupilSentence(text, year, minimum) || blocked.some(function (field) { return sameSentence(text, field); })) {
        issues.push("The " + beat.id + " beat needs a pupil sentence.");
      }
      if (pupil.cue && (!pupilSentence(pupil.cue, year, 4) || blocked.some(function (field) { return sameSentence(pupil.cue, field); }))) {
        issues.push("The " + beat.id + " beat needs a pupil sentence.");
      }
      var ref = (beat.knowledgeRefs || [])[0];
      var item = null;
      (items || []).forEach(function (entry) { if (entry.id === ref) item = entry; });
      var reveal = !!TEACHING_MOVES[beat.move];
      if (!reveal && item && sameSentence(text, item.text)) issues.push("The " + beat.id + " beat repeats a knowledge sentence.");
      if (beat.move === "name" && ref) names[ref] = text;
      if (beat.move === "explain" && ref && sameSentence(text, names[ref])) issues.push("The " + beat.id + " beat repeats the name sentence.");
      var copyOk = pupilSentence(text, year, minimum) && !blocked.some(function (field) { return sameSentence(text, field); });
      if (copyOk) {
        var substance = beatSubstanceReason(beat, text, items);
        if (substance) issues.push(substanceIssue(beat, substance));
      }
    });
    return issues;
  }

  function slotContent(raw) {
    raw = raw || {};
    var config = raw.config && typeof raw.config === "object" ? raw.config : raw;
    var lines = Array.isArray(config.lines) ? config.lines : (Array.isArray(raw.lines) ? raw.lines : []);
    if (!lines.length && typeof config.lines === "string") lines = [config.lines];
    var question = (Array.isArray(config.questions) && config.questions[0]) || {};
    var sourceQuestions = Array.isArray(config.questions) && config.questions.length
      ? config.questions
      : (Array.isArray(raw.questions) && raw.questions.length ? raw.questions : []);
    var questions = sourceQuestions.map(function (item) {
      item = item || {};
      return {
        id: clean(item.id, 24),
        prompt: clean(item.prompt, 240),
        choices: (item.choices || []).map(function (choice) { return textOf(choice, 80); }).filter(Boolean).slice(0, 4),
        correct: textOf(item.correct, 80),
        explain: clean(item.explain, 240),
        knowledgeChecked: clean(item.knowledgeChecked, 180),
        successEvidence: clean(item.successEvidence, 180),
        teachingConnection: clean(item.teachingConnection, 180)
      };
    }).filter(function (item) { return item.prompt || item.correct; });
    var interaction = raw.scene && raw.scene.interaction && typeof raw.scene.interaction === "object" ? raw.scene.interaction : {};
    // Patch 6: a research apply slot may return structured choices and a new example. The keys
    // are added only when present, so other slots and the default path are unchanged.
    var structured = (Array.isArray(raw.applyChoices) && raw.applyChoices.length ? raw.applyChoices : (Array.isArray(raw.choices) && raw.choices.length ? raw.choices : (Array.isArray(interaction.choices) ? interaction.choices : []))).filter(function (choice) { return choice && typeof choice === "object" && !Array.isArray(choice); });
    var rawCase = raw.newCase && typeof raw.newCase === "object" ? raw.newCase : (interaction.newCase && typeof interaction.newCase === "object" ? interaction.newCase : null);
    var extra = {};
    if (structured.length) extra.applyChoices = structured.slice(0, 4).map(function (choice) {
      return { text: clean(choice.text, 160), correct: choice.correct === true, feedback: clean(choice.feedback, 300) };
    });
    if (rawCase) extra.newCase = {
      text: clean(rawCase.text, 300),
      kind: rawCase.kind === "sourced" ? "sourced" : (rawCase.kind === "transfer" ? "transfer" : clean(rawCase.kind, 20)),
      sourceRef: (Array.isArray(rawCase.sourceRef) ? rawCase.sourceRef : (rawCase.sourceRef ? [rawCase.sourceRef] : [])).map(function (id) { return clean(id, 24); }).filter(Boolean).slice(0, 2),
      quote: clean(rawCase.quote, 400)
    };
    return Object.assign(extra, {
      title: clean(raw.title || config.title, 80),
      lines: lines.map(function (line) { return textOf(line, 280); }).filter(Boolean).slice(0, 4),
      instruction: clean(raw.applyInstruction || config.instruction || raw.instruction || interaction.instruction || config.prompt || question.prompt, 180),
      target: clean(config.target || raw.target || interaction.target, 80),
      knowledgeUsed: clean(raw.knowledgeUsed || config.knowledgeUsed, 180),
      successCondition: clean(raw.successCondition || config.successCondition, 180),
      teachingConnection: clean(raw.teachingConnection || config.teachingConnection || question.teachingConnection, 180),
      prompt: clean(question.prompt || config.prompt || raw.prompt, 240),
      choices: (question.choices || config.choices || raw.choices || []).map(function (choice) { return textOf(choice, 80); }).filter(Boolean).slice(0, 4),
      correct: textOf(question.correct || config.correct || raw.correct, 80),
      explain: clean(question.explain || config.explain || raw.explain, 240),
      knowledgeChecked: clean(question.knowledgeChecked || config.knowledgeChecked || raw.knowledgeChecked, 180),
      successEvidence: clean(question.successEvidence || config.successEvidence || raw.successEvidence, 180),
      questions: questions,
      beats: (Array.isArray(config.beats) ? config.beats : (Array.isArray(raw.beats) ? raw.beats : [])).map(function (beat) {
        beat = beat || {};
        var pupil = beat.pupil && typeof beat.pupil === "object" ? beat.pupil : {};
        return {
          id: clean(beat.id, 24),
          cue: clean(beat.cue || pupil.cue, 180),
          text: clean(beat.text || pupil.text, 280)
        };
      }).filter(function (beat) { return beat.id; })
    });
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
    var task = clean(activity && activity.applyInstruction || (interaction && interaction.instruction) || "", 180);
    if (activity && activity.beats && activity.beats.length) return task;
    return task || clean((config.lines || []).join(" "), 180);
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

  var DEPICT = { draw: 1, drawing: 1, write: 1, writing: 1, sketch: 1, sketching: 1, picture: 1 };

  function disguisedRecall(instruction, sentence) {
    var words = linkWords(instruction).filter(function (word) { return word.length >= 4; });
    if (!words.some(function (word) { return RESTATE[word]; })) return false;
    if (!words.some(function (word) { return DEPICT[word]; })) return false;
    var sentenceWords = linkWords(sentence);
    return !words.some(function (word) {
      if (RESTATE[word] || DEPICT[word]) return false;
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
    if (disguisedRecall(instruction, matched)) return { status: "fail", reason: "not-an-action", matchedKnowledge: matched, evidence: hits };
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

  function labelledApplyKnowledge(instruction, stamped, required) {
    var named = clean(stamped, 180);
    if (!named) return "";
    var verdict = applyAlignment({ applyInstruction: instruction, knowledgeUsed: named }, required || []);
    if (verdict.status !== "fail" || verdict.reason !== "different-knowledge") return named;
    var replacement = "";
    var replacementHits = 0;
    (required || []).forEach(function (sentence) {
      if (!sentence || sentence === named) return;
      var hits = hitBits(instruction, sentence);
      var bits = linkBits(sentence);
      var ratio = bits.length ? hits.length / bits.length : 0;
      if (!hits.length || ratio < 0.5 || hits.length <= replacementHits) return;
      var trial = applyAlignment({ applyInstruction: instruction, knowledgeUsed: sentence }, required || []);
      if (trial.status === "fail") return;
      replacement = sentence;
      replacementHits = hits.length;
    });
    return replacement || named;
  }

  function knowledgeForQuestion(asked, stamped, pool) {
    var tag = clean(stamped, 180);
    if (!tag || !pool || pool.length < 2) return tag;
    var linked = knowledgeLink(asked, pool);
    if (!linked || linked === tag) return tag;
    if (hitBits(asked, linked).length > hitBits(asked, tag).length) return clean(linked, 180);
    return tag;
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

  function requiredEvidenceOf(ctx) {
    var intent = ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent;
    if (!intent || intent.ok !== true) return "";
    return clean(intent.requiredEvidence, 280);
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

  function checkQuestionsOf(activity) {
    var config = (activity && activity.config) || {};
    var list = Array.isArray(config.questions) && config.questions.length ? config.questions : null;
    if (!list) return [checkQuestionOf(activity)];
    return list.map(function (question) {
      question = question || {};
      return {
        id: question.id || "",
        prompt: clean(question.prompt, 240),
        choices: question.choices || [],
        correct: clean(question.correct, 80),
        explain: clean(question.explain, 240),
        knowledgeChecked: clean(question.knowledgeChecked, 180),
        successEvidence: clean(question.successEvidence, 180),
        teachingConnection: clean(question.teachingConnection, 180)
      };
    });
  }

  function questionActivity(activity, question) {
    return {
      slotId: activity && activity.slotId,
      mechanic: activity && activity.mechanic,
      beats: activity && activity.beats,
      scene: activity && activity.scene,
      config: { questions: [question], lines: (activity && activity.config && activity.config.lines) || [] }
    };
  }
  function checkAlignment(activity, ctx) {
    if (!learningGoalOf(ctx)) return { status: "skip", reason: "no-learning-goal" };
    if (!requiredEvidenceOf(ctx)) return { status: "fail", reason: "missing-evidence" };
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

  function checkEvidenceDecision(coverage) {
    var name = typeof coverage === "string" ? coverage.trim().toLowerCase() : "";
    if (name === "sufficient") return { ok: true, coverage: "sufficient", outcome: "check-pass", issue: "" };
    if (name === "partial") return { ok: true, coverage: "partial", outcome: "check-partial", issue: "The check slot leaves part of the required evidence untested." };
    if (name === "unrelated") return { ok: true, coverage: "unrelated", outcome: "check-unrelated", issue: "The check slot does not test the required evidence." };
    return { ok: false, coverage: null, outcome: "check-error", issue: "The check slot needs evidence alignment." };
  }

  function droppedLeak(text, plan) {
    var dropped = plan && plan.droppedKnowledge;
    if (!dropped || !dropped.length || !text) return false;
    var kept = ((plan.keyKnowledge || []).join(" ")).toLowerCase();
    var blob = String(text).toLowerCase();
    return dropped.some(function (item) {
      return contentWords(item).some(function (word) {
        return word.length >= 4 && kept.indexOf(word) === -1 && blob.indexOf(word) !== -1;
      });
    });
  }

  function untaughtKnowledgeIssues(activity, ctx) {
    var plan = ctx && ctx.lessonPlan;
    if (!plan || !activity) return [];
    var slot = activity.slotId;
    if (slot !== "apply" && slot !== "check" && slot !== "resolution" && slot !== "recap") return [];
    var bits = [];
    if (slot === "apply") bits.push(applyInstructionOf(activity));
    if (slot === "check") {
      checkQuestionsOf(activity).forEach(function (question) {
        // The scored answer and the question are what the check marks. Feedback may restate the taught idea.
        bits.push(question.correct, question.prompt);
      });
    }
    ((activity.config && activity.config.lines) || []).forEach(function (line) { bits.push(line); });
    ((activity.beats || [])).forEach(function (beat) {
      if (beat && beat.pupil) bits.push(beat.pupil.text || "");
    });
    if (!bits.some(function (bit) { return droppedLeak(bit, plan); })) return [];
    if (slot === "check") return ["The check scores knowledge that was not taught."];
    if (slot === "apply") return ["The apply task uses knowledge that was not taught."];
    return ["The " + slot + " uses knowledge that was not taught."];
  }

  function retrieveSubstanceIssues(activity, slot, items) {
    var retrieves = ((slot && slot.beats) || (activity && activity.beats) || []).filter(function (beat) {
      return beat && beat.move === "retrieve";
    });
    if (!retrieves.length) return [];
    var questions = checkQuestionsOf(activity);
    var issues = [];
    retrieves.forEach(function (beat, index) {
      var knowledge = knowledgeOf(beat.knowledgeRefs, items);
      if (!knowledge) return;
      var question = questions.length > 1 ? (questions[index] || {}) : (questions[0] || {});
      var blob = [question.prompt, question.correct, question.explain].join(" ");
      if (!knowledgeOverlap(blob, knowledge).length) {
        issues.push("The check slot does not retrieve the taught knowledge for " + (beat.id || "this question") + ".");
      }
    });
    return issues;
  }

  function checkSlotIssues(activity, ctx) {
    var aligned = checkAlignment(activity, ctx);
    if (aligned.status === "skip") return [];
    if (aligned.status === "fail") {
      if (aligned.reason === "incomplete-question") return ["The check slot has no real question."];
      if (aligned.reason === "missing-evidence") return ["The check slot has no required evidence."];
      return ["The check slot does not say what learning it checks."];
    }
    var decision = checkEvidenceDecision(ctx && ctx.checkSemantic && ctx.checkSemantic.coverage);
    if (!decision.ok) return [decision.issue];
    if (decision.issue) return [decision.issue];
    return [];
  }

  function checkReportOf(activities, ctx) {
    if (!ctx || !ctx.lessonSkeleton) return null;
    var activity = null;
    (activities || []).forEach(function (item) { if (item && item.slotId === "check") activity = item; });
    if (!activity) return null;
    var reports = checkQuestionsOf(activity).map(function (question) {
      return checkAlignment(questionActivity(activity, question), ctx);
    });
    var aligned = reports.filter(function (item) { return item.status === "fail"; })[0]
      || reports.filter(function (item) { return item.status === "unresolved"; })[0]
      || reports[0]
      || { status: "skip", reason: "no-check" };
    return { deterministicStatus: aligned.status, deterministicReason: aligned.reason };
  }

  function checkJudgePlan(result) {
    if (!result) return "skip";
    var status = result.checkAlignment && result.checkAlignment.deterministicStatus;
    if (status === "unresolved") return "judge";
    return "skip";
  }

  function retrieveTexts(activity, ctx) {
    var plan = ctx && ctx.lessonPlan;
    var year = (ctx && (ctx.yearGroup || ctx.yearAssumption)) || (plan && plan.yearGroup) || "";
    var items = beatKnowledge(plan || {}, year);
    return ((activity && activity.beats) || []).filter(function (beat) { return beat && beat.move === "retrieve"; }).map(function (beat) {
      var ref = (beat.knowledgeRefs || [])[0];
      var text = "";
      items.forEach(function (item) { if (item.id === ref) text = item.text; });
      return text;
    });
  }

  function checkEvidenceInput(activity, ctx, index) {
    var questions = checkQuestionsOf(activity);
    var at = index || 0;
    var question = questions[at] || checkQuestionOf(activity);
    var evidence = requiredEvidenceOf(ctx);
    var taught = retrieveTexts(activity, ctx);
    if (questions.length > 1) {
      var named = question.knowledgeChecked;
      if (named && taught.indexOf(named) !== -1) evidence = named;
      else if (taught[at]) evidence = taught[at];
    }
    return {
      yearGroup: (ctx && ctx.yearGroup) || "",
      prompt: question.prompt,
      choices: (question.choices || []).slice(0, 4),
      correct: question.correct,
      requiredEvidence: evidence
    };
  }

  function checkEvidenceBrief(input) {
    var payload = {
      yearGroup: clean(input && input.yearGroup, 40),
      prompt: clean(input && input.prompt, 240),
      choices: textList(input && input.choices, 80, 4),
      correct: clean(input && input.correct, 80)
    };
    return {
      system: [
        "You state only what a correct answer to this question shows. Return one JSON object and nothing else.",
        "You can see the year group, the question, the choices, and the correct answer. You cannot see a lesson, a teacher request, or a learning goal. Do not guess what a teacher hoped to teach.",
        "demonstratedEvidence is one short statement of what we can reasonably conclude a pupil knows or can do solely because they answered this question correctly.",
        "Be conservative. Do not claim a whole process, a comparison of two things, a measurement, a use of a tool or a mark, or an inference unless this question actually requires that.",
        "Knowing the first stage is not knowing the whole order. Naming a label is not measuring. Defining a word is not using it. Stating one side is not comparing two things. Naming one part is not showing the whole structure.",
        "Choosing from a list can still show inference, use, measurement, or representation when the correct answer itself requires that thinking. Say what the correct answer shows, not the name of the classroom action of ticking a box.",
        "reason is one sentence about what the pupil actually does.",
        "JSON shape: {\"demonstratedEvidence\":\"\",\"reason\":\"\"}."
      ].join(" "),
      user: JSON.stringify(payload)
    };
  }

  function parseCheckEvidence(raw) {
    var body = raw;
    if (typeof raw === "string") {
      try { body = JSON.parse(raw); } catch (e) { body = null; }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, demonstratedEvidence: "", reason: "" };
    var evidence = clean(body.demonstratedEvidence, 280);
    if (evidence.length < 8) return { ok: false, demonstratedEvidence: "", reason: "" };
    return { ok: true, demonstratedEvidence: evidence, reason: clean(body.reason, 240) };
  }

  function checkCoverageBrief(input) {
    var payload = {
      requiredEvidence: clean(input && input.requiredEvidence, 280),
      demonstratedEvidence: clean(input && input.demonstratedEvidence, 280)
    };
    return {
      system: [
        "You compare two statements of learning evidence. Return one JSON object and nothing else.",
        "requiredEvidence is what the pupil must show. demonstratedEvidence is what a correct answer to one question shows. You cannot see the lesson, the question, the topic, or the teacher's request.",
        "coverage is exactly one of sufficient, partial, or unrelated.",
        "sufficient means the demonstrated evidence is enough to conclude the pupil achieved the required learning. A smaller example can be sufficient when it still shows the whole required skill or relationship.",
        "partial means the demonstrated evidence is related, but a material part of requiredEvidence is still untested. That includes one stage instead of a whole order, one side instead of a comparison, one item when both are required, a definition instead of use, a label instead of a measurement, or one component instead of the requested structure.",
        "unrelated means the demonstrated evidence does not test requiredEvidence.",
        "Do not rewrite either statement. Do not add learning that neither statement contains.",
        "JSON shape: {\"coverage\":\"sufficient\" or \"partial\" or \"unrelated\",\"reason\":\"one short sentence\"}."
      ].join(" "),
      user: JSON.stringify(payload)
    };
  }

  function parseCheckCoverage(raw) {
    var body = raw;
    if (typeof raw === "string") {
      try { body = JSON.parse(raw); } catch (e) { body = null; }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, coverage: null, reason: "" };
    var decision = checkEvidenceDecision(body.coverage);
    if (!decision.ok) return { ok: false, coverage: null, reason: "" };
    return { ok: true, coverage: decision.coverage, reason: clean(body.reason, 240) };
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
    var knowledgeYear = (ctx && (ctx.yearGroup || ctx.yearAssumption)) || plan.yearGroup;
    function knowledgeText(ref) {
      var found = "";
      if (!ref) return found;
      beatKnowledge(plan, knowledgeYear).forEach(function (item) {
        if (item.id === ref) found = item.text;
      });
      return found;
    }
    var stageTitle = { hook: "Arrival", investigate: "Mission", teach: "Discovery", apply: "Try it", check: "Look", resolution: "Home", recap: "Recap" };
    var activities = (skeleton || []).map(function (slot) {
      var content = map[slot.id] || {};
      var beats = slot.beats && slot.beats.length ? keepBeatPlan(slot.beats, content.beats) : [];
      var spoken = beats.length
        ? beats.map(function (beat) { return beat.pupil && beat.pupil.text; }).filter(Boolean)
        : (content.lines || []).slice();
      var beatApply = !!(beats.length && slot.id === "apply");
      if (!beatApply && slot.id === "apply" && content.instruction && !spoken.length) spoken = [content.instruction];
      var refs = beats.length && beats[0].knowledgeRefs ? beats[0].knowledgeRefs : [];
      var refText = refs.map(knowledgeText).filter(Boolean).join(" ");
      var interaction = null;
      if (slot.interactionIntent) {
        interaction = {
          type: slot.interactionIntent,
          target: content.target || FAMILY_TARGET[slot.interactionIntent] || "world",
          instruction: beatApply ? (content.instruction || "") : (content.instruction || (spoken[0] || "")),
          successCondition: content.successCondition || ""
        };
      }
      // Patch 6, research mode: the apply task is a choice on a new example with feedback per
      // choice. The unit comes from the apply beat's knowledge refs (ID lineage), not the model.
      if (slot.id === "apply" && researchMode(ctx) && content.applyChoices && content.applyChoices.length) {
        var applyClaims = mapClaimIds(plan, beats.reduce(function (all, beat) { return all.concat(beat.knowledgeRefs || []); }, []));
        var applyUnit = "";
        researchUnits(ctx).forEach(function (unit) {
          if (!applyUnit && applyClaims.indexOf(unit.explanationClaimId) !== -1) applyUnit = unit.unitId;
        });
        interaction = {
          type: "choose",
          target: "choices",
          instruction: content.instruction || "",
          successCondition: "correct-choice",
          choices: content.applyChoices,
          newCase: content.newCase || null,
          unitId: applyUnit,
          intent: slot.interactionIntent || ""
        };
      }
      var checked = beats.length && slot.id === "check" ? (refText || content.knowledgeChecked) : content.knowledgeChecked;
      var provided = content.questions && content.questions.length
        ? content.questions
        : (content.prompt ? [{ id: "", prompt: content.prompt, choices: content.choices || [], correct: content.correct, explain: content.explain, knowledgeChecked: checked, successEvidence: content.successEvidence, teachingConnection: content.teachingConnection }] : []);
      var retrieves = beats.filter(function (beat) { return beat.move === "retrieve"; });
      var retrievePool = [];
      retrieves.forEach(function (beat) {
        var text = knowledgeText(beat && beat.knowledgeRefs && beat.knowledgeRefs[0]);
        if (text && retrievePool.indexOf(text) === -1) retrievePool.push(text);
      });
      var questionSource = retrieves.length > 1 ? retrieves.map(function (beat, index) {
        var match = null;
        provided.forEach(function (item) { if (item && item.id === beat.id) match = item; });
        return match || provided[index] || {};
      }) : provided;
      var config = slot.mechanic === "quiz"
        ? { points: 1, participation: "whole_class", questions: (questionSource.length ? questionSource : [{}]).map(function (item, index) {
          var beat = retrieves[index];
          var taught = knowledgeText(beat && beat.knowledgeRefs && beat.knowledgeRefs[0]);
          var asked = [item.prompt, item.correct].filter(Boolean).join(" ");
          var tag = taught || item.knowledgeChecked || checked;
          if (taught && retrievePool.length > 1) tag = knowledgeForQuestion(asked, tag, retrievePool);
          return {
            id: (beat && beat.id) || item.id || "",
            prompt: item.prompt,
            choices: item.choices || [],
            correct: item.correct,
            explain: item.explain,
            knowledgeChecked: tag,
            successEvidence: item.successEvidence,
            teachingConnection: item.teachingConnection
          };
        }) }
        : { lines: spoken };
      return {
        slotId: slot.id,
        mechanic: slot.mechanic,
        title: beats.length ? (stageTitle[slot.id] || "Step") : (content.title || slot.pedagogicalPurpose),
        purpose: slot.pedagogicalPurpose,
        minutes: config.questions && config.questions.length > 1 ? Math.max(Number(slot.minutes) || 0, config.questions.length) : slot.minutes,
        why: slot.pedagogicalPurpose,
        beats: beats,
        participantSelection: slot.participantSelection,
        learningInteraction: slot.interactionIntent ? { type: slot.interactionIntent } : null,
        applyInstruction: slot.id === "apply" ? (beatApply ? (content.instruction || "") : (content.instruction || spoken[0] || "")) : "",
        knowledgeUsed: slot.id === "apply" ? (beats.length ? labelledApplyKnowledge(content.instruction || "", refText || "", slot.requiredKnowledge || []) : (content.knowledgeUsed || "")) : "",
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

  function boundedBeatLog(raw) {
    var rows = [];
    function push(stage, beat) {
      if (rows.length >= 12 || !beat || typeof beat !== "object") return;
      var pupil = beat.pupil && typeof beat.pupil === "object" ? beat.pupil : {};
      rows.push({
        stage: clean(stage || beat.stageId, 24),
        beatId: clean(beat.id, 24),
        cue: clean(beat.cue != null ? beat.cue : pupil.cue, 120),
        text: clean(beat.text != null ? beat.text : pupil.text, 160)
      });
    }
    var slots = raw && raw.slots && typeof raw.slots === "object" && !Array.isArray(raw.slots) ? raw.slots : null;
    if (slots) {
      Object.keys(slots).forEach(function (stage) {
        var list = slots[stage] && slots[stage].beats;
        if (!Array.isArray(list)) return;
        list.forEach(function (beat) { push(stage, beat); });
      });
    }
    if (!rows.length && raw && Array.isArray(raw.activities)) {
      raw.activities.forEach(function (activity) {
        var list = activity && activity.beats;
        if (!Array.isArray(list)) return;
        list.forEach(function (beat) { push(activity.slotId || activity.id, beat); });
      });
    }
    return rows;
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

  // Patch 6: content rules for research lessons. Prompt guidance only; the same rules are
  // checked in code by researchRuleIssues, and the slot repair receives the exact failures.
  function researchContentRules(year) {
    return [
      "Research lesson rules. sourceWording lists each taught unit with the source's own sentence (sourceSays) and its result (keepThisResult).",
      "The teach explain beat and the recap beat for a unit keep that result in the source's words, including keyWords and any comparison word such as less or more. Do not swap it for a vaguer word such as efficiently, better, easier, or well.",
      "Use everyday words for " + (year || "this year group") + ". Avoid long technical words; if one is needed, explain it in the same sentence (for example: perpendicular, which means at a right angle).",
      "Say what a feature did or how it worked. Do not say an animal had, grew, or developed a feature in order to do something, and do not ask why an animal had a feature.",
      "Each check question's correct answer uses the words of a teach sentence. Each wrong choice must be false according to evidencePassages; do not use a feature the sources say also helped with the same job.",
      "apply is a choice on a new example. newCase.text describes one new example the teach slot did not answer: either a case stated in evidencePassages (kind sourced, with sourceRef and an exact quote copied from that passage) or a made-up case that starts with Imagine and can be solved with one taught reason (kind transfer, sourceRef empty, quote empty). instruction asks the class to choose. choices has two or three options with exactly one correct; each feedback is one or two sentences that say why that option is right or wrong using the taught reason, and the correct feedback uses that unit's keyWords. successCondition says the class picks the choice that the taught reason supports."
    ].join(" ");
  }

  function contentBrief(ctx, plan, story) {
    var safe = forModel(ctx || {});
    var sourcePlan = plan || (ctx && ctx.lessonPlan) || null;
    var skeleton = (ctx && ctx.lessonSkeleton) || lessonSkeleton(sourcePlan || {}, ctx || {});
    if (sourcePlan) {
      var publishedPlan = publishPlan(sourcePlan);
      publishedPlan.lessonArc = contractArc(sourcePlan.lessonArc, textList(sourcePlan.keyKnowledge, 180, 12));
      safe.lessonPlan = publishedPlan;
    } else safe.lessonPlan = null;
    safe.storyPlan = story || (ctx && ctx.storyPlan) || null;
    safe.lessonSkeleton = skeleton;
    var beatSlots = skeleton.filter(function (slot) { return slot.beats && slot.beats.length; });
    var legacySlots = skeleton.filter(function (slot) { return !slot.beats || !slot.beats.length; });
    var shape = [
      "You are writing the words for a Wondii lesson. Return one JSON object and nothing else.",
      pupilConceptLine(safe),
      "Do not return HTML, CSS, JavaScript, markdown, or a worksheet.",
      "lessonSkeleton is already decided. Return slots keyed by the skeleton ids. Do not return an activities array. Do not choose a mechanic, a beat, an order, or a new stage. A spin is not a slot.",
      "JSON shape: { title, objectives, slots: { hook, investigate, teach, apply, check, resolution, recap } }."
    ];
    if (legacySlots.length) {
      shape.push("Slots without beats (" + legacySlots.map(function (slot) { return slot.id; }).join(", ") + ") use the legacy shape. Story slots use { title, lines }. lines is an array of short spoken sentences. investigate also uses { instruction, target }. apply uses { instruction, target, knowledgeUsed, successCondition, teachingConnection }. check uses { title, prompt, choices, correct, explain, knowledgeChecked, successEvidence, teachingConnection }. choices are strings. correct is one of those strings copied exactly.");
    }
    if (beatSlots.length) {
      shape.push("A slot with beats does not use title or lines. Its pupil prose is the beats array only. Each beat object is { id, cue, text }. id is copied from the planned beat. cue may be empty. text is required pupil prose. Do not add, remove, reorder, or rename beats. Do not choose a move or a knowledge ref. Do not invent a replacement beat.");
      shape.push(beatResponseExample(skeleton));
      shape.push(moveGuide(skeleton, (ctx && (ctx.yearGroup || (sourcePlan && sourcePlan.yearGroup))) || ""));
      if (sourcePlan && sourcePlan.teachingPlan) {
        shape.push("lessonPlan.teachingThreads groups the knowledge into strands. Teach beats on the same strand build one idea in order: name introduces the feature or idea, explain says how or why it works, exemplify shows it in use, and connect says what it leads to or how the strands work together. Each beat adds to the one before it. Do not say the same sentence twice in different words.");
      }
      if (skeleton.some(function (slot) { return slot.id === "apply" && slot.applicationTarget; })) {
        shape.push("The apply slot has applicationTarget: the taught strand the task must use and the evidence a finished task shows. Write a task the pupil can only get right by using that explanation on a new case the teach slot did not already answer. Name the taught explanation and how the pupil uses it. A task that only says choose a topic and explain its features does not use that explanation. The pupil chooses, using a short question with real choices or three lesson choices. Do not ask only to talk, show, or demonstrate, and do not say sort the cards, match the cards, or drag. Drawing, retelling, or describing the topic is not enough on its own.");
      }
      beatSlots.forEach(function (slot) {
        if (slot.id !== "apply") return;
        shape.push("The apply slot is one response. Return its planned beats, including " + slot.beats.map(function (beat) { return beat.id; }).join(", ") + ", with cue and text, together with instruction, target, successCondition, and teachingConnection. The beat pupil copy and the task fields are both required. Do not omit the planned beat because the task instruction is present. Do not return knowledgeUsed. The beat prepares the pupil for the task and is not the task. The instruction is the action.");
      });
    }
    if (researchMode(ctx)) {
      var wordingUnits = researchUnits(ctx);
      safe.sourceWording = wordingUnits.map(function (unit) {
        return { unitId: unit.unitId, feature: unit.feature, sourceSays: unit.explanationQuote, keepThisResult: unit.resultClause, keyWords: unit.keyTerms, sourceRefs: unit.sourceRefs };
      });
      var unitRefs = [];
      wordingUnits.forEach(function (unit) { (unit.sourceRefs || []).forEach(function (id) { if (unitRefs.indexOf(id) === -1) unitRefs.push(id); }); });
      var evidence = (researchPassagesForBrief(ctx) || []).slice().sort(function (a, b) { return (unitRefs.indexOf(a.id) === -1 ? 1 : 0) - (unitRefs.indexOf(b.id) === -1 ? 1 : 0); });
      safe.evidencePassages = evidence.slice(0, 10).map(function (p) { return { id: p.id, url: p.url, text: clean(p.text, 700) }; });
      shape.push(researchContentRules((ctx && ctx.yearGroup) || ""));
    }
    shape.push("Each slot already has minutes, minimumParticipation, and contentDepth. A slot without beats meets that participation with short spoken lines. A slot with beats meets it only through the planned beat texts. Do not add a lines array beside beats. Do not pad a slot into a long paragraph.");
    var system = shape.concat([
      "hook creates one concrete unsolved problem the class can picture and must not reveal the answer. It is not an empty question such as what lives here or what this lesson is about. investigate asks the class to look, using the slot's interactionIntent. It must not explain the answer and it must not be a pupil spin. teach states every requiredKnowledge fact in short sentences this age can hear. A name sentence says what the thing is. An explain sentence says how or why in new words. Do not leave the teaching as only a list of names. apply must make the pupil use at least one requiredKnowledge item through the slot's interactionIntent, on a new case the teach slot did not already answer. The instruction is a pupil choice that needs the taught idea, such as a short question with real choices or three lesson choices. Do not ask the class only to talk, show, or demonstrate. Do not say sort the cards, match the cards, or drag. instruction is that task. On a legacy apply slot, knowledgeUsed names the requiredKnowledge item the task uses. On an apply slot with beats, do not return knowledgeUsed. successCondition says what a finished action shows. teachingConnection says how the task follows the teaching. Sort the cards, move this, or put these in order is not an apply task unless the taught idea is in the instruction. Choosing a pupil is not the apply slot. check comes after teaching and assesses teacherIntent.requiredEvidence for teacherIntent.learningGoal. A correct answer must be sufficient evidence of requiredEvidence. When the evidence or the retrieve beat's knowledge names more than one necessary part, the correct answer must include every part. Naming only one part leaves the check partial. One stage, one side, one component, a label, or a definition is not enough unless requiredEvidence itself asks only for that. knowledgeChecked names the learning the question tests. successEvidence says what a correct answer shows. teachingConnection says how the question follows the required evidence. Keep the question as easy to read as the year group. resolution is the mission outcome after the check. recap states the taught facts clearly, including the how or why when that was taught, in sentences a pupil could say back. Do not say that the screen is a recap or a mystery.",
      "A stage with mayRevealAnswer false must not state requiredKnowledge and must not use because, caused by, or due to. Do not add a fact that is not in keyKnowledge. When the plan records knowledgeGrounding, those keyKnowledge sentences are the lesson's selection from the knowledge pack. A story may invent the mission and the characters. It must not invent a subject fact.",
      "For a why lesson, the check correct answer is the cause, reason, or process in keyKnowledge. The visible outcome can be the question or a wrong choice.",
      "When teacherIntent is present, paraphrase the learning goal and the focus concepts. Do not make the class meet preference words, duration words, prior-knowledge labels, or exclusions. Otherwise lessonBrief.concepts are the ideas the class must meet. Do not treat between, difference, why, or how as ideas to teach.",
      "storyPlan is the setting and the mission. Do not turn the lesson into a lesson about stories unless lessonBrief.topic is about stories.",
      "Put the teaching in the teach slot before the first scored quiz.",
      "Sound like a teacher talking to the class. Use short, natural sentences. Do not start screens with Let's explore, Let's discover, Great job, Can you identify, or Which of the following.",
      "Match the age. Year 1 and 2 lines are one short sentence each. If yearAssumed is true, do not name a year in the pupil text.",
      pupilCopyContract((ctx && (ctx.yearGroup || (sourcePlan && sourcePlan.yearGroup))) || ""),
      "Wrong answers are plausible, age-appropriate, and clearly incorrect. Use a misconception from lessonPlan.misconceptions when the question asks why, compares, or asks the class to reason, and a misconception fits. A simple recall or definition question may use a short wrong alternative that was not taught. Do not use jokes, magic, vanishing, singing, 'say nothing', 'do nothing', or 'I don't know'.",
      "A why, comparison, or reasoning question needs an explain of at least six words that gives the reason. A recall or definition question needs a short true reinforcement of at least three words. Correct or Great job on its own is not an explanation.",
      "Stay with the facts in the lesson plan. Do not add a quotation, a date, or an event that is not already in the plan.",
      "The exact lessonBrief.rawRequest sentence must not appear in any field. objectives is an array with the learning objective.",
      "Never use Playtime, Home time, The register, Pillow, Sandwich, Sock, or Door 1 as labels or answers.",
      "The year group in the request is authoritative. Do not write the lesson for a different year.",
      "title must not repeat the teacher's request.",
      "A hook may describe the unsolved visible event. Do not invent a mechanic for it. If that event is something the class can see, name a worldEffect type the player already allows: shake, rumble, pulse, glow, highlight, zoom, pan, reveal, crack, move-object, vibrate-object, fade, particles, flash, or sound-cue.",
      "Do not write {name} or a pupil name. participantSelection on a slot chooses who acts. The slot's instruction is what they do.",
      "Do not copy pedagogicalPurpose, learningRole, interactionIntent, a move name, or a slot id into cue or text. A notice, predict, practise, apply, reveal, or consolidate sentence must not repeat a keyKnowledge sentence. Apply, when it has beats, also returns instruction, target, successCondition, and teachingConnection, and does not return knowledgeUsed. A quiz check slot does not return beat cue or text. Each retrieve beat is one quiz question. When the check has one retrieve beat, return prompt, choices, correct, explain, successEvidence, and teachingConnection. When it has several, return questions in that beat order, one object per beat id, and do not add or remove a question. Each question tests only the knowledge ref on its retrieve beat, and only knowledge taught before that question. The correct answer must depend on that knowledge. Do not mark a fact that was left out of the learning map as correct. A question the class could answer without it is not retrieval."
    ]).filter(Boolean).join(" ");
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
      var planned = slot.beats && slot.beats.length;
      var beatField = {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, cue: { type: "string" }, text: { type: "string" } },
          required: ["id", "cue", "text"]
        }
      };
      var quizRetrieve = planned && slot.mechanic === "quiz" && (slot.beats || []).some(function (beat) { return beat.move === "retrieve"; });
      var retrieveBeats = quizRetrieve ? (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; }) : [];
      var questionFields = {
        id: { type: "string" },
        prompt: { type: "string" },
        choices: { type: "array", items: { type: "string" } },
        correct: { type: "string" },
        explain: { type: "string" },
        successEvidence: { type: "string" },
        teachingConnection: { type: "string" }
      };
      var fields = quizRetrieve
        ? (retrieveBeats.length > 1
          ? { questions: { type: "array", minItems: retrieveBeats.length, maxItems: retrieveBeats.length, items: { type: "object", additionalProperties: false, properties: questionFields, required: ["id", "prompt", "choices", "correct", "explain", "successEvidence", "teachingConnection"] } } }
          : { prompt: { type: "string" }, choices: { type: "array", items: { type: "string" } }, correct: { type: "string" }, explain: { type: "string" }, successEvidence: { type: "string" }, teachingConnection: { type: "string" } })
        : (planned
          ? { beats: beatField }
          : (slot.mechanic === "quiz"
            ? { title: { type: "string" }, prompt: { type: "string" }, choices: { type: "array", items: { type: "string" } }, correct: { type: "string" }, explain: { type: "string" }, knowledgeChecked: { type: "string" }, successEvidence: { type: "string" }, teachingConnection: { type: "string" } }
            : { title: { type: "string" }, lines: { type: "array", items: { type: "string" } }, instruction: { type: "string" }, target: { type: "string" } }));
      if (planned && slot.id === "apply") {
        fields.instruction = { type: "string" };
        fields.target = { type: "string" };
        fields.successCondition = { type: "string" };
        fields.teachingConnection = { type: "string" };
      } else if (!planned && slot.id === "apply") {
        fields.knowledgeUsed = { type: "string" };
        fields.successCondition = { type: "string" };
        fields.teachingConnection = { type: "string" };
      }
      if (slot.id === "apply" && researchMode(ctx)) {
        fields.choices = { type: "array", minItems: 2, maxItems: 3, items: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, correct: { type: "boolean" }, feedback: { type: "string" } }, required: ["text", "correct", "feedback"] } };
        fields.newCase = { type: "object", additionalProperties: false, properties: { text: { type: "string" }, kind: { type: "string", enum: ["sourced", "transfer"] }, sourceRef: { type: "array", items: { type: "string" } }, quote: { type: "string" } }, required: ["text", "kind", "sourceRef", "quote"] };
      }
      var slotSchema = { type: "object", additionalProperties: false, properties: fields };
      if (planned && slot.id === "apply") slotSchema.required = ["beats", "instruction", "target", "successCondition", "teachingConnection"];
      if (slot.id === "apply" && researchMode(ctx)) slotSchema.required = (slotSchema.required || Object.keys(fields)).concat(["choices", "newCase"]).filter(function (key, i, all) { return all.indexOf(key) === i; });
      schema.properties.slots.properties[slot.id] = slotSchema;
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
      lessonPlan: publishPlan((ctx && ctx.lessonPlan) || null),
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
          ? (slot.beats && slot.beats.length
            ? { instruction: "", target: "", successCondition: "", teachingConnection: "" }
            : { instruction: "", knowledgeUsed: "", successCondition: "", teachingConnection: "", target: "" })
          : slot.id === "check"
            ? ((slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; }).length > 1
              ? { questions: (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; }).map(function (beat) { return { id: beat.id, prompt: "", choices: [], correct: "", explain: "", successEvidence: "", teachingConnection: "" }; }) }
              : { prompt: "", choices: [], correct: "", explain: "", knowledgeChecked: "", successEvidence: "", teachingConnection: "" })
            : ((slot.beats && slot.beats.length && !(slot.mechanic === "quiz" && (slot.beats || []).some(function (beat) { return beat.move === "retrieve"; })))
              ? {}
              : { title: "", lines: [] })
      });
      var spec = specs[specs.length - 1];
      var quizRetrieve = slot.mechanic === "quiz" && (slot.beats || []).some(function (beat) { return beat.move === "retrieve"; });
      var activity = null;
      ((previous && previous.activities) || []).forEach(function (item) {
        if (item && item.slotId === slot.id) activity = item;
      });
      if (slot.beats && slot.beats.length && !quizRetrieve) {
        spec.output.beats = slot.beats.map(function (beat) {
          var current = {};
          ((activity && activity.beats) || []).forEach(function (row) {
            if (row && row.id === beat.id) current = row.pupil || {};
          });
          return slot.id === "recap"
            ? { id: beat.id, cue: current.cue || "", text: current.text || "" }
            : { id: beat.id, cue: "", text: "" };
        });
        spec.teachingBeats = slot.beats.map(function (beat) {
          return { id: beat.id, move: beat.move, knowledgeRefs: beat.knowledgeRefs || [] };
        });
      }
      var year = (ctx && ctx.yearGroup) || "";
      if (slot.beats && slot.beats.length && !quizRetrieve && activity && activity.beats) {
        spec.rejectedBeats = pupilBeatDiagnostics(slot, activity.beats, beatKnowledge((ctx && ctx.lessonPlan) || {}, year), year).map(function (row) {
          return Object.assign({}, row, { fix: beatRepairFix(row.reason, year) });
        });
        if (spec.rejectedBeats.length) spec.pupilCopyRequirements = pupilCopyContract(year);
        else delete spec.rejectedBeats;
      }
      if (slot.id === "apply" && slot.applicationTarget) spec.applicationTarget = slot.applicationTarget;
      if (slot.id === "apply" && researchMode(ctx)) {
        spec.output.choices = [{ text: "", correct: false, feedback: "" }];
        spec.output.newCase = { text: "", kind: "transfer", sourceRef: [], quote: "" };
        spec.researchRules = researchContentRules((ctx && ctx.yearGroup) || "");
      } else if (researchMode(ctx)) spec.researchRules = researchContentRules((ctx && ctx.yearGroup) || "");
      if (slot.id === "apply" && activity && spec.failure.some(function (item) { return /apply slot does not use the taught knowledge/.test(item); })) {
        var verdict = applyAlignment(activity, slot.requiredKnowledge || []);
        if (verdict.status === "fail" && APPLY_REPAIR_FIX[verdict.reason]) spec.applyFailure = APPLY_REPAIR_FIX[verdict.reason];
      }
      if (quizRetrieve) {
        spec.retrieveBeat = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; }).map(function (beat) {
          return { id: beat.id, move: beat.move, knowledgeRefs: beat.knowledgeRefs || [] };
        })[0] || null;
      }
      if (slot.id === "check") {
        var intent = ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent;
        specs[specs.length - 1].learningGoal = learningGoalOf(ctx);
        specs[specs.length - 1].requiredEvidence = requiredEvidenceOf(ctx);
        specs[specs.length - 1].focusConcepts = intent && intent.focusConcepts ? intent.focusConcepts.slice(0, 4) : [];
      }
    });
    var apply = null;
    specs.forEach(function (spec) { if (spec.slotType === "APPLY") apply = spec; });
    var beatApply = !!(apply && apply.teachingBeats && apply.teachingBeats.length);
    var instruction = "Return JSON { slots } for only the listed slot ids.";
    if (specs.some(function (spec) { return spec.rejectedBeats && spec.rejectedBeats.length; })) {
      instruction += " rejectedBeats lists each beat that failed, its rejected text, and fix, which says why it failed. Write new text for that beat that follows fix. Do not return the rejected text again.";
    }
    if (apply && apply.applyFailure) instruction += " APPLY failure: " + apply.applyFailure;
    if (beatApply) {
      instruction += " The APPLY slot is one response. Return the planned beat ids with cue and text together with instruction, target, successCondition, and teachingConnection. The beat pupil copy and task fields are both required. Do not omit the planned beat because the task instruction is present. Do not return knowledgeUsed. Do not return title or lines. Do not add, remove, reorder, rename, or choose teaching beats. Do not alter moves or knowledgeRefs. The APPLY task MUST require the pupil to use this knowledge: " + ((apply.requiredKnowledge || []).join(" | ") || "the taught idea") + ". The mechanic and interaction family cannot change. A bare sort, move, or sequence is invalid. " + pupilCopyContract((ctx && ctx.yearGroup) || "");
    } else if (apply) {
      instruction += " The APPLY task MUST require the pupil to use this knowledge: " + ((apply.requiredKnowledge || []).join(" | ") || "the taught idea") + ". The mechanic and interaction family cannot change. Return instruction, knowledgeUsed, successCondition, and teachingConnection for that slot. knowledgeUsed must name one requiredKnowledge item. A bare sort, move, or sequence is invalid.";
    }
    if (apply) {
      var ideaRefs = [];
      ((apply.teachingBeats) || []).forEach(function (beat) {
        (beat.knowledgeRefs || []).forEach(function (ref) {
          if (ideaRefs.indexOf(ref) === -1) ideaRefs.push(ref);
        });
      });
      if (!ideaRefs.length && apply.applicationTarget) ideaRefs = (apply.applicationTarget.knowledgeRefs || []).slice(0, 4);
      var ideaText = [];
      ((ctx && ctx.lessonPlan && ctx.lessonPlan.learningMap) || []).forEach(function (item) {
        if (item && ideaRefs.indexOf(item.id) !== -1 && ideaText.indexOf(item.knowledge) === -1) ideaText.push(item.knowledge);
      });
      if (ideaText.length) {
        instruction += " The taught idea this task must use is: " + ideaText.join(" ") + ". The pupil sentence and the instruction must both name that idea and show how the pupil uses it on a new case. Choosing a topic and explaining features in general does not use it.";
      }
    }
    var checkSpec = null;
    specs.forEach(function (spec) { if (spec.slotType === "CHECK") checkSpec = spec; });
    if (checkSpec) {
      instruction += " The CHECK slot must stay a quiz. Rewrite only the listed CHECK questions. Do not rewrite any other stage. Year: " + (checkSpec.year || "") + ". Subject: " + (checkSpec.subject || "") + ". Learning goal: " + (checkSpec.learningGoal || "the requested learning") + ". Required evidence: " + (checkSpec.requiredEvidence || "the required evidence") + ". The evidence failure is: " + ((checkSpec.failure || []).join(" ") || "the correct answer is not sufficient evidence") + ". Each replacement question must make a correct answer sufficient evidence of the relationship it tests. Do not merely ask for one component when that question's relationship needs the connection. If the required evidence names more than one necessary part, the correct answer must include every part. Use words this year group can read. Do not make a question harder than the relationship it tests.";
      if (checkSpec.output && checkSpec.output.questions) instruction += " Return questions for exactly these ids, in this order: " + checkSpec.output.questions.map(function (item) { return item.id; }).join(", ") + ". Do not add or remove a question. Rewrite only a question whose relationship failed. Copy a question that already passed.";
      if (checkSpec.retrieveBeat) instruction += " The quiz is the retrieve beat " + checkSpec.retrieveBeat.id + ". Do not return cue or text for that beat.";
    }
    if (specs.some(function (spec) { return spec.slotType !== "APPLY"; })) {
      var otherFailures = [];
      specs.forEach(function (spec) {
        if (spec.slotType === "APPLY") return;
        (spec.failure || []).forEach(function (item) { otherFailures.push(String(item)); });
      });
      instruction += " For any other listed slot, correct only the failures listed for that slot. Those failure texts are the reason that slot must change.";
      if (otherFailures.some(function (item) { return /enough participation/.test(item); })) {
        instruction += specs.some(function (spec) { return spec.teachingBeats && spec.teachingBeats.length; })
          ? " If a failure says the slot does not have enough participation, fill the listed beat texts. Do not add lines beside those beats."
          : " If a failure says the slot does not have enough participation, add the missing turns up to minimumParticipation. Each turn is one short sentence: a teacher prompt, an observation, a pupil action, a check, or a retrieval. Do not pad with a long paragraph. Do not copy teaching into a slot that already has it.";
      }
    }
    if (specs.some(function (spec) { return spec.teachingBeats && spec.teachingBeats.length && spec.slotType !== "APPLY"; })) {
      instruction += " Where teachingBeats are listed on a slot other than APPLY, return only those ids with cue and text. " + pupilCopyContract((ctx && ctx.yearGroup) || "") + " Do not add, remove, reorder, rename, or choose teaching beats. Do not alter moves or knowledgeRefs. Do not return title or lines for that slot.";
    }
    specs.forEach(function (spec) {
      if (spec.slotType !== "RECAP" || !spec.rejectedBeats || !spec.rejectedBeats.length) return;
      instruction += " Rewrite only the rejected recap consolidate beat. Keep the other beat ids. Do not regenerate the plan or the lesson. " + (spec.pupilCopyRequirements || "");
    });
    instruction += " Do not return activities, mechanics, or a new stage.";
    brief.user = JSON.stringify({
      slotsToRewrite: specs,
      instruction: instruction
    });
    return brief;
  }

  function repairKnowledge(previous) {
    var source = previous && (Array.isArray(previous.learningMap) && previous.learningMap.length ? previous.learningMap : previous.keyKnowledge);
    if (!Array.isArray(source)) return [];
    return source.map(function (item) {
      var text = typeof item === "string" ? item : (item && (item.knowledge || item.text || item.statement || item.fact)) || "";
      return clean(text, 180);
    }).filter(Boolean).slice(0, 12);
  }

  function repairRelationship(ctx, previous, issues) {
    var found = (issues || []).join(" ");
    var objective = (previous && previous.learningObjective) || "";
    var goalText = planGoalText(ctx, objective);
    var required = [];
    if (/more connected learning points/.test(found)) {
      var depth = depthBudget((ctx && (ctx.yearGroup || ctx.yearAssumption)) || (previous && previous.yearGroup), ctx && ctx.requestedMinutes);
      required.push("depth: return a connected learningMap of about " + depth.floor + " to " + depth.max + " points that leads to the goal. Start from what a pupil needs first, then the feature or concept, what it does or why, the effect, and how the ideas connect. Each later point lists the earlier points it builds on in dependsOn. Split a big relationship into child-sized steps. A paraphrase, a second example of the same idea, or trivia is not a new point. If a selected pack claim was left unconnected and a kept point builds on it, include that claim and point dependsOn at it. Do not invent a new fact to fill the count");
    }
    if (/developed strands/.test(found)) {
      var budget = depthBudget((ctx && (ctx.yearGroup || ctx.yearAssumption)) || (previous && previous.yearGroup), ctx && ctx.requestedMinutes);
      var span = strandRange(budget);
      var broadTopic = /broad topic/.test(found);
      var low = broadTopic ? span.low : (planSeeksDepth(ctx, objective) ? seekingStrandMinimum(ctx, budget) : span.low);
      var prefer = low >= 3 ? "Prefer three linked strands over a list of names." : "Prefer two linked strands over a list of names.";
      required.push("strands: " + (broadTopic ? "this topic is broad, so the learningMap needs " : "the learningMap needs ") + low + " separate strands that each develop one idea. A strand head names a feature, part, event, or idea and uses role feature or concept, not foundation. Its function, mechanism, cause, process, or procedure dependsOn that specific feature, not the foundation, and explains records that same id. At most one point may be role foundation, and only when it is genuinely shared and adds teaching value. A shared foundation is optional. Do not invent a foundation simply to satisfy formatting. If earlier points were labelled foundation but they are separate features, correct those labels to feature or concept and point each explanation at its own feature. Preserve the underlying knowledge and the real dependencies. A list of separate facts is not a strand. A sentence that only names what something has is not the explanation. " + prefer + " Drop spare one-line facts instead of keeping a list of names with empty dependsOn. Development is read only from dependsOn: a point counts as developing a strand only when its dependsOn lists the earlier point of that strand it builds on. For example, with one foundation, p2 names a feature with dependsOn [\"p1\"] and p3 explains what that feature does with dependsOn [\"p2\"]. Without a foundation, the feature has an empty dependsOn and the explanation dependsOn the feature. A function that depends only on a foundation, or a sentence with because, helps, or work together and an empty dependsOn, is still a separate fact. Every point except a single optional foundation must have a non-empty dependsOn");
    }
    if (/outcome, not the reason/.test(found)) {
      if (seeksContribution(ctx, objective)) {
        required.push("contribution: name the feature, what it does, and how that connects to the goal. A different fact about the same topic is not enough");
      }
      if (/\bsignifican|\bimportan|\bmattered\b/.test(goalText)) {
        required.push("significance: name one real event or change, then the result of that change. The result is what was different afterwards, not that the event was important");
      }
      if (asksWhy(ctx) || /\bwhy\b|\bcauses?\b|\breasons?\b/.test(goalText)) {
        required.push("why/cause: name what happens and what that does. Where it happens is not the cause");
      }
      if (!required.length) required.push("why/cause: name what happens and what that does. Where it happens is not the cause");
    }
    if (/parts, not the change/.test(found)) {
      required.push("process: start from the beginning state, say what happens next, and end at the outcome the goal asks for. Do not only name the ingredients, the start, or the end");
    }
    if (/step, not the action/.test(found)) {
      required.push("procedure: write the action the pupil carries out, using the verb they will do, and the rule that makes the action correct");
    }
    return required;
  }

  function planRepairBrief(ctx, issues, previous) {
    var brief = planBrief(ctx);
    var intent = (ctx && ctx.lessonBrief && ctx.lessonBrief.teacherIntent) || {};
    var objective = clean((previous && previous.learningObjective) || "", 240);
    var goal = learningGoalOf(ctx) || clean((ctx && ctx.lessonBrief && ctx.lessonBrief.learningGoal) || "", 240) || objective;
    var relationship = repairRelationship(ctx, previous, issues);
    var found = (issues || []).join(" ");
    var arcFailed = /teaching stage|check or a recap/.test(found);
    var instruction = [
      "Repair the internal lesson plan only. Do not write pupil activities. Return the full plan JSON.",
      "Preserve subject, topic, yearGroup, durationMinutes, learningObjective, successCriteria, priorKnowledge, vocabulary, misconceptions, teachingApproach, and narrativeTheme exactly.",
      arcFailed
        ? "The lesson arc failed. Set each lessonArc purpose to exactly one of hook, investigate, teach, apply, check, resolution, recap. Do not write a sentence as the purpose."
        : "Copy lessonArc exactly.",
      relationship.length
        ? "Replace only the insufficient learningMap points. Keep the points that already lead to the goal and keep their dependsOn links and explains ids. Do not paraphrase one idea into several points. Do not add trivia or a nearby fact that leads nowhere. Do not return the failed sentences unchanged. The new sentences must be the knowledge a pupil of this year would say back to achieve the learningGoal. A connector word does not repair a sentence. because, which meant, led to, therefore, significant, and important count only when the words around them are the missing fact. 'It was significant', 'it had an influence', 'it led to changes', 'it had an impact', or 'it is essential' is not that fact. Missing relationship: " + relationship.join(" ")
        : ""
    ].filter(Boolean).join(" ");
    if (/developed strands/.test(found)) {
      instruction += " Correct incorrectly labelled foundations. A feature or adaptation is not a foundation. Point each function or mechanism at its own feature. Preserve the underlying knowledge and the dependencies that are still true. Do not invent a foundation simply to satisfy formatting.";
    }
    if (ctx && ctx.knowledgePack && ctx.knowledgePack.status !== "blocked") {
      instruction += " Every learningMap point must include claimIds copied from knowledgePack.claims. The sentence may shorten that claim. It must not add a subject fact the claim does not state. Do not teach falsePremise, doNotTeach, rejectedClaims, or a claim held as an unsupported local detail. Do not invent a feature or a relationship the knowledge pack does not admit. Where the pack has a feature claim and an explanation of that feature, keep both and point the explanation at that feature.";
    }
    var repairPayload = {
      learningGoal: goal,
      requiredEvidence: requiredEvidenceOf(ctx) || clean((ctx && ctx.lessonBrief && ctx.lessonBrief.requiredEvidence) || "", 280),
      focusConcepts: (intent.focusConcepts || (ctx && ctx.lessonBrief && ctx.lessonBrief.focusConcepts) || []).slice(0, 4),
      yearGroup: (ctx && ctx.yearGroup) || (previous && previous.yearGroup) || "",
      subject: (ctx && ctx.subject) || (previous && previous.subject) || "",
      keyKnowledge: repairKnowledge(previous),
      failure: issues || [],
      relationshipRequired: relationship,
      previous: previous || null,
      lesson: forModel(ctx),
      instruction: instruction
    };
    if (ctx && ctx.knowledgePack && ctx.knowledgePack.status !== "blocked") {
      repairPayload.knowledgePack = packForPlanner(ctx.knowledgePack);
      repairPayload.knowledgeSelection = ctx.knowledgeSelection || null;
    }
    brief.user = JSON.stringify(repairPayload);
    return brief;
  }

  function storyBrief(ctx, plan) {
    var safe = forModel(ctx || {});
    safe.lessonPlan = publishPlan(plan || (ctx && ctx.lessonPlan) || null);
    var year = Number(yearDigit((ctx && ctx.yearGroup) || (plan && plan.yearGroup))) || ((ctx && ctx.yearAssumed) ? 3 : 4);
    var age = year <= 2
      ? "Year 1 to 2: a very short, concrete unsolved problem, one simple positive role, and almost no reading. A teacher can narrate it. The premise is a problem a child can picture. It is not a generic warning that the world is in trouble, and it is not an empty question such as what lives here."
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
      lessonPlan: publishPlan((ctx && ctx.lessonPlan) || null),
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
    return statesRelation(text);
  }

  function statesRelation(text) {
    var value = String(text || "");
    if (/\b(significant|significance|important|importance|impact)\b/i.test(value) && !/\b(because|so that|in order to|due to|caused by|which reduced|which allowed|which changed|allowed)\b/i.test(value)) return false;
    if (/\b(because|so that|in order to|due to|caused by|the reason|and then|which makes|which causes|which meant|which reduced|which allowed|which changed)\b/i.test(value)) return true;
    if (/\b(turns into|turn into|turned into|becomes|became|forming)\b/i.test(value)) return true;
    if (/\bturn(?:s|ed)?\b[^.]{0,40}\binto\b/i.test(value)) return true;
    if (/\bconvert(?:s|ed|ing)?\b[^.]{0,48}\binto\b/i.test(value)) return true;
    if (/\ballowed\b/i.test(value)) return true;
    if (/\bwhen\b/i.test(value)) return true;
    if (/\b(wanted|needed)\b/i.test(value)) return true;
    if (/\bfirst\b[^.]{0,80}\bthen\b/i.test(value)) return true;
    return false;
  }

  // Verb parity for the learning-map reason check (source-grounded lesson PR, its own commit).
  // statesRelation accepts "allowed" but not "allows", "let", "lets" or "enables", so "Straight
  // back legs allowed them to use less energy" passed and "Straight back legs let them use less
  // energy" did not, for the same sourced mechanism. These verbs now count when they state a job:
  // an object and at least one specific word for what the feature did. Vague jobs (survive, live,
  // do well, adapt) and a bare object ("let sauropods.") still fail. The help family is unchanged:
  // the existing contract treats "helps sharks stay afloat" as an outcome, not a reason.
  var ENABLE_VERB = /\b(?:allows?|allowing|lets?|letting|enables?|enabled|enabling)\b\s+([^.;!?]*)/i;
  var ENABLE_PRONOUN = /^(?:them|it|they|him|her|us|you)\b/i;
  var VAGUE_JOB = { survive: 1, survives: 1, surviving: 1, survival: 1, live: 1, lives: 1, living: 1, lived: 1, adapt: 1, adapts: 1, adapted: 1, adapting: 1, thrive: 1, thrived: 1, succeed: 1, successful: 1, success: 1, well: 1, better: 1, good: 1, things: 1, habitat: 1, habitats: 1, environment: 1, environments: 1 };

  function statesEnabledJob(text) {
    var found = String(text || "").match(ENABLE_VERB);
    if (!found) return false;
    var rest = found[1].replace(/^\s+/, "");
    var specific = contentWords(rest).filter(function (word) { return !VAGUE_JOB[word]; });
    return specific.length >= (ENABLE_PRONOUN.test(rest) ? 1 : 2);
  }

  // "so the jaws could open wide" states the job the same way "so that the jaws could open
  // wide" does, and the readiness gate already reads it as a mechanism (statesMechanism). Live
  // run 8 lost a ready NHM pair at the plan stage for this phrasing alone. Same specificity rule.
  var SO_COULD = /\bso\b\s+([^.;!?]{0,60}?)\b(?:can|could)\b\s+([^.;!?]*)/i;

  function statesSoCould(text) {
    var found = String(text || "").match(SO_COULD);
    if (!found) return false;
    return contentWords(found[2]).filter(function (word) { return !VAGUE_JOB[word]; }).length >= 1;
  }

  function statesReasonOrJob(text) {
    return statesRelation(text) || statesEnabledJob(text) || statesSoCould(text);
  }

  function statesFunction(text) {
    var value = String(text || "");
    return /\b(helps|helped|helping|help|reduces|reduced|reducing|reduce|allows|allowed|allowing|allow|enables|enabled|enabling|enable|causes|caused|causing|cause|affects|affected|affecting|affect|lets|let|makes|made|making|make|changes|changed|changing|change|aids|aided|aiding|aid)\b\s+[a-z0-9]/i.test(value);
  }

  function sameStem(left, right) {
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.length >= 4 && right.indexOf(left) === 0) return true;
    if (right.length >= 4 && left.indexOf(right) === 0) return true;
    var shared = 0;
    while (shared < left.length && shared < right.length && left.charAt(shared) === right.charAt(shared)) shared += 1;
    return shared >= 5;
  }

  var CONTRIBUTION_VERBS = "help|helps|helping|cause|causes|caused|affect|affects|affected|work|works|working|change|changes|changed|contribute|contributes|contributing|make|makes|made|aid|aids|get|gets|getting|obtain|obtains|transport|transports|transporting|carry|carries|carrying|adapt|adapts|adapted|adapting|survive|survives|survived|surviving";
  var WHOLE_HEAD = { body: 1, bodies: 1, system: 1, systems: 1 };
  var RELATION_STEM = {
    help: 1, helps: 1, helped: 1, helping: 1, reduce: 1, reduces: 1, reduced: 1, reducing: 1,
    allow: 1, allows: 1, allowed: 1, allowing: 1, enable: 1, enables: 1, enabled: 1,
    cause: 1, causes: 1, caused: 1, causing: 1, affect: 1, affects: 1, affected: 1,
    let: 1, lets: 1, make: 1, makes: 1, made: 1, making: 1, change: 1, changes: 1, changed: 1,
    aid: 1, aids: 1, aided: 1, get: 1, gets: 1, getting: 1, obtain: 1, obtains: 1,
    carry: 1, carries: 1, carried: 1, transport: 1, transports: 1, transporting: 1
  };

  function seeksContribution(ctx, objective) {
    if (planNeedsSteps(ctx, objective)) return false;
    var goal = planGoalText(ctx, objective);
    if (/\bhow to\b/.test(goal)) return false;
    if (/\bfrom\b[^.]{0,48}\bto\b/.test(goal) && /\b(change|changes|changed)\b/.test(goal)) return false;
    return new RegExp("\\bhow\\b[^.]{0,100}\\b(?:" + CONTRIBUTION_VERBS + ")\\b").test(goal)
      || /\bwhy\b[^.]{0,100}\b(happen|happens|happened|spread|spreads|spread|matter|matters|mattered)\b/.test(goal);
  }

  function contributionSpan(goal) {
    var text = clean(goal, 500).toLowerCase();
    var how = text.match(new RegExp("\\bhow\\b([^.]{0,100}?)\\b(?:" + CONTRIBUTION_VERBS + ")\\b"));
    return how ? how[1] : "";
  }

  function contributionHead(goal) {
    var words = contentWords(contributionSpan(goal));
    return words.length ? words[words.length - 1] : "";
  }

  function broadContribution(goal) {
    var text = clean(goal, 500).toLowerCase();
    if (/\b(significan|importan|mattered)\b/.test(text)) return false;
    if (/\bwhy\b[^.]{0,120}\b(happen|happens|happened|spread|spreads)\b/.test(text)) return true;
    if (!new RegExp("\\bhow\\b[^.]{0,100}\\b(?:" + CONTRIBUTION_VERBS + ")\\b").test(text)) return false;
    var head = contributionHead(text);
    if (!head || WHOLE_HEAD[head]) return true;
    var span = contributionSpan(text);
    if (/\b[a-z]+(?:'s|s')\b/.test(span)) return false;
    return head.length > 4 && /s$/.test(head) && !/ss$/.test(head);
  }

  function outcomeWords(goal) {
    var text = clean(goal, 500).toLowerCase();
    var tail = "";
    var how = text.match(new RegExp("\\bhow\\b[^.]{0,100}?\\b(?:" + CONTRIBUTION_VERBS + ")\\b([^.]*)"));
    var why = text.match(/\bwhy\b([^.]{0,120})/);
    if (how) tail = how[1];
    else if (why) tail = why[1];
    return contentWords(tail);
  }

  function functionWords(text) {
    var value = String(text || "").replace(/\b(?:while|whilst|during)\b[^.]*/gi, " ");
    return contentWords(value);
  }

  function contributionVerb(goal) {
    var text = clean(goal, 500).toLowerCase();
    var how = text.match(new RegExp("\\bhow\\b[^.]{0,100}?\\b(" + CONTRIBUTION_VERBS + ")\\b"));
    return how ? how[1] : "";
  }

  // "How are camels adapted to the desert?" The words after the verb name the
  // setting. Sharing that setting is not a contribution. A specific outcome
  // such as "helps it swim" still has to share the outcome.
  function adaptationAsk(goal) {
    return /^(?:adapt|surviv)/.test(contributionVerb(goal));
  }

  function aboutHead(text, head) {
    if (!head) return false;
    return contentWords(text).some(function (token) { return sameStem(token, head); });
  }

  function subjectAncestor(row, head, seen) {
    if (!row || seen.indexOf(row) !== -1) return false;
    seen.push(row);
    if (aboutHead(row.text, head)) return true;
    return row.deps.some(function (dep) { return subjectAncestor(dep, head, seen); });
  }

  function answersContribution(text, goal, row) {
    if (!statesFunction(text) && !statesRelation(text) && !statesSoCould(text)) return false;
    if (adaptationAsk(goal)) {
      var head = contributionHead(goal);
      if (head) {
        if (aboutHead(text, head)) return true;
        // A mechanism may name the feature's job without repeating the subject.
        // It still contributes when it depends on that subject's feature.
        return !!(row && subjectAncestor(row, head, []));
      }
    }
    var wanted = outcomeWords(goal);
    if (!wanted.length) return false;
    var have = functionWords(text);
    return wanted.some(function (word) {
      return have.some(function (token) { return sameStem(token, word); });
    });
  }

  var RELATION_GLUE = { which: 1, that: 1, this: 1, into: 1, from: 1, with: 1, take: 1, takes: 1, taken: 1, more: 1, than: 1, very: 1, much: 1 };

  function relationSignature(text, goal) {
    var skip = {};
    outcomeWords(goal).forEach(function (word) { skip[word] = 1; });
    contentWords(contributionSpan(goal)).forEach(function (word) { skip[word] = 1; });
    return functionWords(text).filter(function (word) {
      if (word.length < 4 || skip[word] || RELATION_STEM[word] || RELATION_GLUE[word]) return false;
      return !contentWords(contributionSpan(goal)).some(function (head) { return sameStem(word, head); });
    });
  }

  function sameRelationship(left, right, goal) {
    var a = relationSignature(left, goal);
    var b = relationSignature(right, goal);
    if (!a.length || !b.length) return false;
    function long(list) { return list.filter(function (word) { return word.length >= 8; }); }
    var aLong = long(a);
    var bLong = long(b);
    if (aLong.length && bLong.length) {
      var smaller = aLong.length <= bLong.length ? aLong : bLong;
      var larger = smaller === aLong ? bLong : aLong;
      if (smaller.every(function (word) {
        return larger.some(function (other) { return sameStem(word, other); });
      })) return true;
    }
    var shared = 0;
    a.forEach(function (word) {
      if (b.some(function (other) { return sameStem(word, other); })) shared += 1;
    });
    return shared >= 2 && shared / Math.min(a.length, b.length) >= 0.5;
  }

  var MAP_ROLES = { foundation: 1, feature: 1, concept: 1, "function": 1, cause: 1, effect: 1, mechanism: 1, process: 1, procedure: 1, comparison: 1, example: 1, connection: 1, definition: 1, fact: 1 };
  var ROLE_TYPE = { definition: "definition", procedure: "procedure", comparison: "comparison", effect: "effect", fact: "fact", foundation: "fact", feature: "fact", concept: "fact", example: "fact", connection: "fact" };
  var KIND_ROLE = { relationship: "function", procedure: "procedure", definition: "definition", comparison: "comparison", connection: "connection", example: "example", fact: "fact" };
  var MAP_READ_LIMIT = 14;

  function mapKind(text, role, linked) {
    if (role === "connection" && linked) return "connection";
    if (role === "example" && linked) return "example";
    var kind = beatKind({ text: text, knowledgeType: knowledgeRole(text, ROLE_TYPE[role] || "") });
    if (kind === "procedure" && role && role !== "procedure" && role !== "process") {
      if (/\b(difference|unlike|whereas)\b/i.test(text)) return "comparison";
      return /\b(is|are|means|called)\b/i.test(text) ? "definition" : "fact";
    }
    return kind;
  }

  function claimIdList(value) {
    var source = Array.isArray(value) ? value : (value ? [value] : []);
    var out = [];
    source.forEach(function (item) {
      var id = clean(typeof item === "string" ? item : (item && item.claimId) || "", 24);
      if (!id || !/^c[a-z0-9]+$/i.test(id) || out.indexOf(id) !== -1) return;
      out.push(id);
    });
    return out.slice(0, 4);
  }

  function eligibleClaims(ctx) {
    var pack = ctx && ctx.knowledgePack;
    var claims = (pack && pack.claims) || [];
    var ids = ctx && ctx.knowledgeSelection && ctx.knowledgeSelection.claimIds;
    if (ids && ids.length) {
      var allow = {};
      ids.forEach(function (id) { allow[id] = 1; });
      return claims.filter(function (claim) { return allow[claim.claimId]; });
    }
    return claims.filter(function (claim) { return !claim.contested && !(pack.sourceMode === "retrieved" && claim.sourceHold); });
  }

  function repeatsRejected(text, pack) {
    return (pack.rejectedClaims || []).some(function (item) {
      if (claimOverlap(text, item.text) < 0.75) return false;
      if (/\b(not|never|aren't|isn't|cannot|can't)\b/i.test(text) && !/\b(not|never|aren't|isn't|cannot|can't)\b/i.test(item.text)) return false;
      return claimOverlap(item.text, text) >= 0.6;
    });
  }

  function bindRowToPack(row, ctx) {
    var pack = ctx.knowledgePack;
    if (repeatsRejected(row.text, pack)) return { ok: false, reason: "rejected claim is not a fact" };
    var known = {};
    (pack.claims || []).forEach(function (claim) { known[claim.claimId] = claim; });
    var eligible = eligibleClaims(ctx);
    var allow = {};
    eligible.forEach(function (claim) { allow[claim.claimId] = claim; });
    var cited = row.claimIds || [];
    var knownCited = cited.filter(function (id) { return known[id]; });
    var eligibleCited = knownCited.filter(function (id) { return allow[id]; });
    if (knownCited.length && !eligibleCited.length) return { ok: false, reason: "claim not selected for this year" };
    if (eligibleCited.length) {
      var citedClaims = eligibleCited.map(function (id) { return allow[id]; });
      if (!wordsCovered(row.text, citedClaims)) return { ok: false, reason: "invented fact outside the knowledge pack" };
      return { ok: true, claimIds: eligibleCited };
    }
    var match = null;
    eligible.forEach(function (claim) {
      if (match) return;
      if (wordsCovered(row.text, [claim])) match = claim;
    });
    if (!match) return { ok: false, reason: "invented fact outside the knowledge pack" };
    return { ok: true, claimIds: [match.claimId] };
  }

  function groundingOnPlan(ctx, items) {
    if (!ctx || !ctx.knowledgePack || ctx.knowledgePack.status === "blocked") return null;
    var byClaim = {};
    (ctx.knowledgePack.claims || []).forEach(function (claim) { byClaim[claim.claimId] = claim; });
    return {
      packId: ctx.knowledgePack.id,
      status: ctx.knowledgePack.status,
      provenanceSummary: ctx.knowledgePack.provenanceSummary,
      premiseCorrected: !!ctx.knowledgePack.falsePremise,
      depthMode: (ctx.knowledgeSelection && ctx.knowledgeSelection.depthMode) || "",
      depthReason: (ctx.knowledgeSelection && ctx.knowledgeSelection.reason) || "",
      selectedClaimIds: ((ctx.knowledgeSelection && ctx.knowledgeSelection.claimIds) || []).slice(),
      points: (items || []).map(function (item) {
        return {
          mapId: item.id,
          claimIds: (item.claimIds || []).slice(),
          provenance: (item.claimIds || []).map(function (id) { return byClaim[id] ? byClaim[id].provenance : ""; })
        };
      })
    };
  }

  var EXPLAIN_ROLE = { mechanism: 1, "function": 1, cause: 1, process: 1 };
  var NAMED_POINT = { feature: 1, concept: 1, fact: 1, definition: 1 };

  function pointIdShape(value) {
    return /^[a-z](?:[0-9]+[a-z]?)?$/i.test(String(value || ""));
  }

  function dependencyRefs(raw) {
    var found = [];
    function add(value) {
      if (value == null || value === "") return;
      if (Array.isArray(value)) { value.forEach(add); return; }
      if (typeof value === "object") { add(value.id || value.ref || value.pointId || ""); return; }
      var text = clean(value, 80);
      if (!text) return;
      if (pointIdShape(text)) {
        if (found.indexOf(text) === -1) found.push(text);
        return;
      }
      text.split(/[^A-Za-z0-9]+/).forEach(function (part) {
        if (/^[a-z][0-9]+[a-z]?$/i.test(part) && found.indexOf(part) === -1) found.push(part);
      });
    }
    if (!raw || typeof raw !== "object") return found;
    add(raw.dependsOn);
    add(raw.depends_on);
    add(raw.explains);
    add(raw.explainId);
    add(raw.featureId);
    if (typeof raw.feature === "string" && pointIdShape(clean(raw.feature, 24))) add(raw.feature);
    return found;
  }

  function linkWords(text) {
    return depthWords(text).filter(function (word) { return word.length >= 4; });
  }

  function topicWords(ctx) {
    ctx = ctx || {};
    var brief = ctx.lessonBrief || {};
    return linkWords([ctx.topic, ctx.lessonText, ctx.teacherInstructions, brief.rawRequest, brief.learningGoal].join(" "));
  }

  var LINK_VERB = {
    carry: 1, carried: 1, carries: 1, carrying: 1, move: 1, moved: 1, moves: 1, moving: 1,
    join: 1, joins: 1, joined: 1, share: 1, shared: 1, shares: 1, need: 1, needed: 1, needs: 1,
    grow: 1, grew: 1, grown: 1, feed: 1, feeds: 1, fed: 1, store: 1, stores: 1, stored: 1,
    arrive: 1, arrived: 1, build: 1, built: 1, hold: 1, holds: 1, held: 1
  };
  var LINK_FILLER = { those: 1, these: 1, them: 1, such: 1, also: 1, along: 1, while: 1, still: 1, away: 1, other: 1, same: 1, there: 1 };

  function contentShare(child, parent, ctx, nouns) {
    var topic = topicWords(ctx);
    var parentWords = linkWords(parent.text);
    return linkWords(child.text).some(function (word) {
      if (LINK_FILLER[word] || (nouns && LINK_VERB[word])) return false;
      if (topic.some(function (item) { return sameStem(word, item); })) return false;
      return parentWords.some(function (other) {
        return !LINK_FILLER[other] && sameStem(word, other) && (!nouns || !LINK_VERB[other]);
      });
    });
  }

  // A supplied explanation link is unrelated when it shares no content word with its
  // target, apart from the lesson topic, and another point names the feature it explains.
  // That other point is not substituted.
  function unrelatedFeatureLink(row, target, rows, ctx) {
    if (!row || !target || row === target) return false;
    if (!EXPLAIN_ROLE[row.role]) return false;
    if (!target.role || target.role === "foundation" || !NAMED_POINT[target.role]) return false;
    if (contentShare(row, target, ctx, false)) return false;
    return rows.some(function (other) {
      return other !== row && other !== target && NAMED_POINT[other.role] && contentShare(row, other, ctx, true);
    });
  }

  function featureClaimFor(feature, claims, mechanismText, ctx) {
    var words = linkWords(feature);
    if (!words.length) return "";
    var hits = (claims || []).filter(function (claim) {
      if (!claim || sameSentence(claim.text, mechanismText)) return false;
      var claimWords = linkWords(claim.text);
      return words.every(function (word) {
        return claimWords.some(function (other) { return sameStem(word, other); });
      });
    });
    if (hits.length !== 1) return "";
    var child = { text: mechanismText };
    var parent = hits[0];
    var featureRow = { text: feature };
    if (!contentShare(child, parent, ctx)) return "";
    if (!contentShare(child, featureRow, ctx)) return "";
    return parent.claimId || "";
  }

  function priorPlanRows(ctx) {
    var prior = ctx && (ctx.priorPlan || ctx.priorLinks);
    if (!prior) return [];
    if (Array.isArray(prior)) return prior;
    if (Array.isArray(prior.learningMap)) return prior.learningMap;
    if (prior.lessonPlan && Array.isArray(prior.lessonPlan.learningMap)) return prior.lessonPlan.learningMap;
    return [];
  }

  function priorKeysFor(row, prior, byKey) {
    var source = null;
    prior.forEach(function (item) {
      if (source || !item) return;
      if (sameSentence(item.knowledge || item.text, row.text)) source = item;
    });
    if (!source) return [];
    var keys = [];
    dependencyRefs(source).forEach(function (key) {
      var earlier = null;
      prior.forEach(function (item) {
        if (earlier || !item) return;
        if (clean(item.id, 24) === key) earlier = item;
      });
      var match = "";
      if (earlier) {
        Object.keys(byKey).forEach(function (id) {
          if (match) return;
          if (sameSentence(byKey[id].text, earlier.knowledge || earlier.text)) match = id;
        });
      } else if (byKey[key]) match = key;
      if (match && keys.indexOf(match) === -1) keys.push(match);
    });
    return keys;
  }

  // Same strand count the teaching plan will require. Readiness uses it before any lesson is generated.
  function strandsRequiredFor(ctx, objective) {
    ctx = ctx || {};
    objective = objective || learningGoalOf(ctx) || clean((ctx.lessonBrief && ctx.lessonBrief.learningGoal) || "", 240);
    var budget = depthBudget(ctx.yearGroup || ctx.yearAssumption, ctx.requestedMinutes);
    var scope = teachingScope(ctx);
    var seeking = planSeeksDepth(ctx, objective);
    var range = strandRange(budget);
    if (seeking) return seekingStrandMinimum(ctx, budget);
    if (scope.scope === "broad") return range.low;
    return 1;
  }

  function selectedPackClaims(pack, selection) {
    pack = pack || {};
    var claims = pack.claims || [];
    var ids = selection && selection.claimIds;
    if (ids && ids.length) {
      var allow = {};
      ids.forEach(function (id) { allow[id] = 1; });
      return claims.filter(function (claim) { return claim && allow[claim.claimId]; });
    }
    return claims.filter(function (claim) {
      return claim && !claim.localHold && !claim.classificationHold && !claim.contested;
    });
  }

  function featureHits(feature, claims, mechanismText) {
    var words = linkWords(feature);
    if (!words.length) return [];
    return (claims || []).filter(function (claim) {
      if (!claim || sameSentence(claim.text, mechanismText)) return false;
      var claimWords = linkWords(claim.text);
      return words.every(function (word) {
        return claimWords.some(function (other) { return sameStem(word, other); });
      });
    });
  }

  function concreteFeatureClaim(claim, feature) {
    if (!claim || !clean(claim.text)) return false;
    if (claim.classificationHold) return false;
    var words = linkWords(feature);
    if (!words.length) return false;
    var claimWords = linkWords(claim.text);
    var named = words.every(function (word) {
      return claimWords.some(function (other) { return sameStem(word, other); });
    });
    if (!named) return false;
    return clean(claim.text).split(/\s+/).filter(Boolean).length >= 4;
  }

  // The words pairRelevant reads as the learning goal. Shared with the source repair so
  // its feedback names the same words the gate checks.
  function goalWords(ctx) {
    ctx = ctx || {};
    var brief = ctx.lessonBrief || {};
    var intent = brief.teacherIntent || {};
    var focus = intent.focusConcepts || brief.focusConcepts || [];
    var corpus = [
      intent.learningGoal, brief.learningGoal, intent.requiredEvidence, brief.requiredEvidence,
      focus.join(" "), ctx.topic, ctx.lessonText, ctx.teacherInstructions, brief.rawRequest
    ].join(" ");
    return contentWords(corpus);
  }

  // Relevance correction (source-grounded lesson PR, its own commit). Live Year 3 runs 5 and 6
  // held "Sauropods' very long necks let them stand still and stretch high, low and wide to reach
  // plants" (verbatim NHM, entailment supported) only because "sauropods" is not the word
  // "dinosaurs". The cited page can supply the topic: when the page title or lead names the
  // teacher's topic, the topic counts for a pair that names a body feature and states what it
  // does, under a goal about features or adaptation. The page alone never makes a claim
  // relevant: an off-goal claim (no body feature, no stated job) gets nothing from it.
  var BODY_FEATURE = /\b(?:legs?|necks?|tails?|teeth|tooth|jaws?|claws?|horns?|spikes?|plates?|armou?r|feathers?|wings?|skin|scales?|skulls?|bones?|beaks?|eyes?|nose|nostrils?|arms?|hands?|feet|foot|thumbs?|muscles?|frills?|crests?|fins?|shells?|fur|hair|stance|hips?|stomachs?|bell(?:y|ies)|brains?|roots?|leaves|leaf|stems?|petals?|seeds?|spines?|hooves|paws|trunks?|tusks?|gills?|lungs?|heads?)\b/i;
  var FEATURE_GOAL = /\b(?:adapt\w*|features?|body|bodies|body parts?|surviv\w*)\b/;
  // A body-feature pair describes what the animal or plant had and what that did for it.
  // Activities (people making, wearing or measuring things) are not that, even on a topic page.
  var FEATURE_OWNED = /\b(?:had|has|have|were|was|are|is|grew|grows)\b/i;
  var HUMAN_ACTOR = /\b(?:children|child|pupils?|kids?|students?|you|your|we|our|people|class|teachers?|humans?|visitors?)\b/i;

  function pageLead(passages, url) {
    var first = null;
    Object.keys(passages).forEach(function (id) {
      var item = passages[id];
      if (!item || item.url !== url) return;
      var n = Number((String(id).match(/P(\d+)$/) || [])[1] || 9999);
      if (!first || n < first.n) first = { n: n, text: item.text };
    });
    return first ? ((String(first.text).match(/^[^.!?]*[.!?]?/) || [""])[0]) : "";
  }

  function pageNamesTopic(featureClaim, ctx) {
    var topic = contentWords((ctx && ctx.topic) || "");
    var passages = researchPassages(ctx);
    if (!topic.length || !passages || !featureClaim) return false;
    return sourceRefsOf(featureClaim).some(function (id) {
      var item = passages[id];
      if (!item) return false;
      var context = contentWords([item.title || "", pageLead(passages, item.url)].join(" "));
      return topic.every(function (head) { return context.some(function (word) { return sameStem(word, head); }); });
    });
  }

  function pageTopicCounts(featureClaim, explanation, feature, ctx) {
    var brief = (ctx && ctx.lessonBrief) || {};
    var intent = brief.teacherIntent || {};
    var goalText = [intent.learningGoal, brief.learningGoal, intent.requiredEvidence, brief.requiredEvidence, (intent.focusConcepts || brief.focusConcepts || []).join(" ")].join(" ").toLowerCase();
    if (!FEATURE_GOAL.test(goalText)) return false;
    if (!feature || !BODY_FEATURE.test(feature)) return false;
    if (!featureClaim || !BODY_FEATURE.test(featureClaim.text || "") || !FEATURE_OWNED.test(featureClaim.text || "")) return false;
    if (HUMAN_ACTOR.test(featureClaim.text || "") || HUMAN_ACTOR.test(explanation || "")) return false;
    if (!statesMechanism(explanation)) return false;
    return pageNamesTopic(featureClaim, ctx);
  }

  function pairRelevant(featureClaim, explanation, feature, ctx) {
    ctx = ctx || {};
    var goal = goalWords(ctx);
    var mine = contentWords([featureClaim && featureClaim.text, explanation, feature].join(" "));
    if (pageTopicCounts(featureClaim, explanation, feature, ctx)) mine = mine.concat(contentWords(ctx.topic || ""));
    if (!mine.length || !goal.length) return false;
    function shares(list) {
      return mine.some(function (word) {
        return list.some(function (other) { return sameStem(word, other); });
      });
    }
    if (teachingScope(ctx).scope === "broad") return shares(goal);
    var subject = contentWords(ctx.topic || "");
    var specific = goal.filter(function (word) {
      return !subject.some(function (head) { return sameStem(word, head); });
    });
    if (!specific.length) return shares(goal);
    return mine.some(function (word) {
      if (subject.some(function (head) { return sameStem(word, head); })) return false;
      return specific.some(function (other) { return sameStem(word, other); });
    });
  }

  function sameTeachingIdea(left, right) {
    if (!left || !right) return false;
    if (left.featureClaimId && left.featureClaimId === right.featureClaimId) return true;
    var a = linkWords(left.feature);
    var b = linkWords(right.feature);
    return a.some(function (word) {
      return b.some(function (other) { return sameStem(word, other); });
    });
  }

  // featureClaimId is necessary and not sufficient. A ready pair also names a concrete
  // feature, explains how or why it works, links two different selected claims, and
  // belongs to the learning goal. Provenance and factuallyVerified are not readiness.
  function assessPackReadiness(pack, selection, ctx) {
    ctx = ctx || {};
    pack = pack || {};
    selection = selection || {};
    var empty = {
      status: "ready",
      skipped: true,
      requiredPairs: 0,
      distinctReady: 0,
      pairs: [],
      readyPairs: [],
      ideas: [],
      missing: [],
      issues: [],
      factuallyVerified: false
    };
    if (!pack.claims || !pack.claims.length || pack.status === "blocked" || selection.status === "blocked") return empty;
    var required = strandsRequiredFor(ctx);
    var selected = selectedPackClaims(pack, selection);
    var selectedIds = {};
    selected.forEach(function (claim) { selectedIds[claim.claimId] = claim; });
    var byId = {};
    (pack.claims || []).forEach(function (claim) { byId[claim.claimId] = claim; });
    var mechanisms = pack.mechanisms || [];
    var headIds = {};
    mechanisms.forEach(function (item) {
      if (item && item.featureClaimId) headIds[item.featureClaimId] = 1;
    });
    var examined = [];
    mechanisms.forEach(function (item) {
      if (!item || !item.text) return;
      var feature = clean(item.feature, 80);
      var featureClaim = item.featureClaimId ? byId[item.featureClaimId] : null;
      var hits = feature ? featureHits(feature, pack.claims, item.text) : [];
      var gaps = [];
      if (!selectedIds[item.claimId]) gaps.push("the explanation is not selected admitted knowledge for this lesson");
      if (!feature) gaps.push("no concrete feature or concept is named");
      else if (!item.featureClaimId) gaps.push("the feature phrase does not match one other selected claim, so there is no explicit relationship");
      else if (!featureClaim) gaps.push("the feature claim id does not resolve to an admitted claim");
      else if (!selectedIds[featureClaim.claimId]) gaps.push("the feature claim is not selected for this lesson");
      else if (hits.length !== 1 || hits[0].claimId !== featureClaim.claimId) gaps.push("the feature relationship is ambiguous");
      else if (!contentShare({ text: item.text }, featureClaim, ctx) || !contentShare({ text: item.text }, { text: feature }, ctx)) gaps.push("the explanation does not share the feature with the selected claim");
      else if (!concreteFeatureClaim(featureClaim, feature)) gaps.push("the selected claim is not a concrete feature or concept");
      if (!statesMechanism(item.text)) {
        gaps.push(item.featureClaimId && featureClaim && selectedIds[featureClaim.claimId]
          ? "the feature claim resolves, but the explanation does not state how or why"
          : "the explanation does not state how or why");
      }
      if (!gaps.some(function (gap) { return gap.indexOf("not relevant") !== -1; }) && featureClaim && selectedIds[featureClaim.claimId] && !pairRelevant(featureClaim, item.text, feature, ctx)) gaps.push("the pair is not relevant to the learning goal");
      var ready = !gaps.length;
      if (!ready && !feature && headIds[item.claimId] && !statesMechanism(item.text)) return;
      examined.push({
        mechanismClaimId: item.claimId,
        featureClaimId: ready ? featureClaim.claimId : (item.featureClaimId || ""),
        feature: feature,
        featureText: featureClaim ? featureClaim.text : "",
        featureClaim: ready ? featureClaim : null,
        explanation: item.text,
        ready: ready,
        validated: ready,
        gaps: gaps
      });
    });
    var ideas = [];
    examined.forEach(function (pair) {
      if (!pair.ready) return;
      var group = null;
      ideas.forEach(function (idea) {
        if (group) return;
        if (idea.some(function (other) { return sameTeachingIdea(pair, other); })) group = idea;
      });
      if (!group) {
        group = [];
        ideas.push(group);
      } else {
        pair.ready = false;
        pair.duplicate = true;
        pair.gaps = ["repeats the teaching idea in \"" + clean(group[0].explanation, 120) + "\""];
      }
      group.push(pair);
    });
    ideas.forEach(function (group) {
      group.forEach(function (pair, index) {
        if (index === 0) return;
        pair.ready = false;
        pair.duplicate = true;
        if (!pair.gaps.length) pair.gaps = ["repeats the teaching idea in \"" + clean(group[0].explanation, 120) + "\""];
      });
    });
    var readyPairs = [];
    examined.forEach(function (pair) { if (pair.ready) readyPairs.push(pair); });
    // ID lineage: each gate-ready pair is a teaching unit the plan, beats and questions cite by id.
    readyPairs.forEach(function (pair, index) {
      pair.unitId = "u" + (index + 1);
      pair.elementClaimId = pair.featureClaimId;
      pair.explanationClaimId = pair.mechanismClaimId;
    });
    var missing = [];
    if (ideas.length < required) {
      missing.push("Missing substance: " + (required - ideas.length) + " more distinct pair" + (required - ideas.length === 1 ? "" : "s") + ". Each pair needs a concrete feature or concept, a separate explanation of how or why that feature works, an explicit relationship between those two selected claims, and relevance to the learning goal.");
    }
    if (!mechanisms.length) missing.push("The selected claims do not include a mechanism that explains a feature.");
    examined.forEach(function (pair) {
      if (pair.ready) return;
      var detail = pair.gaps.join("; ");
      if (detail) detail = detail.charAt(0).toUpperCase() + detail.slice(1);
      missing.push("Not ready: \"" + clean(pair.explanation, 160) + "\". " + detail + ".");
    });
    var status = ideas.length >= required ? "ready" : "incomplete";
    var issue = status === "ready" ? "" : "PACK_INCOMPLETE: this lesson needs " + required + " distinct feature-and-explanation pairs. The pack has " + ideas.length + ". " + missing.join(" ");
    return {
      status: status,
      skipped: false,
      requiredPairs: required,
      distinctReady: ideas.length,
      pairs: examined,
      readyPairs: readyPairs,
      ideas: ideas,
      missing: missing,
      issues: issue ? [issue] : [],
      factuallyVerified: false
    };
  }

  function lossReasonForPair(pair, rejected, items) {
    var found = "";
    (rejected || []).forEach(function (item) {
      if (found || !item) return;
      if (sameSentence(item.knowledge, pair.explanation) || sameSentence(item.knowledge, pair.featureText)) found = item.reason || "removed";
    });
    if (found) return found;
    var head = false;
    var child = false;
    var linked = false;
    (items || []).forEach(function (item) {
      var ids = item.claimIds || [];
      if (ids.indexOf(pair.featureClaimId) !== -1) head = true;
      if (ids.indexOf(pair.mechanismClaimId) !== -1) {
        child = true;
        if ((item.dependsOn || []).some(function (id) {
          return (items || []).some(function (other) {
            return other.id === id && (other.claimIds || []).indexOf(pair.featureClaimId) !== -1;
          });
        })) linked = true;
      }
    });
    if (head && child && !linked) return "the explanation no longer depends on the feature claim";
    if (!child) return "the explanation is not in the learning map";
    return "the feature claim is not in the learning map";
  }

  function pairPreserved(pair, items) {
    var head = null;
    var child = null;
    (items || []).forEach(function (item) {
      var ids = item.claimIds || [];
      if (ids.indexOf(pair.featureClaimId) !== -1) head = item;
      if (ids.indexOf(pair.mechanismClaimId) !== -1) child = item;
    });
    if (!head || !child || head === child) return false;
    return (child.dependsOn || []).indexOf(head.id) !== -1;
  }

  function packPairReport(readiness, items, rejected) {
    if (!readiness || readiness.skipped) {
      return { skipped: true, requiredPairs: 0, distinctReady: 0, preserved: 0, lost: [], issue: "", factuallyVerified: false };
    }
    var preserved = 0;
    var lost = [];
    (readiness.ideas || []).forEach(function (group) {
      var pair = group[0];
      if (group.some(function (item) { return pairPreserved(item, items); })) {
        preserved += 1;
        return;
      }
      lost.push({
        mechanismClaimId: pair.mechanismClaimId,
        featureClaimId: pair.featureClaimId,
        explanation: pair.explanation,
        featureText: pair.featureText,
        reason: lossReasonForPair(pair, rejected, items)
      });
    });
    var issue = "";
    if (lost.length) {
      issue = lost.map(function (row) {
        return "A required feature-and-explanation pair was removed: \"" + clean(row.explanation, 160) + "\" (feature: \"" + clean(row.featureText, 160) + "\"). Reason: " + row.reason + ".";
      }).join(" ") + " Rechecked readiness: " + preserved + " of " + readiness.requiredPairs + " required pairs remain.";
    }
    return {
      skipped: false,
      requiredPairs: readiness.requiredPairs,
      distinctReady: readiness.distinctReady,
      preserved: preserved,
      lost: lost,
      issue: issue,
      factuallyVerified: false
    };
  }

  // ---- ID lineage (source-grounded lesson PR, patch 5) ----
  // A gate-ready pack pair is a teaching unit: unitId, elementClaimId (the feature claim) and
  // explanationClaimId (the claim that says what the feature does). The learning map, the
  // teaching beats and the questions carry those ids, and validation follows the ids. Goal
  // relevance was decided once, at the pack gate; it is not re-derived downstream from words.
  // Substance still applies everywhere: a point or beat that cites a unit must itself state the
  // feature's job in specific words ("helped them survive" or "let dinosaurs." does not).
  var JOB_FILLER = { allow: 1, allows: 1, allowed: 1, allowing: 1, let: 1, lets: 1, letting: 1, enable: 1, enables: 1, enabled: 1, enabling: 1, help: 1, helps: 1, helped: 1, helping: 1, because: 1, could: 1, can: 1, make: 1, makes: 1, made: 1, making: 1, cause: 1, causes: 1, caused: 1, which: 1, when: 1, meant: 1, were: 1, was: 1, had: 1, have: 1, has: 1, their: 1, them: 1, they: 1, this: 1, these: 1, those: 1, that: 1, with: 1, from: 1, into: 1, than: 1, more: 1, very: 1, also: 1, other: 1, feature: 1, features: 1, adaptation: 1, adaptations: 1, body: 1, part: 1, parts: 1, important: 1, useful: 1, special: 1, way: 1, ways: 1, some: 1, many: 1, all: 1, the: 1, and: 1 };

  function readyUnits(readiness) {
    if (!readiness || readiness.skipped) return [];
    return (readiness.readyPairs || []).filter(function (pair) { return pair && pair.unitId; }).map(function (pair) {
      return { unitId: pair.unitId, elementClaimId: pair.elementClaimId || pair.featureClaimId, explanationClaimId: pair.explanationClaimId || pair.mechanismClaimId, feature: pair.feature || "", explanation: pair.explanation || "" };
    });
  }

  // Specific words for what the feature does: not the feature's own words, not the topic, not
  // the linking verb, and not a vague job (survive, live, adapt, environment).
  function jobWords(text, feature, ctx) {
    var skip = contentWords([feature, (ctx && ctx.topic) || ""].join(" "));
    return contentWords(text).filter(function (word) {
      if (word.length < 3 || JOB_FILLER[word] || VAGUE_JOB[word] || /^adapt/.test(word) || /^surviv/.test(word)) return false;
      return !skip.some(function (other) { return sameStem(word, other); });
    });
  }

  function statesUnitJob(text, unit, ctx) {
    if (!statesMechanism(text)) return false;
    return jobWords(text, unit && unit.feature, ctx).length >= 2;
  }

  function unitIdsForClaims(claimIds, units) {
    var out = [];
    (claimIds || []).forEach(function (id) {
      units.forEach(function (unit) {
        if ((unit.elementClaimId === id || unit.explanationClaimId === id) && out.indexOf(unit.unitId) === -1) out.push(unit.unitId);
      });
    });
    return out;
  }

  // Plan stage: a point answers the learning goal when it cites a gate-ready unit's explanation
  // claim and states that unit's job. A point citing no ready unit answers nothing; it stays only
  // when the map links it to a point that does (the existing reachability rule).
  function lineageAnswers(row, units, ctx) {
    var ids = (row && row.claimIds) || [];
    return units.some(function (unit) {
      return ids.indexOf(unit.explanationClaimId) !== -1 && statesUnitJob(row.text, unit, ctx);
    });
  }

  // Teaching and assessment: stamp the unit and claim ids each plan point, strand, beat and
  // question carries (from knowledgeRefs -> learning map point -> claimIds), then check that every
  // gate-ready unit is planned in a developed strand, taught by an explain beat that states its
  // job, and assessed by at least one question. Returns { skipped, units, issues }.
  function unitLineage(adventure, ctx) {
    var readiness = assessPackReadiness(ctx && ctx.knowledgePack, ctx && ctx.knowledgeSelection, ctx);
    var units = readyUnits(readiness);
    if (!units.length) return { skipped: true, units: [], issues: [] };
    var plan = (adventure && adventure.lessonPlan) || {};
    var map = plan.learningMap || [];
    var point = {};
    map.forEach(function (item) {
      item.unitIds = unitIdsForClaims(item.claimIds, units);
      point[item.id] = item;
    });
    var strands = (plan.teachingPlan && plan.teachingPlan.strands) || [];
    strands.forEach(function (strand) {
      var ids = [];
      (strand.knowledgeRefs || []).forEach(function (ref) { ((point[ref] && point[ref].unitIds) || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); }); });
      strand.unitIds = ids;
    });
    function idsFor(refs) {
      var unitIds = [];
      var claimIds = [];
      (refs || []).forEach(function (ref) {
        var item = point[ref];
        if (!item) return;
        (item.unitIds || []).forEach(function (id) { if (unitIds.indexOf(id) === -1) unitIds.push(id); });
        (item.claimIds || []).forEach(function (id) { if (claimIds.indexOf(id) === -1) claimIds.push(id); });
      });
      return { unitIds: unitIds, claimIds: claimIds };
    }
    var beatsById = {};
    var questions = [];
    ((adventure && adventure.activities) || []).forEach(function (activity) {
      (activity.beats || []).forEach(function (beat) {
        var ids = idsFor(beat.knowledgeRefs);
        beat.unitIds = ids.unitIds;
        beat.claimIds = ids.claimIds;
        beatsById[beat.id] = { beat: beat, slotId: activity.slotId || "" };
      });
      var config = activity.config || {};
      (Array.isArray(config.questions) ? config.questions : []).forEach(function (question) {
        var from = beatsById[question.id];
        var refs = from ? (from.beat.knowledgeRefs || []).slice() : [];
        var ids = idsFor(refs);
        question.knowledgeRefs = refs;
        question.unitIds = ids.unitIds;
        question.claimIds = ids.claimIds;
        questions.push(question);
      });
    });
    var issues = [];
    var rows = units.map(function (unit) {
      var planned = map.filter(function (item) { return (item.unitIds || []).indexOf(unit.unitId) !== -1; });
      var explainPoint = planned.filter(function (item) { return (item.claimIds || []).indexOf(unit.explanationClaimId) !== -1; })[0] || null;
      var elementPoint = planned.filter(function (item) { return (item.claimIds || []).indexOf(unit.elementClaimId) !== -1; })[0] || null;
      var strand = strands.filter(function (s) { return (s.unitIds || []).indexOf(unit.unitId) !== -1 && s.developed !== false; })[0] || null;
      var beats = Object.keys(beatsById).map(function (id) { return beatsById[id]; }).filter(function (row) { return (row.beat.unitIds || []).indexOf(unit.unitId) !== -1; });
      var explainBeats = beats.filter(function (row) {
        // The teaching itself: a teach-stage beat (or an explain move) that cites the unit's
        // explanation point and states the job. A recap or apply prompt does not stand in for it.
        var teaching = row.slotId === "teach" || row.beat.move === "explain";
        return teaching && explainPoint && (row.beat.knowledgeRefs || []).indexOf(explainPoint.id) !== -1 && statesUnitJob(row.beat.pupil && row.beat.pupil.text, unit, ctx);
      });
      var asked = questions.filter(function (q) { return (q.unitIds || []).indexOf(unit.unitId) !== -1; });
      var problems = [];
      if (!explainPoint) problems.push("no learning-map point carries its explanation claim " + unit.explanationClaimId);
      else if (!statesUnitJob(explainPoint.knowledge, unit, ctx)) problems.push("its learning-map point does not state what the feature does");
      if (!elementPoint) problems.push("no learning-map point carries its feature claim " + unit.elementClaimId);
      if (!strand) problems.push("no developed teaching strand carries it");
      if (!explainBeats.length) problems.push("no teaching beat cites its explanation and states what the feature does");
      if (!asked.length) problems.push("no question assesses it");
      if (problems.length) issues.push("LINEAGE: unit " + unit.unitId + " (" + clean(unit.feature, 60) + "): " + problems.join("; ") + ".");
      return {
        unitId: unit.unitId, feature: unit.feature, elementClaimId: unit.elementClaimId, explanationClaimId: unit.explanationClaimId,
        planPoints: planned.map(function (item) { return item.id; }), strand: strand ? strand.id : "",
        beats: beats.map(function (row) { return row.beat.id; }), explainBeats: explainBeats.map(function (row) { return row.beat.id; }),
        questions: asked.map(function (q) { return q.id; }), ok: !problems.length, problems: problems
      };
    });
    var out = { skipped: false, requiredPairs: readiness.requiredPairs, units: rows, issues: issues, label: "ID lineage; automated; not human review" };
    // Patch 6, research mode: lineage extends to APPLY. The apply beat cites a gate-ready unit,
    // and a choose task carries that same unit id.
    if (researchMode(ctx)) {
      var applyActivity = ((adventure && adventure.activities) || []).filter(function (a) { return a && a.slotId === "apply"; })[0] || null;
      var applyUnitIds = [];
      ((applyActivity && applyActivity.beats) || []).forEach(function (beat) { (beat.unitIds || []).forEach(function (id) { if (applyUnitIds.indexOf(id) === -1) applyUnitIds.push(id); }); });
      var readyIds = units.map(function (u) { return u.unitId; });
      applyUnitIds = applyUnitIds.filter(function (id) { return readyIds.indexOf(id) !== -1; });
      var step = applyActivity && applyActivity.scene && applyActivity.scene.interaction;
      var applyProblems = [];
      if (!applyActivity) applyProblems.push("the lesson has no APPLY stage");
      else if (!applyUnitIds.length) applyProblems.push("no APPLY beat cites a gate-ready unit");
      if (step && step.type === "choose") {
        if (!step.unitId) applyProblems.push("the choose task carries no unit id");
        else if (applyUnitIds.indexOf(step.unitId) === -1) applyProblems.push("the choose task's unit " + step.unitId + " is not the unit its beat cites (" + (applyUnitIds.join(", ") || "none") + ")");
      }
      if (applyProblems.length) issues.push("LINEAGE: apply: " + applyProblems.join("; ") + ".");
      out.apply = { unitIds: applyUnitIds, interactionUnitId: (step && step.unitId) || "", interactionType: (step && step.type) || "", ok: !applyProblems.length, problems: applyProblems };
    }
    return out;
  }

  // A validated pack pair is the strand edge. A model hub does not replace it.
  // An empty featureClaimId, an ambiguous id, or a thin explanation does not create a head.
  function realiseFeatureLinks(rows, ctx) {
    var readiness = assessPackReadiness(ctx && ctx.knowledgePack, ctx && ctx.knowledgeSelection, ctx);
    if (readiness.skipped) return readiness;
    readiness.pairs.forEach(function (pair) {
      if (!pair.validated) return;
      var row = null;
      rows.forEach(function (item) {
        if (row) return;
        var ids = item.claimIds || [];
        if (ids.indexOf(pair.mechanismClaimId) !== -1 || sameSentence(item.text, pair.explanation)) row = item;
      });
      if (!row) return;
      if ((row.claimIds || []).indexOf(pair.featureClaimId) !== -1) return;
      if (!EXPLAIN_ROLE[row.role]) row.role = "mechanism";
      var targets = [];
      rows.forEach(function (other) {
        if (other === row) return;
        var ids = other.claimIds || [];
        if (ids.indexOf(pair.featureClaimId) !== -1 || sameSentence(other.text, pair.featureText)) targets.push(other);
      });
      var target = targets.length === 1 ? targets[0] : null;
      if (!target && !targets.length && pair.featureClaim) {
        target = {
          key: "pack-" + pair.featureClaimId,
          text: pair.featureClaim.text,
          role: pair.featureClaim.kind === "definition" ? "concept" : "feature",
          label: "",
          importance: "core",
          needs: [],
          deps: [],
          claimIds: [pair.featureClaimId],
          index: row.index - 0.01,
          packSupplied: true
        };
        rows.push(target);
      }
      if (!target || targets.length > 1) return;
      if ((target.claimIds || []).indexOf(pair.featureClaimId) === -1) target.claimIds = (target.claimIds || []).concat([pair.featureClaimId]);
      if (!contentShare(row, target, ctx)) return;
      if (target.role !== "feature" && target.role !== "concept" && target.role !== "definition") target.role = "feature";
      if (!NAMED_POINT[target.role]) return;
      row.deps = [target];
      row.packEdge = pair.featureClaimId;
      target.packEdge = pair.featureClaimId;
    });
    return readiness;
  }

  function mapProposals(parsed, ctx) {
    var map = Array.isArray(parsed && parsed.learningMap) && parsed.learningMap.length ? parsed.learningMap : null;
    var legacy = parsed && parsed.keyKnowledge;
    var source = map || (Array.isArray(legacy) ? legacy : (legacy ? [legacy] : []));
    var rows = [];
    var byKey = {};
    source.forEach(function (raw) {
      if (rows.length >= MAP_READ_LIMIT) return;
      var object = raw && typeof raw === "object";
      var text = clean(object ? (raw.knowledge || raw.text || raw.fact || raw.statement) : raw, 180);
      if (!text) return;
      var label = clean(object ? (raw.role || raw.knowledgeType || raw.type) : "", 24).toLowerCase();
      var row = {
        key: clean(object && raw.id, 24) || ("p" + (rows.length + 1)),
        text: text,
        role: MAP_ROLES[label] ? label : "",
        label: label,
        importance: clean(object && raw.importance, 20).toLowerCase() === "supporting" ? "supporting" : "core",
        needs: object ? dependencyRefs(raw) : [],
        claimIds: object ? claimIdList(raw.claimIds || raw.claimId) : [],
        index: rows.length
      };
      if (!byKey[row.key]) byKey[row.key] = row;
      rows.push(row);
    });
    var prior = priorPlanRows(ctx);
    rows.forEach(function (row) {
      if (row.needs.length || !prior.length) return;
      priorKeysFor(row, prior, byKey).forEach(function (key) {
        if (row.needs.indexOf(key) === -1) row.needs.push(key);
      });
    });
    rows.forEach(function (row) {
      row.deps = [];
      row.needs.forEach(function (key) {
        var target = byKey[key];
        if (target && target !== row && row.deps.indexOf(target) === -1 && !unrelatedFeatureLink(row, target, rows, ctx)) row.deps.push(target);
      });
    });
    return { rows: rows, proposed: !!map };
  }

  function mapReaches(from, to) {
    var seen = [];
    var stack = from.deps.slice();
    while (stack.length) {
      var next = stack.pop();
      if (next === to) return true;
      if (seen.indexOf(next) !== -1) continue;
      seen.push(next);
      next.deps.forEach(function (dep) { stack.push(dep); });
    }
    return false;
  }

  function mapRestates(kept, row, goal) {
    if (sameSentence(kept.text, row.text)) return true;
    if (mapKind(kept.text, kept.role, kept.deps.length) !== "relationship" || mapKind(row.text, row.role, row.deps.length) !== "relationship") return false;
    if (mapReaches(kept, row) || mapReaches(row, kept)) return false;
    return sameRelationship(kept.text, row.text, goal);
  }

  function mapOrder(rows) {
    var placed = [];
    var left = rows.slice().sort(function (a, b) { return a.index - b.index; });
    while (left.length) {
      var ready = left.filter(function (row) {
        return row.deps.every(function (dep) { return placed.indexOf(dep) !== -1 || rows.indexOf(dep) === -1; });
      })[0] || left[0];
      placed.push(ready);
      left.splice(left.indexOf(ready), 1);
    }
    return placed;
  }

  function mapClosure(row, pool) {
    var out = [];
    (function visit(item) {
      if (out.indexOf(item) !== -1 || pool.indexOf(item) === -1) return;
      out.push(item);
      item.deps.forEach(visit);
    })(row);
    return out;
  }

  function mapScore(row) {
    var score = row.importance === "core" ? 4 : 0;
    if (row.answers) score += 3;
    if (row.kind === "connection") score += 1;
    if (row.kind === "example") score -= 2;
    return score;
  }

  var RELATIONAL_ROLE = { "function": 1, cause: 1, effect: 1, mechanism: 1, process: 1 };
  var DEPTH_FILLER = { thing: 1, things: 1, part: 1, parts: 1, way: 1, ways: 1, special: 1, important: 1, different: 1, many: 1, lots: 1, various: 1, together: 1, kind: 1, kinds: 1, type: 1, types: 1, well: 1, really: 1, very: 1, good: 1 };
  var DEPTH_REJECTION = { paraphrase: 1, "generic-connection": 1, "unsupported-example": 1, repetition: 1, "low-substance": 1 };
  var EXPLAINED_KIND = { relationship: 1, procedure: 1, comparison: 1 };

  function teachingScope(ctx) {
    ctx = ctx || {};
    var brief = ctx.lessonBrief || {};
    var ask = clean(brief.rawRequest || ctx.lessonText || ctx.teacherInstructions || "", 400).toLowerCase() || clean(ctx.topic, 200).toLowerCase();
    if (/\bhow to\b/.test(ask) || brief.intent === "procedure") return { scope: "narrow", reason: "procedure: the request names one method to learn" };
    if (/\bwhat (?:is|are) (?:a|an)\b|\bwhat (?:a|an) [a-z]+ (?:is|means)\b/.test(ask) || brief.intent === "definition") return { scope: "narrow", reason: "definition: the request names one idea to define" };
    var asked = ask.match(/\b(?:how|why|what makes|what causes|what happens when|difference between|compare)\b[^.?!]{3,80}/);
    if (asked) return { scope: "narrow", reason: "relationship: the request asks " + clean(asked[0], 80) };
    return { scope: "broad", reason: "topic: the request names a topic without one relationship, so Wondii chooses a coherent scope" };
  }

  function strandRange(depth) {
    return { low: depth.floor >= 4 ? 2 : 1, high: Math.max(1, Math.floor((depth.max - 1) / 2)) };
  }

  // A standard depth-seeking lesson needs more than one developed idea from Year 3.
  // Year 1–2 stay at two. A short budget keeps strandRange.low so the map can still fit.
  function seekingStrandMinimum(ctx, depth) {
    var range = strandRange(depth);
    if (range.low < 2) return range.low;
    var year = beatYear((ctx && (ctx.yearGroup || ctx.yearAssumption)) || "");
    if (year <= 2) return 2;
    if (depth.max >= 7) return 3;
    return range.low;
  }

  function depthWords(text) {
    return contentWords(text).filter(function (word) { return !DEPTH_FILLER[word] && !RELATION_STEM[word]; });
  }

  function sharesAdmittedStem(left, right) {
    var mine = depthWords(left).filter(function (word) { return word.length >= 5; });
    var theirs = depthWords(right);
    return mine.some(function (word) {
      return theirs.some(function (other) { return sameStem(word, other); });
    });
  }

  function stemIn(word, list) {
    return (list || []).some(function (other) { return sameStem(word, other); });
  }

  function metaPoint(text) {
    return /\b(?:learning|studying|knowing|understanding|finding out)\s+(?:more\s+)?about\b/i.test(String(text || ""));
  }

  function askedWords(ctx) {
    var brief = (ctx && ctx.lessonBrief) || {};
    return contentWords([brief.rawRequest, ctx && ctx.lessonText, ctx && ctx.teacherInstructions].join(" "));
  }

  function depthFilter(rows, ctx) {
    var asked = askedWords(ctx);
    var kept = [];
    var seen = [];
    var dropped = [];
    mapOrder(rows).forEach(function (row) {
      var mine = depthWords(row.text);
      var novel = mine.filter(function (word) { return !stemIn(word, seen); });
      var linking = row.role === "connection" && row.deps.length;
      var reason = "";
      if (metaPoint(row.text) && !novel.some(function (word) { return stemIn(word, asked); })) reason = "generic-connection";
      else if (!linking && row.role !== "example" && kept.length && !novel.length) reason = "repetition";
      row.depthWords = mine;
      if (reason) { dropped.push({ row: row, reason: reason }); return; }
      kept.push(row);
      mine.forEach(function (word) { seen.push(word); });
    });
    var gone = dropped.map(function (item) { return item.row; });
    function resolve(dep, trail) {
      if (gone.indexOf(dep) === -1) return [dep];
      if (trail.indexOf(dep) !== -1) return [];
      return dep.deps.reduce(function (out, next) { return out.concat(resolve(next, trail.concat([dep]))); }, []);
    }
    kept.forEach(function (row) {
      var deps = [];
      row.deps.forEach(function (dep) {
        resolve(dep, []).forEach(function (target) {
          if (target !== row && kept.indexOf(target) !== -1 && deps.indexOf(target) === -1) deps.push(target);
        });
      });
      row.deps = deps;
    });
    kept.sort(function (a, b) { return a.index - b.index; });
    return { kept: kept, dropped: dropped };
  }

  function strandsOf(nodes) {
    var byKey = {};
    var below = {};
    nodes.forEach(function (node) { byKey[node.key] = node; });
    nodes.forEach(function (node) {
      node.deps.forEach(function (dep) { if (byKey[dep]) below[dep] = (below[dep] || 0) + 1; });
    });
    function ordered(list) {
      var placed = [];
      var left = list.slice();
      while (left.length) {
        var ready = left.filter(function (node) {
          return node.deps.every(function (dep) { return !byKey[dep] || placed.indexOf(byKey[dep]) !== -1 || list.indexOf(byKey[dep]) === -1; });
        })[0] || left[0];
        placed.push(ready);
        left.splice(left.indexOf(ready), 1);
      }
      return placed;
    }
    var order = ordered(nodes.slice().sort(function (a, b) { return a.index - b.index; }));
    var group = {};
    var strands = [];
    order.forEach(function (node) {
      var deps = node.deps.filter(function (dep) { return byKey[dep] && group[dep]; });
      var under = below[node.key] || 0;
      if (!deps.length && under && (node.role === "foundation" || (under >= 2 && (node.role === "concept" || node.role === "definition")))) {
        group[node.key] = "f";
        return;
      }
      var groups = [];
      deps.forEach(function (dep) { if (groups.indexOf(group[dep]) === -1) groups.push(group[dep]); });
      if (node.role === "connection" && deps.length >= 2 && groups.length >= 2) {
        group[node.key] = "synthesis";
        return;
      }
      if (node.role === "example" && deps.length) {
        group[node.key] = group[deps[0]];
        return;
      }
      var open = deps.filter(function (dep) { return group[dep] !== "f"; });
      if (!open.length) {
        var id = "t" + (strands.length + 1);
        strands.push(id);
        group[node.key] = id;
        return;
      }
      var latest = open.slice().sort(function (a, b) { return order.indexOf(byKey[b]) - order.indexOf(byKey[a]); })[0];
      group[node.key] = group[latest];
    });
    var flat = order.filter(function (node) { return group[node.key] === "f"; });
    strands.forEach(function (id) {
      order.forEach(function (node) { if (group[node.key] === id) flat.push(node); });
    });
    order.forEach(function (node) { if (group[node.key] === "synthesis") flat.push(node); });
    return { order: ordered(flat), group: group, strands: strands };
  }

  function statesMechanism(text) {
    if (statesRelation(text) || statesFunction(text)) return true;
    var value = String(text || "");
    if (/\bwhich\s+(?:makes?|lets?|helps?|moves?|causes?|allows?|changes?|keeps?|stops?|carries|carry|push(?:es)?|pulls?|turns?|means?|wears?|drops?|builds?|sends?|takes?|gives?|shows?)\b/i.test(value)) return true;
    if (/\b(?:push(?:es)?|pulls?|carry|carries|extracts?|reduces?|wears?|flows?|bounces?|reflects?|pumps?|absorbs?|releases?|produces?)\b\s+[a-z0-9]/i.test(value)) return true;
    if (/\bso\b[^.]{0,60}\b(?:can|could)\b/i.test(value)) return true;
    if (/\bto\s+(?:breathe|survive|live|grow|see|move|swim|fly|hunt|stay|keep|carry|change|protect|find|catch|push|pull|flow|hold|steer)\b/i.test(value)) return true;
    if (/\bby\s+(?:pushing|pulling|moving|carrying|using|taking|making|cutting|wearing|flowing|reflecting|absorbing)\b/i.test(value)) return true;
    return false;
  }

  function explainedPoint(item) {
    if (EXPLAINED_KIND[item.kind]) return true;
    var text = item.knowledge || item.text || "";
    return !!((item.dependsOn || []).length && RELATIONAL_ROLE[item.role] && statesMechanism(text));
  }

  function depthSnapshot(items, teaching) {
    var depth = (teaching && teaching.substantiveDepth) || {};
    return {
      map: (items || []).slice(0, 12).map(function (item) {
        return { id: item.id, role: item.role, dependsOn: (item.dependsOn || []).slice(0, 6), knowledge: clean(item.knowledge, 160) };
      }),
      requiredDepth: depth.required,
      achievedDepth: depth.achieved,
      requiredStrands: depth.strandsRequired,
      developedStrands: depth.strandsDeveloped,
      met: !!depth.met
    };
  }

  function buildTeachingPlan(items, ctx, scope, required, depth, dropped) {
    var nodes = items.map(function (item, index) {
      return { key: item.id, role: item.role, deps: (item.dependsOn || []).slice(), index: index };
    });
    var strands = strandsOf(nodes);
    var seen = [];
    var earlier = [];
    var points = items.map(function (item) {
      var deps = item.dependsOn || [];
      var kind = mapKind(item.knowledge, item.role, deps.length);
      var mine = depthWords(item.knowledge);
      var novel = mine.filter(function (word) { return !stemIn(word, seen); });
      var echoes = mine.length >= 5 && novel.length <= 1 && earlier.some(function (other) {
        return mine.filter(function (word) { return stemIn(word, other); }).length / mine.length >= 0.75;
      });
      mine.forEach(function (word) { seen.push(word); });
      earlier.push(mine);
      var row = { id: item.id, kind: kind, role: item.role, dependsOn: deps, knowledge: item.knowledge };
      var category = "substantive";
      if (item.role === "example") category = deps.length ? "supporting" : "unsupported-example";
      else if (item.role === "connection" && deps.length) category = deps.length >= 2 && !metaPoint(item.knowledge) ? "synthesis" : "generic-connection";
      else if (kind !== "procedure" && echoes) category = "paraphrase";
      else if (kind !== "procedure" && ((!deps.length && !mine.length) || (deps.length && mine.length <= 2 && novel.length <= 1))) category = "low-substance";
      return { id: item.id, strand: strands.group[item.id] || "t1", category: category, explained: category === "substantive" && explainedPoint(row) };
    });
    var count = { substantive: 0, supporting: 0, synthesis: 0 };
    points.forEach(function (point) { if (count[point.category] !== undefined) count[point.category] += 1; });
    var achieved = count.substantive + Math.min(count.supporting, 1) + Math.min(count.synthesis, 1);
    var groupIds = (points.some(function (point) { return point.strand === "f"; }) ? ["f"] : []).concat(strands.strands);
    if (points.some(function (point) { return point.strand === "synthesis"; })) groupIds.push("synthesis");
    var textOf = {};
    var depsOf = {};
    items.forEach(function (item) { textOf[item.id] = item.knowledge; depsOf[item.id] = item.dependsOn || []; });
    var developed = 0;
    var list = groupIds.map(function (id) {
      var mine = points.filter(function (point) { return point.strand === id; });
      var refs = mine.map(function (point) { return point.id; });
      var lead = mine.filter(function (point) { return point.category === "substantive"; })[0] || mine[0];
      var needs = [];
      refs.forEach(function (ref) {
        depsOf[ref].forEach(function (dep) {
          var other = (points.filter(function (point) { return point.id === dep; })[0] || {}).strand;
          if (other && other !== id && needs.indexOf(other) === -1) needs.push(other);
        });
      });
      var isDeveloped = /^t/.test(id) && mine.some(function (point) {
        if (!point.explained && point.category !== "supporting") return false;
        return depsOf[point.id].some(function (dep) {
          return refs.indexOf(dep) !== -1 && points.some(function (other) { return other.id === dep && other.category === "substantive"; });
        });
      });
      if (isDeveloped) developed += 1;
      return {
        id: id,
        purpose: id === "f" ? "foundation" : (id === "synthesis" ? "connect the strands" : clean(textOf[lead.id], 100)),
        knowledgeRefs: refs,
        dependencies: needs,
        substantivePoints: mine.filter(function (point) { return point.category === "substantive"; }).map(function (point) { return point.id; }),
        supportingPoints: mine.filter(function (point) { return point.category !== "substantive"; }).map(function (point) { return point.id; }),
        developed: isDeveloped
      };
    });
    var range = strandRange(depth);
    var seeking = planSeeksDepth(ctx);
    var strandsRequired = seeking ? seekingStrandMinimum(ctx, depth) : (scope.scope === "broad" ? range.low : 1);
    var rejected = (dropped || []).map(function (item) {
      var reason = /^restates\b/.test(item.reason) ? "repetition" : item.reason;
      var row = { knowledge: clean(item.knowledge, 120), ref: "", reason: reason, taught: false };
      if (!DEPTH_REJECTION[reason]) { row.reason = "other"; row.detail = clean(item.reason, 60); }
      return row;
    });
    points.forEach(function (point) {
      if (point.category === "low-substance" || point.category === "paraphrase" || point.category === "generic-connection" || point.category === "unsupported-example") {
        rejected.push({ knowledge: clean(textOf[point.id], 120), ref: point.id, reason: point.category, taught: true });
      }
    });
    return {
      version: 1,
      scope: scope.scope,
      scopeReason: scope.reason,
      substantiveDepth: {
        required: required,
        achieved: achieved,
        substantive: count.substantive,
        supporting: count.supporting,
        synthesis: count.synthesis,
        strandsRequired: strandsRequired,
        strandsDeveloped: developed,
        met: achieved >= required && (seeking ? developed >= strandsRequired : (scope.scope !== "broad" || developed >= range.low))
      },
      strands: list,
      points: points,
      rejectedAsDepth: rejected.slice(0, 10)
    };
  }

  function buildLearningMap(parsed, ctx, objective) {
    ctx = ctx || {};
    var goal = planGoalText(ctx, objective);
    var budget = depthBudget(ctx.yearGroup || ctx.yearAssumption || (ctx.lessonPlan && ctx.lessonPlan.yearGroup), ctx.requestedMinutes);
    var seeking = seeksContribution(ctx, objective);
    var proposal = mapProposals(parsed, ctx);
    var rejected = [];
    var unique = [];
    var packOn = !!(ctx.knowledgePack && ctx.knowledgePack.status !== "blocked" && (ctx.knowledgePack.claims || []).length);
    proposal.rows.forEach(function (row) {
      if (packOn) {
        var bound = bindRowToPack(row, ctx);
        if (!bound.ok) {
          rejected.push({ knowledge: row.text, reason: bound.reason });
          return;
        }
        row.claimIds = bound.claimIds;
      }
      var twin = unique.filter(function (kept) { return mapRestates(kept, row, goal); })[0];
      if (twin) {
        row.merged = twin;
        rejected.push({ knowledge: row.text, reason: "restates " + twin.key });
        return;
      }
      unique.push(row);
    });
    unique.forEach(function (row) {
      var deps = [];
      row.deps.forEach(function (dep) {
        var target = dep.merged || dep;
        if (target !== row && unique.indexOf(target) !== -1 && deps.indexOf(target) === -1) deps.push(target);
      });
      row.deps = deps;
    });
    var readiness = realiseFeatureLinks(unique, ctx);
    var units = readyUnits(readiness);
    unique.forEach(function (row) {
      row.kind = mapKind(row.text, row.role, row.deps.length);
      row.unitIds = unitIdsForClaims(row.claimIds, units);
      // With gate-ready units, relevance follows the ids (lineageAnswers); otherwise the words.
      row.answers = seeking && (units.length ? lineageAnswers(row, units, ctx) : answersContribution(row.text, goal, row));
    });
    var connected = unique;
    if (seeking && unique.some(function (row) { return row.answers; })) {
      var reach = unique.filter(function (row) { return row.answers; });
      var grew = true;
      while (grew) {
        grew = false;
        unique.forEach(function (row) {
          if (reach.indexOf(row) !== -1) return;
          var linked = row.deps.some(function (dep) { return reach.indexOf(dep) !== -1; }) ||
            reach.some(function (kept) { return kept.deps.indexOf(row) !== -1; });
          if (linked) { reach.push(row); grew = true; }
        });
      }
      connected = unique.filter(function (row) {
        if (reach.indexOf(row) !== -1) return true;
        rejected.push({ knowledge: row.text, reason: "not connected to the learning goal" });
        return false;
      });
    } else if (unique.some(function (row) { return row.deps.length; })) {
      var linkedRows = [];
      var orphanRows = [];
      unique.forEach(function (row) {
        var linked = row.deps.length || unique.some(function (other) { return other.deps.indexOf(row) !== -1; });
        if (linked) linkedRows.push(row);
        else orphanRows.push(row);
      });
      // A selected pack claim with no dependsOn is still the earlier idea when the map is
      // short of the depth floor and a kept point already uses its words. It becomes a
      // foundation those points build on. It is not a new fact, and it does not merge strands.
      if (linkedRows.length < budget.floor) {
        var stillOrphan = [];
        var anchor = linkedRows.slice();
        orphanRows.forEach(function (row) {
          var prior = !row.role || row.role === "fact" || row.role === "concept" || row.role === "foundation" || row.role === "definition";
          var hits = prior && row.claimIds && row.claimIds.length
            ? anchor.filter(function (kept) { return sharesAdmittedStem(row.text, kept.text); })
            : [];
          if (!hits.length) { stillOrphan.push(row); return; }
          row.role = "foundation";
          hits.forEach(function (kept) {
            if (kept.deps.indexOf(row) === -1) kept.deps.push(row);
          });
          linkedRows.push(row);
        });
        orphanRows = stillOrphan;
      }
      orphanRows.forEach(function (row) {
        rejected.push({ knowledge: row.text, reason: "not connected to the learning map" });
      });
      connected = linkedRows;
    }
    var filtered = depthFilter(connected, ctx);
    var depthDropped = filtered.dropped.map(function (item) {
      rejected.push({ knowledge: item.row.text, reason: item.reason });
      return { knowledge: item.row.text, reason: item.reason };
    });
    connected = filtered.kept;
    var chosen = connected;
    if (connected.length > budget.max) {
      chosen = [];
      connected.slice().sort(function (a, b) {
        return mapScore(b) - mapScore(a) || a.index - b.index;
      }).forEach(function (row) {
        var need = mapClosure(row, connected).filter(function (item) { return chosen.indexOf(item) === -1; });
        if (chosen.length + need.length <= budget.max) chosen = chosen.concat(need);
      });
      connected.forEach(function (row) {
        if (chosen.indexOf(row) === -1) rejected.push({ knowledge: row.text, reason: "over the depth budget" });
      });
    }
    var strandNodes = chosen.map(function (row) {
      return { key: row.key + "#" + row.index, row: row, role: row.role || KIND_ROLE[row.kind] || "fact", index: row.index, deps: row.deps.filter(function (dep) { return chosen.indexOf(dep) !== -1; }).map(function (dep) { return dep.key + "#" + dep.index; }) };
    });
    var ordered = strandsOf(strandNodes).order.map(function (node) { return node.row; });
    var idOf = {};
    ordered.forEach(function (row, index) { idOf[row.key + "#" + row.index] = "k" + (index + 1); });
    var items = ordered.map(function (row) {
      return {
        id: idOf[row.key + "#" + row.index],
        knowledge: row.text,
        role: row.role || KIND_ROLE[row.kind] || "fact",
        importance: row.importance,
        dependsOn: row.deps.filter(function (dep) { return chosen.indexOf(dep) !== -1; }).map(function (dep) { return idOf[dep.key + "#" + dep.index]; }),
        claimIds: (row.claimIds || []).slice(),
        unitIds: (row.unitIds || []).slice(),
        answers: !!row.answers
      };
    });
    var pairReport = packPairReport(readiness, items, rejected);
    return {
      items: items,
      rejected: rejected,
      budget: budget,
      seeking: seeking,
      broad: seeking && broadContribution(goal),
      answered: items.some(function (item) { return item.answers; }),
      depthDropped: depthDropped,
      proposed: proposal.proposed,
      packPairs: pairReport,
      raw: proposal.rows.map(function (row) { return { text: row.text, knowledgeType: knowledgeRole(row.text, ROLE_TYPE[row.role] || row.label) }; })
    };
  }

  function mapEntries(items) {
    return (items || []).map(function (item) {
      return { text: item.knowledge, knowledgeType: knowledgeRole(item.knowledge, ROLE_TYPE[item.role] || "") };
    });
  }

  function knowledgeRole(text, labeled) {
    var allowed = { fact: 1, cause: 1, effect: 1, reason: 1, process: 1, definition: 1, comparison: 1, procedure: 1 };
    var label = clean(labeled, 20).toLowerCase();
    var size = clean(text).split(/\s+/).filter(Boolean).length;
    if (statesRelation(text)) {
      if (/\b(and then|turns into|turn into|becomes|became|forming|when|first)\b/i.test(text) && !/\b(because|so that|in order to|wanted|needed|which)\b/i.test(text)) return "process";
      return "reason";
    }
    if (statesFunction(text)) return "reason";
    if (allowed[label] && label !== "cause" && label !== "reason" && label !== "process") return label;
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
    }).filter(Boolean).slice(0, 12);
  }

  function asksWhy(ctx) {
    var brief = (ctx && ctx.lessonBrief) || {};
    if (brief.intent === "why") return true;
    var focus = [ctx && ctx.topic, ctx && ctx.lessonText, brief.rawRequest].join(" ").toLowerCase();
    return /\bwhy\b|\bcauses?\b|\bhow\b[^.]{0,48}\bcauses?\b/.test(focus);
  }

  function planGoalText(ctx, objective) {
    var brief = (ctx && ctx.lessonBrief) || {};
    var intent = brief.teacherIntent || {};
    return [objective, intent.learningGoal, brief.learningGoal, ctx && ctx.lessonText, brief.rawRequest, ctx && ctx.topic].join(" ").toLowerCase();
  }

  function planNeedsRelation(ctx, objective) {
    if (asksWhy(ctx)) return true;
    return /\bwhy\b|\bcauses?\b|\breasons?\b|\bsignifican|\bimportan|\bmattered\b/.test(planGoalText(ctx, objective));
  }

  function planNeedsProcess(ctx, objective) {
    var goal = planGoalText(ctx, objective);
    var brief = (ctx && ctx.lessonBrief) || {};
    if (brief.intent === "procedure" || /\bhow to\b/.test(goal)) return false;
    return /\bhow\b[^.]{0,80}\b(forms?|changes?|changed|makes?|made|happens?)\b/.test(goal);
  }

  function planNeedsSteps(ctx, objective) {
    var brief = (ctx && ctx.lessonBrief) || {};
    return brief.intent === "procedure" || /\bhow to\b/.test(planGoalText(ctx, objective));
  }

  function planSeeksDepth(ctx, objective) {
    if (planNeedsSteps(ctx, objective)) return false;
    var goal = planGoalText(ctx, objective);
    if (planNeedsRelation(ctx, objective) || planNeedsProcess(ctx, objective) || seeksContribution(ctx, objective)) return true;
    if (/\bhow\b[^.]{0,140}\b(?:adapt(?:ed|s|ing|ation|ations)?|surviv(?:e|es|ed|ing|al)|works?|working)\b/.test(goal)) return true;
    if (/\b(?:what makes|what causes|what happens when)\b/.test(goal)) return true;
    var scope = teachingScope(ctx);
    if (scope.scope !== "narrow" || scope.reason.indexOf("relationship:") !== 0) return false;
    if (/\b(?:difference between|compare|comparison)\b/.test(goal)) return false;
    return true;
  }

  function statesSteps(text) {
    var value = String(text || "");
    if (/\bplaces?\b(?!\s+value)\b/i.test(value)) return true;
    return /\b(first|then|add|adds|adding|multiply|multiplies|multiplying|divide|divides|dividing|carry|carries|read|reads|write|writes|put|puts|move|moves|count|counts|times|go|goes)\b/i.test(value);
  }

  function normalisePlan(raw, ctx) {
    ctx = ctx || {};
    var parsed = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, issues: ["The lesson plan was not valid structured data."] };
    if (parsed.lessonPlan && typeof parsed.lessonPlan === "object") parsed = parsed.lessonPlan;
    if (ctx.knowledgePack && ctx.knowledgePack.status === "blocked") {
      return { ok: false, issues: ["The knowledge pack is blocked."], previous: parsed };
    }
    if (ctx.knowledgeSelection && ctx.knowledgeSelection.status === "blocked") {
      return { ok: false, issues: ["The knowledge pack cannot be selected for this lesson."], previous: parsed };
    }
    var objective = clean(parsed.learningObjective || (Array.isArray(parsed.objectives) ? parsed.objectives[0] : parsed.objective) || "", 240);
    var relationCtx = Object.assign({}, ctx, { lessonPlan: { learningObjective: objective, topic: parsed.topic || ctx.topic } });
    var map = buildLearningMap(parsed, relationCtx, objective);
    var rawEntries = map.raw;
    var answered = map.answered;
    var entries = mapEntries(map.items);
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
    var settled = !!ctx.breadthSettled;
    var scope = teachingScope(relationCtx);
    var seekingDepth = planSeeksDepth(relationCtx, objective);
    var need = scope.scope === "broad" || map.broad || seekingDepth || planNeedsRelation(relationCtx, objective) || planNeedsProcess(relationCtx, objective) ? map.budget.floor : map.budget.narrowFloor;
    var teaching = buildTeachingPlan(map.items, relationCtx, scope, need, map.budget, map.rejected);
    var depth = teaching.substantiveDepth;
    var pairReport = map.packPairs;
    var gate = !!ctx.depthRequired && knowledge.length > 0;
    // breadthSettled records a repaired choice of breadth. It does not waive a how or why:
    // a depth-seeking goal still has to meet the depth floor and its developed strands.
    var strandShort = depth.strandsDeveloped < depth.strandsRequired;
    // breadthSettled records a repaired choice of breadth. It does not waive a how or why.
    // Meeting the strand count does not waive the depth floor. The floor is waived after
    // one repair only while the strand count itself is still the open failure.
    var shallow = gate && depth.achieved < need && !(settled && !seekingDepth && strandShort);
    var thinStrands = gate && depth.strandsDeveloped < depth.strandsRequired && (
      (scope.scope === "broad" && depth.strandsRequired >= 2) || seekingDepth
    );
    var oneEnough = answered && knowledge.length >= 1 && (!map.broad || settled);
    if (knowledge.length < 2 && !oneEnough && !shallow) issues.push("The lesson plan needs the key knowledge.");
    if (shallow) issues.push("The learning map needs more connected learning points.");
    if (thinStrands && scope.scope === "broad" && !seekingDepth && depth.strandsRequired >= 2) issues.push("The learning map needs two or more developed strands for this broad topic.");
    else if (thinStrands) issues.push("The learning map needs developed strands that explain how or why, not only a name.");
    if (seeksContribution(relationCtx, objective) && !answered && !rawEntries.some(function (item) { return statesReasonOrJob(item.text); })) {
      issues.push("The key knowledge states the outcome, not the reason.");
    }
    if (planNeedsRelation(relationCtx, objective) && !rawEntries.some(function (item) { return statesReasonOrJob(item.text); })) {
      issues.push("The key knowledge states the outcome, not the reason.");
    }
    if (planNeedsProcess(relationCtx, objective) && !rawEntries.some(function (item) { return statesRelation(item.text); })) {
      issues.push("The key knowledge names the parts, not the change.");
    }
    if (planNeedsSteps(relationCtx, objective) && !rawEntries.some(function (item) { return statesSteps(item.text); })) {
      issues.push("The key knowledge names the step, not the action.");
    }
    var purposes = arc.map(function (stage) { return stage.purpose; }).join(" ");
    if (!/teach|model|explain/.test(purposes)) issues.push("The lesson plan needs a teaching stage.");
    if (!/check|recap|apply|practice/.test(purposes)) issues.push("The lesson plan needs a check or a recap.");
    if (ctx.yearGroup && parsed.yearGroup && yearDigit(parsed.yearGroup) && yearDigit(parsed.yearGroup) !== yearDigit(ctx.yearGroup)) {
      issues.push("The plan changed the year group.");
    }
    if (ctx.knowledgePack && ctx.knowledgePack.status !== "blocked" && (ctx.knowledgePack.claims || []).length && !map.items.some(function (item) { return item.claimIds && item.claimIds.length; })) {
      issues.push("The learning map must select claim ids from the knowledge pack.");
    }
    if (pairReport && pairReport.issue) issues.push(pairReport.issue);
    var snapshot = depthSnapshot(map.items, teaching);
    if (issues.length) return { ok: false, issues: issues, previous: parsed, depth: snapshot, mapRejected: map.rejected.slice(0, MAP_READ_LIMIT), packPairs: pairReport };
    var admittedPlan = {
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
        learningMap: map.items,
        droppedKnowledge: map.rejected.filter(function (item) { return item.reason !== "repetition" && item.reason !== "paraphrase"; }).map(function (item) { return item.knowledge; }),
        mapRejected: map.rejected.slice(0, MAP_READ_LIMIT),
        depthBudget: map.budget,
        teachingPlan: teaching,
        vocabulary: textList(parsed.vocabulary, 40, 8),
        misconceptions: textList(parsed.misconceptions, 160, 4),
        teachingApproach: clean(parsed.teachingApproach, 400),
        narrativeTheme: clean(parsed.narrativeTheme, 120),
        lessonArc: contractArc(arc, knowledge)
      };
    var grounding = groundingOnPlan(ctx, map.items);
    if (grounding) admittedPlan.knowledgeGrounding = grounding;
    return { ok: true, depth: snapshot, plan: admittedPlan, packPairs: pairReport };
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
    var question = {
      prompt: prompt,
      choices: choices,
      correct: correct,
      explain: explain,
      kind: kind,
      knowledgeChecked: clean(raw.knowledgeChecked, 180),
      successEvidence: clean(raw.successEvidence, 180),
      teachingConnection: clean(raw.teachingConnection, 180)
    };
    var id = clean(raw.id, 24);
    if (id) question.id = id;
    return question;
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
    if (Array.isArray(raw.beats) && raw.beats.length) activity.beats = keepBeatPlan(raw.beats, raw.beats);
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

  function beatSkeleton(skeleton) {
    return Array.isArray(skeleton) && skeleton.some(function (slot) { return slot && slot.beats && slot.beats.length; }) ? skeleton : null;
  }

  function substanceIssues(activities, ctx) {
    if (ctx && ctx.lessonSkeleton) return participationIssues(activities, ctx.lessonSkeleton);
    if (ctx && ctx.participationSkeleton) return participationIssues(activities, ctx.participationSkeleton);
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
    var kept = {
      type: raw.type,
      target: clean(raw.target, 40) || "world",
      instruction: instruction,
      successCondition: clean(raw.successCondition, 40) || "done",
      responseEffect: cleanEffect(raw.responseEffect),
      teachingReveal: clean(raw.teachingReveal, 220)
    };
    // Patch 6: a choose step keeps its choices (text, correct, feedback), its new example and
    // its unit id. Other steps are unchanged.
    if (raw.type === "choose" && Array.isArray(raw.choices)) {
      var choices = raw.choices.filter(function (c) { return c && typeof c === "object" && clean(c.text, 160); }).slice(0, 4).map(function (c) {
        return { text: clean(c.text, 160), correct: c.correct === true, feedback: clean(c.feedback, 300) };
      });
      if (choices.length) {
        kept.choices = choices;
        if (raw.newCase && typeof raw.newCase === "object") kept.newCase = { text: clean(raw.newCase.text, 300), kind: clean(raw.newCase.kind, 20), sourceRef: (raw.newCase.sourceRef || []).slice(0, 2), quote: clean(raw.newCase.quote, 400) };
        if (raw.unitId) kept.unitId = clean(raw.unitId, 24);
        if (raw.intent) kept.intent = clean(raw.intent, 24);
      }
    }
    return kept;
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
        if (activity.beats && activity.beats.length) {
          teachStructureIssues(activity, ctx).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, "teach", issue);
          });
        } else {
          var text = ((activity.config && activity.config.lines) || []).join(" ");
          var count = text.split(/\s+/).filter(Boolean).length;
          if (count < 12) issues.push("Activity " + (index + 1) + " names the topic but does not explain it.");
        }
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
    var plannedQuestions = 0;
    activities.forEach(function (activity) {
      var count = activity && activity.config && activity.config.questions && activity.config.questions.length;
      if (activity && activity.mechanic === "quiz" && count > plannedQuestions) plannedQuestions = count;
    });
    if ((sum < band.low || sum > band.high) && !(plannedQuestions > 1 && sum > band.high)) issues.push("The activities add up to " + sum + " minutes. The lesson needs between " + band.low + " and " + band.high + ".");
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

  function structuredApply(activity) {
    if (!activity || activity.mechanic === "spin") return false;
    var instruction = applyInstructionOf(activity);
    if (clean(instruction).split(/\s+/).filter(Boolean).length < 4) return false;
    var interaction = activity.scene && activity.scene.interaction;
    if (!interaction || !clean(interaction.target)) return false;
    var success = clean(activity.successCondition);
    if (!success || /^(done|ok|okay|finished|complete|completed)$/i.test(success)) return false;
    return true;
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
        if (apply && structuredApply(apply)) return true;
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

  function semanticQualityWarning(message, ctx, slotId) {
    var text = String(message || "");
    var outcome = "";
    if (slotId === "apply" && text === "The apply slot reproduces the named taught knowledge instead of applying it.") outcome = "semantic-reproduce";
    else if (slotId === "apply" && text === "The apply slot can be completed without using the named taught knowledge.") outcome = "semantic-unrelated";
    else if (slotId === "check" && text === "The check slot leaves part of the required evidence untested.") outcome = "check-partial";
    else if (slotId === "check" && text === "The check slot does not test the required evidence.") outcome = "check-unrelated";
    if (!outcome) return null;
    var semantic = slotId === "apply" ? (ctx && ctx.applySemantic) : (ctx && ctx.checkSemantic);
    var warning = {
      slotId: slotId,
      slotType: slotId,
      outcome: outcome,
      issue: text,
      reason: clean(semantic && semantic.reason, 240) || text,
      repairAttempted: true,
      postRepair: true
    };
    if (slotId === "check" && semantic && semantic.demonstratedEvidence) warning.demonstratedEvidence = clean(semantic.demonstratedEvidence, 280);
    return warning;
  }

  // ---- Research-mode teaching rules (patch 6) -------------------------------------------
  // These run only when the lesson was built from fetched research (ctx.researchEvidence), so
  // the default path is unchanged. Each rule is a reusable code check: it reads the gate-ready
  // units, their verbatim source quotes and the pupil copy, and returns issues that the single
  // slot repair must fix. None of them writes pupil-facing lesson content.
  function researchMode(ctx) {
    var record = ctx && ctx.researchEvidence;
    return !!(record && Array.isArray(record.passages) && record.passages.length);
  }

  function ruleSentences(text) {
    return (String(text || "").match(/[^.!?]+[.!?]*/g) || []).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function ruleStem(word) {
    var w = String(word || "").toLowerCase();
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /ly$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /es$/.test(w) && !/(ses|ces|ges|zes|ves)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function ruleWordMatch(left, right) {
    var a = ruleStem(left);
    var b = ruleStem(right);
    if (!a || !b) return false;
    if (a === b) return true;
    var shorter = a.length <= b.length ? a : b;
    var longer = a.length <= b.length ? b : a;
    return shorter.length >= 4 && longer.indexOf(shorter) === 0;
  }

  function ruleTokens(text) {
    return clean(text, 2000).toLowerCase().replace(/[\u2018\u2019]/g, "'").split(/[^a-z0-9']+/).map(function (w) { return w.replace(/^'+|'+$/g, "").replace(/'s$/, ""); }).filter(Boolean);
  }

  var RULE_SKIP = { use: 1, uses: 1, used: 1, using: 1, able: 1, get: 1, got: 1, gets: 1, make: 1, made: 1, makes: 1, much: 1, without: 1, also: 1, really: 1, then: 1, there: 1, here: 1, its: 1, each: 1, some: 1, such: 1, other: 1, others: 1, than: 1, been: 1, being: 1, into: 1, onto: 1, over: 1, under: 1, only: 1, would: 1, could: 1, should: 1, might: 1, will: 1, what: 1, which: 1, who: 1, whose: 1, did: 1, does: 1, done: 1 };
  var DIRECTION_WORDS = /\b(less|more|fewer|faster|slower|further|higher|lower|wider|narrower|stronger|weaker|bigger|smaller|longer|shorter|easier|harder|heavier|lighter|warmer|cooler)\b/gi;
  var VAGUE_SUBSTITUTES = /\b(efficient|efficiently|efficiency|better|easier|easily|well|effective|effectively|properly|successfully|good|helpful)\b/gi;

  function ruleContent(text, skip) {
    var out = [];
    ruleTokens(text).forEach(function (w) {
      if (w.length < 3 || STOP[w] || FUNCTION[w] || JOB_FILLER[w] || RULE_SKIP[w]) return;
      if (DIRECTION_WORDS.test(w)) { DIRECTION_WORDS.lastIndex = 0; return; }
      DIRECTION_WORDS.lastIndex = 0;
      if ((skip || []).some(function (s) { return ruleWordMatch(s, w); })) return;
      if (!out.some(function (o) { return ruleWordMatch(o, w); })) out.push(w);
    });
    return out;
  }

  function directionsOf(text) {
    var found = [];
    String(text || "").toLowerCase().replace(DIRECTION_WORDS, function (m) { if (found.indexOf(m) === -1) found.push(m); return m; });
    return found;
  }

  // The result clause of a source explanation: what the feature let the animal or thing do,
  // in the source's own words. "This allowed them to use less energy to move than ..." gives
  // "use less energy to move".
  var RESULT_LINK = /\b(?:as a result|which means|that means|this means|because of this|so that|allowed|allows|allowing|allow|enabled|enables|enabling|enable|let|lets|letting|helped|helps|helping|meant|means|so)\b,?\s*(?:(?:them|it|him|her|us|you|they|it's|these\s+\w+|this\s+\w+|the\s+\w+)\s+)?(?:(?:were|was|are|is|could|can)\s+(?:able\s+)?)?(?:to\s+)?/i;
  function resultClause(quote) {
    var text = clean(quote, 600);
    var match = RESULT_LINK.exec(text);
    if (!match) return "";
    var rest = text.slice(match.index + match[0].length);
    var cut = rest.search(/\b(?:than|that|which|who|whose|like|because|while|whereas|although|unlike)\b|[,;:.!?]/i);
    var clause = (cut === -1 ? rest : rest.slice(0, cut)).trim();
    if (clause.split(/\s+/).length < 2) clause = rest.split(/[;:.!?]/)[0].trim();
    return clause;
  }

  function researchUnits(ctx) {
    if (!researchMode(ctx)) return [];
    var readiness = assessPackReadiness(ctx.knowledgePack, ctx.knowledgeSelection, ctx);
    var units = readyUnits(readiness);
    var claims = {};
    ((ctx.knowledgePack && ctx.knowledgePack.claims) || []).forEach(function (claim) { if (claim && claim.claimId) claims[claim.claimId] = claim; });
    var passages = researchPassages(ctx) || {};
    return units.map(function (unit) {
      var explain = claims[unit.explanationClaimId] || {};
      var feature = claims[unit.elementClaimId] || {};
      var refs = [];
      (explain.sourceRef || []).concat(feature.sourceRef || []).forEach(function (id) { if (passages[id] && refs.indexOf(id) === -1) refs.push(id); });
      var quote = clean(explain.sourceQuote || explain.quote || "", 600);
      var clause = resultClause(quote) || resultClause(explain.text || unit.explanation);
      return Object.assign({}, unit, {
        explanationQuote: quote,
        featureQuote: clean(feature.sourceQuote || feature.quote || "", 600),
        resultClause: clause,
        keyTerms: ruleContent(clause, ruleContent(unit.feature)),
        directions: directionsOf(clause),
        sourceRefs: refs,
        passageText: refs.map(function (id) { return passages[id].text; }).join(" ")
      });
    });
  }

  function mapClaimIds(plan, refs) {
    var ids = [];
    ((plan && plan.learningMap) || []).forEach(function (item) {
      if (item && (refs || []).indexOf(item.id) !== -1) (item.claimIds || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
    return ids;
  }

  function beatPupilText(beat) {
    return clean((beat && ((beat.pupil && beat.pupil.text) || beat.text)) || "", 400);
  }

  // Meaning preservation: a sentence that teaches or recaps a unit's explanation keeps the
  // source's result in the source's words. Swapping "use less energy to move" for "move more
  // efficiently" fails: the key words are gone, the direction word changed, and a vaguer word
  // took their place.
  function meaningCheck(sentence, unit) {
    var text = clean(sentence, 400);
    var words = ruleTokens(text);
    var key = unit.keyTerms || [];
    var kept = key.filter(function (term) { return words.some(function (w) { return ruleWordMatch(w, term); }); });
    var missing = key.filter(function (term) { return kept.indexOf(term) === -1; });
    var need = key.length <= 2 ? key.length : Math.ceil(key.length * 0.6);
    var lostDirection = (unit.directions || []).filter(function (d) { return words.indexOf(d) === -1; });
    var sourceWords = ruleTokens(unit.explanationQuote + " " + unit.passageText);
    var vague = [];
    String(text).toLowerCase().replace(VAGUE_SUBSTITUTES, function (m) { if (sourceWords.indexOf(m) === -1 && vague.indexOf(m) === -1) vague.push(m); return m; });
    var ok = kept.length >= need && !lostDirection.length;
    return { ok: ok, kept: kept, missing: missing, lostDirection: lostDirection, vague: vague };
  }

  function meaningIssues(activities, ctx, units) {
    var issues = [];
    var plan = (ctx && ctx.lessonPlan) || {};
    units.forEach(function (unit) {
      if (!unit.resultClause || !(unit.keyTerms || []).length) return;
      ["teach", "recap"].forEach(function (slotId) {
        var activity = (activities || []).filter(function (a) { return a.slotId === slotId; })[0];
        if (!activity) return;
        var rows = (activity.beats || []).filter(function (beat) {
          return mapClaimIds(plan, beat.knowledgeRefs).indexOf(unit.explanationClaimId) !== -1 && beatPupilText(beat);
        });
        if (!rows.length) return;
        var results = rows.map(function (beat) { return { beat: beat, check: meaningCheck(beatPupilText(beat), unit) }; });
        // The teach slot needs one sentence that keeps the meaning; no recap sentence may lose it.
        var failing = slotId === "teach"
          ? (results.some(function (r) { return r.check.ok; }) ? [] : results.slice(0, 1))
          : results.filter(function (r) { return !r.check.ok && (r.check.vague.length || r.check.lostDirection.length); });
        failing.forEach(function (r) {
          var bits = [];
          if (r.check.missing.length) bits.push("it drops the source words " + r.check.missing.map(function (w) { return "\"" + w + "\""; }).join(", "));
          if (r.check.lostDirection.length) bits.push("it loses \"" + r.check.lostDirection.join("\", \"") + "\"");
          if (r.check.vague.length) bits.push("it uses the vaguer \"" + r.check.vague.join("\", \"") + "\" instead");
          issues.push({ slotId: slotId, text: "The " + slotId + " slot changes what the source says about " + clean(unit.feature, 60) + " (" + unit.unitId + ", beat " + r.beat.id + "): the source says \"" + clean(unit.resultClause, 120) + "\", but " + bits.join("; ") + ". Keep the source's meaning and its key words." });
        });
      });
    });
    return issues;
  }

  // Year-band vocabulary. A long or many-syllable word in Year 1 to 4 pupil copy must be a
  // year-band curriculum word or be explained in the same sentence.
  var BAND_WORDS = { environment: 1, environments: 1, adaptation: 1, adaptations: 1, temperature: 1, electricity: 1, evaporation: 1, condensation: 1, vertebrate: 1, vertebrates: 1, invertebrate: 1, invertebrates: 1, skeletons: 1, nutrition: 1, everything: 1, something: 1, sometimes: 1, information: 1, underground: 1, understand: 1, themselves: 1, investigate: 1, investigation: 1, comparison: 1, classification: 1, characteristics: 1, photosynthesis: 1, transparent: 1, magnetic: 1, different: 1, difference: 1, differences: 1, important: 1, discovered: 1, scientists: 1, everywhere: 1, grandparents: 1, carnivores: 1, herbivores: 1, omnivores: 1 };
  function syllables(word) {
    var w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    var groups = w.match(/[aeiouy]{1,2}/g);
    return groups ? groups.length : 1;
  }
  function glossedIn(sentence, word) {
    var s = String(sentence || "");
    var at = s.toLowerCase().indexOf(word.toLowerCase());
    if (at === -1) return false;
    var after = s.slice(at + word.length, at + word.length + 80);
    var before = s.slice(Math.max(0, at - 60), at);
    if (/^\s*(?:\(|,\s*(?:which|that)\s+(?:means|is)|,\s*(?:a|an|the)\s+\w+|\s*[-\u2013\u2014]\s*|\s+(?:means|is a|is an|is the|are a|are the|which means|that means|or\b))/i.test(after)) return true;
    if (/(?:called|named|known as|means|word)\s+["\u201c]?$/i.test(before)) return true;
    return false;
  }
  function hardWords(text, year) {
    var digit = Number(yearDigit(year));
    if (!digit || digit > 4) return [];
    var limit = digit <= 2 ? 9 : 11;
    var syl = digit <= 2 ? 4 : 5;
    var out = [];
    ruleSentences(text).forEach(function (sentence) {
      (sentence.match(/[A-Za-z][A-Za-z'-]*/g) || []).forEach(function (raw) {
        var word = raw.replace(/'s$/i, "");
        var lower = word.toLowerCase();
        if (BAND_WORDS[lower] || /-/.test(word)) return;
        var long = word.length >= limit || syllables(word) >= syl;
        if (!long) return;
        if (glossedIn(sentence, word)) return;
        if (out.indexOf(word) === -1) out.push(word);
      });
    });
    return out;
  }

  function pupilTextsOf(activity) {
    var rows = [];
    (activity.beats || []).forEach(function (beat) { var t = beatPupilText(beat); if (t) rows.push(t); if (beat.pupil && beat.pupil.cue) rows.push(clean(beat.pupil.cue, 200)); });
    var config = activity.config || {};
    if (!(activity.beats || []).length) (config.lines || []).forEach(function (line) { rows.push(clean(line, 280)); });
    (config.questions || []).forEach(function (q) {
      rows.push(clean(q.prompt, 240), clean(q.explain, 240));
      (q.choices || []).forEach(function (c) { rows.push(clean(typeof c === "string" ? c : (c && c.text), 120)); });
    });
    if (activity.slotId === "apply") {
      rows.push(clean(activity.applyInstruction, 240));
      var inter = activity.scene && activity.scene.interaction;
      if (inter && Array.isArray(inter.choices)) inter.choices.forEach(function (c) { rows.push(clean(c.text, 160), clean(c.feedback, 240)); });
      if (inter && inter.newCase) rows.push(clean(inter.newCase.text, 300));
    }
    return rows.filter(Boolean);
  }

  function vocabularyIssues(activities, ctx) {
    var year = (ctx && ctx.yearGroup) || "";
    var issues = [];
    (activities || []).forEach(function (activity) {
      var found = [];
      pupilTextsOf(activity).forEach(function (text) { hardWords(text, year).forEach(function (w) { if (found.indexOf(w) === -1) found.push(w); }); });
      if (found.length) issues.push({ slotId: activity.slotId, text: "The " + activity.slotId + " slot uses words above " + (year || "this year group") + " reading level: " + found.slice(0, 6).map(function (w) { return "\"" + w + "\""; }).join(", ") + ". Use an everyday word, or explain the word in the same sentence." });
    });
    return issues;
  }

  // Teleology: features did a job; animals did not grow them in order to do it.
  var TELEOLOGY = [
    /\bwhy\s+(?:did|do|does|would)\b[^?.!]{0,80}\b(?:have|has|had|develop|developed|grow|grew|evolve|evolved|get|got|need|needed)\b/i,
    /\b(?:developed|evolved|grew|got|gained)\b[^.?!]{0,60}\b(?:in order to|so that|so they could|so it could|to help them|to be able to)\b/i,
    /\b(?:had|have|has)\b[^.?!]{0,60}\b(?:in order to|so that they could|so that it could)\b/i
  ];
  function teleological(text) {
    return TELEOLOGY.some(function (re) { return re.test(String(text || "")); });
  }

  function teleologyIssues(activities) {
    var issues = [];
    (activities || []).forEach(function (activity) {
      var bad = pupilTextsOf(activity).filter(teleological);
      var config = activity.config || {};
      (config.questions || []).forEach(function (q, index) {
        if (/^\s*why\b/i.test(q.prompt || "") && (q.choices || []).some(function (c) { return /^\s*to\s+[a-z]+/i.test(typeof c === "string" ? c : (c && c.text) || ""); })) {
          bad.push("Question " + (index + 1) + " answers a why question with a purpose (\"To ...\")");
        }
      });
      if (bad.length) issues.push({ slotId: activity.slotId, text: "The " + activity.slotId + " slot uses goal-directed wording (\"" + clean(bad[0], 90) + "\"). Say what the feature did or how it worked, for example ask what it let the animal do, not why the animal had it." });
    });
    return issues;
  }

  function choiceText(choice) {
    return clean(typeof choice === "string" ? choice : (choice && choice.text) || "", 160);
  }

  // Question checks: the correct answer must be traceable to a taught sentence, and a wrong
  // choice must not be true or partly true according to the sources.
  function questionIssues(activities, ctx, units) {
    var issues = [];
    var check = (activities || []).filter(function (a) { return a.slotId === "check"; })[0];
    var teach = (activities || []).filter(function (a) { return a.slotId === "teach"; })[0];
    if (!check || !teach) return issues;
    var taught = (teach.beats || []).map(beatPupilText).join(" ");
    var taughtWords = ruleTokens(taught);
    var passages = researchPassages(ctx) || {};
    var sentences = [];
    Object.keys(passages).forEach(function (id) {
      if (!passageIsEvidence(passages[id])) return;
      ruleSentences(passages[id].text).forEach(function (s) { sentences.push({ id: id, text: s, words: ruleTokens(s) }); });
    });
    var topicWords = ruleContent((ctx && ctx.topic) || "");
    (checkQuestionsOf(check) || []).forEach(function (q, index) {
      var label = "Question " + (index + 1);
      var answer = clean(q.correct, 160);
      var answerWords = ruleContent(answer, topicWords);
      var missing = answerWords.filter(function (w) { return !taughtWords.some(function (t) { return ruleWordMatch(t, w); }); });
      var need = answerWords.length <= 2 ? answerWords.length : Math.ceil(answerWords.length * 0.6);
      if (answerWords.length && answerWords.length - missing.length < need) {
        issues.push({ slotId: "check", text: "The check slot " + label + " has a correct answer (\"" + answer + "\") whose words were not taught: " + missing.map(function (w) { return "\"" + w + "\""; }).join(", ") + ". The answer must match a sentence the teach slot says, in its words." });
      }
      var jobWords = ruleContent([q.prompt, answer].join(" "), topicWords.concat(["feature", "features", "part", "body", "animal", "animals", "help", "helped", "better", "most", "best", "true", "correct"]));
      (q.choices || []).forEach(function (choice) {
        var text = choiceText(choice);
        if (!text || text.toLowerCase() === answer.toLowerCase()) return;
        var bits = ruleContent(text, topicWords).concat(directionsOf(text));
        if (!bits.length || bits.length > 4) return;
        var hit = sentences.filter(function (s) {
          var all = bits.every(function (b) { return s.words.some(function (w) { return ruleWordMatch(w, b); }); });
          if (!all) return false;
          return jobWords.some(function (j) { return bits.every(function (b) { return !ruleWordMatch(b, j); }) && s.words.some(function (w) { return ruleWordMatch(w, j); }); });
        })[0];
        if (hit) issues.push({ slotId: "check", text: "The check slot " + label + " has a wrong choice (\"" + text + "\") that the sources support as at least partly true (" + hit.id + ": \"" + clean(hit.text, 140) + "\"). Use a wrong choice the sources do not support." });
      });
    });
    return issues;
  }

  // APPLY: a meaningful choice on a new example, with feedback that depends on the answer and
  // an observable success condition (the right choice is picked). No silent tap-to-reveal.
  var HYPOTHETICAL = /\b(imagine|suppose|pretend|picture|what if|if a|if an|if the|if you|made-up|invented|new animal|another animal|a model)\b/i;
  function applyChoiceIssues(activity, ctx, units) {
    var issues = [];
    var inter = activity && activity.scene && activity.scene.interaction;
    function add(text) { issues.push({ slotId: "apply", text: "The apply slot " + text }); }
    if (!inter || inter.type !== "choose" || !Array.isArray(inter.choices)) {
      add("needs a choose task: instruction, a new example (newCase), and two or three choices, each with feedback that says why it is right or wrong.");
      return issues;
    }
    var choices = inter.choices;
    if (choices.length < 2 || choices.length > 3) add("needs two or three choices.");
    var right = choices.filter(function (c) { return c.correct === true; });
    if (right.length !== 1) add("needs exactly one correct choice.");
    var seen = {};
    choices.forEach(function (c) {
      var key = clean(c.text, 160).toLowerCase();
      if (!key) add("has an empty choice.");
      else if (seen[key]) add("repeats a choice.");
      seen[key] = 1;
      if (clean(c.feedback, 300).split(/\s+/).filter(Boolean).length < 6) add("needs feedback of at least six words for the choice \"" + clean(c.text, 60) + "\" saying why it is right or wrong.");
    });
    if (right.length === 1 && choices.length >= 2) {
      var wrongFeedback = choices.filter(function (c) { return c.correct !== true; }).map(function (c) { return clean(c.feedback, 300).toLowerCase(); });
      if (wrongFeedback.some(function (f) { return f === clean(right[0].feedback, 300).toLowerCase(); })) add("gives the same feedback to a right and a wrong choice.");
    }
    var unit = null;
    units.forEach(function (u) { if (u.unitId === inter.unitId) unit = u; });
    if (!unit) add("is not linked to a taught unit (the apply beat must cite a gate-ready unit's explanation).");
    if (unit && right.length === 1) {
      var why = clean(right[0].feedback, 300) + " " + clean(right[0].text, 160);
      var terms = (unit.keyTerms || []).concat(ruleContent(unit.feature));
      var hits = terms.filter(function (t) { return ruleTokens(why).some(function (w) { return ruleWordMatch(w, t); }); });
      var resultHits = (unit.keyTerms || []).filter(function (t) { return ruleTokens(right[0].feedback).some(function (w) { return ruleWordMatch(w, t); }); });
      if (hits.length < Math.min(2, terms.length) || resultHits.length < Math.min(1, (unit.keyTerms || []).length)) add("correct-choice feedback must use the taught explanation for " + clean(unit.feature, 60) + " (" + clean(unit.resultClause, 80) + ").");
    }
    var newCase = inter.newCase || {};
    var caseText = clean(newCase.text, 300);
    if (caseText.split(/\s+/).filter(Boolean).length < 6) add("needs a new example (newCase.text) of at least six words.");
    else {
      var teach = ((ctx && ctx.__activities) || []).filter(function (a) { return a.slotId === "teach"; })[0];
      var taughtLines = ((teach && teach.beats) || []).map(beatPupilText);
      var caseWords = ruleContent(caseText);
      var copied = taughtLines.some(function (line) {
        var lw = ruleContent(line);
        var overlap = caseWords.filter(function (w) { return lw.some(function (l) { return ruleWordMatch(l, w); }); }).length;
        return caseWords.length && overlap / caseWords.length >= 0.8;
      });
      if (copied) add("new example repeats a taught sentence. Use a new case the teaching did not already answer.");
      if (newCase.kind === "sourced") {
        var passages = researchPassages(ctx) || {};
        var ref = (newCase.sourceRef || [])[0] || newCase.sourceRef;
        var passage = passages[ref];
        if (!passage || !passageIsEvidence(passage) || !quoteInPassage(newCase.quote || "", passage.text).ok) add("new example is marked sourced, but its quote is not found in an evidence passage. Copy the quote exactly, or make it a hypothetical transfer.");
      } else if (newCase.kind === "transfer") {
        if (!HYPOTHETICAL.test(caseText)) add("new example is a reasoning transfer, so it must be framed as made up (for example start with Imagine).");
      } else add("new example must be kind sourced (with a verified quote) or transfer (a made-up case using the taught reason).");
    }
    var instruction = clean(activity.applyInstruction || inter.instruction, 240);
    if (!/\b(choose|which|pick|decide|select)\b/i.test(instruction)) add("instruction must ask the class to choose.");
    return issues;
  }

  // Timing: research lessons total exactly the requested minutes. Extra minutes come off the
  // framing stages first (recap, resolution, investigate, hook), then check, apply, teach.
  function normaliseMinutes(activities, target) {
    var total = function () { return activities.reduce(function (sum, a) { return sum + (Number(a.minutes) || 0); }, 0); };
    target = Number(target) || 0;
    if (!target || !activities.length || target < activities.length) return activities;
    var takeOrder = ["recap", "resolution", "investigate", "hook", "check", "apply", "teach"];
    var giveOrder = ["teach", "apply", "check", "investigate", "hook", "resolution", "recap"];
    function floorOf(a) {
      if (a.slotId === "check" && a.config && Array.isArray(a.config.questions)) return Math.max(1, Math.ceil(a.config.questions.length / 2));
      return 1;
    }
    function bySlot(id) { return activities.filter(function (a) { return a.slotId === id; })[0]; }
    activities.forEach(function (a) { a.minutes = Math.max(1, Math.round(Number(a.minutes) || 1)); });
    var guard = 0;
    while (total() > target && guard++ < 200) {
      var moved = false;
      takeOrder.concat(activities.map(function (a) { return a.slotId; })).some(function (id) {
        var a = bySlot(id);
        if (a && a.minutes > floorOf(a)) { a.minutes -= 1; moved = true; return true; }
        return false;
      });
      if (!moved) break;
    }
    guard = 0;
    while (total() < target && guard++ < 200) {
      var a = null;
      giveOrder.some(function (id) { a = bySlot(id); return !!a; });
      (a || activities[0]).minutes += 1;
    }
    return activities;
  }

  // Objective: measurable and tied to the units. A plan objective such as "Pupils will
  // understand how ..." names no observable outcome, so it is rebuilt from the unit features.
  function objectiveIssues(objective, units) {
    var text = clean(objective, 300);
    var problems = [];
    if (!/\b(explain|describe|identify|name|compare|choose|predict|sort|label|say|use|give)\b/i.test(text) || /\b(understand|know about|learn about|appreciate|be aware)\b/i.test(text)) problems.push("not measurable");
    units.forEach(function (unit) {
      var feature = ruleContent(unit.feature);
      if (feature.length && !feature.some(function (w) { return ruleTokens(text).some(function (t) { return ruleWordMatch(t, w); }); })) problems.push("does not name " + unit.feature);
    });
    return problems;
  }
  function unitObjectives(units) {
    var features = units.map(function (u) { return clean(u.feature, 60); }).filter(Boolean);
    if (!features.length) return [];
    return [
      "Pupils can explain what each of these features did, using the reason the source gives: " + features.join("; ") + ".",
      "Pupils can use one of these reasons to choose the right answer for a new example."
    ];
  }

  function researchRuleIssues(activities, ctx) {
    if (!researchMode(ctx)) return [];
    var units = researchUnits(ctx);
    var rows = [];
    rows = rows.concat(meaningIssues(activities, ctx, units));
    rows = rows.concat(vocabularyIssues(activities, ctx));
    rows = rows.concat(teleologyIssues(activities));
    rows = rows.concat(questionIssues(activities, ctx, units));
    var apply = (activities || []).filter(function (a) { return a.slotId === "apply"; })[0];
    if (apply) rows = rows.concat(applyChoiceIssues(apply, Object.assign({}, ctx, { __activities: activities }), units));
    return rows;
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
    if (ctx.lessonSkeleton && researchMode(ctx)) activities = normaliseMinutes(activities, ctx.requestedMinutes || 15);
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
    var carriedSkeleton = ctx.lessonSkeleton ? null : beatSkeleton(parsed.lessonSkeleton);
    var issueCtx = Object.assign({}, ctx, {
      lessonPlan: ctx.lessonPlan || parsed.lessonPlan || null,
      storyPlan: storyPlan,
      participationSkeleton: carriedSkeleton
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
    var qualityWarnings = [];
    var pupilDiagnostics = [];
    var issues = educationalIssues(activities, issueCtx, owners);
    if (ctx.lessonSkeleton && ctx.lessonSkeleton.some(function (slot) { return slot.beats && slot.beats.length; })) {
      var beatYearGroup = ctx.yearGroup || (ctx.lessonPlan && ctx.lessonPlan.yearGroup) || "";
      var beatItems = beatKnowledge(ctx.lessonPlan || {}, beatYearGroup);
      beatProblems(ctx.lessonSkeleton).forEach(function (issue) {
        issues.push(issue);
        var named = String(issue).match(/^The ([a-z]+):\d+/) || String(issue).match(/^The (recap) misses/);
        ownIssue(owners, named ? named[1] : "", issue);
      });
      ctx.lessonSkeleton.forEach(function (slot) {
        var activity = null;
        activities.forEach(function (item) { if (item.slotId === slot.id) activity = item; });
        var beatRows = (activity && activity.beats) || slot.beats;
        pupilDiagnostics = pupilDiagnostics.concat(pupilBeatDiagnostics(slot, beatRows, beatItems, beatYearGroup));
        pupilBeatProblems(slot, beatRows, beatItems, beatYearGroup).forEach(function (issue) {
          issues.push(issue);
          ownIssue(owners, slot.id, issue);
        });
        if (slot.id === "check") {
          retrieveSubstanceIssues(activity, slot, beatItems).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, slot.id, issue);
          });
        }
      });
    }
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
          untaughtKnowledgeIssues(activity, issueCtx).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, activity.slotId, issue);
          });
          applySlotIssues(activity, applySlot, issueCtx).forEach(function (issue) {
            var warning = ctx.semanticWarningsAllowed && semanticQualityWarning(issue, issueCtx, "apply");
            if (warning) qualityWarnings.push(warning);
            else {
              issues.push(issue);
              ownIssue(owners, activity.slotId, issue);
            }
          });
        }
        if (activity.slotId === "resolution" || activity.slotId === "recap") {
          untaughtKnowledgeIssues(activity, issueCtx).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, activity.slotId, issue);
          });
        }
        if (activity.slotId === "check") {
          untaughtKnowledgeIssues(activity, issueCtx).forEach(function (issue) {
            issues.push(issue);
            ownIssue(owners, activity.slotId, issue);
          });
          var semantics = (issueCtx.checkSemantics && issueCtx.checkSemantics.length)
            ? issueCtx.checkSemantics
            : (issueCtx.checkSemantic ? [issueCtx.checkSemantic] : []);
          checkQuestionsOf(activity).forEach(function (question, index) {
            var oneCtx = Object.assign({}, issueCtx, { checkSemantic: semantics[index] || null });
            checkSlotIssues(questionActivity(activity, question), oneCtx).forEach(function (issue) {
              var warning = ctx.semanticWarningsAllowed && semanticQualityWarning(issue, oneCtx, "check");
              if (warning) qualityWarnings.push(warning);
              else {
                issues.push(issue);
                ownIssue(owners, activity.slotId, issue);
              }
            });
          });
        }
      });
    }
    if (ctx.lessonSkeleton && researchMode(ctx)) {
      researchRuleIssues(activities, issueCtx).forEach(function (row) {
        if (ctx.semanticWarningsAllowed) {
          qualityWarnings.push({ slotId: row.slotId, slotType: row.slotId, outcome: "research-rule", issue: row.text, reason: row.text, repairAttempted: true, postRepair: true });
        } else {
          issues.push(row.text);
          ownIssue(owners, row.slotId, row.text);
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
      return { ok: false, structuralOk: !structure.length, slotIds: slotIdsFrom(reported, activities), slotIssues: reported.slotIssues, issues: reported, previous: parsed, applyAlignment: applyReport, checkAlignment: checkReport, qualityWarnings: qualityWarnings, pupilBeatDiagnostics: pupilDiagnostics };
    }
    var objectiveSource = parsed.objectives || parsed.learningObjectives || parsed.learningObjective || parsed.objective || ctx.learningObjectives || [];
    if (!Array.isArray(objectiveSource)) objectiveSource = [objectiveSource];
    var objectives = objectiveSource.map(function (item) { return clean(item, 240); }).filter(Boolean).slice(0, 6);
    var plannedObjective = clean((ctx.lessonPlan && ctx.lessonPlan.learningObjective) || "", 240);
    if (!objectives.length && plannedObjective) objectives = [plannedObjective];
    if (!objectives.length) return { ok: false, issues: ["The lesson needs a learning objective."], previous: parsed, applyAlignment: applyReport };
    var objectiveRule = null;
    if (ctx.lessonSkeleton && researchMode(ctx)) {
      var ruleUnits = researchUnits(ctx);
      var objectiveProblems = objectiveIssues(objectives[0], ruleUnits);
      if (objectiveProblems.length && ruleUnits.length) {
        objectiveRule = { replaced: objectives.slice(), reasons: objectiveProblems, rule: "measurable objective naming every gate-ready unit" };
        objectives = unitObjectives(ruleUnits);
      } else objectiveRule = { replaced: [], reasons: [], rule: "measurable objective naming every gate-ready unit" };
    }
    var title = withoutRequest(clean(parsed.title, 80), request, requestReplacement(request, ctx.topic || ""));
    var rawRequest = request;
    if (rawRequest.length >= 12 && title.toLowerCase().indexOf(rawRequest) !== -1) {
      return { ok: false, issues: ["The title repeated the teacher's request."], previous: parsed, applyAlignment: applyReport };
    }
    var sum = activities.reduce(function (total, activity) { return total + activity.minutes; }, 0);
    var lessonPlan = ctx.lessonPlan || parsed.lessonPlan || null;
    var keptStory = ctx.storyPlan || parsed.storyPlan || null;
    var adventure = {
      subject: clean(parsed.subject || ctx.subject, 80),
      topic: clean(parsed.topic || ctx.topic, 120),
      yearGroup: ctx.yearGroup || "",
      yearAssumed: !!ctx.yearAssumed,
      yearAssumption: ctx.yearAssumed ? (ctx.yearAssumption || AGE_FALLBACK) : "",
      title: title || ((ctx.topic || "Learning") + " Adventure"),
      objectives: objectives,
      vocabulary: (parsed.vocabulary || []).map(function (item) { return clean(item, 40); }).filter(Boolean).slice(0, 12),
      lessonPlan: lessonPlan,
      lessonSkeleton: ctx.lessonSkeleton || carriedSkeleton || null,
      storyPlan: keptStory,
      activities: activities,
      targetMinutes: Number(ctx.requestedMinutes) || sum,
      estimateMinutes: sum
    };
    if (qualityWarnings.length) adventure.qualityWarnings = qualityWarnings.slice();
    if (objectiveRule) adventure.objectiveRule = objectiveRule;
    return {
      ok: true,
      adventure: adventure,
      applyAlignment: applyReport,
      checkAlignment: checkReport,
      qualityWarnings: qualityWarnings.slice()
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
      demonstratedEvidence: last ? (last.demonstratedEvidence || "") : "",
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
      return { ok: false, coverage: null, outcome: "check-error", reason: clean(value && value.reason, 80), demonstratedEvidence: "", ms: ms };
    }
    var decision = checkEvidenceDecision(value.coverage);
    if (!decision.ok) return { ok: false, coverage: null, outcome: "check-error", reason: clean(value.reason, 80), demonstratedEvidence: "", ms: ms };
    return {
      ok: true,
      coverage: decision.coverage,
      outcome: decision.outcome,
      reason: clean(value.reason, 240),
      demonstratedEvidence: clean(value.demonstratedEvidence, 280),
      ms: ms
    };
  }

  function noteCheckJudgeFailure(result, verdict) {
    var reason = clean((verdict && verdict.reason) || "error", 40) || "error";
    var issue = "The check slot semantic check failed: " + reason + ".";
    var source = (result && result.issues) || [];
    var issues = source.filter(function (item) { return item !== "The check slot needs evidence alignment."; });
    if (issues.indexOf(issue) === -1) issues.push(issue);
    if (source.slotIssues) {
      issues.slotIssues = {};
      Object.keys(source.slotIssues).forEach(function (id) {
        issues.slotIssues[id] = (source.slotIssues[id] || []).map(function (item) {
          return item === "The check slot needs evidence alignment." ? issue : item;
        });
      });
    }
    return Object.assign({}, result || {}, { ok: false, issues: issues });
  }

  function resolveLessonContent(raw, ctx, ports) {
    ports = ports || {};
    var calls = [];
    var checkCalls = [];
    var repairedSlots = [];
    var heldApply = null;
    var warnAfterRepair = false;
    function policyCtx(extra) {
      var next = Object.assign({}, ctx, extra || {});
      if (warnAfterRepair) next.semanticWarningsAllowed = true;
      return next;
    }
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
        qualityWarnings: (result.qualityWarnings || (result.adventure && result.adventure.qualityWarnings) || []).slice(),
        pupilBeatDiagnostics: (result.pupilBeatDiagnostics || []).slice(),
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
        var next = accept(source, policyCtx({ applySemantic: heldApply }));
        return { stop: false, result: next };
      }).catch(function () {
        calls.push({ relationship: null, outcome: "semantic-error", reason: "error", ms: null });
        return { stop: true, result: result };
      });
    }
    function judgedCheck(source, result) {
      if (checkJudgePlan(result) !== "judge") return Promise.resolve(null);
      var activity = null;
      (((result.previous && result.previous.activities) || (result.adventure && result.adventure.activities) || [])).forEach(function (item) {
        if (item && item.slotId === "check") activity = item;
      });
      var questions = checkQuestionsOf(activity);
      var count = Math.max(questions.length, 1);
      function step(index, verdicts) {
        if (index >= count) {
          var nextCtx = policyCtx({ checkSemantics: verdicts, checkSemantic: verdicts[0] || null });
          if (heldApply) nextCtx.applySemantic = heldApply;
          return { stop: false, result: accept(source, nextCtx) };
        }
        return Promise.resolve().then(function () {
          if (!ports.checkJudge) return { ok: false, reason: "error", ms: null };
          return ports.checkJudge(checkEvidenceInput(activity, ctx, index));
        }).then(function (value) {
          var verdict = checkVerdictOf(value);
          checkCalls.push({
            relationship: verdict.coverage,
            outcome: verdict.outcome,
            reason: verdict.reason,
            demonstratedEvidence: verdict.demonstratedEvidence,
            ms: verdict.ms
          });
          if (!verdict.ok) return { stop: true, result: noteCheckJudgeFailure(result, verdict) };
          verdicts.push({ coverage: verdict.coverage, reason: verdict.reason, demonstratedEvidence: verdict.demonstratedEvidence });
          return step(index + 1, verdicts);
        }).catch(function () {
          checkCalls.push({ relationship: null, outcome: "check-error", reason: "error", ms: null });
          return { stop: true, result: noteCheckJudgeFailure(result, { reason: "error" }) };
        });
      }
      return step(0, []);
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
          warnAfterRepair = true;
          var repaired = accept(merged, policyCtx());
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
    if (ctx && ctx.knowledgePack && ctx.knowledgePack.status !== "blocked" && (ctx.knowledgePack.claims || []).length) {
      var readiness = assessPackReadiness(ctx.knowledgePack, ctx.knowledgeSelection, ctx);
      if (readiness.status !== "ready") {
        return Promise.resolve({
          ok: false,
          category: "invalid",
          stage: "PACK_INCOMPLETE",
          issues: readiness.issues || [],
          packReadiness: readiness,
          repairUsed: false,
          fallbackUsed: false,
          durationMs: Date.now() - started
        });
      }
    }
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
      var skeleton = planBeats(
        lessonSkeleton(framed.plan, Object.assign({}, ctx, { lessonPlan: framed.plan })),
        framed.plan,
        ctx.yearGroup || framed.plan.yearGroup || (ctx.yearAssumed ? ctx.yearAssumption : "")
      );
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
        var intent = body.meta && body.meta.teacherIntent;
        if (ctx && intent && typeof intent === "object" && !Array.isArray(intent)) {
          ctx.lessonBrief = ctx.lessonBrief || {};
          ctx.lessonBrief.teacherIntent = intent;
        }
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
          fallbackUsed: false,
          qualityWarnings: Array.isArray(meta.qualityWarnings) ? meta.qualityWarnings : []
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
    planBeats: planBeats,
    beatKnowledge: beatKnowledge,
    depthBudget: depthBudget,
    buildLearningMap: buildLearningMap,
    taughtLedger: taughtLedger,
    teachingTrace: teachingTrace,
    learningMapReport: learningMapReport,
    teachingScope: teachingScope,
    teachingPlanReport: teachingPlanReport,
    assessmentCandidates: assessmentCandidates,
    recapTakeaways: recapTakeaways,
    planScenes: planScenes,
    sceneReport: sceneReport,
    keepBeatPlan: keepBeatPlan,
    boundedBeatLog: boundedBeatLog,
    beatProblems: beatProblems,
    pupilBeatProblems: pupilBeatProblems,
    pupilBeatDiagnostics: pupilBeatDiagnostics,
    mergeSlotContent: mergeSlotContent,
    contractArc: contractArc,
    qualityChecklist: qualityChecklist,
    accept: accept,
    applySemanticBrief: applySemanticBrief,
    applySemanticDecision: applySemanticDecision,
    parseApplySemantic: parseApplySemantic,
    applyJudgePlan: applyJudgePlan,
    applySemanticInput: applySemanticInput,
    checkEvidenceBrief: checkEvidenceBrief,
    checkCoverageBrief: checkCoverageBrief,
    checkEvidenceDecision: checkEvidenceDecision,
    parseCheckEvidence: parseCheckEvidence,
    parseCheckCoverage: parseCheckCoverage,
    checkJudgePlan: checkJudgePlan,
    checkEvidenceInput: checkEvidenceInput,
    teacherIntentBrief: teacherIntentBrief,
    intentFraming: intentFraming,
    normaliseTeacherIntent: normaliseTeacherIntent,
    applyTeacherIntent: applyTeacherIntent,
    knowledgePackBrief: knowledgePackBrief,
    normaliseKnowledgePack: normaliseKnowledgePack,
    selectPackForLesson: selectPackForLesson,
    assessPackReadiness: assessPackReadiness,
    statesEnabledJob: statesEnabledJob,
    unitLineage: unitLineage,
    researchMode: researchMode,
    researchUnits: researchUnits,
    resultClause: resultClause,
    meaningCheck: meaningCheck,
    meaningIssues: meaningIssues,
    hardWords: hardWords,
    vocabularyIssues: vocabularyIssues,
    teleological: teleological,
    teleologyIssues: teleologyIssues,
    questionIssues: questionIssues,
    applyChoiceIssues: applyChoiceIssues,
    normaliseMinutes: normaliseMinutes,
    objectiveIssues: objectiveIssues,
    unitObjectives: unitObjectives,
    researchRuleIssues: researchRuleIssues,
    researchContentRules: researchContentRules,
    passageIsEvidence: passageIsEvidence,
    cleanInteraction: cleanInteraction,
    slotContent: slotContent,
    readyUnits: readyUnits,
    statesUnitJob: statesUnitJob,
    lineageAnswers: lineageAnswers,
    statesSoCould: statesSoCould,
    knowledgePackLog: knowledgePackLog,
    quoteInPassage: quoteInPassage,
    sourceEntailmentBrief: sourceEntailmentBrief,
    parseSourceEntailment: parseSourceEntailment,
    applySourceEntailment: applySourceEntailment,
    sourceRepairBrief: sourceRepairBrief,
    sourceRepairFeedback: sourceRepairFeedback,
    claimStatesLink: claimStatesLink,
    quoteStatesLink: quoteStatesLink,
    SOURCE_SUPPORT_LABEL: SOURCE_SUPPORT_LABEL,
    knowledgeTrace: knowledgeTrace,
    conceptCoverageIssues: conceptCoverageIssues,
    resolveLessonContent: resolveLessonContent,
    runPipeline: runPipeline,
    request: request
  };
});
