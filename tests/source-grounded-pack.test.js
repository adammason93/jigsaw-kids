"use strict";

// Source-grounded knowledge packs. In research mode every admitted claim cites a fetched
// passage and carries a quote that code finds verbatim in that passage. Support is labelled
// "quote-verified + automated entailment check"; it is never human verification. The
// non-research path and the readiness contract are unchanged.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var ask = "Teach Year 3 about dinosaurs";
var goal = "Pupils will explain how the teeth, necks and armour of dinosaurs helped them survive.";

var passages = [
  { id: "S1-P01", sourceId: "S1", url: "https://simple.wikipedia.org/wiki/Dinosaur", title: "Dinosaur (Simple English Wikipedia)", section: "Teeth", retrievedAt: "2026-10-06T10:00:00.000Z",
    text: "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges. The jagged edges worked like a saw, so the teeth could slice through meat." },
  { id: "S2-P01", sourceId: "S2", url: "https://www.nhm.ac.uk/discover/plant-eaters.html", title: "Plant-eating dinosaurs | Natural History Museum", section: "", retrievedAt: "2026-10-06T10:00:01.000Z",
    text: "Many sauropods had long necks. A long neck let a sauropod reach leaves high in the trees that other animals could not reach, so it could feed without moving its huge body very much." },
  { id: "S3-P01", sourceId: "S3", url: "https://www.britannica.com/animal/ankylosaur", title: "Ankylosaur | Britannica", section: "", retrievedAt: "2026-10-06T10:00:02.000Z",
    text: "Ankylosaurus had thick bony plates covering its back. These bony plates acted like armour, which means predators found it very hard to bite through to the animal\u2019s body." }
];

function ctxFor(extra) {
  return Object.assign({
    yearGroup: "Year 3",
    subject: "Science",
    topic: "Dinosaurs",
    requestedMinutes: 15,
    lessonText: ask,
    lessonBrief: { intent: "explain", rawRequest: ask, learningGoal: goal,
      teacherIntent: { ok: true, learningGoal: goal, focusConcepts: ["dinosaur teeth", "long necks", "armour"], requiredEvidence: "Pupils explain how a body part helped a dinosaur." } },
    researchEvidence: { passages: passages, selectedPassageIds: passages.map(function (p) { return p.id; }) }
  }, extra || {});
}

function claim(text, depth, ref, quote, extra) {
  return Object.assign({ text: text, kind: "fact", depth: depth, confidence: "high", provenance: "retrieved", sourceRef: [ref], quote: quote,
    teacherRequested: false, factuallyVerified: false, contested: false, uncertainty: "", ageFit: { from: depth === "concrete" ? 1 : 3, to: 6 }, importance: "core", accepted: true }, extra || {});
}

var teethF = claim("Meat-eating dinosaurs like Tyrannosaurus had sharp curved teeth with jagged edges.", "concrete", "S1-P01", "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges.");
var teethM = claim("The jagged edges on sharp curved teeth worked like a saw, so they could slice through meat.", "mechanism", "S1-P01", "The jagged edges worked like a saw, so the teeth could slice through meat");
var neckF = claim("Many sauropod dinosaurs had very long necks on their huge bodies.", "concrete", "S2-P01", "Many sauropods had long necks.  A long neck let a sauropod");
var neckM = claim("A very long neck let a sauropod reach high leaves, so it could feed without moving much.", "mechanism", "S2-P01", "A long neck let a sauropod reach leaves high in the trees");
var armourF = claim("Ankylosaurus had thick bony plates covering the whole of its back.", "concrete", "S3-P01", "Ankylosaurus had thick bony plates covering its back.");
var armourM = claim("The thick bony plates acted like armour, which means predators found it hard to bite through.", "mechanism", "S3-P01", "These bony plates acted like armour, which means predators found it very hard to bite through to the animal's body");

function rawPack(extraClaims) {
  var claims = [teethF, teethM, neckF, neckM, armourF, armourM].concat(extraClaims || []);
  return {
    status: "usable", falsePremise: "", blockReason: "", niche: false,
    claims: claims,
    mechanisms: [
      { text: teethM.text, feature: "jagged edges", sourceRef: teethM.sourceRef, quote: teethM.quote },
      { text: neckM.text, feature: "long neck", sourceRef: neckM.sourceRef, quote: neckM.quote },
      { text: armourM.text, feature: "bony plates", sourceRef: armourM.sourceRef, quote: armourM.quote }
    ],
    concepts: ["teeth", "necks", "armour"],
    vocabulary: [
      { term: "sauropod", gloss: "a plant-eating dinosaur with a long neck", sourceRef: ["S2-P01"], quote: "Many sauropods had long necks. A long neck" },
      { term: "predator", gloss: "an animal that hunts others", sourceRef: ["S9-P01"], quote: "a predator is an animal that hunts" }
    ],
    misconceptions: [{ text: "All dinosaurs ate meat.", corrects: "Many sauropods had long necks" }],
    openQuestions: []
  };
}

