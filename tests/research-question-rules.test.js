"use strict";

// Patch 7 question rules (research mode only; all block):
// circular stems (code), "adapt to" / "evolved to" goal wording (code), and a model question audit
// (partly-true wrong choices, circular, goal-directed) whose missing or "unchecked" verdicts fail.
// The sentences below are run 14's live questions (6 Oct 2026) and test strings, not lesson content.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function ctxFor(research, extra) {
  var c = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
    lessonBrief: { teacherIntent: run9.intent }, lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan),
    knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection) };
  if (research) c.researchEvidence = copy(run9.research);
  return Object.assign(c, extra || {});
}
var teach = { slotId: "teach", beats: ["Dinosaurs had straight back legs.", "Straight back legs let dinosaurs use less energy to move.", "Spinosaurus had nostrils higher on its snout."].map(function (t, i) { return { id: "teach:" + i, pupil: { text: t } }; }) };
function check(questions) { return { slotId: "check", mechanic: "quiz", config: { questions: questions } }; }
function texts(rows) { return rows.map(function (r) { return r.text; }); }
var q1 = { prompt: "Why did dinosaurs with straight back legs use less energy?", choices: ["Because their legs were straight.", "Because they were small.", "Because they had long tails."], correct: "Because their legs were straight." };
var q2 = { prompt: "How did Spinosaurus adapt to breathe underwater?", choices: ["Its nostrils were higher on its snout.", "It had big teeth.", "It had a sail."], correct: "Its nostrils were higher on its snout." };
var good = { prompt: "What did straight back legs let dinosaurs do?", choices: ["Use less energy to move.", "Swim faster.", "See in the dark."], correct: "Use less energy to move." };
function audit(questions, override) {
  return { ok: true, questions: questions.map(function (q) {
    var row = { prompt: q.prompt, teleological: "no", circular: "no", distractors: q.choices.filter(function (c) { return c !== q.correct; }).map(function (c) { return { choice: c, trueInGeneral: "no", reason: "test" }; }) };
    return Object.assign(row, (override || {})[q.prompt] || {});
  }) };
}

// ---- circular stem (code) ----
var circ = Brain.questionIssues([teach, check([q1])], ctxFor(true, { questionAudit: audit([q1]) }));
assert.ok(texts(circ).some(function (t) { return /Question 1 is circular/.test(t); }), texts(circ).join(" | "));
var fine = Brain.questionIssues([teach, check([good])], ctxFor(true, { questionAudit: audit([good]) }));
assert.deepStrictEqual(texts(fine), [], texts(fine).join(" | "));

