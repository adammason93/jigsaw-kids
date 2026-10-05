/* Development-only. Compares the production lesson model with one stronger current model.
   Run: OPENAI_API_KEY=... node tests/lesson-model-compare.js
   Does not print the key. Does not change production. Prices are the public per-1M-token rates
   from the OpenAI model pages checked for this phase:
   gpt-4o-mini input $0.15 output $0.60
   gpt-6.1-sol input $2 output $10
   gpt-6.1-sol is the documented balance of intelligence and cost. gpt-6-astra is the flagship. */
var fs = require("fs");
var Brain = require("../js/lesson-brain.js");
var Core = require("../schools/learn/creator-core.js");

var PRODUCTION = "gpt-4o-mini";
var STRONGER = "gpt-6.1-sol";
var PRICES = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-6.1-sol": { input: 2, output: 10 }
};
var PROMPTS = [
  "Teach Year 2 children what gravity does for 10 minutes.",
  "Teach Year 4 equivalent fractions for 12 minutes.",
  "Teach Year 5 why volcanoes erupt for 15 minutes.",
  "Teach Year 3 how adjectives improve sentences for 10 minutes.",
  "Teach Year 6 why the Romans invaded Britain for 15 minutes."
];

function contextFor(sentence) {
  var draft = Core.blankDraft();
  draft.source = { type: "paste", filename: "", text: sentence, unsupported: false };
  Core.applyAnalysis(draft, Core.analyseSource(sentence));
  return Brain.contextFrom(draft, { pupilCount: 24, availableMechanics: Brain.MECHANICS });
}

function dollars(model, usage) {
  var rate = PRICES[model];
  if (!rate || !usage) return null;
  var input = Number(usage.prompt_tokens) || 0;
  var output = Number(usage.completion_tokens) || 0;
  return Math.round((input * rate.input + output * rate.output) / 10) / 100000;
}

function callModel(brief, model, apiKey) {
  var started = Date.now();
  var body = {
    model: model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: brief.system },
      { role: "user", content: brief.user }
    ]
  };
  if (model.indexOf("gpt-6") === 0) body.reasoning_effort = "low";
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function (res) {
    return res.json().then(function (payload) {
      return { status: res.status, payload: payload, ms: Date.now() - started };
    });
  });
}

function generate(sentence, model, apiKey) {
  var ctx = contextFor(sentence);
  var started = Date.now();
  var spent = 0;
  return callModel(Brain.planBrief(ctx), model, apiKey).then(function (planCall) {
    spent += dollars(model, planCall.payload && planCall.payload.usage) || 0;
    if (planCall.status !== 200) {
      return { ok: false, stage: "plan", status: planCall.status, error: planCall.payload && planCall.payload.error, ms: Date.now() - started };
    }
    var text = planCall.payload.choices[0].message.content;
    var plan = Brain.normalisePlan(JSON.parse(text), ctx);
    if (!plan.ok) return { ok: false, stage: "plan", issues: plan.issues, ms: Date.now() - started, cost: spent };
    var withPlan = Object.assign({}, ctx, { lessonPlan: plan.plan });
    return callModel(Brain.contentBrief(withPlan, plan.plan), model, apiKey).then(function (contentCall) {
      spent += dollars(model, contentCall.payload && contentCall.payload.usage) || 0;
      if (contentCall.status !== 200) {
        return { ok: false, stage: "content", status: contentCall.status, error: contentCall.payload && contentCall.payload.error, ms: Date.now() - started, cost: spent };
      }
      var adventure = Brain.accept(JSON.parse(contentCall.payload.choices[0].message.content), withPlan);
      return {
        ok: adventure.ok,
        issues: adventure.issues || [],
        adventure: adventure.adventure || null,
        checklist: adventure.ok ? Brain.qualityChecklist(adventure.adventure, withPlan) : [],
        ms: Date.now() - started,
        cost: Math.round(spent * 10000) / 10000
      };
    });
  });
}

function summarise(result) {
  var adventure = result.adventure || {};
  var plan = adventure.lessonPlan || {};
  var activities = adventure.activities || [];
  var quiz = null;
  var teaching = null;
  var interaction = null;
  activities.forEach(function (activity) {
    if (!teaching && (activity.mechanic === "story" || activity.mechanic === "doors")) teaching = activity;
    if (!interaction && (activity.mechanic === "spin" || activity.mechanic === "doors" || activity.mechanic === "mystery")) interaction = activity;
    if (!quiz && activity.mechanic === "quiz") quiz = activity;
  });
  var question = quiz && quiz.config && (quiz.config.questions || [])[0];
  var recap = activities.filter(function (activity) { return /recap/i.test(activity.purpose || "") || activity.mechanic === "mystery"; }).pop();
  return {
    ok: result.ok,
    issues: result.issues,
    ms: result.ms,
    costUsd: result.cost,
    checklist: (result.checklist || []).filter(function (item) { return !item.ok; }).map(function (item) { return item.id; }),
    title: adventure.title || "",
    objective: (adventure.objectives || [])[0] || plan.learningObjective || "",
    keyKnowledge: plan.keyKnowledge || [],
    sequence: activities.map(function (activity) { return activity.purpose + " (" + activity.mechanic + ", " + activity.minutes + " min)"; }),
    teaching: teaching ? ((teaching.config && teaching.config.lines) || []).join(" ") : "",
    interaction: interaction ? (interaction.title + ": " + ((interaction.config && (interaction.config.prompt || (interaction.config.lines || [])[0])) || "")) : "",
    question: question ? question.prompt : "",
    choices: question ? question.choices : [],
    correct: question ? question.correct : "",
    explain: question ? question.explain : "",
    recap: recap ? ((recap.config && recap.config.lines) || [recap.why]).join(" ") : ""
  };
}

var apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) {
  console.log("NO_KEY");
  process.exit(0);
}

var jobs = PROMPTS.map(function (sentence) {
  return generate(sentence, PRODUCTION, apiKey).then(function (result) {
    return { prompt: sentence, model: PRODUCTION, summary: summarise(result) };
  });
});
jobs.push(generate(PROMPTS[0], STRONGER, apiKey).then(function (result) {
  return { prompt: PROMPTS[0], model: STRONGER, summary: summarise(result) };
}));

Promise.all(jobs).then(function (rows) {
  var out = "/tmp/phase96-lesson-compare.json";
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  rows.forEach(function (row) {
    console.log(row.model + " | " + row.prompt + " | ok=" + row.summary.ok + " | " + row.summary.ms + "ms | $" + row.summary.costUsd);
  });
}).catch(function (error) {
  console.error(error && error.message ? error.message : "compare failed");
  process.exit(1);
});
