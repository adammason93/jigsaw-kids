"use strict";

/* Offline tests for the harness-only v2 pack contract code. No network, no paid
   calls. Fixtures in fixtures/contract-synthetic.json are SYNTHETIC: hand-written,
   not model output, not verified facts.
   node scripts/pack-comparison/contract.test.js */

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var childProcess = require("child_process");
var lib = require("./lib");
var V = require("./contract-validate");
var G = require("./contract-graph");
var A = require("./contract-adapter");
var E = require("./contract-evaluate");
var P = require("./contract-prompt");
var gateContext = require("./gate-context");
var runner = require("./run");
var analyser = require("./analyse");
var blind = require("./blind-export");

var brain = lib.loadBrain();
var F = lib.loadJson(path.join(__dirname, "fixtures", "contract-synthetic.json"));
var intents = lib.loadJson(path.join(__dirname, "frozen-intents-v2.json"));
var inputsV2 = lib.loadJson(path.join(__dirname, "inputs-v2-contract.json"));
var configV2 = lib.loadJson(path.join(__dirname, "config-v2-contract.json"));
var FROZEN = { T1: 2, T2: 2, T3: 2, T4: 3, T5: 3, T6: 3, T7: 3, T8: 3 };
var passed = 0;
function ok(name) { passed += 1; console.log("ok - " + name); }
function fx(name) { return lib.clone(F[name]); }
function ctxFor(id) {
  var c = lib.clone(intents[id].context);
  brain.applyTeacherIntent(c, brain.normaliseTeacherIntent(intents[id].rawTeacherIntent, c));
  return c;
}
function gateCtx(id) { return gateContext.boundarySafeGateContext(ctxFor(id)).ctx; }
function validate(pack, extra) { return V.validateContractPack(pack, Object.assign({ unitsRequired: pack.unitsRequired, suppliedMaterials: [] }, extra || {})); }
function strands(pack) { return G.countStrands(validate(pack).units).strands; }
function evalPack(pack, id, extra) { return E.evaluateContractPack(pack, Object.assign({ brain: brain, gateCtx: gateCtx(id), frozenCount: FROZEN[id], suppliedMaterials: [], group: id === "T8" ? "refusal" : "teachable", inventedSourceFlags: analyser.inventedSourceFlags }, extra || {})); }
function unit(v, id) { return v.units.filter(function (u) { return u.unitId === id; })[0]; }

assert.ok(/SYNTHETIC/.test(F._label) && /NOT model output/.test(F._label), "fixtures are labelled synthetic");

// 1. A valid unit.
var v1 = validate(fx("valid_two_roots"));
assert.deepStrictEqual(v1.packErrors, []);
assert.strictEqual(v1.claimErrorCount, 0);
assert.strictEqual(v1.unitsValid, 2);
assert.ok(v1.packFormatValid && v1.formatValidStrict);
ok("valid units: pack format-valid, 2/2 units valid, no errors");

// 2. Fused element/explanation.
var v2 = validate(fx("fused_element_explanation"));
var u2 = unit(v2, "u1");
assert.ok(!u2.ok);
assert.ok(u2.errors.indexOf("MISSING_EXPLANATION") !== -1 && u2.errors.indexOf("FUSED_ELEMENT_EXPLANATION") !== -1, u2.errors.join(","));
assert.strictEqual(G.countStrands(v2.units).strands, 0);
ok("fused element/explanation: MISSING_EXPLANATION + FUSED_ELEMENT_EXPLANATION, unit fails, 0 strands");

// 3. Unresolved id fails that unit only.
var v3 = validate(fx("unresolved_id"));
assert.ok(unit(v3, "u1").errors.indexOf("UNRESOLVED_CLAIM_ID") !== -1);
assert.ok(unit(v3, "u2").ok);
assert.strictEqual(G.countStrands(v3.units).strands, 1);
ok("unresolved claim id: UNRESOLVED_CLAIM_ID on that unit only; the other unit still counts (1 strand)");

// 4. element == explanation.
var v4 = validate(fx("element_equals_explanation"));
assert.ok(unit(v4, "u1").errors.indexOf("ELEMENT_EQUALS_EXPLANATION") !== -1);
assert.strictEqual(G.countStrands(v4.units).strands, 0);
ok("element == explanation: ELEMENT_EQUALS_EXPLANATION, 0 strands");

