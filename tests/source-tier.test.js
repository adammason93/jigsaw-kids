"use strict";

// Source tiers (patch 6). Authoritative sources (museums, universities, scientific organisations,
// government bodies, established educational publishers) are evidence. Wikipedia and Simple
// English Wikipedia are discovery only: they may help find pages, and the authoritative pages
// they cite are followed, but their text never supports a pupil-facing fact.
// Negative live case: run 9 taught "The Ornithischia had a flexible lower-jaw joint" from
// simple.wikipedia.org/wiki/Dinosaur (S1-P15). No network and no paid call.

var assert = require("assert");
var R = require("../js/source-research.js");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");

function copy(v) { return JSON.parse(JSON.stringify(v)); }

// ---- positive: authoritative hosts are evidence ----
[
  "https://www.nhm.ac.uk/discover/what-are-dinosaurs.html",
  "https://www.amnh.org/dinosaurs/dinosaur-facts",
  "https://naturalhistory.si.edu/research/paleobiology",
  "https://ucmp.berkeley.edu/diapsids/dinosaur.html",
  "https://www.oum.ox.ac.uk/learning/pdfs/dinosaurs.html",
  "https://www.bbc.co.uk/bitesize/topics/dinosaurs",
  "https://www.britannica.com/animal/dinosaur",
  "https://kids.nationalgeographic.com/animals/prehistoric/facts/iguanodon",
  "https://www.metoffice.gov.uk/weather/learn-about/weather"
].forEach(function (url) {
  var t = R.sourceTier(url);
  assert.strictEqual(t.tier, "evidence", url + " " + JSON.stringify(t));
  assert.strictEqual(R.isEvidenceUrl(url), true, url);
});
assert.strictEqual(R.sourceTier("https://www.nhm.ac.uk/discover/what-are-dinosaurs.html").kind, "museum");
assert.strictEqual(R.sourceTier("https://www.britannica.com/animal/dinosaur").kind, "publisher");

// ---- negative: every wiki host is discovery only; off-list hosts are refused ----
["https://simple.wikipedia.org/wiki/Dinosaur", "https://en.wikipedia.org/wiki/Dinosaur", "https://de.wikipedia.org/wiki/Dinosaurier"].forEach(function (url) {
  var t = R.sourceTier(url, R.SOURCE_ALLOWLIST.concat([{ id: "any-wiki", domain: "wikipedia.org", tier: "evidence" }]));
  assert.strictEqual(t.tier, "discovery", url + " " + JSON.stringify(t));
  assert.strictEqual(R.isEvidenceUrl(url), false, url);
});
assert.strictEqual(R.sourceTier("https://www.dinofacts.example.com/teeth").tier, "refused");
assert.strictEqual(R.sourceTier("https://www.bbc.co.uk/sport/123").tier, "refused");