// 1. Quote verification: normalised whitespace, case and typographic quotes; refuses ellipses,
//    short quotes, and text not in the passage.
assert.strictEqual(Brain.quoteInPassage("MEAT-EATING dinosaurs  such as tyrannosaurus had sharp", passages[0].text).ok, true);
assert.strictEqual(Brain.quoteInPassage("predators found it very hard to bite through to the animal's body", passages[2].text).ok, true);
assert.strictEqual(Brain.quoteInPassage("\u201cso the teeth could slice through meat.\u201d", passages[0].text).ok, true);
assert.strictEqual(Brain.quoteInPassage("sharp, curved teeth ... slice through meat", passages[0].text).reason, "QUOTE_NOT_CONTIGUOUS");
assert.strictEqual(Brain.quoteInPassage("sharp teeth", passages[0].text).reason, "QUOTE_TOO_SHORT");
assert.strictEqual(Brain.quoteInPassage("the teeth could crush bones into small pieces", passages[0].text).reason, "QUOTE_NOT_FOUND");
assert.strictEqual(Brain.quoteInPassage("", passages[0].text).reason, "QUOTE_MISSING");
assert.strictEqual(Brain.SOURCE_SUPPORT_LABEL, "quote-verified + automated entailment check");

// 2. Brief: research mode sends passages and requires sourceRef + quote; the original brief is unchanged.
var ctx = ctxFor();
var brief = Brain.knowledgePackBrief(ctx);
var user = JSON.parse(brief.user);
assert.strictEqual(user.sources.length, 3);
assert.ok(user.sources.every(function (s) { return s.id && s.url && s.text; }));
assert.ok(/sourceRef/.test(brief.system) && /character for character/.test(brief.system));
assert.ok(/factuallyVerified must be false/.test(brief.system));
assert.strictEqual(typeof user.strandPairsRequired, "number");
var plainCtx = ctxFor({ researchEvidence: undefined });
var plainBrief = Brain.knowledgePackBrief(plainCtx);
assert.ok(/This step has no web search, curated pack, or curriculum document/.test(plainBrief.system));
assert.strictEqual(/sources in the request/.test(plainBrief.system), false);
assert.strictEqual("sources" in JSON.parse(plainBrief.user), false);
// The fetched evidence never leaks into later prompts through the lesson context.
assert.strictEqual(/worked like a saw/.test(Brain.planBrief(ctx).user), false);

// 3. Normalisation: unresolved and unquoted claims are rejected with a reason; verified claims are
//    retrieved, carry passage ids, URLs and the quote, and wait for entailment.
var invented = claim("Tyrannosaurus could run at 70 kilometres an hour.", "concrete", "S1-P01", "Tyrannosaurus could run at 70 kilometres an hour");
var unresolved = claim("Stegosaurus had a brain the size of a walnut.", "concrete", "S7-P03", "Stegosaurus had a brain the size of a walnut");
var noRef = claim("Velociraptor had feathers on its arms.", "concrete", null, "Velociraptor had feathers on its arms");
noRef.sourceRef = [];
var pack = Brain.normaliseKnowledgePack(rawPack([invented, unresolved, noRef]), ctx);
assert.strictEqual(pack.sourceMode, "retrieved");
assert.strictEqual(pack.sourceAudit.label, "quote-verified + automated entailment check");
assert.strictEqual(pack.sourceAudit.humanVerified, false);
assert.strictEqual(pack.sourceAudit.entailmentRan, false);
var reasons = pack.sourceAudit.rejectedByReason;
assert.strictEqual(reasons.QUOTE_NOT_FOUND, 1, JSON.stringify(reasons));
assert.strictEqual(reasons.UNRESOLVED_SOURCE, 3, JSON.stringify(reasons)); // two claims + one vocabulary item
var texts = pack.claims.map(function (c) { return c.text; });
assert.strictEqual(texts.indexOf(invented.text), -1);
assert.strictEqual(texts.indexOf(unresolved.text), -1);
assert.strictEqual(texts.indexOf(noRef.text), -1);
var admitted = pack.claims.filter(function (c) { return c.provenance === "retrieved"; });
assert.ok(admitted.length >= 6, String(admitted.length));
admitted.forEach(function (c) {
  assert.strictEqual(c.quoteVerified, true);
  assert.strictEqual(c.factuallyVerified, false);
  assert.strictEqual(c.sourceHold, true);
  assert.strictEqual(c.entailment, "pending");
  assert.ok(c.sourceRef.length && c.sourceUrls.length && c.sourceQuote);
});
assert.ok((pack.vocabulary || []).some(function (v) { return v.term === "sauropod"; }));
assert.strictEqual((pack.vocabulary || []).some(function (v) { return v.term === "predator"; }), false);

// 4. Before entailment nothing is teachable: selection holds every retrieved claim.
var heldSelection = Brain.selectPackForLesson(pack, ctx);
assert.strictEqual((heldSelection.selectedClaimIds || heldSelection.claimIds || []).length, 0, JSON.stringify(heldSelection).slice(0, 400));

