"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Creator = require("../schools/learn/creator-core.js");

var STAGES = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];

var FIXTURES = {
  A: {
    name: "A Y1 Science broad sharks", year: "Year 1", subject: "Science", minutes: 15, intent: "explain",
    ask: "Teach children about sharks.",
    goal: "Pupils will understand what sharks are and the main features of their bodies.",
    scope: "broad",
    map: [
      { id: "p1", knowledge: "A shark is a kind of fish that lives in the sea.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "A shark has gills on the side of its head.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Gills take oxygen out of the water, so the shark can breathe underwater.", role: "function", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "A shark has a strong tail fin.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "The tail swishes from side to side and pushes the water back, which moves the shark forward.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "Rows of sharp teeth help a shark catch and grip the fish it eats.", role: "function", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "Learning about sharks helps us look after them.", role: "connection", importance: "supporting", dependsOn: ["p3"] }
    ],
    dropped: ["Learning about sharks helps us look after them."]
  },
  B: {
    name: "B Y1 Science narrow shark swimming", year: "Year 1", subject: "Science", minutes: 15, intent: "explain",
    ask: "Teach children how a shark's body helps it swim.",
    goal: "Understand how a shark's body helps it swim.",
    scope: "narrow",
    map: [
      { id: "p1", knowledge: "A shark's body is built for moving through water.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "A shark has a smooth, pointed body shape.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "The pointed shape lets water slide around the body easily, so the shark slows down less.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "The tail swishes side to side and pushes the water back, which moves the shark forward.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "Fins help the shark steer and keep its balance as it swims.", role: "function", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "Sharks live in oceans all over the world.", role: "concept", importance: "supporting", dependsOn: [] },
      { id: "p8", knowledge: "Sharks eat fish and seals.", role: "concept", importance: "supporting", dependsOn: [] }
    ],
    dropped: ["Sharks live in oceans all over the world.", "Sharks eat fish and seals."]
  },
  C: {
    name: "C Y2 Science broad plants", year: "Year 2", subject: "Science", minutes: 15, intent: "explain",
    ask: "Teach children about plants.",
    goal: "Pupils will understand what the parts of a plant do to keep it alive.",
    scope: "broad",
    map: [
      { id: "p1", knowledge: "A plant is a living thing that needs water and light to grow.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "Roots grow down into the soil.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Roots take in water from the soil, and the stem carries it up to the leaves.", role: "function", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "Most leaves are wide and flat.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "Leaves use light to make food that helps the plant grow.", role: "function", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "Flowers make seeds, and the seeds can grow into new plants.", role: "process", importance: "core", dependsOn: ["p1"] }
    ],
    dropped: []
  },
  D: {
    name: "D Y4 History broad Great Fire", year: "Year 4", subject: "History", minutes: 20, intent: "explain",
    ask: "Teach children about the Great Fire of London.",
    goal: "Pupils will understand what caused the Great Fire of London, what happened and how London changed afterwards.",
    scope: "broad",
    map: [
      { id: "p1", knowledge: "In 1666 London was a crowded city of narrow streets and wooden houses.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "On 2 September 1666 the Great Fire began in a baker's shop on Pudding Lane.", role: "concept", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "The fire spread quickly because the wooden houses were packed close together and a strong wind blew the flames.", role: "cause", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "The fire destroyed about 13,000 homes, so thousands of people had nowhere to live.", role: "effect", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "London was rebuilt with brick and stone and wider streets so that fire could not spread as easily.", role: "effect", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "People tried to stop the fire with leather buckets and by pulling houses down.", role: "concept", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "Blowing up houses made gaps called firebreaks, which stopped the fire because the flames had nothing left to burn.", role: "cause", importance: "core", dependsOn: ["p6"] },
      { id: "p8", knowledge: "Crowded wooden streets explain why the fire spread so far, and the brick rebuilding shows how London learned from it.", role: "connection", importance: "core", dependsOn: ["p3", "p5", "p7"] }
    ],
    dropped: []
  },
  E: {
    name: "E Y5 Geography broad rivers", year: "Year 5", subject: "Geography", minutes: 20, intent: "explain",
    ask: "Teach children about rivers.",
    goal: "Pupils will understand how rivers form, how they shape the land and how they affect people.",
    scope: "broad",
    map: [
      { id: "p1", knowledge: "A river is water flowing downhill in a channel from its source to its mouth.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "Rain and melting snow on high ground feed small streams.", role: "concept", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Tributaries join the main river, so it carries more water as it flows downstream.", role: "process", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "Heavy rain can make a river overflow its banks and flood nearby towns.", role: "effect", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "Fast-flowing water picks up stones and drags them along the riverbed.", role: "process", importance: "core", dependsOn: ["p1"] },
      { id: "p6", knowledge: "The moving stones wear away the bed and banks, which deepens and widens the valley.", role: "effect", importance: "core", dependsOn: ["p5"] },
      { id: "p7", knowledge: "When the river slows down, it drops the sand and mud it is carrying.", role: "process", importance: "core", dependsOn: ["p1"] },
      { id: "p8", knowledge: "Dropped sediment builds new land, such as a delta at the river's mouth.", role: "effect", importance: "core", dependsOn: ["p7"] },
      { id: "p9", knowledge: "Erosion upstream and deposition downstream work together to shape the river's landscape.", role: "connection", importance: "core", dependsOn: ["p6", "p8"] },
      { id: "p10", knowledge: "The Mississippi delta grew from mud the river dropped where it meets the sea.", role: "example", importance: "supporting", dependsOn: ["p8"] }
    ],
    dropped: []
  },
  F: {
    name: "F Y3 English broad adjectives", year: "Year 3", subject: "English", minutes: 15, intent: "explain",
    ask: "Teach children about adjectives.",
    goal: "Pupils will understand what adjectives are and how to choose them to make writing clearer.",
    scope: "broad",
    map: [
      { id: "p1", knowledge: "An adjective is a word that describes a noun.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "An adjective usually sits just before the noun it describes, as in the shiny shell.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "In a tall, green tree, the words tall and green are adjectives.", role: "example", importance: "supporting", dependsOn: ["p2"] },
      { id: "p4", knowledge: "Adjectives add detail about size, colour, shape or feeling, so the reader can picture the noun.", role: "function", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "Choosing a precise adjective, like enormous instead of big, makes the picture clearer for the reader.", role: "effect", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "When you use two adjectives before a noun, put a comma between them.", role: "procedure", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "Spotting adjectives and choosing precise ones both help writing describe things clearly.", role: "connection", importance: "core", dependsOn: ["p2", "p5"] }
    ],
    dropped: []
  },
  G: {
    name: "G Y4 Maths narrow column addition", year: "Year 4", subject: "Maths", minutes: 15, intent: "procedure",
    ask: "Teach children how to use column addition.",
    goal: "Pupils can add two 3-digit numbers using column addition and explain why they carry.",
    scope: "narrow",
    map: [
      { id: "p1", knowledge: "Each digit's place shows its value: hundreds, tens or ones.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "For column addition, write the numbers in columns so the ones, tens and hundreds line up.", role: "procedure", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Add the ones column first and write the answer under it.", role: "procedure", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "If the ones add up to ten or more, carry one ten into the tens column.", role: "procedure", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "Then add the tens, including the carried ten, and then the hundreds.", role: "procedure", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "We carry because ten ones make one ten, so the total stays the same.", role: "connection", importance: "core", dependsOn: ["p1", "p4"] },
      { id: "p7", knowledge: "In 247 add 135, seven add five makes twelve, so write 2 and carry 1 ten.", role: "example", importance: "supporting", dependsOn: ["p4"] }
    ],
    dropped: []
  },
  H: {
    name: "H Y6 Science narrow light and seeing", year: "Year 6", subject: "Science", minutes: 20, intent: "explain",
    ask: "Teach children how light allows us to see objects.",
    goal: "Understand how light allows us to see objects.",
    scope: "narrow",
    map: [
      { id: "p1", knowledge: "Light travels in straight lines from a light source.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "A light source, like the Sun or a lamp, gives out its own light.", role: "concept", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Most objects do not give out light; light from a source bounces off them, which is called reflection.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "A mirror reflects light in one clear direction, but a rough surface scatters it in many directions.", role: "comparison", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "Light enters the eye through the pupil.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p6", knowledge: "The eye detects the light, and the brain turns the signal into the image we see.", role: "mechanism", importance: "core", dependsOn: ["p5"] },
      { id: "p7", knowledge: "Light allows us to see an object when it reflects off the object and travels in a straight line into our eyes.", role: "connection", importance: "core", dependsOn: ["p3", "p6"] },
      { id: "p8", knowledge: "We can read a book in a lit room because light reflects off the page into our eyes.", role: "example", importance: "supporting", dependsOn: ["p7"] },
      { id: "p9", knowledge: "Light from the Sun takes about eight minutes to reach Earth.", role: "concept", importance: "supporting", dependsOn: [] }
    ],
    dropped: ["Light from the Sun takes about eight minutes to reach Earth."]
  }
};

function ctxFor(fixture, extra) {
  return Object.assign({
    yearGroup: fixture.year, subject: fixture.subject, lessonText: fixture.ask, topic: fixture.goal,
    requestedMinutes: fixture.minutes, pupilCount: 4, depthRequired: true,
    lessonBrief: {
      intent: fixture.intent, rawRequest: fixture.ask, learningGoal: fixture.goal,
      teacherIntent: { ok: true, learningGoal: fixture.goal, requiredEvidence: "The pupil explains the main ideas taught.", focusConcepts: [] }
    }
  }, extra || {});
}

function rawFor(fixture, map) {
  return { learningObjective: fixture.goal, subject: fixture.subject, topic: fixture.goal, yearGroup: fixture.year, learningMap: map || fixture.map, lessonArc: [{ purpose: "teach" }, { purpose: "check" }] };
}

function slotOf(slots, id) {
  return slots.filter(function (slot) { return slot.id === id; })[0] || { beats: [] };
}

function itemFor(items, beat) {
  var ref = (beat.knowledgeRefs || [])[0];
  return items.filter(function (entry) { return entry.id === ref; })[0] || items[0];
}

function lastLongWord(text) {
  return String(text).split(/\s+/).filter(function (word) { return word.replace(/[^a-z]/gi, "").length >= 5; }).slice(-1)[0].toLowerCase().replace(/[^a-z0-9']/g, "");
}

function speak(beat, items) {
  var item = itemFor(items, beat);
  var known = String(item.text || "").replace(/[.?!]$/, "").replace(/;/g, ",");
  var text = {
    notice: "Look at the scene and say what you can see.",
    predict: "Say what you think is happening before the explanation.",
    name: known + ".",
    explain: "This matters because " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    exemplify: "For example, " + lastLongWord(known) + " shows the idea.",
    model: "First watch " + lastLongWord(known) + ", then check it.",
    compare: "Look at both sides and say what is different.",
    connect: known + ".",
    practise: "Show a new case with " + lastLongWord(known) + ".",
    apply: "You will use " + lastLongWord(known) + " on the new case.",
    reveal: "So " + lastLongWord(known) + " settles the mission.",
    consolidate: "So " + lastLongWord(known) + " is the idea to keep."
  }[beat.move];
  return { id: beat.id, cue: "", text: text };
}

function bodyFor(slots, items) {
  var body = {};
  slots.forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) { return speak(beat, items); });
    if (slot.id === "apply") {
      body.apply = { beats: beats, instruction: beats[0].text, target: "scene", successCondition: "The pupil has used the taught idea in the task.", teachingConnection: "The task follows the idea the class just learned." };
    } else if (slot.id === "check") {
      var questions = slot.beats.filter(function (beat) { return beat.move === "retrieve"; }).map(function (beat, index) {
        var answer = itemFor(items, beat).text;
        return { id: beat.id, prompt: "Which sentence matches taught idea number " + (index + 1) + "?", choices: [answer, "A different idea that was not part of this lesson."], correct: answer, explain: "That sentence matches the idea the class has just learned.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "The question follows the taught idea." };
      });
      body.check = questions.length > 1 ? { beats: beats, questions: questions } : Object.assign({ beats: beats }, questions[0]);
    } else body[slot.id] = { beats: beats };
  });
  return body;
}

function build(fixture) {
  var ctx = ctxFor(fixture);
  var made = Brain.normalisePlan(rawFor(fixture), ctx);
  assert.strictEqual(made.ok, true, fixture.name + ": " + (made.issues || []).join("; "));
  var plan = made.plan;
  var slots = Brain.planBeats(Brain.lessonSkeleton(plan, ctx), plan, fixture.year);
  var frame = Object.assign({}, ctx, { lessonPlan: plan, lessonSkeleton: slots });
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return { ctx: ctx, plan: plan, slots: slots, frame: frame, report: Brain.teachingPlanReport(plan, slots, ctx) };
}

var reports = {};

function runFixture(key) {
  var fixture = FIXTURES[key];
  var tag = fixture.name + ": ";
  var built = build(fixture);
  var plan = built.plan;
  var slots = built.slots;
  var tp = plan.teachingPlan;
  var report = built.report;
  var map = plan.learningMap;
  var ids = map.map(function (item) { return item.id; });
  var byId = {};
  map.forEach(function (item) { byId[item.id] = item; });
  var point = {};
  tp.points.forEach(function (row) { point[row.id] = row; });
  var budget = Brain.depthBudget(fixture.year, fixture.minutes);

  // 1-3 scope
  assert.strictEqual(tp.scope, fixture.scope, tag + "scope " + tp.scopeReason);
  assert.ok(tp.scopeReason.length > 10, tag + "scope reason");
  var depth = tp.substantiveDepth;
  assert.ok(depth.met, tag + "substantive depth met " + JSON.stringify(depth));
  assert.ok(depth.achieved >= depth.required, tag + "achieved depth");
  assert.ok(depth.substantive >= depth.required - 2, tag + "examples and connections fill at most two places");
  var developed = tp.strands.filter(function (row) { return row.developed; });
  if (fixture.scope === "broad") {
    assert.ok(developed.length >= 2, tag + "a broad topic develops two or more strands");
    assert.ok(tp.strands.filter(function (row) { return /^t/.test(row.id); }).length <= Math.max(2, Math.floor((budget.max - 1) / 2)) + 1, tag + "a broad topic stays bounded");
  } else {
    assert.ok(developed.length >= 1, tag + "a narrow topic develops its relationship");
  }
  assert.ok(map.length <= budget.max, tag + "within the depth budget");
  fixture.dropped.forEach(function (text) {
    assert.strictEqual(plan.keyKnowledge.indexOf(text), -1, tag + "admitted " + text);
  });

  // 7 dependencies ordered
  map.forEach(function (item, index) {
    item.dependsOn.forEach(function (dep) {
      assert.ok(ids.indexOf(dep) !== -1 && ids.indexOf(dep) < index, tag + item.id + " depends on an earlier point");
    });
  });

  // 8-9 teaching
  var ledger = Brain.taughtLedger(slots);
  var teach = slotOf(slots, "teach").beats;
  assert.deepStrictEqual(ledger.taught, ids, tag + "teaching follows map order");
  tp.points.filter(function (row) { return row.category === "substantive"; }).forEach(function (row) {
    assert.ok(ledger.at[row.id] && ledger.at[row.id].stage === "teach", tag + row.id + " substantive point is taught");
  });
  tp.points.filter(function (row) { return row.explained; }).forEach(function (row) {
    var moves = teach.filter(function (beat) { return beat.knowledgeRefs[0] === row.id; }).map(function (beat) { return beat.move; });
    assert.ok(moves.some(function (move) { return move === "explain" || move === "connect" || move === "model"; }), tag + row.id + " is explained, not only named: " + moves.join(","));
  });
  assert.ok(teach.filter(function (beat) { return beat.move === "name"; }).length < teach.length / 2 + 1, tag + "teaching is not mostly name beats");

  // 10 apply
  var apply = slotOf(slots, "apply");
  assert.strictEqual(apply.beats.length, 1, tag + "one apply beat");
  var focus = apply.beats[0].knowledgeRefs[0];
  assert.ok(ledger.before.apply.indexOf(focus) !== -1, tag + "apply uses taught knowledge");
  assert.ok(point[focus].explained || byId[focus].role === "procedure", tag + "apply uses explained substantive knowledge");
  assert.ok(apply.applicationTarget && apply.applicationTarget.knowledgeRefs.indexOf(focus) !== -1 && /taught explanation/.test(apply.applicationTarget.evidence), tag + "application target");
  assert.deepStrictEqual(apply.requiredKnowledge, plan.keyKnowledge, tag + "the APPLY validator contract is unchanged");

  // 11-12 check
  var check = slotOf(slots, "check").beats;
  var checkRefs = check.map(function (beat) { return beat.knowledgeRefs[0]; });
  checkRefs.forEach(function (ref) {
    assert.ok(ledger.before.check.indexOf(ref) !== -1, tag + "check uses taught " + ref);
    assert.notStrictEqual(byId[ref].role, "example", tag + "an example is not assessed");
  });
  var checkStrands = [];
  checkRefs.forEach(function (ref) { if (checkStrands.indexOf(point[ref].strand) === -1) checkStrands.push(point[ref].strand); });
  if (developed.length >= 2 && check.length >= 2) assert.ok(checkStrands.length >= 2, tag + "questions cover more than one strand: " + checkStrands.join(","));
  var candidates = report.assessmentCandidates;
  assert.ok(candidates.length >= 2 && candidates.every(function (row) { return row.taughtBefore && row.evidence && row.level; }), tag + "assessment candidates");
  if (developed.length >= 2) {
    var candidateStrands = [];
    candidates.forEach(function (row) { if (candidateStrands.indexOf(row.strand) === -1) candidateStrands.push(row.strand); });
    assert.ok(candidateStrands.filter(function (id) { return /^t/.test(id); }).length >= 2, tag + "candidates span strands");
  }

  // 13 recap
  var recapRefs = [];
  slotOf(slots, "recap").beats.forEach(function (beat) { beat.knowledgeRefs.forEach(function (ref) { recapRefs.push(ref); }); });
  assert.deepStrictEqual(recapRefs, ledger.taught, tag + "recap covers every taught point in order");
  var takeawayStrands = report.recapTakeaways.map(function (row) { return row.strand; });
  developed.forEach(function (row) {
    var covered = report.recapTakeaways.some(function (take) { return take.strand === row.id && row.knowledgeRefs.indexOf(take.knowledgeRefs[0]) !== -1; });
    assert.ok(covered, tag + "recap represents strand " + row.id + " " + takeawayStrands.join(","));
  });
  assert.ok(report.recapTakeaways.every(function (row) { return row.takeaway; }), tag + "takeaways carry taught text");

  // 16-17 accept, client re-accept, scenes, classic fallback
  assert.deepStrictEqual(Brain.beatProblems(slots), [], tag + "beat problems");
  var items = Brain.beatKnowledge(plan, fixture.year);
  var raw = { title: fixture.name, objectives: [fixture.goal], slots: bodyFor(slots, items) };
  var accepted = Brain.accept(raw, Object.assign({}, built.frame, {
    applySemantic: { relationship: "apply", reason: "The task uses the idea." },
    checkSemantics: check.map(function () { return { coverage: "sufficient" }; })
  }));
  assert.strictEqual(accepted.ok, true, tag + (accepted.issues || []).join(" | "));
  var clientDraft = { source: { text: fixture.ask }, year: fixture.year, subject: fixture.subject, topic: "", title: "", goals: [], targetMinutes: fixture.minutes, playMode: "whole_class" };
  var analysis = Creator.analyseSource(fixture.ask);
  if (analysis.ok) Creator.applyAnalysis(clientDraft, analysis);
  clientDraft.year = fixture.year;
  clientDraft.subject = fixture.subject;
  var client = Brain.accept(JSON.parse(JSON.stringify(accepted.adventure)), Brain.contextFrom(clientDraft, { pupilCount: 4, availableMechanics: Creator.capabilities(Mechanics).map(function (item) { return item.id; }) }));
  assert.strictEqual(client.ok, true, tag + "client re-accept " + (client.issues || []).join(" | "));
  var draft = { activities: client.adventure.activities, lessonPlan: client.adventure.lessonPlan, year: fixture.year, targetMinutes: fixture.minutes, storyPlan: client.adventure.storyPlan };
  var scenes = Brain.planScenes(draft.activities, draft.lessonPlan, { yearGroup: fixture.year, requestedMinutes: fixture.minutes });
  assert.ok(scenes && scenes.length, tag + "planScenes consumes the lesson");
  var learning = scenes.filter(function (scene) { return ["investigate", "learn", "connect", "synthesise"].indexOf(scene.purpose) !== -1; }).length;
  assert.ok(learning >= 4 && learning <= (fixture.minutes <= 17 ? 6 : 7), tag + "learning scenes " + learning);
  var slides = Creator.slidesFor(draft);
  assert.ok(slides.length === scenes.length && slides.some(function (slide) { return slide.sceneLabel === "Discover"; }), tag + "scene slides");
  assert.strictEqual(Creator.stageSlides(draft).length, 7, tag + "classic fallback still renders seven stages");

  // diagnostics
  assert.deepStrictEqual(Object.keys(report).sort(), ["applicationCandidate", "assessmentCandidates", "checkRefs", "recapTakeaways", "rejectedAsDepth", "sceneCoverage", "scope", "scopeReason", "substantiveDepth", "teachingProgression", "threads"].sort(), tag + "report keys");
  assert.ok(JSON.stringify(report).length < 9000, tag + "report bounded");
  assert.ok(report.sceneCoverage.some(function (row) { return row.threadIds.length; }), tag + "scene coverage names strands");
  assert.strictEqual(JSON.stringify(Brain.normalisePlan(rawFor(fixture), ctxFor(fixture)).plan.teachingPlan), JSON.stringify(tp), tag + "deterministic");
  var published = Brain.forModel({ lessonPlan: plan }).lessonPlan;
  assert.strictEqual(published.teachingPlan, undefined, tag + "internal teaching plan stays internal");
  assert.ok(published.teachingThreads.length >= 1, tag + "threads reach the content brief");
  var brief = Brain.contentBrief(built.frame, plan, null);
  assert.ok(brief.system.indexOf("teachingThreads") !== -1 && brief.system.indexOf("applicationTarget") !== -1, tag + "content brief explains threads and the application target");
  fixture.dropped.forEach(function (text) { assert.strictEqual(brief.user.indexOf(text), -1, tag + "dropped knowledge sent to the model"); });

  reports[key] = { fixture: fixture, plan: plan, slots: slots, report: report, scenes: Brain.sceneReport(scenes) };
}

Object.keys(FIXTURES).forEach(runFixture);

// ---- breadth vs depth: the two shark requests ----
var broad = reports.A;
var narrow = reports.B;
assert.strictEqual(broad.plan.teachingPlan.scope, "broad");
assert.strictEqual(narrow.plan.teachingPlan.scope, "narrow");
assert.ok(Brain.planBrief(ctxFor(FIXTURES.A)).system.indexOf("Choose a coherent scope yourself") !== -1, "broad brief asks Wondii to choose the scope");
assert.ok(Brain.planBrief(ctxFor(FIXTURES.B)).system.indexOf("Go deeper, not wider") !== -1, "narrow brief keeps the request narrow");
assert.ok(/shark/i.test(Brain.planBrief(ctxFor(FIXTURES.A)).system) === false, "no topic-specific planner rules");
FIXTURES.B.dropped.forEach(function (text) {
  assert.ok(narrow.plan.mapRejected.some(function (row) { return row.knowledge === text && /not connected/.test(row.reason); }), "narrow lesson rejects the side topic: " + text);
  assert.ok(narrow.report.rejectedAsDepth.some(function (row) { return row.knowledge === text && row.reason === "other" && !row.taught; }), "the diagnostic records the side topic: " + text);
});
narrow.plan.learningMap.forEach(function (item) {
  assert.ok(!/\b(ocean|oceans|eat|eats|seals)\b/i.test(item.knowledge), "narrow lesson does not broaden into habitat or diet: " + item.knowledge);
});
var narrowDepth = narrow.plan.teachingPlan.strands.filter(function (row) { return row.developed; }).length;
assert.ok(narrowDepth >= 2, "the narrow lesson develops several mechanisms inside the requested relationship");

// ---- negative cases from production ----
var canaryCtx = ctxFor({ year: "Year 1", subject: "Science", minutes: 15, intent: "explain", ask: "Teach children about sharks.", goal: "Students will understand basic facts about sharks and their habitats." });
var canaryMap = [
  { id: "k1", knowledge: "Sharks are a type of fish with fins and gills.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "k2", knowledge: "Sharks have different body parts like fins, tails, and teeth.", role: "feature", importance: "core", dependsOn: ["k1"] },
  { id: "k3", knowledge: "Sharks live in oceans and some in rivers.", role: "concept", importance: "core", dependsOn: ["k1"] },
  { id: "k4", knowledge: "Sharks are predators and hunt for food like fish.", role: "function", importance: "core", dependsOn: ["k2", "k3"] },
  { id: "k5", knowledge: "Sharks have special adaptations that help them survive in water.", role: "cause", importance: "core", dependsOn: ["k2", "k3"] },
  { id: "k6", knowledge: "Sharks play an important role in keeping ocean ecosystems balanced.", role: "effect", importance: "core", dependsOn: ["k4", "k5"] }
];
var canaryRaw = { learningObjective: "Students will understand basic facts about sharks and their habitats.", subject: "Science", topic: "Science Children Sharks", yearGroup: "Year 1", learningMap: canaryMap, lessonArc: [{ purpose: "teach" }, { purpose: "check" }] };
var canary = Brain.normalisePlan(canaryRaw, canaryCtx);
assert.strictEqual(canary.ok, false, "the shallow production canary map is not accepted on the first pass");
assert.ok(canary.issues.indexOf("The learning map needs two or more developed strands for this broad topic.") !== -1, canary.issues.join("; "));
var canaryRepair = JSON.parse(Brain.planRepairBrief(canaryCtx, canary.issues, canary.previous).user);
assert.ok(canaryRepair.relationshipRequired.some(function (line) { return line.indexOf("strands:") === 0; }), "the plan repair is told what a strand is");
var canarySettled = Brain.normalisePlan(canaryRaw, Object.assign({}, canaryCtx, { breadthSettled: true }));
assert.strictEqual(canarySettled.ok, true, "after one repair the depth gate is a recorded warning, not a blocker");
assert.strictEqual(canarySettled.plan.teachingPlan.substantiveDepth.met, false, "the settled shallow plan is recorded as not meeting depth");

var metaMap = [
  { id: "k1", knowledge: "Sharks have a unique body structure with fins and sharp teeth.", role: "feature", importance: "core", dependsOn: [] },
  { id: "k2", knowledge: "Sharks live in many oceans around the world.", role: "concept", importance: "core", dependsOn: ["k1"] },
  { id: "k3", knowledge: "Sharks are predators that eat fish and other sea animals.", role: "function", importance: "core", dependsOn: ["k2"] },
  { id: "k4", knowledge: "Sharks vary in size and species.", role: "comparison", importance: "core", dependsOn: ["k1"] },
  { id: "k5", knowledge: "Sharks play an important role in ocean health.", role: "effect", importance: "core", dependsOn: ["k3"] },
  { id: "k6", knowledge: "Learning about sharks helps us protect them and their habitats.", role: "function", importance: "core", dependsOn: ["k5"] }
];
var meta = Brain.normalisePlan(Object.assign({}, canaryRaw, { learningMap: metaMap }), Object.assign({}, canaryCtx, { breadthSettled: true }));
assert.strictEqual(meta.plan.keyKnowledge.indexOf(metaMap[5].knowledge), -1, "a point about learning the topic is not lesson knowledge");
assert.ok(meta.plan.teachingPlan.rejectedAsDepth.some(function (row) { return row.reason === "generic-connection" && /Learning about sharks/.test(row.knowledge); }));
var conservationCtx = ctxFor({ year: "Year 1", subject: "Science", minutes: 15, intent: "explain", ask: "Teach children why learning about sharks helps us protect them.", goal: "Understand why we should protect sharks." });
var conservation = Brain.buildLearningMap(Object.assign({}, canaryRaw, { learningMap: metaMap }), conservationCtx, "Understand why we should protect sharks.");
assert.ok(conservation.items.some(function (item) { return item.knowledge === metaMap[5].knowledge; }), "the same point is kept when the teacher asked about protecting them");
var unasked = Brain.buildLearningMap(Object.assign({}, canaryRaw, { learningMap: metaMap }), canaryCtx, canaryRaw.learningObjective);
assert.ok(!unasked.items.some(function (item) { return item.knowledge === metaMap[5].knowledge; }), "a model-written goal does not make a meta point lesson knowledge");

var paraphraseMap = [
  { id: "p1", knowledge: "Sharks have a streamlined body.", role: "feature", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Their body helps them swim.", role: "function", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Sharks swim well.", role: "effect", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "A shark's tail pushes water backwards to move it forward.", role: "mechanism", importance: "core", dependsOn: ["p1"] }
];
var para = Brain.normalisePlan(Object.assign({}, canaryRaw, { learningMap: paraphraseMap }), canaryCtx);
var paraPlan = Brain.normalisePlan(Object.assign({}, canaryRaw, { learningMap: paraphraseMap }), Object.assign({}, canaryCtx, { breadthSettled: true })).plan;
assert.strictEqual(paraPlan.keyKnowledge.indexOf("Sharks swim well."), -1, "a repetition is dropped");
assert.ok(paraPlan.mapRejected.some(function (row) { return row.reason === "repetition"; }));
assert.strictEqual(paraPlan.droppedKnowledge.indexOf("Sharks swim well."), -1, "a dropped repetition does not count as a leaked idea");
var weak = paraPlan.teachingPlan.points.filter(function (row) { return paraPlan.learningMap.filter(function (item) { return item.id === row.id; })[0].knowledge === "Their body helps them swim."; })[0];
assert.strictEqual(weak.category, "low-substance", "a restated outcome does not count as substantive depth");
assert.strictEqual(paraPlan.teachingPlan.substantiveDepth.achieved, 2, "paraphrases do not inflate depth");
assert.strictEqual(para.ok, false, "a paraphrase chain does not satisfy the depth floor");

var genericMap = [
  { id: "p1", knowledge: "A shark is a fish that lives in the sea.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Gills take oxygen from the water so a shark can breathe.", role: "function", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "A strong tail pushes the water so a shark moves forward.", role: "mechanism", importance: "core", dependsOn: ["p1"] },
  { id: "p4", knowledge: "These things help sharks survive.", role: "connection", importance: "core", dependsOn: ["p2", "p3"] },
  { id: "p5", knowledge: "All of this keeps a shark alive in the ocean.", role: "connection", importance: "core", dependsOn: ["p2", "p3"] },
  { id: "p6", knowledge: "Its body works together.", role: "connection", importance: "core", dependsOn: ["p2"] }
];
var generic = Brain.normalisePlan(Object.assign({}, canaryRaw, { learningMap: genericMap }), canaryCtx);
assert.strictEqual(generic.ok, false, "generic connections do not satisfy the depth floor");
assert.ok(generic.issues.indexOf("The learning map needs more connected learning points.") !== -1);
var genericPlan = Brain.normalisePlan(Object.assign({}, canaryRaw, { learningMap: genericMap }), Object.assign({}, canaryCtx, { breadthSettled: true })).plan;
assert.ok(genericPlan.teachingPlan.substantiveDepth.achieved <= 4, "connections add at most one place: " + genericPlan.teachingPlan.substantiveDepth.achieved);

var exampleMap = [
  { id: "p1", knowledge: "A plant is a living thing that needs water and light.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Roots take water from the soil up into the plant.", role: "function", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "A carrot is a root we can eat.", role: "example", importance: "supporting", dependsOn: ["p2"] },
  { id: "p4", knowledge: "A dandelion has a long root that reaches deep water.", role: "example", importance: "supporting", dependsOn: ["p2"] },
  { id: "p5", knowledge: "Tree roots spread out wide under the ground.", role: "example", importance: "supporting", dependsOn: ["p2"] },
  { id: "p6", knowledge: "A beetroot stores food in its root.", role: "example", importance: "supporting", dependsOn: ["p2"] }
];
var plantsCtx = ctxFor(FIXTURES.C);
var examples = Brain.normalisePlan(rawFor(FIXTURES.C, exampleMap), plantsCtx);
assert.strictEqual(examples.ok, false, "examples do not satisfy the whole depth floor");
var examplePlan = Brain.normalisePlan(rawFor(FIXTURES.C, exampleMap), Object.assign({}, plantsCtx, { breadthSettled: true })).plan;
assert.strictEqual(examplePlan.teachingPlan.substantiveDepth.achieved, 3, "four examples add one place");

// ---- older plans without a teaching plan keep the earlier planner ----
var legacyPlan = JSON.parse(JSON.stringify(reports.A.plan));
delete legacyPlan.teachingPlan;
var legacySlots = Brain.planBeats(Brain.lessonSkeleton(legacyPlan, ctxFor(FIXTURES.A)), legacyPlan, "Year 1");
assert.strictEqual(slotOf(legacySlots, "apply").applicationTarget, undefined, "a saved plan without a teaching plan is planned as before");
assert.deepStrictEqual(Brain.beatProblems(legacySlots), []);
assert.ok(Brain.planScenes(legacySlots, legacyPlan, { yearGroup: "Year 1", requestedMinutes: 15 }), "planScenes still reads a plan without strands");
assert.strictEqual(Brain.teachingPlanReport(legacyPlan, legacySlots, {}), null);

// ---- scope classifier ----
[["Teach children about volcanoes.", "broad"], ["Teach children why volcanoes erupt.", "narrow"], ["Teach children how to measure angles.", "narrow"], ["Teach children what a noun is.", "narrow"], ["The Romans", "broad"]].forEach(function (row) {
  assert.strictEqual(Brain.teachingScope({ lessonBrief: { rawRequest: row[0] } }).scope, row[1], row[0]);
});

if (process.env.TEACHING_REPORT) {
  Object.keys(reports).forEach(function (key) {
    var row = reports[key];
    var r = row.report;
    var textOf = {};
    row.plan.learningMap.forEach(function (item) { textOf[item.id] = item.knowledge; });
    console.log("\n### " + row.fixture.name);
    console.log("request: " + row.fixture.ask);
    console.log("scope: " + r.scope + " (" + r.scopeReason + ")");
    console.log("depth: required " + r.substantiveDepth.required + ", achieved " + r.substantiveDepth.achieved + " (substantive " + r.substantiveDepth.substantive + ", supporting " + r.substantiveDepth.supporting + ", synthesis " + r.substantiveDepth.synthesis + "; strands developed " + r.substantiveDepth.strandsDeveloped + ")");
    r.threads.forEach(function (t) { console.log("  thread " + t.id + (t.developed ? "*" : "") + ": " + t.purpose + " [" + t.knowledgeRefs.join(",") + "]"); });
    console.log("progression: " + r.teachingProgression.map(function (b) { return b.move + "(" + b.knowledgeRefs.join("+") + ")"; }).join(" > "));
    console.log("scenes: " + r.sceneCoverage.map(function (s) { return s.purpose + "[" + s.threadIds.join(",") + "]"; }).join(" | "));
    console.log("apply: " + (r.applicationCandidate ? r.applicationCandidate.thread + " " + r.applicationCandidate.knowledgeRefs.join(",") + " — " + r.applicationCandidate.expectedEvidence : "none"));
    console.log("check: " + r.checkRefs.join(",") + "; candidates: " + r.assessmentCandidates.map(function (c) { return c.knowledgeRefs[0] + "/" + c.strand + "/" + c.level; }).join(" "));
    console.log("recap: " + r.recapTakeaways.map(function (t) { return t.takeaway; }).join(" | "));
    if (r.rejectedAsDepth.length) console.log("not counted: " + r.rejectedAsDepth.map(function (x) { return x.reason + ": " + x.knowledge; }).join(" | "));
    console.log("map: " + row.plan.learningMap.map(function (item) { return item.id + " " + item.knowledge; }).join(" / "));
  });
}

console.log("teaching plan tests passed");
