"use strict";

// Goal-reach pruning. A broad adaptation question used to keep a point only
// when it shared a setting word from the goal ("ocean", "desert") and then
// drop every parallel strand outside that point's dependency component.
// Contribution is judged against the subject of the question. A function of
// that subject is kept, including one that depends on the subject's feature
// and does not repeat the subject. A different subject's function is removed
// even when it repeats the setting. Strand requirements are not lowered.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

function intent(goal) {
  return { ok: true, learningGoal: goal, requiredEvidence: "The pupil explains the adaptations.", focusConcepts: ["adaptations"], priorKnowledge: [], exclusions: [], preferences: [] };
}

function admit(year, ask, goal, map, claims) {
  var ctx = Brain.contextFrom({ source: { text: ask }, year: year, subject: "Science", topic: goal, targetMinutes: 15 });
  Brain.applyTeacherIntent(ctx, intent(goal));
  if (claims) {
    ctx.knowledgePack = { id: "kp_goal", status: "usable", claims: claims, rejectedClaims: [] };
    ctx.knowledgeSelection = { status: "ready", depthMode: "mechanism", claimIds: claims.map(function (claim) { return claim.claimId; }) };
  }
  var parsed = {
    learningObjective: goal,
    subject: "Science",
    topic: goal,
    yearGroup: year,
    learningMap: map,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  };
  var built = Brain.buildLearningMap(parsed, Object.assign({}, ctx, { lessonPlan: { learningObjective: goal } }), goal);
  var plan = Brain.normalisePlan(parsed, Object.assign({}, ctx, { depthRequired: true, breadthSettled: true }));
  return { built: built, plan: plan };
}

function claim(id, text) {
  return { claimId: id, text: text, kind: "mechanism", depth: "mechanism", confidence: "high", provenance: "model", contested: false, importance: "core" };
}

function texts(built) {
  return built.items.map(function (item) { return item.knowledge; });
}

function rejected(built, text) {
  return built.rejected.filter(function (item) { return item.knowledge === text; })[0];
}

var camelAsk = "Year 4 science. How are camels adapted to the desert?";
var camelGoal = "Pupils will understand how camels are adapted to the desert.";
var feet = "A camel has wide, flat feet.";
var feetJob = "Wide feet stop a camel sinking into the desert, which helps it walk.";
var hump = "A camel stores fat in its hump.";
var humpJob = "The hump lets a camel go without food for a long time.";
var lashes = "A camel has long eyelashes.";
var lashJob = "Long eyelashes help a camel keep sand out of its eyes.";
var mirage = "The desert is hot in the day, which helps a mirage form.";
var mammal = "Camels are mammals.";
var camelMap = [
  { id: "p1", role: "feature", dependsOn: [], knowledge: feet },
  { id: "p2", role: "mechanism", dependsOn: ["p1"], knowledge: feetJob },
  { id: "p3", role: "feature", dependsOn: [], knowledge: hump },
  { id: "p4", role: "mechanism", dependsOn: ["p3"], knowledge: humpJob },
  { id: "p5", role: "feature", dependsOn: [], knowledge: lashes },
  { id: "p6", role: "mechanism", dependsOn: ["p5"], knowledge: lashJob },
  { id: "p7", role: "function", dependsOn: [], knowledge: mirage },
  { id: "p8", role: "fact", dependsOn: [], knowledge: mammal }
];
var camels = admit("Year 4", camelAsk, camelGoal, camelMap);
assert.deepStrictEqual(texts(camels.built), [feet, feetJob, hump, humpJob, lashes, lashJob]);
assert.strictEqual(rejected(camels.built, mirage).reason, "not connected to the learning goal");
assert.strictEqual(rejected(camels.built, mammal).reason, "not connected to the learning goal");
assert.strictEqual(camels.plan.ok, true, (camels.plan.issues || []).join("; "));
assert.strictEqual(camels.plan.depth.requiredStrands, 3);
assert.strictEqual(camels.plan.depth.developedStrands, 3);
var humpPoint = camels.built.items.filter(function (item) { return item.knowledge === humpJob; })[0];
var humpFeature = camels.built.items.filter(function (item) { return item.knowledge === hump; })[0];
assert.deepStrictEqual(humpPoint.dependsOn, [humpFeature.id]);

