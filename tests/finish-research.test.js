"use strict";

// Finish step in research mode (patch 6), offline with stubbed transport through the real spend
// guard. When the trace carries the research record, finish rebuilds the boot's context and:
//   - plans one teaching picture per gate-ready unit plus a story hook and the APPLY example
//     (js/visual-adventure.js planTeachingVisuals) and stamps each teach beat with its unit picture;
//   - adds check 5 (each teach/recap/apply sentence against its units' verbatim passages, meaning
//     kept) and check 6 (the research teaching rules + stage minutes total);
//   - asks the question check for distractors that are true in general and for teleology;
//   - asks the vision check whether the feature is visible, periods mixed, non-group animals shown;
//   - records verbatim passages and the causal-link result per pair, and the APPLY interaction;
//   - renders a working APPLY choice in lesson.html.
// Model outputs are test fixtures, not a lesson. With an empty trace finish is unchanged
// (tests/source-grounded-finish.test.js).

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var Guard = require("../scripts/source-grounded/spend-guard.js");
var Finish = require("../scripts/source-grounded/finish.js");
var Visuals = require("../js/visual-adventure.js");

var boot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var marker = "const brain = globalThis.WondiiLessonBrain;";
// The same observe-only trace hooks as scripts/source-grounded/generate.js.
boot = boot.replace(marker, marker + "\n" + [
  "globalThis.__sgTrace = { plans: [], packs: [], rawPacks: [] };",
  "const __sgBrief = brain.knowledgePackBrief.bind(brain);",
  "brain.knowledgePackBrief = function (ctx) { try { globalThis.__sgTrace.research = ctx && ctx.researchEvidence ? JSON.parse(JSON.stringify(ctx.researchEvidence)) : null; globalThis.__sgTrace.intent = ctx && ctx.lessonBrief ? JSON.parse(JSON.stringify(ctx.lessonBrief.teacherIntent || null)) : null; } catch (e) {} return __sgBrief(ctx); };",
  "const __sgSelect = brain.selectPackForLesson.bind(brain);",
  "brain.selectPackForLesson = function (pack, ctx) { var s = __sgSelect(pack, ctx); try { var copy = { pack: JSON.parse(JSON.stringify(pack)), selection: JSON.parse(JSON.stringify(s)) }; var seen = globalThis.__sgTrace.packs.filter(function (row) { return row.pack.id === copy.pack.id; })[0]; if (seen) { seen.pack = copy.pack; seen.selection = copy.selection; } else globalThis.__sgTrace.packs.push(copy); } catch (e) {} return s; };"
].join("\n"));

var Stubs = require("./fixtures/source-grounded/offline-stubs.js");
var openai = Stubs.openai;
var calls = Stubs.calls;
global.Deno = { env: { get: function (name) {
  return { OPENAI_API_KEY: "test-key", SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "test-anon", LESSON_MODEL: "gpt-4o-mini", LESSON_RESEARCH: "wikipedia" }[name] || "";
} } };
var dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-finish-research-"));
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
var request = { lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 };

