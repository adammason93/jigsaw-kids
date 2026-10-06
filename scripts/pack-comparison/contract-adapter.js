"use strict";

/* Compatibility adapter: v2 contract pack -> the frozen engine's raw pack shape,
   so the UNCHANGED normaliseKnowledgePack -> selectPackForLesson ->
   assessPackReadiness can run for gate agreement. HARNESS ONLY.

   Rules (founder, Tue 6 Oct 2026):
   - Never invents an explanation. Every mechanisms[].text is the verbatim text
     of the contract claim a format-valid unit names as its explanation; every
     feature is that unit's element.phrase. A unit with no valid explanation
     produces nothing.
   - Examples never become mechanisms or strands: example claims are passed as
     kind "example", depth "concrete".
   - Claims that are not the explanation of a kept unit are passed with depth
     "concrete" (a model "mechanism" depth on a claim no unit uses is demoted and
     logged), so the engine cannot derive a mechanism the units did not state.
   - Strand minima are not touched. The engine computes strandsRequiredFor from
     the frozen context; the harness compares with the frozen count separately.
   - Place-bound claims whose needsSource is not cleared (resolved source +
     recorded SUPPORTED) are held out of the engine pack, with every unit that
     uses them: they are never selectable.
   - The engine re-derives featureClaimId itself from the feature phrase
     (featureClaimFor). The adapter records the element claim it intended, and
     the harness reports whether the engine linked the same claim. It never
     overrides the engine. */

var KIND_MAP = { fact: "fact", definition: "definition", event: "fact", property: "fact", process_step: "fact", method: "fact", rule: "fact", technique: "fact" };

function text(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }

function toEnginePack(raw, validation) {
  var report = { mechanisms: [], droppedUnits: [], heldClaims: [], exampleClaims: [], depthDemoted: [], explanationsShared: [] };
  var claims = raw && Array.isArray(raw.claims) ? raw.claims : [];
  var byId = {};
  claims.forEach(function (c) { if (c && c.claimId && !byId[c.claimId]) byId[c.claimId] = c; });
  var held = {};
  Object.keys(validation.claims || {}).forEach(function (id) {
    var v = validation.claims[id];
    if (v && v.effectiveNeedsSource) { held[id] = 1; report.heldClaims.push({ claimId: id, reason: "needsSource not cleared (" + (v.source.present ? v.source.status : "no source") + ")" }); }
  });
  var kept = [];
  (validation.units || []).forEach(function (u) {
    if (!u.ok) { report.droppedUnits.push({ unitId: u.unitId, reasons: u.errors.slice() }); return; }
    if (held[u.elementClaimId] || held[u.explanationClaimId]) { report.droppedUnits.push({ unitId: u.unitId, reasons: ["HELD_CLAIM"] }); return; }
    kept.push(u);
  });
  var explanationOf = {}, exampleIds = {};
  kept.forEach(function (u) {
    (explanationOf[u.explanationClaimId] = explanationOf[u.explanationClaimId] || []).push(u);
    u.exampleClaimIds.forEach(function (id) { exampleIds[id] = 1; });
  });
  Object.keys(explanationOf).forEach(function (id) {
    if (explanationOf[id].length > 1) report.explanationsShared.push({ explanationClaimId: id, units: explanationOf[id].map(function (u) { return u.unitId; }), note: "the frozen engine keys features by mechanism text, so it sees only one feature for this explanation" });
  });
  var outClaims = [];
  claims.forEach(function (c) {
    if (!c || !c.claimId || byId[c.claimId] !== c || held[c.claimId]) return;
    var isExplanation = !!explanationOf[c.claimId];
    var isExample = !!exampleIds[c.claimId] && !isExplanation && !kept.some(function (u) { return u.elementClaimId === c.claimId; });
    var depth = isExplanation ? (c.depth === "system" ? "system" : "mechanism") : (c.depth === "system" ? "system" : "concrete");
    if (!isExplanation && c.depth === "mechanism") report.depthDemoted.push(c.claimId);
    if (isExample) report.exampleClaims.push(c.claimId);
    var fp = raw.falsePremise && typeof raw.falsePremise === "object" ? raw.falsePremise : null;
    outClaims.push({
      text: text(c.text),
      kind: isExplanation ? "mechanism" : (isExample ? "example" : (KIND_MAP[c.kind] || "fact")),
      depth: depth,
      confidence: c.confidence,
      provenance: c.provenance === "teacher_material" && validation.claims[c.claimId] && validation.claims[c.claimId].source.status === "RESOLVED" ? "teacher_material" : "model",
      teacherRequested: c.teacherRequested === true,
      factuallyVerified: false,
      contested: c.contested === true,
      uncertainty: c.uncertainty || "",
      ageFit: c.ageFit,
      correctsPremise: !!(fp && fp.correctionClaimId === c.claimId),
      importance: c.importance === "supporting" ? "supporting" : "core",
      accepted: true
    });
  });
  var mechanisms = [];
  var seenText = {};
  kept.forEach(function (u) {
    var ex = byId[u.explanationClaimId];
    var t = text(ex.text);
    report.mechanisms.push({ unitId: u.unitId, elementClaimId: u.elementClaimId, explanationClaimId: u.explanationClaimId, text: t, feature: text(u.elementPhrase), intendedFeatureClaimText: text(byId[u.elementClaimId].text) });
    if (seenText[t.toLowerCase()]) return;
    seenText[t.toLowerCase()] = 1;
    mechanisms.push({ text: t, feature: text(u.elementPhrase), featureClaimId: u.elementClaimId });
  });
  var fp2 = raw && raw.falsePremise && typeof raw.falsePremise === "object" ? text(raw.falsePremise.assumption) : "";
  var misByClaim = {};
  claims.forEach(function (c) { if (c && c.claimId) misByClaim[c.claimId] = text(c.text); });
  var enginePack = {
    status: raw && raw.status,
    falsePremise: fp2,
    blockReason: raw && raw.statusReason ? text(raw.statusReason) : "",
    niche: false,
    claims: outClaims,
    mechanisms: mechanisms,
    concepts: [],
    vocabulary: raw && Array.isArray(raw.vocabulary) ? raw.vocabulary : [],
    misconceptions: (raw && Array.isArray(raw.misconceptions) ? raw.misconceptions : []).map(function (m) { return { text: m && m.text, corrects: m && misByClaim[m.correctedByClaimId] || "" }; }),
    openQuestions: raw && Array.isArray(raw.openQuestions) ? raw.openQuestions : []
  };
  return { enginePack: enginePack, report: report };
}

function runFrozenGate(enginePack, gateCtx, brain) {
  var ctx = JSON.parse(JSON.stringify(gateCtx));
  var pack = brain.normaliseKnowledgePack(JSON.parse(JSON.stringify(enginePack)), ctx);
  var selection = brain.selectPackForLesson(pack, ctx);
  var readiness = brain.assessPackReadiness(pack, selection, ctx);
  var blocked = pack.status === "blocked" || selection.status === "blocked";
  return { pack: pack, selection: selection, readiness: readiness, blocked: blocked, verdict: blocked ? "KNOWLEDGE_BLOCKED" : (readiness.status === "ready" ? "READY" : "PACK_INCOMPLETE") };
}

module.exports = { toEnginePack: toEnginePack, runFrozenGate: runFrozenGate };
