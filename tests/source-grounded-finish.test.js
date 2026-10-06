"use strict";

// Offline end to end (no network, no paid call): a research-mode pack that passes the gate
// carries straight through the production boot (plan, beats, activities, questions) and the
// finish step (images through the production visual planner + period guard, checks 1-4,
// lesson.html, lesson.json) in the same run. Every OpenAI call goes through the real spend
// guard with a stubbed transport. Model outputs below are test fixtures, not a lesson.

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var Guard = require("../scripts/source-grounded/spend-guard.js");
var Finish = require("../scripts/source-grounded/finish.js");
var Player = require("../scripts/source-grounded/player.js");

var boot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");

var Stubs = require("./fixtures/source-grounded/offline-stubs.js");
var jsonResponse = Stubs.jsonResponse;
var openai = Stubs.openai;
var calls = Stubs.calls;
var TEXT = Stubs.TEXT;
var goal = Stubs.goal;
global.Deno = { env: { get: function (name) {
  return { OPENAI_API_KEY: "test-key", SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "test-anon", LESSON_MODEL: "gpt-4o-mini", LESSON_RESEARCH: "wikipedia" }[name] || "";
} } };

var dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-finish-"));
var guard = Guard.createGuard({ capUsd: 0.8, ledgerPath: path.join(dir, "ledger.jsonl"), totalCapUsd: 2.5, baseGuardUsd: 1.0, sharedLedgers: [] });
var guarded = guard.wrap(function (url, init) { return openai(String(url), JSON.parse(init.body)); });
global.fetch = function (url, init) {
  var href = String(url);
  var local = Stubs.network(href);
  if (local) return local;
  if (href.indexOf("https://api.openai.com/") === 0) return guarded(url, init);
  return Promise.reject(new Error("unexpected fetch " + href));
};
var logs = [];
var originalLog = console.log;
console.log = function (line) { try { var p = JSON.parse(line); if (p && p.event === "learn-generate") { logs.push(p); return; } } catch (e) {} originalLog(line); };