var onePair = admit("Year 4", camelAsk, camelGoal, camelMap.slice(0, 2).concat(camelMap.slice(6)));
assert.strictEqual(onePair.plan.ok, false);
assert.strictEqual(onePair.plan.depth.requiredStrands, 3, "one kept strand does not lower the Year 4 minimum");
assert.strictEqual(onePair.plan.depth.developedStrands, 1);
assert.strictEqual(rejected(onePair.built, mirage).reason, "not connected to the learning goal");

var names = [
  { id: "n1", role: "feature", dependsOn: [], knowledge: "Camels have a long neck." },
  { id: "n2", role: "feature", dependsOn: [], knowledge: "Camels have a short tail." },
  { id: "n3", role: "feature", dependsOn: [], knowledge: "Camels have tough lips." }
];
var padded = admit("Year 4", camelAsk, camelGoal, camelMap.slice(0, 2).concat(names));
assert.strictEqual(padded.plan.depth.developedStrands, 1, "naming more features does not raise the developed count");
assert.strictEqual(padded.plan.depth.requiredStrands, 3);
names.forEach(function (row) {
  assert.strictEqual(rejected(padded.built, row.knowledge).reason, "not connected to the learning goal");
});

var sharkAsk = "Year 4 science. How are sharks adapted to living in the ocean?";
var sharkGoal = "Pupils will understand how sharks are adapted to living in the ocean.";
var stream = "Sharks have streamlined bodies that reduce water resistance while swimming.";
var streamJob = "The streamlined body shape reduces drag, allowing sharks to swim efficiently.";
var cartilage = "Sharks have a layer of cartilage instead of bones.";
var cartilageJob = "The cartilage structure provides flexibility and buoyancy, aiding in movement.";
var ampullae = "Sharks have a special organ called the ampullae of Lorenzini that detects electrical fields in the water.";
var ampullaeJob = "The ampullae of Lorenzini help sharks detect prey by sensing electrical signals.";
var clouds = "The ocean covers most of the Earth and helps clouds form rain.";
var fish = "Sharks are a kind of fish.";
var sharkRows = [stream, streamJob, cartilage, cartilageJob, ampullae, ampullaeJob, clouds, fish];
var sharkMap = [
  { id: "k1", role: "feature", dependsOn: [], knowledge: stream, claimIds: ["c1"] },
  { id: "k2", role: "mechanism", dependsOn: ["k1"], knowledge: streamJob, claimIds: ["c2"] },
  { id: "k3", role: "feature", dependsOn: [], knowledge: cartilage, claimIds: ["c3"] },
  { id: "k4", role: "mechanism", dependsOn: ["k3"], knowledge: cartilageJob, claimIds: ["c4"] },
  { id: "k5", role: "feature", dependsOn: [], knowledge: ampullae, claimIds: ["c5"] },
  { id: "k6", role: "mechanism", dependsOn: ["k5"], knowledge: ampullaeJob, claimIds: ["c6"] },
  { id: "k7", role: "function", dependsOn: [], knowledge: clouds, claimIds: ["c7"] },
  { id: "k8", role: "fact", dependsOn: [], knowledge: fish, claimIds: ["c8"] }
];
var sharkClaims = sharkRows.map(function (text, index) { return claim("c" + (index + 1), text); });
var sharks = admit("Year 4", sharkAsk, sharkGoal, sharkMap, sharkClaims);
assert.ok(texts(sharks.built).indexOf(stream) !== -1);
assert.ok(texts(sharks.built).indexOf(streamJob) !== -1);
assert.ok(texts(sharks.built).indexOf(ampullae) !== -1);
assert.ok(texts(sharks.built).indexOf(ampullaeJob) !== -1);
assert.ok(texts(sharks.built).indexOf(cartilage) !== -1);
assert.ok(texts(sharks.built).indexOf(cartilageJob) !== -1, "the mechanism stays with the feature even though it never says shark or ocean");
var cartilagePoint = sharks.built.items.filter(function (item) { return item.knowledge === cartilageJob; })[0];
var cartilageFeature = sharks.built.items.filter(function (item) { return item.knowledge === cartilage; })[0];
assert.deepStrictEqual(cartilagePoint.dependsOn, [cartilageFeature.id]);
assert.strictEqual(rejected(sharks.built, clouds).reason, "not connected to the learning goal");
assert.strictEqual(rejected(sharks.built, fish).reason, "not connected to the learning goal");
assert.strictEqual(sharks.plan.depth.requiredStrands, 3);
assert.strictEqual(sharks.plan.depth.developedStrands, 3);
assert.strictEqual(sharks.plan.ok, true, (sharks.plan.issues || []).join("; "));

