"use strict";

/* Approved revised waterfall story. Text and illustration plans only.
   Writes only inside secret-beyond-the-waterfall-revised.
   Does not call the image API and does not write either finished book. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Adapter = require("../../js/book-v2-adapter.js");
var Writer = require("./writer.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Adventure = require("../../js/book-adventure.js");
var Journey = require("../../js/book-journey.js");
var Progress = require("../../js/book-progression.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall-revised");
var BASELINE = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall/book.json");
var CASTLE = path.join(ROOT, "docs/agent/book-v2/castle-lost-lanterns/book.json");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];
var TEXT_CAP = 8;
var GBP_PER_USD = 0.754;

var BODY = {
  familyAgeBand: "7-9",
  members: [
    { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
    { id: "wondii-leo", name: "Leo", source: "wondii-crew" }
  ],
  idea: "Maya and Leo discover a mysterious pathway behind a waterfall that leads them into a hidden world.",
  length: "medium",
  pageCount: 12,
  theme: "Adventure",
  creationKey: "secret-beyond-the-waterfall-02"
};

var counts = { text: 0, image: 0 };
var ledger = [];
var hashesBefore = {};

function inside(child, parent) {
  var c = path.resolve(child);
  var p = path.resolve(parent);
  return c === p || c.startsWith(p + path.sep);
}

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

function round6(value) {
  return Math.round(value * 1000000) / 1000000;
}

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function chargeText(usage) {
  if (!usage) return null;
  if (usage.prompt_tokens == null || usage.completion_tokens == null) return null;
  return round6((usage.prompt_tokens * 2 + usage.completion_tokens * 10) / 1e6);
}

function note(row) {
  ledger.push(row);
  var usd = round6(ledger.reduce(function (sum, item) { return sum + (item.usd || 0); }, 0));
  console.log(JSON.stringify({ event: "text", purpose: row.purpose, http: row.http, calls: counts.text, usd: usd }));
}

function pageText(page) {
  if (!page) return "";
  if (page.prose) return String(page.prose);
  if (Array.isArray(page.sentences)) {
    return page.sentences.map(function (line) {
      return typeof line === "string" ? line : (line && line.text) || "";
    }).join(" ");
  }
  return "";
}

function guardBooks() {
  if (inside(OUT, path.dirname(BASELINE)) || inside(OUT, path.dirname(CASTLE))) {
    throw new Error("Refusing to write inside a finished book");
  }
  if (sha(BASELINE) !== hashesBefore.baseline || sha(CASTLE) !== hashesBefore.castle) {
    throw new Error("A finished book changed during this run");
  }
}

function callModel(key, brief, opts) {
  if (counts.text >= TEXT_CAP) return Promise.reject(new Error("Stopped at 8 text calls"));
  counts.text += 1;
  var body = {
    model: opts.model || "gpt-6.1-sol",
    response_format: { type: "json_object" },
    reasoning_effort: opts.effort || "low",
    max_completion_tokens: opts.maxTokens || 4000,
    messages: [
      { role: "system", content: brief.system },
      { role: "user", content: brief.user }
    ]
  };
  var control = new AbortController();
  var timer = setTimeout(function () { control.abort(); }, 240000);
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: control.signal,
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function (res) {
    return res.text().then(function (text) {
      clearTimeout(timer);
      var payload = null;
      try { payload = JSON.parse(text); } catch (e) { payload = null; }
      var usd = chargeText(payload && payload.usage);
      note({ purpose: opts.purpose, http: res.status, usd: usd || 0, usage: payload && payload.usage || null });
      if (!res.ok || !payload) {
        var message = payload && payload.error && payload.error.message || "";
        throw new Error(opts.purpose + " HTTP " + res.status + " " + redact(message).slice(0, 180));
      }
      var content = String(payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "");
      try { return JSON.parse(content); } catch (e2) {
        throw new Error(opts.purpose + " reply was not JSON");
      }
    });
  }, function (error) {
    clearTimeout(timer);
    throw new Error(redact(error && error.message || error).slice(0, 180));
  });
}

function placeOf(bible, id) {
  return ((bible && bible.locations) || []).filter(function (place) {
    return place.locationId === id;
  })[0] || null;
}

function summarise(book) {
  var bible = book.bible || {};
  var contracts = Visual.contractsFor(bible, book.pages || [], {});
  var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
  var adventure = Adventure.assess(bible, {
    tone: bible.tone,
    idea: bible.userIdea,
    length: bible.targetLength,
    pageCount: bible.pageCount
  });
  var journey = Journey.analyse({ bible: bible, pages: book.pages || [], tone: bible.tone });
  var progression = Progress.review({ bible: bible, pages: book.pages || [], tone: bible.tone, length: bible.targetLength });
  var planDir = path.join(OUT, "plans");
  fs.mkdirSync(planDir, { recursive: true });
  var pages = (book.pages || []).map(function (page, index) {
    var spread = contracts.spreads[index] || {};
    var place = placeOf(bible, page.locationId);
    var progressRow = (progression.storyProgressionMap || []).filter(function (row) {
      return row.spreadId === page.pageId;
    })[0] || {};
    var beat = (bible.beats || []).filter(function (item) { return item.beatId === page.beatId; })[0] || {};
    var scene = Identity.prepareScene(bible.identityRegistry, page.charactersPresent || []);
    var references = ((scene.passes && scene.passes[0]) || []).map(function (row) {
      return { characterId: row.characterId, file: path.basename(String(row.file || "")) };
    });
    spread.bible = bible;
    var prompt = Visual.spreadPrompt(bible, spread, lineup);
    fs.writeFileSync(path.join(planDir, page.pageId + ".prompt.txt"), prompt);
    return {
      page: index + 1,
      pageId: page.pageId,
      prose: pageText(page),
      role: beat.role || "",
      action: beat.action || page.action || "",
      locationId: page.locationId,
      location: place ? place.name : page.locationId,
      setting: place ? place.setting : "",
      visualIdentity: place ? place.visualIdentity : "",
      discovery: progressRow.discoveryNow || "",
      progression: progressRow.progressionReason || "",
      phase: progressRow.narrativePhase || "",
      continuity: spread.continuityLine || "",
      transition: spread.placeTransition || "",
      camera: spread.cameraBrief || "",
      shot: page.shotType || "",
      focus: page.visualFocus || "",
      characters: page.charactersPresent || [],
      references: references,
      style: prompt.indexOf("wondii-picture-book") >= 0
    };
  });
  return { adventure: adventure, journey: journey, progression: progression, pages: pages };
}

function writeBook(book, report) {
  guardBooks();
  var story = (book.pages || []).map(function (page, index) {
    return "Page " + (index + 1) + "\n" + pageText(page);
  }).join("\n\n");
  var title = book.bible && book.bible.title ? book.bible.title : "The Secret Beyond the Waterfall";
  fs.writeFileSync(path.join(OUT, "story.txt"), title + "\n\n" + story);
  fs.writeFileSync(path.join(OUT, "book.json"), JSON.stringify(book, null, 2));
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(report, null, 2));
}

function run() {
  hashesBefore.baseline = sha(BASELINE);
  hashesBefore.castle = sha(CASTLE);
  if (inside(OUT, path.dirname(BASELINE)) || inside(OUT, path.dirname(CASTLE))) {
    throw new Error("Refusing to write inside a finished book");
  }
  var planned = Adapter.planRequest(BODY);
  if (!planned.ok) throw new Error("Plan failed: " + (planned.problems || []).join(","));
  if (planned.constraintYear !== "Ages 7–9") throw new Error("Writing level is " + planned.constraintYear);
  if (planned.illustrationStyle !== "wondii-picture-book") throw new Error("Style drifted");
  if (planned.request.castIds.indexOf("wondii-maya") < 0 || planned.request.castIds.indexOf("wondii-leo") < 0) {
    throw new Error("Cast drifted");
  }
  var guide = Adventure.writerGuide(planned.request);
  if (guide.indexOf("narrow-adventure") < 0) throw new Error("The improved adventure guide is not loaded");
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  fs.mkdirSync(OUT, { recursive: true });
  console.log("Text only. This run stops at 8 text calls and will not request images.");
  return Writer.generateBook(planned.request, {
    callModel: function (brief, opts) { return callModel(key, brief, opts); },
    model: "gpt-6.1-sol",
    effort: "low"
  }).then(function (book) {
    guardBooks();
    var summary = summarise(book);
    guardBooks();
    var usd = round6(ledger.reduce(function (sum, row) { return sum + (row.usd || 0); }, 0));
    if (counts.image !== 0) throw new Error("An image call was counted");
    var report = {
      stage: book.status === "REVIEWABLE" ? "story-and-plans" : "story-stopped",
      generated: true,
      pictures: "not-run",
      title: book.bible && book.bible.title,
      status: book.status,
      calls: counts,
      listedUsd: usd,
      listedGbp: round6(usd * GBP_PER_USD),
      repairs: book.repairs || [],
      storyProblems: book.storyProblems || [],
      planProblems: book.planProblems || [],
      textProblems: book.textProblems || [],
      adventure: {
        kind: summary.adventure.kind,
        needsJourney: summary.adventure.needsJourney,
        blockProblems: summary.adventure.blockProblems,
        reviewProblems: summary.adventure.reviewProblems,
        distinctSettings: summary.adventure.distinctSettings,
        sectionCount: summary.adventure.sectionCount,
        placeShare: summary.adventure.placeShare,
        handlingShare: summary.adventure.handlingShare
      },
      progression: {
        verdict: summary.progression.verdict,
        blockProblems: summary.progression.blockProblems,
        reviewProblems: summary.progression.reviewProblems
      },
      visualJourney: {
        problems: summary.journey.problems,
        repetition: summary.journey.repetition
      },
      journey: (book.bible && book.bible.journey) || [],
      locations: ((book.bible && book.bible.locations) || []).map(function (place) {
        return {
          locationId: place.locationId,
          name: place.name,
          setting: place.setting,
          visualIdentity: place.visualIdentity
        };
      }),
      pages: summary.pages.map(function (page) {
        var copy = Object.assign({}, page);
        delete copy.prose;
        return copy;
      }),
      writing: book.bible && {
        ageBand: book.bible.ageBand,
        yearGroup: book.bible.yearGroup,
        readerStage: book.bible.readerStage,
        constraint: "Ages 7–9"
      },
      baselineUntouched: sha(BASELINE) === hashesBefore.baseline,
      castleUntouched: sha(CASTLE) === hashesBefore.castle,
      ledger: ledger.map(function (row) {
        return { purpose: row.purpose, http: row.http, usd: row.usd, usage: row.usage };
      })
    };
    writeBook(book, report);
    fs.writeFileSync(path.join(OUT, "plan-summary.json"), JSON.stringify({
      title: report.title,
      adventure: report.adventure,
      progression: report.progression,
      visualJourney: report.visualJourney,
      journey: report.journey,
      locations: report.locations,
      pages: summary.pages
    }, null, 2));
    guardBooks();
    console.log(JSON.stringify({
      done: true,
      stage: report.stage,
      title: report.title,
      pages: (book.pages || []).length,
      calls: counts,
      usd: usd,
      gbp: report.listedGbp,
      adventure: report.adventure.blockProblems,
      placeShare: report.adventure.placeShare,
      handlingShare: report.adventure.handlingShare,
      progression: report.progression.verdict
    }));
  });
}

if (require.main === module) {
  run().catch(function (error) {
    var usd = round6(ledger.reduce(function (sum, row) { return sum + (row.usd || 0); }, 0));
    var message = redact(error && error.message || error);
    try {
      if (!inside(OUT, path.dirname(BASELINE)) && !inside(OUT, path.dirname(CASTLE))) {
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({
          stage: "error",
          pictures: "not-run",
          calls: counts,
          listedUsd: usd,
          listedGbp: round6(usd * GBP_PER_USD),
          error: message,
          baselineUntouched: sha(BASELINE) === hashesBefore.baseline,
          castleUntouched: sha(CASTLE) === hashesBefore.castle
        }, null, 2));
      }
    } catch (e) { /* keep the original error */ }
    console.error(message);
    process.exit(1);
  });
}
