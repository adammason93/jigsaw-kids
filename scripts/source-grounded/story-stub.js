"use strict";
/* Offline stub transport for scripts/source-grounded/story.js --stub. Mechanism test only: it
   replays saved research passages and answers each model call with text built from those passages
   (quotes copied verbatim), so the pipeline, adventure, player and pages can be exercised with no
   paid call. Stub output is never lesson content. */
var fs = require("fs");
var path = require("path");
var Research = require("../../js/source-research.js");
var Brain = require("../../js/lesson-brain.js");

var IDEAS = [
  { id: "i1", title: "Fossils are evidence", question: "How do fossils tell us about the past?", curriculumLink: "Year 3 Science: Rocks (fossils)", linksTo: "", searchQueries: ["how are fossils formed"], keywords: ["fossil", "bones", "rock", "formed"] },
  { id: "i2", title: "What dinosaurs were", question: "What makes an animal a dinosaur?", curriculumLink: "Year 3 Science: Animals", linksTo: "i1", searchQueries: ["what are dinosaurs"], keywords: ["reptiles", "legs", "dinosaurs"] },
  { id: "i3", title: "Clues in teeth and footprints", question: "What can teeth and footprints tell us?", curriculumLink: "Year 3 Science: Animals (nutrition)", linksTo: "i2", searchQueries: ["dinosaur footprints"], keywords: ["teeth", "footprints", "tracks"] }
];

function mergedRecord(files) {
  var sources = [], passages = [], seen = {}, n = 0;
  files.forEach(function (file) {
    if (!fs.existsSync(file)) return;
    var r = JSON.parse(fs.readFileSync(file, "utf8"));
    (r.sources || []).forEach(function (s) {
      if (seen[s.url] || s.tier !== "evidence") return;
      seen[s.url] = 1; n += 1;
      var sid = "S" + n;
      sources.push(Object.assign({}, s, { sourceId: sid }));
      (r.passages || []).filter(function (p) { return p.sourceId === s.sourceId; }).forEach(function (p, i) { passages.push(Object.assign({}, p, { id: sid + "-P" + (i < 9 ? "0" : "") + (i + 1), sourceId: sid, tier: "evidence" })); });
    });
  });
  var record = { version: 2, mode: "story-research-stub", providers: [{ id: "stub-saved-passages" }], discovered: [], sources: sources, refused: [], passages: passages, discoverySources: [], ideaPassageIds: {} };
  IDEAS.forEach(function (idea) { record.ideaPassageIds[idea.id] = Research.rankPassages(passages, { topic: "dinosaurs", learningGoal: idea.question, requiredEvidence: idea.keywords.join(" "), focusConcepts: idea.keywords }, { maxPassages: 6, maxPerSource: 2, maxChars: 6000 }).map(function (r) { return r.id; }); });
  return record;
}

