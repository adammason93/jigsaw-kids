"use strict";

/* Real end-to-end run of the source-grounded lesson flow through the production boot
   (js/learn-generate-boot.js) with the local lesson-brain.js and source-research.js.
   Supabase auth is stubbed so the boot can start. Every OpenAI call goes through the
   spend guard. Research fetches go only to allowlisted hosts. Nothing is hand-written:
   the lesson is whatever the boot returns.

   Usage: OPENAI_API_KEY=... node scripts/source-grounded/generate.js --out DIR --cap USD
          [--research wikipedia,openai] [--attempt NAME] [--ledger FILE]
   --ledger lets several runs share one ledger, so one cap covers them all.
   Writes DIR/lesson/generate-response.json, DIR/lesson/generate-trace.json,
   DIR/sources/research-record.json, DIR/sources/knowledge-pack.json.
   When the boot returns a complete lesson, the same run finishes it (finish.js): 4 images,
   checks 1-4, DIR/lesson/lesson.html and lesson.json. --no-finish skips that; --images N.
   --reuse-research a.json,b.json replays earlier runs' search results (no paid search). */

var fs = require("fs");
var path = require("path");
var Guard = require("./spend-guard.js");
var Research = require("../../js/source-research.js");
var Finish = require("./finish.js");

function arg(name, fallback) {
  var at = process.argv.indexOf("--" + name);
  return at !== -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}
var outDir = path.resolve(arg("out", "out/source-grounded"));
var capUsd = Number(arg("cap", "0"));
var researchMode = arg("research", "wikipedia,openai");
var attempt = arg("attempt", "run1");
var key = String(process.env.OPENAI_API_KEY || "").trim();
if (!key) { console.error("OPENAI_API_KEY is not set. No call was made."); process.exit(2); }
["lesson", "sources"].forEach(function (dir) { fs.mkdirSync(path.join(outDir, dir), { recursive: true }); });

var root = path.join(__dirname, "../..");
var brainSource = fs.readFileSync(path.join(root, "js/lesson-brain.js"), "utf8");
var researchSource = fs.readFileSync(path.join(root, "js/source-research.js"), "utf8");
// --reuse-research a.json,b.json: replay the pages earlier paid web searches found (their
// research-record.json "discovered" rows from openai-web-search), instead of paying for new
// searches. Harness only: every page is still fetched live and goes through the same tiers,
// diversity, passage ranking and gates. The record names the provider "openai-web-search-replay".
var reuseFiles = String(arg("reuse-research", "")).split(",").filter(Boolean);
if (reuseFiles.length) {
  var replay = [];
  var seenReplay = {};
  var lists = reuseFiles.map(function (file) {
    var record = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    return (record.discovered || []).filter(function (row) { return row.provider === "openai-web-search"; });
  });
  var longestReplay = Math.max.apply(null, lists.map(function (l) { return l.length; }).concat([0]));
  for (var ri = 0; ri < longestReplay; ri++) lists.forEach(function (list) {
    var row = list[ri];
    if (!row) return;
    var k = String(row.url).replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
    if (seenReplay[k]) return;
    seenReplay[k] = 1;
    replay.push({ url: row.url, title: row.title || "", description: row.description || "", provider: "openai-web-search-replay", query: row.query || "", via: "replay" });
  });
  researchSource += "\n;(function () { var R = globalThis.WondiiSourceResearch; var saved = " + JSON.stringify(replay) + "; R.openaiWebSearchProvider = function () { return { id: \"openai-web-search-replay\", paid: false, search: function () { return Promise.resolve({ calls: 0, candidates: saved.slice() }); } }; }; })();\n";
}
var boot = fs.readFileSync(path.join(root, "js/learn-generate-boot.js"), "utf8");
var marker = "const brain = globalThis.WondiiLessonBrain;";
if (boot.indexOf(marker) === -1) { console.error("boot marker missing"); process.exit(1); }
// Trace hooks only observe: they copy what the boot passes and return the original result.
boot = boot.replace(marker, marker + "\n" + [
  "globalThis.__sgTrace = globalThis.__sgTrace || { plans: [], packs: [], rawPacks: [] };",
  "const __sgBrief = brain.knowledgePackBrief.bind(brain);",
  "brain.knowledgePackBrief = function (ctx) { try { globalThis.__sgTrace.research = ctx && ctx.researchEvidence ? JSON.parse(JSON.stringify(ctx.researchEvidence)) : null; globalThis.__sgTrace.intent = ctx && ctx.lessonBrief ? JSON.parse(JSON.stringify(ctx.lessonBrief.teacherIntent || null)) : null; } catch (e) {} return __sgBrief(ctx); };",
  "const __sgNormPack = brain.normaliseKnowledgePack.bind(brain);",
  "brain.normaliseKnowledgePack = function (raw, ctx) { try { globalThis.__sgTrace.rawPacks.push(JSON.parse(JSON.stringify(raw))); } catch (e) {} return __sgNormPack(raw, ctx); };",
  "const __sgSelect = brain.selectPackForLesson.bind(brain);",
  "brain.selectPackForLesson = function (pack, ctx) { var s = __sgSelect(pack, ctx); try { var copy = { pack: JSON.parse(JSON.stringify(pack)), selection: JSON.parse(JSON.stringify(s)) }; var seen = globalThis.__sgTrace.packs.filter(function (row) { return row.pack.id === copy.pack.id; })[0]; if (seen) { seen.pack = copy.pack; seen.selection = copy.selection; } else globalThis.__sgTrace.packs.push(copy); } catch (e) {} return s; };",
  "const __sgNormPlan = brain.normalisePlan.bind(brain);",
  "brain.normalisePlan = function (raw, ctx) { var r = __sgNormPlan(raw, ctx); try { globalThis.__sgTrace.plans.push({ raw: JSON.parse(JSON.stringify(raw)), learningMap: r && r.plan && r.plan.learningMap ? JSON.parse(JSON.stringify(r.plan.learningMap)) : null, ok: !!(r && r.ok), issues: (r && r.issues) || [], depth: r && r.depth || null, mapRejected: r && (r.mapRejected || (r.plan && r.plan.mapRejected)) || [] }); } catch (e) {} return r; };"
].join("\n"));

