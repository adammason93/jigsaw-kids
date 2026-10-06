"use strict";

/* Real end-to-end run of the source-grounded lesson flow through the production boot
   (js/learn-generate-boot.js) with the local lesson-brain.js and source-research.js.
   Supabase auth is stubbed so the boot can start. Every OpenAI call goes through the
   spend guard. Research fetches go only to allowlisted hosts. Nothing is hand-written:
   the lesson is whatever the boot returns.

   Usage: OPENAI_API_KEY=... node scripts/source-grounded/generate.js --out DIR --cap USD
          [--research wikipedia,openai] [--attempt NAME]
   Writes DIR/lesson/generate-response.json, DIR/lesson/generate-trace.json,
   DIR/sources/research-record.json, DIR/sources/knowledge-pack.json. */

var fs = require("fs");
var path = require("path");
var Guard = require("./spend-guard.js");
var Research = require("../../js/source-research.js");

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
var boot = fs.readFileSync(path.join(root, "js/learn-generate-boot.js"), "utf8");
var marker = "const brain = globalThis.WondiiLessonBrain;";
if (boot.indexOf(marker) === -1) { console.error("boot marker missing"); process.exit(1); }
// Trace hooks only observe: they copy what the boot passes and return the original result.
boot = boot.replace(marker, marker + "\n" + [
  "globalThis.__sgTrace = globalThis.__sgTrace || { plans: [] };",
  "const __sgBrief = brain.knowledgePackBrief.bind(brain);",
  "brain.knowledgePackBrief = function (ctx) { try { globalThis.__sgTrace.research = ctx && ctx.researchEvidence ? JSON.parse(JSON.stringify(ctx.researchEvidence)) : null; globalThis.__sgTrace.intent = ctx && ctx.lessonBrief ? JSON.parse(JSON.stringify(ctx.lessonBrief.teacherIntent || null)) : null; } catch (e) {} return __sgBrief(ctx); };",
  "const __sgNormPack = brain.normaliseKnowledgePack.bind(brain);",
  "brain.normaliseKnowledgePack = function (raw, ctx) { try { globalThis.__sgTrace.rawPack = JSON.parse(JSON.stringify(raw)); } catch (e) {} return __sgNormPack(raw, ctx); };",
  "const __sgSelect = brain.selectPackForLesson.bind(brain);",
  "brain.selectPackForLesson = function (pack, ctx) { var s = __sgSelect(pack, ctx); try { globalThis.__sgTrace.pack = JSON.parse(JSON.stringify(pack)); globalThis.__sgTrace.selection = JSON.parse(JSON.stringify(s)); } catch (e) {} return s; };",
  "const __sgNormPlan = brain.normalisePlan.bind(brain);",
  "brain.normalisePlan = function (raw, ctx) { var r = __sgNormPlan(raw, ctx); try { globalThis.__sgTrace.plans.push({ raw: JSON.parse(JSON.stringify(raw)), ok: !!(r && r.ok), issues: (r && r.issues) || [], depth: r && r.depth || null, mapRejected: r && (r.mapRejected || (r.plan && r.plan.mapRejected)) || [] }); } catch (e) {} return r; };"
].join("\n"));

var ledgerPath = path.join(outDir, "spend-ledger.jsonl");
var guard = Guard.createGuard({
  capUsd: capUsd, ledgerPath: ledgerPath, redact: key,
  labelFor: function (href, body) {
    if (href.indexOf("/responses") !== -1) return attempt + ":research-web-search";
    var system = body && body.messages && body.messages[0] && String(body.messages[0].content || "");
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
  fs.writeFileSync(path.join(outDir, "lesson/generate-trace.json"), JSON.stringify({ attempt: attempt, request: request, researchMode: researchMode, model: "gpt-4o-mini", ok: !!body.ok, stage: body.stage || "", issues: body.issues || [], elapsedMs: Date.now() - started, stages: logs.map(function (row) { return row.stage; }), logs: logs, intent: trace.intent || null, plans: trace.plans || [], selection: trace.selection || null, outbound: outbound, spend: guard.state() }, null, 2));
  if (trace.research) fs.writeFileSync(path.join(outDir, "sources/research-record.json"), JSON.stringify(trace.research, null, 2));
  if (trace.pack) fs.writeFileSync(path.join(outDir, "sources/knowledge-pack.json"), JSON.stringify({ rawModelPack: trace.rawPack || null, normalisedPack: trace.pack, selection: trace.selection || null }, null, 2));
  console.log = originalLog;
  console.log(JSON.stringify({ ok: !!body.ok, stage: body.stage || "", issues: (body.issues || []).slice(0, 6), elapsedMs: Date.now() - started, spend: guard.state() }, null, 1));
}).catch(function (error) {
  console.log = originalLog;
  fs.writeFileSync(path.join(outDir, "lesson/generate-trace.json"), JSON.stringify({ attempt: attempt, harnessError: guard.redact(String(error && error.stack || error)), stages: logs.map(function (row) { return row.stage; }), logs: logs, outbound: outbound, spend: guard.state() }, null, 2));
  console.error(guard.redact(String(error && error.stack || error)).split("\n").slice(0, 4).join("\n"));
  process.exit(1);
});
