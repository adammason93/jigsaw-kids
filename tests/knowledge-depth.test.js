"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var arc = [{ purpose: "teach" }, { purpose: "check" }];

function plan(objective, knowledge, ctx) {
  return Brain.normalisePlan({
    learningObjective: objective,
    keyKnowledge: knowledge,
    lessonArc: arc
  }, ctx || {});
}

function goalCtx(sentence, intent, goal) {
  return {
    lessonText: sentence,
    topic: "",
    yearGroup: "Year 4",
    lessonBrief: {
      intent: intent,
      rawRequest: sentence,
      learningGoal: goal,
      teacherIntent: { ok: true, learningGoal: goal }
    }
  };
}

var henryGoal = "Pupils should understand the key events and significance of Henry VIII's reign.";
var henry = goalCtx("Teach Year 4 about Henry VIII for 15 minutes.", "explain", henryGoal);
var henryShallow = plan(henryGoal, [
  "Henry VIII was the King of England from 1509 to 1547.",
  "He is known for having six wives and starting the Church of England.",
  "His reign led to significant changes in religion and government in England."
], henry);
assert.strictEqual(henryShallow.ok, false);
assert.ok((henryShallow.issues || []).join(" ").indexOf("outcome, not the reason") !== -1);
var henryEnough = plan(henryGoal, [
  "Henry broke from the Pope so that he could remarry.",
  "That break created the Church of England, which changed who led the church in England."
], henry);
assert.strictEqual(henryEnough.ok, true, (henryEnough.issues || []).join("; "));
var henryGamed = plan(henryGoal, [
  "Henry VIII was the king of England from 1509 to 1547.",
  "The Reformation changed the church in England, leading to the establishment of the Church of England.",
  "Henry VIII had six wives, which was significant for his political and personal life.",
  "His reign had a lasting impact on England's religion and politics."
], henry);
assert.strictEqual(henryGamed.ok, false);
var henryMeant = plan(henryGoal, [
  "Henry VIII was the king of England from 1509 to 1547, which meant he had a significant influence on the country's direction.",
  "The Reformation changed the church in England, leading to the establishment of the Church of England.",
  "Henry VIII had six marriages, which led to significant changes in the church and society."
], henry);
assert.strictEqual(henryMeant.ok, false);
var speechGoal = "Pupils should be able to correctly use speech marks in sentences.";
var speech = plan(speechGoal, [
  "Speech marks are used to show direct speech because they indicate the exact words spoken by someone.",
  "Pupils place speech marks at the beginning and end of the spoken words."
], goalCtx("Teach Year 4 how to use speech marks in a sentence for 12 minutes.", "procedure", speechGoal));
assert.strictEqual(speech.ok, true, (speech.issues || []).join("; "));

var plantGoal = "Students will understand how a plant makes its food through photosynthesis.";
var plant = goalCtx("Teach Year 4 how a plant makes its food for 15 minutes.", "process", plantGoal);
var plantShallow = plan(plantGoal, [
  "Plants use sunlight to make food.",
  "Chlorophyll helps plants absorb sunlight.",
  "Plants take in carbon dioxide from the air.",
  "Photosynthesis produces oxygen as a byproduct."
], plant);
assert.strictEqual(plantShallow.ok, false);
assert.ok((plantShallow.issues || []).join(" ").indexOf("parts, not the change") !== -1);
var plantEnough = plan(plantGoal, [
  "A plant uses light to turn carbon dioxide and water into food.",
  "Oxygen is released while that food is made."
], plant);
assert.strictEqual(plantEnough.ok, true, (plantEnough.issues || []).join("; "));

var riverGoal = "Understand how a river changes from its source to its mouth.";
var river = goalCtx("Teach Year 4 how a river changes from source to mouth for 15 minutes.", "process", riverGoal);
var riverShallow = plan(riverGoal, [
  "A river starts at its source, usually in the mountains.",
  "As the river flows, it erodes the land, shaping the landscape.",
  "The river carries sediment and deposits it at its mouth, creating deltas."
], river);
assert.strictEqual(riverShallow.ok, false);
var riverEnough = plan(riverGoal, [
  "Near the source the river is narrow and fast.",
  "It then becomes wider and slower, and it drops sediment where it meets the sea."
], river);
assert.strictEqual(riverEnough.ok, true, (riverEnough.issues || []).join("; "));

