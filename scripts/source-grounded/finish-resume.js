"use strict";

/* Resume the finish step of a run whose boot already returned COMPLETE (for example after the
   process was interrupted during the checks). Reads DIR/lesson/generate-response.json and
   DIR/lesson/generate-trace.json written by generate.js, reuses images already in
   DIR/lesson/images, and runs only the missing paid calls (checks 2-4) through the spend guard.
   Nothing here writes lesson content.

   Usage: OPENAI_API_KEY=... node scripts/source-grounded/finish-resume.js --out DIR --cap USD
          --ledger FILE [--total-cap 2.5 --base-guard USD --shared-ledgers a,b] [--attempt NAME]
          [--max-cost-only]   (prints the worst-case cost of the remaining calls; no call is made) */

var fs = require("fs");
var path = require("path");
var Guard = require("./spend-guard.js");
var Finish = require("./finish.js");

function arg(name, fallback) {
  var at = process.argv.indexOf("--" + name);
  return at !== -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}
var outDir = path.resolve(arg("out", ""));
var attempt = arg("attempt", "resume");
var dryRun = process.argv.indexOf("--max-cost-only") !== -1;
var key = String(process.env.OPENAI_API_KEY || "").trim();
if (!key && !dryRun) { console.error("OPENAI_API_KEY is not set. No call was made."); process.exit(2); }
var body = JSON.parse(fs.readFileSync(path.join(outDir, "lesson/generate-response.json"), "utf8"));
var trace = JSON.parse(fs.readFileSync(path.join(outDir, "lesson/generate-trace.json"), "utf8"));
if (!body.ok || !body.adventure) { console.error("the saved boot response is not a complete lesson; nothing to finish"); process.exit(1); }

var guard = Guard.createGuard({
  capUsd: dryRun ? 1 : Number(arg("cap", "0")), ledgerPath: dryRun ? "/tmp/sg-maxcost-ledger-" + process.pid + ".jsonl" : path.resolve(arg("ledger", path.join(outDir, "spend-ledger.jsonl"))), redact: key,
  totalCapUsd: Number(arg("total-cap", "0")), baseGuardUsd: Number(arg("base-guard", "0")),
  sharedLedgers: String(arg("shared-ledgers", "")).split(",").filter(Boolean).map(function (f) { return path.resolve(f); }),
  labelFor: function (href, b) {
    if (href.indexOf("/images/") !== -1) return attempt + ":image:" + String(b && b.size || "") + ":" + String(b && b.quality || "");
    var first = b && b.messages && b.messages[0];
    var system = first ? (typeof first.content === "string" ? first.content : JSON.stringify(first.content)) : "";
    return attempt + ":text:" + system.slice(0, 60);
  }
});

var worst = [];
function stubFetch(url, init) {
  // Max-cost mode: price each request the finish step would send, answer with an empty stub.
  var b = JSON.parse(init.body);
  var est = guard.estimate(String(url), b);
  worst.push({ endpoint: String(url).replace("https://api.openai.com", ""), model: b.model, kind: est.kind, worstListedUsd: est.listedUsd, worstGuardUsd: est.listedUsd * 2, error: est.error || "" });
  var reply = String(url).indexOf("/images/") !== -1 ? { data: [] } : { choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 0, completion_tokens: 0 } };
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(reply); }, clone: function () { return this; } });
}

var outFor = dryRun ? fs.mkdtempSync("/tmp/sg-maxcost-") : outDir;
if (dryRun) { fs.mkdirSync(path.join(outFor, "lesson/images"), { recursive: true }); if (fs.existsSync(path.join(outDir, "lesson/images"))) fs.readdirSync(path.join(outDir, "lesson/images")).forEach(function (f) { fs.copyFileSync(path.join(outDir, "lesson/images", f), path.join(outFor, "lesson/images", f)); }); }
Finish.runFinish({ adventure: body.adventure, logs: trace.logs, trace: trace, outDir: outFor, apiKey: key || "dry-run", fetch: dryRun ? stubFetch : guard.wrap(global.fetch), imageCount: Number(arg("images", "4")), reuseImages: true }).then(function (out) {
  if (dryRun) {
    var total = worst.reduce(function (s, w) { return s + w.worstListedUsd; }, 0);
    console.log(JSON.stringify({ calls: worst, worstListedUsd: Number(total.toFixed(6)), worstGuardUsd: Number((total * 2).toFixed(6)), imagesReused: out.lesson.images.filter(function (i) { return i.reused; }).length }, null, 1));
    return;
  }
  var c = out.lesson.checks;
  console.log(JSON.stringify({ html: out.html, images: out.lesson.images.map(function (i) { return i.id + ":" + i.status + (i.reused ? ":reused" : ""); }), checks: { support: c.support.problems, age: c.age.problems, questions: c.questions.problems, images: c.images.problems }, spend: guard.state() }, null, 1));
}).catch(function (error) { console.error(guard.redact(String(error && error.stack || error)).split("\n").slice(0, 4).join("\n")); process.exit(1); });
