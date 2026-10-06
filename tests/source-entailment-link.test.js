"use strict";

// Entailment link gate. A passage that only lists two facts side by side must not support a
// causal or functional link. The model verdict is checked in code: a "supported" claim that
// states a purpose, cause or result is held unless its quote states that link itself.
// The cases are the exact lenient passes from the two live Year 3 dinosaur runs (6 Oct 2026).

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var simpleP02 = "Dinosaurs had adaptations that helped make them successful. The first known dinosaurs were small predators that walked on two legs. All their descendants had an upright posture, with the legs underneath the body. This transformed their whole life-style. Most of the smaller dinosaurs had feathers, and were probably warm-blooded. This would make them active, with a higher metabolism than modern reptiles. Social interaction, with living in herds and co-operation, seems certain for some types.";
var nhmP01 = "One of the reasons for dinosaurs' success is that they had straight back legs, perpendicular to their bodies. This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles. With their legs positioned under their bodies rather than sticking out to the side, dinosaurs' weight was also better supported.";

var ctx = {
  yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
  lessonBrief: { intent: "explain", learningGoal: "Pupils will understand how dinosaurs adapted to their environments.", teacherIntent: { ok: true, learningGoal: "Pupils will understand how dinosaurs adapted to their environments.", focusConcepts: ["adaptation"] } },
  researchEvidence: { passages: [
    { id: "S1-P02", url: "https://simple.wikipedia.org/wiki/Dinosaur", title: "Dinosaur (Simple English Wikipedia)", text: simpleP02 },
    { id: "S3-P01", url: "https://www.nhm.ac.uk/discover/what-are-dinosaurs.html", title: "What are dinosaurs?", text: nhmP01 }
  ], selectedPassageIds: ["S1-P02", "S3-P01"] }
};
function c(text, depth, ref, quote) {
  return { text: text, depth: depth, kind: "fact", confidence: "high", provenance: "retrieved", sourceRef: [ref], quote: quote, factuallyVerified: false, ageFit: { from: 1, to: 6 } };
}
var lenient = [
  // Run 2 and run 1: rated "supported" by the model; the passage lists feathers and warm-blooded side by side.
  c("Some dinosaurs had feathers, which may have helped them stay warm.", "concrete", "S1-P02", "Most of the smaller dinosaurs had feathers, and were probably warm-blooded."),
  // Run 1: rated "supported"; the quote never says two legs helped them move quickly.
  c("Dinosaurs walked on two legs, which helped them move quickly.", "concrete", "S1-P02", "The first known dinosaurs were small predators that walked on two legs.")
];
var genuine = [
  c("Straight back legs allowed dinosaurs to use less energy to move than lizards.", "mechanism", "S3-P01", "This allowed them to use less energy to move than other reptiles that had a sprawling stance"),
  c("Dinosaurs had adaptations that helped make them successful.", "concrete", "S1-P02", "Dinosaurs had adaptations that helped make them successful."),
  c("Dinosaurs had straight back legs under their bodies, not sticking out sideways.", "concrete", "S3-P01", "With their legs positioned under their bodies rather than sticking out to the side")
];

var pack = Brain.normaliseKnowledgePack({ status: "usable", claims: lenient.concat(genuine) }, ctx);
var retrieved = pack.claims.filter(function (claim) { return claim.provenance === "retrieved"; });
assert.strictEqual(retrieved.length, 5, "all five quotes are verbatim, so all reach entailment");
// The model said "supported" for every claim, as it did live. It also gave the link words for
// the genuine mechanism and placed each word not in the source as simpler wording.
var linkFor = { "Straight back legs allowed dinosaurs to use less energy to move than lizards.": "This allowed them to use less energy to move", "Dinosaurs had adaptations that helped make them successful.": "Dinosaurs had adaptations that helped make them successful." };
Brain.applySourceEntailment(pack, { ok: true, results: retrieved.reduce(function (acc, claim) { acc[claim.claimId] = { verdict: "supported", missing: "", linkQuote: linkFor[claim.text] || "", wording: claim.wordsNotInSource || [], addedFacts: [] }; return acc; }, {}) });

function byText(text) { return pack.claims.filter(function (claim) { return claim.text === text; })[0]; }
lenient.forEach(function (item) {
  var claim = byText(item.text);
  assert.strictEqual(claim.entailment, "unsupported", item.text);
  assert.strictEqual(claim.sourceHold, true, item.text);
  assert.ok(/LINK_NOT_IN_QUOTE/.test(claim.entailmentNote), claim.entailmentNote);
});
genuine.forEach(function (item) {
  var claim = byText(item.text);
  assert.strictEqual(claim.entailment, "supported", item.text);
  assert.strictEqual(claim.sourceHold, false, item.text);
});
assert.strictEqual(pack.sourceAudit.entailment.linkHeld, 2);
assert.strictEqual(pack.sourceAudit.entailment.supported, 3);
assert.strictEqual(pack.sourceAudit.entailment.unsupported, 2);