var quakeGoal = "Pupils should understand the reasons why some places experience earthquakes.";
var quake = goalCtx("Teach Year 6 why some places have earthquakes for 15 minutes.", "why", quakeGoal);
var quakePlace = plan(quakeGoal, [
  { text: "Earthquakes often happen at plate edges.", knowledgeType: "cause" },
  "Fault lines are fractures in the Earth's crust."
], quake);
assert.strictEqual(quakePlace.ok, false);
assert.strictEqual(quakePlace.previous ? "" : "", "");
var quakeEntries = Brain.normalisePlan({
  learningObjective: "Explain what causes an earthquake.",
  keyKnowledge: [{ text: "Earthquakes often happen at plate edges.", knowledgeType: "cause" }, "The ground shakes."],
  lessonArc: arc
}, { lessonText: "why earthquakes happen", lessonBrief: { intent: "why", learningGoal: quakeGoal, teacherIntent: { learningGoal: quakeGoal } } });
assert.ok(!quakeEntries.ok);
var quakeMove = plan(quakeGoal, [
  "The Earth's surface is made of huge pieces.",
  "The pieces push, stick, and then slip, which makes the ground shake."
], quake);
assert.strictEqual(quakeMove.ok, true, (quakeMove.issues || []).join("; "));

var saxonGoal = "Describe how the Anglo-Saxons changed Britain and why those changes mattered.";
var saxon = goalCtx("Teach Year 3 how the Anglo-Saxons changed Britain for 15 minutes.", "process", saxonGoal);
var saxonShallow = plan(saxonGoal, [
  "The Anglo-Saxons settled in Britain after the Romans left.",
  "They introduced new farming techniques and crops.",
  "They influenced the English language and culture."
], saxon);
assert.strictEqual(saxonShallow.ok, false);
var saxonEnough = plan(saxonGoal, [
  "They settled in villages and farmed the land.",
  "Many English place names came from their language, which meant their settlement changed how people spoke."
], saxon);
assert.strictEqual(saxonEnough.ok, true, (saxonEnough.issues || []).join("; "));

var rainGoal = "Pupils should understand how rain forms in the water cycle.";
var rain = plan(rainGoal, [
  "Water evaporates from lakes and rivers when it gets warm.",
  "The water vapor cools and turns into tiny droplets, forming clouds.",
  "When the droplets get heavy, they fall as rain."
], goalCtx("Teach Year 2 how rain forms for 10 minutes.", "process", rainGoal));
assert.strictEqual(rain.ok, true, (rain.issues || []).join("; "));

var dayGoal = "Pupils should understand that day and night are caused by the rotation of the Earth on its axis.";
var day = plan(dayGoal, [
  "The Earth rotates on its axis.",
  "When one side of the Earth faces the Sun, it is day.",
  "When the Earth rotates away from the Sun, it is night."
], goalCtx("Teach Year 3 what causes day and night for 12 minutes.", "why", dayGoal));
assert.strictEqual(day.ok, true, (day.issues || []).join("; "));

var athensGoal = "Pupils should understand the key differences between Athens and Sparta.";
var athens = plan(athensGoal, [
  "Athens was known for its democracy and focus on arts and philosophy.",
  "Sparta was a military state that emphasized discipline and strength."
], goalCtx("Teach Year 5 the difference between Athens and Sparta for 15 minutes.", "compare", athensGoal));
assert.strictEqual(athens.ok, true, (athens.issues || []).join("; "));

