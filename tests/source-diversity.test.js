"use strict";

// Source diversity (patch 6). One host may take at most half the source slots while other
// evidence hosts are available. Live runs 10 and 11 (6 Oct 2026) filled all 12 slots from one
// museum site (hub and fossil-finding pages) and the other evidence pages never got a slot, so
// the pack found only two feature-and-explanation pairs. No network and no paid call.

var assert = require("assert");
var R = require("../js/source-research.js");

var page = "<html><head><title>T</title></head><body><main><p>Dinosaurs had long necks. A long neck let a dinosaur reach leaves high in the trees without moving its body, so it could feed on food other animals could not reach easily.</p><p>Dinosaurs lived on land for millions of years and their fossils are found on every continent of the world today.</p></main></body></html>";
function res(body, opts) {
  opts = opts || {};
  var text = typeof body === "string" ? body : JSON.stringify(body);
  return Promise.resolve({ ok: (opts.status || 200) < 400, status: opts.status || 200, url: opts.url || "", headers: { get: function (h) { return /content-type/i.test(h) ? "text/html; charset=utf-8" : null; } }, text: function () { return Promise.resolve(text); }, json: function () { return Promise.resolve(JSON.parse(text)); } });
}
function stubFetch(url) {
  url = String(url);
  if (url.indexOf("api.openai.com") !== -1) throw new Error("no paid call expected");
  return res(page, { url: url });
}
function provider(list) { return { id: "fake", paid: false, search: function () { return Promise.resolve({ calls: 1, candidates: list.map(function (u) { return { url: u, title: "Dinosaurs", provider: "fake" }; }) }); } }; }
var museum = [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return "https://www.nhm.ac.uk/discover/dinosaurs-" + i + ".html"; });
var publisher = ["https://kids.nationalgeographic.com/animals/prehistoric/facts/brachiosaurus", "https://kids.nationalgeographic.com/animals/prehistoric/facts/iguanodon"];

// diversifyHosts keeps order but moves a host's overflow to the end.
var d = R.diversifyHosts(museum.concat(publisher).map(function (u) { return { url: u }; }), 3).map(function (i) { return i.url; });
assert.deepStrictEqual(d.slice(0, 5), museum.slice(0, 3).concat(publisher));
assert.deepStrictEqual(d.slice(5), museum.slice(3));

// Subdomains share a site's slots, and document downloads never take a slot.
var mixed = R.diversifyHosts([{ url: museum[0] }, { url: "https://data.nhm.ac.uk/x.html" }, { url: "https://jobs.nhm.ac.uk/y.html" }, { url: publisher[0] }], 2).map(function (i) { return i.url; });
assert.deepStrictEqual(mixed, [museum[0], "https://data.nhm.ac.uk/x.html", publisher[0], "https://jobs.nhm.ac.uk/y.html"]);

var request = { topic: "Dinosaurs", yearGroup: "Year 3", learningGoal: "how dinosaurs adapted" };
// Positive: with 6 slots, the museum takes 3 and the other host's pages get slots.
R.researchTopic(request, { fetch: stubFetch, providers: [provider(museum.concat(publisher))], maxSources: 6 }).then(function (record) {
  var hosts = record.sources.map(function (s) { return s.domain; });
  assert.strictEqual(record.sources.length, 6);
  assert.strictEqual(hosts.filter(function (h) { return h === "kids.nationalgeographic.com"; }).length, 2, hosts.join(","));
  assert.strictEqual(hosts.filter(function (h) { return h === "nhm.ac.uk"; }).length, 4, "the free slot goes back to the museum");
  // Negative: when only one host is available it may fill every slot (no slot is left empty).
  return R.researchTopic(request, { fetch: stubFetch, providers: [provider(["https://data.nhm.ac.uk/dataset/a/resource/b/download/guide.pdf", "https://jobs.nhm.ac.uk/Job/GetJobAdvertDocument?Id=1"].concat(museum))], maxSources: 6 });
}).then(function (record) {
  assert.ok(record.refused.filter(function (r) { return r.reason === "not a readable page (document download)"; }).length === 2, "downloads are refused before they take a slot");
  assert.ok(!record.sources.some(function (s) { return /download|Job/.test(s.url); }));
  return R.researchTopic(request, { fetch: stubFetch, providers: [provider(museum)], maxSources: 6 });
}).then(function (record) {
  assert.strictEqual(record.sources.length, 6);
  assert.ok(record.sources.every(function (s) { return s.domain === "nhm.ac.uk"; }));
  assert.ok(record.refused.some(function (r) { return r.reason === "source cap reached"; }));
  console.log("source diversity tests passed");
}).catch(function (error) { console.error(error); process.exit(1); });
