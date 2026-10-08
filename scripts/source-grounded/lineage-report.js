"use strict";

/* Offline, no paid calls. For a finished run directory (generate.js + finish), rebuild the boot's
   context from the saved outputs, run the ID lineage (js/lesson-brain.js unitLineage) on the
   lesson, and write:
     DIR/lesson/lesson.json + lesson.html   (adds the lineage table and remaining warnings; ids only, no text change)
     DIR/sources/claim-map.json             (every claim the plan cites: unit, quote, URL, entailment)
     DIR/lesson/ID_TRACE.md                 (pack unit -> plan strand -> beats -> questions)
   Usage: node scripts/source-grounded/lineage-report.js --out DIR [--warning "text" ...] */

var fs = require("fs");
var path = require("path");
var Brain = require("../../js/lesson-brain.js");
var Finish = require("./finish.js");

var argv = process.argv.slice(2);
var outDir = path.resolve(argv[argv.indexOf("--out") + 1]);
var warnings = [];
argv.forEach(function (a, i) { if (a === "--warning" && argv[i + 1]) warnings.push(argv[i + 1]); });
var trace = JSON.parse(fs.readFileSync(path.join(outDir, "lesson/generate-trace.json"), "utf8"));
var kp = JSON.parse(fs.readFileSync(path.join(outDir, "sources/knowledge-pack.json"), "utf8"));
var research = JSON.parse(fs.readFileSync(path.join(outDir, "sources/research-record.json"), "utf8"));
var lessonPath = path.join(outDir, "lesson/lesson.json");
var lesson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
var req = trace.request || {};
var intent = trace.intent || {};
var ctx = {
  yearGroup: req.yearGroup, subject: req.subject, topic: req.topic, requestedMinutes: req.requestedMinutes, lessonText: req.lessonText,
  lessonBrief: { intent: "explain", rawRequest: req.lessonText, learningGoal: intent.learningGoal, requiredEvidence: intent.requiredEvidence, focusConcepts: intent.focusConcepts, teacherIntent: intent },
  researchEvidence: research, knowledgePack: kp.normalisedPack, knowledgeSelection: kp.selection
};
var lineage = Brain.unitLineage(lesson.adventure, ctx);
lesson.lineage = lineage;
lesson.warnings = warnings;
var byId = {};
(kp.normalisedPack.claims || []).forEach(function (c) { byId[c.claimId] = c; });
var units = Brain.readyUnits(Brain.assessPackReadiness(ctx.knowledgePack, ctx.knowledgeSelection, ctx));
var claimMap = (lesson.adventure.lessonPlan.learningMap || []).map(function (p) {
  return {
    point: p.id, knowledge: p.knowledge, role: p.role, unitIds: p.unitIds || [],
    claims: (p.claimIds || []).map(function (id) { var c = byId[id] || {}; return { claimId: id, text: c.text || "", quote: c.sourceQuote || "", url: (c.sourceUrls || [])[0] || "", sourceRef: c.sourceRef || c.sourceRefs || "", quoteVerified: !!c.quoteVerified, entailment: c.entailment || "", label: "quote-verified + automated entailment check (not human-verified)" }; })
  };
});
fs.mkdirSync(path.join(outDir, "sources"), { recursive: true });
fs.writeFileSync(path.join(outDir, "sources/claim-map.json"), JSON.stringify({ units: units, points: claimMap }, null, 2));
fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2));
fs.writeFileSync(path.join(outDir, "lesson/lesson.html"), Finish.renderHtml(lesson));
var md = ["# ID trace: pack unit → plan strand → beats → questions", "", "Computed in code from the saved run outputs. Lineage follows ids only; it is automated and provisional, not human review.", "",
  "| Unit | Feature (elementClaimId) | Explanation (explanationClaimId) | Plan points | Strand | Teaching beats that state the job | All beats citing the unit | Questions | Result |", "|---|---|---|---|---|---|---|---|---|"];
lineage.units.forEach(function (u) {
  md.push("| " + u.unitId + " | " + u.feature + " (`" + u.elementClaimId + "`) | `" + u.explanationClaimId + "` | " + u.planPoints.join(", ") + " | " + u.strand + " | " + u.explainBeats.join(", ") + " | " + u.beats.join(", ") + " | " + u.questions.join(", ") + " | " + (u.ok ? "ok" : u.problems.join("; ")) + " |");
});
md.push("", "Issues: " + (lineage.issues.length ? lineage.issues.join(" ") : "none"));
fs.writeFileSync(path.join(outDir, "lesson/ID_TRACE.md"), md.join("\n") + "\n");
console.log(JSON.stringify({ issues: lineage.issues, units: lineage.units.map(function (u) { return u.unitId + ":" + (u.ok ? "ok" : "fail"); }) }));
