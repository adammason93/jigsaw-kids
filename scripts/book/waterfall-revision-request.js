"use strict";

/* Prepares a second waterfall story. It does not call a model, draw a picture,
   or write into either finished book. */

var fs = require("fs");
var path = require("path");
var Adapter = require("../../js/book-v2-adapter.js");
var Adventure = require("../../js/book-adventure.js");
var Writer = require("./writer.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall-revised");
var BASELINE = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall");
var CASTLE = path.join(ROOT, "docs/agent/book-v2/castle-lost-lanterns");
var GBP_PER_USD = 0.754;
var MEASURED_USD = 0.249884;

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
  creationKey: "secret-beyond-the-waterfall-02"
};

function basename(file) {
  return String(file || "").split("/").pop();
}

function main() {
  if (OUT === BASELINE || OUT === CASTLE) throw new Error("refusing to overwrite a finished book");
  var planned = Adapter.planRequest(body);
  if (!planned.ok) {
    console.error(planned.problems.join(", "));
    process.exit(1);
  }
  var ask = planned.request;
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
  var likely = 0.30;
  var high = 0.40;
  var request = {
    generated: false,
    paidCalls: 0,
    pictures: false,
    saveTo: "docs/agent/book-v2/secret-beyond-the-waterfall-revised/",
    leavesUntouched: [
      "docs/agent/book-v2/secret-beyond-the-waterfall/",
      "docs/agent/book-v2/castle-lost-lanterns/"
    ],
    pipeline: "The normal Book V2 text pipeline: journey guide, book bible, adventure checks, page plan, read-aloud prose, and an illustration plan. No images.",
    estimate: {
      measuredPreviousUsd: MEASURED_USD,
      measuredPreviousGbp: Math.round(MEASURED_USD * GBP_PER_USD * 1000) / 1000,
      likelyUsd: likely,
      likelyGbp: Math.round(likely * GBP_PER_USD * 100) / 100,
      highUsd: high,
      highGbp: Math.round(high * GBP_PER_USD * 100) / 100,
      textCallCap: 8,
      imageCalls: 0,
      basis: "The Water That Made Steps used 5 text calls and cost $0.249884. The new guide is slightly longer, so a similar attempt is about $0.30. Two extra repairs could reach about $0.40. Eight text calls remain the cap. No illustrations."
    },
    input: body,
    storyKind: Adventure.storyKind(ask),
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
  fs.writeFileSync(path.join(OUT, "revision-request.json"), JSON.stringify(request, null, 2));
  fs.writeFileSync(path.join(OUT, "revision-brief.txt"), brief.system + "\n\n" + brief.user);
  console.log(JSON.stringify({
    generated: false,
    paidCalls: 0,
    saveTo: request.saveTo,
    kind: request.storyKind,
    pages: ask.pageCount,
    age: planned.constraintYear,
    cast: ask.castIds,
    likelyGbp: request.estimate.likelyGbp
  }));
}

if (require.main === module) main();
