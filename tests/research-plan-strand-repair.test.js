"use strict";

// Patch 9, research mode only: the plan repair says exactly which links merge strands. Live run 19
// linked both Spinosaurus features to background points ("well adapted for aquatic life", the
// Sahara habitat), so 3 ready pairs made 2 strands; the generic repair line got the same map back.
var assert = require("assert");
var path = require("path");
var Brain = require("../js/lesson-brain.js");
var Replay = require("../scripts/source-grounded/pack-replay.js");
var saved = require("./fixtures/source-grounded/run19-plan.json").raw;
function copy(v) { return JSON.parse(JSON.stringify(v)); }
var request = { lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 };
var rp = Replay.loadPackReplay(path.join(__dirname, "fixtures/pack-replay/run15"));
var ctx = Replay.contextFor(Brain, rp, request);
var pack = Brain.normaliseKnowledgePack(copy(rp.rawPacks[1]), ctx);
Brain.applySourceEntailment(pack, Brain.parseSourceEntailment(rp.entailments[1]));
ctx.knowledgePack = pack;
ctx.knowledgeSelection = Brain.selectPackForLesson(pack, ctx);

var first = Brain.normalisePlan(copy(saved), Object.assign({}, ctx, { depthRequired: true }));
assert.strictEqual(first.ok, false);
assert.ok(first.issues.some(function (i) { return /developed strands/.test(i); }), "the rule still fails the saved map");
var line = Brain.strandRepairLine(saved);
assert.ok(/p3, p5 are features linked to background p2 \("Spinosaurus was well adapted for aquatic life\."\), p1/.test(line), line);
assert.ok(/Leave out p2, p1/.test(line) && /Return a changed learningMap/.test(line));
var brief = Brain.planRepairBrief(ctx, first.issues, first.previous || saved);
assert.ok(/Leave out p2, p1/.test(JSON.parse(brief.user).instruction), "research repair carries the line");
var plainCtx = Object.assign({}, ctx); delete plainCtx.researchEvidence;
assert.ok(!/Leave out p2/.test(JSON.parse(Brain.planRepairBrief(plainCtx, first.issues, saved).user).instruction), "default repair unchanged");
// A map that follows the line passes the unchanged rule; an unchanged map fails it again.
var followed = copy(saved);
followed.learningMap = followed.learningMap.filter(function (p) { return p.id !== "p1" && p.id !== "p2"; }).map(function (p) { if (p.id === "p3" || p.id === "p5") { p.explains = ""; p.dependsOn = ""; } return p; });
var after = Brain.normalisePlan(followed, Object.assign({}, ctx, { depthRequired: true, breadthSettled: true, priorPlan: saved }));
assert.strictEqual(after.ok, true, (after.issues || []).join(" | "));
assert.strictEqual(Brain.normalisePlan(copy(saved), Object.assign({}, ctx, { depthRequired: true, breadthSettled: true, priorPlan: saved })).ok, false);
// No hung feature: only the changed-map line.
assert.strictEqual(Brain.strandRepairLine(followed), " Return a changed learningMap; the same map fails again.");
console.log("research plan strand repair tests passed");
