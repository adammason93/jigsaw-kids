"use strict";

// Source research module: allowlist, page extraction, passage ids, ranking, and the rule
// that search snippets never become evidence. No network and no paid call.

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var R = require("../js/source-research.js");

// Regression (live run 1 and probe): gpt-4o-mini and gpt-4.1-mini reject web_search domain filters,
// so the search provider defaults to gpt-6-luna (low reasoning) and keeps the allowlist filter.
var searchProvider = R.openaiWebSearchProvider({ apiKey: "k" });
assert.strictEqual(searchProvider.model, "gpt-6-luna");
assert.strictEqual(searchProvider.paid, true);
// Focused searches (live run 3, 6 Oct 2026: one broad search returned NHM pages only). One call
// per group of teaching sites, each filtered to that group's allowlisted domains, one tool call
// each, results interleaved so every group's best page is queued early.
var sentBodies = [];
searchProvider.search(["Dinosaurs"], { fetch: function (url, init) {
  var body = JSON.parse(init.body);
  sentBodies.push(body);
  var domain = body.tools[0].filters.allowed_domains[0];
  var out = domain === "bbc.co.uk" ? { error: { message: "boom" } } : { output: [{ type: "web_search_call", action: { sources: [{ url: "https://www." + domain + "/a" }, { url: "https://www." + domain + "/b" }] } }], usage: {} };
  return Promise.resolve({ ok: domain !== "bbc.co.uk", status: domain === "bbc.co.uk" ? 500 : 200, text: function () { return Promise.resolve(JSON.stringify(out)); } });
} }, { topic: "Dinosaurs", yearGroup: "Year 3", requiredEvidence: "explain how a feature helped" }).then(function (result) {
  assert.strictEqual(sentBodies.length, 3);
  assert.deepStrictEqual(sentBodies.map(function (b) { return b.tools[0].filters.allowed_domains; }), [["nhm.ac.uk"], ["bbc.co.uk"], ["britannica.com", "kids.nationalgeographic.com"]]);
  sentBodies.forEach(function (body) {
    assert.ok(body.tools[0].filters.allowed_domains.every(function (d) { return R.allowedDomains().indexOf(d) !== -1; }));
    assert.strictEqual(body.model, "gpt-6-luna");
    assert.deepStrictEqual(body.reasoning, { effort: "low" });
    assert.strictEqual(body.max_tool_calls, 1);
    assert.ok(/explain how or why/.test(body.input));
  });
  assert.ok(/how scientists know/.test(sentBodies[0].input));
  assert.ok(/bitesize/.test(sentBodies[1].input));
  // One failed group does not lose the others; order is round-robin.
  assert.deepStrictEqual(result.candidates.map(function (c) { return c.url; }), ["https://www.nhm.ac.uk/a", "https://www.britannica.com/a", "https://www.nhm.ac.uk/b", "https://www.britannica.com/b"]);
  assert.strictEqual(result.calls, 3);
  assert.strictEqual(result.error, "");
  assert.strictEqual(result.candidates[0].snippetIgnored, true);
});
// The single broad search is still available and keeps the whole allowlist filter.
var broadBody = null;
R.openaiWebSearchProvider({ apiKey: "k", focusGroups: false }).search(["Dinosaurs"], { fetch: function (url, init) { broadBody = JSON.parse(init.body); return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(JSON.stringify({ output: [], usage: {} })); } }); } }, { topic: "Dinosaurs", yearGroup: "Year 3" }).then(function () {
  assert.deepStrictEqual(broadBody.tools[0].filters.allowed_domains, R.allowedDomains());
  assert.strictEqual(broadBody.max_tool_calls, 3);
});

