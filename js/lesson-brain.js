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

  function words(value) {
    return clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(function (word) {
      return word.length > 3 && !STOP[word];
    });
  }

  function contextFrom(draft, extra) {
    extra = extra || {};
    draft = draft || {};
    var source = (draft.source && draft.source.text) || "";
    var year = draft.year || draft.classYear || "";
    var target = draft.targetMinutes || 15;
    return {
      lessonText: clean(source, 8000),
      classId: draft.classId || "",
      organisationId: extra.organisationId || "",
      yearGroup: year,
      ageRange: ageRange(year),
      subject: clean(draft.subject, 80),
      topic: clean(draft.topic, 120),
      requestedMinutes: target,
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

  function modelBrief(ctx) {
    var safe = forModel(ctx || {});
    var system = [
      "You are Wondii's lesson brain for one primary class.",
      "Return one JSON object and nothing else. Do not return HTML, CSS, JavaScript, markdown, or a worksheet.",
      "Plan the lesson first, then write complete activities that use only these mechanics: story, quiz, word_search, spin, mystery, doors.",
      "A sensible lesson moves from a hook or explanation, to a check, to practice, and to a final check. Do not force every stage. Do not add a spin, a word search, or a quiz unless it has a classroom purpose.",
      "Every activity needs real content. Forbidden text includes: Question not written yet, This quiz needs a question, Question goes here, Add question, TBC, TODO, Example question, Insert answer.",
      "Quiz questions need a prompt, 2 to 4 plausible choices, the correct choice copied exactly, a one-sentence explanation, and the concept being checked. Distractors must be believable for the year group.",
      "A quiz that lasts 4 or 5 minutes needs several questions that are not copies of each other. Order them from recall toward application when that helps.",
      "A story must explain the idea in language for this year. One sentence that only names the topic is not enough.",
      "Word search words must be vocabulary from this lesson, letters A to Z only, 3 to 12 words, each 3 to 14 letters.",
      "Use spin only to choose a pupil for a following activity whose participation is selected_pupil. That following activity must contain the pupil's real task.",
      "The year group is authoritative. Do not write the lesson for a different year.",
      "Teacher instructions and any uploaded material outrank your own assumptions. Questions should be answerable from that material when it was provided.",
      "Set each activity minutes to an integer. The sum must fall inside durationBand. Do not invent a separate total.",
      "Optional visualContext may be { useful, concept, suggestedScene, importantObjects, interactionIdea }. Do not describe image files or code.",
      "JSON shape: { subject, topic, yearGroup, title, objectives, vocabulary, activities: [{ mechanic, title, purpose, minutes, why, visualContext, config }] }.",
      "Quiz config: { kind, prompt, choices, correct, explain, points, participation, questions: [{ prompt, choices, correct, explain, kind }] }.",
      "Story, mystery, and doors config: { lines: [string] }. Word search config: { words, instruction, points, participation }. Spin config: { pool: \"included\", avoidRepeat: true, preferFresh: true }."
    ].join(" ");
    return { system: system, user: JSON.stringify(safe) };
  }

  function repairBrief(ctx, issues, previous) {
    var brief = modelBrief(ctx);
    brief.user = JSON.stringify({
      lesson: forModel(ctx),
      problems: issues || [],
      previous: previous || null,
      instruction: "Repair only the listed problems. Keep the same topic, year, and lesson purpose. Return the full JSON adventure again."
    });
    return brief;
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

  function questionOf(raw) {
    raw = raw || {};
    var kind = raw.kind === "boolean" || raw.kind === "true_false" ? "boolean" : "multiple";
    var prompt = clean(raw.prompt, 240);
    var explain = clean(raw.explain, 240);
    var choices;
    var correct;
    if (kind === "boolean") {
      choices = ["True", "False"];
      var flag = String(raw.correct == null ? "" : raw.correct).toLowerCase();
      correct = flag === "false" || flag === "f" || flag === "no" ? "false" : (flag === "true" || flag === "t" || flag === "yes" ? "true" : "");
    } else {
      choices = (raw.choices || []).map(function (choice) {
        return clean(typeof choice === "string" ? choice : (choice && (choice.text || choice.label)), 80);
      }).filter(Boolean).slice(0, 4);
      correct = clean(raw.correct, 80);
      if (choices.indexOf(correct) === -1) correct = "";
    }
    return { prompt: prompt, choices: choices, correct: correct, explain: explain, kind: kind };
  }

  function activityFrom(raw, allowed) {
    raw = raw || {};
    var mechanic = String(raw.mechanic || "").toLowerCase().replace(/-/g, "_");
    if (mechanic === "question" || mechanic === "true_false") mechanic = "quiz";
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
    var visual = visualOf(raw.visualContext);
    if (visual) activity.visualContext = visual;
    if (mechanic === "quiz") {
      var config = raw.config || {};
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
      activity.config = { pool: "included", avoidRepeat: true, preferFresh: true };
    } else {
      var lines = ((raw.config && raw.config.lines) || []).map(function (line) { return clean(line, 280); }).filter(Boolean).slice(0, 6);
      activity.config = { lines: lines };
      activity.minutes = Math.max(2, Math.min(activity.minutes, 6));
    }
    return activity;
  }

  function blobOf(activities) {
    return activities.map(function (activity) {
      var config = activity.config || {};
      var bits = [activity.title, activity.why, activity.purpose].concat(config.lines || []).concat(config.words || []);
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
        if (index === activities.length - 1) issues.push(label + " spins for a pupil but no task follows.");
      } else if (!(config.lines || []).length || (config.lines || []).some(placeholder)) {
        issues.push(label + " needs something for the class to read.");
      }
    });
    return issues;
  }

  function educationalIssues(activities, ctx) {
    var issues = structuralIssues(activities);
    var blob = blobOf(activities);
    var topic = clean(ctx.topic || "", 120);
    var tokens = words(topic);
    tokens.forEach(function (token) {
      if (blob.indexOf(token) === -1) issues.push("The activities do not teach " + token + ".");
    });
    if (!tokens.length && topic && blob.indexOf(topic.toLowerCase()) === -1) issues.push("The activities do not match the requested topic.");
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
        (item.choices || []).forEach(function (choice) {
          if (SILLY[clean(choice).toLowerCase()] && topic.toLowerCase().indexOf(clean(choice).toLowerCase()) === -1) {
            issues.push("A choice is not a real alternative: " + choice);
          }
        });
      });
    });
    var topicLower = topic.toLowerCase();
    if (topicLower.indexOf("fraction") === -1 && blob.indexOf("half") !== -1 && blob.indexOf("quarter") !== -1) {
      issues.push("The lesson drifted into fractions.");
    }
    activities.forEach(function (activity, index) {
      if (activity.mechanic !== "story" && activity.mechanic !== "mystery") return;
      var text = ((activity.config && activity.config.lines) || []).join(" ");
      var count = text.split(/\s+/).filter(Boolean).length;
      if (count < 18) issues.push("Activity " + (index + 1) + " names the topic but does not explain it.");
    });
    activities.forEach(function (activity, index) {
      if (activity.mechanic !== "spin") return;
      var next = activities[index + 1];
      var part = next && next.config && next.config.participation;
      if (!next || (part !== "selected_pupil" && part !== "spin") || next.mechanic !== "quiz") {
        issues.push("Activity " + (index + 1) + " chooses a pupil without a real turn afterwards.");
      }
    });
    var sourceWords = words(ctx.sourceText || ctx.lessonText || "").filter(function (word) {
      return tokens.indexOf(word) === -1;
    });
    var rare = [];
    var seen = {};
    sourceWords.forEach(function (word) {
      if (word.length < 6 || seen[word]) return;
      seen[word] = 1;
      rare.push(word);
    });
    if (rare.length >= 3) {
      var used = rare.some(function (word) { return blob.indexOf(word) !== -1; });
      if (!used) issues.push("The teacher's source material was not used.");
    }
    var sum = activities.reduce(function (total, activity) { return total + (Number(activity.minutes) || 0); }, 0);
    var band = durationBand(ctx.requestedMinutes || 15);
    if (sum < band.low || sum > band.high) issues.push("The activities add up to " + sum + " minutes. The lesson needs between " + band.low + " and " + band.high + ".");
    if (unsafe(JSON.stringify(activities))) issues.push("The lesson included markup that Wondii cannot show.");
    return issues;
  }

  function accept(raw, ctx) {
    ctx = ctx || {};
    var parsed = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, issues: ["The lesson was not valid structured data."] };
    if (parsed.adventure && typeof parsed.adventure === "object") parsed = parsed.adventure;
    var allowed = ctx.availableMechanics && ctx.availableMechanics.length ? ctx.availableMechanics : MECHANICS;
    var incoming = Array.isArray(parsed.activities) ? parsed.activities : [];
    var dropped = incoming.some(function (item) {
      var mechanic = String(item && item.mechanic || "").toLowerCase().replace(/-/g, "_");
      if (mechanic === "question" || mechanic === "true_false") mechanic = "quiz";
      return MECHANICS.indexOf(mechanic) === -1 || allowed.indexOf(mechanic) === -1;
    });
    var activities = incoming.map(function (item) { return activityFrom(item, allowed); }).filter(Boolean);
    var issues = educationalIssues(activities, ctx);
    if (dropped) issues.push("An activity uses a game Wondii cannot play.");
    if (ctx.yearGroup && parsed.yearGroup && yearDigit(parsed.yearGroup) && yearDigit(parsed.yearGroup) !== yearDigit(ctx.yearGroup)) {
      issues.push("The plan changed the year group.");
    }
    if (issues.length) return { ok: false, issues: issues, previous: parsed };
    var sum = activities.reduce(function (total, activity) { return total + activity.minutes; }, 0);
    return {
      ok: true,
      adventure: {
        subject: clean(parsed.subject || ctx.subject, 80),
        topic: clean(parsed.topic || ctx.topic, 120),
        yearGroup: ctx.yearGroup || clean(parsed.yearGroup, 20),
        title: clean(parsed.title, 80) || ((ctx.topic || "Learning") + " adventure"),
        objectives: (parsed.objectives || ctx.learningObjectives || []).map(function (item) { return clean(item, 240); }).filter(Boolean).slice(0, 6),
        vocabulary: (parsed.vocabulary || []).map(function (item) { return clean(item, 40); }).filter(Boolean).slice(0, 12),
        activities: activities,
        targetMinutes: Number(ctx.requestedMinutes) || sum,
        estimateMinutes: sum
      }
    };
  }

  function runPipeline(ctx, callModel) {
    var started = Date.now();
    return Promise.resolve().then(function () {
      return callModel(modelBrief(ctx), null);
    }).then(function (first) {
      var accepted = accept(first, ctx);
      if (accepted.ok) {
        accepted.adventure.meta = { durationMs: Date.now() - started, repairUsed: false, fallbackUsed: false };
        return accepted;
      }
      return Promise.resolve().then(function () {
        return callModel(repairBrief(ctx, accepted.issues, accepted.previous), accepted.issues);
      }).then(function (second) {
        var repaired = accept(second, ctx);
        if (repaired.ok) {
          repaired.adventure.meta = { durationMs: Date.now() - started, repairUsed: true, fallbackUsed: false };
          return repaired;
        }
        return { ok: false, category: "invalid", issues: repaired.issues, repairUsed: true, fallbackUsed: true, durationMs: Date.now() - started };
      });
    }).catch(function (error) {
      var category = error && error.category ? error.category : "provider";
      return { ok: false, category: category, repairUsed: false, fallbackUsed: true, durationMs: Date.now() - started };
    });
  }

  function request(ctx) {
    var cloud = typeof window !== "undefined" ? window.KidsScoreCloud : null;
    var sync = typeof window !== "undefined" && window.SCORE_SYNC ? window.SCORE_SYNC : {};
    function send(token) {
      var headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = "Bearer " + token;
      if (sync.supabaseAnonKey) headers.apikey = sync.supabaseAnonKey;
      var control = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(50000) } : {};
      return fetch("/api/learn/generate", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ context: ctx }),
        signal: control.signal
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false, category: "provider" }; });
      }).then(function (body) {
        if (!body || !body.ok || !body.adventure) return { ok: false, category: (body && body.category) || "provider" };
        var checked = accept(body.adventure, ctx);
        if (!checked.ok) return { ok: false, category: "invalid", issues: checked.issues };
        checked.adventure.meta = {
          durationMs: body.meta && body.meta.durationMs,
          repairUsed: !!(body.meta && body.meta.repairUsed),
          fallbackUsed: false
        };
        return { ok: true, adventure: checked.adventure };
      }).catch(function (error) {
        var name = error && error.name;
        return { ok: false, category: name === "TimeoutError" || name === "AbortError" ? "timeout" : "provider" };
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

  return {
    MECHANICS: MECHANICS,
    durationBand: durationBand,
    contextFrom: contextFrom,
    forModel: forModel,
    modelBrief: modelBrief,
    repairBrief: repairBrief,
    accept: accept,
    runPipeline: runPipeline,
    request: request
  };
});
