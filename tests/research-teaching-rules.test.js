"use strict";

// Research-mode teaching rules (patch 6). Each rule is a reusable code check over the
// gate-ready units, their verbatim source quotes and the pupil copy. Negative cases are the
// real run 9 lesson ("Dinosaurs and Their Adaptations"); positive cases correct only the flagged
// sentences (test strings, never lesson content). The default path (no research) is unchanged.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");

function copy(v) { return JSON.parse(JSON.stringify(v)); }
function ctxFor(research) {
  var c = {
    yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
    lessonBrief: { teacherIntent: run9.intent }, lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan),
    knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection)
  };
  if (research) c.researchEvidence = copy(run9.research);
  return c;
}
function texts(rows) { return rows.map(function (r) { return r.text; }).join("\n"); }
var activities = copy(response.activities);
var ctx = ctxFor(true);

// ---- units and result clauses come from the verbatim source quotes ----
var units = Brain.researchUnits(ctx);
assert.deepStrictEqual(units.map(function (u) { return u.unitId; }), ["u1", "u2", "u3"]);
assert.strictEqual(units[0].resultClause, "use less energy to move");
assert.deepStrictEqual(units[0].keyTerms, ["energy", "move"]);
assert.deepStrictEqual(units[0].directions, ["less"]);
assert.strictEqual(Brain.resultClause("Large, strong jaw muscles went through the holes to attach directly to the top of the skull. As a result, the jaws were able to open wide and clamp down with more force."), "open wide and clamp down with more force");

// ---- 1. meaning preservation ----
// Negative (run 9 teach:1): "use less energy to move" became "move more efficiently".
var bad = Brain.meaningCheck("This leg position allowed them to move more efficiently than reptiles with sprawling legs.", units[0]);
assert.strictEqual(bad.ok, false);
assert.deepStrictEqual(bad.missing, ["energy"]);
assert.deepStrictEqual(bad.lostDirection, ["less"]);
assert.deepStrictEqual(bad.vague, ["efficiently"]);
// Negative: the direction word flipped.
assert.strictEqual(Brain.meaningCheck("Straight back legs let them use more energy to move.", units[0]).ok, false);
// Positive: the source's result in the source's words.
assert.strictEqual(Brain.meaningCheck("These straight back legs let them use less energy to move than lizards.", units[0]).ok, true);
var meaning = texts(Brain.meaningIssues(activities, ctx, units));
assert.ok(/teach slot changes what the source says about straight back legs \(u1, beat teach:1\).*"use less energy to move".*"energy".*"less".*"efficiently"/.test(meaning), meaning);
assert.ok(/recap slot changes what the source says about straight back legs \(u1, beat recap:0\)/.test(meaning), meaning);

// ---- 2. year-band vocabulary ----
assert.deepStrictEqual(Brain.hardWords("Dinosaurs had straight back legs positioned perpendicular to their bodies.", "Year 3"), ["perpendicular"]);
assert.deepStrictEqual(Brain.hardWords("The Ornithischia had a flexible lower-jaw joint.", "Year 3"), ["Ornithischia"]);
// Positive: glossed in the same sentence, a year-band curriculum word, or an older year group.
assert.deepStrictEqual(Brain.hardWords("Their legs were perpendicular, which means at a right angle, to their bodies.", "Year 3"), []);
assert.deepStrictEqual(Brain.hardWords("Dinosaurs adapted to their environments.", "Year 3"), []);
assert.deepStrictEqual(Brain.hardWords("Dinosaurs had straight back legs positioned perpendicular to their bodies.", "Year 6"), []);
var vocab = texts(Brain.vocabularyIssues(activities, ctx));
assert.ok(/teach slot uses words above Year 3 reading level: "perpendicular", "efficiently", "Ornithischia"/.test(vocab), vocab);

