"use strict";

/* Deterministic analysis of a comparison run folder (no model calls).
   node scripts/pack-comparison/analyse.js --out DIR

   For each pack run:
   - format validity (PROTOCOL §5.4) plus linkage detail (ids resolve,
     feature -> featureClaimId);
   - current gate, unchanged: normaliseKnowledgePack -> selectPackForLesson ->
     assessPackReadiness, with the run's frozen context;
   - T8 refusal check;
   - strand roots and chain depth, reported separately (v2 root rules on the
     derived feature -> mechanism graph; rubric-based roots need the blind
     scores and are not computed here);
   - latency, tokens and cost from the ledger.
   It never scores teaching quality.

   Gate input assembly: the frozen gate receives the run's frozen context with
   a sentence boundary added to each joined free-text field (gate-context.js),
   which removes the "Landslides Students" place-name false positive without
   touching js/. --raw-gate-context reproduces the original assembly.
   --analysis-dir NAME writes to a different sub-folder (default "analysis").

   v2-contract runs (frozenTest.packContract === "v2-harness") are evaluated
   with contract-evaluate.js: contract format validator, source checks, root /
   depth counter, and the compatibility adapter into the unchanged gate. */

var fs = require("fs");
var path = require("path");
var lib = require("./lib");
var gateContext = require("./gate-context");
var contractEval = require("./contract-evaluate");

var STATUSES = { usable: 1, qualified: 1, blocked: 1 };
var SOURCE_PROVENANCE = { teacher_material: 1, retrieved: 1, curated: 1, curriculum_planning: 1 };

function formatCheck(raw) {
  var out = { jsonValid: !!raw, statusAllowed: false, claimsNonEmpty: false, claimsHaveText: false, mechanismsWellFormed: false, noFactuallyVerifiedTrue: true, problems: [] };
  if (!raw) { out.problems.push("no parsable JSON object"); out.formatValid = false; return out; }
  out.statusAllowed = !!STATUSES[String(raw.status || "").toLowerCase()];
  if (!out.statusAllowed) out.problems.push("status missing or not usable/qualified/blocked");
  var claims = Array.isArray(raw.claims) ? raw.claims : null;
  out.claimsNonEmpty = !!(claims && claims.length);
  if (!out.claimsNonEmpty) out.problems.push("claims missing or empty");
  out.claimsHaveText = !!claims && claims.every(function (c) { return c && typeof c.text === "string" && c.text.trim(); });
  if (claims && !out.claimsHaveText) out.problems.push("a claim has no text");
  var mechs = Array.isArray(raw.mechanisms) ? raw.mechanisms : null;
  out.mechanismsWellFormed = !!mechs && mechs.every(function (m) { return m && typeof m.text === "string" && m.text.trim() && typeof m.feature === "string" && m.feature.trim(); });
  if (!mechs) out.problems.push("mechanisms missing");
  else if (!out.mechanismsWellFormed) out.problems.push("a mechanism lacks text or feature");
  (claims || []).forEach(function (c) {
    if (c && (c.factuallyVerified === true || String(c.factuallyVerified).toLowerCase() === "true")) out.noFactuallyVerifiedTrue = false;
  });
  if (!out.noFactuallyVerifiedTrue) out.problems.push("a claim sets factuallyVerified true");
  return out;
}

function graphStats(nodes, edges) {
  var nodeSet = {};
  nodes.forEach(function (n) { nodeSet[n] = 1; });
  var out = {}, inc = {};
  edges.forEach(function (e) {
    (out[e.from] = out[e.from] || []).push(e.to);
    inc[e.to] = (inc[e.to] || 0) + 1;
  });
  var roots = Object.keys(out).filter(function (n) { return !inc[n]; });
  var color = {}, cycle = false, memo = {};
  function longest(n) {
    if (color[n] === 1) { cycle = true; return 0; }
    if (memo[n] !== undefined) return memo[n];
    color[n] = 1;
    var best = 0;
    (out[n] || []).forEach(function (m) { best = Math.max(best, 1 + longest(m)); });
    color[n] = 2;
    memo[n] = best;
    return best;
  }
  var longestPath = 0;
  Object.keys(out).forEach(function (n) { longestPath = Math.max(longestPath, longest(n)); });
  var downstream = edges.filter(function (e) { return inc[e.from]; }).length;
  return { edges: edges.length, roots: roots.length, rootIds: roots, downstreamEdges: downstream, longestPathEdges: cycle ? null : longestPath, cycle: cycle };
}