// Allowlist: one config list, https only, subdomains of allowed hosts, BBC only under /bitesize.
assert.ok(Array.isArray(R.SOURCE_ALLOWLIST) && R.SOURCE_ALLOWLIST.length >= 9);
[
  "https://www.nhm.ac.uk/discover/dinosaurs.html",
  "https://www.bbc.co.uk/bitesize/topics/zt8wy4j",
  "https://www.thenational.academy/pupils/lessons/fossils",
  "https://www.britannica.com/animal/dinosaur",
  "https://kids.nationalgeographic.com/animals/prehistoric/facts/tyrannosaurus-rex",
  "https://simple.wikipedia.org/wiki/Dinosaur",
  "https://en.wikipedia.org/wiki/Fossil",
  "https://www.nationalarchives.gov.uk/education/",
  "https://www.ucl.ac.uk/earth-sciences/dinosaurs"
].forEach(function (url) { assert.strictEqual(R.isAllowedUrl(url).ok, true, url); });
[
  "http://www.nhm.ac.uk/discover/dinosaurs.html",
  "https://www.bbc.co.uk/news/science-environment-1",
  "https://en.wikipedia.org/wiki/Talk:Dinosaur",
  "https://en.wikipedia.org/w/index.php?title=Dinosaur",
  "https://nhm.ac.uk.example.com/discover",
  "https://evilnhm.ac.uk.com/x",
  "https://www.dinosaurfacts-for-kids.com/trex",
  "not a url"
].forEach(function (url) { assert.strictEqual(R.isAllowedUrl(url).ok, false, url); });
assert.ok(R.allowedDomains().indexOf("nhm.ac.uk") !== -1);
assert.ok(R.allowedDomains().indexOf("bbc.co.uk") !== -1);

// HTML extraction keeps headings and prose and drops scripts, nav, figures, tables, footers and boilerplate.
var html = fs.readFileSync(path.join(__dirname, "fixtures/source-research/museum-page.html"), "utf8");
var blocks = R.htmlBlocks(html);
var joined = blocks.map(function (b) { return b.text; }).join(" | ");
assert.ok(/Scientists study fossil teeth/.test(joined));
assert.ok(/leaf-shaped teeth, which let them strip and grind tough plants/.test(joined));
assert.ok(blocks.some(function (b) { return b.heading && b.text === "Plant-eaters"; }));
["tracking", "Sign in", "Image caption", "cookies", "table row", "All rights reserved", "Short"].forEach(function (bad) {
  assert.strictEqual(joined.indexOf(bad), -1, bad);
});

var passages = R.passagesFromBlocks(blocks, { sourceId: "S2", url: "https://www.nhm.ac.uk/x", title: "T", retrievedAt: "2026-10-06T10:00:00.000Z" });
assert.ok(passages.length >= 1);
passages.forEach(function (p, i) {
  assert.strictEqual(p.id, "S2-P" + (i + 1 < 10 ? "0" : "") + (i + 1));
  assert.strictEqual(p.url, "https://www.nhm.ac.uk/x");
  assert.strictEqual(p.retrievedAt, "2026-10-06T10:00:00.000Z");
  assert.ok(p.title && p.text);
});
// A paragraph is never split across passages.
assert.ok(passages.some(function (p) { return p.text.indexOf("Sharp, curved teeth with jagged edges belonged to meat-eaters, because those teeth could slice through flesh.") !== -1; }));

// Wikipedia plain-text extract: section headings kept, reference sections dropped.
var wiki = "Dinosaurs were reptiles that lived long ago and laid eggs in nests on the ground.\n\n== Teeth ==\nMeat-eating dinosaurs had sharp teeth, which helped them to bite and tear meat from other animals.\n\n== References ==\nSmith, J. (2001). A book about dinosaurs that should not be evidence at all.\n\n== Other websites ==\nA link list that should be dropped from the passages.";
var wb = R.wikiBlocks(wiki);
var wtext = wb.map(function (b) { return b.text; }).join(" | ");
assert.ok(/sharp teeth, which helped them/.test(wtext));
assert.strictEqual(/Smith, J\./.test(wtext), false);
assert.strictEqual(/link list/.test(wtext), false);

// Queries come from the topic and the intent objective.
var request = { topic: "Dinosaurs", yearGroup: "Year 3", lessonText: "Teach Year 3 about dinosaurs", learningGoal: "Pupils will understand how teeth and body parts helped dinosaurs survive.", focusConcepts: ["dinosaur teeth"] };
var queries = R.buildQueries(request);
assert.strictEqual(queries[0], "Dinosaurs");
assert.ok(queries.length >= 2 && queries.length <= 3);

