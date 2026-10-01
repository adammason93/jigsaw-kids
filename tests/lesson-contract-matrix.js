/* Live PLAN → CONTENT samples for the teaching contract.
   Run: OPENAI_API_KEY=... node tests/lesson-contract-matrix.js
   Does not print the key. Does not call production Create. */
var Brain = require("../js/lesson-brain.js");
var Core = require("../schools/learn/creator-core.js");

var PROMPTS = [
  ["earthquakes", "Year 1", "learn about causes of earthquakes"],
  ["volcanoes", "Year 3", "teach how volcanoes erupt"],
  ["day-night", "Year 5", "teach why we have day and night"],
  ["fractions", "Year 4", "teach equivalent fractions"],
  ["adjectives", "Year 3", "teach how adjectives improve a sentence"],
  ["romans", "Year 4", "teach why the Romans came to Britain"],
  ["weather", "Year 2", "teach the difference between weather and climate"]
];

function contextFor(sentence, year) {
  var draft = Core.blankDraft();
  draft.source = { type: "paste", filename: "", text: sentence, unsupported: false };
  draft.year = year;
  draft.yearSource = "teacher";
  var analysis = Core.analyseSource(sentence);
  if (analysis.ok) Core.applyAnalysis(draft, analysis);
  if (!draft.year) draft.year = year;
  return Brain.contextFrom(draft, { pupilCount: 4, availableMechanics: Brain.MECHANICS });
}

function callModel(apiKey) {
  return function (brief) {
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: brief.system },
          { role: "user", content: brief.user }
        ]
      })
    }).then(function (res) {
      return res.json().then(function (payload) {
        if (!res.ok) {
          var failed = new Error("provider");
          failed.category = "provider";
          throw failed;
        }
        return JSON.parse(payload.choices[0].message.content);
      });
    });
  };
}

function checks(adventure) {
  var activities = (adventure && adventure.activities) || [];
  var opening = ((activities[0] && activities[0].config && activities[0].config.lines) || []).join(" ");
  var knowledge = ((adventure.lessonPlan && adventure.lessonPlan.keyKnowledge) || []);
  var teach = activities.filter(function (activity) {
    return activity.mechanic === "story" && activity.scene && activity.scene.beat !== "beginning" && activity.scene.beat !== "resolution";
  }).map(function (activity) { return ((activity.config && activity.config.lines) || []).join(" "); }).join(" ");
  var quizAt = activities.findIndex(function (activity) { return activity.mechanic === "quiz"; });
  var resolutionAt = activities.findIndex(function (activity) { return activity.scene && activity.scene.beat === "resolution"; });
  var recapAt = activities.findIndex(function (activity) { return activity.mechanic === "mystery" || (activity.scene && activity.scene.beat === "debrief"); });
  var fact = String(knowledge[0] || "").toLowerCase();
  var bits = fact.split(/\W+/).filter(function (word) { return word.length > 4; });
  var openingHits = bits.filter(function (word) { return opening.toLowerCase().indexOf(word) !== -1; }).length;
  var taught = bits.filter(function (word) { return teach.toLowerCase().indexOf(word) !== -1; }).length;
  return {
    hookHolds: bits.length < 3 || openingHits < 2,
    knowledgeTaught: !knowledge.length || taught >= Math.min(2, bits.length),
    checkAfterTeach: quizAt === -1 || quizAt > 0,
    resolutionAfterCheck: resolutionAt === -1 || quizAt === -1 || resolutionAt > quizAt,
    recapAfterTeach: recapAt === -1 || recapAt > 0
  };
}

var apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) {
  console.log("MATRIX_NOT_RUN no_key");
  process.exit(0);
}

var samples = Number(process.env.MATRIX_SAMPLES) || 2;
var jobs = [];
PROMPTS.forEach(function (row) {
  var n;
  for (n = 0; n < samples; n++) {
    jobs.push({ id: row[0], year: row[1], sentence: row[2], sample: n + 1 });
  }
});

function runJob(job) {
  var ctx = contextFor(job.sentence, job.year);
  return Brain.runPipeline(ctx, callModel(apiKey)).then(function (result) {
    var verdict = result.ok ? checks(result.adventure) : null;
    var passed = !!(result.ok && verdict && verdict.hookHolds && verdict.knowledgeTaught && verdict.checkAfterTeach && verdict.resolutionAfterCheck && verdict.recapAfterTeach);
    console.log(JSON.stringify({
      id: job.id,
      sample: job.sample,
      ok: passed,
      accepted: !!result.ok,
      issues: (result.issues || []).slice(0, 4),
      checks: verdict
    }));
    return { id: job.id, ok: passed };
  });
}

var cursor = Promise.resolve([]);
jobs.forEach(function (job) {
  cursor = cursor.then(function (rows) {
    return runJob(job).then(function (row) {
      rows.push(row);
      return rows;
    });
  });
});

cursor.then(function (rows) {
  var totals = {};
  rows.forEach(function (row) {
    totals[row.id] = totals[row.id] || { pass: 0, fail: 0 };
    totals[row.id][row.ok ? "pass" : "fail"] += 1;
  });
  console.log(JSON.stringify({ totals: totals, samples: samples }));
}).catch(function (error) {
  console.error(error && error.message ? error.message : "matrix failed");
  process.exit(1);
});