// ---- brain: a claim citing a discovery-tier passage is rejected as SOURCE_NOT_EVIDENCE ----
var ctx = {
  yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
  lessonBrief: { teacherIntent: run9.intent },
  researchEvidence: copy(run9.research)
};
var wikiPassage = ctx.researchEvidence.passages.filter(function (p) { return /wikipedia/.test(p.url); })[0];
var nhmPassage = ctx.researchEvidence.passages.filter(function (p) { return /nhm\.ac\.uk/.test(p.url); })[0];
assert.ok(wikiPassage && nhmPassage, "fixture has one wiki and one NHM passage");
var raw = {
  status: "usable",
  claims: [
    { text: "The Ornithischia had a flexible lower-jaw joint.", kind: "fact", depth: "concrete", provenance: "retrieved", sourceRef: [wikiPassage.id], quote: "the upper skull of the Ornithischia is more solid, and the joint connecting the lower jaw is more flexible.", ageFit: { from: 3, to: 6 } },
    { text: "Dinosaurs had straight back legs positioned underneath their bodies.", kind: "fact", depth: "concrete", provenance: "retrieved", sourceRef: [nhmPassage.id], quote: "they had straight back legs, perpendicular to their bodies.", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: []
};
var pack = Brain.normaliseKnowledgePack(copy(raw), ctx);
var rejected = (pack.sourceAudit && pack.sourceAudit.rejected) || [];
var wikiReject = rejected.filter(function (r) { return /Ornithischia/.test(r.text); })[0];
assert.ok(wikiReject, "the Simple Wikipedia claim is rejected: " + JSON.stringify(rejected));
assert.strictEqual(wikiReject.reason, "SOURCE_NOT_EVIDENCE");
assert.ok(pack.claims.some(function (c) { return /straight back legs/.test(c.text) && c.quoteVerified; }), "the NHM claim is admitted");
assert.ok(!pack.claims.some(function (c) { return /Ornithischia/.test(c.text); }));
// The repair feedback says why and what to do.
var feedback = Brain.sourceRepairFeedback(pack, { status: "usable" }, { pairs: [] }, ctx);
assert.ok(feedback.some(function (row) { return row.problem === "SOURCE_NOT_EVIDENCE" && /discovery-only/.test(row.fix); }));
// The pack brief never shows a discovery-tier passage as a source.
var brief = JSON.parse(Brain.knowledgePackBrief(ctx).user);
assert.ok(brief.sources.length >= 1);
assert.ok(brief.sources.every(function (s) { return !/wikipedia/.test(s.url); }), JSON.stringify(brief.sources.map(function (s) { return s.url; })));

// ---- research: Wikipedia is read for discovery and its cited authoritative pages are fetched ----
function res(body, opts) {
  opts = opts || {};
  return Promise.resolve({ ok: (opts.status || 200) < 300, status: opts.status || 200, url: opts.url, headers: { get: function () { return "text/html"; } },
    json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); } });
}
var page = "<html><head><title>Dinosaur legs | Museum</title></head><body><main><p>Dinosaurs had straight back legs under their bodies. This allowed them to use less energy to move than reptiles with a sprawling stance.</p></main></body></html>";
var fetched = [];
function stubFetch(url) {
  url = String(url);
  fetched.push(url);
  if (url.indexOf("api.openai.com") !== -1) throw new Error("no paid call expected");
  if (url.indexOf("simple.wikipedia.org/w/api.php") !== -1) {
    assert.ok(/extlinks/.test(url), "the discovery read asks for the article's cited links");
    return res({ query: { pages: [{ title: "Dinosaur", extract: "Dinosaurs were reptiles.\n\nThe joint connecting the lower jaw is more flexible in ornithischian dinosaurs, which helped them grind food.", extlinks: [{ url: "https://www.amnh.org/dinosaurs/dinosaur-anatomy" }, { url: "https://www.fansite.example.com/dinosaurs" }, { url: "//ucmp.berkeley.edu/diapsids/dinosaur.html" }] }] } });
  }
  if (url.indexOf("https://www.amnh.org/") === 0 || url.indexOf("https://ucmp.berkeley.edu/") === 0 || url.indexOf("https://www.nhm.ac.uk/") === 0) return res(page, { url: url });
  return res({}, { status: 404 });
}
var provider = { id: "fake", paid: false, search: function () { return Promise.resolve({ calls: 1, candidates: [
  { url: "https://simple.wikipedia.org/wiki/Dinosaur", title: "Dinosaur", provider: "fake" },
  { url: "https://www.nhm.ac.uk/discover/what-are-dinosaurs.html", title: "What are dinosaurs?", provider: "fake" }
] }); } };
R.researchTopic({ topic: "Dinosaurs", yearGroup: "Year 3", learningGoal: "how dinosaurs adapted" }, { fetch: stubFetch, providers: [provider], maxSources: 6 }).then(function (record) {
  var urls = record.sources.map(function (s) { return s.url; });
  assert.ok(urls.indexOf("https://www.nhm.ac.uk/discover/what-are-dinosaurs.html") !== -1);
  assert.ok(urls.indexOf("https://www.amnh.org/dinosaurs/dinosaur-anatomy") !== -1, "the cited museum page is followed: " + urls.join(", "));
  assert.ok(urls.indexOf("https://ucmp.berkeley.edu/diapsids/dinosaur.html") !== -1, "protocol-relative university link is followed");
  assert.ok(!urls.some(function (u) { return /wikipedia|fansite/.test(u); }));
  assert.strictEqual(record.discoverySources.length, 1);
  assert.strictEqual(record.discoverySources[0].citedEvidenceLinks, 2);
  assert.ok(record.passages.length >= 3);
  assert.ok(record.passages.every(function (p) { return p.tier === "evidence"; }));
  assert.ok(!record.passages.some(function (p) { return /ornithischian/i.test(p.text); }), "no Wikipedia text became a passage");
  assert.ok(record.selectedPassageIds.every(function (id) { return /^S\d+-P\d\d$/.test(id); }));
  assert.ok(record.discovered.some(function (d) { return d.provider === "wikipedia-reference" && /amnh/.test(d.url); }));
  console.log("source-tier tests passed");
}).catch(function (error) { console.error(error); process.exit(1); });
