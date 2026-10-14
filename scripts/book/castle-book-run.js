"use strict";

/* One approved prototype: The Castle of Lost Lanterns.
   Uses the existing writer, checks, and repair limits.
   Stops at 8 text calls and 24 image calls. Does not start pictures
   unless the story is a valid 12-page book. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Adapter = require("../../js/book-v2-adapter.js");
var Writer = require("./writer.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Shelf = require("../../js/book-v2-shelf.js");
var Page = require("./castle-page-test.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs", "agent", "book-v2", "castle-lost-lanterns");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];
var TEXT_CAP = 8;
var IMAGE_CAP = 24;
var VISION_CAP = 24;
var MEASURED_BOTH_USD = 0.037646;
var GBP_PER_USD = 0.754;

var BODY = {
  familyAgeBand: "7-9",
  members: [
    { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
    { id: "wondii-leo", name: "Leo", source: "wondii-crew" }
  ],
  idea: "Maya and Leo discover a glowing lantern in an old castle courtyard. Together they follow clues through the castle to discover why its magical lights have disappeared.",
  place: "castle",
  length: "medium",
  pageCount: 12,
  theme: "Magic",
  creationKey: "castle-lost-lanterns-01"
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

function redact(text) {
  return String(text || "").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/Bearer\s+\S+/g, "Bearer [redacted]");
}

function round6(value) {
  return Math.round(value * 1000000) / 1000000;
}

function chargeText(usage) {
  if (!usage) return null;
  var input = usage.prompt_tokens == null ? null : usage.prompt_tokens;
  var output = usage.completion_tokens == null ? null : usage.completion_tokens;
  if (input == null || output == null) return null;
  return round6((input * 2 + output * 10) / 1e6);
}

function chargeVision(usage) {
  if (!usage || usage.prompt_tokens == null || usage.completion_tokens == null) return null;
  return round6((usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.6) / 1e6);
}

var ledger = [];
var counts = { text: 0, image: 0, vision: 0 };

function note(kind, row) {
  ledger.push(Object.assign({ kind: kind, at: new Date().toISOString() }, row));
  var total = ledger.reduce(function (sum, item) { return sum + (item.usd || 0); }, 0);
  console.log(JSON.stringify({ event: kind, calls: counts, usd: round6(total), detail: row.label || row.purpose || "" }));
}

function pageText(page) {
  if (!page) return "";
  if (page.text) return String(page.text);
  if (page.prose) return String(page.prose);
  if (Array.isArray(page.sentences)) return page.sentences.join(" ");
  return "";
}

function storyGate(book) {
  var problems = [];
  var pages = book.pages || [];
  var bible = book.bible || {};
  if (book.status !== "REVIEWABLE") problems.push("not-reviewable");
  if ((book.storyProblems || []).length) problems.push("story");
  if ((book.textProblems || []).length) problems.push("text");
  if (pages.length !== 12) problems.push("page-count:" + pages.length);
  if (bible.ageBand !== "7-9") problems.push("age:" + bible.ageBand);
  if (bible.yearGroup === "Year 5" || bible.readerStage === "year5") problems.push("year-5");
  var profile = require("../../js/book-brain.js").readerProfile({ ageBand: bible.ageBand, yearGroup: bible.yearGroup });
  if (!profile || profile.constraintYear !== "Ages 7–9") problems.push("writing-level");
  if (profile && profile.limits.maxSentenceWords !== 18) problems.push("sentence-cap");
  var blob = [bible.premise, bible.hook].concat((bible.locations || []).map(function (place) {
    return place.name + " " + place.visualIdentity;
  })).join(" ");
  if (blob.toLowerCase().indexOf("castle") < 0) problems.push("world-missing");
  if (/\bforest\b/i.test(blob)) problems.push("world-replaced");
  var ids = bible.castIds || [];
  if (ids.indexOf("wondii-maya") < 0 || ids.indexOf("wondii-leo") < 0) problems.push("cast");
  pages.forEach(function (page) {
    if (!pageText(page).trim()) problems.push("empty-text:" + (page.pageId || ""));
  });
  return problems.concat(book.storyProblems || [], book.textProblems || []);
}

function callModel(key, brief, opts) {
  if (counts.text >= TEXT_CAP) return Promise.reject(new Error("Stopped at 8 text calls"));
  counts.text += 1;
  var model = opts.model || "gpt-6.1-sol";
  var body = {
    model: model,
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
      note("text", { purpose: opts.purpose, http: res.status, usd: usd, usage: payload && payload.usage || null });
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

function editImage(key, prompt, files) {
  if (counts.image >= IMAGE_CAP) return Promise.reject(new Error("Stopped at 24 image calls"));
  counts.image += 1;
  var form = new FormData();
  form.append("model", Page.REQUEST.model);
  form.append("prompt", prompt);
  files.forEach(function (row) {
    var abs = path.isAbsolute(row.file) ? row.file : path.join(ROOT, row.file);
    form.append("image[]", new Blob([fs.readFileSync(abs)], { type: "image/jpeg" }), path.basename(abs));
  });
  form.append("size", Page.REQUEST.size);
  form.append("quality", Page.REQUEST.quality);
  form.append("output_format", "jpeg");
  form.append("output_compression", "80");
  form.append("n", "1");
  return fetch(Page.REQUEST.endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    body: form
  }).then(function (res) {
    return res.json().then(function (payload) {
      var usage = Page.readUsage(payload);
      var usd = Page.chargeUsd(usage);
      note("image", { label: files.map(function (row) { return row.characterId; }).join("+"), http: res.status, usd: usd, usage: usage });
      return { ok: res.ok, status: res.status, payload: payload, usage: usage, usd: usd };
    });
  });
}

function visionCheck(key, spread, cast, b64, references) {
  if (counts.vision >= VISION_CAP) return Promise.reject(new Error("Stopped at 24 vision calls"));
  counts.vision += 1;
  var people = (cast || []).filter(function (look) {
    return (spread.charactersPresent || []).indexOf(look.characterId) >= 0;
  }).map(function (look) {
    return look.name + " (" + look.characterId + ") must match " + (look.referenceFile || "their own reference") + ": " + look.hair + "; " + look.skinTone + "; " + look.face + "; " + look.defaultClothing + "; " + look.footwear + ".";
  }).join(" ");
  var question = [
    "You are checking one children's book illustration against a plan. Return JSON only.",
    "The first image is the page. Each later image is that character's own reference, in the order named. Do not swap their clothes or faces.",
    "Every listed child must be identifiable. " + people,
    "Selected instant only: " + (spread.illustrationMoment || spread.storyEvent),
    "momentMatch is true only when the picture shows that one instant.",
    spread.continuityLine ? "locationMatch is true only when the place matches this continuity: " + spread.continuityLine : "",
    spread.sceneLeave ? "These objects must stay out of the picture: " + spread.sceneLeave + ". If one of them appears, locationMatch is false." : "",
    "Return one characters entry for every listed child, using that child's characterId.",
    "Return {\"observations\":\"\",\"characters\":[{\"characterId\":\"id\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1}],\"locationMatch\":true,\"prematureResult\":false,\"textDetected\":false,\"anatomyOk\":true,\"textSafeUsable\":true,\"duplicateCharacter\":false,\"momentMatch\":true,\"montageShown\":false,\"style\":{\"rendering\":\"painted\",\"proportions\":\"picture-book\",\"finish\":\"picture-book\"}}."
  ].join(" ");
  var content = [{ type: "text", text: question }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }];
  references.forEach(function (row) {
    var abs = path.isAbsolute(row.file) ? row.file : path.join(ROOT, row.file);
    var ref = fs.readFileSync(abs).toString("base64");
    content.push({ type: "text", text: "Reference for " + row.characterId + "." });
    content.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + ref, detail: "low" } });
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
  }).then(function (res) {
    return res.json().then(function (payload) {
      var usd = chargeVision(payload && payload.usage);
      note("vision", { label: spread.spreadId || spread.pageId, http: res.status, usd: usd, usage: payload && payload.usage || null });
      var raw = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      var parsed = null;
      try { parsed = JSON.parse(raw || ""); } catch (e) { parsed = null; }
      return { http: res.ok, vision: parsed, verdict: Visual.acceptIllustration(parsed, spread), usd: usd };
    });
  });
}

function saveJpeg(id, payload) {
  var b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!b64) return null;
  var file = path.join(OUT, "images", id + ".jpg");
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return { file: file, b64: b64 };
}

function drawPage(key, spread, prompt, references, cast) {
  var repairs = 0;
  return editImage(key, prompt, references).then(function (drawn) {
    if (!drawn.ok) {
      repairs += 1;
      var retry = Visual.repairPrompt(spread.bible || {}, spread, cast);
      return editImage(key, retry, references).then(function (again) {
        if (!again.ok) return { ok: false, repairs: repairs, reason: "image-rejected" };
        var saved = saveJpeg(spread.spreadId, again.payload);
        if (!saved) return { ok: false, repairs: repairs, reason: "image-missing" };
        return visionCheck(key, spread, cast, saved.b64, references).then(function (check) {
          return { ok: check.verdict.ok, repairs: repairs, file: saved.file, verdict: check.verdict, reason: check.verdict.ok ? "" : "repair-checked" };
        });
      });
    }
    var saved = saveJpeg(spread.spreadId, drawn.payload);
    if (!saved) return { ok: false, repairs: 0, reason: "image-missing" };
    return visionCheck(key, spread, cast, saved.b64, references).then(function (check) {
      if (check.verdict.ok) return { ok: true, repairs: 0, file: saved.file, verdict: check.verdict };
      repairs += 1;
      var retry = Visual.repairPrompt(spread.bible || {}, spread, cast);
      return editImage(key, retry, references).then(function (again) {
        if (!again.ok) return { ok: false, repairs: repairs, file: saved.file, verdict: check.verdict, reason: "repair-not-accepted" };
        var replaced = saveJpeg(spread.spreadId, again.payload);
        if (!replaced) return { ok: false, repairs: repairs, reason: "repair-missing" };
        return visionCheck(key, spread, cast, replaced.b64, references).then(function (next) {
          return { ok: next.verdict.ok, repairs: repairs, file: replaced.file, verdict: next.verdict, reason: next.verdict.ok ? "repaired" : "repair-failed" };
        });
      });
    });
  });
}

function totalUsd() {
  return round6(ledger.reduce(function (sum, row) { return sum + (row.usd || 0); }, 0));
}

function writeReport(extra) {
  var usd = totalUsd();
  var report = Object.assign({
    calls: counts,
    listedUsd: usd,
    gbpPerUsd: 0.754,
    listedGbp: round6(usd * 0.754),
    ledger: ledger.map(function (row) {
      return { kind: row.kind, purpose: row.purpose || "", label: row.label || "", http: row.http, usd: row.usd, usage: row.usage || null };
    })
  }, extra);
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ done: true, usd: usd, gbp: report.listedGbp, calls: counts, stage: extra.stage }));
  return report;
}

function proseFingerprint(book) {
  return crypto.createHash("sha256").update((book.pages || []).map(pageText).join("\n"), "utf8").digest("hex");
}

function visionEstimateUsd() {
  var inputTokens = (3 * 85) + 500;
  var outputTokens = 200;
  return round6((inputTokens * 0.15 + outputTokens * 0.6) / 1e6);
}

function revalidateCheckpoint(book) {
  var Brain = require("../../js/book-brain.js");
  var problems = [];
  var pages = book.pages || [];
  var bible = book.bible || {};
  var story = Brain.validateBible(bible);
  var text = Brain.reviewText(bible, pages);
  if (!story.ok) problems = problems.concat(story.problems);
  if (!text.ok) problems = problems.concat(text.problems);
  if (pages.length !== 12 || bible.pageCount !== 12) problems.push("page-count:" + pages.length);
  if (bible.ageBand !== "7-9") problems.push("age:" + bible.ageBand);
  if (bible.yearGroup === "Year 5" || bible.readerStage === "year5") problems.push("year-5");
  var profile = Brain.readerProfile({ ageBand: bible.ageBand, yearGroup: bible.yearGroup });
  if (!profile || profile.constraintYear !== "Ages 7–9") problems.push("writing-level");
  if (profile && profile.limits.maxSentenceWords !== 18) problems.push("sentence-cap");
  var ids = bible.castIds || [];
  if (ids.indexOf("wondii-maya") < 0 || ids.indexOf("wondii-leo") < 0) problems.push("cast");
  if (bible.visualStyle && bible.visualStyle !== "wondii-picture-book") problems.push("style");
  pages.forEach(function (page) {
    if (!pageText(page).trim()) problems.push("empty-text:" + (page.pageId || ""));
  });
  return {
    ok: problems.length === 0,
    problems: problems,
    storedStatus: book.status || "",
    storedTextProblems: (book.textProblems || []).slice(),
    storyOk: story.ok,
    textOk: text.ok
  };
}

function referenceFileOk(row) {
  var file = String(row && row.file || "");
  if (row.characterId === "wondii-maya") return file.indexOf("maya-v1.jpg") >= 0;
  if (row.characterId === "wondii-leo") return file.indexOf("crew/wondii-leo.jpg") >= 0 && file.indexOf("maya-v1") < 0;
  return false;
}

function planIllustrations(book) {
  var contracts = Visual.contractsFor(book.bible, book.pages, {});
  var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
  Identity.clearCache();
  var problems = [];
  if ((contracts.spreads || []).length !== book.pages.length) problems.push("plan-count");
  var pages = book.pages.map(function (page, index) {
    var spread = contracts.spreads[index];
    var scene = Identity.prepareScene(book.bible.identityRegistry, page.charactersPresent || []);
    var present = (spread && spread.charactersPresent) || [];
    var references = ((scene.passes && scene.passes[0]) || scene.files || []).filter(function (row) {
      return present.indexOf(row.characterId) >= 0;
    });
    if (!spread || spread.spreadId !== page.pageId) problems.push("plan-order:" + page.pageId);
    if (spread && spread.storyEvent !== page.action) problems.push("plan-event:" + page.pageId);
    if (scene.blocksGeneration || (scene.omitted || []).length || (scene.passes || []).length > 1) {
      problems.push("reference-blocked:" + page.pageId);
    }
    if (present.join(",") !== (page.charactersPresent || []).join(",")) problems.push("plan-cast:" + page.pageId);
    references.forEach(function (row) {
      if (!referenceFileOk(row)) problems.push("reference-file:" + row.characterId + ":" + page.pageId);
    });
    var wanted = page.charactersPresent || [];
    wanted.forEach(function (id) {
      if (!references.some(function (row) { return row.characterId === id; })) problems.push("reference-missing:" + id + ":" + page.pageId);
    });
    var prompt = spread ? Visual.spreadPrompt(book.bible, spread, lineup) : "";
    return {
      page: index + 1,
      spreadId: page.pageId,
      prose: pageText(page),
      locationId: page.locationId,
      charactersPresent: (page.charactersPresent || []).slice(),
      references: references.map(function (row) { return { characterId: row.characterId, file: row.file }; }),
      storyEvent: spread ? spread.storyEvent : "",
      illustrationMoment: spread ? spread.illustrationMoment : "",
      prompt: prompt
    };
  });
  var imageCalls = pages.length;
  var visionEach = visionEstimateUsd();
  var happyImages = round6(imageCalls * MEASURED_BOTH_USD);
  var worstImages = round6(IMAGE_CAP * MEASURED_BOTH_USD);
  return {
    ok: problems.length === 0,
    problems: problems,
    model: Page.REQUEST.model,
    endpoint: Page.REQUEST.endpoint,
    size: Page.REQUEST.size,
    quality: Page.REQUEST.quality,
    style: "wondii-picture-book",
    requests: imageCalls,
    repairsPerPage: Visual.MAX_VISUAL_REPAIRS,
    maxImageCalls: IMAGE_CAP,
    maxVisionCalls: VISION_CAP,
    textCalls: 0,
    measuredPageUsd: MEASURED_BOTH_USD,
    happyImageUsd: happyImages,
    worstImageUsd: worstImages,
    visionEachUsd: visionEach,
    happyUsd: round6(happyImages + imageCalls * visionEach),
    worstUsd: round6(worstImages + VISION_CAP * visionEach),
    gbpPerUsd: GBP_PER_USD,
    providerEnforcesCap: false,
    cast: lineup,
    pages: pages
  };
}

function readerProof(book, plan) {
  var shelfBook = {
    id: "castle-lost-lanterns",
    title: book.bible.title,
    author: "Wondii",
    readerArtLayout: "duplex",
    storyTextMode: "prose",
    storyLength: "medium",
    illustrationStyle: "wondii-picture-book",
    v2: true,
    pages: plan.pages.map(function (page) {
      return {
        text: page.prose,
        imageUrlFallback: "/docs/agent/book-v2/castle-lost-lanterns/images/" + page.spreadId + ".jpg"
      };
    }),
    sceneUrlFallback: "/docs/agent/book-v2/castle-lost-lanterns/images/p1.jpg"
  };
  var privatePages = plan.pages.map(function (page, index) {
    return { text: page.prose, imageUrlFallback: "wondii-private:castle-lost-lanterns/p" + (index + 1) };
  });
  var store = Shelf.memoryStore();
  var saved = Shelf.commitBook({
    creationKey: BODY.creationKey,
    owner: { userId: "local-prototype", accountKind: "adult" },
    result: {
      status: "REVIEWABLE",
      illustrationStyle: "wondii-picture-book",
      bible: { title: shelfBook.title },
      pages: privatePages
    }
  }, { store: store });
  var again = Shelf.commitBook({
    creationKey: BODY.creationKey,
    owner: { userId: "local-prototype", accountKind: "adult" },
    result: {
      status: "REVIEWABLE",
      illustrationStyle: "wondii-picture-book",
      bible: { title: shelfBook.title },
      pages: privatePages
    }
  }, { store: store });
  require("../../games/book-prototype/book-data.js");
  var opened = global.WondiiBookData.plan(store.readShelf("local-prototype")[0]);
  var reopened = global.WondiiBookData.plan(store.readShelf("local-prototype")[0]);
  var textsMatch = opened.pages.every(function (page, index) {
    return page.text === plan.pages[index].prose && reopened.pages[index].text === page.text;
  });
  return {
    ok: !!(saved.ok && again.duplicate && opened.pages.length === 12 && textsMatch && opened.spreadCount === 7),
    saved: saved.ok,
    claimed: saved.claimed,
    duplicate: again.duplicate,
    pages: opened.pages.length,
    spreadCount: opened.spreadCount,
    textsMatch: textsMatch,
    book: shelfBook
  };
}

function resumeCheckpoint(book) {
  var before = proseFingerprint(book);
  var validation = revalidateCheckpoint(book);
  var plan = planIllustrations(book);
  var reader = readerProof(book, plan);
  var after = proseFingerprint(book);
  if (before !== after) validation.problems.push("text-changed");
  var ok = validation.ok && plan.ok && reader.ok && before === after;
  return {
    ok: ok,
    paidCalls: 0,
    textCalls: 0,
    proseSha256: before,
    validation: validation,
    plan: plan,
    reader: reader
  };
}

function existingIllustration(spreadId) {
  var file = path.join(OUT, "images", spreadId + ".jpg");
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) return "";
  return file;
}

function loadCheckpoint() {
  return JSON.parse(fs.readFileSync(path.join(OUT, "book.json"), "utf8"));
}

function preserveFailureRecord() {
  var failed = path.join(OUT, "validation-failed.json");
  var result = path.join(OUT, "result.json");
  if (fs.existsSync(failed) || !fs.existsSync(result)) return failed;
  var current = JSON.parse(fs.readFileSync(result, "utf8"));
  if (current.stage !== "story-stopped") return failed;
  fs.writeFileSync(failed, JSON.stringify(current, null, 2));
  return failed;
}

function preflight() {
  preserveFailureRecord();
  var bookPath = path.join(OUT, "book.json");
  var before = fs.readFileSync(bookPath);
  var book = JSON.parse(before.toString("utf8"));
  var resumed = resumeCheckpoint(book);
  fs.mkdirSync(path.join(OUT, "images"), { recursive: true });
  resumed.plan.pages.forEach(function (page) {
    if (!existingIllustration(page.spreadId)) {
      fs.writeFileSync(path.join(OUT, "images", page.spreadId + ".prompt.txt"), page.prompt);
    }
  });
  var report = {
    stage: resumed.ok ? "checkpoint-ready" : "checkpoint-blocked",
    paidCalls: 0,
    textCalls: 0,
    proseSha256: resumed.proseSha256,
    storedStatus: resumed.validation.storedStatus,
    storedTextProblems: resumed.validation.storedTextProblems,
    recomputedOk: resumed.validation.ok,
    problems: resumed.validation.problems.concat(resumed.plan.problems),
    title: book.bible && book.bible.title,
    pages: resumed.plan.requests,
    ageBand: book.bible && book.bible.ageBand,
    yearGroup: book.bible && book.bible.yearGroup,
    readerStage: book.bible && book.bible.readerStage,
    illustrations: {
      model: resumed.plan.model,
      size: resumed.plan.size,
      quality: resumed.plan.quality,
      style: resumed.plan.style,
      requests: resumed.plan.requests,
      repairsPerPage: resumed.plan.repairsPerPage,
      maxImageCalls: resumed.plan.maxImageCalls,
      maxVisionCalls: resumed.plan.maxVisionCalls,
      textCalls: 0,
      alreadyDrawn: resumed.plan.pages.filter(function (page) { return existingIllustration(page.spreadId); }).length
    },
    references: resumed.plan.pages.map(function (page) {
      return { page: page.page, characters: page.charactersPresent, files: page.references };
    }),
    cost: {
      measuredPageUsd: resumed.plan.measuredPageUsd,
      happyImageUsd: resumed.plan.happyImageUsd,
      worstImageUsd: resumed.plan.worstImageUsd,
      happyUsd: resumed.plan.happyUsd,
      worstUsd: resumed.plan.worstUsd,
      happyGbp: round6(resumed.plan.happyUsd * GBP_PER_USD),
      worstGbp: round6(resumed.plan.worstUsd * GBP_PER_USD),
      gbpPerUsd: GBP_PER_USD,
      providerEnforcesCap: false,
      visionNote: "Vision is a price-table estimate for one low-detail page plus two reference images. The image price is the measured Maya-and-Leo castle edit."
    },
    reader: {
      ok: resumed.reader.ok,
      saved: resumed.reader.saved,
      reopened: resumed.reader.duplicate,
      pages: resumed.reader.pages,
      spreadCount: resumed.reader.spreadCount,
      textsMatch: resumed.reader.textsMatch,
      picturesOnDisk: false
    }
  };
  fs.writeFileSync(path.join(OUT, "checkpoint-validation.json"), JSON.stringify(report, null, 2));
  if (!before.equals(fs.readFileSync(bookPath))) throw new Error("The saved story file changed");
  console.log(JSON.stringify({
    stage: report.stage,
    paidCalls: 0,
    textCalls: 0,
    pages: report.pages,
    happyGbp: report.cost.happyGbp,
    maxImageCalls: report.illustrations.maxImageCalls
  }));
  if (!resumed.ok) process.exitCode = 1;
  return report;
}

function resumeIllustrations() {
  var book = loadCheckpoint();
  var resumed = resumeCheckpoint(book);
  if (!resumed.ok) {
    fs.writeFileSync(path.join(OUT, "checkpoint-validation.json"), JSON.stringify({
      stage: "checkpoint-blocked",
      paidCalls: 0,
      problems: resumed.validation.problems.concat(resumed.plan.problems)
    }, null, 2));
    throw new Error("Checkpoint failed validation");
  }
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  console.log("OpenAI cannot enforce a pound cap. This resume makes no text calls and stops at 24 image calls.");
  var contracts = Visual.contractsFor(book.bible, book.pages, {});
  var results = [];
  return resumed.plan.pages.reduce(function (chain, page, index) {
    return chain.then(function () {
      var existing = existingIllustration(page.spreadId);
      if (existing) {
        results.push({ page: page.page, spreadId: page.spreadId, ok: true, skipped: true, file: path.relative(ROOT, existing) });
        return null;
      }
      var spread = contracts.spreads[index];
      spread.bible = book.bible;
      return drawPage(key, spread, page.prompt, page.references, resumed.plan.cast).then(function (drawn) {
        results.push({
          page: page.page,
          spreadId: page.spreadId,
          ok: drawn.ok,
          repairs: drawn.repairs,
          reason: drawn.reason || "",
          problems: drawn.verdict ? drawn.verdict.problems : [],
          file: drawn.file ? path.relative(ROOT, drawn.file) : ""
        });
        console.log(JSON.stringify(results[results.length - 1]));
        fs.writeFileSync(path.join(OUT, "illustration-progress.json"), JSON.stringify({ calls: counts, usd: totalUsd(), pages: results }, null, 2));
      });
    });
  }, Promise.resolve()).then(function () {
    var readerPages = book.pages.map(function (page, index) {
      var hit = results[index];
      var src = hit && hit.file ? "/" + hit.file : "";
      return { text: pageText(page), imageUrlFallback: src };
    });
    var shelfBook = {
      id: "castle-lost-lanterns",
      title: book.bible.title,
      author: "Wondii",
      readerArtLayout: "duplex",
      storyTextMode: "prose",
      storyLength: "medium",
      illustrationStyle: "wondii-picture-book",
      v2: true,
      pages: readerPages,
      sceneUrlFallback: readerPages[0] && readerPages[0].imageUrlFallback
    };
    var privatePages = book.pages.map(function (page, index) {
      return { text: pageText(page), imageUrlFallback: "wondii-private:castle-lost-lanterns/p" + (index + 1) };
    });
    var store = Shelf.memoryStore();
    var saved = Shelf.commitBook({
      creationKey: BODY.creationKey,
      owner: { userId: "local-prototype", accountKind: "adult" },
      result: {
        status: "REVIEWABLE",
        illustrationStyle: "wondii-picture-book",
        bible: { title: shelfBook.title },
        pages: privatePages
      }
    }, { store: store });
    var again = Shelf.commitBook({
      creationKey: BODY.creationKey,
      owner: { userId: "local-prototype", accountKind: "adult" },
      result: {
        status: "REVIEWABLE",
        illustrationStyle: "wondii-picture-book",
        bible: { title: shelfBook.title },
        pages: privatePages
      }
    }, { store: store });
    require("../../games/book-prototype/book-data.js");
    var opened = global.WondiiBookData.plan(store.readShelf("local-prototype")[0]);
    var reopened = global.WondiiBookData.plan(store.readShelf("local-prototype")[0]);
    fs.writeFileSync(path.join(OUT, "reader-book.json"), JSON.stringify(shelfBook, null, 2));
    fs.writeFileSync(path.join(OUT, "open.html"), "<!DOCTYPE html><meta charset=\"utf-8\"><title>Open the castle book</title><script>fetch(\"reader-book.json\").then(function(r){return r.json()}).then(function(book){sessionStorage.setItem(\"wondii-reader-fixture\", JSON.stringify({userId:\"local-fixture\", books:[book]})); location.replace(\"/games/book-prototype/?book=\"+encodeURIComponent(book.id));});</script>");
    writeReport({
      stage: results.every(function (row) { return row.ok; }) ? "illustrations-complete" : "illustrations-reviewed",
      resumed: true,
      textCalls: counts.text,
      title: book.bible.title,
      pages: results,
      save: {
        ok: saved.ok,
        claimed: saved.claimed,
        duplicate: again.duplicate,
        readerPages: opened.pages.length,
        reopenedPages: reopened.pages.length,
        missingArt: opened.pages.filter(function (page) { return page.missingArt; }).length,
        textsMatch: opened.pages.every(function (page, index) { return page.text === pageText(book.pages[index]); })
      }
    });
  });
}

function main() {
  var planned = Adapter.planRequest(BODY);
  if (!planned.ok) throw new Error("Plan failed: " + (planned.problems || []).join(","));
  if (planned.constraintYear !== "Ages 7–9") throw new Error("Writing level is " + planned.constraintYear);
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  fs.mkdirSync(path.join(OUT, "images"), { recursive: true });
  console.log("OpenAI cannot enforce a pound cap. This run stops at 8 text calls and 24 image calls.");
  return Writer.generateBook(planned.request, {
    callModel: function (brief, opts) { return callModel(key, brief, opts); },
    model: "gpt-6.1-sol",
    effort: "low"
  }).then(function (book) {
    var story = (book.pages || []).map(function (page, index) {
      return "Page " + (index + 1) + "\n" + pageText(page);
    }).join("\n\n");
    fs.writeFileSync(path.join(OUT, "story.txt"), (book.bible && book.bible.title ? book.bible.title + "\n\n" : "") + story);
    fs.writeFileSync(path.join(OUT, "book.json"), JSON.stringify(book, null, 2));
    var problems = storyGate(book);
    if (problems.length) {
      writeReport({ stage: "story-stopped", problems: problems, title: book.bible && book.bible.title, pages: (book.pages || []).length });
      return;
    }
    var contracts = Visual.contractsFor(book.bible, book.pages, {});
    var cast = contracts.visualBible.cast || [];
    var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
    Identity.clearCache();
    var scenes = book.pages.map(function (page) {
      return Identity.prepareScene(book.bible.identityRegistry, page.charactersPresent || []);
    });
    if (scenes.some(function (scene) { return scene.blocksGeneration || (scene.omitted || []).length || (scene.passes || []).length > 1; })) {
      writeReport({ stage: "references-stopped", problems: ["reference-blocked"] });
      return;
    }
    var results = [];
    return contracts.spreads.reduce(function (chain, spread, index) {
      return chain.then(function () {
        var scene = scenes[index];
        var references = (scene.passes && scene.passes[0]) || scene.files || [];
        var present = spread.charactersPresent || [];
        references = references.filter(function (row) { return present.indexOf(row.characterId) >= 0; });
        spread.bible = book.bible;
        var prompt = Visual.spreadPrompt(book.bible, spread, lineup);
        fs.writeFileSync(path.join(OUT, "images", spread.spreadId + ".prompt.txt"), prompt);
        return drawPage(key, spread, prompt, references, lineup).then(function (drawn) {
          results.push({
            page: index + 1,
            spreadId: spread.spreadId,
            ok: drawn.ok,
            repairs: drawn.repairs,
            reason: drawn.reason || "",
            problems: drawn.verdict ? drawn.verdict.problems : [],
            file: drawn.file ? path.relative(ROOT, drawn.file) : ""
          });
          console.log(JSON.stringify(results[results.length - 1]));
        });
      });
    }, Promise.resolve()).then(function () {
      var readerPages = book.pages.map(function (page, index) {
        var hit = results[index];
        var src = hit && hit.file ? "/" + hit.file : "";
        return { text: pageText(page), imageUrlFallback: src };
      });
      var shelfBook = {
        id: "castle-lost-lanterns",
        title: (book.bible && book.bible.title) || "The Castle of Lost Lanterns",
        author: "Wondii",
        readerArtLayout: "duplex",
        storyTextMode: "prose",
        storyLength: "medium",
        illustrationStyle: "wondii-picture-book",
        v2: true,
        pages: readerPages,
        sceneUrlFallback: readerPages[0] && readerPages[0].imageUrlFallback
      };
      var privatePages = book.pages.map(function (page, index) {
        return { text: pageText(page), imageUrlFallback: "wondii-private:castle-lost-lanterns/p" + (index + 1) };
      });
      var store = Shelf.memoryStore();
      var saved = Shelf.commitBook({
        creationKey: BODY.creationKey,
        owner: { userId: "local-prototype", accountKind: "adult" },
        result: {
          status: "REVIEWABLE",
          illustrationStyle: "wondii-picture-book",
          bible: { title: shelfBook.title },
          pages: privatePages
        }
      }, { store: store });
      var again = Shelf.commitBook({
        creationKey: BODY.creationKey,
        owner: { userId: "local-prototype", accountKind: "adult" },
        result: {
          status: "REVIEWABLE",
          illustrationStyle: "wondii-picture-book",
          bible: { title: shelfBook.title },
          pages: privatePages
        }
      }, { store: store });
      require("../../games/book-prototype/book-data.js");
      var opened = global.WondiiBookData.plan(store.readShelf("local-prototype")[0]);
      fs.writeFileSync(path.join(OUT, "reader-book.json"), JSON.stringify(shelfBook, null, 2));
      var opener = "<!DOCTYPE html><meta charset=\"utf-8\"><title>Open the castle book</title><script>fetch(\"reader-book.json\").then(function(r){return r.json()}).then(function(book){sessionStorage.setItem(\"wondii-reader-fixture\", JSON.stringify({userId:\"local-fixture\", books:[book]})); location.replace(\"/games/book-prototype/?book=\"+encodeURIComponent(book.id));});</script>";
      fs.writeFileSync(path.join(OUT, "open.html"), opener);
      writeReport({
        stage: results.every(function (row) { return row.ok; }) ? "complete" : "pictures-reviewed",
        title: shelfBook.title,
        modelTitle: book.bible && book.bible.title,
        writing: book.bible && { ageBand: book.bible.ageBand, yearGroup: book.bible.yearGroup, readerStage: book.bible.readerStage },
        pages: results,
        save: { ok: saved.ok, claimed: saved.claimed, duplicate: again.duplicate, readerPages: opened.pages.length, missingArt: opened.pages.filter(function (page) { return page.missingArt; }).length }
      });
    });
  });
}

if (require.main === module) {
  var illustrate = process.argv.indexOf("--illustrate") >= 0;
  Promise.resolve(illustrate ? resumeIllustrations() : preflight()).catch(function (error) {
    if (illustrate) {
      try { writeReport({ stage: "error", error: redact(error && error.message || error) }); } catch (e) { console.error(redact(error && error.message || error)); }
    } else console.error(redact(error && error.message || error));
    process.exit(1);
  });
}

module.exports = {
  resumeCheckpoint: resumeCheckpoint,
  proseFingerprint: proseFingerprint,
  MEASURED_BOTH_USD: MEASURED_BOTH_USD
};
