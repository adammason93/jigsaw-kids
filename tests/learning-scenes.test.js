"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Creator = require("../schools/learn/creator-core.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Shell = require("../schools/learn/lesson-shell.js");

var STAGES = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];

var LESSONS = {
  shark: {
    subject: "Science", intent: "process",
    ask: "Teach children how a shark's body helps it swim.",
    goal: "Understand how a shark's body helps it swim.",
    map: [
      { id: "p1", knowledge: "A shark has a smooth, pointed body shape.", role: "feature", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "The smooth, pointed shape helps the shark slide through the water easily.", role: "function", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: [] },
      { id: "p4", knowledge: "The tail swishes from side to side, which helps push the shark forward so it can swim.", role: "function", importance: "core", dependsOn: ["p3"] },
      { id: "p6", knowledge: "Fins help the shark steer and stay balanced as it swims.", role: "function", importance: "core", dependsOn: [] },
      { id: "p8", knowledge: "The body shape, the tail and the fins work together so the shark can swim well.", role: "connection", importance: "core", dependsOn: ["p2", "p4", "p6"] }
    ]
  },
  fire: {
    subject: "History", intent: "why",
    ask: "Teach children why the Great Fire of London spread so quickly and what changed afterwards.",
    goal: "Understand why the Great Fire of London spread so quickly and what changed afterwards.",
    map: [
      { id: "p1", knowledge: "In 1666 a fire started in a bakery on Pudding Lane.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p2", knowledge: "The fire spread quickly because the wooden houses stood close together.", role: "cause", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "The fire spread quickly because a strong wind blew the flames between streets.", role: "cause", importance: "core", dependsOn: ["p1"] },
      { id: "p4", knowledge: "The fire spread quickly because people had no fire engines to stop it.", role: "cause", importance: "core", dependsOn: ["p1"] },
      { id: "p6", knowledge: "The fire burned thousands of homes, which meant many people lost their homes.", role: "effect", importance: "core", dependsOn: ["p2", "p3", "p4"] },
      { id: "p7", knowledge: "London was rebuilt with brick and stone so that a fire could not spread as easily.", role: "effect", importance: "core", dependsOn: ["p6"] },
      { id: "p9", knowledge: "Close wooden houses, wind and no fire engines together explain why the fire spread so fast and why London was rebuilt in brick.", role: "connection", importance: "core", dependsOn: ["p2", "p3", "p4", "p7"] }
    ]
  },
  river: {
    subject: "Geography", intent: "process",
    ask: "Teach children how rivers change the landscape.",
    goal: "Understand how rivers change the landscape.",
    map: [
      { id: "p1", knowledge: "A river flows downhill from its source to the sea.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p2", knowledge: "Fast water picks up stones and sand, and then it rubs them against the riverbed.", role: "process", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "This erosion wears away the rock, which changes the landscape by making the valley deeper.", role: "effect", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "The river carries the worn material downstream.", role: "process", importance: "core", dependsOn: ["p2"] },
      { id: "p5", knowledge: "Where the river slows down, it drops mud and sand, which changes the landscape by building new land.", role: "effect", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "On a bend the river wears away the outside bank and drops sand on the inside, which makes the meander grow.", role: "effect", importance: "supporting", dependsOn: ["p3", "p5"] },
      { id: "p8", knowledge: "Erosion, transport and deposition work together to change the landscape over time.", role: "connection", importance: "core", dependsOn: ["p3", "p4", "p5"] },
      { id: "p9", knowledge: "A deep river valley was carved by a river wearing away rock for thousands of years.", role: "example", importance: "supporting", dependsOn: ["p3"] }
    ]
  }
};

