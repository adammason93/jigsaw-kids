"use strict";

/* Offline test for the pack comparison harness. No network, no paid calls.
   node scripts/pack-comparison/offline.test.js
   Drives the real client, runner, guard, analysis and blind export with a
   mocked fetch. */

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var childProcess = require("child_process");
var lib = require("./lib");
var runner = require("./run");
var analyser = require("./analyse");
var blind = require("./blind-export");

var brain = lib.loadBrain();
var baseConfig = lib.loadJson(path.join(__dirname, "config.json"));
var inputs = lib.loadJson(path.join(__dirname, "inputs.json"));
var frozenIntents = lib.loadJson(path.join(__dirname, "frozen-intents.json"));
var passed = 0;

function ok(name) { passed += 1; console.log("ok - " + name); }

function response(status, body, delayMs) {
  var text = typeof body === "string" ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status: status, headers: { get: function (h) { return h === "x-request-id" ? "req_mock" : null; } }, text: function () { return Promise.resolve(text); } };
}

var MOCK_PACK = {
  status: "usable", falsePremise: false, blockReason: "", niche: false,
  claims: [
    { text: "Leaves are flat and wide.", kind: "fact", depth: "concrete", confidence: "high", provenance: "model", teacherRequested: false, factuallyVerified: false, contested: false, uncertainty: null, ageFit: { from: 1, to: 6 }, correctsPremise: false, importance: "core", accepted: true },
    { text: "Flat, wide leaves catch more sunlight, so the plant can make more food.", kind: "mechanism", depth: "mechanism", confidence: "high", provenance: "model", teacherRequested: false, factuallyVerified: false, contested: false, uncertainty: null, ageFit: { from: 2, to: 6 }, correctsPremise: false, importance: "core", accepted: true },
    { text: "Roots grow down into the soil.", kind: "fact", depth: "concrete", confidence: "high", provenance: "model", teacherRequested: false, factuallyVerified: false, contested: false, uncertainty: null, ageFit: { from: 1, to: 6 }, correctsPremise: false, importance: "core", accepted: true }
  ],
  mechanisms: [{ text: "Flat, wide leaves catch more sunlight, so the plant can make more food.", feature: "flat and wide" }],
  concepts: ["leaves"], vocabulary: [{ term: "sunlight", gloss: "light from the Sun" }], misconceptions: [], openQuestions: []
};
var MOCK_INTENT = { yearGroup: "", subject: "", subjectConfidence: "explicit", learningGoal: "Pupils understand the idea the teacher asked for.", requiredEvidence: "Explain the relationship the teacher asked about in their own words.", focusConcepts: ["main idea"], priorKnowledge: [], exclusions: [], preferences: [], durationMinutes: null };

function mockFetch(behaviour) {
  var n = 0;
  return function (url, init) {
    n += 1;
    assert.strictEqual(url, "https://api.openai.com/v1/chat/completions");
    var body = JSON.parse(init.body);
    assert.strictEqual(body.temperature, 0);
    assert.deepStrictEqual(body.response_format, { type: "json_object" });
    assert.strictEqual(body.max_tokens, 4000);
    var b = behaviour ? behaviour(n, body) : null;
    if (b === "hang") {
      return new Promise(function (resolve, reject) {
        init.signal.addEventListener("abort", function () { var e = new Error("aborted"); e.name = "AbortError"; reject(e); });
      });
    }
    if (b && b.status) return Promise.resolve(response(b.status, b.body || { error: { message: "mock" } }));
    var isIntent = /interpret one primary teacher's request/.test(body.messages[0].content);
    var content = JSON.stringify(isIntent ? MOCK_INTENT : MOCK_PACK);
    var usage = b && b.usage ? b.usage : { prompt_tokens: 1500, completion_tokens: 600, total_tokens: 2100 };
    return Promise.resolve(response(200, { id: "x", model: body.model + "-mockreturned", choices: [{ message: { content: content }, finish_reason: "stop" }], usage: usage }));
  };
}

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "pack-compare-test-")); }

async function run(configPatch, fetchImpl) {
  var dir = tmp();
  var config = Object.assign({}, baseConfig, configPatch || {});
  var client = lib.createOpenAIClient({ apiKey: "sk-test-not-real", fetchImpl: fetchImpl });
  var res = await runner.runComparison({ outDir: dir, config: config, inputs: inputs, frozenIntents: frozenIntents, client: client, brain: brain });
  return { dir: dir, res: res, config: config };
}

function ledger(dir) { return fs.readFileSync(path.join(dir, "ledger.jsonl"), "utf8").split("\n").filter(Boolean).map(JSON.parse); }

