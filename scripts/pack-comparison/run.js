"use strict";

/* Pack model comparison runner (test script only).

   node scripts/pack-comparison/run.js --out DIR --preflight-only
   node scripts/pack-comparison/run.js --out DIR --live

   - Teacher intent: saved raw intents (frozen-intents.json) are normalised and
     applied with the frozen code; the rest are generated once with the intent
     model and shared by both arms.
   - Pack prompt: brain.knowledgePackBrief(ctx) from js/lesson-brain.js,
     unchanged. Only the model name differs between arms.
   - Every paid call passes the budget guard first (call limit and spend cap,
     using the worst case of the next call). Retries are for transport errors
     only, from a fixed retry budget = maxCalls - planned calls.
   - Without --live, nothing is sent anywhere: the caller must inject a client
     (the offline test does this). */

var fs = require("fs");
var path = require("path");
var childProcess = require("child_process");
var lib = require("./lib");

var HARNESS_FILES = ["lib.js", "run.js", "analyse.js", "blind-export.js", "offline.test.js", "config.json", "inputs.json", "frozen-intents.json", "preflight-tokens.py", "README.md"];
// Upper bound on the characters a normalised teacher intent can add to the
// pack prompt (goal 240 + evidence 280 + focus 4x80 + prior/exclusions 8x120 +
// preferences 4x40 + JSON keys). Used only for the preflight worst case of
// tests whose intent is generated during the run.
var INTENT_CHAR_MARGIN = 2400;