function inventedSourceFlags(raw) {
  var flags = [];
  if (!raw) return flags;
  (Array.isArray(raw.claims) ? raw.claims : []).forEach(function (c, i) {
    var prov = String(c && (c.provenance || c.origin) || "").toLowerCase();
    if (SOURCE_PROVENANCE[prov]) flags.push("claim " + i + " provenance '" + prov + "' with no supplied material");
  });
  (function walk(o, p) {
    if (Array.isArray(o)) { o.forEach(function (v, i) { walk(v, p + "[" + i + "]"); }); return; }
    if (o && typeof o === "object") {
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (/^(sources?|sourceRef|sourceId|citations?|references?|url|link)$/i.test(k) && v && (typeof v !== "object" || Object.keys(v).length)) flags.push("field " + p + "." + k + " present");
        walk(v, p + "." + k);
      });
      return;
    }
    if (typeof o === "string" && /https?:\/\/|www\./i.test(o)) flags.push("URL text at " + p);
  })(raw, "$");
  return flags;
}

function gateCtxFor(frozenTest, opts) {
  if (opts && opts.rawGateContext) return { ctx: lib.clone(frozenTest.contextAfterIntent), changed: [], assembly: "raw" };
  var g = gateContext.boundarySafeGateContext(frozenTest.contextAfterIntent);
  return { ctx: g.ctx, changed: g.changed, assembly: "boundary-safe" };
}

function analyseContractRun(run, frozenTest, brain, rec, gc) {
  rec.contract = "v2-harness";
  if (!run.parsedPack) {
    rec.format = { formatValid: false, packFormatValid: false, problems: ["no parsable JSON object"] };
    rec.gate = { verdict: run.executed ? "NO_PACK" : "NOT_RUN" };
    rec.contractVerdict = { verdict: "NO_PACK" };
    if (run.group === "refusal") rec.refusal = { correct: false, reason: rec.gate.verdict };
    return rec;
  }
  var ev = contractEval.evaluateContractPack(run.parsedPack, { brain: brain, gateCtx: gc.ctx, frozenCount: frozenTest.frozenCount, suppliedMaterials: frozenTest.suppliedMaterials || [], group: run.group, inventedSourceFlags: inventedSourceFlags }).result;
  rec.format = Object.assign({ formatValid: ev.format.packFormatValid, problems: ev.format.packErrors.concat(ev.format.claimErrors.map(function (c) { return c.claimId + ": " + c.errors.join("/"); })) }, ev.format);
  rec.sources = ev.sources;
  rec.holds = ev.holds;
  rec.contractGraph = ev.graph;
  rec.contractVerdict = ev.contractVerdict;
  rec.adapter = ev.adapter;
  rec.gate = ev.gate;
  rec.graph = { structural: { roots: ev.graph.roots, longestPathEdges: ev.graph.longestPassingPath }, gateReady: { roots: null } };
  if (ev.refusal) rec.refusal = ev.refusal;
  return rec;
}