var swimAsk = "Teach children how a shark's body helps it swim.";
var swimGoal = "Understand how a shark's body helps it swim.";
var swim = "A shark's streamlined body reduces water resistance, helping it swim more easily.";
var oceans = "Sharks live in oceans all over the world.";
var swimMap = [
  { id: "s1", role: "mechanism", dependsOn: [], knowledge: swim },
  { id: "s2", role: "concept", dependsOn: [], knowledge: oceans },
  { id: "s3", role: "function", dependsOn: [], knowledge: clouds }
];
var swimming = admit("Year 1", swimAsk, swimGoal, swimMap);
assert.deepStrictEqual(texts(swimming.built), [swim]);
assert.strictEqual(rejected(swimming.built, oceans).reason, "not connected to the learning goal");
assert.strictEqual(rejected(swimming.built, clouds).reason, "not connected to the learning goal");

var dinoGoal = "Students will understand the different types of dinosaurs and their characteristics.";
var habitat = "Dinosaurs lived in a variety of habitats, including forests, deserts, and wetlands.";
var influenced = "Dinosaurs adapted to their environments, which influenced their physical features and behaviors.";
var teeth = "The structure of a dinosaur's teeth indicates its diet, helping to classify it as a herbivore or carnivore.";
var types = "There are two main types of dinosaurs: herbivores, which eat plants, and carnivores, which eat meat.";
var dinos = admit("Year 3", "Year 3 science. Teach children about dinosaurs.", dinoGoal, [
  { id: "d1", role: "feature", dependsOn: [], knowledge: types },
  { id: "d2", role: "mechanism", dependsOn: ["d1"], knowledge: teeth },
  { id: "d3", role: "feature", dependsOn: [], knowledge: habitat },
  { id: "d4", role: "mechanism", dependsOn: ["d3"], knowledge: influenced }
]);
assert.strictEqual(dinos.plan.depth.requiredStrands, 2);
assert.strictEqual(dinos.plan.depth.developedStrands, 1, "an environment influenced features sentence is still not a developed strand");
assert.strictEqual(dinos.plan.ok, false);

var packBrief = Brain.knowledgePackBrief({ yearGroup: "Year 3", subject: "Science", lessonText: "Teach children about dinosaurs.", topic: "Dinosaurs" }).system;
assert.ok(packBrief.indexOf("concrete feature") !== -1);
assert.ok(packBrief.indexOf("is not a mechanism") !== -1);
assert.ok(packBrief.indexOf("Do not invent a feature or a function") !== -1);
assert.ok(packBrief.indexOf("factuallyVerified must be false") !== -1);
assert.ok(packBrief.indexOf("Do not use retrieved") !== -1);
assert.strictEqual(/dinosaur|shark|ocean|mam tor/i.test(packBrief), false);

console.log("goal-reach tests passed");