var addGoal = "Pupils will be able to add two two-digit numbers accurately.";
var addition = plan(addGoal, [
  "Two-digit numbers have a tens and a units place.",
  "To add two two-digit numbers, add the tens first, then the units.",
  "If the sum of the units is 10 or more, carry over the extra ten to the tens place."
], goalCtx("Teach Year 2 how to add two two-digit numbers for 12 minutes.", "procedure", addGoal));
assert.strictEqual(addition.ok, true, (addition.issues || []).join("; "));
var henryAllowed = plan(henryGoal, [
  "Henry VIII's six marriages changed the royal succession and influenced politics.",
  "The establishment of the Church of England allowed for the king's control over religious matters."
], henry);
assert.strictEqual(henryAllowed.ok, true, (henryAllowed.issues || []).join("; "));
var plantConvert = plan(plantGoal, [
  "Photosynthesis is the process plants use to make food from sunlight, carbon dioxide, and water.",
  "Chlorophyll captures sunlight, which helps plants convert carbon dioxide and water into food."
], plant);
assert.strictEqual(plantConvert.ok, true, (plantConvert.issues || []).join("; "));
var thinAddition = plan(addGoal, [
  "Understanding place value in two-digit numbers",
  "The process of carrying over in addition"
], goalCtx("Teach Year 2 how to add two two-digit numbers for 12 minutes.", "procedure", addGoal));
assert.strictEqual(thinAddition.ok, false);
assert.ok((thinAddition.issues || []).join(" ").indexOf("step, not the action") !== -1);

var fractionGoal = "Pupils should understand how to identify and create equivalent fractions.";
var fractions = plan(fractionGoal, [
  "Equivalent fractions are different fractions that represent the same part of a whole.",
  "To find equivalent fractions, you can multiply or divide the numerator and denominator by the same number."
], goalCtx("Teach Year 4 equivalent fractions for 12 minutes.", "explain", fractionGoal));
assert.strictEqual(fractions.ok, true, (fractions.issues || []).join("; "));

var halfGoal = "Pupils should understand the concept of a half as one of two equal parts of a whole.";
var half = plan(halfGoal, [
  "A half is one of two equal parts.",
  "When something is divided into two equal parts, each part is a half."
], goalCtx("Teach Year 1 what a half means for 10 minutes.", "explain", halfGoal));
assert.strictEqual(half.ok, true, (half.issues || []).join("; "));

var matterGoal = "Students will understand the differences between solids and liquids.";
var matter = plan(matterGoal, [
  "Solids have a definite shape and volume.",
  "Liquids take the shape of their container but have a definite volume."
], goalCtx("Teach Year 5 the difference between solids and liquids for 12 minutes.", "compare", matterGoal));
assert.strictEqual(matter.ok, true, (matter.issues || []).join("; "));

var gridGoal = "Pupils should be able to accurately use a four-figure grid reference to locate places on a map.";
var grid = plan(gridGoal, [
  "A four-figure grid reference consists of an easting and a northing.",
  "To read it, first find the easting, then the northing."
], goalCtx("Teach Year 6 how to use a four-figure grid reference for 12 minutes.", "procedure", gridGoal));
assert.strictEqual(grid.ok, true, (grid.issues || []).join("; "));

var brief = Brain.planBrief({ lessonBrief: { learningGoal: "Understand why a change mattered." }, yearGroup: "Year 4" });
assert.ok(brief.system.indexOf("smallest set of two to four") !== -1);
assert.strictEqual(brief.system.indexOf("choose a simpler true fact"), -1);
assert.ok(brief.system.indexOf("why it mattered") !== -1);