// 5. Chain of 3 units from one root = 1 strand + depth 2.
var g5 = G.countStrands(validate(fx("chain_of_three_one_root")).units);
assert.strictEqual(g5.roots, 1);
assert.strictEqual(g5.strands, 1);
assert.strictEqual(g5.depthCredits, 2);
assert.strictEqual(g5.longestPassingPath, 3);
ok("chain of 3 units from one root: 1 strand, 2 depth credits, longest path 3 (reported separately)");

// 6. Two independent roots = 2 strands.
var g6 = G.countStrands(v1.units);
assert.strictEqual(g6.roots, 2);
assert.strictEqual(g6.strands, 2);
assert.strictEqual(g6.depthCredits, 0);
ok("two independent roots: 2 strands, 0 depth credits");

// 7. Example-only unit adds 0 strands; examples never change the count.
var v7 = validate(fx("example_only_unit"));
assert.ok(unit(v7, "u1").errors.indexOf("MISSING_EXPLANATION") !== -1);
assert.strictEqual(G.countStrands(v7.units).strands, 0);
assert.strictEqual(A.toEnginePack(fx("example_only_unit"), v7).enginePack.mechanisms.length, 0);
var noEx = fx("valid_two_roots");
noEx.units.forEach(function (u) { u.exampleClaimIds = []; });
assert.strictEqual(strands(fx("valid_two_roots")), strands(noEx));
var ad7 = A.toEnginePack(fx("valid_two_roots"), v1);
var c5 = ad7.enginePack.claims.filter(function (c) { return /sunflower/.test(c.text); })[0];
assert.strictEqual(c5.kind, "example");
assert.strictEqual(c5.depth, "concrete");
ok("example-only unit: fails (no explanation), 0 strands, 0 mechanisms; example ids never change strands; example claim passed as kind example");

// 8. sourceRef to nonexistent material -> UNRESOLVED_SOURCE; needsSource stays true.
var p8 = fx("source_ref_nonexistent");
var v8 = validate(p8);
assert.ok(v8.claims.c1.errors.indexOf("UNRESOLVED_SOURCE") !== -1);
assert.strictEqual(v8.claims.c1.source.status, "UNRESOLVED_SOURCE");
assert.strictEqual(v8.claims.c1.sourceSupport.status, "UNRESOLVED_SOURCE");
assert.strictEqual(v8.claims.c1.effectiveNeedsSource, true);
assert.strictEqual(v8.unresolvedSources, 1);
var mat = [{ sourceId: "tm1", kind: "teacher_material", title: "synthetic", segments: [{ locator: "p.2", text: "Synthetic test text: soft clay under the rock caused the slip in 1901." }] }];
assert.strictEqual(validate(p8, { suppliedMaterials: [{ sourceId: "tm1", segments: [{ locator: "p.9", text: "x" }] }] }).claims.c1.source.status, "UNRESOLVED_SOURCE");
var resolved = validate(p8, { suppliedMaterials: mat });
assert.strictEqual(resolved.claims.c1.source.status, "RESOLVED");
assert.strictEqual(resolved.claims.c1.sourceSupport.status, "unchecked");
assert.strictEqual(resolved.claims.c1.effectiveNeedsSource, true, "a resolved but unchecked reference never clears needsSource");
var lying = fx("source_ref_nonexistent");
lying.claims[0].needsSource = false;
var vl = validate(lying, { suppliedMaterials: mat });
assert.ok(vl.claims.c1.errors.indexOf("PLACE_FLAGS_INCONSISTENT") !== -1);
assert.strictEqual(vl.claims.c1.effectiveNeedsSource, true, "a model needsSource:false never clears a place_bound claim");
var supported = validate(p8, { suppliedMaterials: mat, humanSupport: { c1: { status: "SUPPORTED", by: "synthetic-reviewer", at: "test", method: "human" } } });
assert.strictEqual(supported.claims.c1.effectiveNeedsSource, false, "positive control: resolved + recorded SUPPORTED clears it");
var modelSays = validate(p8, { suppliedMaterials: mat, humanSupport: { c1: { status: "SUPPORTED", by: "model", method: "model" } } });
assert.strictEqual(modelSays.claims.c1.effectiveNeedsSource, true, "support claimed by the model does not count");
ok("sourceRef with no supplied material: UNRESOLVED_SOURCE, needsSource stays true; wrong locator unresolved; resolved-but-unchecked still needs source; only human/verifier SUPPORTED clears");

