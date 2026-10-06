/* Place-name detection must not read title case or field joins as place names,
   and pack place names must not hide a place named in the request.
   Run: node tests/place-detection-boundaries.test.js */
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Core = require("../schools/learn/creator-core.js");

function creatorContext(sentence, year) {
  var draft = Core.blankDraft();
  draft.source = { type: "paste", filename: "", text: sentence, unsupported: false };
  draft.year = year;
  draft.yearSource = "teacher";
  var analysis = Core.analyseSource(sentence);
  if (analysis.ok) Core.applyAnalysis(draft, analysis);
  if (!draft.year) draft.year = year;
  return Brain.contextFrom(draft, { pupilCount: 4, availableMechanics: Brain.MECHANICS });
}
function needsSource(ctx, claims) {
  var pack = Brain.normaliseKnowledgePack({ status: "usable", claims: claims || [], mechanisms: [] }, JSON.parse(JSON.stringify(ctx)));
  return /^NEEDS_SOURCE/.test(pack.statusReason || "");
}
function claim(text) { return { text: text, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } }; }

// 1. Title-cased creator topics are not places.
[
  ["Year 6 geography. How do landslides happen?", "Year 6"],
  ["teach how volcanoes erupt", "Year 3"],
  ["learn about causes of earthquakes", "Year 1"],
  ["Year 4 geography. Why do rivers flood?", "Year 4"],
  ["Year 5 science. How are fossils formed in rock?", "Year 5"],
  ["Year 2 geography. Why does it rain?", "Year 2"]
].forEach(function (row) {
  assert.strictEqual(needsSource(creatorContext(row[0], row[1])), false, row[0]);
});

// 2. Field joins: topic "Landslides" + goal "Students should ..." is not a place.
var t7 = { yearGroup: "Year 6", subject: "Geography", topic: "Landslides", requestedMinutes: 15, lessonText: "Year 6 geography. How do landslides happen?", lessonBrief: { learningGoal: "Students should understand the process and causes of landslides.", teacherIntent: { learningGoal: "Students should understand the process and causes of landslides." } } };
assert.strictEqual(needsSource(t7), false, "field join is not a place");

// 3. Real named places still need a source.
assert.strictEqual(needsSource(creatorContext("Year 6 geography. Explain how the geology of Mam Tor caused the landslip.", "Year 6")), true, "Mam Tor");
var t8 = { yearGroup: "Year 6", subject: "Geography", topic: "Mam Tor", requestedMinutes: 15, lessonText: "Explain how the geology of Mam Tor caused the landslip.", lessonBrief: { learningGoal: "Understand how the geology of Mam Tor contributed to the landslip." } };
assert.strictEqual(needsSource(t8), true, "Mam Tor, harness-shaped context");
assert.strictEqual(needsSource(creatorContext("Year 4 geography. What caused the flood in Boscastle in 2004?", "Year 4")), true, "in Boscastle");
assert.strictEqual(needsSource(creatorContext("Year 5 science. Why is the spring water in Bath warm?", "Year 5")), true, "in Bath");

// 4. A pack place name cannot collapse the request's place away.
assert.strictEqual(needsSource(t8, [claim("At Mam Tor, soft shale under harder sandstone made the hillside slip."), claim("Soft rock layers can be weakened by water.")]), true, "'At Mam Tor' claim keeps NEEDS_SOURCE");
var pack = Brain.normaliseKnowledgePack({ status: "usable", claims: [claim("At Mam Tor, soft shale under harder sandstone made the hillside slip.")], mechanisms: [] }, JSON.parse(JSON.stringify(t8)));
assert.deepStrictEqual(pack.claims[0].placeNames, ["Mam Tor"], "leading preposition is not part of the place name");
assert.strictEqual(pack.claims[0].placeBound, true);

// 5. Known trade-off. "Reading" is a town, and this request also uses the
// ordinary word "reading". The lower-case rule treats that capitalised name as
// title case, so the place is missed and the request does not need a source.
// Claim-level detection still runs on each claim's own text; this case is the
// request alone. The same place without the lower-case word ("Why did Reading
// flood?") still needs a source.
assert.strictEqual(needsSource(creatorContext(
  "Year 4 geography. Why did the river flood at Reading while the class was reading about the flood?",
  "Year 4"
)), false, "Reading / reading: the place is missed");

console.log("place-detection-boundaries: all checks passed");