function analyseRun(run, frozenTest, brain, opts) {
  var rec = { runId: run.runId, arm: run.arm, model: run.model, test: run.test, group: run.group, rep: run.rep, executed: !!run.executed, ok: !!run.ok };
  var gc = frozenTest ? gateCtxFor(frozenTest, opts) : null;
  rec.gateContext = gc ? { assembly: gc.assembly, changedFields: gc.changed.map(function (c) { return c.field; }) } : null;
  rec.format = formatCheck(run.parsedPack || null);
  rec.format.formatValid = rec.format.jsonValid && rec.format.statusAllowed && rec.format.claimsNonEmpty && rec.format.claimsHaveText && rec.format.mechanismsWellFormed && rec.format.noFactuallyVerifiedTrue;
  rec.frozenCount = frozenTest ? frozenTest.frozenCount : null;
  rec.runtimeRequired = frozenTest ? frozenTest.runtimeStrandPairsRequired : null;
  rec.latencyMs = run.final ? run.final.latencyMs : null;
  rec.attempts = (run.attempts || []).length;
  rec.listedUsd = (run.attempts || []).reduce(function (s, a) { return s + (a.listedUsd || 0); }, 0);
  rec.promptTokens = run.final && run.final.usage ? run.final.usage.prompt_tokens : null;
  rec.completionTokens = run.final && run.final.usage ? run.final.usage.completion_tokens : null;
  rec.finishReason = run.final ? run.final.finishReason : "";
  if (frozenTest && frozenTest.packContract === "v2-harness") return analyseContractRun(run, frozenTest, brain, rec, gc);
  if (!run.parsedPack || !frozenTest) {
    rec.gate = { verdict: run.executed ? "NO_PACK" : "NOT_RUN" };
    if (run.group === "refusal") rec.refusal = { correct: false, reason: rec.gate.verdict };
    return rec;
  }
  var ctx = gc.ctx;
  var pack = brain.normaliseKnowledgePack(lib.clone(run.parsedPack), ctx);
  var selection = brain.selectPackForLesson(pack, ctx);
  var readiness = brain.assessPackReadiness(pack, selection, ctx);
  var blocked = pack.status === "blocked" || selection.status === "blocked";
  var verdict = blocked ? "KNOWLEDGE_BLOCKED" : (readiness.status === "ready" ? "READY" : "PACK_INCOMPLETE");
  var byId = {};
  pack.claims.forEach(function (c) { byId[c.claimId] = c; });
  var selected = {};
  (selection.claimIds || []).forEach(function (id) { selected[id] = 1; });
  var linked = pack.mechanisms.filter(function (m) { return m.featureClaimId && byId[m.featureClaimId] && m.featureClaimId !== m.claimId; });
  var claimTexts = {};
  (Array.isArray(run.parsedPack.claims) ? run.parsedPack.claims : []).forEach(function (c) { if (c && c.text) claimTexts[String(c.text).trim().toLowerCase()] = 1; });
  var rawMechs = Array.isArray(run.parsedPack.mechanisms) ? run.parsedPack.mechanisms : [];
  rec.linkage = {
    rawClaims: Array.isArray(run.parsedPack.claims) ? run.parsedPack.claims.length : 0,
    admittedClaims: pack.claims.length,
    rawMechanisms: rawMechs.length,
    rawMechanismsMatchingAClaim: rawMechs.filter(function (m) { return m && m.text && claimTexts[String(m.text).trim().toLowerCase()]; }).length,
    derivedUnits: pack.mechanisms.length,
    unitsWithFeature: pack.mechanisms.filter(function (m) { return m.feature; }).length,
    unitsLinkedFeatureClaimId: linked.length,
    unitsLinkedBothSelected: linked.filter(function (m) { return selected[m.featureClaimId] && selected[m.claimId]; }).length
  };
  var structuralEdges = linked.filter(function (m) { return selected[m.featureClaimId] && selected[m.claimId]; }).map(function (m) { return { from: m.featureClaimId, to: m.claimId }; });
  var readyEdges = (readiness.readyPairs || []).map(function (p) { return { from: p.featureClaimId, to: p.mechanismClaimId }; });
  rec.graph = {
    structural: graphStats(Object.keys(selected), structuralEdges),
    gateReady: graphStats(Object.keys(selected), readyEdges),
    note: "Roots and depth are reported separately. Rubric-based strand roots need the blind scores."
  };
  rec.format.noCycle = !rec.graph.structural.cycle;
  rec.format.formatValid = rec.format.formatValid && rec.format.noCycle;
  rec.gate = {
    verdict: verdict,
    modelStatus: String(run.parsedPack.status || ""),
    packStatus: pack.status,
    packStatusReason: pack.statusReason,
    needsSource: pack.needsSource,
    selectionStatus: selection.status,
    readinessStatus: readiness.status,
    readinessSkipped: !!readiness.skipped,
    requiredPairs: readiness.requiredPairs,
    distinctReady: readiness.distinctReady,
    readyVsFrozen: blocked ? null : readiness.distinctReady + "/" + (frozenTest.frozenCount),
    meetsFrozenCount: blocked ? false : readiness.distinctReady >= frozenTest.frozenCount,
    readyPairs: (readiness.readyPairs || []).map(function (p) { return { featureClaimId: p.featureClaimId, mechanismClaimId: p.mechanismClaimId, feature: p.feature, explanation: p.explanation }; }),
    examined: (readiness.pairs || []).map(function (p) { return { mechanismClaimId: p.mechanismClaimId, featureClaimId: p.featureClaimId, ready: p.ready, gaps: p.gaps }; })
  };
  if (run.group === "refusal") {
    var selectable = blocked ? [] : (selection.claimIds || []).map(function (id) { return byId[id]; }).filter(function (c) { return c && c.placeBound; });
    var flags = inventedSourceFlags(run.parsedPack);
    var needs = /^NEEDS_SOURCE/.test(String(pack.statusReason || ""));
    rec.refusal = {
      finalBlocked: pack.status === "blocked",
      needsSource: needs,
      selectablePlaceBound: selectable.length,
      inventedSourceFlags: flags,
      blockedBy: String(run.parsedPack.status || "").toLowerCase() === "blocked" ? "model" : (pack.status === "blocked" ? "code" : "none"),
      correct: pack.status === "blocked" && needs && selectable.length === 0 && flags.length === 0
    };
  }
  return rec;
}