(0, eval)("(async function(){\n" + boot + "\n})()").then(function () {
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", { method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: "finish-research", context: Object.assign({ organisationId: "org-1" }, request) }) }));
}).then(function (res) { return res.json(); }).then(function (body) {
  console.log = originalLog;
  assert.strictEqual(body.ok, true, "stage " + body.stage + " " + (body.issues || []).join(" | "));
  var trace = global.__sgTrace;
  assert.ok(trace.research && trace.research.passages.length, "research record traced");
  trace.request = request;
  var before = calls.length;
  return Finish.runFinish({ adventure: body.adventure, logs: logs, trace: trace, outDir: dir, apiKey: "test-key", fetch: global.fetch, imageCount: 5 }).then(function (out) {
    var lesson = out.lesson;
    var mine = calls.slice(before);
    // Teaching visuals: hook story picture, one teaching picture per unit, the APPLY example.
    var images = mine.filter(function (c) { return c.kind === "image"; });
    if (images.length !== 5) console.error(JSON.stringify(lesson.images.map(function (i) { return i.id; })), JSON.stringify(lesson.adventure.activities.filter(function (a) { return a.slotId === "apply"; })[0].scene));
    assert.strictEqual(images.length, 5);
    assert.deepStrictEqual(lesson.images.map(function (i) { return i.id; }), ["hook", "teach-u1", "teach-u2", "teach-u3", "apply"]);
    assert.ok(/STORY PICTURE/.test(images[0].body.prompt));
    images.slice(1, 4).forEach(function (c) { assert.ok(/Teaching picture \(artist's reconstruction\)/.test(c.body.prompt) && /No people/.test(c.body.prompt) && /pterosaurs/.test(c.body.prompt)); });
    assert.ok(/does not give away which option/.test(images[4].body.prompt));
    assert.ok(lesson.images.every(function (i) { return i.frameLabel; }), "every picture carries a frame label");
    assert.ok(lesson.adventure.visualAssets.every(function (a) { return a.frameLabel; }));
    // Each teach beat shows its unit's picture; other stages show the story or example picture.
    var teach = lesson.adventure.activities.filter(function (a) { return a.slotId === "teach"; })[0];
    var stamped = teach.beats.map(function (b) { return b.visualAssetId; });
    assert.ok(stamped.every(function (id) { return /^teach-u\d$/.test(id); }), JSON.stringify(stamped));
    assert.ok(new Set(stamped).size >= 2, "more than one unit picture across the teach beats");
    lesson.lineage.units.forEach(function (u) {
      var own = lesson.images.filter(function (i) { return i.id === "teach-" + u.unitId; })[0];
      own.beatIds.forEach(function (id) { assert.strictEqual(teach.beats.filter(function (b) { return b.id === id; })[0].visualAssetId, own.id); });
    });
    assert.strictEqual(lesson.adventure.activities.filter(function (a) { return a.slotId === "apply"; })[0].scene.visualAssetId, "apply");
    assert.strictEqual(lesson.adventure.activities.filter(function (a) { return a.slotId === "hook"; })[0].scene.visualAssetId, "hook");
    // Vision: the stub gives no featureVisible verdict, so every teaching picture is flagged (an unchecked feature is not a pass).
    var vision = mine.filter(function (c) { return c.kind === "vision"; });
    assert.strictEqual(vision.length, 5);
    assert.ok(/featureVisible/.test(vision[1].body.messages[0].content) && /mixedPeriods/.test(vision[1].body.messages[0].content));
    lesson.checks.images.rows.filter(function (r) { return /^teach-/.test(r.id); }).forEach(function (r) { assert.ok(r.flags.indexOf("feature visible: unchecked") !== -1); });
    // Check 5 and 6.
    assert.ok(lesson.checks.sentences.rows.length >= 3);
    assert.ok(lesson.checks.sentences.rows.some(function (r) { return r.unitIds.length && r.sourceRefs.length; }));
    assert.strictEqual(lesson.checks.rules.timings.total, 15);
    assert.strictEqual(lesson.checks.rules.timings.target, 15);
    // Questions: the general-truth and teleology fields are asked for in research mode.
    var q = mine.filter(function (c) { return c.kind === "questions"; })[0];
    assert.ok(/trueInGeneral/.test(q.body.messages[0].content) && /teleological/.test(q.body.messages[0].content));
    // Pairs: verbatim passages and causal link.
    lesson.pairs.forEach(function (p) {
      assert.ok(p.explanation.passages.length && p.explanation.passages[0].text.length > 20);
      assert.ok(p.causalLink && ["pass", "fail"].indexOf(p.causalLink.result) !== -1);
    });
    // APPLY interaction recorded and working in lesson.html.
    assert.ok(lesson.apply && lesson.apply.choices.length >= 2 && lesson.apply.choices.filter(function (c) { return c.correct; }).length === 1);
    assert.ok(/class screen/.test(lesson.apply.mode));
    var html = fs.readFileSync(out.html, "utf8");
    assert.ok(html.indexOf("data-choose") !== -1 && /data-correct="1"/.test(html));
    assert.ok(html.indexOf(Visuals.FRAME_LABELS.teaching) !== -1 && html.indexOf(Visuals.FRAME_LABELS.story) !== -1);
    assert.ok(/Causal link: /.test(html) && /Timing/.test(html));

    // Causal link: positive (run 14 shape: "This allowed ..." follows the feature sentence) and negative (no link words).
    var passage = { id: "P1", url: "https://www.nhm.ac.uk/x", tier: "evidence", text: "They had straight back legs, perpendicular to their bodies. This allowed them to use less energy to move than other reptiles. They lived on land." };
    function pairPack(mQuote) {
      var byId = { f: { claimId: "f", text: "Dinosaurs had straight back legs.", sourceQuote: "They had straight back legs, perpendicular to their bodies.", sourceRef: ["P1"], entailment: "supported" }, m: { claimId: "m", text: "Straight back legs let them use less energy to move.", sourceQuote: mQuote, sourceRef: ["P1"], entailment: "supported" } };
      return { byId: byId, readiness: { readyPairs: [{ feature: "straight back legs", featureClaimId: "f", mechanismClaimId: "m" }] } };
    }
    var linked = Finish.teachingPairs(pairPack("This allowed them to use less energy to move than other reptiles."), { passages: [passage] })[0];
    assert.strictEqual(linked.causalLink.result, "pass", JSON.stringify(linked.causalLink));
    assert.strictEqual(linked.causalLink.pointsBackToFeature, true);
    var listed = Finish.teachingPairs(pairPack("They lived on land."), { passages: [passage] })[0];
    assert.strictEqual(listed.causalLink.result, "fail", "a quote with no link words does not state the link");

    // Negative and positive vision rows.
    var good = Finish.teachingVisionRow({ id: "teach-u1", framing: "teaching", slotId: "teach", view: "comparison", feature: "legs" }, "", { featureVisible: "yes", matchesBeat: "yes", humansWithLivingDinosaurs: false, nonGroupAnimalShownAsGroup: false, mixedPeriods: false, anatomyProblems: [], textInImage: false, childSafety: "ok", animalKinds: 2, featureBox: { left: 60, top: 10, width: 35, height: 40 } });
    assert.strictEqual(good.ok, true, good.flags.join("; "));
    var bad = Finish.teachingVisionRow({ id: "teach-u1", framing: "teaching", slotId: "teach" }, "", { featureVisible: "partly", mixedPeriods: true, nonGroupAnimalShownAsGroup: true, humansWithLivingDinosaurs: true, childSafety: "ok" });
    assert.deepStrictEqual(bad.flags.slice(0, 4), ["feature visible: partly", "person beside a living dinosaur", "non-group animal shown as the lesson group", "animals from different periods together"]);
    var story = Finish.teachingVisionRow({ id: "hook", framing: "story", slotId: "hook" }, "", { featureVisible: "n/a", childSafety: "ok" });
    assert.strictEqual(story.ok, true, "a story picture is not asked to show a feature");
    var giveaway = Finish.teachingVisionRow({ id: "apply", framing: "example", slotId: "apply" }, "", { answerGivenAway: true, childSafety: "ok" });
    assert.ok(giveaway.flags.indexOf("picture gives the answer away") !== -1);

    // Check 6 negative: a timing total that is not 15 is flagged.
    var ctx = Finish.ruleContext(lesson.adventure, trace, { final: Finish.finalPackRow(trace, { log: logs.filter(function (l) { return l.stage === "KNOWLEDGE_PACK"; })[0] }) });
    var off = JSON.parse(JSON.stringify(lesson.adventure));
    off.activities[0].minutes = Number(off.activities[0].minutes) + 2;
    assert.ok(Finish.checkResearchRules(off, ctx).rows.some(function (r) { return r.rule === "timing"; }));
    // Check 5 negative: a recap sentence that loses the source's result is flagged.
    var lost = JSON.parse(JSON.stringify(lesson.adventure));
    var units = Finish.visualUnits(lost, ctx);
    var recap = lost.activities.filter(function (a) { return a.slotId === "recap"; })[0];
    var row = Finish.checkSentenceSupport(lost, ctx, units).rows.filter(function (r) { return r.slotId === "recap" && r.unitIds.length; })[0];
    assert.ok(row, "a recap beat cites a unit");
    if (row) {
      recap.beats.filter(function (b) { return b.id === row.beatId; })[0].pupil.text = "Dinosaurs were amazing creatures with many surprising secrets and colourful stories.";
      var again = Finish.checkSentenceSupport(lost, ctx, units).rows.filter(function (r) { return r.beatId === row.beatId; })[0];
      assert.strictEqual(again.ok, false, "a recap sentence with words not in the source and the result lost is flagged");
    }
    // Default finish (empty trace) adds none of this (see tests/source-grounded-finish.test.js).
    assert.strictEqual(Finish.ruleContext(lesson.adventure, {}, {}), null);
    var ledger = fs.readFileSync(path.join(dir, "ledger.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    assert.ok(ledger.every(function (r) { return r.event === "settled"; }));
    console.log("finish research-mode tests passed (" + ledger.length + " guarded calls on stubs)");
  });
}).catch(function (error) {
  console.log = originalLog;
  console.error(error);
  process.exit(1);
});
