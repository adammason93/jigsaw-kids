var fs = require("fs");
var path = require("path");
var Module = require("module");
var assert = require("assert");

var sourcePath = path.join(__dirname, "../js/lesson-brain.js");
var source = fs.readFileSync(sourcePath, "utf8");
var patched = source.replace(
  "accept: accept,",
  "accept: accept, _audit: { knowledgeLink: knowledgeLink, applyReady: applyReady, applySlotIssues: applySlotIssues, doingTask: doingTask, bareTask: bareTask, recallOnly: recallOnly, selectionOnly: selectionOnly },"
);
var loaded = new Module(sourcePath);
loaded.filename = sourcePath;
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
loaded._compile(patched, sourcePath);
var audit = loaded.exports._audit;

function activity(row) {
  return {
    applyInstruction: row.instruction,
    knowledgeUsed: row.knowledgeUsed,
    successCondition: row.successCondition || "The pupil completes the action.",
    teachingConnection: row.teachingConnection || "The task follows the teaching.",
    scene: { interaction: { type: "move", target: "model", instruction: row.instruction } }
  };
}

function judge(row) {
  var slot = { requiredKnowledge: row.requiredKnowledge };
  var item = activity(row);
  var issues = audit.applySlotIssues(item, slot);
  var knowledgeIssue = issues.filter(function (issue) {
    return /apply slot/.test(issue);
  });
  return {
    ready: audit.applyReady(item, row.requiredKnowledge),
    doingTask: audit.doingTask(row.instruction),
    bareTask: audit.bareTask(row.instruction),
    recallOnly: audit.recallOnly(row.instruction),
    selectionOnly: audit.selectionOnly(row.instruction),
    namedLink: audit.knowledgeLink(row.knowledgeUsed, row.requiredKnowledge),
    instructionLink: audit.knowledgeLink(row.instruction, [row.knowledgeUsed]),
    issues: knowledgeIssue,
    rejects: knowledgeIssue.length > 0
  };
}

