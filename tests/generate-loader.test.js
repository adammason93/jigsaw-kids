var assert = require("assert");
var fs = require("fs");
var path = require("path");

function bootAccepted(source) {
  return source.includes("lesson-brain.js?v=41")
    && source.includes("teacherIntentBrief")
    && source.includes("checkEvidenceBrief")
    && source.includes("checkCoverageBrief")
    && !source.includes("PLACEHOLDER");
}

var localBoot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var localBrain = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
assert.strictEqual(bootAccepted(localBoot), true);
assert.strictEqual(localBoot.includes("semanticWarningsAllowed"), false);
assert.strictEqual(localBrain.includes("semanticWarningsAllowed"), true);
assert.strictEqual(bootAccepted(localBoot.replace("lesson-brain.js?v=41", "lesson-brain.js?v=40")), false);
assert.strictEqual(bootAccepted.toString().includes("semanticWarningsAllowed"), false);

function jsonResponse(body, status) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () { return Promise.resolve(body); },
    text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); }
  };
}

var stages = [];
var modelSystems = [];
var originalLog = console.log;
var originalFetch = global.fetch;
console.log = function (line) {
  try {
    var parsed = JSON.parse(line);
    if (parsed && parsed.event === "learn-generate") stages.push(parsed.stage || parsed.category || "");
  } catch (e) { /* not a generate log */ }
};

global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return "test-key";
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "test-anon";
  if (name === "LESSON_MODEL") return "gpt-4o-mini";
  return "";
} } };

fetch("https://wondii.co.uk/js/learn-generate-boot.js?v=32").then(function (res) {
  assert.strictEqual(res.ok, true);
  return res.text();
}).then(function (liveBoot) {
  assert.strictEqual(bootAccepted(liveBoot), true);
  assert.strictEqual(liveBoot.includes("semanticWarningsAllowed"), false);
  assert.strictEqual(liveBoot.includes("lesson-brain.js?v=41"), true);
  return fetch("https://wondii.co.uk/js/lesson-brain.js?v=41").then(function (res) {
    assert.strictEqual(res.ok, true);
    return res.text();
  }).then(function (liveBrain) {
    assert.strictEqual(liveBrain.includes("semanticWarningsAllowed"), true);
    assert.strictEqual(liveBrain.includes("teacherIntentBrief"), true);
    return (0, eval)("(async function(){\n" + liveBoot + "\n})()");
  });
}).then(function () {
  assert.strictEqual(typeof global.handleGenerate, "function");
  var brain = global.WondiiLessonBrain;
  assert.ok(brain);
  assert.strictEqual(typeof brain.teacherIntentBrief, "function");
  var intentAt = localBoot.indexOf("brain.teacherIntentBrief");
  var planAt = localBoot.indexOf("brain.planBrief");
  assert.ok(intentAt > 0 && planAt > intentAt);
  var openaiCalls = 0;
  global.fetch = function (url, init) {
    var href = String(url);
    if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-1" }, 200));
    if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
    if (href.indexOf("api.openai.com") !== -1) {
      var body = JSON.parse(init.body);
      modelSystems.push(body.messages[0].content);
      openaiCalls += 1;
      if (openaiCalls === 1) {
        return Promise.resolve(jsonResponse({
          choices: [{ message: { content: JSON.stringify({
            learningGoal: "understand what lightning is and how it occurs",
            requiredEvidence: "describe the process of lightning formation",
            focusConcepts: ["lightning"],
            priorKnowledge: [],
            exclusions: [],
            preferences: [],
            subject: "Science",
            subjectConfidence: "high"
          }) } }]
        }, 200));
      }
      return Promise.resolve(jsonResponse({ choices: [{ message: { content: "{}" } }] }, 200));
    }
    return Promise.reject(new Error("unexpected fetch " + href));
  };
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST",
    headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: "loader-hotfix",
      context: {
        organisationId: "org-1",
        lessonText: "Year 1 lightning",
        yearGroup: "Year 1",
        topic: "Lightning",
        requestedMinutes: 15
      }
    })
  }));
}).then(function (response) {
  assert.ok(response);
  assert.ok(stages.indexOf("TEACHER_INTENT") !== -1, stages.join(","));
  assert.ok(stages.indexOf("TEACHER_INTENT") < stages.indexOf("PLAN_REQUEST"));
  assert.ok(modelSystems[0].indexOf("You interpret one primary teacher's request.") !== -1);
  assert.ok(modelSystems.length < 5);
  console.log = originalLog;
  global.fetch = originalFetch;
  console.log("generate loader tests passed");
}).catch(function (error) {
  console.log = originalLog;
  global.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
