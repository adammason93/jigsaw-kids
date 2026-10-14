"use strict";

/* One repair for page 3, whose first image call returned HTTP 400.
   Does not redraw any other page. */

var fs = require("fs");
var path = require("path");
var Page = require("./castle-page-test.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");

var ROOT = path.join(__dirname, "..", "..");
var BOOK = path.join(ROOT, "docs/agent/book-v2/the-rain-that-rose-candidate");
var IMAGES = path.join(BOOK, "images");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];
var CAP = 0.938;
var IDENTITY = " Maya is the first reference image: keep her face, hair, green clip, yellow cardigan, blue skirt, white socks and navy shoes. Leo is the second reference image: keep his face, curly hair, freckles, clothes and proportions. Do not give Leo a different outfit.";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\n/).forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return;
    var eq = trimmed.indexOf("=");
    if (eq < 1) return;
    var name = trimmed.slice(0, eq).trim();
    var value = trimmed.slice(eq + 1).trim();
    if (value.length >= 2 && (value.charAt(0) === '"' || value.charAt(0) === "'") && value.charAt(value.length - 1) === value.charAt(0)) value = value.slice(1, -1);
    if (!process.env[name]) process.env[name] = value;
  });
}

function redact(text) {
  return String(text || "").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]");
}

KEY_FILES.forEach(loadEnv);
var key = process.env.OPENAI_API_KEY || "";
if (!key) throw new Error("OPENAI_API_KEY is missing");
var report = JSON.parse(fs.readFileSync(path.join(BOOK, "illustration-result.json"), "utf8"));
if (report.listedUsd + 0.05 > CAP) throw new Error("No room under the cap");
if (fs.existsSync(path.join(IMAGES, "p3.jpg"))) throw new Error("p3.jpg already exists");

var book = JSON.parse(fs.readFileSync(path.join(BOOK, "book.json"), "utf8"));
var prompt = fs.readFileSync(path.join(BOOK, "plans-confirmed/p3.prompt.txt"), "utf8") + IDENTITY;
var scene = Identity.prepareScene(book.bible.identityRegistry, ["wondii-maya", "wondii-leo"]);
var files = scene.passes[0];
var form = new FormData();
form.append("model", Page.REQUEST.model);
form.append("prompt", prompt);
files.forEach(function (row) {
  form.append("image[]", new Blob([fs.readFileSync(path.join(ROOT, row.file))], { type: "image/jpeg" }), path.basename(row.file));
});
form.append("size", Page.REQUEST.size);
form.append("quality", Page.REQUEST.quality);
form.append("output_format", "jpeg");
form.append("output_compression", "80");
form.append("n", "1");

fetch(Page.REQUEST.endpoint, {
  method: "POST",
  headers: { Authorization: "Bearer " + key },
  body: form
}).then(function (res) {
  return res.json().then(function (payload) {
    var usage = Page.readUsage(payload);
    var usd = Page.chargeUsd(usage);
    if (usd == null) usd = res.ok ? 0.037646 : 0;
    if (!res.ok) {
      var message = payload && payload.error && payload.error.message || "";
      console.log(JSON.stringify({ ok: false, http: res.status, usd: usd, error: redact(message).slice(0, 300) }));
      report.listedUsd = Math.round((report.listedUsd + usd) * 1000000) / 1000000;
      report.listedGbp = Math.round(report.listedUsd * 0.754 * 1000000) / 1000000;
      report.calls.image += 1;
      report.pages[2].repairs = 1;
      report.pages[2].reason = "repair-rejected";
      report.pages[2].needsReview = true;
      report.pages[2].problems = ["http-" + res.status];
      report.ledger.push({ kind: "image", label: "p3-repair", http: res.status, usd: usd });
      fs.writeFileSync(path.join(BOOK, "illustration-result.json"), JSON.stringify(report, null, 2));
      return;
    }
    var b64 = payload.data[0].b64_json;
    fs.writeFileSync(path.join(IMAGES, "p3.jpg"), Buffer.from(b64, "base64"));
    var spread = Visual.contractsFor(book.bible, book.pages, {}).spreads[2];
    var question = [
      "You are checking one children's book illustration against a plan. Return JSON only.",
      "The first image is the page. Later images are Maya's maya-v1 reference and Leo's portrait.",
      "Maya must keep her face, hair, green clip, yellow cardigan, blue skirt, white socks and navy shoes.",
      "Leo must keep his face, curly hair, freckles, green hoodie, mountain shirt, khaki trousers, blue backpack and blue shoes.",
      "The picture is an open lake. Maya presses one giant green leaf rim. Water settles in its central pool. Other giant leaves tower nearby.",
      "Return {\"observations\":\"\",\"characters\":[{\"characterId\":\"wondii-maya\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1},{\"characterId\":\"wondii-leo\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1}],\"locationMatch\":true,\"prematureResult\":false,\"textDetected\":false,\"anatomyOk\":true,\"textSafeUsable\":true,\"duplicateCharacter\":false,\"momentMatch\":true,\"montageShown\":false,\"style\":{\"rendering\":\"painted\",\"proportions\":\"picture-book\",\"finish\":\"picture-book\"}}."
    ].join(" ");
    var content = [
      { type: "text", text: question },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }
    ];
    files.forEach(function (row) {
      content.push({ type: "text", text: "Reference for " + row.characterId + "." });
      content.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + fs.readFileSync(path.join(ROOT, row.file)).toString("base64"), detail: "low" } });
    });
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: content }]
      })
    }).then(function (visionRes) {
      return visionRes.json().then(function (visionPayload) {
        var visionUsd = 0.001425;
        if (visionPayload && visionPayload.usage) {
          visionUsd = Math.round((visionPayload.usage.prompt_tokens * 0.15 + visionPayload.usage.completion_tokens * 0.6) / 1e6 * 1000000) / 1000000;
        }
        var parsed = null;
        try { parsed = JSON.parse(visionPayload.choices[0].message.content); } catch (e) { parsed = null; }
        var verdict = Visual.acceptIllustration(parsed, spread);
        report.listedUsd = Math.round((report.listedUsd + usd + visionUsd) * 1000000) / 1000000;
        report.listedGbp = Math.round(report.listedUsd * 0.754 * 1000000) / 1000000;
        report.calls.image += 1;
        report.calls.vision += 1;
        report.pages[2] = {
          pageId: "p3",
          ok: verdict.ok,
          repairs: 1,
          reason: verdict.ok ? "repaired" : "repair-failed",
          problems: verdict.problems,
          needsReview: !verdict.ok,
          file: "p3.jpg"
        };
        report.ledger.push({ kind: "image", label: "p3-repair", http: 200, usd: usd });
        report.ledger.push({ kind: "vision", label: "p3-repair", http: visionRes.status, usd: visionUsd });
        fs.writeFileSync(path.join(BOOK, "illustration-result.json"), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ ok: verdict.ok, problems: verdict.problems, usd: report.listedUsd, gbp: report.listedGbp }));
      });
    });
  });
}).catch(function (error) {
  console.error(redact(error && error.message || error));
  process.exit(1);
});