// ---- 3. teleology ----
assert.strictEqual(Brain.teleological("Why did some dinosaurs have two holes behind their eyes?"), true);
assert.strictEqual(Brain.teleological("Dinosaurs developed long necks so that they could reach leaves."), true);
assert.strictEqual(Brain.teleological("What did the two holes behind the eye socket let the jaw muscles do?"), false);
assert.strictEqual(Brain.teleological("A long neck let a sauropod reach high leaves."), false);
assert.ok(/check slot uses goal-directed wording \("Why did some dinosaurs have two holes/.test(texts(Brain.teleologyIssues(activities))));

// ---- 4. questions: answer traceable to a taught sentence; no partly-true wrong choice ----
var questions = texts(Brain.questionIssues(activities, ctx, units));
assert.ok(/Question 1 has a correct answer \("They helped them move without using much energy\."\) whose words were not taught: "energy"/.test(questions), questions);
// Positive: once the teach slot says "use less energy to move", the same answer is traceable.
var fixedTeach = copy(activities);
fixedTeach[2].beats[1].pupil.text = "These straight back legs let them use less energy to move than reptiles with sprawling legs.";
assert.ok(!/Question 1 has a correct answer/.test(texts(Brain.questionIssues(fixedTeach, ctx, units))));
// Partly true per the sources (synthetic evidence passage; the rule reads any evidence passage).
var teethCtx = ctxFor(true);
teethCtx.researchEvidence.passages.push({ id: "S9-P01", url: "https://www.nhm.ac.uk/discover/test-teeth.html", tier: "evidence", text: "Many plant-eating dinosaurs had rows of sharp teeth that helped them eat tough plants." });
var teeth = texts(Brain.questionIssues(activities, teethCtx, units));
assert.ok(/Question 2 has a wrong choice \("Sharp teeth\."\) that the sources support as at least partly true \(S9-P01/.test(teeth), teeth);
// Negative control: the same wrong choice with no supporting evidence passage is not flagged.
assert.ok(!/"Sharp teeth\."/.test(questions), questions);
// A comparison word that the source does not state is not "supported" (no false positive).
assert.ok(!/"They allowed for faster movement\."/.test(questions), questions);

// ---- 5. objective: measurable and naming every unit ----
var objective = "Pupils will understand how dinosaurs adapted to their environments.";
assert.deepStrictEqual(Brain.objectiveIssues(objective, units), ["not measurable", "does not name straight back legs", "does not name flexible lower-jaw joint", "does not name two holes behind the eye socket"]);
var rebuilt = Brain.unitObjectives(units);
assert.strictEqual(rebuilt[0], "Pupils can explain what each of these features did, using the reason the source gives: straight back legs; flexible lower-jaw joint; two holes behind the eye socket.");
assert.deepStrictEqual(Brain.objectiveIssues(rebuilt[0], units), []);

// ---- 6. timing: research lessons total exactly the requested minutes ----
var minutes = copy(activities).map(function (a) { return a; });
assert.deepStrictEqual(minutes.map(function (a) { return a.minutes; }), [2, 2, 3, 3, 3, 2, 2]);
var normal = Brain.normaliseMinutes(minutes, 15);
assert.strictEqual(normal.reduce(function (s, a) { return s + a.minutes; }, 0), 15);
assert.deepStrictEqual(normal.map(function (a) { return a.minutes; }), [2, 2, 3, 3, 3, 1, 1]);
var short = copy(activities); short.forEach(function (a) { a.minutes = 1; });
assert.strictEqual(Brain.normaliseMinutes(short, 15).reduce(function (s, a) { return s + a.minutes; }, 0), 15);
var exact = copy(normal);
assert.deepStrictEqual(Brain.normaliseMinutes(exact, 15).map(function (a) { return a.minutes; }), [2, 2, 3, 3, 3, 1, 1]);

// ---- default path: no research, no rule ----
assert.deepStrictEqual(Brain.researchRuleIssues(activities, ctxFor(false)), []);
assert.strictEqual(Brain.researchMode(ctxFor(false)), false);
assert.deepStrictEqual(Brain.researchUnits(ctxFor(false)), []);

// ---- accept(): run 9 content fails the research rules, so the slot repair gets the exact reasons ----
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
var judged = { applySemantic: { relationship: "apply", reason: "test" }, checkSemantics: [0, 1, 2].map(function () { return { coverage: "sufficient", reason: "test", demonstratedEvidence: "test" }; }) };
var failed = Brain.accept(copy(raw), Object.assign(ctxFor(true), judged));
assert.strictEqual(failed.ok, false);
["teach", "recap", "check", "apply"].forEach(function (id) { assert.ok(failed.slotIds.indexOf(id) !== -1, id + " " + failed.slotIds.join(",")); });
assert.ok(failed.slotIssues.apply.some(function (i) { return /needs a choose task/.test(i); }));
// The same content without research is accepted exactly as before (17 minutes, plan objective).
var plain = Brain.accept(copy(raw), Object.assign(ctxFor(false), judged));
assert.strictEqual(plain.ok, true, (plain.issues || []).join(" | "));
assert.strictEqual(plain.adventure.estimateMinutes, 17);
assert.deepStrictEqual(plain.adventure.objectives, response.objectives);
assert.strictEqual(plain.adventure.objectiveRule, undefined);

// ---- accept(): the flagged sentences corrected (test strings) pass, with a choose APPLY ----
var fixed = copy(raw);
var a = {};
fixed.activities.forEach(function (act) { a[act.slotId] = act; });
a.teach.beats[0].pupil.text = "Dinosaurs had straight back legs under their bodies.";
a.teach.beats[1].pupil.text = "These straight back legs let them use less energy to move than reptiles with sprawling legs.";
a.teach.beats[2].pupil.text = "Some dinosaurs had a flexible lower-jaw joint.";
a.recap.beats[0].pupil.text = "Straight back legs let dinosaurs use less energy to move.";
a.recap.beats[2].pupil.text = "Holes behind the eye socket let jaw muscles open wide and clamp down with more force.";
a.check.config.questions[0].choices = ["They let them move using less energy.", "They made their tails longer.", "They made their eyes bigger."];
a.check.config.questions[0].correct = "They let them move using less energy.";
a.check.config.questions[1].explain = "This joint helped them grind plant food.";
a.check.config.questions[2].prompt = "What did the two holes behind the eye socket let jaw muscles do?";
a.check.config.questions[2].choices = ["Help them see in the dark.", "Attach so the jaws could clamp down with more force.", "Help them smell food."];
a.check.config.questions[2].correct = "Attach so the jaws could clamp down with more force.";
a.apply.beats[0].pupil.text = "Use what you know about straight back legs to choose.";
a.apply.applyInstruction = "Which animal would use less energy to walk? Choose one.";
a.apply.choices = [
  { text: "The animal with legs straight under its body", correct: true, feedback: "Yes. Straight legs under the body let an animal use less energy to move." },
  { text: "The animal with legs sprawled out to the side", correct: false, feedback: "Not this one. Sprawling legs make an animal use more energy to move." }
];
a.apply.newCase = { text: "Imagine two new reptiles: one has legs straight under its body and one has legs sprawled out to the side.", kind: "transfer", sourceRef: [], quote: "" };
a.resolution.beats[0].pupil.text = "Now we know what these dinosaur features let them do!";
// Patch 7: research accept needs the question audit; a clean audit (test values) for the fixed questions.
function cleanAudit(questions) {
  return { ok: true, questions: questions.map(function (q) {
    return { prompt: q.prompt, teleological: "no", circular: "no", distractors: q.choices.filter(function (c) { return c !== q.correct; }).map(function (c) { return { choice: c, trueInGeneral: "no", reason: "test" }; }) };
  }) };
}
judged.questionAudit = cleanAudit(a.check.config.questions);
var passed = Brain.accept(copy(fixed), Object.assign(ctxFor(true), judged));
assert.strictEqual(passed.ok, true, (passed.issues || []).join(" | "));
var adv = passed.adventure;
assert.strictEqual(adv.estimateMinutes, 15, "research timing normalised to the requested 15 minutes");
assert.strictEqual(adv.objectives[0], rebuilt[0]);
assert.deepStrictEqual(adv.objectiveRule.replaced, response.objectives);
var applyAct = adv.activities.filter(function (x) { return x.slotId === "apply"; })[0];
var step = applyAct.scene.interaction;
assert.strictEqual(step.type, "choose");
assert.strictEqual(step.target, "choices");
assert.strictEqual(step.unitId, "u1", "unit id comes from the apply beat's knowledge ref (k2 -> u1)");
assert.strictEqual(step.choices.length, 2);
assert.strictEqual(step.choices.filter(function (c) { return c.correct; }).length, 1);
assert.ok(/less energy to move/.test(step.choices[0].feedback));
assert.strictEqual(step.newCase.kind, "transfer");
// Patch 7: the choose step keeps "correct-choice" (no longer overwritten with a clipped sentence) and carries the unit's claim ids.
assert.strictEqual(step.successCondition, "correct-choice");
assert.ok(step.successText && step.successText.split(" ").length >= 5);
assert.strictEqual(step.claimIds.length, 2);
// Lineage runs on the accepted lesson and now covers APPLY.
var lineage = Brain.unitLineage(copy(adv), ctxFor(true));
assert.strictEqual(lineage.apply.ok, true, JSON.stringify(lineage.apply));
assert.deepStrictEqual(lineage.apply.unitIds, ["u1"]);
var broken = copy(adv);
broken.activities.forEach(function (x) { if (x.slotId === "apply") x.scene.interaction.unitId = "u3"; });
var brokenLineage = Brain.unitLineage(broken, ctxFor(true));
assert.strictEqual(brokenLineage.apply.ok, false);
assert.ok(brokenLineage.issues.some(function (i) { return /^LINEAGE: apply: the choose task's unit u3 is not the unit its beat cites \(u1\)/.test(i); }), brokenLineage.issues.join(" | "));
// Default lineage has no apply block.
assert.strictEqual(Brain.unitLineage(copy(plain.adventure), ctxFor(false)).apply, undefined);
// The choices survive a slot merge (repair of another slot keeps the apply task).
var merged = Brain.mergeSlotContent({ activities: adv.activities }, { slots: { check: { questions: [] } } });
assert.strictEqual(merged.slots.apply.applyChoices.length, 2);
assert.strictEqual(merged.slots.apply.newCase.kind, "transfer");

// ---- APPLY choice validation: negative cases ----
function applyWith(change) {
  var x = copy(applyAct);
  change(x.scene.interaction, x);
  return texts(Brain.applyChoiceIssues(x, Object.assign(ctxFor(true), { __activities: adv.activities }), units));
}
assert.strictEqual(applyWith(function () {}), "");
assert.ok(/exactly one correct choice/.test(applyWith(function (i) { i.choices[1].correct = true; })));
assert.ok(/feedback of at least six words/.test(applyWith(function (i) { i.choices[1].feedback = "Wrong."; })));
assert.ok(/must be framed as made up/.test(applyWith(function (i) { i.newCase.text = "Two new reptiles have different legs, one straight and one sprawled."; })));
assert.ok(/quote is not found in an evidence passage/.test(applyWith(function (i) { i.newCase.kind = "sourced"; i.newCase.sourceRef = ["S7-P01"]; i.newCase.quote = "Dinosaurs ran faster than all lizards."; })));
assert.ok(/quote is not found in an evidence passage/.test(applyWith(function (i) { i.newCase.kind = "sourced"; i.newCase.sourceRef = ["S1-P15"]; i.newCase.quote = "the joint connecting the lower jaw is more flexible"; })), "a Wikipedia passage cannot ground a sourced example");
assert.strictEqual(applyWith(function (i) { i.newCase.kind = "sourced"; i.newCase.sourceRef = ["S7-P01"]; i.newCase.quote = "This allowed them to use less energy to move than other reptiles"; }), "");
assert.ok(/correct-choice feedback must use the taught explanation/.test(applyWith(function (i) { i.choices[0].feedback = "Yes, that is the right one to pick here."; })));
assert.ok(/needs a choose task/.test(applyWith(function (i) { i.type = "tap-to-reveal"; })));
assert.ok(/instruction must ask the class to choose/.test(applyWith(function (i, x) { x.applyInstruction = "Explain how straight back legs helped dinosaurs."; i.instruction = x.applyInstruction; })));

// ---- content brief: research adds the source wording and the apply schema; default unchanged ----
var rb = Brain.contentBrief(ctxFor(true), response.lessonPlan, response.storyPlan);
var payload = JSON.parse(rb.user);
assert.strictEqual(payload.sourceWording[0].keepThisResult, "use less energy to move");
assert.ok(payload.evidencePassages.every(function (p) { return !/wikipedia/.test(p.url); }));
assert.ok(rb.schema.properties.slots.properties.apply.required.indexOf("choices") !== -1);
assert.ok(/Do not swap it for a vaguer word/.test(rb.system));
var db = Brain.contentBrief(ctxFor(false), response.lessonPlan, response.storyPlan);
assert.strictEqual(JSON.parse(db.user).sourceWording, undefined);
assert.strictEqual(db.schema.properties.slots.properties.apply.properties.choices, undefined);
assert.strictEqual(/Research lesson rules/.test(db.system), false);

console.log("research teaching rules tests passed");
