"use strict";

// Pack strand readiness. A resolved featureClaimId is not a teaching pair.
// Replays the two saved Year 3 failures from the strand-loss diagnosis.
// The saved run JSON is not in this repo; the sentences are the diagnosis wording.

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Brain = require("../js/lesson-brain.js");

var ask = "Year 3 science. Teach children about dinosaurs.";
var goal = "Students will understand the different types of dinosaurs and their characteristics.";

function ctxFor(extra) {
  return Object.assign({
    yearGroup: "Year 3",
    subject: "Science",
    topic: "Dinosaurs",
    requestedMinutes: 15,
    lessonText: ask,
    lessonBrief: {
      intent: "explain",
      rawRequest: ask,
      learningGoal: goal,
      teacherIntent: {
        ok: true,
        learningGoal: goal,
        focusConcepts: ["types of dinosaurs", "characteristics"],
        requiredEvidence: "Students can identify and describe types of dinosaurs and their unique features."
      }
    }
  }, extra || {});
}

function readyOf(raw, extra) {
  var ctx = ctxFor(extra);
  var pack = Brain.normaliseKnowledgePack(raw, ctx);
  var selection = Brain.selectPackForLesson(pack, ctx);
  return { ctx: ctx, pack: pack, selection: selection, readiness: Brain.assessPackReadiness(pack, selection, ctx) };
}

function point(id, role, knowledge, dependsOn) {
  return { id: id, role: role, importance: "core", knowledge: knowledge, dependsOn: dependsOn || [] };
}

