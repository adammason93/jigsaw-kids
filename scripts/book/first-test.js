"use strict";

/* Isolated plan for the first real Maya and Leo book.
   The website route is not changed. This file does not read an API key,
   call a model, or draw a picture. A paid run has to pass those functions in. */

var fs = require("fs");
var path = require("path");
var Adapter = require("../../js/book-v2-adapter.js");
var Writer = require("./writer.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Shelf = require("../../js/book-v2-shelf.js");

var ROOT = path.join(__dirname, "..", "..");

var TEST_BODY = {
  familyAgeBand: "7-9",
  members: [
    { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
    { id: "wondii-leo", name: "Leo", source: "wondii-crew" }
  ],
  idea: "Maya and Leo follow a paper lantern through the castle.",
  place: "castle",
  length: "medium",
  pageCount: 12,
  theme: "Adventure",
  creationKey: "maya-leo-castle-01"
};

function listedImage(prompt) {
  var tokens = Math.ceil(String(prompt || "").length / 3);
  return (tokens * 5 + 8000 * 8 + 600 * 30) / 1e6;
}

function estimateCost(prompts) {
  var textHappy = 0.08495 + 0.064668;
  var textWorst = 0.08495 + (4 * 0.09295) + 0.064668 + (2 * 0.07);
  var vision = (2000 * 0.15 + 400 * 0.6) / 1e6;
  var pages = prompts && prompts.length ? prompts.length : 12;
  var imageEach = prompts && prompts.length
    ? prompts.reduce(function (sum, text) { return sum + listedImage(text); }, 0) / prompts.length
    : 0.06816;
  var imagesHappy = pages * imageEach + pages * vision;
  var imagesWorst = pages * 2 * imageEach + pages * 2 * vision;
  return {
    source: "October Book V2 proof prices and the existing image formula. Not a new quote.",
    textCallsHappy: 2,
    textCallsWorst: 8,
    imageCallsHappy: pages,
    imageCallsWorst: pages * 2,
    visionCallsHappy: pages,
    visionCallsWorst: pages * 2,
    listedUsdHappy: Number((textHappy + imagesHappy).toFixed(2)),
    listedUsdWorst: Number((textWorst + imagesWorst).toFixed(2)),
    allowanceClaimsOnSuccess: 1,
    allowanceClaimsOnFailure: 0
  };
}

function readable(file) {
  if (!file || /^https?:/i.test(file)) return { ok: false, reason: "missing", file: file || "" };
  var abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(abs)) return { ok: false, reason: "missing", file: file };
  var size = fs.statSync(abs).size;
  return { ok: size > 0, reason: size > 0 ? "readable" : "missing", file: file, bytes: size };
}

function placePhrase(place) {
  var names = {
    library: "Wondii World",
    bedroom: "the child's home",
    woods: "the woods",
    undersea: "under the sea",
    castle: "the castle"
  };
  return names[place] || "";
}

function prepare(body) {
  var source = body || TEST_BODY;
  var planned = Adapter.planRequest(source);
  var phrase = placePhrase(source.place);
  var idea = planned.request && planned.request.idea ? planned.request.idea : "";
  var problems = (planned.problems || []).slice();
  if (!planned.ok) {
    return { ok: false, stage: "plan", problems: problems, imageCalls: 0, calledModel: false };
  }
  var maya = (planned.identities || []).filter(function (row) { return row.journeyId === "wondii-maya"; })[0];
  var leo = (planned.identities || []).filter(function (row) { return row.journeyId === "wondii-leo"; })[0];
  if (!maya || maya.reference.indexOf("maya-v1.jpg") < 0) problems.push("maya-reference");
  if (!leo || leo.reference.indexOf("wondii-leo.jpg") < 0 || leo.reference.indexOf("maya-v1") >= 0) problems.push("leo-reference");
  var mayaFile = readable(maya && maya.reference);
  var leoFile = readable(leo && leo.reference);
  if (!mayaFile.ok) problems.push("maya-file");
  if (!leoFile.ok) problems.push("leo-file");
  if (!phrase || idea.toLowerCase().indexOf(phrase.toLowerCase()) < 0) problems.push("world-missing");
  if (source.place !== "woods" && /\b(forest|woods)\b/i.test(idea)) problems.push("world-replaced");
  if (planned.illustrationStyle !== "wondii-picture-book") problems.push("style");
  if (!planned.request || planned.request.length !== "storybook") problems.push("length");
  return {
    ok: problems.length === 0,
    stage: problems.length ? "plan" : "awaiting-approval",
    problems: problems,
    calledModel: false,
    imageCalls: 0,
    generated: false,
    saved: false,
    claimed: false,
    idea: idea,
    place: phrase,
    style: planned.illustrationStyle,
    length: planned.request.length,
    pageCount: planned.request.pageCount || 0,
    writing: {
      familyAgeBand: planned.familyAgeBand,
      constraintYear: planned.constraintYear
    },
    references: {
      maya: mayaFile,
      leo: leoFile
    },
    cost: estimateCost(null),
    request: planned.request,
    identities: planned.identities
  };
}

function worldProblems(book, phrase) {
  var problems = [];
  var bible = book.bible || {};
  var blob = [bible.premise, bible.hook].concat((bible.locations || []).map(function (place) {
    return place.name + " " + place.visualIdentity;
  })).join(" ");
  var lower = blob.toLowerCase();
  var token = String(phrase || "").toLowerCase().split(/\s+/).pop();
  if (phrase && lower.indexOf(phrase.toLowerCase()) < 0 && lower.indexOf(token) < 0) problems.push("world-missing");
  if (phrase !== "the woods" && /\bforest\b/i.test(blob)) problems.push("world-replaced");
  return problems;
}

function existingBook(store, owner, key) {
  if (!store || !owner) return null;
  return (store.readShelf(owner.userId) || []).filter(function (book) {
    return book && book.creationKey === key;
  })[0] || null;
}

function run(body, ports) {
  var source = body || TEST_BODY;
  var gate = ports || {};
  var prepared = prepare(source);
  if (!prepared.ok) return Promise.resolve(prepared);
  var key = String(source.creationKey || "");
  var found = existingBook(gate.store, gate.owner, key);
  if (found) {
    require("../../games/book-prototype/book-data.js");
    return Promise.resolve({
      ok: true,
      stage: "already-saved",
      calledModel: false,
      imageCalls: 0,
      saved: true,
      claimed: false,
      duplicate: true,
      book: found,
      reader: global.WondiiBookData.plan(found)
    });
  }
  var attempts = gate.attempts || {};
  if (attempts[key]) {
    return Promise.resolve({
      ok: false,
      stage: "retry",
      calledModel: false,
      imageCalls: 0,
      saved: false,
      claimed: false,
      reason: "already-started",
      message: "This test already started. It was not run again."
    });
  }
  if (typeof gate.callModel !== "function") {
    return Promise.resolve(prepared);
  }
  attempts[key] = { started: true };
  return Writer.generateBook(prepared.request, {
    callModel: gate.callModel,
    model: "mock"
  }).then(function (book) {
    var pages = book.pages || [];
    var problems = worldProblems(book, prepared.place);
    if (book.status !== "REVIEWABLE") problems.push("not-reviewable");
    if (pages.length !== 12) problems.push("page-count:" + pages.length);
    if (book.imageCalls || book.imageDraws) problems.push("early-image");
    if (problems.length) {
      return {
        ok: false,
        stage: "validation",
        calledModel: true,
        imageCalls: 0,
        saved: false,
        claimed: false,
        problems: problems.concat(book.storyProblems || [], book.textProblems || []),
        message: "The story was not accepted. Nothing was saved."
      };
    }
    var registry = prepared.request.identityRegistry || [];
    Identity.clearCache();
    var scenes = pages.map(function (page) {
      return Identity.prepareScene(registry, page.charactersPresent || []);
    });
    var blocked = scenes.some(function (scene) { return scene.blocksGeneration || scene.omitted.length; });
    if (blocked) {
      return {
        ok: false,
        stage: "references",
        calledModel: true,
        imageCalls: 0,
        saved: false,
        claimed: false,
        problems: ["reference-blocked"],
        message: "A reference was missing. Nothing was saved."
      };
    }
    var contracts = Visual.contractsFor(book.bible, pages, {});
    var prompts = (contracts.spreads || []).map(function (spread) {
      var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
      return Visual.spreadPrompt(book.bible, spread, lineup);
    });
    if (typeof gate.drawPage !== "function") {
      return {
        ok: false,
        stage: "awaiting-pictures",
        calledModel: true,
        imageCalls: 0,
        saved: false,
        claimed: false,
        pageCount: pages.length,
        prompts: prompts.length,
        cost: estimateCost(prompts),
        message: "The story is valid. Pictures were not drawn, and nothing was saved."
      };
    }
    var drawn = [];
    var failed = false;
    pages.forEach(function (page, index) {
      if (failed) return;
      var picture = gate.drawPage(page, prompts[index], scenes[index]);
      if (!picture || !picture.ok || !picture.imageUrl) failed = true;
      else drawn.push(Object.assign({}, page, { imageUrlFallback: picture.imageUrl }));
    });
    if (failed || drawn.length !== pages.length) {
      return {
        ok: false,
        stage: "pictures",
        calledModel: true,
        imageCalls: drawn.length,
        saved: false,
        claimed: false,
        problems: ["pictures-failed"],
        message: "The pictures were not accepted. Nothing was saved."
      };
    }
    var saved = Shelf.commitBook({
      result: Object.assign({}, book, {
        illustrationStyle: "wondii-picture-book",
        pages: drawn
      }),
      owner: gate.owner,
      creationKey: key
    }, { store: gate.store, allowance: gate.allowance });
    if (!saved.ok) {
      return {
        ok: false,
        stage: "save",
        calledModel: true,
        imageCalls: drawn.length,
        saved: false,
        claimed: false,
        reason: saved.reason,
        message: saved.message
      };
    }
    require("../../games/book-prototype/book-data.js");
    return {
      ok: true,
      stage: "saved",
      calledModel: true,
      imageCalls: drawn.length,
      saved: true,
      claimed: saved.claimed === true,
      duplicate: false,
      title: saved.book.title,
      pageCount: saved.book.pages.length,
      book: saved.book,
      readerUrl: saved.reader,
      reader: global.WondiiBookData.plan(saved.book),
      cost: estimateCost(prompts)
    };
  });
}

module.exports = {
  TEST_BODY: TEST_BODY,
  prepare: prepare,
  run: run,
  estimateCost: estimateCost
};

if (require.main === module) {
  var planned = prepare(TEST_BODY);
  console.log(JSON.stringify({
    stage: planned.stage,
    ok: planned.ok,
    calledModel: planned.calledModel,
    imageCalls: planned.imageCalls,
    place: planned.place,
    style: planned.style,
    writing: planned.writing,
    references: planned.references,
    cost: planned.cost,
    message: "Paid generation is not approved. Nothing was called or saved."
  }, null, 2));
  process.exit(planned.ok ? 0 : 1);
}
