"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Brain = require("../js/lesson-brain.js");
var Core = require("../schools/learn/creator-core.js");

var saved = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/sharks-883d-complete.json"), "utf8"));
var adventure = saved.adventure;
var mechanics = ["story", "quiz", "word_search", "spin", "mystery", "doors"];

function browserCtx(text) {
  var analysis = Core.analyseSource(text);
  return Brain.contextFrom({
    source: { text: text },
    year: analysis.year || "Year 1",
    subject: analysis.subject || "Science",
    topic: analysis.topic,
    targetMinutes: analysis.requestedMinutes || 15
  }, { pupilCount: 8, availableMechanics: mechanics });
}

function coverage(text) {
  var checked = Brain.accept(adventure, browserCtx(text));
  return (checked.issues || []).filter(function (issue) { return /do not teach/.test(issue); });
}

var basicFacts = "Year 1 Science. 15 minutes. Teach children basic facts about sharks, including habitats, diet and anatomy.";
var factsOnly = "Year 1 science lesson on basic facts about sharks.";
var dietAnatomy = "Teach habitats, diet and anatomy of sharks for Year 1.";

var basicIssues = coverage(basicFacts);
["basic", "facts", "diet", "anatomy"].forEach(function (token) {
  assert.ok(basicIssues.indexOf("The activities do not teach " + token + ".") !== -1, basicIssues.join(" | "));
});
assert.deepStrictEqual(coverage(factsOnly), [
  "The activities do not teach basic.",
  "The activities do not teach facts."
]);
assert.deepStrictEqual(coverage(dietAnatomy), [
  "The activities do not teach diet.",
  "The activities do not teach anatomy."
]);

var serverIntent = {
  ok: true,
  learningGoal: "Students will understand basic facts about sharks.",
  requiredEvidence: "The pupil names a shark feature such as teeth and body shape and says how that feature helps the shark hunt.",
  focusConcepts: ["shark diet", "shark anatomy", "shark habitats"],
  priorKnowledge: [],
  exclusions: [],
  preferences: [],
  subject: "Science",
  subjectConfidence: "explicit",
  durationMinutes: 15
};

function withIntent(text) {
  var ctx = browserCtx(text);
  ctx.lessonBrief.teacherIntent = serverIntent;
  return Brain.accept(adventure, ctx);
}

[basicFacts, factsOnly, dietAnatomy].forEach(function (text) {
  var passed = withIntent(text);
  assert.strictEqual(passed.ok, true, text + " :: " + (passed.issues || []).join(" | "));
});

var responses = [];
global.window = {
  KidsScoreCloud: {
    getSession: function (done) { done({ access_token: "test-token" }); }
  },
  SCORE_SYNC: {}
};
global.fetch = function () {
  var next = responses.shift();
  return Promise.resolve({
    json: function () { return Promise.resolve(next); }
  });
};

function completeBody(meta) {
  return {
    ok: true,
    stage: "COMPLETE",
    adventure: JSON.parse(JSON.stringify(adventure)),
    meta: meta || {}
  };
}

var warning = {
  slotId: "check",
  outcome: "check-partial",
  issue: "The check slot leaves part of the required evidence untested.",
  reason: "The demonstrated evidence addresses teeth but not body shape.",
  repairAttempted: true,
  postRepair: true
};

responses.push(completeBody({}));
responses.push(completeBody({
  teacherIntent: serverIntent,
  qualityWarnings: [warning]
}));