(0, eval)("(async function(){\n" + boot + "\n})()").then(function () {
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", { method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: "finish-offline", context: { organisationId: "org-1", lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 } }) }));
}).then(function (res) { return res.json(); }).then(function (body) {
  console.log = originalLog;
  if (!body.ok) originalLog(JSON.stringify(logs.filter(function (l) { return /PLAN_VALIDATE|PLAN_REPAIR|EDUCATIONAL/.test(l.stage); }), null, 1).slice(0, 4000));
  assert.strictEqual(body.ok, true, "stage " + body.stage + " " + (body.issues || []).join(" | ") + " stages " + logs.map(function (l) { return l.stage; }).join(","));
  var used = logs.filter(function (l) { return l.stage === "KNOWLEDGE_PACK"; })[0];
  assert.strictEqual(used.packReadiness.status, "ready");
  assert.strictEqual(used.packReadiness.distinctReady, 3);
  // Patch 5: ID lineage ran in the boot and every gate-ready unit is planned, taught and assessed.
  assert.deepStrictEqual(used.packReadiness.readyPairs.map(function (p) { return p.unitId; }), ["u1", "u2", "u3"]);
  var lineageLog = logs.filter(function (l) { return l.stage === "UNIT_LINEAGE"; })[0];
  assert.ok(lineageLog && lineageLog.ok, JSON.stringify(lineageLog));
  assert.strictEqual(body.adventure.unitLineage.units.filter(function (u) { return u.ok; }).length, 3);
  return Finish.runFinish({ adventure: body.adventure, logs: logs, trace: {}, outDir: dir, apiKey: "test-key", fetch: global.fetch, imageCount: 4 }).then(function (out) {
    var lesson = out.lesson;
    // Same run: images, checks, render.
    var images = calls.filter(function (c) { return c.kind === "image"; });
    assert.strictEqual(images.length, 4);
    images.forEach(function (c) {
      assert.strictEqual(c.body.quality, "low");
      assert.strictEqual(c.body.size, "1536x1024");
      assert.strictEqual(c.body.n, 1);
      assert.ok(/never show a person beside a living dinosaur/.test(c.body.prompt), "period guard in every image prompt");
    });
    assert.deepStrictEqual(lesson.images.map(function (i) { return i.id; }), ["hook", "teach", "apply", "check"]);
    assert.ok(lesson.images.every(function (i) { return i.status === "ready" && fs.existsSync(path.join(dir, "lesson", i.publicUrl)); }));
    var vision = calls.filter(function (c) { return c.kind === "vision"; });
    assert.strictEqual(vision.length, 4);
    assert.strictEqual(vision[0].body.messages[1].content[1].image_url.detail, "low");
    assert.strictEqual(calls.filter(function (c) { return c.kind === "age"; }).length, 1);
    assert.strictEqual(calls.filter(function (c) { return c.kind === "questions"; }).length, 1);
    // Check 1: every beat resolves to quote-verified, entailment-supported claims through the learning map.
    assert.ok(lesson.checks.support.learningMapPoints >= 6, "learning map reached the finish step");
    assert.ok(lesson.checks.support.rows.length > 10);
    assert.strictEqual(lesson.checks.support.problems, 0, JSON.stringify(lesson.checks.support.rows.filter(function (r) { return !r.ok; }).slice(0, 3)));
    // Pairs carry quotes and URLs.
    assert.strictEqual(lesson.pairs.length, 3);
    lesson.pairs.forEach(function (p) { assert.ok(p.featureClaim.quote && p.explanation.quote && /^https:\/\/simple\.wikipedia\.org/.test(p.explanation.url)); });
    assert.ok(lesson.questions.length >= 1);
    lesson.questions.forEach(function (q) { assert.ok(q.choices.indexOf(q.correct) !== -1); });
    assert.strictEqual(lesson.checks.questions.problems, 0, JSON.stringify(lesson.checks.questions.rows));
    assert.strictEqual(lesson.checks.images.problems, 0);
    assert.ok(lesson.checks.age.rows.length > 5);
    assert.strictEqual(lesson.objective, goal);
    // Render: self-contained HTML with relative images and the full JSON.
    var html = fs.readFileSync(out.html, "utf8");
    assert.ok(/Provisional\. Not classroom-ready\. Not human-reviewed\./.test(html));
    assert.ok(html.indexOf("src=\"images/hook.jpg\"") !== -1);
    assert.ok(html.indexOf("lesson-json") !== -1 && html.indexOf(TEXT.neckM) !== -1);
    assert.ok(JSON.parse(fs.readFileSync(out.json, "utf8")).adventure.activities.length === 7);
    assert.ok(lesson.adventure.visualAssets.length === 4 && lesson.adventure.activities.some(function (a) { return a.scene && a.scene.visualAssetId === "teach"; }));
    // Every paid call was guard-accounted, including images and vision.
    var ledger = fs.readFileSync(path.join(dir, "ledger.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    assert.strictEqual(ledger.filter(function (r) { return r.kind === "image"; }).length, 4);
    assert.strictEqual(ledger.filter(function (r) { return r.kind === "vision"; }).length, 4);
    assert.ok(ledger.every(function (r) { return r.event === "settled"; }));
    // Failing cases are flagged, not hidden.
    var bad = JSON.parse(JSON.stringify(body.adventure));
    var check = bad.activities.filter(function (a) { return a.slotId === "check"; })[0];
    var q = (check.config.questions || [check.config])[0];
    q.choices = [q.correct, q.correct];
    var flagged = Finish.questionsOf(bad)[0];
    assert.strictEqual(flagged.choices.length, 2);
    // Real-player preview: the creator's own toAdventure turns it into a playable journey.
    var site = path.join(dir, "site");
    var built = Player.buildSite({ lessonDir: path.join(dir, "lesson"), siteDir: site, id: "sg-test" });
    assert.strictEqual(built.journey.plan.slides.length, 7);
    assert.ok(require("../schools/learn/creator-core.js").slidesPlayable(built.journey.plan.slides));
    assert.ok(built.journey.learningMap.visualAssets.every(function (a) { return a.status !== "ready" || a.publicUrl === "/sg/images/" + a.id + ".jpg"; }));
    assert.ok(fs.existsSync(path.join(site, "sg", "images", "hook.jpg")));
    assert.ok(fs.readFileSync(path.join(site, "sg", "index.html"), "utf8").indexOf(Player.SCOPED_KEY) !== -1);
    assert.ok(/supabaseUrl: ""/.test(fs.readFileSync(path.join(site, "js", "score-config.js"), "utf8")));
    console.log("source-grounded finish tests passed (" + ledger.length + " guarded calls, $" + guard.state().guardSpent + " guard on stubs)");
  });
}).catch(function (error) {
  console.log = originalLog;
  console.error(error);
  process.exit(1);
});
