var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var intent = Brain.normaliseTeacherIntent({
  yearGroup: "Year 5",
  subject: "Geography",
  subjectConfidence: "explicit",
  learningGoal: "Compare why people settled beside a river and why people settled on a hill.",
  requiredEvidence: "Pupil can compare river and hill locations using reasons for both.",
  focusConcepts: ["river settlement", "hill settlement"],
  priorKnowledge: [],
  exclusions: ["what a map is"],
  preferences: ["hands-on"],
  durationMinutes: null
}, { yearGroup: "Year 5", subject: "Geography", lessonText: "Compare river and hill settlements." });
assert.strictEqual(intent.ok, true);
assert.strictEqual(intent.requiredEvidence, "Pupil can compare river and hill locations using reasons for both.");

var copied = Brain.normaliseTeacherIntent({
  learningGoal: "Compare why people settled beside a river and on a hill.",
  requiredEvidence: "Do not reteach what a map is.",
  exclusions: ["Do not reteach what a map is."],
  focusConcepts: ["river settlement"]
}, { lessonText: "Compare settlements." });
assert.strictEqual(copied.ok, false);
assert.strictEqual(copied.reason, "missing-evidence");

var question = {
  yearGroup: "Year 2",
  prompt: "What do frogs begin their lives as?",
  choices: ["Tadpoles", "Eggs"],
  correct: "Eggs",
  learningGoal: "Sequence the frog life cycle.",
  requiredEvidence: "Pupil orders the stages from egg to adult.",
  knowledgeChecked: "the whole life cycle"
};
var evidenceBrief = Brain.checkEvidenceBrief(question);
var evidenceUser = JSON.parse(evidenceBrief.user);
assert.deepStrictEqual(Object.keys(evidenceUser).sort(), ["choices", "correct", "prompt", "yearGroup"]);
assert.strictEqual(evidenceBrief.user.indexOf("life cycle"), -1);
assert.strictEqual(evidenceBrief.user.indexOf("requiredEvidence"), -1);
assert.ok(evidenceBrief.system.indexOf("solely because they answered this question correctly") !== -1);

var coverageBrief = Brain.checkCoverageBrief({
  requiredEvidence: "Pupil can place the main stages in order from egg to adult.",
  demonstratedEvidence: "Pupil knows the animal begins as an egg.",
  learningGoal: "Sequence a life cycle.",
  topic: "frogs",
  prompt: question.prompt
});
var coverageUser = JSON.parse(coverageBrief.user);
assert.deepStrictEqual(Object.keys(coverageUser).sort(), ["demonstratedEvidence", "requiredEvidence"]);
assert.strictEqual(coverageBrief.user.indexOf("Sequence"), -1);
assert.ok(coverageBrief.system.indexOf("one stage instead of a whole order") !== -1);
assert.ok(coverageBrief.system.indexOf("label instead of a measurement") !== -1);

assert.strictEqual(Brain.parseCheckCoverage("{\"coverage\":\"sufficient\",\"reason\":\"The whole order is shown.\"}").coverage, "sufficient");
assert.strictEqual(Brain.parseCheckCoverage("{\"coverage\":\"unrelated\",\"reason\":\"Different learning.\"}").coverage, "unrelated");
assert.strictEqual(Brain.checkEvidenceDecision("partial").issue.indexOf("part of the required evidence") !== -1, true);
assert.strictEqual(Brain.checkEvidenceDecision("nonsense").outcome, "check-error");

console.log("evidence contract tests passed");