// 9. T8-like place-bound pack blocks NEEDS_SOURCE (contract and frozen gate).
var e9 = evalPack(fx("t8_like_place_bound"), "T8").result;
assert.strictEqual(e9.contractVerdict.verdict, "BLOCKED_NEEDS_SOURCE");
assert.strictEqual(e9.contractVerdict.reason, "NEEDS_SOURCE: UNRESOLVED_SOURCE");
assert.strictEqual(e9.gate.verdict, "KNOWLEDGE_BLOCKED");
assert.ok(/^NEEDS_SOURCE/.test(e9.gate.packStatusReason));
assert.strictEqual(e9.refusal.selectablePlaceBoundContract, 0);
assert.strictEqual(e9.refusal.selectablePlaceBoundGate, 0);
assert.strictEqual(e9.refusal.correct, false, "an invented source reference makes the refusal incorrect");
assert.ok(e9.adapter.heldClaims.some(function (h) { return h.claimId === "p2"; }));
var e9b = evalPack(fx("t8_like_model_blocked"), "T8").result;
assert.strictEqual(e9b.contractVerdict.verdict, "BLOCKED_NEEDS_SOURCE");
assert.strictEqual(e9b.contractVerdict.reason, "NEEDS_SOURCE: no supplied material");
assert.strictEqual(e9b.refusal.correct, true);
assert.strictEqual(e9b.refusal.blockedBy, "model");
var e9c = evalPack(fx("t8_like_place_understated"), "T8").result;
assert.ok(e9c.sources.placeUnderstated.indexOf("p2") !== -1, "the engine's place-bound flag is stricter and wins");
assert.strictEqual(e9c.contractVerdict.verdict, "BLOCKED_NEEDS_SOURCE");
assert.strictEqual(e9c.gate.verdict, "KNOWLEDGE_BLOCKED");
assert.strictEqual(e9c.refusal.correct, true);
assert.strictEqual(e9c.refusal.blockedBy, "code");
// Frozen-code defect (reported separately, not patched): a claim that starts
// "At Mam Tor, ..." yields the place name "At Mam Tor", which collapses the
// request's "Mam Tor" away, so the frozen gate no longer blocks NEEDS_SOURCE.
// The claim itself is still held (not selectable). The contract's request-only
// probe still blocks; refusal stays "not correct" because the gate did not block.
var e9d = evalPack(fx("t8_like_at_place_prefix"), "T8").result;
assert.strictEqual(e9d.contractVerdict.verdict, "BLOCKED_NEEDS_SOURCE");
assert.strictEqual(e9d.sources.requestNeedsSource, true);
assert.strictEqual(e9d.sources.gateNeedsSource, false, "documents the frozen seenPlaces collapse defect");
assert.notStrictEqual(e9d.gate.verdict, "READY");
assert.strictEqual(e9d.refusal.selectablePlaceBoundGate, 0);
assert.strictEqual(e9d.refusal.correct, false);
ok("T8-like pack: blocked NEEDS_SOURCE in contract and frozen gate; invented sourceRef = refusal incorrect; model-blocked = correct; understated place scope caught by code; 'At Mam Tor' phrasing exposes a frozen-gate defect (contract still blocks, refusal reported not correct)");

// 10. Adapter output passes through the unchanged frozen gate without error; no lowering.
var verdicts = { READY: 1, PACK_INCOMPLETE: 1, KNOWLEDGE_BLOCKED: 1 };
var gateRuns = 0;
Object.keys(F).filter(function (k) { return k !== "_label"; }).forEach(function (name) {
  Object.keys(FROZEN).forEach(function (id) {
    var e = evalPack(fx(name), id);
    assert.ok(verdicts[e.result.gate.verdict], name + "/" + id);
    if (!e.gateRaw.blocked) assert.strictEqual(e.result.gate.requiredPairs, FROZEN[id], "frozen count, not lowered: " + name + "/" + id);
    gateRuns += 1;
  });
});
try {
  childProcess.execSync("git diff --quiet " + configV2.frozenCommit + " -- js/", { cwd: lib.REPO_ROOT, stdio: "ignore" });
} catch (e) { if (e.status === 1) throw new Error("js/ differs from the frozen commit"); }
ok("adapter output runs through unchanged normaliseKnowledgePack -> selectPackForLesson -> assessPackReadiness (" + gateRuns + " fixture x context runs, no error); required pairs = frozen counts; js/ identical to 0d53e3d");