function ctxFor(lesson, year, minutes) {
  return {
    yearGroup: year, subject: lesson.subject, lessonText: lesson.ask, topic: lesson.goal,
    requestedMinutes: minutes, pupilCount: 4, depthRequired: true, breadthSettled: true,
    lessonBrief: {
      intent: lesson.intent, rawRequest: lesson.ask, learningGoal: lesson.goal,
      teacherIntent: { ok: true, learningGoal: lesson.goal, requiredEvidence: "The pupil explains " + lesson.goal.replace(/^Understand /, "").replace(/\.$/, "") + "." }
    }
  };
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
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var text = {
    notice: "Look at the scene and say what you can see.",
    predict: "Say what you think is happening before the explanation.",
    name: item.text,
    explain: "This matters because " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    exemplify: "For example, you can see it when " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    model: "First follow this step: " + known.charAt(0).toLowerCase() + known.slice(1) + ", then check what changed.",
    compare: "Look at both sides and say what is different.",
    connect: item.text,
    practise: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    apply: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    reveal: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    consolidate: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + "."
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
        return {
          id: beat.id,
          prompt: "Which sentence matches taught idea number " + (index + 1) + "?",
          choices: [answer, "A different idea that was not part of this lesson."],
          correct: answer,
          explain: "That sentence matches the idea the class has just learned.",
          successEvidence: "The pupil chose the taught idea.",
          teachingConnection: "The question follows the taught idea."
        };
      });
      body.check = questions.length > 1 ? { beats: beats, questions: questions } : Object.assign({ beats: beats }, questions[0]);
    } else body[slot.id] = { beats: beats };
  });
  return body;
}

