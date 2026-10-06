"use strict";

// APPLY choose interaction in the real player (patch 6). A choose step is a meaningful choice
// on a new example: each choice has its own feedback, a wrong choice keeps Next hidden, and the
// correct choice solves the step (the choice turns green, its feedback shows, Next appears).
// It is no longer converted into a silent tap-to-reveal. Class screen only: pupil devices
// (join.js) show quiz questions and "Look at the class screen" for story stages.

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Creator = require("../schools/learn/creator-core.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Shell = require("../schools/learn/lesson-shell.js");

var step = {
  type: "choose", target: "choices", instruction: "Which animal would use less energy to walk? Choose one.", successCondition: "correct-choice", unitId: "u1",
  newCase: { text: "Imagine two new reptiles: one has legs straight under its body and one has legs sprawled out to the side.", kind: "transfer", sourceRef: [], quote: "" },
  choices: [
    { text: "The animal with legs sprawled out to the side", correct: false, feedback: "Sprawling legs make an animal use more energy to move." },
    { text: "The animal with legs straight under its body", correct: true, feedback: "Straight legs under the body let an animal use less energy to move." }
  ]
};
var slide = { type: "story", kicker: "Try it", beats: [{ id: "apply:0", pupil: { text: "Use what you know about straight back legs to choose." } }], interaction: step };

// Before a choice: the case, the instruction and both choices; Next is held.
var play = { index: 3, step: 0, beat: 0, revealed: false };
var html = Mechanics.render(slide, { immersed: true, interact: play }).html;
assert.ok(html.indexOf("data-interaction=\"choose\"") !== -1);
assert.strictEqual((html.match(/data-world="choose"/g) || []).length, 2);
assert.ok(html.indexOf("Imagine two new reptiles") !== -1);
assert.ok(html.indexOf("Which animal would use less energy to walk?") !== -1);
assert.strictEqual(Shell.waitingOn(step, play), true, "Next is hidden until the class chooses correctly");
assert.strictEqual(Mechanics.layerHtml(slide, play), "", "no tap-to-reveal layer for a choose step");
// The same works without a world image (not immersed).
assert.strictEqual((Mechanics.render(slide, { immersed: false, interact: play }).html.match(/data-world="choose"/g) || []).length, 2);

// Wrong choice: its own feedback, marked to try again, still waiting.
play = Shell.choosePlay(play, [step], 0, false);
html = Mechanics.render(slide, { immersed: true, interact: play }).html;
assert.ok(/data-choose-feedback="again"[^>]*>Not quite\. Sprawling legs make an animal use more energy to move\./.test(html), html);
assert.ok(/lesson-choice is-again" data-world="choose" data-pick="0" disabled/.test(html));
assert.strictEqual(html.indexOf("data-choose-success"), -1);
assert.strictEqual(Shell.waitingOn(step, play), true);

// Correct choice: different feedback, success marker, Next appears; the beat is kept.
play = Shell.choosePlay(play, [step], 1, true);
assert.strictEqual(play.beat, 0);
html = Mechanics.render(slide, { immersed: true, interact: play }).html;
assert.ok(/data-choose-feedback="right"[^>]*>Yes\. Straight legs under the body let an animal use less energy to move\./.test(html));
assert.ok(/lesson-choice is-right" data-world="choose" data-pick="1" disabled/.test(html));
assert.ok(html.indexOf("data-choose-success=\"1\"") !== -1);
assert.strictEqual(Shell.waitingOn(step, play), false);

// A choose step without choices does not block (old lessons keep working).
assert.strictEqual(Shell.waitingOn({ type: "choose", instruction: "Pick one" }, { revealed: false }), false);
assert.strictEqual(Mechanics.chooseStep({ type: "story", interaction: { type: "choose", instruction: "Pick one" } }, {}), null);

// Through the creator: the accepted research lesson keeps its choose step on the played slides.
var adventure = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/source-grounded/run9-generate-adventure.json"), "utf8"));
adventure.activities.forEach(function (a) { if (a.slotId === "apply") a.scene.interaction = JSON.parse(JSON.stringify(step)); });
var slides = Creator.slidesFor({ activities: adventure.activities, lessonPlan: adventure.lessonPlan, storyPlan: adventure.storyPlan, year: "Year 3", targetMinutes: 15 });
var withChoose = slides.filter(function (s) { return (Mechanics.interactionsOf(s) || []).some(function (i) { return i.type === "choose"; }); });
assert.strictEqual(withChoose.length, 1, "exactly one played slide carries the choose step");
var played = Mechanics.interactionsOf(withChoose[0]).filter(function (i) { return i.type === "choose"; })[0];
assert.strictEqual(played.choices.length, 2);
assert.strictEqual(played.newCase.kind, "transfer");
// Not converted to tap-to-reveal anywhere.
assert.ok(!slides.some(function (s) { return (Mechanics.interactionsOf(s) || []).some(function (i) { return i.sourceType === "choose"; }); }));

console.log("apply choose player tests passed");
