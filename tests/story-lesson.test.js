"use strict";
// Story-led research lessons (js/story-lesson.js): the one hard block (factual support), the
// fallback that lets a lesson finish, explicit story scenes in the player, the scale rule for
// pictures and numbers, and an offline end-to-end run on the stub transport.

var assert = require("assert");
var S = require("../js/story-lesson.js");
var Core = require("../schools/learn/creator-core.js");
var Stub = require("../scripts/source-grounded/story-stub.js");
var Player = require("../scripts/source-grounded/player.js");

var knowledge = { ideas: [{ id: "i1", title: "Teeth", question: "What do teeth tell us?", claims: [] }], claims: { i1c1: { id: "i1c1", ideaId: "i1", text: "A T. rex tooth could be 30 cm long.", sourceQuote: "a T. rex tooth could be 30 cm long", passageText: "Scientists found that a T. rex tooth could be 30 cm long including the root." } }, held: [] };
var story = { title: "T", characters: [{ name: "Mia", role: "explorer", look: "yellow raincoat" }], scenes: [], quiz: [], resolution: [], recap: [] };
function item(id, text, claimIds, words) { return { id: id, kind: "explain", text: text, claimIds: claimIds, wordsNotInSource: words || [] }; }

// Hard block rules.
var rows = S.judgeSupport([
  item("a", "Mia gasped.", []),
  item("b", "Dinosaurs lived long ago.", []),
  item("c", "The tooth could be 30 cm long.", ["i1c1"]),
  item("d", "The tooth was 40 cm long.", ["i1c1"], ["40"]),
  item("e", "It says so here.", ["i9c9"]),
  item("f", "T. rex was green.", ["i1c1"], ["green"])
], { results: [
  { id: "a", factual: false, verdict: "story" },
  { id: "b", factual: true, verdict: "supported" },
  { id: "c", factual: true, verdict: "supported", wording: [] },
  { id: "d", factual: true, verdict: "supported", wording: [] },
  { id: "e", factual: true, verdict: "supported" },
  { id: "f", factual: true, verdict: "supported", addedFacts: ["green"] }
] }, knowledge, story);
var ok = {}; rows.forEach(function (r) { ok[r.id] = r.ok; });
assert.deepStrictEqual(ok, { a: true, b: false, c: true, d: false, e: false, f: false });
assert.ok(/UNCITED_FACT/.test(rows[1].problem));
assert.ok(/ADDED_DETAIL/.test(rows[3].problem));
assert.ok(/unknown/.test(rows[4].problem));

// Character comparisons are factual and need a sourced size (support brief rule).
var brief = S.supportBrief([item("c", "The tooth was longer than Mia's hand.", ["i1c1"])], knowledge, story, { topic: "Dinosaurs" });
assert.ok(/comparison with a story character's body/.test(brief.system));

// Scale pictures: the child beside the fossil; a number not in the cited claims is a warning.
var scaled = S.parseStory({ title: "T", characters: [{ name: "Mia", role: "explorer", look: "yellow raincoat" }], scenes: [
  { id: "s1", kind: "idea", ideaId: "i1", title: "The giant tooth", image: { description: "Mia in the museum", pastLife: [] }, teachingImage: { subject: "fossil T. rex tooth", feature: "its great length", view: "character", comparedWith: "Mia", claimIds: ["i1c1"] },
    beats: [{ role: "problem", speaker: "Mia", text: "How big was it?", claimIds: [] }, { role: "compare", speaker: "Narrator", text: "The tooth was 30 cm long, longer than Mia's hand, and 12 times sharper.", claimIds: ["i1c1"] }] }
], quiz: [], resolution: [], recap: [] }).story;
var plan = S.imagePlan(scaled);
var teach = plan.assets.filter(function (a) { return a.id === "teach-s1"; })[0];
assert.strictEqual(teach.scaleCharacter, "Mia");
assert.ok(/Mia beside or acting out fossil T. rex tooth/.test(teach.prompt) && /present-day child; anything from a past period is a fossil/.test(teach.prompt));
// No knowledge passed, so no sourced size: modest size, neutral framing, and a listed limitation.
assert.ok(/sources give no size, so do not exaggerate/.test(teach.prompt) && teach.sourcedSize === "");
assert.ok(plan.limitations.some(function (l) { return l.id === "teach-s1" && /neutral framing/.test(l.limitation); }));
// With a cited claim that gives a size, the picture follows that sourced size.
var sizedPlan = S.imagePlan(scaled, { yearGroup: "Year 3" }, { knowledge: { claims: { i1c1: { text: "The tooth is about 30 cm long." } } } });
var sizedTeach = sizedPlan.assets.filter(function (a) { return a.id === "teach-s1"; })[0];
assert.ok(/real size as the source gives it \(The tooth is about 30 cm long\.\)/.test(sizedTeach.prompt) && /age 7/.test(sizedTeach.prompt));
// One cast/style sheet first; every picture with characters is drawn from it, all in one locked style.
assert.strictEqual(plan.assets[0].id, "cast-sheet");
assert.ok(/Mia, explorer, wearing yellow raincoat/.test(plan.assets[0].prompt));
assert.ok(plan.assets.filter(function (a) { return a.id !== "cast-sheet"; }).every(function (a) { return a.prompt.indexOf(plan.style) === 0; }));
assert.ok(teach.reference && /character and style reference sheet/.test(teach.prompt));
assert.ok(/the fact shown with Mia/.test(teach.frameLabel));
var scene = plan.assets.filter(function (a) { return a.id === "scene-s1"; })[0];
assert.ok(/Nothing from a past period appears alive or in person/.test(scene.prompt));
// A story set in one past period (history) keeps every person and object in that period.
var roman = JSON.parse(JSON.stringify(scaled)); roman.era = "Roman Britain";
assert.ok(/Everything belongs to one past period, Roman Britain/.test(S.imagePlan(roman, { subject: "History", yearGroup: "Year 4" }).assets.filter(function (a) { return a.id === "scene-s1"; })[0].prompt));

// One year-band profile drives every rule: Y1, Y3 and Y6 differ in ideas, beats, choices and quiz.
var y1 = S.yearProfile("Year 1"), y3 = S.yearProfile("Y3"), y6 = S.yearProfile("Year 6");
assert.deepStrictEqual([y1.ideas, y3.ideas, y6.ideas], [[2, 3], [3, 4], [4, 4]]);
assert.deepStrictEqual([y1.quiz, y3.quiz, y6.quiz], [5, 6, 8]);
assert.strictEqual(y1.activityChoices, 2);
assert.ok(y1.sentenceWords < y3.sentenceWords && y3.sentenceWords < y6.sentenceWords);
assert.strictEqual(S.yearProfile("Reception").year, 1);
var k1 = { ideas: [{ id: "i1", title: "Plants", question: "What do plants need?", claims: [{ id: "i1c1", text: "Plants need water.", role: "explanation" }] }], claims: {} };
var b1 = S.storyBrief({ yearGroup: "Year 1", topic: "Plants", subject: "Science", lessonText: "Plants" }, k1).system;
var b6 = S.storyBrief({ yearGroup: "Year 6", topic: "Evolution", subject: "Science", lessonText: "Evolution" }, k1).system;
assert.ok(/QUIZ\. 5 questions/.test(b1) && /QUIZ\. 8 questions/.test(b6));
assert.ok(/2 choices with exactly one correct/.test(b1) && /3 choices with exactly one correct/.test(b6));
assert.ok(!/role compare\)/.test(b1) && /role compare\)/.test(b6));
// Generic support rules: questions and correct arithmetic with invented numbers are story.
assert.ok(/A question that only asks/.test(brief.system) || /A question that only asks/.test(S.supportBrief([], knowledge, story, { topic: "x" }).system));
assert.ok(/Correct arithmetic or reasoning with invented numbers/.test(S.supportBrief([], knowledge, story, { topic: "x" }).system));
var warn = S.codeWarnings(scaled, knowledge, { requestedMinutes: 30, yearGroup: "Year 3" }).filter(function (w) { return w.check === "scale"; });
assert.ok(warn.some(function (w) { return /12/.test(w.text); }), "a number not in the cited claims is reported");
assert.ok(!warn.some(function (w) { return /no teaching picture shows a character/.test(w.text); }));

