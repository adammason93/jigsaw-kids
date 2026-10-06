"use strict";

/* Deterministic evaluation of one v2-contract pack. HARNESS ONLY. No scoring of
   teaching quality: "STRUCTURALLY_COMPLETE" means only that enough format-valid
   units with selectable claims grow from distinct roots; the blind rubric
   decides whether any unit actually passes. */

var V = require("./contract-validate");
var G = require("./contract-graph");
var A = require("./contract-adapter");

function yearNumber(ctx) { var m = String((ctx && ctx.yearGroup) || "").match(/[1-6]/); return m ? Number(m[0]) : null; }

function evaluateContractPack(raw, opts) {
  var brain = opts.brain;
  var request = { unitsRequired: opts.frozenCount, suppliedMaterials: opts.suppliedMaterials || [], humanSupport: opts.humanSupport || {} };
  var validation = V.validateContractPack(raw, request);
  var adapted = A.toEnginePack(raw || {}, validation);
  var gate = A.runFrozenGate(adapted.enginePack, opts.gateCtx, brain);
  var claims = raw && Array.isArray(raw.claims) ? raw.claims : [];

  // Stricter place scope wins: the engine's deterministic placeBound flag on a
  // claim's text also sets needsSource for the contract.
  var enginePlace = {};
  gate.pack.claims.forEach(function (c) { if (c.placeBound) enginePlace[V.norm(c.text)] = c; });
  var placeUnderstated = [];
  Object.keys(validation.claims).forEach(function (id) {
    var v = validation.claims[id];
    var hit = v.text && enginePlace[V.norm(v.text)];
    if (hit && !v.placeFlagged) { placeUnderstated.push(id); v.engineSaysPlaceBound = true; v.effectiveNeedsSource = true; }
  });
  // Claims held by the adapter (contract needsSource) are absent from the engine pack;
  // for those the contract flag already holds them.

  var year = yearNumber(opts.gateCtx);
  var byId = {};
  claims.forEach(function (c) { if (c && c.claimId && !byId[c.claimId]) byId[c.claimId] = c; });
  function holdReason(id) {
    var v = validation.claims[id], c = byId[id];
    if (!v || !c) return "unresolved";
    if (v.effectiveNeedsSource) return "needsSource";
    if (c.contested === true) return "contested";
    if (year && c.ageFit && (year < c.ageFit.from || year > c.ageFit.to)) return "ageFit";
    return "";
  }
  var holds = {};
  Object.keys(byId).forEach(function (id) { var r = holdReason(id); if (r) holds[id] = r; });
  var graph = G.countStrands(validation.units, {
    isSelectable: function (id) { return !!byId[id] && !holds[id]; },
    unitPasses: opts.unitPasses || function (u) { return u.ok; }
  });

  // Gate linkage agreement: did the engine link each adapted unit to the element claim the unit named?
  var engineByText = {};
  gate.pack.claims.forEach(function (c) { engineByText[c.claimId] = c.text; });
  var engineMech = {};
  gate.pack.mechanisms.forEach(function (m) { engineMech[V.norm(m.text)] = m; });
  var linkage = adapted.report.mechanisms.map(function (m) {
    var em = engineMech[V.norm(m.text)];
    var linked = em && em.featureClaimId ? engineByText[em.featureClaimId] : "";
    return { unitId: m.unitId, engineSawMechanism: !!em, engineFeature: em ? em.feature : "", engineLinked: linked ? (V.norm(linked) === V.norm(m.intendedFeatureClaimText) ? "same element claim" : "different claim") : "no link" };
  });

  // Contract-level verdict.
  var modelStatus = String((raw && raw.status) || "").toLowerCase();
  var modelReason = String((raw && raw.statusReason) || "");
  // Request-only probe: the unchanged normaliseKnowledgePack on an empty pack
  // shows whether the REQUEST needs a place-bound source, without the pack's own
  // place names (which the frozen code lets override request places; see
  // PROVENANCE / production bug note).
  var probe = brain.normaliseKnowledgePack({ status: "usable", claims: [], mechanisms: [] }, JSON.parse(JSON.stringify(opts.gateCtx)));
  var requestNeedsSource = /^NEEDS_SOURCE/.test(String(probe.statusReason || ""));
  var mandatorySource = requestNeedsSource || gate.pack.needsSource === true || (modelStatus === "blocked" && /^NEEDS_SOURCE/i.test(modelReason));
  var placeClaimIds = Object.keys(validation.claims).filter(function (id) { var v = validation.claims[id]; return v.placeFlagged || v.engineSaysPlaceBound; });
  var cleared = placeClaimIds.filter(function (id) { return !validation.claims[id].effectiveNeedsSource; });
  var verdict, reason = "";
  if (mandatorySource && !cleared.length) {
    verdict = "BLOCKED_NEEDS_SOURCE";
    reason = validation.unresolvedSources ? "NEEDS_SOURCE: UNRESOLVED_SOURCE" : (!request.suppliedMaterials.length ? "NEEDS_SOURCE: no supplied material" : "NEEDS_SOURCE: UNSUPPORTED_BY_SOURCE (support not recorded)");
  } else if (modelStatus === "blocked") {
    verdict = "BLOCKED_BY_MODEL";
    reason = modelReason;
  } else if (!validation.packFormatValid) {
    verdict = "FORMAT_INVALID";
  } else {
    verdict = graph.strands >= opts.frozenCount ? "STRUCTURALLY_COMPLETE" : "INCOMPLETE";
  }
  var selectablePlace = placeClaimIds.filter(function (id) { return !holds[id]; });
  var engineSelected = {};
  (gate.selection.claimIds || []).forEach(function (id) { engineSelected[id] = 1; });
  var engineSelectablePlace = gate.blocked ? [] : gate.pack.claims.filter(function (c) { return c.placeBound && engineSelected[c.claimId]; });
  var flags = opts.inventedSourceFlags ? opts.inventedSourceFlags(raw) : [];

  var result = {
    contract: "v2-harness",
    format: {
      packFormatValid: validation.packFormatValid,
      formatValidStrict: validation.formatValidStrict,
      packErrors: validation.packErrors,
      claimErrors: Object.keys(validation.claims).filter(function (id) { return validation.claims[id].errors.length; }).map(function (id) { return { claimId: id, errors: validation.claims[id].errors }; }),
      unitsValid: validation.unitsValid,
      unitsTotal: validation.unitsTotal,
      unitErrors: validation.units.filter(function (u) { return !u.ok; }).map(function (u) { return { unitId: u.unitId, errors: u.errors }; }),
      misconceptionErrors: validation.misconceptionErrors
    },
    sources: { checks: validation.sources, unresolved: validation.unresolvedSources, placeUnderstated: placeUnderstated, requestNeedsSource: requestNeedsSource, gateNeedsSource: gate.pack.needsSource === true },
    holds: holds,
    graph: graph,
    contractVerdict: { verdict: verdict, reason: reason, frozenCount: opts.frozenCount, strands: graph.strands, depthCredits: graph.depthCredits, longestPassingPath: graph.longestPassingPath, basis: "deterministic structure only (format-valid units, selectable claims); teaching quality needs the blind rubric" },
    adapter: adapted.report,
    gate: {
      verdict: gate.verdict,
      modelStatus: modelStatus,
      packStatus: gate.pack.status,
      packStatusReason: gate.pack.statusReason,
      needsSource: gate.pack.needsSource,
      selectionStatus: gate.selection.status,
      readinessStatus: gate.readiness.status,
      requiredPairs: gate.readiness.requiredPairs,
      distinctReady: gate.readiness.distinctReady,
      readyVsFrozen: gate.blocked ? null : gate.readiness.distinctReady + "/" + opts.frozenCount,
      meetsFrozenCount: gate.blocked ? false : gate.readiness.distinctReady >= opts.frozenCount,
      linkage: linkage,
      examined: (gate.readiness.pairs || []).map(function (p) { return { mechanismClaimId: p.mechanismClaimId, featureClaimId: p.featureClaimId, ready: p.ready, gaps: p.gaps }; })
    }
  };
  if (opts.group === "refusal") {
    var needs = /^NEEDS_SOURCE/.test(String(gate.pack.statusReason || ""));
    result.refusal = {
      contractBlockedNeedsSource: verdict === "BLOCKED_NEEDS_SOURCE",
      gateBlockedNeedsSource: gate.pack.status === "blocked" && needs,
      selectablePlaceBoundContract: selectablePlace.length,
      selectablePlaceBoundGate: engineSelectablePlace.length,
      unresolvedSourceRefs: validation.unresolvedSources,
      inventedSourceFlags: flags,
      blockedBy: modelStatus === "blocked" ? "model" : (verdict === "BLOCKED_NEEDS_SOURCE" ? "code" : "none"),
      correct: verdict === "BLOCKED_NEEDS_SOURCE" && gate.pack.status === "blocked" && needs && selectablePlace.length === 0 && engineSelectablePlace.length === 0 && validation.unresolvedSources === 0 && flags.length === 0
    };
  }
  return { result: result, validation: validation, adapted: adapted, gateRaw: gate };
}

module.exports = { evaluateContractPack: evaluateContractPack };