function build(name, year, minutes) {
  var lesson = LESSONS[name];
  var tag = name + " " + year + " " + minutes + "m: ";
  var ctx = ctxFor(lesson, year, minutes);
  var made = Brain.normalisePlan({
    learningObjective: lesson.goal, subject: lesson.subject, topic: lesson.goal, yearGroup: year,
    durationMinutes: minutes, learningMap: lesson.map, lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, ctx);
  assert.strictEqual(made.ok, true, tag + (made.issues || []).join("; "));
  var plan = made.plan;
  var slots = Brain.planBeats(Brain.lessonSkeleton(plan, ctx), plan, year);
  var items = Brain.beatKnowledge(plan, year);
  var frame = Object.assign({}, ctx, { lessonPlan: plan, lessonSkeleton: slots });
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  var checkCount = slots.filter(function (slot) { return slot.id === "check"; })[0].beats.length;
  var raw = { title: name, objectives: [lesson.goal], slots: bodyFor(slots, items) };
  // The fixture copy is not tuned to accept's duration band at 8 or 30 minutes, so accept judges it as 15; the plan and beats use the real minutes.
  var accepted = Brain.accept(raw, Object.assign({}, frame, {
    requestedMinutes: 15,
    applySemantic: { relationship: "apply", reason: "The task uses the idea." },
    checkSemantics: Array.apply(null, Array(checkCount)).map(function () { return { coverage: "sufficient" }; })
  }));
  assert.strictEqual(accepted.ok, true, tag + (accepted.issues || []).join(" | "));
  var activities = accepted.adventure.activities;
  var draft = { activities: activities, lessonPlan: plan, year: year, targetMinutes: minutes, storyPlan: frame.storyPlan };
  var scenes = Brain.planScenes(draft.activities, plan, { yearGroup: year, requestedMinutes: minutes });
  return { tag: tag, plan: plan, slots: slots, draft: draft, scenes: scenes, accepted: accepted, year: year, minutes: minutes };
}

function flatBeats(activities) {
  var out = [];
  STAGES.forEach(function (id) {
    activities.filter(function (activity) { return activity.slotId === id; })[0].beats.forEach(function (beat) { out.push(beat.id); });
  });
  return out;
}

function checkInvariants(run) {
  var tag = run.tag;
  var scenes = run.scenes;
  assert.ok(Array.isArray(scenes) && scenes.length >= 4, tag + "scenes planned");
  var ledger = Brain.taughtLedger(run.slots);

  // A. contiguous and canonical stage order
  var stageOrder = [];
  scenes.forEach(function (scene) {
    scene.stageIds.forEach(function (id) { if (stageOrder[stageOrder.length - 1] !== id) stageOrder.push(id); });
  });
  assert.deepStrictEqual(stageOrder, STAGES, tag + "stage order is canonical and contiguous");

  // B + C. every beat once, in order
  var sceneBeats = [];
  scenes.forEach(function (scene) { scene.beatIds.forEach(function (id) { sceneBeats.push(id); }); });
  assert.deepStrictEqual(sceneBeats, flatBeats(run.draft.activities), tag + "no beat lost, duplicated or reordered");

  // D. each taught ref introduced in exactly one scene
  var introduced = {};
  scenes.forEach(function (scene) {
    scene.knowledgeRefs.forEach(function (ref) {
      assert.ok(!introduced[ref], tag + ref + " introduced twice");
      introduced[ref] = scene.id;
    });
  });
  assert.deepStrictEqual(Object.keys(introduced).sort(), ledger.taught.slice().sort(), tag + "every taught ref is introduced once");

  // E. dependencies introduced no later than dependants
  var at = {};
  scenes.forEach(function (scene, index) { scene.knowledgeRefs.forEach(function (ref) { at[ref] = index; }); });
  run.plan.learningMap.forEach(function (item) {
    item.dependsOn.forEach(function (dep) {
      assert.ok(at[dep] <= at[item.id], tag + item.id + " comes after " + dep);
    });
  });

  // learn/connect scenes introduce something new
  scenes.forEach(function (scene) {
    if (scene.purpose === "learn" || scene.purpose === "connect") assert.ok(scene.knowledgeRefs.length >= 1, tag + scene.id + " introduces knowledge");
  });

  // F + G. apply and check only use refs introduced earlier
  ["synthesise", "challenge"].forEach(function (purpose) {
    var index = scenes.map(function (scene) { return scene.purpose; }).indexOf(purpose);
    assert.ok(index > 0, tag + purpose + " exists");
    scenes[index].usesRefs.forEach(function (ref) {
      assert.ok(at[ref] != null && at[ref] < index, tag + purpose + " uses " + ref + " after it is taught");
    });
    assert.strictEqual(scenes[index].knowledgeRefs.length, 0, tag + purpose + " teaches nothing new");
  });

  // H. one finish scene covering resolution + recap
  var finish = scenes.filter(function (scene) { return scene.purpose === "finish"; });
  assert.strictEqual(finish.length, 1, tag + "one finish scene");
  assert.deepStrictEqual(finish[0].stageIds, ["resolution", "recap"]);
  assert.strictEqual(scenes[scenes.length - 1].purpose, "finish");
  var recapRefs = [];
  run.draft.activities.filter(function (a) { return a.slotId === "recap"; })[0].beats.forEach(function (beat) {
    beat.knowledgeRefs.forEach(function (ref) { recapRefs.push(ref); });
  });
  recapRefs.forEach(function (ref) { assert.ok(finish[0].usesRefs.indexOf(ref) !== -1, tag + "finish keeps recap ref " + ref); });

  // structure only: fixed labels, no internal stage names, no model text
  var cap = { 1: 4, 2: 4, 3: 6, 4: 6 }[Number(String(run.year).replace(/\D/g, ""))] || 8;
  scenes.forEach(function (scene) {
    assert.ok(["Explore", "Discover", "Connect", "Try it", "Challenge", "Finish"].indexOf(scene.label) !== -1, tag + "fixed label");
    assert.deepStrictEqual(Object.keys(scene).sort(), ["beatIds", "id", "interaction", "knowledgeRefs", "label", "purpose", "retrieval", "stageIds", "usesRefs", "visual"].sort());
    if (scene.purpose !== "challenge" && scene.purpose !== "finish" && scene.purpose !== "synthesise") {
      assert.ok(scene.beatIds.length <= cap, tag + scene.id + " stays within the year's beat cap");
    }
  });
  assert.strictEqual(scenes.filter(function (scene) { return scene.purpose === "challenge"; })[0].label, "Challenge");
  return scenes;
}

// ---- A-H and O: invariants and counts across years and durations ----
var counts = {};
[["shark", "Year 1"], ["fire", "Year 4"], ["river", "Year 6"]].forEach(function (pair) {
  [8, 15, 30].forEach(function (minutes) {
    var run = build(pair[0], pair[1], minutes);
    var scenes = checkInvariants(run);
    var learning = scenes.filter(function (scene) { return ["investigate", "learn", "connect", "synthesise"].indexOf(scene.purpose) !== -1; }).length;
    counts[pair[1] + " " + minutes] = { learning: learning, total: scenes.length };
    if (process.env.SCENE_DUMP) console.log(run.tag, JSON.stringify(Brain.sceneReport(scenes)));
  });
});
Object.keys(counts).forEach(function (key) {
  var minutes = Number(key.split(" ").pop());
  var learning = counts[key].learning;
  assert.ok(learning >= 3, key + " has at least opening, one teaching scene and the task: " + learning);
  if (minutes === 8) assert.ok(learning <= 5, key + " short lesson stays small: " + learning);
  if (minutes === 15) assert.ok(learning >= 4 && learning <= 6, key + " 15 minute lesson has 4-6 learning scenes: " + learning);
  assert.ok(counts[key].total <= 10, key + " total scenes bounded");
});
["Year 1", "Year 4", "Year 6"].forEach(function (year) {
  assert.ok(counts[year + " 8"].learning <= counts[year + " 15"].learning, year + " 8m not longer than 15m");
  assert.ok(counts[year + " 15"].learning <= counts[year + " 30"].learning, year + " 15m not longer than 30m");
});

// ---- deterministic ----
var sharkA = build("shark", "Year 1", 15);
var sharkB = build("shark", "Year 1", 15);
assert.deepStrictEqual(sharkA.scenes, sharkB.scenes, "planScenes is deterministic");
var opening = sharkA.scenes[0];
assert.strictEqual(opening.purpose, "investigate");
assert.deepStrictEqual(opening.stageIds.slice(0, 2), ["hook", "investigate"], "opening groups the hook and investigate");
assert.strictEqual(sharkA.scenes.filter(function (scene) { return scene.purpose === "connect"; }).length, 1, "connection knowledge forms a connect scene");

// planScenes refuses non-canonical input instead of guessing
assert.strictEqual(Brain.planScenes(sharkA.draft.activities.slice(1), sharkA.plan, {}), null);
assert.strictEqual(Brain.planScenes(sharkA.draft.activities.slice().reverse(), sharkA.plan, {}), null);
assert.strictEqual(Brain.planScenes([], {}, {}), null);

// diagnostics: bounded, structural only
var report = Brain.sceneReport(sharkA.scenes);
assert.strictEqual(report.length, sharkA.scenes.length);
report.forEach(function (row) {
  assert.deepStrictEqual(Object.keys(row).sort(), ["beatIds", "interaction", "knowledgeRefs", "purpose", "sceneId", "stageIds", "usesRefs", "visualAssetId"].sort());
});
assert.ok(JSON.stringify(report).length < 4000);
assert.strictEqual(JSON.stringify(report).indexOf("shark"), -1, "the report carries no pupil copy");
assert.deepStrictEqual(Creator.sceneReportFor(sharkA.draft), report);

// ---- slidesFor: one slide per scene, metadata kept, activities untouched ----
var activitiesBefore = JSON.stringify(sharkA.draft.activities);
var slides = Creator.slidesFor(sharkA.draft);
assert.strictEqual(JSON.stringify(sharkA.draft.activities), activitiesBefore, "plan.activities untouched");
assert.strictEqual(slides.length, sharkA.scenes.length, "one slide per scene");
slides.forEach(function (slide, index) {
  var scene = sharkA.scenes[index];
  assert.strictEqual(slide.sceneId, scene.id);
  assert.strictEqual(slide.sceneLabel, scene.label);
  assert.strictEqual(slide.kicker, scene.label);
  assert.strictEqual(slide.purpose, scene.purpose);
  assert.deepStrictEqual(slide.stageIds, scene.stageIds);
  assert.deepStrictEqual(slide.beatIds, scene.beatIds);
  assert.deepStrictEqual(slide.knowledgeRefs, scene.knowledgeRefs);
  assert.deepStrictEqual(slide.usesRefs, scene.usesRefs);
  assert.deepStrictEqual(slide.sourceActivities.map(function (item) { return item.slotId; }), scene.stageIds);
  assert.notStrictEqual(slide.kicker, "Look", "the challenge is not labelled Look");
});
var challengeSlide = slides.filter(function (slide) { return slide.purpose === "challenge"; })[0];
var checkActivity = sharkA.draft.activities.filter(function (a) { return a.slotId === "check"; })[0];
assert.strictEqual(challengeSlide.type, "question");
assert.strictEqual(challengeSlide.questions.length, checkActivity.config.questions.length, "question count unchanged");
assert.strictEqual(challengeSlide.beats, undefined, "the challenge has no hidden beat clicks");
assert.ok(Creator.slidesPlayable(slides));
var adventure = Creator.toAdventure(Object.assign({ id: "a1", source: {}, goals: [], vocabulary: [], teams: [] }, sharkA.draft), "org-1");
assert.strictEqual(adventure.plan.slides.length, sharkA.scenes.length);
assert.strictEqual(adventure.plan.activities.length, 7, "saved activities stay the canonical seven");
assert.deepStrictEqual(adventure.learningMap.sceneReport, report, "the scene report is saved with the adventure");

// ---- H / finish: one screen, outcome first, every recap line ----
var finishSlide = slides[slides.length - 1];
var resolutionBeats = sharkA.draft.activities.filter(function (a) { return a.slotId === "resolution"; })[0].beats;
var recapBeats = sharkA.draft.activities.filter(function (a) { return a.slotId === "recap"; })[0].beats;
assert.deepStrictEqual(finishSlide.outcome, resolutionBeats.map(function (beat) { return beat.pupil.text; }));
assert.deepStrictEqual(finishSlide.recap, recapBeats.map(function (beat) { return beat.pupil.text; }));
assert.strictEqual(finishSlide.beats, undefined, "the finish scene is not paged");
assert.deepStrictEqual(Shell.advancePlay(finishSlide, { beat: 0 }).stage, true, "one Next leaves the finish scene");
var finishHtml = Mechanics.render(finishSlide, { immersed: true, interact: { beat: 0 } }).html;
assert.ok(finishHtml.indexOf(escapeHtml(finishSlide.outcome[0])) < finishHtml.indexOf("What we discovered"), "outcome first");
finishSlide.recap.forEach(function (line) { assert.ok(finishHtml.indexOf(escapeHtml(line)) !== -1, "recap line shown: " + line); });

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]; });
}