function firstQuote(text) {
  var parts = String(text).split(/(?<=[.!?])\s+/).filter(function (s) { var w = s.split(/\s+/).length; return w >= 6 && w <= 30 && !/["“”]/.test(s); });
  return parts[0] || "";
}

function reply(brief, opts) {
  var user = JSON.parse(brief.user);
  var p = opts.purpose;
  if (p === "knowledge") {
    var out = { ideas: [], vocabulary: [] };
    user.ideas.forEach(function (idea) {
      var mine = user.sources.filter(function (s) { return s.forIdeas.indexOf(idea.id) !== -1; }).slice(0, 2);
      out.ideas.push({ id: idea.id, claims: mine.map(function (s, i) { var q = firstQuote(s.text); return { text: q, role: ["explanation", "example", "comparison"][i], sourceRef: [s.id], quote: q }; }).filter(function (c) { return c.quote; }) });
    });
    return out;
  }
  if (p === "entail") return { results: user.items.map(function (i) { return { claimId: i.claimId, verdict: "supported", missing: "", linkQuote: i.quote, wording: i.wordsNotInSource || [], addedFacts: [] }; }) };
  if (p === "story") {
    var k = user.knowledge;
    var scenes = [{ id: "opening", kind: "opening", title: "Stub opening", image: { description: "Two children in a museum hall at night.", pastLife: [] }, beats: [{ role: "story", speaker: "Narrator", text: "Stub story line one.", claimIds: [] }, { role: "story", speaker: "Ava", text: "We have to fix the exhibit by morning!", claimIds: [] }] }];
    k.forEach(function (idea, n) {
      var c = idea.claims;
      var beats = [{ role: "problem", speaker: "Ava", text: "Stub problem for " + idea.title + ".", claimIds: [] }, { role: "discovery", speaker: "Narrator", text: "Stub discovery line.", claimIds: [] }];
      c.forEach(function (cl, i) { beats.push({ role: ["explain", "example", "compare"][i] || "explain", speaker: "Narrator", text: cl.text, claimIds: [cl.id] }); });
      beats.push({ role: "use", speaker: "Leo", text: "Stub use line.", claimIds: [] });
      var sc = { id: "s" + (n + 1), kind: "idea", ideaId: idea.id, title: "Stub " + idea.title, image: { description: "Children studying a fossil.", pastLife: [] }, teachingImage: { subject: "fossil", feature: "shape", view: "close-up", comparedWith: "", claimIds: [c[0].id] }, beats: beats, activity: null };
      if (n < 2) sc.activity = { instruction: "Stub: which clue helps?", newCase: "Stub new example.", choices: [{ text: "Right clue", correct: true, feedback: c[0].text, claimIds: [c[0].id] }, { text: "Wrong clue", correct: false, feedback: c[0].text, claimIds: [c[0].id] }, { text: "Other clue", correct: false, feedback: c[0].text, claimIds: [c[0].id] }], successText: "Stub success.", claimIds: [c[0].id] };
      scenes.push(sc);
    });
    scenes.push({ id: "climax", kind: "climax", title: "Stub climax", image: { description: "The children rebuild the display.", pastLife: [] }, beats: [{ role: "story", speaker: "Narrator", text: "Stub climax line.", claimIds: [] }] });
    var quiz = [];
    for (var q = 0; q < 6; q++) { var idea = k[q % k.length]; quiz.push({ prompt: "Stub question " + (q + 1) + "?", choices: ["Right", "Wrong A", "Wrong B"], correct: "Right", explain: idea.claims[0].text, ideaId: idea.id, claimIds: [idea.claims[0].id] }); }
    return { title: "Stub story", characters: [{ name: "Ava", role: "explorer", look: "red jumper" }, { name: "Leo", role: "friend", look: "glasses" }], setting: "A museum", goal: "Stub goal", stakes: "Stub stakes", scenes: scenes, quiz: quiz, resolution: [{ role: "story", speaker: "Narrator", text: "Stub resolution.", claimIds: [] }], recap: k.map(function (idea) { return { text: idea.claims[0].text, claimIds: [idea.claims[0].id] }; }) };
  }
  if (/^check/.test(p)) return { results: user.items.map(function (i) { var cited = i.cited.length; return { id: i.id, factual: !!cited, verdict: cited ? "supported" : "story", problem: "", wording: i.wordsNotInSource || [], story: [], addedFacts: [] }; }) };
  if (p === "quality") return { story: { rating: 3, notes: ["stub review"] }, vocabulary: [], questions: [], activities: [], depth: [], periods: [] };
  return {};
}

function ports(request, recordFile) {
  var base = "/workspace/wondii-canary/source-grounded-y3/run-6/";
  var files = recordFile ? recordFile.split(",") : [base + "run10/sources/research-record.json", base + "run11/sources/research-record.json", base + "run12/sources/research-record.json"];
  return { ideas: IDEAS, record: mergedRecord(files), callModel: function (brief, opts) { return Promise.resolve(reply(brief, opts)); } };
}

module.exports = { ports: ports, mergedRecord: mergedRecord, IDEAS: IDEAS };