(async function () {
  // 1. Guard stops at the call limit.
  var g = lib.createBudgetGuard(Object.assign({}, baseConfig, { capUsd: 1e9 }));
  var msgs = [{ role: "system", content: "x" }, { role: "user", content: "y" }];
  var made = 0;
  while (g.check("gpt-4.1-2025-04-14", msgs, 4000).ok) { g.begin(); g.settle("gpt-4.1-2025-04-14", msgs, 4000, { prompt_tokens: 10, completion_tokens: 10 }); made += 1; if (made > 100) break; }
  assert.strictEqual(made, 40);
  assert.strictEqual(g.state().stopped.reason, "CALL_LIMIT");
  ok("budget guard stops at 40 calls");

  // 2. Guard stops at the spend cap, using the worst case of the next call.
  var g2 = lib.createBudgetGuard(Object.assign({}, baseConfig, { capUsd: 0.5 }));
  var n2 = 0;
  while (g2.check("gpt-4.1-2025-04-14", msgs, 4000).ok) { g2.begin(); g2.settle("gpt-4.1-2025-04-14", msgs, 4000, null); n2 += 1; if (n2 > 100) break; }
  assert.strictEqual(g2.state().stopped.reason, "SPEND_CAP");
  assert.ok(g2.state().spentGuardUsd <= 0.5 + 1e-12, "guard spend never exceeds cap");
  assert.ok(g2.state().spentGuardUsd + g2.worstCase("gpt-4.1-2025-04-14", msgs, 4000) > 0.5);
  ok("budget guard stops before the spend cap (" + n2 + " worst-case calls under $0.50)");

  // 3. Timeout aborts the request.
  var hanging = lib.createOpenAIClient({ apiKey: "sk-test-not-real", fetchImpl: mockFetch(function () { return "hang"; }) });
  var t0 = Date.now();
  var tr = await hanging.chat({ model: "gpt-4.1-2025-04-14", messages: msgs, temperature: 0, maxTokens: 4000, timeoutMs: 50 });
  assert.strictEqual(tr.ok, false);
  assert.strictEqual(tr.errorCategory, "timeout");
  assert.ok(Date.now() - t0 < 2000);
  assert.ok(lib.isRetryable(tr));
  ok("timeout aborts and is classed as a retryable transport error");

  // 4. Full mocked run: outputs saved per call, 36 calls (4 intent + 32 pack).
  var a = await run({}, mockFetch());
  var L = ledger(a.dir);
  assert.strictEqual(L.length, 36);
  assert.strictEqual(L.filter(function (l) { return l.kind === "intent"; }).length, 4);
  assert.strictEqual(fs.readdirSync(path.join(a.dir, "calls")).length, 36);
  var runFiles = fs.readdirSync(path.join(a.dir, "runs"));
  assert.strictEqual(runFiles.length, 32);
  runFiles.forEach(function (f) {
    var r = lib.loadJson(path.join(a.dir, "runs", f));
    assert.ok(r.executed && r.ok && r.parsedPack, f);
  });
  var call1 = lib.loadJson(path.join(a.dir, "calls", fs.readdirSync(path.join(a.dir, "calls"))[0]));
  assert.ok(call1.response.rawBody && call1.response.usage && call1.response.latencyMs >= 0);
  assert.ok(JSON.stringify(call1).indexOf("sk-test-not-real") === -1, "API key never saved");
  assert.ok(fs.existsSync(path.join(a.dir, "worst-case.json")) && fs.existsSync(path.join(a.dir, "frozen-inputs.json")) && fs.existsSync(path.join(a.dir, "run-order.json")));
  var frozen = lib.loadJson(path.join(a.dir, "frozen-inputs.json"));
  ["T3", "T4", "T6", "T8"].forEach(function (t) { assert.strictEqual(frozen.tests[t].intentSource.type, "saved"); });
  Object.keys(frozen.tests).forEach(function (t) { assert.strictEqual(frozen.tests[t].runtimeStrandPairsRequired, frozen.tests[t].frozenCount, t + " runtime count equals frozen count"); });
  var packB = lib.loadJson(path.join(a.dir, "runs", "B-T6-r1.json"));
  var packA = lib.loadJson(path.join(a.dir, "runs", "A-T6-r1.json"));
  var callB = lib.loadJson(path.join(a.dir, packB.attempts[0].file));
  var callA = lib.loadJson(path.join(a.dir, packA.attempts[0].file));
  assert.strictEqual(callA.request.messagesSha256, callB.request.messagesSha256, "both arms get the identical pack prompt");
  assert.notStrictEqual(callA.request.model, callB.request.model);
  ok("mocked run saves every call, 36 calls, identical prompts across arms, frozen counts hold");

  // 5. Transport retry is used and logged; persistent failures stop at 40 calls.
  var b = await run({}, mockFetch(function (n, body) { return n === 6 ? { status: 500 } : null; }));
  var LB = ledger(b.dir);
  assert.strictEqual(LB.length, 37);
  assert.strictEqual(LB.filter(function (l) { return l.isRetry; }).length, 1);
  var c = await run({}, mockFetch(function (n, body) { return /interpret one primary/.test(body.messages[0].content) ? null : { status: 503 }; }));
  var LC = ledger(c.dir);
  assert.strictEqual(LC.length, 40, "never more than 40 paid calls");
  assert.strictEqual(LC.filter(function (l) { return l.isRetry; }).length, 4);
  ok("transport retries logged; persistent errors cap at 40 calls");

  // 6. Spend cap stops a full run and records the stop. Preflight passes at the
  // real cap; the mock reports very large usage so recorded spend hits the cap.
  var big = { usage: { prompt_tokens: 1500, completion_tokens: 60000, total_tokens: 61500 } };
  var d = await run({}, mockFetch(function () { return big; }));
  var stop = lib.loadJson(path.join(d.dir, "stop.json"));
  assert.strictEqual(stop.reason, "SPEND_CAP");
  var sum = lib.loadJson(path.join(d.dir, "run-summary.json"));
  // The mock's usage (60k output tokens) is impossible under max_tokens 4000,
  // so it overshoots its own worst case; the guard still stops at the next
  // pre-call check, and the overshoot is bounded by that one call.
  var LD = ledger(d.dir);
  var last = LD[LD.length - 1];
  assert.ok(sum.spentGuardUsd - last.guardUsd <= 2.5 + 1e-12, "spend before the last call was within cap");
  assert.ok(sum.spentGuardUsd + 0 > 2.5 - 1, "spend approached the cap");
  var notRun = fs.readdirSync(path.join(d.dir, "runs")).map(function (f) { return lib.loadJson(path.join(d.dir, "runs", f)); }).filter(function (r) { return !r.executed; });
  assert.ok(notRun.length > 0);
  ok("spend cap stops the run at the next pre-call check (" + sum.calls + " calls; mock usage deliberately exceeds max_tokens)");

  // 7. Gate agreement runs the unchanged assessPackReadiness.
  var an = analyser.analyse(a.dir, brain);
  var rec = an.records.filter(function (r) { return r.runId === "A-T1-r1"; })[0];
  var ctx = lib.clone(frozen.tests.T1.contextAfterIntent);
  var pack = brain.normaliseKnowledgePack(lib.clone(MOCK_PACK), ctx);
  var sel = brain.selectPackForLesson(pack, ctx);
  var rd = brain.assessPackReadiness(pack, sel, ctx);
  assert.strictEqual(rec.gate.distinctReady, rd.distinctReady);
  assert.strictEqual(rec.gate.readinessStatus, rd.status);
  assert.strictEqual(rec.gate.requiredPairs, rd.requiredPairs);
  assert.ok(fs.existsSync(path.join(a.dir, "analysis", "SUMMARY.md")));
  try {
    childProcess.execSync("git diff --quiet " + baseConfig.frozenCommit + " -- js/", { cwd: lib.REPO_ROOT, stdio: "ignore" });
    ok("gate agreement uses unchanged assessPackReadiness; js/ identical to frozen commit");
  } catch (e) {
    if (e.status === 1) throw new Error("js/ differs from the frozen commit");
    ok("gate agreement uses unchanged assessPackReadiness (git not available to diff js/)");
  }

  // 8. Blinding strips model names, latency, tokens and re-keys ids.
  var be = blind.exportBlind(a.dir, { brain: brain, blindSeed: 12345 });
  assert.strictEqual(be.packets, 28);
  assert.ok(!fs.existsSync(path.join(a.dir, "blind", "UNBLIND_KEY.json")));
  var key = lib.loadJson(be.keyFile);
  fs.readdirSync(path.join(a.dir, "blind")).forEach(function (f) {
    var text = fs.readFileSync(path.join(a.dir, "blind", f), "utf8");
    assert.ok(!/gpt|4o-mini|4\.1|mockreturned|latency|tokens|listedUsd|runId|[AB]-T\d-r\d/i.test(text), "identifying text in " + f);
    Object.keys(key.packets).forEach(function (id) {
      Object.keys(key.packets[id].claimIdMap).forEach(function (k) { assert.ok(text.indexOf(key.packets[id].claimIdMap[k]) === -1, "original claim id in " + f); });
    });
  });
  var p1 = lib.loadJson(path.join(a.dir, "blind", "BP-01.json"));
  assert.ok(p1.claims.every(function (cl) { return /^K\d+$/.test(cl.id); }));
  assert.strictEqual(key.blindSeed, 12345);
  ok("blind packets strip model names, latency, tokens; claim ids re-keyed; key kept outside blind/");

  console.log("\n" + passed + " checks passed (offline; no network, no paid calls).");
})().catch(function (e) { console.error("FAIL:", e && e.stack || e); process.exit(1); });