var ledgerPath = path.resolve(arg("ledger", path.join(outDir, "spend-ledger.jsonl")));
var guard = Guard.createGuard({
  capUsd: capUsd, ledgerPath: ledgerPath, redact: key,
  // --total-cap 2.5 --base-guard USD --shared-ledgers a.jsonl,b.jsonl: refuse when the shared total would pass.
  totalCapUsd: Number(arg("total-cap", "0")), baseGuardUsd: Number(arg("base-guard", "0")), sharedLedgers: String(arg("shared-ledgers", "")).split(",").filter(Boolean).map(function (f) { return path.resolve(f); }),
  labelFor: function (href, body) {
    if (href.indexOf("/responses") !== -1) return attempt + ":research-web-search";
    if (href.indexOf("/images/") !== -1) return attempt + ":image:" + String(body && body.size || "") + ":" + String(body && body.quality || "");
    var first = body && body.messages && body.messages[0];
    var system = first ? (typeof first.content === "string" ? first.content : JSON.stringify(first.content)) : "";
    return attempt + ":text:" + system.slice(0, 60);
  }
});
var realFetch = global.fetch;
var guarded = guard.wrap(realFetch);
var allowedDomains = Research.allowedDomains();
function allowedHost(href) {
  var host = "";
  try { host = new URL(href).hostname.toLowerCase(); } catch (e) { return false; }
  return allowedDomains.some(function (domain) { return host === domain || host.slice(-(domain.length + 1)) === "." + domain; });
}
function textResponse(body) {
  return { ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(body)); }, text: function () { return Promise.resolve(body); } };
}
var outbound = [];
global.fetch = function (url, init) {
  var href = String(url);
  if (href.indexOf("https://wondii.co.uk/js/lesson-brain.js") === 0) return Promise.resolve(textResponse(brainSource));
  if (href.indexOf("https://wondii.co.uk/js/source-research.js") === 0) return Promise.resolve(textResponse(researchSource));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(textResponse(JSON.stringify({ id: "teacher-live" })));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(textResponse(JSON.stringify([{ role: "teacher", status: "active" }])));
  if (href.indexOf("https://api.openai.com/") === 0) { outbound.push({ kind: "openai", url: href.replace(/\?.*$/, "") }); return guarded(url, init); }
  if (/^https:\/\//.test(href) && allowedHost(href)) { outbound.push({ kind: "source", url: href.slice(0, 300) }); return realFetch(url, init); }
  outbound.push({ kind: "refused", url: href.slice(0, 300) });
  return Promise.reject(new Error("harness refused non-allowlisted fetch " + href.slice(0, 120)));
};

var logs = [];
var originalLog = console.log;
console.log = function (line) {
  try { var parsed = JSON.parse(line); if (parsed && parsed.event === "learn-generate") { logs.push(parsed); originalLog("stage " + parsed.stage); return; } } catch (e) {}
  originalLog(guard.redact(line));
};
global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return key;
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "live-validation-anon";
  if (name === "LESSON_MODEL") return "gpt-4o-mini";
  if (name === "LESSON_RESEARCH") return researchMode;
  return "";
} } };