function built(map, extra) {
  return Brain.buildLearningMap({
    learningObjective: goal,
    learningMap: map,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, ctxFor(extra), goal);
}

function links(result, snippet) {
  var row = result.items.filter(function (item) { return item.knowledge.indexOf(snippet) !== -1; })[0];
  if (!row) return null;
  return row.dependsOn.map(function (id) {
    var other = result.items.filter(function (item) { return item.id === id; })[0];
    return other ? other.knowledge : id;
  });
}

var bodyHead = "Dinosaurs had different body shapes and sizes that helped them survive in their environments.";
var neckBare = "A long neck allowed a dinosaur to reach leaves in high trees.";
var teethHead = "The sharp teeth of Tyrannosaurus rex were designed for tearing meat.";
var bodyExplains = "The shape of a dinosaur body affects how it moves and what it eats.";
var teethThin = "The teeth of a dinosaur determine its diet and feeding habits.";
var mesozoic = "Dinosaurs lived during the Mesozoic Era, which lasted about 180 million years.";

var run1 = readyOf({
  status: "usable",
  claims: [
    { text: mesozoic, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: bodyHead, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: neckBare, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: teethHead, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: bodyExplains, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: teethThin, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [
    { text: bodyHead },
    { text: neckBare },
    { text: teethHead },
    { text: bodyExplains, feature: "body shape" },
    { text: teethThin, feature: "teeth" }
  ]
});
assert.strictEqual(run1.readiness.requiredPairs, 2);
assert.strictEqual(run1.readiness.distinctReady, 1, "run 1 admits one substantive pair");
assert.strictEqual(run1.readiness.status, "incomplete");
assert.strictEqual(run1.readiness.factuallyVerified, false);
assert.ok(run1.pack.claims.every(function (claim) { return claim.factuallyVerified === false; }));
var run1Ready = run1.readiness.readyPairs.filter(function (pair) { return /affects how it moves/.test(pair.explanation); });
assert.strictEqual(run1Ready.length, 1);
assert.ok(run1.readiness.pairs.some(function (pair) {
  return /determine its diet/.test(pair.explanation) && !pair.ready && pair.featureClaimId && pair.gaps.join(" ").indexOf("feature claim resolves") !== -1;
}), "a resolved teeth id with a thin explanation is not ready");
assert.ok(run1.readiness.pairs.some(function (pair) {
  return /long neck allowed/.test(pair.explanation) && !pair.ready && pair.gaps.join(" ").indexOf("no concrete feature") !== -1;
}));
assert.ok(run1.readiness.issues[0].indexOf("PACK_INCOMPLETE") === 0);
assert.ok(run1.readiness.missing.some(function (line) { return /concrete feature/.test(line) && /how or why/.test(line); }));

var sharpMeat = "Some dinosaurs, like the Tyrannosaurus rex, had sharp teeth for eating meat.";
var strongLegs = "Dinosaurs had strong legs that helped them run from danger.";
var longNecks = "Some dinosaurs had long necks that allowed them to reach high leaves.";
var teethHelped = "Dinosaurs had different types of teeth that helped them eat different foods.";
var run2 = readyOf({
  status: "usable",
  claims: [
    { text: "Dinosaurs lived during the Mesozoic Era and are now extinct.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "Some dinosaurs were herbivores and some were carnivores.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "Dinosaurs had many different body shapes.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: sharpMeat, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: strongLegs, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: longNecks, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: teethHelped, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [
    { text: strongLegs, feature: "strong legs" },
    { text: longNecks, feature: "long necks" },
    { text: teethHelped, feature: "different types of teeth" }
  ]
});
// Tense parity (source-grounded lesson PR): "helped" now reads like "helps", "allowed", and
// "made". Before, this pair failed only because the verb was past tense: the same sentence
// with "help" was already ready. The pack still needs two pairs, so run 2 stays incomplete.
assert.strictEqual(run2.readiness.status, "incomplete");
assert.strictEqual(run2.readiness.distinctReady, 1);
assert.ok(run2.pack.mechanisms.some(function (item) { return item.featureClaimId && /helped them eat/.test(item.text); }));
assert.ok(run2.readiness.pairs.some(function (pair) {
  return /helped them eat/.test(pair.explanation) && pair.featureClaimId && pair.ready;
}), "run 2 teeth pair: feature claim resolves and the past-tense explanation states a function");
var run2Present = readyOf({
  status: "usable",
  claims: [
    { text: "Dinosaurs lived during the Mesozoic Era and are now extinct.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "Some dinosaurs were herbivores and some were carnivores.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "Dinosaurs had many different body shapes.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: sharpMeat, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: strongLegs, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: longNecks, depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: teethHelped.replace("helped", "help"), depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [
    { text: strongLegs, feature: "strong legs" },
    { text: longNecks, feature: "long necks" },
    { text: teethHelped.replace("helped", "help"), feature: "different types of teeth" }
  ]
});
assert.strictEqual(run2Present.readiness.distinctReady, run2.readiness.distinctReady, "past and present tense give the same readiness");
assert.ok(run2.readiness.pairs.some(function (pair) {
  return /long necks/.test(pair.explanation) && !pair.featureClaimId && !pair.ready;
}));
assert.ok(run2.readiness.pairs.some(function (pair) {
  return /strong legs/.test(pair.explanation) && !pair.ready && pair.gaps.join(" ").indexOf("helped") === -1;
}));
assert.ok(run2.readiness.missing.join(" ").indexOf("strong legs") !== -1 || run2.readiness.pairs.some(function (pair) {
  return /strong legs/.test(pair.explanation);
}));

var helpedMap = built([
  point("p1", "fact", "Dinosaurs lived in many places long ago."),
  point("p2", "mechanism", longNecks),
  point("p3", "mechanism", strongLegs),
  point("p4", "fact", sharpMeat),
  point("p5", "mechanism", teethHelped, ["p1"])
], { knowledgePack: run2.pack, knowledgeSelection: run2.selection });
assert.ok(!helpedMap.items.some(function (item) {
  return item.knowledge !== longNecks && /long neck/.test(item.knowledge);
}), "an empty featureClaimId does not invent a neck head");
var neckLinks = links(helpedMap, "long necks that allowed");
assert.ok(neckLinks === null || neckLinks.length === 0);
var legLinks = links(helpedMap, "strong legs that helped");
assert.ok(legLinks === null || legLinks.length === 0);
var helpedTeeth = links(helpedMap, "helped them eat");
assert.ok(!helpedTeeth || helpedTeeth.join(" ").indexOf("sharp teeth") === -1, "a thin helped explanation is not given a protected pack edge");

var rex = "Tyrannosaurus rex had sharp teeth in its jaw.";
var tear = "Sharp teeth help a dinosaur tear meat from a bone.";
var fossil = "A fossil can show teeth marks on a bone.";
var shapes = "Dinosaurs had many different body shapes.";
var good = readyOf({
  status: "usable",
  claims: [
    { text: shapes, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: rex, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: fossil, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: tear, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [{ text: tear, feature: "sharp teeth" }]
});
assert.strictEqual(good.readiness.distinctReady, 1);
assert.strictEqual(good.readiness.status, "incomplete", "one valid pair is not enough for this broad lesson");
var overridden = built([
  point("p1", "fact", shapes),
  point("p2", "fact", fossil),
  point("p3", "fact", rex),
  point("p4", "mechanism", tear, ["p2"])
], { requestedMinutes: 8, knowledgePack: good.pack, knowledgeSelection: good.selection });
assert.deepStrictEqual(links(overridden, "help a dinosaur tear"), [rex], "a validated pair replaces the model hub");
assert.ok(links(overridden, "help a dinosaur tear").indexOf(fossil) === -1);

var ordered = built([
  point("p1", "fact", shapes),
  point("p2", "mechanism", neckBare)
], { knowledgePack: run1.pack, knowledgeSelection: run1.selection });
var orderedNeck = links(ordered, "long neck allowed");
assert.ok(orderedNeck === null || orderedNeck.length === 0, "point order does not fill an empty featureClaimId");
assert.ok(!ordered.items.some(function (item) { return item.knowledge !== neckBare && /neck/.test(item.knowledge); }));

var allosaurus = "Allosaurus had pointed teeth in its jaw.";
var bite = "Pointed teeth help a dinosaur catch its prey.";
var repeated = readyOf({
  status: "usable",
  claims: [
    { text: rex, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: allosaurus, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: tear, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: bite, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [
    { text: tear, feature: "sharp teeth" },
    { text: bite, feature: "pointed teeth" }
  ]
});
assert.strictEqual(repeated.readiness.distinctReady, 1, "two teeth pairs are one teaching idea");
assert.strictEqual(repeated.readiness.status, "incomplete");
assert.ok(/repeats the teaching idea/i.test(repeated.readiness.missing.join(" ")));

var moon = readyOf({
  status: "usable",
  claims: [
    { text: "The moon is a large rock that travels through space.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "The moon pulls ocean water towards the shore.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [{ text: "The moon pulls ocean water towards the shore.", feature: "moon" }]
});
assert.ok(moon.pack.mechanisms[0].featureClaimId);
assert.ok(moon.readiness.pairs.some(function (pair) {
  return !pair.ready && pair.gaps.join(" ").indexOf("not relevant to the learning goal") !== -1;
}));

var thinId = readyOf({
  status: "usable",
  factuallyVerified: true,
  claims: [
    { text: rex, depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: true, ageFit: { from: 1, to: 6 } },
    { text: teethThin, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: true, ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [{ text: teethThin, feature: "sharp teeth" }]
});
assert.ok(thinId.pack.mechanisms[0].featureClaimId, "the id resolves");
assert.strictEqual(thinId.readiness.distinctReady, 0);
assert.ok(thinId.readiness.pairs[0].gaps.join(" ").indexOf("feature claim resolves") !== -1);
assert.ok(thinId.pack.claims.every(function (claim) { return claim.factuallyVerified === false; }), "verification stays separate from readiness");

var unrelated = readyOf({
  status: "usable",
  claims: [
    { text: mesozoic, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: rex, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: tear, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [{ text: tear, feature: "Mesozoic Era" }]
});
assert.strictEqual(unrelated.pack.mechanisms[0].featureClaimId, "");
assert.strictEqual(unrelated.readiness.distinctReady, 0);
var unrelatedMap = built([
  point("p1", "fact", mesozoic),
  point("p2", "fact", rex),
  point("p3", "mechanism", tear, ["p1"])
], { knowledgePack: unrelated.pack, knowledgeSelection: unrelated.selection });
assert.deepStrictEqual(links(unrelatedMap, "help a dinosaur tear"), [], "an unrelated feature link is dropped and not moved onto the teeth claim");

var sparse = readyOf({
  status: "usable",
  claims: [
    { text: "Dinosaurs lived a long time ago.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "Some dinosaurs ate plants.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } }
  ]
});
assert.strictEqual(sparse.readiness.status, "incomplete");
assert.ok(sparse.readiness.missing.join(" ").indexOf("do not include a mechanism") !== -1);

var featureSentence = "A dinosaur called Tyrannosaurus rex had sharp teeth that help it tear meat.";
var echo = "Sharp teeth help a dinosaur tear meat.";
var echoed = readyOf({
  status: "usable",
  claims: [
    { text: featureSentence, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: echo, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: shapes, depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: bodyExplains, depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [
    { text: echo, feature: "sharp teeth" },
    { text: bodyExplains, feature: "body shape" }
  ]
});
assert.ok(echoed.readiness.distinctReady >= 1);
var pruned = built([
  point("p1", "fact", featureSentence),
  point("p2", "mechanism", echo, ["p1"]),
  point("p3", "fact", shapes),
  point("p4", "mechanism", bodyExplains, ["p3"])
], { knowledgePack: echoed.pack, knowledgeSelection: echoed.selection });
var echoLoss = (pruned.packPairs.lost || []).filter(function (row) { return /tear meat/.test(row.explanation); })[0];
assert.ok(echoLoss, "removing the echoed pair is reported");
assert.ok(echoLoss.reason && echoLoss.reason !== "not connected to the learning map");
assert.ok(pruned.packPairs.preserved < pruned.packPairs.requiredPairs);
assert.ok(pruned.packPairs.issue.indexOf(echoLoss.reason) !== -1);
assert.ok(pruned.packPairs.issue.indexOf("Rechecked readiness") !== -1);

var helpPlan = Brain.normalisePlan({
  learningObjective: goal,
  learningMap: [
    point("p1", "feature", "Dinosaurs had strong legs on a heavy body."),
    point("p2", "mechanism", "Strong legs help a dinosaur run quickly.", ["p1"])
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, ctxFor({ depthRequired: true }));
var helpedPlan = Brain.normalisePlan({
  learningObjective: goal,
  learningMap: [
    point("p1", "feature", "Dinosaurs had strong legs on a heavy body."),
    point("p2", "mechanism", "Strong legs helped a dinosaur run quickly.", ["p1"])
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, ctxFor({ depthRequired: true }));
assert.strictEqual(helpPlan.depth.developedStrands, 1, "help still counts as a mechanism");
// Tense parity correction: PR #21 left "helped" out on purpose ("helped was not added").
// Live source-grounded runs then rejected source-supported past-tense explanations of extinct
// animals for tense alone, so "helped" now counts exactly as "help" does. Minima are unchanged.
assert.strictEqual(helpedPlan.depth.developedStrands, helpPlan.depth.developedStrands, "helped counts the same as help");
assert.strictEqual(helpPlan.depth.requiredStrands, 2);
assert.strictEqual(helpPlan.depth.requiredDepth, 6);

var source = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
assert.ok(/helps\|helped\|helping\|help\|/.test(source), "tense parity: helped sits beside helps and help");
var brief = Brain.knowledgePackBrief(ctxFor());
assert.ok(brief.system.indexOf("strandPairsRequired") !== -1);
assert.ok(brief.system.indexOf("Do not invent a feature or a function") !== -1);
assert.ok(brief.system.indexOf("factuallyVerified must be false") !== -1);
assert.strictEqual(/dinosaur|shark|ocean|mam tor/i.test(brief.system), false);
assert.strictEqual(JSON.parse(brief.user).strandPairsRequired, 2);
var boot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
assert.ok(boot.indexOf("PACK_INCOMPLETE") !== -1 && boot.indexOf("PACK_INCOMPLETE") < boot.indexOf("phase = \"PLAN_REQUEST\""));

console.log("pack readiness tests passed");