// Held claims never reach selection.
var selection = Brain.selectPackForLesson(pack, ctx);
lenient.forEach(function (item) { assert.strictEqual((selection.claimIds || []).indexOf(byText(item.text).claimId), -1); });

// The detectors on their own.
assert.strictEqual(Brain.claimStatesLink("Some dinosaurs had special features like horns or spikes for protection."), true);
assert.strictEqual(Brain.quoteStatesLink("For example, Triceratops had three horns on its head shield, Ankylosaurus was covered in boney plates, and Stegosaurus had spikes on its tail."), false);
assert.strictEqual(Brain.quoteStatesLink("Other plant-eaters, such as Iguanodon, had special weapons to help them fight off the meat-eaters."), true);
assert.strictEqual(Brain.claimStatesLink("Ankylosaurus had thick bony plates covering its back."), false);

// Link-quote rule: a how/why claim the model calls supported needs the exact quote words that
// state the link. Missing, invented, or link-free words hold it as partial.
function linkCase(linkQuote) {
  var p = Brain.normaliseKnowledgePack({ status: "usable", claims: [genuine[0]] }, ctx);
  var claim = p.claims[0];
  Brain.applySourceEntailment(p, { ok: true, results: { [claim.claimId]: { verdict: "supported", missing: "", linkQuote: linkQuote, wording: claim.wordsNotInSource, addedFacts: [] } } });
  return claim;
}
assert.strictEqual(linkCase("This allowed them to use less energy to move").entailment, "supported");
assert.strictEqual(linkCase("This allowed them to use less energy to move").linkQuote, "This allowed them to use less energy to move");
["", "straight legs enabled them to run far", "use less energy to move than other"].forEach(function (lq) {
  var held = linkCase(lq);
  assert.strictEqual(held.entailment, "partial", JSON.stringify(lq));
  assert.strictEqual(held.sourceHold, true);
  assert.ok(/LINK_NOT_QUOTED/.test(held.entailmentNote), held.entailmentNote);
});

// Added-detail rule. Live case (agent-b run, 6 Oct 2026): "Dinosaurs laid eggs in nests." was
// rated supported from NHM "Like other reptiles, they laid eggs."; the passage never mentions nests.
var nhmEggs = "They had an upright stance, with legs perpendicular to their body. This is the main feature that sets dinosaurs apart from other reptiles. Like other reptiles, they laid eggs. With the exception of some birds, for example penguins, dinosaurs lived on land, not in the sea.";
var eggCtx = Object.assign({}, ctx, { researchEvidence: { passages: [{ id: "S2-P04", url: "https://www.nhm.ac.uk/discover/what-are-dinosaurs.html", title: "What are dinosaurs?", text: nhmEggs }], selectedPassageIds: ["S2-P04"] } });
function eggCase(text, row) {
  var p = Brain.normaliseKnowledgePack({ status: "usable", claims: [c(text, "concrete", "S2-P04", "Like other reptiles, they laid eggs.")] }, eggCtx);
  var claim = p.claims[0];
  Brain.applySourceEntailment(p, { ok: true, results: { [claim.claimId]: Object.assign({ verdict: "supported", missing: "", linkQuote: "" }, row) } });
  return claim;
}
var nests = eggCase("Dinosaurs laid eggs in nests.", { wording: [], addedFacts: [] });
assert.deepStrictEqual(nests.wordsNotInSource, ["nests"]);
assert.strictEqual(nests.entailment, "partial");
assert.strictEqual(nests.sourceHold, true);
assert.ok(/ADDED_DETAIL: .*nests/.test(nests.entailmentNote), nests.entailmentNote);
// Even if the model calls "nests" mere wording it is listed, so a reviewer sees it; if it calls it
// an added fact the claim is held.
assert.strictEqual(eggCase("Dinosaurs laid eggs in nests.", { wording: ["nests"], addedFacts: ["nests"] }).sourceHold, true);
// The faithful claim has no extra word and stays supported.
var eggs = eggCase("Like other reptiles, dinosaurs laid eggs.", { wording: [], addedFacts: [] });
assert.deepStrictEqual(eggs.wordsNotInSource, []);
assert.strictEqual(eggs.entailment, "supported");
var brief = Brain.sourceEntailmentBrief(Brain.normaliseKnowledgePack({ status: "usable", claims: [c("Dinosaurs laid eggs in nests.", "concrete", "S2-P04", "Like other reptiles, they laid eggs.")] }, eggCtx), eggCtx);
assert.deepStrictEqual(JSON.parse(brief.user).items[0].wordsNotInSource, ["nests"]);
assert.ok(/linkQuote/.test(brief.system) && /addedFacts/.test(brief.system));

// The entailment prompt tells the model the same rule.
brief = Brain.sourceEntailmentBrief(pack, ctx);
assert.ok(/Two facts that the quote only lists side by side do not support a link/.test(brief.system));

console.log("source-entailment-link tests passed");
