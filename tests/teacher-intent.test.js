var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

function ctxFor(text, extra) {
  var ctx = {
    lessonText: text,
    teacherInstructions: text,
    yearGroup: (extra && extra.yearGroup) || "",
    subject: (extra && extra.subject) || "",
    requestedMinutes: (extra && extra.requestedMinutes) || 15,
    topic: (extra && extra.topic) || "",
    lessonBrief: { concepts: ["help", "understand"], topic: (extra && extra.topic) || "", rawRequest: text }
  };
  return ctx;
}

var shapes = "Year 1 maths. Help them identify squares, circles and triangles.";
var shapesIntent = Brain.normaliseTeacherIntent({
  yearGroup: "Year 1",
  subject: "Maths",
  subjectConfidence: "explicit",
  learningGoal: "Identify squares, circles and triangles.",
  focusConcepts: ["squares", "circles", "triangles", "help"],
  priorKnowledge: [],
  exclusions: [],
  preferences: [],
  durationMinutes: null
}, ctxFor(shapes, { yearGroup: "Year 1", subject: "Maths" }));
assert.strictEqual(shapesIntent.ok, true);
assert.ok(/square|circle|triangle/i.test(shapesIntent.learningGoal));
assert.ok(shapesIntent.focusConcepts.indexOf("help") === -1);
assert.ok(shapesIntent.focusConcepts.some(function (item) { return /square|circle|triangle/i.test(item); }));

var plants = "pls year 1 why do plants need water keep it playful";
var plantsIntent = Brain.normaliseTeacherIntent({
  yearGroup: "Year 1",
  subject: "Science",
  subjectConfidence: "explicit",
  learningGoal: "Explain why plants need water.",
  focusConcepts: ["pls", "why plants need water", "playful"],
  priorKnowledge: [],
  exclusions: [],
  preferences: ["playful"],
  durationMinutes: null
}, ctxFor(plants, { yearGroup: "Year 1", subject: "Science" }));
assert.strictEqual(plantsIntent.ok, true);
assert.ok(/plant/i.test(plantsIntent.learningGoal) && /water/i.test(plantsIntent.learningGoal));
assert.ok(plantsIntent.focusConcepts.join(" ").toLowerCase().indexOf("pls") === -1);
assert.ok(plantsIntent.focusConcepts.join(" ").toLowerCase().indexOf("playful") === -1);
assert.ok(plantsIntent.preferences.indexOf("playful") !== -1);

var sources = "20 mins. Year 6 history. Teach why two people can read the same source and disagree.";
var sourcesIntent = Brain.normaliseTeacherIntent({
  yearGroup: "Year 6",
  subject: "History",
  subjectConfidence: "explicit",
  learningGoal: "Explain why two people can read the same source and disagree.",
  focusConcepts: ["mins", "why people can disagree about one source"],
  priorKnowledge: [],
  exclusions: [],
  preferences: [],
  durationMinutes: 20
}, ctxFor(sources, { yearGroup: "Year 6", subject: "History", requestedMinutes: 20 }));
assert.strictEqual(sourcesIntent.ok, true);
assert.strictEqual(sourcesIntent.durationMinutes, 20);
assert.ok(sourcesIntent.focusConcepts.join(" ").toLowerCase().indexOf("mins") === -1);
assert.ok(/source|disagree/i.test(sourcesIntent.learningGoal));
var sourcesCtx = ctxFor(sources, { yearGroup: "Year 6", subject: "History", requestedMinutes: 20 });
Brain.applyTeacherIntent(sourcesCtx, sourcesIntent);
assert.strictEqual(sourcesCtx.requestedMinutes, 20);