// 11. Adapter never fabricates mechanism text.
Object.keys(F).filter(function (k) { return k !== "_label"; }).forEach(function (name) {
  var pack = fx(name);
  var v = validate(pack);
  var ad = A.toEnginePack(pack, v);
  var byId = {};
  pack.claims.forEach(function (c) { byId[c.claimId] = c.text; });
  var allowed = {};
  v.units.forEach(function (u) { if (u.ok && !(v.claims[u.elementClaimId] || {}).effectiveNeedsSource && !(v.claims[u.explanationClaimId] || {}).effectiveNeedsSource) allowed[byId[u.explanationClaimId]] = 1; });
  ad.enginePack.mechanisms.forEach(function (m) { assert.ok(allowed[m.text], name + ": mechanism text is not a valid unit's explanation claim: " + m.text); });
  assert.strictEqual(ad.enginePack.mechanisms.length, Object.keys(allowed).length, name);
  ad.enginePack.claims.forEach(function (c) {
    if (c.depth === "mechanism" || c.kind === "mechanism") assert.ok(allowed[c.text], name + ": claim tagged mechanism without a unit: " + c.text);
  });
});
var orphan = fx("orphan_mechanism_claim");
var vo = validate(orphan);
var ado = A.toEnginePack(orphan, vo);
assert.ok(ado.report.depthDemoted.indexOf("c4") !== -1);
var normO = brain.normaliseKnowledgePack(lib.clone(ado.enginePack), gateCtx("T1"));
assert.ok(normO.mechanisms.every(function (m) { return !/Spreading roots/.test(m.text); }), "engine derives no mechanism from a claim no unit uses");
assert.strictEqual(normO.mechanisms.length, 1);
ok("adapter never fabricates: every mechanism text is a valid unit's explanation claim, verbatim; a model 'mechanism' depth with no unit is demoted; engine derives no extra mechanism");

// 12. Validator: enums, factuallyVerified, verbatim, place flags, provenance.
var bad = fx("valid_two_roots");
bad.claims[0].factuallyVerified = true;
bad.claims[1].localScope = "place_bound";
bad.claims[2].provenance = "teacher_material";
bad.units[0].relationType = "adaptation";
bad.units[1].element.phrase = "roots grow very deep";
bad.status = "fine";
var vb = validate(bad);
assert.ok(vb.claims.c1.errors.indexOf("FACTUALLY_VERIFIED_NOT_FALSE") !== -1);
assert.ok(vb.claims.c2.errors.indexOf("PLACES_MISSING") !== -1 && vb.claims.c2.errors.indexOf("PLACE_FLAGS_INCONSISTENT") !== -1);
assert.ok(vb.claims.c3.errors.indexOf("PROVENANCE_WITHOUT_MATERIAL") !== -1);
assert.ok(unit(vb, "u1").errors.indexOf("RELATION_TYPE_INVALID") !== -1);
assert.ok(unit(vb, "u2").errors.indexOf("PHRASE_NOT_VERBATIM") !== -1);
assert.ok(vb.packErrors.indexOf("STATUS_INVALID") !== -1);
assert.strictEqual(vb.packFormatValid, false);
var few = fx("orphan_mechanism_claim");
few.fewerUnitsReason = "";
assert.ok(validate(few).packErrors.indexOf("FEWER_UNITS_NO_REASON") !== -1);
var cyc = fx("chain_of_three_one_root");
cyc.units.push({ unitId: "u4", relationType: "process_step", element: { claimId: "k4", phrase: "slide down the slope" }, explanation: { claimId: "k1", stepPhrase: "Heavy rain falls", outcomePhrase: "steep hillside" }, goalLink: "x", exampleClaimIds: [], misconceptionIds: [] });
var vc = validate(cyc);
assert.ok(vc.hasCycle && !vc.packFormatValid);
ok("validator: factuallyVerified true, place flags, teacher_material without material, relationType enum, non-verbatim phrase, status enum, fewer units without reason, cycle -> all flagged");