Brain.request(browserCtx(basicFacts)).then(function (rejected) {
  assert.strictEqual(rejected.ok, false);
  assert.strictEqual(rejected.category, "invalid");
  assert.ok((rejected.issues || []).indexOf("The activities do not teach diet.") !== -1, (rejected.issues || []).join(" | "));
  assert.ok((rejected.issues || []).indexOf("The activities do not teach anatomy.") !== -1);
  return Brain.request(browserCtx(dietAnatomy));
}).then(function (accepted) {
  assert.strictEqual(accepted.ok, true, (accepted.issues || []).join(" | "));
  assert.strictEqual(accepted.adventure.activities.length, 7);
  assert.strictEqual(accepted.adventure.meta.qualityWarnings[0].outcome, "check-partial");
  assert.strictEqual(accepted.adventure.meta.fallbackUsed, false);

  var broad = Brain.planBrief({
    yearGroup: "Year 1",
    requestedMinutes: 15,
    lessonText: "Teach children about the topic.",
    lessonBrief: { rawRequest: "Teach children about the topic.", intent: "explain" }
  });
  assert.ok(broad.system.indexOf("Choose a coherent scope yourself") !== -1);
  assert.ok(broad.system.indexOf("two developed strands are enough") !== -1);
  assert.ok(broad.system.indexOf("six unlinked facts") !== -1);
  assert.ok(broad.system.indexOf("dependsOn") !== -1);
  assert.strictEqual(broad.system.indexOf("two in Year 1 and Year 2"), -1);
  assert.ok(!/shark/i.test(broad.system));
  assert.ok(broad.system.indexOf("about 5 to 6 points") !== -1);
  var older = Brain.planBrief({
    yearGroup: "Year 6",
    requestedMinutes: 20,
    lessonText: "Teach children about the topic.",
    lessonBrief: { rawRequest: "Teach children about the topic.", intent: "explain" }
  });
  assert.strictEqual(older.system.indexOf("six unlinked facts"), -1);

  var content = Brain.contentBrief({ yearGroup: "Year 1", subject: "Science", topic: "Animals" }, {
    learningObjective: "Pupils can say how an animal finds food.",
    keyKnowledge: ["Some animals catch food with their teeth.", "A smooth body helps an animal move through water."],
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, null);
  assert.ok(content.system.indexOf("concrete unsolved problem") !== -1);
  assert.ok(content.system.indexOf("what lives here") !== -1);
  assert.ok(content.system.indexOf("only a list of names") !== -1);
  assert.ok(content.system.indexOf("new case") !== -1);
  assert.ok(content.system.indexOf("sort the cards") !== -1);
  assert.ok(content.system.indexOf("more than one necessary part") !== -1);
  assert.ok(content.system.indexOf("including the how or why") !== -1);
  assert.ok(content.system.indexOf("teacherIntent.learningGoal") !== -1);

  var story = Brain.storyBrief({ yearGroup: "Year 1", subject: "Science", topic: "Animals" }, {
    learningObjective: "Pupils can say how an animal finds food.",
    yearGroup: "Year 1"
  });
  assert.ok(story.system.indexOf("concrete unsolved problem") !== -1);
  assert.ok(story.system.indexOf("what lives here") !== -1);

  var strandRepair = JSON.parse(Brain.planRepairBrief({
    yearGroup: "Year 1",
    requestedMinutes: 15,
    lessonBrief: { intent: "explain", rawRequest: "Teach children about the topic." }
  }, ["The learning map needs two or more developed strands for this broad topic."], {
    learningObjective: "Pupils learn the main ideas.",
    learningMap: []
  }).user);
  var strandLine = strandRepair.relationshipRequired.join(" ");
  assert.ok(strandLine.indexOf("two linked strands") !== -1);
  assert.ok(strandLine.indexOf("empty dependsOn") !== -1);
  assert.ok(strandLine.indexOf("non-empty dependsOn") !== -1);
  assert.ok(!/shark/i.test(strandLine));

  var plan = {
    subject: "Science",
    topic: "Animals",
    keyKnowledge: ["Some animals catch food with their teeth.", "A smooth body helps an animal move through water."],
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }],
    learningObjective: "Pupils can say how an animal finds food."
  };
  var frame = {
    yearGroup: "Year 1",
    subject: "Science",
    topic: "Animals",
    requestedMinutes: 15,
    lessonBrief: {
      teacherIntent: {
        ok: true,
        learningGoal: plan.learningObjective,
        requiredEvidence: "The pupil names teeth and body shape.",
        focusConcepts: ["teeth", "body shape"]
      }
    }
  };
  var skeleton = Brain.lessonSkeleton(plan, frame);
  assert.deepStrictEqual(skeleton.map(function (slot) { return slot.id; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
  assert.strictEqual(skeleton[3].mechanic, "story");
  assert.strictEqual(skeleton[3].interactionIntent, "move");
  assert.strictEqual(skeleton[4].mechanic, "quiz");
  var checkRepair = JSON.parse(Brain.slotRepairBrief(Object.assign({}, frame, { lessonPlan: plan, lessonSkeleton: skeleton }), ["check"], ["The check slot leaves part of the required evidence untested."], { activities: [] }).user);
  assert.ok(checkRepair.instruction.indexOf("must stay a quiz") !== -1);
  assert.ok(checkRepair.instruction.indexOf("more than one necessary part") !== -1);
  assert.ok(checkRepair.instruction.indexOf("The mechanic and interaction family cannot change") === -1);

  var judged = Brain.applySemanticBrief({ instruction: "Choose the animal that can catch food.", knowledgeUsed: "Teeth help an animal catch food." });
  assert.ok(judged.system.indexOf("reproduce") !== -1 && judged.system.indexOf("unrelated") !== -1);
  assert.strictEqual(Brain.applySemanticDecision("reproduce").outcome, "semantic-reproduce");
  assert.strictEqual(Brain.checkEvidenceDecision("partial").outcome, "check-partial");
  assert.strictEqual(Brain.checkEvidenceDecision("sufficient").issue, "");

  console.log("reaccept teacher intent tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
