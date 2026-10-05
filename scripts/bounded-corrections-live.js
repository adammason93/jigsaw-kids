"use strict";

/* Live check for the two bounded corrections.
   Runs the real learn-generate boot (local lesson-brain, real OpenAI) for:
     A. Year 4 sharks — pack, strand gate, beat substance, pupil lesson
     B. Year 3 dinosaurs — whether developed strands are admitted
     C. Year 6 Mam Tor — unsupported local geology must not be taught as fact
   Supabase auth is stubbed. Model calls are not stubbed.
   If OPENAI_API_KEY is missing, this writes LIVE_VALIDATION_BLOCKED and exits.
   It does not invent fixture packs and it does not call them live. */

var fs = require("fs");
var path = require("path");

var outDir = path.join(__dirname, "../docs/agent/bounded-corrections-live");
fs.mkdirSync(outDir, { recursive: true });

var key = String(process.env.OPENAI_API_KEY || "").trim();
if (!key) {
  var blocked = [
    "# LIVE_VALIDATION_BLOCKED",
    "",
    "OPENAI_API_KEY is not set in this environment. No model call was made.",
    "No fixture pack, fixture plan, or fixture pupil lesson is presented as live evidence.",
    "",
    "Re-run on a machine that has the key:",
    "",
    "```",
    "OPENAI_API_KEY=... node scripts/bounded-corrections-live.js",
    "```",
    "",
    "Optional: LESSON_MODEL (default gpt-4o-mini).",
    "",
    "The script loads js/learn-generate-boot.js with the local js/lesson-brain.js (the code under test) and sends every model stage to api.openai.com. Supabase auth is stubbed so the boot can start. It writes one JSON file per case into docs/agent/bounded-corrections-live/ and does not merge, deploy, or change gates if a case fails.",
    "",
    "Cases:",
    "",
    "1. Year 4 — How are sharks adapted to living in the ocean? Full pipeline: pack, developed-strand gate, beat substance, pupil teach / apply / check / consolidation.",
    "2. Year 3 — Teach children about dinosaurs. Record whether the required developed strands exist.",
    "3. Year 6 — Explain how the geology of Mam Tor caused the landslip. Unsupported local geology and causation must not be admitted as teaching facts.",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "LIVE_VALIDATION_BLOCKED.md"), blocked);
  console.log("LIVE_VALIDATION_BLOCKED");
  console.log("Wrote docs/agent/bounded-corrections-live/LIVE_VALIDATION_BLOCKED.md");
  process.exit(0);
}

var brainSource = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
var boot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var realFetch = global.fetch;
if (typeof realFetch !== "function") {
  console.error("This Node has no global fetch. Cannot call OpenAI.");
  process.exit(1);
}

function jsonResponse(body, status) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () { return Promise.resolve(body); },
    text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); }
  };
}

var stages = [];
var originalLog = console.log;
console.log = function (line) {
  try {
    var parsed = JSON.parse(line);
    if (parsed && parsed.event === "learn-generate") stages.push(parsed);
  } catch (e) { /* not a boot log */ }
  originalLog(line);
};

global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return key;
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "live-validation-anon";
  if (name === "LESSON_MODEL") return String(process.env.LESSON_MODEL || "gpt-4o-mini");
  return "";
} } };

global.fetch = function (url, init) {
  var href = String(url);
  if (href.indexOf("lesson-brain.js") !== -1) return Promise.resolve(jsonResponse(brainSource, 200));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-live" }, 200));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
  if (href.indexOf("api.openai.com") !== -1) return realFetch(url, init);
  return Promise.reject(new Error("unexpected fetch " + href));
};

function pupilOf(adventure) {
  var rows = [];
  ((adventure && adventure.activities) || []).forEach(function (activity) {
    rows.push({
      slot: activity.slotId,
      beats: (activity.beats || []).map(function (beat) {
        return {
          id: beat.id,
          move: beat.move,
          knowledgeRefs: beat.knowledgeRefs || [],
          text: beat.pupil && beat.pupil.text
        };
      }),
      instruction: activity.applyInstruction || "",
      knowledgeUsed: activity.knowledgeUsed || "",
      successCondition: activity.successCondition || "",
      teachingConnection: activity.teachingConnection || "",
      lines: (activity.config && activity.config.lines) || [],
      questions: ((activity.config && activity.config.questions) || []).map(function (question) {
        return { prompt: question.prompt, correct: question.correct, choices: question.choices };
      })
    });
  });
  return rows;
}

function stage(name) {
  var found = stages.filter(function (row) { return row.stage === name; });
  return found.length ? found[found.length - 1] : null;
}

