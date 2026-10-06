// Intent framing (hypothesis under test). Checks only the prompt and its
// deterministic plumbing, not model output.
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Brain = require("../js/lesson-brain.js");

function ctxFor(text, yearGroup, subject) {
  return { lessonText: text, teacherInstructions: text, yearGroup: yearGroup || "", subject: subject || "", requestedMinutes: 15, topic: "", lessonBrief: { concepts: [], topic: "", rawRequest: text } };
}
var OPEN = "propose one concrete, age-appropriate explanatory learningGoal within the teacher's topic";
var KEEP = "Keep that objective as stated in learningGoal";

// 1. Open Year 3 request: explanatory-objective instruction, no preserve instruction.
var dino = Brain.teacherIntentBrief(ctxFor("Teach children about dinosaurs.", "Year 3", "Science"));
assert.strictEqual(Brain.intentFraming(ctxFor("Teach children about dinosaurs.", "Year 3", "Science")).mode, "explanatory-objective");
assert.ok(dino.system.indexOf(OPEN) !== -1, "open Y3 request gets the explanatory instruction");
assert.ok(dino.system.indexOf(KEEP) === -1);
assert.ok(dino.system.indexOf("Stay within the topic the teacher gave") !== -1);
assert.ok(dino.system.indexOf("not a list of types, names, or facts") !== -1);
// The framing sentence sits before the JSON shape, and the existing rules are still there.
assert.ok(dino.system.indexOf(OPEN) < dino.system.indexOf("JSON shape:"));
assert.ok(dino.system.indexOf("Do not invent a different topic") !== -1);
assert.ok(dino.system.indexOf("unless the teacher asked for that count") !== -1);
// The user message is unchanged by framing.
assert.strictEqual(dino.user, JSON.stringify({ request: "Teach children about dinosaurs.", statedYear: "Year 3", statedSubject: "Science", statedMinutes: 15 }));
// Year taken from the request text when the context has none.
assert.strictEqual(Brain.intentFraming(ctxFor("Year 5 history. The Romans.", "", "")).mode, "explanatory-objective");

// 2. Explicit objectives in Years 3 to 6 are preserved; no forced how/why.
["Year 3: name and label the parts of a plant", "Year 4: classify animals into vertebrates and invertebrates"].forEach(function (request) {
  var year = request.match(/Year \d/)[0];
  var brief = Brain.teacherIntentBrief(ctxFor(request, year, "Science"));
  assert.strictEqual(Brain.intentFraming(ctxFor(request, year, "Science")).mode, "preserve-explicit", request);
  assert.ok(brief.system.indexOf(KEEP) !== -1, request);
  assert.ok(brief.system.indexOf("Do not rewrite it as a how or why objective") !== -1, request);
  assert.ok(brief.system.indexOf(OPEN) === -1, request);
  assert.ok(brief.system.indexOf("explanatory learningGoal") === -1, request);
});
// Other stated objectives (recall, knowledge, a skill) are also preserved.
["Year 6: know the order of the planets", "Year 5: learn the names of the bones in the arm", "Year 4: use a ruler to measure in centimetres", "Year 3: understand the water cycle"].forEach(function (request) {
  var year = request.match(/Year \d/)[0];
  assert.strictEqual(Brain.intentFraming(ctxFor(request, year, "")).mode, "preserve-explicit", request);
});
// Open topic requests in Years 3 to 6 (no stated objective).
["Year 4 history. The Romans in Britain.", "Teach the class about volcanoes."].forEach(function (request) {
  assert.strictEqual(Brain.intentFraming(ctxFor(request, "Year 4", "")).mode, "explanatory-objective", request);
});
// A stated how/why objective is also kept as stated.
assert.strictEqual(Brain.intentFraming(ctxFor("Year 6 geography. How do landslides happen?", "Year 6", "Geography")).mode, "preserve-explicit");

// 3. Years 1 and 2 (and unknown year) are unchanged: byte-identical to the frozen prompt.
var frozenPath = path.join(__dirname, "fixtures", "intent-brief-0d53e3d.json");
var frozen = JSON.parse(fs.readFileSync(frozenPath, "utf8"));
frozen.cases.forEach(function (c) {
  var ctx = ctxFor(c.request, c.yearGroup, c.subject);
  var brief = Brain.teacherIntentBrief(ctx);
  assert.strictEqual(Brain.intentFraming(ctx).mode, "unchanged", c.request);
  assert.strictEqual(brief.system, frozen.system, "system prompt unchanged for: " + c.request);
  assert.strictEqual(brief.user, c.user, "user message unchanged for: " + c.request);
  assert.ok(brief.system.indexOf(OPEN) === -1 && brief.system.indexOf(KEEP) === -1);
});

// 4. Plumbing: normalisation and application of an intent are unchanged.
var applied = Brain.applyTeacherIntent(ctxFor("Teach children about dinosaurs.", "Year 3", "Science"), Brain.normaliseTeacherIntent({
  yearGroup: "Year 3", subject: "Science", subjectConfidence: "explicit",
  learningGoal: "Explain how fossils help scientists work out what dinosaurs were like.",
  requiredEvidence: "Pupil explains how a fossil shows something about a dinosaur's body or life.",
  focusConcepts: ["fossils", "evidence"], priorKnowledge: [], exclusions: [], preferences: [], durationMinutes: null
}, ctxFor("Teach children about dinosaurs.", "Year 3", "Science")));
assert.strictEqual(applied.lessonBrief.learningGoal, "Explain how fossils help scientists work out what dinosaurs were like.");
assert.strictEqual(applied.lessonBrief.teacherIntent.ok, true);

console.log("intent-framing: all checks passed");