// Ranking is lexical, capped per source, and ignores passages with no topic overlap.
var pool = [
  { id: "S1-P01", sourceId: "S1", text: "The weather today is sunny and warm across the whole country.", section: "" },
  { id: "S1-P02", sourceId: "S1", text: "Dinosaur teeth tell scientists what dinosaurs ate, because sharp teeth cut meat and flat teeth ground plants.", section: "Teeth" },
  { id: "S2-P01", sourceId: "S2", text: "Dinosaurs laid eggs.", section: "" }
];
var ranked = R.rankPassages(pool, request).map(function (r) { return r.id; });
assert.strictEqual(ranked[0], "S1-P02");
assert.strictEqual(ranked.indexOf("S1-P01"), -1);
assert.strictEqual(R.rankPassages(pool, request, { maxPerSource: 1 }).filter(function (r) { return /^S1/.test(r.id); }).length, 1);

// Feature-function ranking (live runs, 6 Oct 2026: most chosen passages were definitions,
// extinction, or a craft page). A sentence naming a body part and what it did ranks above a
// definition with more topic words; a craft/activity page ranks below both.
var request2 = { topic: "Dinosaurs", yearGroup: "Year 3", learningGoal: "Pupils will understand how dinosaurs adapted to their environments.", focusConcepts: ["adaptation"] };
var pool2 = [
  { id: "S1-P01", sourceId: "S1", text: "Dinosaurs are a group of reptiles. The word dinosaur means terrible lizard. Dinosaurs dominated the land for over 140 million years before dinosaurs died out.", section: "" },
  { id: "S2-P01", sourceId: "S2", text: "Stegosaurus had four long spikes on its tail. It used its tail to defend itself, so it could swing the spikes at a dinosaur that attacked it.", section: "" },
  { id: "S3-P01", sourceId: "S3", text: "Make your own dinosaur. You will need cardboard, glue and scissors. Cut out the dinosaur legs and tail and stick them on.", section: "" }
];
var ranked2 = R.rankPassages(pool2, request2);
assert.deepStrictEqual(ranked2.map(function (r) { return r.id; }).slice(0, 2), ["S2-P01", "S1-P01"]);
assert.ok(ranked2[0].featureLinks >= 1);
assert.strictEqual(R.featureFunctionSentences("Dinosaurs lived for 165 million years."), 0);
assert.strictEqual(R.featureFunctionSentences("Long necks let sauropods reach high leaves."), 1);