// ---- L: beats build up on scene slides; legacy slides still replace ----
var learnSlide = slides.filter(function (slide) { return slide.purpose === "learn" && slide.beats.length >= 2; })[0];
assert.ok(learnSlide, "a learn scene with several beats");
var first = learnSlide.beats[0].pupil.text;
var second = learnSlide.beats[1].pupil.text;
var beat0 = Mechanics.render(learnSlide, { immersed: true, interact: { beat: 0, step: 0 } }).html;
var beat1 = Mechanics.render(learnSlide, { immersed: true, interact: { beat: 1, step: 0 } }).html;
assert.ok(beat0.indexOf(escapeHtml(first)) !== -1 && beat0.indexOf(escapeHtml(second)) === -1);
assert.ok(beat1.indexOf(escapeHtml(first)) !== -1 && beat1.indexOf(escapeHtml(second)) !== -1, "the earlier beat stays visible");
assert.ok(beat1.indexOf(escapeHtml(first)) < beat1.indexOf(escapeHtml(second)), "the new beat goes beneath");
assert.ok(beat1.indexOf("lesson-copy is-new") !== -1);
var legacySlides = Creator.stageSlides(sharkA.draft);
var legacyTeach = legacySlides.filter(function (slide) { return slide.beat === "discovery"; })[0];
var legacy1 = Mechanics.render(legacyTeach, { immersed: true, interact: { beat: 1, step: 0 } }).html;
assert.strictEqual(legacy1.indexOf(escapeHtml(legacyTeach.beats[0].pupil.text)), -1, "legacy beats still replace");
assert.deepStrictEqual(Shell.advancePlay(learnSlide, { beat: 0 }).stage, false, "Next advances a beat inside the scene");
assert.deepStrictEqual(Shell.advancePlay(learnSlide, { beat: learnSlide.beats.length - 1 }).stage, true);