function summarise(records, ledger, config) {
  var arms = {};
  Object.keys(config.arms).forEach(function (arm) {
    var mine = records.filter(function (r) { return r.arm === arm; });
    var teach = mine.filter(function (r) { return r.group === "teachable"; });
    var ref = mine.filter(function (r) { return r.group === "refusal"; });
    var lat = mine.filter(function (r) { return r.latencyMs != null && r.executed; }).map(function (r) { return r.latencyMs; });
    var count = function (list, fn) { return list.filter(fn).length; };
    arms[arm] = {
      model: config.arms[arm],
      teachableRuns: teach.length,
      teachableExecuted: count(teach, function (r) { return r.executed; }),
      formatValidTeachable: count(teach, function (r) { return r.format.formatValid; }),
      gateReady: count(teach, function (r) { return r.gate.verdict === "READY"; }),
      gatePackIncomplete: count(teach, function (r) { return r.gate.verdict === "PACK_INCOMPLETE"; }),
      gateBlocked: count(teach, function (r) { return r.gate.verdict === "KNOWLEDGE_BLOCKED"; }),
      gateNoPack: count(teach, function (r) { return r.gate.verdict === "NO_PACK" || r.gate.verdict === "NOT_RUN"; }),
      meetsFrozenCount: count(teach, function (r) { return r.gate.meetsFrozenCount; }),
      readyPairsTotal: teach.reduce(function (s, r) { return s + (r.gate.distinctReady || 0); }, 0),
      requiredPairsTotal: teach.reduce(function (s, r) { return s + (r.frozenCount || 0); }, 0),
      refusalCorrect: count(ref, function (r) { return r.refusal && r.refusal.correct; }),
      refusalRuns: ref.length,
      latencyMedianMs: lib.median(lat),
      latencyMaxMs: lat.length ? Math.max.apply(null, lat) : null,
      packCostListedUsd: mine.reduce(function (s, r) { return s + (r.listedUsd || 0); }, 0),
      promptTokens: mine.reduce(function (s, r) { return s + (r.promptTokens || 0); }, 0),
      completionTokens: mine.reduce(function (s, r) { return s + (r.completionTokens || 0); }, 0),
      maxCompletionTokens: Math.max.apply(null, mine.map(function (r) { return r.completionTokens || 0; }).concat([0])),
      truncated: count(mine, function (r) { return r.finishReason === "length"; }),
      retries: mine.reduce(function (s, r) { return s + Math.max(0, r.attempts - 1); }, 0)
    };
    if (teach.some(function (r) { return r.contract === "v2-harness"; })) {
      arms[arm].contractStructurallyComplete = count(teach, function (r) { return r.contractVerdict && r.contractVerdict.verdict === "STRUCTURALLY_COMPLETE"; });
      arms[arm].contractStrandsTotal = teach.reduce(function (s, r) { return s + ((r.contractVerdict && r.contractVerdict.strands) || 0); }, 0);
      arms[arm].contractDepthCreditsTotal = teach.reduce(function (s, r) { return s + ((r.contractVerdict && r.contractVerdict.depthCredits) || 0); }, 0);
      arms[arm].unitsValid = mine.reduce(function (s, r) { return s + (r.format.unitsValid || 0); }, 0);
      arms[arm].unitsTotal = mine.reduce(function (s, r) { return s + (r.format.unitsTotal || 0); }, 0);
      arms[arm].unresolvedSources = mine.reduce(function (s, r) { return s + ((r.sources && r.sources.unresolved) || 0); }, 0);
    }
  });
  var intentRows = ledger.filter(function (l) { return l.kind === "intent"; });
  return {
    arms: arms,
    intentCalls: intentRows.length,
    intentCostListedUsd: intentRows.reduce(function (s, l) { return s + (l.listedUsd || 0); }, 0),
    totalCalls: ledger.length,
    totalListedUsd: ledger.reduce(function (s, l) { return s + (l.listedUsd || 0); }, 0),
    totalGuardUsd: ledger.length ? ledger[ledger.length - 1].cumulativeGuardUsd : 0,
    retries: ledger.filter(function (l) { return l.isRetry; }).length
  };
}