function applyReading(pupil) {
  var apply = (pupil || []).filter(function (row) { return row.slot === "apply"; })[0];
  if (!apply) return { observed: false, note: "No apply slot was produced." };
  var text = [apply.instruction].concat((apply.beats || []).map(function (beat) { return beat.text; })).join(" ");
  var recognition = /\b(which|choose|pick|match|select)\b/i.test(text) && /\b(sentence|idea you just|the one that says)\b/i.test(text);
  var use = /\b(new case|what would happen|explain why|so that|because|predict|show how)\b/i.test(text);
  return {
    observed: true,
    text: text.slice(0, 800),
    knowledgeUsed: apply.knowledgeUsed,
    successCondition: apply.successCondition,
    heuristic: recognition && !use ? "recognition" : (use ? "use" : "unclear"),
    note: "Heuristic only. Read the pupil text. Recognition repeats the taught sentence as a choice. Use asks the pupil to apply the mechanism to a case the teach slot did not answer."
  };
}

var cases = [
  {
    id: "y4-sharks",
    yearGroup: "Year 4",
    subject: "Science",
    topic: "Sharks",
    requestedMinutes: 15,
    lessonText: "Year 4 science. How are sharks adapted to living in the ocean?"
  },
  {
    id: "y3-dinosaurs",
    yearGroup: "Year 3",
    subject: "Science",
    topic: "Dinosaurs",
    requestedMinutes: 15,
    lessonText: "Year 3 science. Teach children about dinosaurs."
  },
  {
    id: "y6-mam-tor",
    yearGroup: "Year 6",
    subject: "Geography",
    topic: "Landslips",
    requestedMinutes: 20,
    lessonText: "Year 6 geography. Explain how the geology of Mam Tor caused the landslip."
  }
];

function runCase(spec) {
  stages = [];
  var started = Date.now();
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST",
    headers: { Authorization: "Bearer live", "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: "bounded-" + spec.id,
      context: {
        organisationId: "org-live",
        lessonText: spec.lessonText,
        yearGroup: spec.yearGroup,
        subject: spec.subject,
        topic: spec.topic,
        requestedMinutes: spec.requestedMinutes
      }
    })
  })).then(function (response) {
    return response.json();
  }).then(function (body) {
    var pack = stage("KNOWLEDGE_PACK");
    var teaching = stage("TEACHING_PLAN");
    var pupil = pupilOf(body.adventure);
    var record = {
      id: spec.id,
      liveModel: true,
      modelName: String(process.env.LESSON_MODEL || "gpt-4o-mini"),
      request: spec.lessonText,
      yearGroup: spec.yearGroup,
      ok: !!body.ok,
      stage: body.stage || "",
      issues: body.issues || [],
      elapsedMs: Date.now() - started,
      stages: stages.map(function (row) { return row.stage; }),
      pack: pack,
      planRepair: stage("PLAN_REPAIR"),
      educationalFailure: stage("EDUCATIONAL_VALIDATION_FAILED"),
      knowledgeBlocked: stage("KNOWLEDGE_BLOCKED"),
      teachingPlan: teaching,
      learningMap: stage("LEARNING_MAP"),
      applyAlignment: stage("APPLY_ALIGNMENT"),
      checkAlignment: stage("CHECK_ALIGNMENT"),
      pupil: pupil,
      applyReading: spec.id === "y4-sharks" ? applyReading(pupil) : null
    };
    fs.writeFileSync(path.join(outDir, spec.id + ".json"), JSON.stringify(record, null, 2));
    originalLog("case", spec.id, record.ok, record.stage, record.elapsedMs + "ms");
  }).catch(function (error) {
    var record = {
      id: spec.id,
      liveModel: true,
      request: spec.lessonText,
      harnessError: String(error && error.stack || error).replace(key, "[redacted]"),
      stages: stages.map(function (row) { return row.stage; })
    };
    fs.writeFileSync(path.join(outDir, spec.id + ".json"), JSON.stringify(record, null, 2));
    originalLog("case failed", spec.id, record.harnessError.split("\n")[0]);
  });
}

(0, eval)("(async function(){\n" + boot + "\n})()").then(function () {
  var chain = Promise.resolve();
  cases.forEach(function (spec) {
    chain = chain.then(function () { return runCase(spec); });
  });
  return chain;
}).then(function () {
  console.log = originalLog;
  console.log("live validation wrote docs/agent/bounded-corrections-live/");
}).catch(function (error) {
  console.log = originalLog;
  console.error(String(error && error.stack || error).replace(key, "[redacted]"));
  process.exit(1);
});