// interactions wait for their beat: the opening tap appears with its own beat
var openingSlide = slides[0];
var steps = Mechanics.interactionsOf(openingSlide);
steps.forEach(function (step) { assert.ok(typeof step.beatIndex === "number", "interaction is tied to a beat"); });
var late = steps.filter(function (step) { return step.beatIndex > 0; })[0];
if (late) {
  assert.strictEqual(Shell.waitingOn(late, { beat: 0 }), false, "a later interaction does not block the first beat");
  assert.strictEqual(Mechanics.layerHtml({ sceneId: "s1", interactions: [late] }, { beat: 0, step: 0 }), "");
}

// ---- M / N: no earthquake rectangles for a generic move; earthquake stays ----
assert.ok(steps.concat(Mechanics.interactionsOf(slides.filter(function (slide) { return slide.purpose === "synthesise"; })[0])).every(function (step) {
  return step.type !== "move" && step.type !== "drag";
}), "generic move becomes tap-to-reveal on scene slides");
var genericMove = { type: "move", target: "world", instruction: "Show how a shark swims using your arms.", successCondition: "The pupil moves." };
var swim = { sceneId: "s5", type: "story", interactions: [genericMove] };
var swimLayer = Mechanics.layerHtml(swim, { beat: 0, step: 0 });
assert.strictEqual(swimLayer.indexOf("lesson-slab"), -1, "no rectangles for a generic move");
assert.ok(swimLayer.indexOf("data-world=\"spot\"") !== -1, "falls back to the tap/reveal presentation");
var plateMove = { type: "move", target: "plate", instruction: "Can you move the plate?", successCondition: "slip", teachingReveal: "The plates slip suddenly." };
assert.ok(Creator.earthquakeMove(plateMove) && Mechanics.earthquakeMove(plateMove));
assert.strictEqual(Creator.earthquakeMove(genericMove), false);
var quake = { sceneId: "s2", type: "story", interactions: [plateMove] };
assert.ok(Mechanics.layerHtml(quake, { beat: 0, step: 0 }).indexOf("lesson-slab") !== -1, "earthquake scene keeps the plates");
assert.ok(Mechanics.layerHtml({ type: "story", interactions: [plateMove] }, { step: 0 }).indexOf("lesson-slab") !== -1, "legacy earthquake keeps the plates");
assert.ok(Mechanics.layerHtml({ type: "story", interactions: [genericMove] }, { step: 0 }).indexOf("lesson-slab") !== -1, "legacy slides render exactly as before");
assert.strictEqual(Shell.waitingOn(plateMove, { slipped: false }), true, "earthquake still waits for the slip");
assert.strictEqual(Shell.waitingOn(plateMove, { slipped: true }), false);