function markdown(summary, records) {
  var a = summary.arms;
  var ids = Object.keys(a);
  var lines = ["# Deterministic analysis (no teaching-quality scores)", "", "| Measure | " + ids.map(function (k) { return "Arm " + k + " (" + a[k].model + ")"; }).join(" | ") + " |", "|---|" + ids.map(function () { return "---"; }).join("|") + "|"];
  function row(label, fn) { lines.push("| " + label + " | " + ids.map(function (k) { return fn(a[k]); }).join(" | ") + " |"); }
  row("Teachable runs executed", function (x) { return x.teachableExecuted + "/" + x.teachableRuns; });
  row("Format-valid packs (teachable)", function (x) { return x.formatValidTeachable + "/" + x.teachableRuns; });
  row("Gate READY (teachable)", function (x) { return x.gateReady + "/" + x.teachableRuns; });
  row("Gate PACK_INCOMPLETE (teachable)", function (x) { return x.gatePackIncomplete; });
  row("Gate KNOWLEDGE_BLOCKED (teachable)", function (x) { return x.gateBlocked; });
  row("No pack / not run (teachable)", function (x) { return x.gateNoPack; });
  row("Gate ready pairs vs frozen required (sum)", function (x) { return x.readyPairsTotal + " / " + x.requiredPairsTotal; });
  row("T8 refusal correct", function (x) { return x.refusalCorrect + "/" + x.refusalRuns; });
  if (a[ids[0]] && a[ids[0]].contractStrandsTotal !== undefined) {
    row("v2: format-valid units / all units", function (x) { return x.unitsValid + " / " + x.unitsTotal; });
    row("v2: structurally complete (strands >= frozen), teachable", function (x) { return x.contractStructurallyComplete + "/" + x.teachableRuns; });
    row("v2: distinct strand roots (sum, teachable)", function (x) { return x.contractStrandsTotal + " / " + x.requiredPairsTotal; });
    row("v2: depth credits (sum, teachable)", function (x) { return x.contractDepthCreditsTotal; });
    row("v2: UNRESOLVED_SOURCE references", function (x) { return x.unresolvedSources; });
  }
  row("Latency median / max (s)", function (x) { return (x.latencyMedianMs / 1000).toFixed(1) + " / " + (x.latencyMaxMs / 1000).toFixed(1); });
  row("Pack cost (listed prices, USD)", function (x) { return "$" + x.packCostListedUsd.toFixed(4); });
  row("Tokens in / out", function (x) { return x.promptTokens + " / " + x.completionTokens; });
  row("Truncated (finish_reason=length)", function (x) { return x.truncated; });
  row("Transport retries", function (x) { return x.retries; });
  lines.push("", "Intent calls: " + summary.intentCalls + " ($" + summary.intentCostListedUsd.toFixed(4) + "). Total paid calls: " + summary.totalCalls + ". Total listed spend: $" + summary.totalListedUsd.toFixed(4) + ". Guard-accounted spend (listed x multiplier, worst case for calls without usage): $" + summary.totalGuardUsd.toFixed(4) + ".", "");
  lines.push("## Per run", "", "| Run | Format valid | Gate verdict | Ready / frozen | Structural roots | Structural longest path | Gate-ready roots | Latency s | Out tokens |", "|---|---|---|---|---|---|---|---|---|");
  records.slice().sort(function (x, y) { return x.runId < y.runId ? -1 : 1; }).forEach(function (r) {
    var g = r.graph || { structural: {}, gateReady: {} };
    lines.push("| " + r.runId + " | " + (r.format.formatValid ? "yes" : "no: " + r.format.problems.join("; ")) + " | " + r.gate.verdict + (r.refusal ? (r.refusal.correct ? " (refusal correct)" : " (refusal NOT correct)") : "") + " | " + (r.gate.readyVsFrozen || "-") + " | " + (g.structural.roots != null ? g.structural.roots : "-") + " | " + (g.structural.longestPathEdges != null ? g.structural.longestPathEdges : "-") + " | " + (g.gateReady.roots != null ? g.gateReady.roots : "-") + " | " + (r.latencyMs != null ? (r.latencyMs / 1000).toFixed(1) : "-") + " | " + (r.completionTokens != null ? r.completionTokens : "-") + " |");
  });
  var v2 = records.filter(function (r) { return r.contract === "v2-harness"; });
  if (v2.length) {
    lines.push("", "## v2 contract per run (deterministic structure only)", "", "| Run | Pack format valid | Units valid | Contract verdict | Strand roots / frozen | Depth credits | Longest path | Unresolved sources | Adapter mechanisms | Engine linked same element |", "|---|---|---|---|---|---|---|---|---|---|");
    v2.slice().sort(function (x, y) { return x.runId < y.runId ? -1 : 1; }).forEach(function (r) {
      var cv = r.contractVerdict || {};
      var link = r.gate && r.gate.linkage ? r.gate.linkage.filter(function (l) { return l.engineLinked === "same element claim"; }).length + "/" + r.gate.linkage.length : "-";
      lines.push("| " + r.runId + " | " + (r.format.packFormatValid ? "yes" : "no") + " | " + (r.format.unitsValid != null ? r.format.unitsValid + "/" + r.format.unitsTotal : "-") + " | " + (cv.verdict || "-") + (cv.reason ? " (" + cv.reason + ")" : "") + " | " + (cv.strands != null ? cv.strands + "/" + cv.frozenCount : "-") + " | " + (cv.depthCredits != null ? cv.depthCredits : "-") + " | " + (cv.longestPassingPath != null ? cv.longestPassingPath : "-") + " | " + (r.sources ? r.sources.unresolved : "-") + " | " + (r.adapter ? r.adapter.mechanisms.length : "-") + " | " + link + " |");
    });
  }
  return lines.join("\n") + "\n";
}