var repairCtx = goalCtx("Teach Year 4 about Henry VIII for 15 minutes.", "explain", henryGoal);
repairCtx.yearGroup = "Year 4";
repairCtx.subject = "History";
repairCtx.lessonBrief.teacherIntent.requiredEvidence = "Pupils can explain why one change in the reign mattered.";
repairCtx.lessonBrief.teacherIntent.focusConcepts = ["Reformation"];
repairCtx.lessonBrief.requiredEvidence = repairCtx.lessonBrief.teacherIntent.requiredEvidence;
repairCtx.lessonBrief.focusConcepts = ["Reformation"];
var repair = Brain.planRepairBrief(repairCtx, ["The key knowledge states the outcome, not the reason."], {
  learningObjective: henryGoal,
  subject: "History",
  topic: "Henry VIII",
  yearGroup: "Year 4",
  keyKnowledge: [
    "Henry VIII was the King of England from 1509 to 1547.",
    "His reign led to significant changes in religion and government in England."
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
});
var repairUser = JSON.parse(repair.user);
assert.strictEqual(repairUser.learningGoal, henryGoal);
assert.strictEqual(repairUser.yearGroup, "Year 4");
assert.strictEqual(repairUser.subject, "History");
assert.strictEqual(repairUser.requiredEvidence, "Pupils can explain why one change in the reign mattered.");
assert.deepStrictEqual(repairUser.focusConcepts, ["Reformation"]);
assert.strictEqual(repairUser.keyKnowledge.length, 2);
assert.ok(repairUser.failure.join(" ").indexOf("outcome, not the reason") !== -1);
assert.ok(repairUser.relationshipRequired.join(" ").indexOf("significance:") === 0);
assert.ok(repair.user.indexOf("Replace only the insufficient keyKnowledge") !== -1);
assert.ok(repair.user.indexOf("Copy lessonArc exactly") !== -1);
assert.strictEqual(repair.user.indexOf("Say that reason with because"), -1);
assert.strictEqual(repair.system, Brain.planBrief(repairCtx).system);

var plantRepair = Brain.planRepairBrief(plant, ["The key knowledge names the parts, not the change."], {
  learningObjective: plantGoal,
  keyKnowledge: ["Plants use sunlight to make food.", "Plants take in carbon dioxide from the air."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
});
var plantUser = JSON.parse(plantRepair.user);
assert.ok(plantUser.relationshipRequired.join(" ").indexOf("process:") === 0);
assert.strictEqual(plantUser.relationshipRequired.join(" ").indexOf("significance:"), -1);

function contributionPlan(year, subject, sentence, goal, knowledge) {
  return Brain.normalisePlan({
    learningObjective: goal,
    subject: subject,
    topic: goal,
    keyKnowledge: knowledge,
    lessonArc: arc
  }, {
    yearGroup: year,
    subject: subject,
    lessonText: sentence,
    topic: goal,
    lessonBrief: {
      intent: "process",
      rawRequest: sentence,
      learningGoal: goal,
      teacherIntent: { ok: true, learningGoal: goal, requiredEvidence: goal }
    }
  });
}

function teachMoves(plan, year) {
  var frame = { yearGroup: year, subject: plan.subject, topic: plan.topic, lessonPlan: plan };
  var slots = Brain.planBeats(Brain.lessonSkeleton(plan, frame), plan, year);
  var teach = slots.filter(function (slot) { return slot.id === "teach"; })[0];
  return (teach.beats || []).map(function (beat) { return beat.move; });
}

var swim = "A shark's streamlined body reduces water resistance, helping it swim more easily.";
var afloat = "Buoyancy helps sharks stay afloat while swimming.";
var fins = "Shark anatomy includes fins and a tail that aid in movement.";
var sharkAsk = "Teach children how a shark's body helps it swim.";
var sharkGoal = "Understand how a shark's body helps it swim.";
var sharkShallow = contributionPlan("Year 1", "Science", sharkAsk, sharkGoal, [
  "Sharks have a streamlined shape that reduces water resistance.",
  afloat,
  fins
]);
assert.strictEqual(sharkShallow.ok, false);
assert.ok((sharkShallow.issues || []).join(" ").indexOf("outcome, not the reason") !== -1);
var sharkKept = contributionPlan("Year 1", "Science", sharkAsk, sharkGoal, [afloat, swim, fins]);
assert.strictEqual(sharkKept.ok, true, (sharkKept.issues || []).join("; "));
assert.deepStrictEqual(sharkKept.plan.keyKnowledge, [swim]);
assert.strictEqual(sharkKept.plan.knowledge[0].knowledgeType, "reason");
assert.ok(sharkKept.plan.droppedKnowledge.indexOf(afloat) !== -1);
assert.ok(sharkKept.plan.droppedKnowledge.indexOf(fins) !== -1);
var sharkMoves = teachMoves(sharkKept.plan, "Year 1");
assert.ok(sharkMoves.indexOf("name") !== -1);
assert.ok(sharkMoves.indexOf("explain") !== -1);
var sharkBrief = Brain.contentBrief({ yearGroup: "Year 1", subject: "Science", lessonPlan: sharkKept.plan, lessonSkeleton: Brain.planBeats(Brain.lessonSkeleton(sharkKept.plan, { yearGroup: "Year 1", subject: "Science" }), sharkKept.plan, "Year 1") }, sharkKept.plan, null);
assert.strictEqual(sharkBrief.user.indexOf("Buoyancy"), -1);
assert.strictEqual(sharkBrief.user.indexOf("fins"), -1);
var labeledSwim = contributionPlan("Year 1", "Science", sharkAsk, sharkGoal, [
  { text: swim, knowledgeType: "fact" },
  afloat
]);
assert.strictEqual(labeledSwim.ok, true, (labeledSwim.issues || []).join("; "));
assert.strictEqual(labeledSwim.plan.knowledge[0].knowledgeType, "reason");

var rootGoal = "Understand how a plant's roots help it drink.";
var roots = contributionPlan("Year 2", "Science", "Teach children how a plant's roots help it drink.", rootGoal, [
  "Leaves are green.",
  "Roots take in water, which helps the plant drink.",
  "Flowers look bright in summer."
]);
assert.strictEqual(roots.ok, true, (roots.issues || []).join("; "));
assert.deepStrictEqual(roots.plan.keyKnowledge, ["Roots take in water, which helps the plant drink."]);
assert.ok(teachMoves(roots.plan, "Year 2").indexOf("explain") !== -1);

var fireGoal = "Understand why the Great Fire spread so quickly.";
var fire = contributionPlan("Year 4", "History", "Teach children why the Great Fire spread so quickly.", fireGoal, [
  "The Great Fire happened in 1666.",
  "The fire spread quickly because the wooden houses stood close together.",
  "London had a lot of churches."
]);
assert.strictEqual(fire.ok, true, (fire.issues || []).join("; "));
assert.deepStrictEqual(fire.plan.keyKnowledge, ["The fire spread quickly because the wooden houses stood close together."]);

var riverEffect = "Understand how a river affects the landscape.";
var riverLesson = contributionPlan("Year 5", "Geography", "Teach children how a river affects the landscape.", riverEffect, [
  "Fish live in many rivers.",
  "A fast river cuts into the rock, which makes the landscape deeper.",
  "Rivers are drawn in blue on a map."
]);
assert.strictEqual(riverLesson.ok, true, (riverLesson.issues || []).join("; "));
assert.deepStrictEqual(riverLesson.plan.keyKnowledge, ["A fast river cuts into the rock, which makes the landscape deeper."]);

var adjectiveGoal = "Understand how an adjective changes a sentence.";
var adjective = contributionPlan("Year 3", "English", "Teach children how an adjective changes a sentence.", adjectiveGoal, [
  "A noun is a naming word.",
  "An adjective changes the noun so that the sentence tells the reader more."
]);
assert.strictEqual(adjective.ok, true, (adjective.issues || []).join("; "));
assert.deepStrictEqual(adjective.plan.keyKnowledge, ["An adjective changes the noun so that the sentence tells the reader more."]);

var regroupGoal = "Understand how regrouping helps when subtracting.";
var regroup = contributionPlan("Year 4", "Maths", "Teach children how regrouping helps when subtracting.", regroupGoal, [
  "A hundred is made of ten tens.",
  "Regrouping turns one ten into ten ones so a larger one can be subtracted."
]);
assert.strictEqual(regroup.ok, true, (regroup.issues || []).join("; "));
assert.deepStrictEqual(regroup.plan.keyKnowledge, ["Regrouping turns one ten into ten ones so a larger one can be subtracted."]);

console.log("knowledge-depth tests passed");