// Fallback: a failing cited beat becomes its claim text; a failing quiz answer removes the question.
var fb = JSON.parse(JSON.stringify(scaled));
fb.quiz = [{ prompt: "How long?", choices: ["30 cm", "1 cm", "5 m"], correct: "30 cm", explain: "x", ideaId: "i1", claimIds: ["i1c1"] }];
var log = S.fallback(fb, [{ id: "s1.b1", claimIds: ["i1c1"] }, { id: "quiz.q0.answer", claimIds: ["i1c1"] }], knowledge);
assert.strictEqual(fb.scenes[0].beats[1].text, knowledge.claims.i1c1.text);
assert.strictEqual(fb.quiz.length, 0);
assert.ok(log.length >= 2);

// Offline end to end on the stub transport, then the player's own journey code.
var ports = Stub.ports({ topic: "Dinosaurs" });
S.generateStoryLesson({ lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 30 }, Object.assign(ports, { log: function () {} })).then(function (result) {
  assert.ok(result.ok, "stub lesson completes: " + result.stage);
  assert.strictEqual(result.support.failing.length, 0);
  var adventure = S.buildAdventure(result.story, result.knowledge, { topic: "Dinosaurs", yearGroup: "Year 3", requestedMinutes: 30 }, { assets: [] });
  assert.deepStrictEqual(adventure.activities.map(function (a) { return a.slotId; }), S.STAGES);
  adventure.storyScenes.forEach(function (sc) { if (sc.purpose === "explore") assert.ok(sc.beatIds.length <= 4, sc.id + " fits the text panel"); });
  var journey = Player.journeyFor(adventure, { id: "t" });
  var slides = journey.plan.slides;
  assert.strictEqual(slides.length, adventure.storyScenes.length);
  var chooses = [];
  slides.forEach(function (s) { (s.interactions || []).forEach(function (x) { if (x.type === "choose") chooses.push(x); }); });
  assert.strictEqual(chooses.length, 2, "two choose activities");
  chooses.forEach(function (c) { assert.strictEqual(c.choices.filter(function (x) { return x.correct; }).length, 1); assert.ok(c.choices.every(function (x) { return x.feedback; })); });
  var q = slides.filter(function (s) { return s.type === "question"; })[0];
  assert.strictEqual(q.questions.length, 6);
  // Explicit scene order: each story slide holds exactly the beats its scene names, in order.
  adventure.storyScenes.forEach(function (sc, i) { if (sc.purpose === "explore") assert.deepStrictEqual(slides[i].beats.map(function (b) { return b.id; }), sc.beatIds); });
  // A draft without storyScenes still takes the default scene planner.
  var round = Core.fromAdventure(journey);
  assert.ok(round.storyScenes && round.storyScenes.length === adventure.storyScenes.length, "storyScenes survive a round trip");
  console.log("story-lesson tests passed");
}).catch(function (e) { console.error(e); process.exit(1); });