// 5. Entailment: supported claims become teachable; partial/unsupported/missing stay held.
var ids = {};
admitted.forEach(function (c) { ids[c.text] = c.claimId; });
var entailBrief = Brain.sourceEntailmentBrief(pack, ctx);
var items = JSON.parse(entailBrief.user).items;
assert.strictEqual(items.length, admitted.length);
assert.ok(items.every(function (i) { return i.claimId && i.quote && i.passage; }));
assert.ok(/Do not use your own knowledge/.test(entailBrief.system));
// Regression (live run 1): a link the quote does not state is unsupported, and a mechanism needs its own explaining quote.
assert.ok(/Two facts that the quote only lists side by side do not support a link/.test(entailBrief.system));
assert.ok(/A quote that only names or lists the feature does not support a mechanism/.test(brief.system));
var verdicts = admitted.map(function (c) { return { claimId: c.claimId, verdict: "supported", missing: "" }; });
var parsed = Brain.parseSourceEntailment({ results: verdicts.concat([{ claimId: "x", verdict: "certain" }]) });
assert.strictEqual(parsed.ok, true);
assert.strictEqual(parsed.results.x, undefined);
Brain.applySourceEntailment(pack, parsed);
assert.strictEqual(pack.sourceAudit.entailmentRan, true);
assert.strictEqual(pack.sourceAudit.entailment.supported, admitted.length);
admitted.forEach(function (c) {
  assert.strictEqual(c.sourceSupport, "quote-verified + automated entailment check");
  assert.strictEqual(c.sourceHold, false);
  assert.strictEqual(c.factuallyVerified, false);
  assert.ok(/not human-verified/.test(c.provenanceNote));
});

// 6. The readiness contract is unchanged: three genuine sourced pairs satisfy a Year 3 explanatory goal.
var selection = Brain.selectPackForLesson(pack, ctx);
var readiness = Brain.assessPackReadiness(pack, selection, ctx);
assert.strictEqual(JSON.parse(brief.user).strandPairsRequired, 3);
assert.strictEqual(readiness.status, "ready", JSON.stringify(readiness).slice(0, 800));
function plannerPack(p, sel) {
  return JSON.parse(Brain.planBrief(Object.assign(ctxFor(), { knowledgePack: p, knowledgeSelection: sel })).user).knowledgePack || {};
}
var planner = plannerPack(pack, selection);
assert.ok(JSON.stringify(planner).indexOf("S1-P01") !== -1, JSON.stringify(planner).slice(0, 300));
var log = Brain.knowledgePackLog(pack, selection);
assert.strictEqual(log.sourceMode, "retrieved");

// 7. A partial verdict holds that claim out of the lesson and breaks its pair; readiness then fails honestly.
var pack2 = Brain.normaliseKnowledgePack(rawPack(), ctx);
var verdicts2 = pack2.claims.filter(function (c) { return c.provenance === "retrieved"; }).map(function (c) {
  return { claimId: c.claimId, verdict: /bony plates acted like armour/.test(c.text) ? "partial" : "supported", missing: "" };
});
Brain.applySourceEntailment(pack2, Brain.parseSourceEntailment({ results: verdicts2 }));
var held = pack2.claims.filter(function (c) { return /acted like armour/.test(c.text); })[0];
assert.strictEqual(held.sourceHold, true);
var selection2 = Brain.selectPackForLesson(pack2, ctx);
assert.ok(JSON.stringify(selection2).indexOf("source support not confirmed") !== -1);
assert.notStrictEqual(Brain.assessPackReadiness(pack2, selection2, ctx).status, "ready");
var planner2 = plannerPack(pack2, selection2);
assert.strictEqual(JSON.stringify(planner2.claims || []).indexOf("acted like armour") , -1);
assert.ok(JSON.stringify(planner2.doNotTeach || []).indexOf("acted like armour") !== -1, JSON.stringify(planner2).slice(0, 600));

// 8. A failed entailment call holds everything, which blocks the pack with needsSource.
var pack3 = Brain.normaliseKnowledgePack(rawPack(), ctx);
Brain.applySourceEntailment(pack3, Brain.parseSourceEntailment(null));
assert.strictEqual(pack3.status, "blocked");
assert.strictEqual(pack3.needsSource, true);
assert.ok(/NEEDS_SOURCE/.test(pack3.statusReason));

// 9. No verifiable claim at all: blocked with needs_source.
var pack4 = Brain.normaliseKnowledgePack({ status: "usable", claims: [invented, unresolved] }, ctx);
assert.strictEqual(pack4.status, "blocked");
assert.strictEqual(pack4.needsSource, true);

// 10. Non-research packs are untouched: no sourceMode, model provenance, no hold.
var plainPack = Brain.normaliseKnowledgePack({ status: "usable", claims: [
  { text: "Dinosaurs were reptiles that lived millions of years ago.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } }
] }, plainCtx);
assert.strictEqual(plainPack.sourceMode, undefined);
assert.strictEqual(plainPack.claims[0].provenance, "model");
assert.strictEqual(plainPack.claims[0].sourceHold, undefined);

console.log("source-grounded-pack tests passed");