var request = { lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 };
var started = Date.now();
(0, eval)("(async function(){\n" + boot + "\n})()").then(function () {
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST",
    headers: { Authorization: "Bearer live", "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: "source-grounded-y3-" + attempt, context: Object.assign({ organisationId: "org-live" }, request) })
  }));
}).then(function (response) { return response.json(); }).then(function (body) {
  var trace = global.__sgTrace || {};
  fs.writeFileSync(path.join(outDir, "lesson/generate-response.json"), JSON.stringify(body, null, 2));
  fs.writeFileSync(path.join(outDir, "lesson/generate-trace.json"), JSON.stringify({ attempt: attempt, request: request, researchMode: researchMode, model: "gpt-4o-mini", knowledgeModel: researchMode ? "gpt-6-luna (experimental, research mode only)" : "gpt-4o-mini", ok: !!body.ok, stage: body.stage || "", issues: body.issues || [], elapsedMs: Date.now() - started, stages: logs.map(function (row) { return row.stage; }), logs: logs, intent: trace.intent || null, plans: trace.plans || [], outbound: outbound, spend: guard.state() }, null, 2));
  if (trace.research) fs.writeFileSync(path.join(outDir, "sources/research-record.json"), JSON.stringify(trace.research, null, 2));
  // The pack the boot used is the one named in the KNOWLEDGE_PACK log (the repair may be kept or not).
  var used = logs.filter(function (row) { return row.stage === "KNOWLEDGE_PACK"; })[0];
  var packs = trace.packs || [];
  var finalRow = packs.filter(function (row) { return used && row.pack.id === used.packId; })[0] || packs[packs.length - 1];
  if (finalRow) fs.writeFileSync(path.join(outDir, "sources/knowledge-pack.json"), JSON.stringify({ rawModelPacks: trace.rawPacks || [], normalisedPack: finalRow.pack, selection: finalRow.selection, allPacks: packs.map(function (row) { return { packId: row.pack.id, pack: row.pack, selection: row.selection }; }) }, null, 2));
  console.log = originalLog;
  console.log(JSON.stringify({ ok: !!body.ok, stage: body.stage || "", issues: (body.issues || []).slice(0, 6), elapsedMs: Date.now() - started, spend: guard.state() }, null, 1));
  if (!body.ok || !body.adventure || process.argv.indexOf("--no-finish") !== -1) return null;
  console.log("finishing: images, checks 1-4, lesson.html");
  trace.request = request;
  return Finish.runFinish({ adventure: body.adventure, logs: logs, trace: trace, outDir: outDir, apiKey: key, fetch: global.fetch, imageCount: Number(arg("images", "4")) }).then(function (out) {
    var c = out.lesson.checks;
    console.log(JSON.stringify({ html: out.html, images: out.lesson.images.map(function (i) { return i.id + ":" + i.status; }), checks: { support: c.support.problems, sentences: c.sentences ? c.sentences.problems : null, rules: c.rules ? c.rules.problems : null, age: c.age.problems, questions: c.questions.problems, images: c.images.problems }, spend: guard.state() }, null, 1));
  });
}).catch(function (error) {
  console.log = originalLog;
  fs.writeFileSync(path.join(outDir, "lesson/generate-trace.json"), JSON.stringify({ attempt: attempt, harnessError: guard.redact(String(error && error.stack || error)), stages: logs.map(function (row) { return row.stage; }), logs: logs, outbound: outbound, spend: guard.state() }, null, 2));
  console.error(guard.redact(String(error && error.stack || error)).split("\n").slice(0, 4).join("\n"));
  process.exit(1);
});