var cases = [
  {
    id: "live-day-night",
    bucket: "A",
    subject: "science",
    requiredKnowledge: ["The Earth rotates on its axis once every 24 hours.", "When one side of the Earth faces the Sun, it is day.", "When the Earth rotates away from the Sun, it is night."],
    knowledgeUsed: "When one side of the Earth faces the Sun, it is day.",
    instruction: "Think about your daily routine. Show how day and night affect what you do.",
    successCondition: "The pupil shows an understanding of how day and night influence their activities.",
    teachingConnection: "This task connects to how the Earth's rotation creates day and night.",
    educational: "reject"
  },
  {
    id: "sci-volcano-topic",
    bucket: "A",
    subject: "science",
    requiredKnowledge: ["A volcano has a magma chamber, which holds molten rock.", "When pressure builds, magma rises through the vent."],
    knowledgeUsed: "A volcano has a magma chamber, which holds molten rock.",
    instruction: "Draw a picture of a volcano.",
    educational: "reject"
  },
  {
    id: "maths-fraction-topic",
    bucket: "A",
    subject: "maths",
    requiredKnowledge: ["Equivalent fractions are different fractions that represent the same amount."],
    knowledgeUsed: "Equivalent fractions are different fractions that represent the same amount.",
    instruction: "Draw a picture of one fraction.",
    educational: "reject"
  },
  {
    id: "english-adjective-topic",
    bucket: "A",
    subject: "english",
    requiredKnowledge: ["Adjectives are words that describe nouns."],
    knowledgeUsed: "Adjectives are words that describe nouns.",
    instruction: "Write a sentence about adjectives.",
    educational: "reject"
  },
  {
    id: "history-roman-topic",
    bucket: "A",
    subject: "history",
    requiredKnowledge: ["The Romans came to Britain to expand their empire."],
    knowledgeUsed: "The Romans came to Britain to expand their empire.",
    instruction: "Draw a Roman soldier.",
    educational: "reject"
  },
  {
    id: "geo-weather-topic",
    bucket: "A",
    subject: "geography",
    requiredKnowledge: ["Climate is the usual weather over many years."],
    knowledgeUsed: "Climate is the usual weather over many years.",
    instruction: "Draw a picture of today's weather.",
    educational: "reject"
  },
  {
    id: "sci-daylight-paraphrase",
    bucket: "B",
    subject: "science",
    requiredKnowledge: ["When one side of the Earth faces the Sun, it is day."],
    knowledgeUsed: "When one side of the Earth faces the Sun, it is day.",
    instruction: "Turn the globe and point to the lit half, the half that is in daylight.",
    educational: "accept"
  },
  {
    id: "maths-portion-paraphrase",
    bucket: "B",
    subject: "maths",
    requiredKnowledge: ["Equivalent fractions are different fractions that represent the same amount."],
    knowledgeUsed: "Equivalent fractions are different fractions that represent the same amount.",
    instruction: "Build two ways of naming one shared portion of a shape.",
    educational: "accept"
  },
  {
    id: "english-size-colour",
    bucket: "B",
    subject: "english",
    requiredKnowledge: ["Adjectives can show size, colour, and shape."],
    knowledgeUsed: "Adjectives can show size, colour, and shape.",
    instruction: "Write three sentences that tell the reader the size or colour of each object.",
    educational: "accept"
  },
  {
    id: "history-goods-paraphrase",
    bucket: "B",
    subject: "history",
    requiredKnowledge: ["They wanted resources such as metals and food."],
    knowledgeUsed: "They wanted resources such as metals and food.",
    instruction: "Draw the goods and farmland the visitors hoped to take from the island.",
    educational: "accept"
  },
  {
    id: "geo-pattern-paraphrase",
    bucket: "B",
    subject: "geography",
    requiredKnowledge: ["Climate is the usual weather over many years."],
    knowledgeUsed: "Climate is the usual weather over many years.",
    instruction: "Group the long-term pattern apart from what the sky does on one date.",
    educational: "accept"
  },
  {
    id: "sci-globe-direct",
    bucket: "C",
    subject: "science",
    requiredKnowledge: ["When one side of the Earth faces the Sun, it is day."],
    knowledgeUsed: "When one side of the Earth faces the Sun, it is day.",
    instruction: "Use the globe to show which side of Earth has day when it faces the Sun.",
    educational: "accept"
  },
  {
    id: "maths-multiply-direct",
    bucket: "C",
    subject: "maths",
    requiredKnowledge: ["To find equivalent fractions, multiply the numerator and the denominator by the same number."],
    knowledgeUsed: "To find equivalent fractions, multiply the numerator and the denominator by the same number.",
    instruction: "Create two equivalent fractions by multiplying the numerator and the denominator.",
    educational: "accept"
  },
  {
    id: "english-nouns-direct",
    bucket: "C",
    subject: "english",
    requiredKnowledge: ["Adjectives are words that describe nouns."],
    knowledgeUsed: "Adjectives are words that describe nouns.",
    instruction: "Write three sentences that use adjectives to describe the nouns.",
    educational: "accept"
  },
  {
    id: "history-metals-direct",
    bucket: "C",
    subject: "history",
    requiredKnowledge: ["They wanted resources such as metals and food."],
    knowledgeUsed: "They wanted resources such as metals and food.",
    instruction: "Draw the metals and food the Romans wanted from Britain.",
    educational: "accept"
  },
  {
    id: "geo-sort-direct",
    bucket: "C",
    subject: "geography",
    requiredKnowledge: ["Weather is what happens in the sky each day.", "Climate is the usual weather over many years."],
    knowledgeUsed: "Weather is what happens in the sky each day.",
    instruction: "Sort today's weather apart from the climate over many years.",
    educational: "accept"
  },
  {
    id: "sci-recall",
    bucket: "D",
    subject: "science",
    requiredKnowledge: ["When one side of the Earth faces the Sun, it is day."],
    knowledgeUsed: "When one side of the Earth faces the Sun, it is day.",
    instruction: "What happens when one side of the Earth faces the Sun?",
    educational: "reject"
  },
  {
    id: "sci-explain-restates",
    bucket: "D",
    subject: "science",
    requiredKnowledge: ["When one side of the Earth faces the Sun, it is day."],
    knowledgeUsed: "When one side of the Earth faces the Sun, it is day.",
    instruction: "Explain when one side of the Earth faces the Sun.",
    educational: "reject"
  },
  {
    id: "english-recall",
    bucket: "D",
    subject: "english",
    requiredKnowledge: ["Adjectives are words that describe nouns."],
    knowledgeUsed: "Adjectives are words that describe nouns.",
    instruction: "What is an adjective?",
    educational: "reject"
  },
  {
    id: "history-tell-reason",
    bucket: "D",
    subject: "history",
    requiredKnowledge: ["The Romans came to Britain to expand their empire."],
    knowledgeUsed: "The Romans came to Britain to expand their empire.",
    instruction: "Tell your partner one reason the Romans came to Britain.",
    educational: "reject"
  },
  {
    id: "sci-sort-cards",
    bucket: "E",
    subject: "science",
    requiredKnowledge: ["A volcano has a magma chamber, which holds molten rock."],
    knowledgeUsed: "A volcano has a magma chamber, which holds molten rock.",
    instruction: "Sort the cards.",
    educational: "reject"
  },
  {
    id: "geo-move-this",
    bucket: "E",
    subject: "geography",
    requiredKnowledge: ["Weather is what happens in the sky each day."],
    knowledgeUsed: "Weather is what happens in the sky each day.",
    instruction: "Move this.",
    educational: "reject"
  },
  {
    id: "english-choose-pupil",
    bucket: "E",
    subject: "english",
    requiredKnowledge: ["Adjectives are words that describe nouns."],
    knowledgeUsed: "Adjectives are words that describe nouns.",
    instruction: "Choose a pupil to have a turn.",
    educational: "reject"
  },
  {
    id: "sci-wrong-sentence",
    bucket: "F",
    subject: "science",
    requiredKnowledge: ["The Earth rotates on its axis once every 24 hours.", "When one side of the Earth faces the Sun, it is day."],
    knowledgeUsed: "The Earth rotates on its axis once every 24 hours.",
    instruction: "Show which side of Earth has day when it faces the Sun.",
    educational: "reject"
  },
  {
    id: "history-wrong-sentence",
    bucket: "F",
    subject: "history",
    requiredKnowledge: ["They wanted resources such as metals and food.", "The Romans built roads and towns in Britain."],
    knowledgeUsed: "The Romans built roads and towns in Britain.",
    instruction: "Draw the metals and food the Romans wanted from Britain.",
    educational: "reject"
  },
  {
    id: "maths-wrong-sentence",
    bucket: "F",
    subject: "maths",
    requiredKnowledge: ["The numerator is the top number in a fraction.", "Equivalent fractions are different fractions that represent the same amount."],
    knowledgeUsed: "Equivalent fractions are different fractions that represent the same amount.",
    instruction: "Shade the numerator of this fraction.",
    educational: "reject"
  }
];