// 13. Place-name false positive: fixed in harness gate input assembly only.
var t7raw = ctxFor("T7");
var t7fix = gateContext.boundarySafeGateContext(t7raw);
assert.deepStrictEqual(t7fix.changed.map(function (c) { return c.field; }), ["topic"]);
var land = fx("landslide_generic");
var vland = validate(land);
var rawGate = A.runFrozenGate(A.toEnginePack(land, vland).enginePack, t7raw, brain);
var fixGate = A.runFrozenGate(A.toEnginePack(land, vland).enginePack, t7fix.ctx, brain);
assert.ok(rawGate.blocked && /^NEEDS_SOURCE/.test(rawGate.pack.statusReason), "raw assembly reproduces the false NEEDS_SOURCE");
assert.ok(!fixGate.blocked, "boundary-safe assembly: no false NEEDS_SOURCE");
Object.keys(FROZEN).forEach(function (id) {
  var raw = ctxFor(id), fixed = gateContext.boundarySafeGateContext(raw).ctx;
  assert.strictEqual(JSON.parse(brain.knowledgePackBrief(fixed).user).strandPairsRequired, FROZEN[id], id + " count unchanged");
  assert.strictEqual(brain.teachingScope(fixed).scope, brain.teachingScope(raw).scope, id + " scope unchanged");
});
var t8Gate = A.runFrozenGate(A.toEnginePack(fx("t8_like_model_blocked"), validate(fx("t8_like_model_blocked"))).enginePack, gateCtx("T8"), brain);
assert.ok(t8Gate.blocked && /^NEEDS_SOURCE/.test(t8Gate.pack.statusReason), "T8 still blocks with the fixed assembly");
ok("place-name fix (harness gate input only): T7 raw assembly falsely blocks NEEDS_SOURCE, fixed assembly does not; unit counts and scope unchanged for T1-T8; T8 still blocks");

// 14. New-contract prompt is subject-neutral and carries the frozen count.
Object.keys(FROZEN).forEach(function (id) {
  var b = P.buildContractBrief(ctxFor(id), { unitsRequired: FROZEN[id], suppliedMaterials: [] });
  var u = JSON.parse(b.user);
  assert.strictEqual(u.unitsRequired, FROZEN[id]);
  assert.deepStrictEqual(u.suppliedMaterials, []);
});
assert.ok(!/shark|dinosaur|henry|landslide|mam tor|plant|adverbial/i.test(P.SYSTEM), "system prompt names no test topic");
["Never invent a source", "two different claims", "copied word for word", "exampleClaimIds", "fewerUnitsReason", "factuallyVerified is always false", "needsSource is true for every place_bound claim"].forEach(function (s) { assert.ok(P.SYSTEM.indexOf(s) !== -1 || P.SYSTEM.toLowerCase().indexOf(s.toLowerCase()) !== -1, "prompt says: " + s); });
ok("new-contract prompt: subject-neutral system text (no test topic named), required instructions present, unitsRequired = frozen count, suppliedMaterials []");

