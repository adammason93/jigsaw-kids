"use strict";

/* Prepares the next adventure test. It does not call a model or draw a picture. */

var fs = require("fs");
var path = require("path");
var Adapter = require("../../js/book-v2-adapter.js");
var Adventure = require("../../js/book-adventure.js");
var Writer = require("./writer.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall");
var GBP_PER_USD = 0.754;

var body = {
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

function basename(file) {
  return String(file || "").split("/").pop();
}

function main() {
  var planned = Adapter.planRequest(body);
  if (!planned.ok) {
    console.error(planned.problems.join(", "));
    process.exit(1);
  }
  var ask = planned.request;
  var kind = Adventure.storyKind(ask);
  var brief = Writer.bibleBrief(ask);
  var references = (ask.identityRegistry || []).filter(function (row) {
    return ask.castIds.indexOf(row.characterId) >= 0 || ask.castIds.indexOf(row.journeyId) >= 0;
  }).map(function (row) {
    return {
      characterId: row.journeyId || row.characterId,
      name: row.name,
      reference: basename(row.approvedReference || row.portrait || row.reference || ""),
      referenceApproved: row.referenceApproved === true
    };
  });
  var storyUsd = { happy: 0.22, withOneRepair: 0.32 };
  var request = {
    generated: false,
    paidCalls: 0,
    saveTo: "docs/agent/book-v2/secret-beyond-the-waterfall/",
    leavesUntouched: "docs/agent/book-v2/castle-lost-lanterns/",
    pipeline: [
      "story kind and journey guide",
      "book bible, including the journey",
      "adventure progression checks",
      "page plan",
      "read-aloud prose",
      "illustration plan for each page"
    ],
    pictures: "Not part of this request. Illustration generation stays off until a separate approval.",
    estimate: {
      storyHappyUsd: storyUsd.happy,
      storyHappyGbp: Math.round(storyUsd.happy * GBP_PER_USD * 100) / 100,
      storyWithOneRepairUsd: storyUsd.withOneRepair,
      storyWithOneRepairGbp: Math.round(storyUsd.withOneRepair * GBP_PER_USD * 100) / 100,
      basis: "The previous 12-page story cost $0.160. The journey makes the plan a little longer. One repair is included in the higher figure. Eight text calls remain the cap. These are estimates, not a provider cap.",
      illustrationLaterUsd: 0.50,
      illustrationLaterGbp: Math.round(0.50 * GBP_PER_USD * 100) / 100
    },
    input: body,
    storyKind: kind,
    needsJourney: Adventure.needsJourney(ask),
    ageBand: planned.ageBand,
    constraintYear: planned.constraintYear,
    tone: ask.tone,
    length: ask.length,
    pageCount: ask.pageCount,
    castIds: ask.castIds,
    references: references,
    illustrationStyle: planned.illustrationStyle,
    guide: Adventure.writerGuide(ask)
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "request.json"), JSON.stringify(request, null, 2));
  fs.writeFileSync(path.join(OUT, "request-brief.txt"), brief.system + "\n\n" + brief.user);
  console.log(JSON.stringify({
    ok: planned.ok,
    generated: false,
    kind: kind,
    tone: ask.tone,
    pages: ask.pageCount,
    cast: ask.castIds,
    references: references,
    style: planned.illustrationStyle,
    saveTo: request.saveTo
  }));
}

if (require.main === module) main();