var states = "Year 4 science. They already know solids, liquids and gases. Do not reteach the three states. Teach how heating and cooling can change a material from one state to another.";
var statesIntent = Brain.normaliseTeacherIntent({
  yearGroup: "Year 4",
  subject: "Science",
  subjectConfidence: "explicit",
  learningGoal: "Understand how heating and cooling can change a material from one state to another.",
  focusConcepts: ["solids, liquids and gases", "heating and cooling", "change of state"],
  priorKnowledge: ["solids, liquids and gases"],
  exclusions: ["reteaching definitions of the three states"],
  preferences: [],
  durationMinutes: null
}, ctxFor(states, { yearGroup: "Year 4", subject: "Science" }));
assert.strictEqual(statesIntent.ok, true);
assert.ok(/heat|cool|state/i.test(statesIntent.learningGoal));
assert.ok(statesIntent.focusConcepts.indexOf("solids, liquids and gases") === -1);
assert.ok(statesIntent.focusConcepts.some(function (item) { return /heat|cool|state/i.test(item); }));
assert.ok(statesIntent.priorKnowledge.some(function (item) { return /solid/i.test(item); }));
assert.ok(statesIntent.exclusions.length > 0);

var addition = "Year 2 maths. They can add within 20. Do not reteach counting on. The mix-up is that they think you must start with the bigger number. Teach that addition can be done in either order.";
var additionIntent = Brain.normaliseTeacherIntent({
  yearGroup: "Year 2",
  subject: "Maths",
  subjectConfidence: "explicit",
  learningGoal: "Addition can be done in either order.",
  focusConcepts: ["counting on", "addition can be done in either order"],
  priorKnowledge: ["adding within 20"],
  exclusions: ["counting on"],
  preferences: [],
  durationMinutes: null
}, ctxFor(addition, { yearGroup: "Year 2", subject: "Maths" }));
assert.strictEqual(additionIntent.ok, true);
assert.ok(/order/i.test(additionIntent.learningGoal));
assert.ok(additionIntent.focusConcepts.indexOf("counting on") === -1);
assert.ok(additionIntent.exclusions.some(function (item) { return /counting on/i.test(item); }));

var punctuation = Brain.normaliseTeacherIntent({
  yearGroup: "Year 4",
  subject: "English",
  subjectConfidence: "inferred",
  learningGoal: "Choose a full stop or a question mark to end a sentence.",
  focusConcepts: ["full stops", "question marks"],
  priorKnowledge: [],
  exclusions: [],
  preferences: [],
  durationMinutes: null
}, ctxFor("Year 4. Show how a full stop ends a statement and a question mark ends a question.", { yearGroup: "Year 4" }));
assert.strictEqual(punctuation.ok, true);
assert.strictEqual(punctuation.subject, "English");
assert.strictEqual(punctuation.subjectConfidence, "inferred");

var timeline = Brain.normaliseTeacherIntent({
  yearGroup: "Year 2",
  subject: "History",
  subjectConfidence: "inferred",
  learningGoal: "Put events from one life into the order they happened.",
  focusConcepts: ["order of events in a life"],
  priorKnowledge: [],
  exclusions: [],
  preferences: [],
  durationMinutes: null
}, ctxFor("Year 2. Put the events of one person's life into the order they happened.", { yearGroup: "Year 2" }));
assert.strictEqual(timeline.subject, "History");
assert.strictEqual(timeline.subjectConfidence, "inferred");

var weekend = Brain.normaliseTeacherIntent({
  yearGroup: "Year 3",
  subject: "",
  subjectConfidence: "uncertain",
  learningGoal: "Talk about what happened at the weekend.",
  focusConcepts: ["weekend events"],
  priorKnowledge: [],
  exclusions: [],
  preferences: ["fun"],
  durationMinutes: null
}, ctxFor("Year 3. Do something fun with the class today about their weekend.", { yearGroup: "Year 3" }));
assert.strictEqual(weekend.subject, "");
assert.strictEqual(weekend.subjectConfidence, "uncertain");