var counts = { trueAccept: 0, trueReject: 0, falseAccept: 0, falseReject: 0 };
cases.forEach(function (row) {
  var result = judge(row);
  var validator = result.rejects ? "reject" : "accept";
  var kind = validator === row.educational
    ? (validator === "accept" ? "trueAccept" : "trueReject")
    : (validator === "accept" ? "falseAccept" : "falseReject");
  counts[kind] += 1;
  row.validator = validator;
  row.kind = kind;
  row.issues = result.issues;
  row.gates = {
    doingTask: result.doingTask,
    bareTask: result.bareTask,
    recallOnly: result.recallOnly,
    selectionOnly: result.selectionOnly,
    namedLink: result.namedLink,
    instructionLink: result.instructionLink
  };
});

if (process.env.AUDIT_PRINT === "1") {
  cases.forEach(function (row) {
    console.log([row.bucket, row.id, row.subject, "edu=" + row.educational, "val=" + row.validator, row.kind, (row.issues || []).join("; "), "doing=" + row.gates.doingTask, "bare=" + row.gates.bareTask, "recall=" + row.gates.recallOnly, "named=" + JSON.stringify(row.gates.namedLink), "instr=" + JSON.stringify(row.gates.instructionLink)].join(" | "));
  });
  console.log(JSON.stringify(counts));
}

assert.strictEqual(cases.length, 26);
cases.forEach(function (row) {
  assert.ok(row.validator === "accept" || row.validator === "reject");
  assert.ok(row.educational === "accept" || row.educational === "reject");
});
var live = cases.filter(function (row) { return row.id === "live-day-night"; })[0];
assert.strictEqual(live.validator, "reject");
assert.strictEqual(live.gates.doingTask, true);
assert.strictEqual(live.gates.selectionOnly, false);
assert.strictEqual(live.gates.recallOnly, false);
assert.ok(live.issues.join(" ").indexOf("does not use the taught knowledge") !== -1);

module.exports = { cases: cases, counts: counts };