function gitHead() {
  try { return childProcess.execSync("git rev-parse HEAD", { cwd: lib.REPO_ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch (e) { return ""; }
}

function manifest(config) {
  var files = {};
  HARNESS_FILES.forEach(function (name) {
    var file = path.join(__dirname, name);
    if (fs.existsSync(file)) files["scripts/pack-comparison/" + name] = lib.fileSha256(file);
  });
  return {
    gitHead: gitHead(),
    frozenCommit: config.frozenCommit,
    lessonBrainSha256: lib.fileSha256(path.join(lib.REPO_ROOT, "js/lesson-brain.js")),
    harnessFiles: files,
    node: process.version
  };
}

function resolveTests(inputs, frozenIntents) {
  return inputs.tests.map(function (test) {
    var t = lib.clone(test);
    if (t.intent === "saved") {
      var saved = frozenIntents[t.id];
      if (!saved) throw new Error("No saved intent for " + t.id);
      t.context = lib.clone(saved.context);
      t.savedIntent = { raw: saved.rawTeacherIntent, sourceArtifact: saved.sourceArtifact, sourceSha256: saved.sourceSha256, generatedBy: saved.generatedBy };
    }
    return t;
  });
}

function preflight(brain, config, tests, guard, retryBudget) {
  var rows = [];
  var prompts = [];
  var maxPackWorst = 0;
  var total = 0;
  var listedTotal = 0;
  function listedWorst(model, messages) {
    var p = config.listedPricesUsdPer1M[model];
    return (guard.estimatePromptTokens(messages) * p.input + config.maxTokens * p.output) / 1e6;
  }
  tests.forEach(function (test) {
    var ctx = lib.clone(test.context);
    var intentMessages = null;
    if (test.intent === "generate") {
      intentMessages = lib.briefMessages(brain.teacherIntentBrief(ctx));
      var iw = guard.worstCase(config.intentModel, intentMessages, config.maxTokens);
      total += iw;
      listedTotal += listedWorst(config.intentModel, intentMessages);
      prompts.push({ test: test.id, kind: "intent", model: config.intentModel, calls: 1, messages: intentMessages, marginChars: 0 });
      rows.push({ test: test.id, kind: "intent", model: config.intentModel, calls: 1, promptChars: lib.promptChars(intentMessages), estPromptTokens: guard.estimatePromptTokens(intentMessages), guardWorstUsd: iw });
    } else {
      brain.applyTeacherIntent(ctx, brain.normaliseTeacherIntent(test.savedIntent.raw, ctx));
    }
    var packMessages = lib.briefMessages(brain.knowledgePackBrief(ctx));
    if (test.intent === "generate") packMessages[1] = { role: "user", content: packMessages[1].content + new Array(INTENT_CHAR_MARGIN + 1).join(" ") };
    prompts.push({ test: test.id, kind: "pack", messages: packMessages, marginChars: test.intent === "generate" ? INTENT_CHAR_MARGIN : 0 });
    Object.keys(config.arms).forEach(function (arm) {
      var model = config.arms[arm];
      var w = guard.worstCase(model, packMessages, config.maxTokens);
      total += w * config.repeats;
      listedTotal += listedWorst(model, packMessages) * config.repeats;
      maxPackWorst = Math.max(maxPackWorst, w);
      rows.push({ test: test.id, kind: "pack", arm: arm, model: model, calls: config.repeats, promptChars: lib.promptChars(packMessages), estPromptTokens: guard.estimatePromptTokens(packMessages), guardWorstUsdPerCall: w, intentMarginChars: test.intent === "generate" ? INTENT_CHAR_MARGIN : 0 });
    });
  });
  var retriesWorst = retryBudget * maxPackWorst;
  return {
    method: "prompt tokens = ceil(chars / " + config.promptCharsPerToken + ") + " + config.promptOverheadTokens + "; output = maxTokens " + config.maxTokens + "; guard prices = listed x " + config.guardPriceMultiplier + "; retries priced at the most expensive pack call",
    rows: rows,
    retryBudget: retryBudget,
    retriesGuardWorstUsd: retriesWorst,
    plannedGuardWorstUsd: total,
    totalGuardWorstUsd: total + retriesWorst,
    plannedListedWorstUsd: listedTotal,
    totalListedWorstUsd: listedTotal + retryBudget * maxPackWorst / config.guardPriceMultiplier,
    capUsd: config.capUsd,
    withinCap: total + retriesWorst <= config.capUsd,
    prompts: prompts
  };
}

async function runComparison(opts) {
  var config = opts.config;
  var outDir = opts.outDir;
  var brain = opts.brain || lib.loadBrain();
  var tests = resolveTests(opts.inputs, opts.frozenIntents);
  var log = opts.log || function () {};
  fs.mkdirSync(path.join(outDir, "calls"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "runs"), { recursive: true });
  var ledgerFile = path.join(outDir, "ledger.jsonl");
  var guard = lib.createBudgetGuard(config);

  var plannedIntent = tests.filter(function (t) { return t.intent === "generate"; }).length;
  var plannedPack = tests.length * Object.keys(config.arms).length * config.repeats;
  var retryBudget = config.maxCalls - plannedIntent - plannedPack;
  if (retryBudget < 0) throw new Error("Planned calls exceed maxCalls");

  var man = manifest(config);
  man.startedAt = new Date().toISOString();
  man.config = config;
  man.plannedCalls = { intent: plannedIntent, pack: plannedPack, retryBudget: retryBudget, maxCalls: config.maxCalls };
  lib.writeJson(path.join(outDir, "manifest.json"), man);

  // Preflight worst case. Reduce retries first if over the cap.
  var worst = preflight(brain, config, tests, guard, retryBudget);
  while (!worst.withinCap && retryBudget > 0) {
    retryBudget -= 1;
    worst = preflight(brain, config, tests, guard, retryBudget);
  }
  lib.writeJson(path.join(outDir, "preflight-prompts.json"), worst.prompts);
  delete worst.prompts;
  lib.writeJson(path.join(outDir, "worst-case.json"), worst);
  if (!worst.withinCap) {
    lib.writeJson(path.join(outDir, "stop.json"), { reason: "PREFLIGHT_OVER_CAP", worst: worst.totalGuardWorstUsd, cap: config.capUsd });
    return { stopped: "PREFLIGHT_OVER_CAP", worst: worst };
  }
  if (opts.preflightOnly) return { preflightOnly: true, worst: worst };
  if (!opts.client) throw new Error("No model client. Pass --live (real API) or inject a client (offline test).");

  var seq = 0;
  var retriesUsed = 0;
  var stop = null;

  async function paidCall(kind, label, model, messages) {
    var attempts = [];
    for (;;) {
      var chk = guard.check(model, messages, config.maxTokens);
      if (!chk.ok) {
        stop = stop || { reason: chk.reason, at: new Date().toISOString(), label: label, guard: guard.state() };
        return { ok: false, stopped: chk.reason, attempts: attempts };
      }
      guard.begin();
      seq += 1;
      var res = await opts.client.chat({ model: model, messages: messages, temperature: config.temperature, maxTokens: config.maxTokens, timeoutMs: config.timeoutMs });
      var cost = guard.settle(model, messages, config.maxTokens, res.usage);
      var st = guard.state();
      var name = String(seq).padStart(4, "0") + "-" + label + "-a" + (attempts.length + 1) + ".json";
      var record = {
        seq: seq,
        at: new Date().toISOString(),
        kind: kind,
        label: label,
        attempt: attempts.length + 1,
        isRetry: attempts.length > 0,
        request: { model: model, temperature: config.temperature, response_format: { type: "json_object" }, max_tokens: config.maxTokens, timeoutMs: config.timeoutMs, messagesSha256: lib.sha256(JSON.stringify(messages)) },
        response: { ok: res.ok, httpStatus: res.httpStatus, errorCategory: res.errorCategory, errorMessage: res.errorMessage || "", requestId: res.requestId, returnedModel: res.returnedModel, finishReason: res.finishReason || "", usage: res.usage, latencyMs: res.latencyMs, content: res.content, rawBody: res.rawBody },
        cost: { listedUsd: cost.listedUsd, guardUsd: cost.guardUsd, cumulativeListedUsd: st.spentListedUsd, cumulativeGuardUsd: st.spentGuardUsd, callsSoFar: st.calls }
      };
      lib.writeJson(path.join(outDir, "calls", name), record);
      fs.appendFileSync(ledgerFile, JSON.stringify({
        seq: seq, at: record.at, kind: kind, label: label, model: model, attempt: record.attempt, isRetry: record.isRetry,
        ok: res.ok, httpStatus: res.httpStatus, errorCategory: res.errorCategory, latencyMs: res.latencyMs,
        promptTokens: res.usage ? res.usage.prompt_tokens : null, completionTokens: res.usage ? res.usage.completion_tokens : null,
        listedUsd: cost.listedUsd, guardUsd: cost.guardUsd, cumulativeListedUsd: st.spentListedUsd, cumulativeGuardUsd: st.spentGuardUsd, callsSoFar: st.calls, file: "calls/" + name
      }) + "\n");
      attempts.push({ file: "calls/" + name, ok: res.ok, errorCategory: res.errorCategory, latencyMs: res.latencyMs, usage: res.usage, listedUsd: cost.listedUsd });
      log(kind + " " + label + " attempt " + attempts.length + ": " + (res.ok ? "ok" : res.errorCategory) + " " + res.latencyMs + "ms");
      if (res.ok) return { ok: true, result: res, attempts: attempts };
      if (lib.isRetryable(res) && retriesUsed < retryBudget) { retriesUsed += 1; continue; }
      return { ok: false, result: res, attempts: attempts };
    }
  }

  // 1. Freeze teacher intents and pack prompts.
  var frozen = { createdAt: new Date().toISOString(), tests: {} };
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var ctx = lib.clone(test.context);
    var rawIntent = null;
    var intentSource;
    if (test.intent === "saved") {
      rawIntent = test.savedIntent.raw;
      intentSource = { type: "saved", sourceArtifact: test.savedIntent.sourceArtifact, sourceSha256: test.savedIntent.sourceSha256, generatedBy: test.savedIntent.generatedBy };
    } else {
      var intentMessages = lib.briefMessages(brain.teacherIntentBrief(ctx));
      var ir = await paidCall("intent", "intent-" + test.id, config.intentModel, intentMessages);
      intentSource = { type: "generated", model: config.intentModel, ok: ir.ok, attempts: ir.attempts, stopped: ir.stopped || "" };
      if (ir.ok) {
        var parsedIntent = lib.parseContent(ir.result.content);
        rawIntent = parsedIntent.parsed;
        intentSource.parseError = parsedIntent.parseError;
      }
      if (stop) break;
    }
    // Same as the production boot: a failed intent is applied as { ok: false }.
    var normalised = rawIntent ? brain.normaliseTeacherIntent(rawIntent, ctx) : { ok: false, reason: "error" };
    brain.applyTeacherIntent(ctx, normalised);
    var packBrief = brain.knowledgePackBrief(ctx);
    frozen.tests[test.id] = {
      id: test.id,
      group: test.group,
      frozenCount: test.frozenCount,
      runtimeStrandPairsRequired: JSON.parse(packBrief.user).strandPairsRequired,
      teachingScope: brain.teachingScope(ctx),
      contextInput: test.context,
      contextAfterIntent: ctx,
      intentSource: intentSource,
      rawTeacherIntent: rawIntent,
      normalisedTeacherIntent: normalised,
      packMessages: lib.briefMessages(packBrief),
      packMessagesSha256: lib.sha256(JSON.stringify(lib.briefMessages(packBrief)))
    };
  }
  lib.writeJson(path.join(outDir, "frozen-inputs.json"), frozen);

  // 2. Pack runs in seeded random order.
  var runList = [];
  tests.forEach(function (test) {
    Object.keys(config.arms).forEach(function (arm) {
      for (var r = 1; r <= config.repeats; r++) runList.push({ runId: arm + "-" + test.id + "-r" + r, arm: arm, model: config.arms[arm], test: test.id, group: test.group, rep: r });
    });
  });
  var ordered = lib.shuffle(runList, config.runOrderSeed);
  lib.writeJson(path.join(outDir, "run-order.json"), { seed: config.runOrderSeed, order: ordered.map(function (r) { return r.runId; }) });

  for (var k = 0; k < ordered.length; k++) {
    var run = ordered[k];
    var runFile = path.join(outDir, "runs", run.runId + ".json");
    var f = frozen.tests[run.test];
    if (stop || !f) {
      lib.writeJson(runFile, Object.assign({}, run, { order: k + 1, executed: false, reason: stop ? "stopped: " + stop.reason : "no frozen input" }));
      continue;
    }
    var pr = await paidCall("pack", "pack-" + run.runId, run.model, f.packMessages);
    var final = pr.result || null;
    var parsed = final && final.ok ? lib.parseContent(final.content) : { parsed: null, parseError: final ? "no content: " + final.errorCategory : "not executed" };
    lib.writeJson(runFile, Object.assign({}, run, {
      order: k + 1,
      executed: pr.attempts.length > 0,
      stopped: pr.stopped || "",
      ok: pr.ok,
      attempts: pr.attempts,
      final: final ? { httpStatus: final.httpStatus, errorCategory: final.errorCategory, returnedModel: final.returnedModel, finishReason: final.finishReason || "", usage: final.usage, latencyMs: final.latencyMs, content: final.content } : null,
      parsedPack: parsed.parsed,
      parseError: parsed.parseError
    }));
  }

  var st = guard.state();
  var end = { finishedAt: new Date().toISOString(), calls: st.calls, retriesUsed: retriesUsed, retryBudget: retryBudget, spentListedUsd: st.spentListedUsd, spentGuardUsd: st.spentGuardUsd, stop: stop };
  lib.writeJson(path.join(outDir, "run-summary.json"), end);
  if (stop) lib.writeJson(path.join(outDir, "stop.json"), stop);
  return end;
}

module.exports = { runComparison: runComparison, preflight: preflight, resolveTests: resolveTests, HARNESS_FILES: HARNESS_FILES };

if (require.main === module) {
  (async function () {
    var args = process.argv.slice(2);
    var outIdx = args.indexOf("--out");
    if (outIdx === -1 || !args[outIdx + 1]) { console.error("--out DIR is required"); process.exit(2); }
    var outDir = path.resolve(args[outIdx + 1]);
    var live = args.indexOf("--live") !== -1;
    var preflightOnly = args.indexOf("--preflight-only") !== -1;
    if (fs.existsSync(path.join(outDir, "ledger.jsonl"))) { console.error("Output folder already has a ledger. Use a new folder; earlier artifacts are not overwritten."); process.exit(2); }
    var config = lib.loadJson(path.join(__dirname, "config.json"));
    var inputs = lib.loadJson(path.join(__dirname, "inputs.json"));
    var frozenIntents = lib.loadJson(path.join(__dirname, "frozen-intents.json"));
    var client = null;
    if (live) {
      var key = String(process.env.OPENAI_API_KEY || "").trim();
      if (!key) { console.error("OPENAI_API_KEY is not set. No call made."); process.exit(2); }
      client = lib.createOpenAIClient({ apiKey: key, fetchImpl: global.fetch });
    } else if (!preflightOnly) {
      console.error("Refusing to run without --live or --preflight-only."); process.exit(2);
    }
    var result = await runComparison({ outDir: outDir, config: config, inputs: inputs, frozenIntents: frozenIntents, client: client, preflightOnly: preflightOnly, log: function (line) { console.log(line); } });
    console.log(JSON.stringify(result.worst ? { worstCaseGuardUsd: result.worst.totalGuardWorstUsd, withinCap: result.worst.withinCap } : result, null, 2));
  })().catch(function (e) { console.error(e && e.stack || e); process.exit(1); });
}
