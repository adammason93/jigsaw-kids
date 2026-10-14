"use strict";

/* One text-only progression proof. No image calls. */

var fs = require("fs");
var path = require("path");
var Guard = require("../source-grounded/spend-guard.js");
var Writer = require("./writer.js");
var Book = require("../../js/book-brain.js");
var Progress = require("../../js/book-progression.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs", "agent", "book-v2", "progression", "proof");
var LEDGER = path.join(ROOT, "docs", "agent", "book-v2", "progression", "spend-ledger.jsonl");
var ASK = {
  id: "clockwork-beetle",
  castIds: ["mina", "leo"],
  yearGroup: "Year 3",
  length: "storybook",
  tone: "adventure",
  idea: "Mina and Leo find a clockwork beetle living in a flooded library. It can walk only when one of them winds it, and each winding changes the building."
};

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

loadEnv(path.join(ROOT, ".env"));
var key = process.env.OPENAI_API_KEY || "";
if (!key) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

var bibleTokens = 8000;
var proseTokens = 6000;
var bibleBrief = Writer.bibleBrief(Book.publicRequest(ASK));
var guard = Guard.createGuard({
  capUsd: 8,
  ledgerPath: LEDGER,
  margin: 2,
  redact: key,
  labelFor: function (href, body) { return "book:" + String(body && body.__purpose || "text"); }
});

function priced(purpose, chars, outTokens) {
  return guard.estimate("https://api.openai.com/v1/chat/completions", {
    model: "gpt-6.1-sol",
    messages: [{ role: "system", content: "" }, { role: "user", content: "x".repeat(chars) }],
    max_completion_tokens: outTokens
  }, purpose);
}

var bibleChars = bibleBrief.system.length + bibleBrief.user.length;
var repairChars = bibleChars + 12000;
var proseChars = 7000;
var estimate = {
  model: "gpt-6.1-sol",
  happyPath: ["book-bible", "book-prose"],
  worstExtraRepairs: 4,
  calls: [
    Object.assign({ purpose: "book-bible" }, priced("book-bible", bibleChars, bibleTokens)),
    Object.assign({ purpose: "book-bible-repair" }, priced("book-bible-repair", repairChars, bibleTokens)),
    Object.assign({ purpose: "book-prose" }, priced("book-prose", proseChars, proseTokens)),
    Object.assign({ purpose: "book-prose-repair" }, priced("book-prose-repair", proseChars + 8000, proseTokens))
  ]
};
estimate.happyListedUsd = Number((estimate.calls[0].listedUsd + estimate.calls[2].listedUsd).toFixed(4));
estimate.worstListedUsd = Number((estimate.calls[0].listedUsd + estimate.calls[1].listedUsd * 2 + estimate.calls[2].listedUsd + estimate.calls[3].listedUsd * 2).toFixed(4));
console.log("ESTIMATE " + JSON.stringify({
  happyListedUsd: estimate.happyListedUsd,
  worstListedUsd: estimate.worstListedUsd,
  note: "Worst case is one plan plus two repairs, then prose plus two repairs. No image calls."
}));

if (process.argv.indexOf("--estimate-only") >= 0) process.exit(0);

function rawFetch(url, init) {
  var href = String(url);
  if (href.indexOf("/v1/images") >= 0) return Promise.reject(new Error("image spend is blocked"));
  var body = JSON.parse(init.body);
  delete body.__purpose;
  return fetch(url, Object.assign({}, init, { body: JSON.stringify(body) }));
}

var guarded = guard.wrap(rawFetch);

function callModel(brief, opts) {
  var body = {
    model: "gpt-6.1-sol",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: brief.system },
      { role: "user", content: brief.user }
    ],
    reasoning_effort: "low",
    max_completion_tokens: opts.maxTokens || 4000,
    __purpose: opts.purpose
  };
  var control = new AbortController();
  var timer = setTimeout(function () { control.abort(); }, opts.timeoutMs || 240000);
  return guarded("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: control.signal,
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function (res) {
    return res.text().then(function (text) {
      clearTimeout(timer);
      var payload = null;
      try { payload = JSON.parse(text); } catch (e) { payload = null; }
      if (!res.ok || !payload) {
        var message = payload && payload.error && payload.error.message || "";
        throw new Error(opts.purpose + " HTTP " + res.status + " " + guard.redact(message).slice(0, 180));
      }
      var content = String(payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "");
      try { return JSON.parse(content); } catch (e) {
        throw new Error(opts.purpose + " reply was not JSON");
      }
    });
  }, function (error) {
    clearTimeout(timer);
    throw new Error(guard.redact(String(error && error.message || error)).slice(0, 180));
  });
}

var before = guard.state();
Writer.generateBook(ASK, { callModel: callModel, model: "gpt-6.1-sol", effort: "low" }).then(function (book) {
  var after = guard.state();
  var progress = book.bible ? Progress.review({ bible: book.bible, pages: book.pages || [] }) : null;
  var proseGaps = book.bible && book.pages ? Progress.proseProblems(book.bible, book.pages) : [];
  fs.mkdirSync(OUT, { recursive: true });
  var readable = readableBook(book);
  fs.writeFileSync(path.join(OUT, "book.json"), JSON.stringify(book, null, 2));
  fs.writeFileSync(path.join(OUT, "readable.txt"), readable);
  fs.writeFileSync(path.join(OUT, "progression.json"), JSON.stringify({
    verdict: progress && progress.verdict,
    blockProblems: progress && progress.blockProblems,
    reviewProblems: (progress && progress.reviewProblems || []).concat(proseGaps),
    staticRuns: progress && progress.staticRuns,
    setupPayoff: progress && progress.setupPayoff,
    map: progress && progress.storyProgressionMap,
    visual: progress && progress.visualProgressionMap
  }, null, 2));
  fs.writeFileSync(path.join(OUT, "cost.json"), JSON.stringify({
    estimate: estimate,
    listedUsd: Number((after.listedSpent - before.listedSpent).toFixed(6)),
    imageCalls: book.imageCalls || 0
  }, null, 2));
  console.log(JSON.stringify({
    status: book.status,
    title: book.bible && book.bible.title,
    modelCalls: book.modelCalls,
    storyProblems: book.storyProblems,
    textProblems: book.textProblems,
    verdict: progress && progress.verdict,
    block: progress && progress.blockProblems,
    review: (progress && progress.reviewProblems || []).concat(proseGaps),
    listedUsd: Number((after.listedSpent - before.listedSpent).toFixed(6)),
    imageCalls: book.imageCalls || 0,
    storyCast: book.bible && (book.bible.storyCast || []).map(function (row) { return row.characterId; })
  }, null, 2));
}).catch(function (error) {
  console.error(error && error.stack || error);
  process.exit(1);
});

function readableBook(book) {
  if (!book || !book.bible) return "No book.\n" + JSON.stringify(book && book.storyProblems, null, 2);
  var lines = [];
  lines.push(book.bible.title || "Untitled");
  lines.push(book.bible.premise || "");
  lines.push("");
  (book.pages || []).forEach(function (page) {
    var place = (book.bible.locations || []).filter(function (item) { return item.locationId === page.locationId; })[0];
    lines.push(page.pageId + "  " + (page.narrativePhase || "") + "  " + (place ? place.name : page.locationId));
    lines.push(page.prose || page.action || "");
    lines.push("");
  });
  return lines.join("\n");
}