// ---- I: no scene data means the legacy path ----
var noBeats = sharkA.draft.activities.map(function (activity) {
  var copy = JSON.parse(JSON.stringify(activity));
  delete copy.beats;
  return copy;
});
var legacyOnly = Creator.slidesFor({ activities: noBeats });
assert.strictEqual(legacyOnly.length, 7);
assert.ok(legacyOnly.every(function (slide) { return !slide.sceneId; }), "legacy adventures get no scene fields");
assert.deepStrictEqual(legacyOnly, Creator.stageSlides({ activities: noBeats }), "legacy slides are byte-identical");
var library = Creator.slidesFor({ activities: [{ id: "a", mechanic: "story", title: "Story", config: { lines: ["A line for the class."] } }] });
assert.strictEqual(library.length, 1);
assert.strictEqual(library[0].sceneId, undefined);

// ---- J / K: scene navigation has no transition card; classic keeps it ----
function fakeRoot() {
  return {
    innerHTML: "",
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}
function liveModel(list, index, calls) {
  return {
    view: { slides: list, slide: index, engineStatus: "active", status: "active", mode: "board", reveal: false, engine: { status: "active", teams: [], teamMode: "none", participants: [], rounds: list.map(function (s, i) { return { id: "r" + i }; }), mechanicStore: {} } },
    actions: { goTo: function (target) { calls.push(target); }, complete: function () { calls.push("complete"); } }
  };
}
global.matchMedia = function () { return { matches: true }; };
var root = fakeRoot();
var calls = [];
var sceneList = [
  { sceneId: "s1", sceneLabel: "Explore", type: "story", lines: ["One line for the class."] },
  { sceneId: "s2", sceneLabel: "Discover", type: "story", lines: ["Another line for the class."] }
];
Shell.resetFlow();
var model = liveModel(sceneList, 0, calls);
var screen = Shell.render(root, model);
assert.strictEqual(screen, "stage");
assert.ok(root.innerHTML.indexOf("Explore") !== -1 && root.innerHTML.indexOf("Discover") !== -1, "progress shows scene labels");
Shell.render(root, model);
pressPrimary(model, sceneList, 0);
assert.deepStrictEqual(calls, [1], "Next goes straight to the next scene");
assert.strictEqual(root.innerHTML.indexOf("lesson-transition"), -1, "no transition card");

var classic = [{ type: "story", lines: ["First classic line."] }, { type: "story", lines: ["Second classic line."] }];
var classicCalls = [];
Shell.resetFlow();
var classicModel = liveModel(classic, 0, classicCalls);
Shell.render(root, classicModel);
pressPrimary(classicModel, classic, 0);
assert.deepStrictEqual(classicCalls, [], "classic lessons do not skip the card");
assert.ok(root.innerHTML.indexOf("lesson-transition") !== -1, "classic transition card unchanged");
Shell.resetFlow();

function pressPrimary(m) {
  var handlers = [];
  var button = { addEventListener: function (type, fn) { handlers.push(fn); } };
  var r = {
    innerHTML: "",
    querySelector: function (sel) { return sel === "#lessonPrimary" ? button : null; },
    querySelectorAll: function () { return []; }
  };
  Shell.render(r, m);
  handlers.forEach(function (fn) { fn(); });
  root.innerHTML = r.innerHTML;
}

// completion: no repeated recap list for scene adventures
global.WondiiVisuals = { active: function () { return true; }, forSlide: function () { return null; } };
var done = liveModel(slides, slides.length - 1, []);
done.view.engineStatus = "completed";
done.view.status = "completed";
done.storyPlan = { title: "Shark mission", missionLabel: "Help the shark swim home." };
Shell.resetFlow();
Shell.render(root, done);
assert.ok(root.innerHTML.indexOf("Mission complete") !== -1);
assert.strictEqual(root.innerHTML.indexOf("You discovered"), -1, "completion does not repeat the recap");
var legacyDone = liveModel(Creator.stageSlides(sharkA.draft), 6, []);
legacyDone.view.engineStatus = "completed";
legacyDone.view.status = "completed";
legacyDone.storyPlan = done.storyPlan;
Shell.resetFlow();
Shell.render(root, legacyDone);
assert.ok(root.innerHTML.indexOf("You discovered") !== -1, "legacy completion unchanged");
delete global.WondiiVisuals;
delete global.matchMedia;

console.log("learning-scenes tests passed");
