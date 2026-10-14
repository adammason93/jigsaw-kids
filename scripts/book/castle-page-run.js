"use strict";

/* Approved two-image comparison. Sends exactly two edits, then stops.
   OpenAI cannot refuse a completed edit because a dollar figure was reached.
   This file does not change the generator, the references, or the reader. */

var fs = require("fs");
var path = require("path");
var Page = require("./castle-page-test.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs", "agent", "book-v2", "castle-page-test");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\n/).forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return;
    var eq = trimmed.indexOf("=");
    if (eq < 1) return;
    var name = trimmed.slice(0, eq).trim();
    var value = trimmed.slice(eq + 1).trim();
    if (value.length >= 2 && (value.charAt(0) === '"' || value.charAt(0) === "'") && value.charAt(value.length - 1) === value.charAt(0)) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  });
}

function redact(text) {
  return String(text || "").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/Bearer\s+\S+/g, "Bearer [redacted]");
}

function editImage(key, prompt, files, sent) {
  if (sent.count >= 2) throw new Error("Refusing a third image call");
  sent.count += 1;
  var form = new FormData();
  form.append("model", Page.REQUEST.model);
  form.append("prompt", prompt);
  files.forEach(function (row) {
    var abs = path.join(ROOT, row.file);
    form.append("image[]", new Blob([fs.readFileSync(abs)], { type: "image/jpeg" }), path.basename(row.file));
  });
  form.append("size", Page.REQUEST.size);
  form.append("quality", Page.REQUEST.quality);
  form.append("output_format", Page.REQUEST.outputFormat);
  form.append("output_compression", String(Page.REQUEST.outputCompression));
  form.append("n", String(Page.REQUEST.n));
  return fetch(Page.REQUEST.endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    body: form
  }).then(function (res) {
    return res.json().then(function (payload) {
      return { ok: res.ok, status: res.status, payload: payload };
    });
  });
}

function record(label, response, references) {
  var payload = response.payload || {};
  var usage = Page.readUsage(payload);
  var usd = Page.chargeUsd(usage);
  var image = payload.data && payload.data[0] && payload.data[0].b64_json;
  var file = "";
  if (image) {
    file = path.join(OUT, label + ".jpg");
    fs.writeFileSync(file, Buffer.from(image, "base64"));
  }
  return {
    label: label,
    http: response.status,
    ok: response.ok,
    file: file ? path.relative(ROOT, file) : "",
    bytes: file ? fs.statSync(file).size : 0,
    references: references.map(function (row) { return row.file; }),
    usage: usage,
    listedUsd: usd == null ? null : Math.round(usd * 1000000) / 1000000,
    error: payload.error ? redact(payload.error.message || payload.error.code || "error") : ""
  };
}

function main() {
  var plan = Page.prepare();
  if (!plan.ok) throw new Error("Not ready: " + plan.problems.join(","));
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  console.log("OpenAI cannot enforce the $0.294 planning budget. /v1/images/edits has no spending-cap parameter. These two completed requests are billed for the tokens they use. No retry and no third call.");
  fs.mkdirSync(OUT, { recursive: true });
  var sent = { count: 0 };
  var maya = plan.references[0];
  var leo = plan.references[1];
  return editImage(key, plan.prompt, [maya, leo], sent).then(function (bothResponse) {
    var both = record("both", bothResponse, [maya, leo]);
    if (bothResponse.status === 401 || bothResponse.status === 403) {
      return { both: both, mayaOnly: null, stopped: "auth" };
    }
    return editImage(key, plan.prompt, [maya], sent).then(function (controlResponse) {
      return { both: both, mayaOnly: record("maya-only", controlResponse, [maya]), stopped: "" };
    });
  }).then(function (result) {
    var increment = Page.leoIncrement(
      result.mayaOnly && result.mayaOnly.usage,
      result.both && result.both.usage
    );
    var bothUsd = result.both && result.both.listedUsd;
    var controlUsd = result.mayaOnly && result.mayaOnly.listedUsd;
    var report = {
      at: new Date().toISOString(),
      model: Page.REQUEST.model,
      endpoint: Page.REQUEST.endpoint,
      size: Page.REQUEST.size,
      quality: Page.REQUEST.quality,
      calls: sent.count,
      budget: { planningUsd: 0.294, enforcedByProvider: false },
      both: result.both,
      mayaOnly: result.mayaOnly,
      leoPortrait: increment,
      listedUsdTotal: bothUsd != null && controlUsd != null ? Math.round((bothUsd + controlUsd) * 1000000) / 1000000 : null,
      outputTokenDifference: result.both && result.mayaOnly && result.both.usage.imageOutputTokens != null && result.mayaOnly.usage.imageOutputTokens != null
        ? result.both.usage.imageOutputTokens - result.mayaOnly.usage.imageOutputTokens
        : null,
      stopped: result.stopped
    };
    fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  });
}

main().catch(function (error) {
  console.error(redact(error && error.message || error));
  process.exit(1);
});