// End to end with a stubbed network: snippets are ignored, off-list and film pages are refused,
// a redirect off the allowlist is refused, and only fetched page text becomes passages.
function res(body, opts) {
  opts = opts || {};
  return Promise.resolve({
    ok: (opts.status || 200) < 300, status: opts.status || 200, url: opts.url,
    headers: { get: function () { return opts.type || "text/html; charset=utf-8"; } },
    json: function () { return Promise.resolve(body); },
    text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); }
  });
}
var fetched = [];
function stubFetch(url) {
  url = String(url);
  fetched.push(url);
  if (url.indexOf("api.openai.com") !== -1) throw new Error("no paid call expected");
  if (url.indexOf("www.nhm.ac.uk/discover/dino-teeth") !== -1) return res(html, { url: "https://www.nhm.ac.uk/discover/dino-teeth.html" });
  if (url.indexOf("www.nhm.ac.uk/discover/moved") !== -1) return res(html, { url: "https://www.example.com/landing" });
  if (url.indexOf("https://www.nhm.ac.uk/") === 0) return res(html, { url: url });
  if (url.indexOf("simple.wikipedia.org/w/api.php") !== -1 && url.indexOf("prop=extracts") !== -1) return res({ query: { pages: [{ title: "Dinosaur", extract: wiki }] } });
  return res({}, { status: 404 });
}
var fakeProvider = {
  id: "fake", paid: false,
  search: function () {
    return Promise.resolve({ calls: 1, candidates: [
      { url: "https://simple.wikipedia.org/wiki/Dinosaur", title: "Dinosaur", provider: "fake", snippet: "SNIPPET TEXT THAT MUST NOT BE EVIDENCE" },
      { url: "https://www.nhm.ac.uk/discover/dino-teeth.html", title: "Teeth", provider: "fake", snippet: "SNIPPET TEXT THAT MUST NOT BE EVIDENCE" },
      { url: "https://www.nhm.ac.uk/discover/moved.html", title: "Moved", provider: "fake" },
      { url: "https://www.dinofacts.example.com/teeth", title: "Off list", provider: "fake" },
      { url: "https://simple.wikipedia.org/wiki/Dinosaur_(movie)", title: "Dinosaur (movie)", provider: "fake" },
      { url: "https://en.wikipedia.org/wiki/Walking_with_Dinosaurs", title: "Walking with Dinosaurs", description: "1999 British television documentary series", provider: "fake" }
    ] });
  }
};
// Regression (probe): pages that name the topic are fetched before off-topic pages from the same site.
var offTopicFirst = { id: "fake2", paid: false, search: function () { return Promise.resolve({ calls: 1, candidates: [
  { url: "https://www.nhm.ac.uk/support-us/our-supporters/the-lego-group.html", title: "", provider: "fake2" },
  { url: "https://www.nhm.ac.uk/discover/dinosaur-teeth.html", title: "", provider: "fake2" }
] }); } };
R.researchTopic(request, { fetch: stubFetch, providers: [offTopicFirst], maxSources: 1 }).then(function (record) {
  assert.strictEqual(record.sources.length, 1);
  assert.strictEqual(record.sources[0].url, "https://www.nhm.ac.uk/discover/dinosaur-teeth.html");
  assert.ok(record.refused.some(function (r) { return /lego-group/.test(r.url) && r.reason === "source cap reached"; }), JSON.stringify(record.refused));
});

R.researchTopic(request, { fetch: stubFetch, providers: [fakeProvider], now: function () { return "2026-10-06T10:00:00.000Z"; } }).then(function (record) {
  // Source tiers (patch 6): Simple English Wikipedia is discovery only. It is read, but it is not
  // an evidence source and none of its text becomes a passage.
  assert.deepStrictEqual(record.sources.map(function (s) { return s.url; }).sort(), ["https://www.nhm.ac.uk/discover/dino-teeth.html"]);
  assert.deepStrictEqual(record.discoverySources.map(function (s) { return s.url; }), ["https://simple.wikipedia.org/wiki/Dinosaur"]);
  assert.ok(record.passages.every(function (p) { return p.tier === "evidence" && !/wikipedia/.test(p.url); }));
  var reasons = record.refused.map(function (r) { return r.url + " :: " + r.reason; }).join("\n");
  assert.ok(/dinofacts.*not on the source allowlist|dinofacts.*allowlist/.test(reasons), reasons);
  assert.ok(/moved.*redirected off the allowlist/.test(reasons), reasons);
  assert.ok(/movie.*not an explanatory article/.test(reasons), reasons);
  // Regression (live run 1): media pages found by Wikipedia search are refused by their description.
  assert.ok(/Walking_with_Dinosaurs.*television documentary series/.test(reasons), reasons);
  assert.ok(record.passages.length >= 1);
  record.passages.forEach(function (p) {
    assert.ok(/^S\d+-P\d\d$/.test(p.id));
    assert.strictEqual(p.text.indexOf("SNIPPET"), -1);
    assert.ok(p.url && p.title && p.retrievedAt);
  });
  assert.ok(record.discovered.every(function (d) { return d.snippetIgnored === true && !("snippet" in d); }));
  assert.ok(record.selectedPassageIds.length >= 1);
  assert.ok(/snippets only locate pages/.test(record.evidencePolicy));
  assert.strictEqual(fetched.some(function (u) { return u.indexOf("dinofacts") !== -1; }), false);
  return R.researchTopic({ topic: "Dinosaurs", yearGroup: "Year 9" }, { fetch: stubFetch, providers: [fakeProvider] });
}).then(function (bad) {
  assert.ok(/yearGroup/.test(bad.error));
  assert.strictEqual(bad.passages.length, 0);
  console.log("source-research tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
