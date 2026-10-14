"use strict";

// Patch 8: --reuse-pack DIR continues a source-grounded run from DIR's saved pack stage. The saved
// pack is validated, not trusted: the code checks (quote in its cited passage, entailment holds,
// selection, readiness gate) re-run before any call, and again inside the boot on the replayed
// model outputs. A pack that fails is refused with no call. Fixtures: the saved pack-stage
// outputs of live runs 15 (ready, 3 of 3) and 16 (2 of 3), trimmed to what the replay reads.
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");
var Brain = require("../js/lesson-brain.js");
var Replay = require("../scripts/source-grounded/pack-replay.js");

var fixtures = path.join(__dirname, "fixtures/pack-replay");
var request = { lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 };

// 1. A saved pack that passed the gate re-passes in code and reproduces its pack id.
var r15 = Replay.loadPackReplay(path.join(fixtures, "run15"));
assert.strictEqual(r15.label, "pack replayed from run15");
var ok = Replay.validateSavedPack(Brain, r15, request);
assert.strictEqual(ok.ok, true, ok.reason);
assert.strictEqual(ok.packId, "kp_1oujbmd");
assert.strictEqual(ok.distinctReady, 3);
assert.deepStrictEqual(ok.readyPairs.map(function (p) { return p.feature; }), ["nostrils further up", "webbed feet", "forelegs"]);

// 2. A saved pack that fails the readiness gate is refused.
var r16 = Replay.loadPackReplay(path.join(fixtures, "run16"));
var refused = Replay.validateSavedPack(Brain, r16, request);
assert.strictEqual(refused.ok, false);
assert.ok(/readiness gate \(2 of 3 pairs\)/.test(refused.reason), refused.reason);

// 3. Edited saved outputs are caught by the code checks, not trusted.
function tampered(edit) { var copy = JSON.parse(JSON.stringify(r15)); edit(copy); return Replay.validateSavedPack(Brain, copy, request); }
var badQuote = tampered(function (c) { c.rawPacks[c.usedIndex].claims.forEach(function (claim) { if (/webbed feet allowed/.test(claim.text)) claim.quote = "Its webbed feet were perfect for swimming fast across the sea."; }); });
assert.strictEqual(badQuote.ok, false, "a quote that is not in its cited passage is refused");
var badVerdict = tampered(function (c) { c.entailments[c.usedIndex].results.forEach(function (row) { if (row.claimId === "c1vv8t2k") row.verdict = "unsupported"; }); });
assert.strictEqual(badVerdict.ok, false, "an explanation the entailment check does not support is refused");
assert.ok(/2 of 3/.test(badVerdict.reason), badVerdict.reason);
// The patch-7 log rows lacked the model's wording list. Without the recovered list, "underwater"
// is unexplained and the code holds the nostrils explanation again, so recovery is only from proof.
var noRecovery = tampered(function (c) { c.entailments.forEach(function (e) { e.results.forEach(function (row) { row.wording = []; }); }); });
assert.strictEqual(noRecovery.ok, false);
assert.deepStrictEqual(r15.wordingRecovered.map(function (w) { return w.claimId + ":" + w.wording.join(","); }), ["c1vau61s:underwater", "c1vau61s:underwater", "coaldwm:letting"]);

// 4. The transport serves saved pack-stage outputs in order, refuses any extra pack-stage call,
// and sends nothing live until the boot has logged the saved pack as ready.
var t = Replay.createReplayTransport(r15);
function body(system) { return { messages: [{ role: "system", content: system }, { role: "user", content: "" }] }; }
assert.ok(t.route(body("You interpret one primary teacher's request. Return one JSON")).replay.learningGoal);
assert.ok(t.route(body("You select and adapt subject knowledge for one primary lesson")).replay.claims);
assert.ok(t.route(body("You check whether a source extract supports a sentence")).replay.results);
assert.ok(t.route(body("You select and adapt subject knowledge for one primary lesson")).replay.claims);
assert.ok(t.route(body("You check whether a source extract supports a sentence")).replay.results);
assert.ok(/no saved pack output left/.test(t.route(body("You select and adapt subject knowledge")).refuse));
assert.ok(/has not logged the replayed pack/.test(t.route(body("You are planning one primary lesson.")).refuse));
t.observe({ stage: "KNOWLEDGE_PACK", packId: "kp_other", packReadiness: { status: "ready" } });
assert.ok(/not the saved/.test(t.route(body("You are planning one primary lesson.")).refuse));
t.observe({ stage: "KNOWLEDGE_PACK", packId: "kp_1oujbmd", packReadiness: { status: "incomplete" } });
assert.ok(/did not pass the readiness gate/.test(t.route(body("You are planning one primary lesson.")).refuse));
t.observe({ stage: "KNOWLEDGE_PACK", packId: "kp_1oujbmd", packReadiness: { status: "ready", distinctReady: 3, requiredPairs: 3 } });
assert.strictEqual(t.route(body("You are planning one primary lesson.")).live, true);
assert.deepStrictEqual(t.summary().served, { intent: 1, pack: 2, entail: 2 });

// 5. The harness end to end (offline stubs, no paid call).
var root = path.join(__dirname, "..");
function harness(run) {
  var out = fs.mkdtempSync(path.join(os.tmpdir(), "pack-replay-"));
  var res = cp.spawnSync(process.execPath, ["-r", path.join(__dirname, "fixtures/source-grounded/preload.js"), path.join(root, "scripts/source-grounded/generate.js"), "--out", out, "--cap", "0.05", "--attempt", "replay-test", "--research", "wikipedia,openai", "--reuse-pack", path.join(fixtures, run), "--no-finish"], { env: Object.assign({}, process.env, { OPENAI_API_KEY: "offline-test" }), encoding: "utf8" });
  return { out: out, res: res };
}
var refusedRun = harness("run16");
assert.strictEqual(refusedRun.res.status, 3, "a failing saved pack exits 3");
assert.ok(/pack replayed from run16 refused: the saved pack fails the readiness gate/.test(refusedRun.res.stderr), refusedRun.res.stderr);
assert.ok(!/stage /.test(refusedRun.res.stdout), "no boot stage ran");
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(refusedRun.out, "sources/pack-replay-preflight.json"), "utf8")).preflight.ok, false);
var goodRun = harness("run15");
var trace = JSON.parse(fs.readFileSync(path.join(goodRun.out, "lesson/generate-trace.json"), "utf8"));
assert.strictEqual(trace.packReplay.label, "pack replayed from run15");
assert.strictEqual(trace.packReplay.bootPackId, "kp_1oujbmd");
assert.strictEqual(trace.packReplay.bootReadiness.status, "ready");
assert.deepStrictEqual(trace.outbound.slice(0, 5).map(function (o) { return o.kind; }), ["pack-replay", "pack-replay", "pack-replay", "pack-replay", "pack-replay"]);
assert.ok(trace.stages.indexOf("PLAN_REQUEST") > trace.stages.indexOf("KNOWLEDGE_PACK"), "the lesson continues live after the replayed gate");
assert.strictEqual(trace.outbound.filter(function (o) { return o.kind === "source"; }).length, 0, "no page fetched: the research record is replayed");
console.log("pack replay tests passed");