// ---- teleology: "adapt to", "how did X adapt", "evolved to" ----
["How did Spinosaurus adapt to breathe underwater?", "How did dinosaurs adapt?", "Its nostrils evolved to sit high on its snout.", "Dinosaurs adapted to their environments."].forEach(function (t) { assert.strictEqual(Brain.teleological(t), true, t); });
["What did high nostrils let Spinosaurus do?", "Straight back legs let dinosaurs use less energy to move.", "Which feature helped it reach high leaves?"].forEach(function (t) { assert.strictEqual(Brain.teleological(t), false, t); });
var tele = Brain.researchRuleIssues([teach, check([q2])], ctxFor(true, { questionAudit: audit([q2]) }));
assert.ok(texts(tele).some(function (t) { return /goal-directed wording \("How did Spinosaurus adapt/.test(t); }), texts(tele).join(" | "));

// ---- audit verdicts block ----
// Missing audit: every question is unchecked and fails.
var none = Brain.questionAuditIssues(good, 0, null);
assert.strictEqual(none.length, 1);
assert.ok(/not checked .*an unchecked question fails/.test(none[0].text));
// Audit for a different prompt does not count.
assert.strictEqual(Brain.questionAuditIssues(good, 0, audit([q1])).length, 1);
// Teleology "unchecked" (malformed verdict) fails.
var parsed = Brain.parseQuestionAudit({ questions: [{ prompt: good.prompt, teleological: "maybe", circular: "no", distractors: [{ choice: "Swim faster.", trueInGeneral: "no" }] }] });
assert.strictEqual(parsed.questions[0].teleological, "unchecked");
assert.ok(/unchecked counts as a fail/.test(Brain.questionAuditIssues(good, 0, parsed)[0].text));
assert.strictEqual(Brain.parseQuestionAudit({ nope: 1 }).ok, false);
// Teleological yes, circular yes, partly-true and true distractors each fail.
var bad = audit([good], { "What did straight back legs let dinosaurs do?": { teleological: "yes", teleologyReason: "asks why it had legs", circular: "yes", circularReason: "repeats",
  distractors: [{ choice: "Swim faster.", trueInGeneral: "partly", reason: "vaguer reason" }, { choice: "See in the dark.", trueInGeneral: "yes", reason: "true" }] } });
var badRows = texts(Brain.questionAuditIssues(good, 0, bad));
assert.strictEqual(badRows.length, 4, badRows.join(" | "));
assert.ok(badRows.some(function (t) { return /Swim faster\..*partly true in general/.test(t); }));
assert.ok(badRows.some(function (t) { return /See in the dark\..*is true in general/.test(t); }));
// Clean audit: no rows.
assert.deepStrictEqual(Brain.questionAuditIssues(good, 0, audit([good])), []);

// ---- default path: no research, no question rule and no audit ----
assert.deepStrictEqual(Brain.researchRuleIssues([teach, check([q1, q2])], ctxFor(false)), []);

// ---- the audit brief and input ----
var brief = Brain.questionAuditBrief({ yearGroup: "Year 3", taughtSentences: ["a"], sourcePassages: [{ id: "S1", text: "t" }], questions: [good] });
assert.ok(/^You audit the check questions/.test(brief.system));
assert.ok(/teleological/.test(brief.system) && /partly/.test(brief.system));
assert.strictEqual(JSON.parse(brief.user).questions[0].correct, good.correct);
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
var found = Brain.researchCheckQuestions(copy(raw), ctxFor(true));
assert.strictEqual(found.length, 3);
assert.strictEqual(found[0].prompt, "How did straight back legs help dinosaurs save energy?");
var input = Brain.questionAuditInput(copy(raw), ctxFor(true));
assert.strictEqual(input.questions.length, 3);
assert.ok(input.sourcePassages.length >= 1);

// ---- resolveLessonContent: the audit port runs in research mode only, before each accept ----
var judged = { applySemantic: { relationship: "apply", reason: "t" }, checkSemantics: [0, 1, 2].map(function () { return { coverage: "sufficient", reason: "t", demonstratedEvidence: "t" }; }) };
var calls = 0;
var ports = { questionAudit: function () { calls += 1; return { ok: true, questions: [] }; }, repair: function () { return { slots: {} }; },
  judge: function () { return { ok: true, relationship: "apply", reason: "t" }; }, checkJudge: function () { return { ok: true, coverage: "sufficient", reason: "t", demonstratedEvidence: "t" }; } };
Promise.resolve()
  .then(function () { return Brain.resolveLessonContent(copy(raw), Object.assign(ctxFor(false), judged), ports); })
  .then(function (res) {
    assert.strictEqual(calls, 0, "default path: no audit call");
    assert.strictEqual(res.ok, true);
    return Brain.resolveLessonContent(copy(raw), ctxFor(true), ports);
  })
  .then(function (res) {
    assert.strictEqual(calls, 2, "research: audited before the first accept and again after the repair");
    assert.strictEqual(res.ok, false);
    assert.ok((res.issues || []).some(function (i) { return /not checked for partly-true/.test(i); }), (res.issues || []).join(" | "));
    console.log("research question rules tests passed");
  })
  .catch(function (e) { console.error(e); process.exit(1); });