// 15 + 16. Mocked end-to-end run on the new contract; pending approval refuses paid runs.
function response(status, body) {
  var text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status: status, headers: { get: function () { return "req_mock"; } }, text: function () { return Promise.resolve(text); } };
}
(async function () {
  var refused = false;
  try {
    await runner.runComparison({ outDir: fs.mkdtempSync(path.join(os.tmpdir(), "v2-refuse-")), config: configV2, inputs: inputsV2, frozenIntents: intents, client: { chat: function () { throw new Error("must not be called"); } }, brain: brain });
  } catch (e) { refused = /not approved/.test(String(e.message)); }
  assert.ok(refused, "pending-approval config refuses a paid run");
  ok("config-v2-contract.json approvalStatus " + configV2.approvalStatus + ": a paid run is refused before any call");

  var seen = [];
  var fetchImpl = function (url, init) {
    var body = JSON.parse(init.body);
    seen.push(body);
    assert.strictEqual(body.messages[0].content, P.SYSTEM, "every call uses the new-contract system prompt");
    return Promise.resolve(response(200, { id: "x", model: body.model, choices: [{ message: { content: JSON.stringify(F.valid_two_roots) }, finish_reason: "stop" }], usage: { prompt_tokens: 2000, completion_tokens: 800, total_tokens: 2800 } }));
  };
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), "v2-run-"));
  var cfg = Object.assign({}, configV2, { approvalStatus: "APPROVED", maxCalls: 40, capUsd: 2.5 });
  var client = lib.createOpenAIClient({ apiKey: "sk-test-not-real", fetchImpl: fetchImpl });
  var res = await runner.runComparison({ outDir: dir, config: cfg, inputs: inputsV2, frozenIntents: intents, client: client, brain: brain });
  assert.strictEqual(res.calls, 32);
  var L = fs.readFileSync(path.join(dir, "ledger.jsonl"), "utf8").split("\n").filter(Boolean).map(JSON.parse);
  assert.strictEqual(L.filter(function (l) { return l.kind === "intent"; }).length, 0);
  var frozen = lib.loadJson(path.join(dir, "frozen-inputs.json"));
  Object.keys(FROZEN).forEach(function (id) {
    assert.strictEqual(frozen.tests[id].packContract, "v2-harness");
    assert.strictEqual(JSON.parse(frozen.tests[id].packMessages[1].content).unitsRequired, FROZEN[id]);
  });
  var a6 = lib.loadJson(path.join(dir, "runs", "A-T6-r1.json")), b6 = lib.loadJson(path.join(dir, "runs", "B-T6-r1.json"));
  assert.strictEqual(lib.loadJson(path.join(dir, a6.attempts[0].file)).request.messagesSha256, lib.loadJson(path.join(dir, b6.attempts[0].file)).request.messagesSha256);
  var an = analyser.analyse(dir, brain);
  var r1 = an.records.filter(function (r) { return r.runId === "A-T3-r1"; })[0];
  assert.strictEqual(r1.contract, "v2-harness");
  assert.strictEqual(r1.contractVerdict.strands, 2);
  assert.strictEqual(r1.contractVerdict.verdict, "STRUCTURALLY_COMPLETE");
  // Year 1: the fixture's explanation claims have ageFit from Year 2, so they are held.
  var y1 = an.records.filter(function (r) { return r.runId === "A-T1-r1"; })[0];
  assert.strictEqual(y1.contractVerdict.strands, 0);
  assert.strictEqual(y1.holds.c2, "ageFit");
  var r8 = an.records.filter(function (r) { return r.runId === "B-T8-r2"; })[0];
  assert.strictEqual(r8.gate.verdict, "KNOWLEDGE_BLOCKED");
  assert.ok(fs.readFileSync(path.join(dir, "analysis", "SUMMARY.md"), "utf8").indexOf("v2 contract per run") !== -1);
  var be = blind.exportBlind(dir, { brain: brain, blindSeed: 4242 });
  assert.strictEqual(be.packets, 28);
  assert.deepStrictEqual(be.leaks, []);
  fs.readdirSync(path.join(dir, "blind")).forEach(function (f) {
    var t = fs.readFileSync(path.join(dir, "blind", f), "utf8");
    assert.ok(!/gpt|4o-mini|4\.1|latency|tokens|listedUsd|runId|[AB]-T\d-r\d/i.test(t), f);
    assert.ok(!/"(c|u)\d+"/.test(t), "original claim/unit ids absent from " + f);
  });
  var bp = lib.loadJson(path.join(dir, "blind", "BP-01.json"));
  assert.strictEqual(bp.contract, "v2");
  assert.ok(bp.units.length && bp.units[0].element.id.match(/^K\d+$/));
  ok("mocked new-contract run: 32 pack calls, 0 intent calls, identical prompts across arms, analysis + 28 blind packets (re-keyed, no identifying text)");
  console.log("\n" + passed + " checks passed (offline; synthetic fixtures; no network, no paid calls).");
})().catch(function (e) { console.error("FAIL:", e && e.stack || e); process.exit(1); });
