"use strict";

/* Continues the approved waterfall book after the plan stopped on trait labels.
   The events stay as the model wrote them. Only an invalid trait id is mapped
   to that child's catalogue trait. Then the normal prose stage runs.
   No image calls. Text calls in this process stop at 5, so the book stays within 8. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Adapter = require("../../js/book-v2-adapter.js");
var Book = require("../../js/book-brain.js");
var Writer = require("./writer.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Adventure = require("../../js/book-adventure.js");
var Journey = require("../../js/book-journey.js");
var Progress = require("../../js/book-progression.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall");
var CASTLE = path.join(ROOT, "docs/agent/book-v2/castle-lost-lanterns/book.json");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];
var TEXT_CAP = 5;
var PRIOR_TEXT = 3;
var PRIOR_USD = 0.226124;
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
  creationKey: "secret-beyond-the-waterfall-01"
};

var CLUES = {
  curious: ["trace", "ask", "inspect", "probe", "peer", "stud", "kneel", "lean", "flash", "which"],
  brave: ["shaking", "lead", "scoop", "reach", "volunteer", "step", "pressing"],
  careful: ["test", "check", "adjust", "wait", "brace", "splash", "lift", "center", "finger"],
  kind: ["hand", "help", "support", "offer", "share", "beside"]
};

var counts = { text: 0, image: 0 };
var ledger = [];

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
  return String(text || "").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/Bearer\s+\S+/g, "Bearer [redacted]");
}

function round6(value) {
  return Math.round(value * 1000000) / 1000000;
}

function chargeText(usage) {
  if (!usage || usage.prompt_tokens == null || usage.completion_tokens == null) return null;
  return round6((usage.prompt_tokens * 2 + usage.completion_tokens * 10) / 1e6);
}

function castleHash() {
  return crypto.createHash("sha256").update(fs.readFileSync(CASTLE)).digest("hex");
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

function traitFor(note, personality) {
  var current = String(note.trait || "");
  if (personality.indexOf(current) >= 0) return current;
  var shows = String(note.shows || "").toLowerCase();
  var best = personality[0] || "";
  var hits = 0;
  personality.forEach(function (trait) {
    var count = (CLUES[trait] || []).filter(function (word) { return shows.indexOf(word) >= 0; }).length;
    if (count > hits) {
      hits = count;
      best = trait;
    }
  });
  return best;
}

function entityChanges(previous, current) {
  var before = {};
  (previous || []).forEach(function (entity) { before[entity.entityId] = entity; });
  var changes = [];
  (current || []).forEach(function (entity) {
    var prior = before[entity.entityId];
    if (!prior) {
      changes.push({
        entityId: entity.entityId,
        introduce: true,
        ownerCharacterId: entity.ownerCharacterId || null,
        locationId: entity.locationId,
        state: entity.state
      });
      return;
    }
    if (prior.ownerCharacterId !== entity.ownerCharacterId || prior.locationId !== entity.locationId || prior.state !== entity.state) {
      changes.push({
        entityId: entity.entityId,
        ownerCharacterId: entity.ownerCharacterId || null,
        locationId: entity.locationId,
        state: entity.state
      });
    }
  });
  return changes;
}

function draftFrom(bible) {
  var registry = bible.identityRegistry || [];
  return {
    title: bible.title,
    premise: bible.premise,
    hook: bible.hook,
    goal: bible.goal,
    centralProblem: bible.centralProblem,
    stakes: bible.stakes,
    motif: bible.motif,
    emotionalArc: bible.emotionalArc,
    storyCast: [],
    locations: bible.locations,
    entities: (bible.entities || []).map(function (entity) {
      return { entityId: entity.entityId, name: entity.name, identity: entity.identity };
    }),
    journey: bible.journey,
    beats: (bible.beats || []).map(function (beat, index) {
      var previous = index ? bible.beats[index - 1].stateAfter.entities : [];
      return {
        role: beat.role,
        locationId: beat.locationId,
        locationZone: beat.locationZone,
        worldState: beat.worldState,
        goalNow: beat.goalNow,
        obstacleNow: beat.obstacleNow,
        consequenceNow: beat.consequenceNow,
        charactersPresent: beat.charactersPresent,
        absent: beat.absent,
        expresses: (beat.expresses || []).map(function (note) {
          var row = registry.filter(function (item) {
            return item && (item.journeyId === note.characterId || item.characterId === note.characterId);
          })[0];
          var character = Book && require("../../js/character-bible.js").getCharacter((row && row.bibleId) || note.characterId);
          var personality = character ? character.personality : [];
          return {
            characterId: note.characterId,
            trait: traitFor(note, personality),
            shows: note.shows
          };
        }),
        problemFamily: beat.problemFamily,
        action: beat.action,
        emotion: beat.emotion,
        shotType: beat.shotType,
        compositionIntent: beat.compositionIntent,
        visualFocus: beat.visualFocus,
        textPurpose: beat.textPurpose,
        pageTurnHook: beat.pageTurnHook,
        entryFrom: beat.entryFrom,
        exitToward: beat.exitToward,
        entityState: entityChanges(previous, beat.stateAfter && beat.stateAfter.entities)
      };
    })
  };
}

function callModel(key, brief, opts) {
  if (counts.text >= TEXT_CAP) return Promise.reject(new Error("Stopped at 8 text calls"));
  counts.text += 1;
  var body = {
    model: "gpt-6.1-sol",
    response_format: { type: "json_object" },
    reasoning_effort: "low",
    max_completion_tokens: opts.maxTokens || 6000,
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
    return res.text().then(function (raw) {
      clearTimeout(timer);
      var payload = null;
      try { payload = JSON.parse(raw); } catch (e) { payload = null; }
      var usd = chargeText(payload && payload.usage);
      ledger.push({ purpose: opts.purpose, http: res.status, usd: usd || 0, usage: payload && payload.usage || null });
      var spent = round6(PRIOR_USD + ledger.reduce(function (sum, row) { return sum + (row.usd || 0); }, 0));
      console.log(JSON.stringify({ event: "text", purpose: opts.purpose, http: res.status, calls: PRIOR_TEXT + counts.text, usd: spent }));
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

function pagesOf(payload) {
  var pages = payload && payload.pages || payload || [];
  return pages.map(function (page) {
    return { pageId: page.pageId, sentences: page.sentences || [] };
  });
}

function placeOf(bible, id) {
  return (bible.locations || []).filter(function (place) { return place.locationId === id; })[0] || null;
}

function summarise(book) {
  var bible = book.bible;
  var contracts = Visual.contractsFor(bible, book.pages, {});
  var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
  var adventure = Adventure.assess(bible, {
    tone: bible.tone,
    idea: bible.userIdea,
    length: bible.targetLength,
    pageCount: bible.pageCount
  });
  var journey = Journey.analyse({ bible: bible, pages: book.pages, tone: bible.tone });
  var progression = Progress.review({ bible: bible, pages: book.pages, tone: bible.tone, length: bible.targetLength });
  var planDir = path.join(OUT, "plans");
  fs.mkdirSync(planDir, { recursive: true });
  var pages = book.pages.map(function (page, index) {
    var spread = contracts.spreads[index];
    var place = placeOf(bible, page.locationId);
    var beat = (bible.beats || []).filter(function (item) { return item.beatId === page.beatId; })[0] || {};
    var progressRow = (progression.storyProgressionMap || []).filter(function (row) {
      return row.spreadId === page.pageId;
    })[0] || {};
    var scene = Identity.prepareScene(bible.identityRegistry, page.charactersPresent || []);
    spread.bible = bible;
    var prompt = Visual.spreadPrompt(bible, spread, lineup);
    fs.writeFileSync(path.join(planDir, page.pageId + ".prompt.txt"), prompt);
    return {
      page: index + 1,
      prose: pageText(page),
      role: beat.role || "",
      location: place ? place.name : page.locationId,
      setting: place ? place.setting : "",
      action: page.action,
      discovery: progressRow.discoveryNow || beat.discoveryNow || "",
      progression: progressRow.progressionReason || "",
      phase: progressRow.narrativePhase || "",
      continuity: spread.continuityLine || "",
      transition: spread.placeTransition || "",
      camera: spread.cameraBrief || "",
      shot: page.shotType || "",
      focus: page.visualFocus || "",
      characters: page.charactersPresent || [],
      references: ((scene.passes && scene.passes[0]) || []).map(function (row) {
        return { characterId: row.characterId, file: path.basename(String(row.file || "")) };
      }),
      styleLocked: prompt.indexOf("wondii-picture-book") >= 0
    };
  });
  return { adventure: adventure, journey: journey, progression: progression, pages: pages };
}

function run() {
  var before = castleHash();
  var saved = JSON.parse(fs.readFileSync(path.join(OUT, "book.json"), "utf8"));
  var planned = Adapter.planRequest(BODY);
  if (!planned.ok) throw new Error("Plan failed");
  var request = planned.request;
  var draft = draftFrom(saved.bible);
  var compiled = Book.compileStory(draft, request);
  if (!compiled.ok) {
    fs.writeFileSync(path.join(OUT, "prose-stopped.json"), JSON.stringify({ problems: compiled.problems }, null, 2));
    throw new Error("Plan still fails: " + compiled.problems.join(", "));
  }
  console.log("Trait labels corrected. Starting prose. No images.");
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  var plannedPages = Book.planPages(compiled.bible);
  if (!plannedPages.ok) throw new Error("Page plan failed: " + plannedPages.problems.join(", "));
  return callModel(key, Writer.proseBrief(compiled.bible, plannedPages.pages, null), { purpose: "book-prose", maxTokens: 8000 }).then(function (spoken) {
    var attached = Book.attachSpokenProse(compiled.bible, plannedPages.pages, pagesOf(spoken));
    var tries = 0;
    function repair() {
      if (attached.ok || tries >= 2 || counts.text >= TEXT_CAP) return Promise.resolve(attached);
      tries += 1;
      return callModel(key, Writer.repairProseBrief(compiled.bible, attached.pages, spoken, attached.problems), {
        purpose: "book-prose-repair",
        maxTokens: 8000
      }).then(function (patch) {
        var byId = {};
        pagesOf(spoken).forEach(function (page) { byId[page.pageId] = page; });
        pagesOf(patch).forEach(function (page) { byId[page.pageId] = page; });
        spoken = { pages: Object.keys(byId).map(function (id) { return byId[id]; }) };
        attached = Book.attachSpokenProse(compiled.bible, plannedPages.pages, spoken.pages);
        return repair();
      });
    }
    return repair().then(function () {
      var book = {
        status: attached.ok ? "REVIEWABLE" : "NOT_REVIEWABLE",
        request: planned.request && { castIds: request.castIds, idea: request.idea, ageBand: request.ageBand, length: request.length, tone: request.tone, pageCount: request.pageCount },
        modelCalls: PRIOR_TEXT + counts.text,
        bible: compiled.bible,
        storyProblems: [],
        planProblems: plannedPages.problems || [],
        textProblems: attached.problems || [],
        pages: attached.pages,
        imageCalls: 0,
        traitLabelNote: "The plan used character ids as trait labels. Those labels were mapped to each child's catalogue traits from the behaviour already written. The events were not rewritten."
      };
      var summary = summarise(book);
      var added = round6(ledger.reduce(function (sum, row) { return sum + (row.usd || 0); }, 0));
      var usd = round6(PRIOR_USD + added);
      if (castleHash() !== before) throw new Error("The castle book changed");
      var report = {
        stage: attached.ok ? "story-and-plans" : "prose-stopped",
        pictures: "not-run",
        title: compiled.bible.title,
        status: book.status,
        calls: { text: PRIOR_TEXT + counts.text, image: 0 },
        listedUsd: usd,
        listedGbp: round6(usd * GBP_PER_USD),
        proseRepairs: tries,
        textProblems: attached.problems || [],
        adventure: {
          kind: summary.adventure.kind,
          blockProblems: summary.adventure.blockProblems,
          reviewProblems: summary.adventure.reviewProblems,
          distinctSettings: summary.adventure.distinctSettings,
          sectionCount: summary.adventure.sectionCount
        },
        progression: {
          verdict: summary.progression.verdict,
          blockProblems: summary.progression.blockProblems,
          reviewProblems: summary.progression.reviewProblems
        },
        visualJourney: { problems: summary.journey.problems, repetition: summary.journey.repetition },
        journey: compiled.bible.journey,
        locations: compiled.bible.locations,
        writing: {
          ageBand: compiled.bible.ageBand,
          yearGroup: compiled.bible.yearGroup,
          readerStage: compiled.bible.readerStage
        },
        traitLabelNote: book.traitLabelNote,
        castleUntouched: true,
        ledger: ledger
      };
      var story = book.pages.map(function (page, index) {
        return "Page " + (index + 1) + "\n" + pageText(page);
      }).join("\n\n");
      fs.writeFileSync(path.join(OUT, "story.txt"), compiled.bible.title + "\n\n" + story);
      fs.writeFileSync(path.join(OUT, "book.json"), JSON.stringify(book, null, 2));
      fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(report, null, 2));
      fs.writeFileSync(path.join(OUT, "plan-summary.json"), JSON.stringify({
        title: compiled.bible.title,
        adventure: report.adventure,
        progression: report.progression,
        journey: report.journey,
        pages: summary.pages
      }, null, 2));
      console.log(JSON.stringify({
        done: true,
        stage: report.stage,
        title: report.title,
        pages: book.pages.length,
        calls: report.calls,
        usd: usd,
        gbp: report.listedGbp,
        textProblems: report.textProblems,
        adventure: report.adventure.blockProblems,
        progression: report.progression.verdict
      }));
    });
  });
}

if (require.main === module) {
  run().catch(function (error) {
    console.error(redact(error && error.message || error));
    process.exit(1);
  });
}