var stated = Brain.normaliseTeacherIntent({
  yearGroup: "Year 6",
  subject: "History",
  subjectConfidence: "inferred",
  learningGoal: "Explain why a castle was built on a hill.",
  focusConcepts: ["why a castle was built on a hill"],
  priorKnowledge: [],
  exclusions: [],
  preferences: [],
  durationMinutes: 12
}, ctxFor("Year 3 geography. Explain why a castle was built on a hill.", { yearGroup: "Year 3", subject: "Geography", requestedMinutes: 15 }));
assert.strictEqual(stated.yearGroup, "Year 3");
assert.strictEqual(stated.subject, "Geography");
assert.strictEqual(stated.subjectConfidence, "explicit");

assert.strictEqual(Brain.normaliseTeacherIntent(null, ctxFor(shapes)).ok, false);
assert.strictEqual(Brain.normaliseTeacherIntent({ learningGoal: "Too short" }, ctxFor(shapes)).ok, false);
var failed = ctxFor(shapes, { yearGroup: "Year 1", subject: "Maths" });
failed.lessonBrief.concepts = ["help", "understand"];
Brain.applyTeacherIntent(failed, { ok: false, reason: "malformed" });
assert.strictEqual(failed.lessonBrief.teacherIntent.ok, false);
assert.deepStrictEqual(failed.lessonBrief.concepts, []);
assert.strictEqual(failed.subject, "Maths");

var shapeCtx = ctxFor(shapes, { yearGroup: "Year 1", subject: "Maths", topic: "shapes" });
Brain.applyTeacherIntent(shapeCtx, shapesIntent);
shapeCtx.lessonPlan = { keyKnowledge: ["A square has four equal sides.", "A circle is round.", "A triangle has three corners."] };
var paraphrased = "a square has four equal sides. a circle is round. a triangle has three corners.";
assert.deepStrictEqual(Brain.conceptCoverageIssues(paraphrased, shapeCtx), []);
assert.ok(paraphrased.indexOf(shapes.toLowerCase()) === -1);
var helpOnly = Brain.conceptCoverageIssues("help the class understand", shapeCtx);
assert.ok(helpOnly.some(function (issue) { return issue.indexOf("requested idea") !== -1; }));
assert.ok(helpOnly.join(" ").indexOf("do not teach help") === -1);

var stateCtx = ctxFor(states, { yearGroup: "Year 4", subject: "Science" });
Brain.applyTeacherIntent(stateCtx, statesIntent);
stateCtx.lessonPlan = { keyKnowledge: ["Heating can turn a solid into a liquid.", "Cooling can turn a liquid into a solid."] };
var stateLesson = "heating can turn a solid into a liquid. cooling can turn a liquid into a solid.";
assert.deepStrictEqual(Brain.conceptCoverageIssues(stateLesson, stateCtx), []);
assert.ok(stateLesson.indexOf("reteach") === -1);
assert.ok(stateLesson.indexOf("already") === -1);

var brief = Brain.teacherIntentBrief(ctxFor(states, { yearGroup: "Year 4", subject: "Science" }));
assert.ok(brief.system.indexOf("Do not copy those items into focusConcepts") !== -1);
assert.ok(brief.system.indexOf("They are not curriculum ideas") !== -1);
assert.ok(brief.system.indexOf("Do not write a lesson") !== -1);
assert.strictEqual(brief.system.toLowerCase().indexOf("shadow"), -1);
assert.strictEqual(brief.system.toLowerCase().indexOf("speech marks"), -1);
assert.strictEqual(brief.system.toLowerCase().indexOf("backbone"), -1);
assert.strictEqual(brief.system.toLowerCase().indexOf("solids, liquids"), -1);
assert.ok(brief.user.indexOf("Do not reteach the three states") !== -1);

var legacy = Brain.conceptCoverageIssues("the class talks about rivers", {
  topic: "weather and climate",
  lessonBrief: { concepts: ["weather", "climate"], intent: "compare" }
});
assert.ok(legacy.some(function (issue) { return issue.indexOf("weather") !== -1; }));

console.log("teacher intent tests passed");
