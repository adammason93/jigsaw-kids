"use strict";

/* Text-only validation books. Pictures stay off. */

var fs = require("fs");
var path = require("path");
var Guard = require("../source-grounded/spend-guard.js");
var Writer = require("./writer.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.resolve(arg("out") || path.join(ROOT, "docs", "agent", "book-v2", "text-validation"));
var LEDGER = path.join(ROOT, "docs", "agent", "book-v2", "spend-ledger.jsonl");
var BOOKS = [
  { id: "a", castIds: ["maya", "leo"], yearGroup: "Year 1", length: "quick", tone: "magical", idea: "They find a tiny dragon hiding underneath their school." },
  { id: "b", castIds: ["ravi"], yearGroup: "Reception", length: "quick", tone: "funny", idea: "Ravi's shadow keeps running away from him." },
  { id: "c", castIds: ["mina", "maya"], yearGroup: "Year 3", length: "storybook", tone: "adventure", idea: "They wake up and discover their town is floating in the clouds." },
  { id: "d", castIds: ["leo", "ravi", "mina"], yearGroup: "Year 5", length: "storybook", tone: "mystery", idea: "Every clock in the world suddenly stops except one." },
  { id: "e", castIds: ["maya"], yearGroup: "Year 2", length: "storybook", tone: "bedtime", idea: "Maya finds a lonely star that is scared to go back into the sky." },
  { id: "f", castIds: ["leo"], yearGroup: "", ageBand: "5-6", length: "storybook", tone: "surprise", context: "family", idea: "Leo finds a puddle that shows him yesterday." }
];

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

function arg(name) {
  var hit = process.argv.filter(function (item) { return item.indexOf("--" + name + "=") === 0; })[0];
  return hit ? hit.slice(name.length + 3) : "";
}

loadEnv(path.join(ROOT, ".env"));
var key = process.env.OPENAI_API_KEY || "";
if (!key) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

var only = arg("only").split(",").filter(Boolean);
var chosen = BOOKS.filter(function (book) { return !only.length || only.indexOf(book.id) >= 0; });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LEDGER), { recursive: true });

var guard = Guard.createGuard({
  capUsd: Number(arg("cap") || "8"),
  ledgerPath: LEDGER,
  margin: 2,
  redact: key,
  labelFor: function (href, body) { return "book:" + String(body && body.__purpose || "text"); }
});

function rawFetch(url, init) {
  var href = String(url);
  if (href.indexOf("/v1/images") >= 0) return Promise.reject(new Error("image spend is blocked"));
  var body = JSON.parse(init.body);
  delete body.__purpose;
  return fetch(url, Object.assign({}, init, { body: JSON.stringify(body) }));
}

var guarded = guard.wrap(rawFetch);

function callModel(brief, opts) {
  var model = opts.model || "gpt-6.1-sol";
  var reasoning = /^(?:gpt-5|gpt-6|o\d)/.test(model);
  var body = Object.assign({
    model: model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: brief.system },
      { role: "user", content: brief.user }
    ],
    __purpose: opts.purpose
  }, reasoning
    ? { reasoning_effort: opts.effort || "low", max_completion_tokens: opts.maxTokens || 4000 }
    : { temperature: 0.7, max_tokens: opts.maxTokens || 4000 });
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
      var finish = payload.choices && payload.choices[0] && payload.choices[0].finish_reason;
      try { return JSON.parse(content); } catch (e) {
        throw new Error(opts.purpose + " reply was not JSON (finish " + finish + ", " + content.length + " chars)");
      }
    });
  }, function (error) {
    clearTimeout(timer);
    throw new Error(guard.redact(String(error && error.message || error)).slice(0, 180));
  });
}

function summarise(book) {
  var bible = book.bible || {};
  return {
    id: book.id,
    status: book.status,
    title: bible.title || "",
    modelCalls: book.modelCalls,
    repairCalls: book.repairCalls,
    stagesRepaired: book.stagesRepaired,
    listedUsd: book.listedUsd,
    guardUsd: book.guardUsd,
    imageUsd: 0,
    storyProblems: book.storyProblems,
    textProblems: book.textProblems
  };
}

function runNext(index, rows) {
  if (index >= chosen.length) {
    fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({
      at: new Date().toISOString(),
      imageUsd: 0,
      books: rows
    }, null, 2));
    console.log(JSON.stringify(rows));
    return Promise.resolve(rows);
  }
  var item = chosen[index];
  var before = guard.state();
  console.log(JSON.stringify({ stage: "start", id: item.id, year: item.yearGroup || "", age: item.ageBand || "", length: item.length }));
  return Writer.generateBook(item, { callModel: callModel, model: arg("model") || "gpt-6.1-sol", effort: arg("effort") || "low" }).then(function (book) {
    var after = guard.state();
    book.id = item.id;
    book.listedUsd = Number((after.listedSpent - before.listedSpent).toFixed(6));
    book.guardUsd = Number((after.guardSpent - before.guardSpent).toFixed(6));
    book.imageUsd = 0;
    var dir = path.join(OUT, item.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "book.json"), JSON.stringify(book, null, 2));
    var row = summarise(book);
    rows.push(row);
    console.log(JSON.stringify(row));
    return runNext(index + 1, rows);
  });
}

runNext(0, []).catch(function (error) {
  console.error(guard.redact(String(error && error.message || error)).slice(0, 300));
  process.exit(1);
});