function analyse(outDir, brain, opts) {
  opts = opts || {};
  brain = brain || lib.loadBrain();
  var analysisDir = path.join(outDir, opts.analysisDir || "analysis");
  var config = lib.loadJson(path.join(outDir, "manifest.json")).config;
  var frozen = lib.loadJson(path.join(outDir, "frozen-inputs.json"));
  var ledgerFile = path.join(outDir, "ledger.jsonl");
  var ledger = fs.existsSync(ledgerFile) ? fs.readFileSync(ledgerFile, "utf8").split("\n").filter(Boolean).map(JSON.parse) : [];
  var runs = fs.readdirSync(path.join(outDir, "runs")).filter(function (f) { return /\.json$/.test(f); }).map(function (f) { return lib.loadJson(path.join(outDir, "runs", f)); });
  var records = runs.map(function (run) { return analyseRun(run, frozen.tests[run.test], brain, opts); });
  var summary = summarise(records, ledger, config);
  summary.gateContextAssembly = opts.rawGateContext ? "raw" : "boundary-safe";
  lib.writeJson(path.join(analysisDir, "runs.json"), records);
  lib.writeJson(path.join(analysisDir, "summary.json"), summary);
  fs.writeFileSync(path.join(analysisDir, "SUMMARY.md"), markdown(summary, records) + "\nGate input assembly: " + summary.gateContextAssembly + " (see gate-context.js).\n");
  var csv = ["runId,arm,test,rep,formatValid,gateVerdict,distinctReady,frozenCount,runtimeRequired,refusalCorrect,latencyMs,completionTokens,listedUsd"];
  records.forEach(function (r) {
    csv.push([r.runId, r.arm, r.test, r.rep, r.format.formatValid, r.gate.verdict, r.gate.distinctReady == null ? "" : r.gate.distinctReady, r.frozenCount, r.runtimeRequired, r.refusal ? r.refusal.correct : "", r.latencyMs == null ? "" : r.latencyMs, r.completionTokens == null ? "" : r.completionTokens, r.listedUsd.toFixed(6)].join(","));
  });
  fs.writeFileSync(path.join(analysisDir, "gate-per-run.csv"), csv.join("\n") + "\n");
  return { records: records, summary: summary };
}

module.exports = { analyse: analyse, analyseRun: analyseRun, gateCtxFor: gateCtxFor, formatCheck: formatCheck, graphStats: graphStats, inventedSourceFlags: inventedSourceFlags };

if (require.main === module) {
  var args = process.argv.slice(2);
  var i = args.indexOf("--out");
  if (i === -1) { console.error("--out DIR is required"); process.exit(2); }
  var d = args.indexOf("--analysis-dir");
  var res = analyse(path.resolve(args[i + 1]), null, { analysisDir: d !== -1 ? args[d + 1] : "analysis", rawGateContext: args.indexOf("--raw-gate-context") !== -1 });
  console.log(JSON.stringify(res.summary, null, 2));
}
