"use strict";

// Patch 6 keeps the default (non-research) path byte-identical. These hashes were taken with the
// PR #25 head brain (140f564 / tree 6b056f3b) on run 9's real lesson with research removed:
// accept(), the content brief, ID lineage and the slot repair brief must not change.

var assert = require("assert");
var crypto = require("crypto");
var B = require("../js/lesson-brain.js");
var a = require("./fixtures/source-grounded/run9-generate-adventure.json");
var f = require("./fixtures/source-grounded/run9-lesson-lineage.json");
function c(v) { return JSON.parse(JSON.stringify(v)); }
function ctx() { return c({ yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs", lessonBrief: { teacherIntent: f.intent }, lessonSkeleton: a.lessonSkeleton, lessonPlan: a.lessonPlan, storyPlan: a.storyPlan, knowledgePack: f.pack, knowledgeSelection: f.selection }); }
function h(x) { return crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex"); }
var raw = { title: a.title, objectives: a.objectives, activities: a.activities };
var x = ctx();
assert.strictEqual(h(B.accept(c(raw), ctx())), "200beb174e4981a0348c7fc30907ecf98e1bbf402f12ebbd59dd6e0fc40c8192", "default accept() changed");
assert.strictEqual(h(B.contentBrief(x, x.lessonPlan, x.storyPlan)), "0f7cada0a9cb605a31d8807aa4c0614fa8e5f54ea8b07f47b9d4e3a88f0a959a", "default content brief changed");
assert.strictEqual(h(B.unitLineage(c(a), ctx())), "0b94086acfb8988e351da7d83c0c6ddcf29d07e6f6a80d601f836ec76b235bf1", "default lineage changed");
assert.strictEqual(h(B.slotRepairBrief(ctx(), ["apply", "check", "teach"], ["The apply slot has no success condition."], c(raw))), "0823682b92f561fe8b4e8f65cd350860e7a506f37e439b903cf258dc2b1aad30", "default slot repair brief changed");
console.log("research default-unchanged tests passed");
