"use strict";

/* Format validator and source checks for the v2 pack contract. HARNESS ONLY.

   validateContractPack(raw, request) -> {
     packErrors[], claims: { id: { errors[], source, effectiveNeedsSource } },
     units: [{ unitId, ok, errors[], elementClaimId, explanationClaimId, ... }],
     packFormatValid, unitsValid, unitsTotal, formatValidStrict, sources: [...]
   }

   request = { unitsRequired, suppliedMaterials: [...], humanSupport: { claimId: { status, by, at, method } } }

   Error codes (format, deterministic):
     NOT_OBJECT, STATUS_INVALID, STATUS_REASON_MISSING, CLAIMS_MISSING, UNITS_MISSING,
     FEWER_UNITS_NO_REASON, FALSE_PREMISE_INVALID,
     CLAIM_ID_MISSING, CLAIM_ID_DUPLICATE, TEXT_MISSING, KIND_INVALID, DEPTH_INVALID,
     AGEFIT_INVALID, CONFIDENCE_INVALID, PROVENANCE_INVALID, PROVENANCE_WITHOUT_MATERIAL,
     FACTUALLY_VERIFIED_NOT_FALSE, LOCAL_SCOPE_INVALID, PLACES_MISSING, NEEDS_SOURCE_INVALID,
     PLACE_FLAGS_INCONSISTENT, CONTESTED_INVALID, UNCERTAINTY_MISSING, TEACHER_REQUESTED_INVALID,
     SOURCE_REF_INVALID, UNRESOLVED_SOURCE,
     UNIT_ID_MISSING, UNIT_ID_DUPLICATE, RELATION_TYPE_INVALID, ELEMENT_MISSING,
     MISSING_EXPLANATION, FUSED_ELEMENT_EXPLANATION, UNRESOLVED_CLAIM_ID,
     ELEMENT_EQUALS_EXPLANATION, PHRASE_MISSING, PHRASE_NOT_VERBATIM, PHRASE_TOO_LONG,
     GOAL_LINK_MISSING, EXAMPLE_ID_UNRESOLVED, EXAMPLE_IS_UNIT_CLAIM, MISCONCEPTION_ID_UNRESOLVED,
     CYCLE, MISCONCEPTION_INVALID

   A unit error fails that unit only (contract rule: unknown ids are never moved
   onto a neighbouring claim). Pack- and claim-level errors fail the pack format.
   Nothing here judges teaching substance; a present phrase is not proof of a
   real how/why. */

var P = require("./contract-prompt");

var STATUS = { usable: 1, qualified: 1, blocked: 1 };
var CONF = { high: 1, medium: 1, low: 1 };
var PROV = { model: 1, teacher_material: 1 };
var SCOPE = { none: 1, named_place: 1, place_bound: 1 };
var KIND = {}; P.CLAIM_KINDS.forEach(function (k) { KIND[k] = 1; });
var DEPTH = {}; P.DEPTHS.forEach(function (k) { DEPTH[k] = 1; });
var REL = {}; P.RELATION_TYPES.forEach(function (k) { REL[k] = 1; });
var CONNECTIVE = /\b(because|so that|so|which means|therefore|by|in order to|this means|as a result)\b/i;

function norm(text) {
  return String(text == null ? "" : text)
    .replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d]/g, "\"").replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ").trim().toLowerCase();
}
function phraseCore(text) { return norm(text).replace(/^[\s"'.,;:!?]+|[\s"'.,;:!?]+$/g, ""); }
function verbatim(phrase, text) { var p = phraseCore(phrase); return !!p && norm(text).indexOf(p) !== -1; }
function wordCount(text) { var t = norm(text); return t ? t.split(" ").length : 0; }
function isBool(v) { return v === true || v === false; }
function str(v) { return typeof v === "string" && v.trim() ? v.trim() : ""; }

// Check 1 of v2 §2.5 (code, deterministic). Check 2 (support) is human only.
function resolveSourceRef(ref, suppliedMaterials) {
  if (ref == null) return { present: false, status: "NONE" };
  if (typeof ref !== "object" || Array.isArray(ref)) return { present: true, status: "UNRESOLVED_SOURCE", reason: "sourceRef is not an object" };
  var materials = Array.isArray(suppliedMaterials) ? suppliedMaterials : [];
  if (!materials.length) return { present: true, status: "UNRESOLVED_SOURCE", reason: "no material was supplied in this request" };
  var mat = materials.filter(function (m) { return m && m.sourceId === ref.sourceId; })[0];
  if (!mat) return { present: true, status: "UNRESOLVED_SOURCE", reason: "sourceId '" + String(ref.sourceId) + "' is not in suppliedMaterials" };
  var seg = (mat.segments || []).filter(function (s) { return s && s.locator === ref.locator; })[0];
  if (!seg) return { present: true, status: "UNRESOLVED_SOURCE", reason: "locator '" + String(ref.locator) + "' is not in " + mat.sourceId };
  var quote = norm(ref.quote);
  if (!quote || quote.length > 300 || norm(seg.text).indexOf(quote) === -1) return { present: true, status: "UNRESOLVED_SOURCE", reason: "quote is not a verbatim substring of the segment (or is empty / over 300 chars)" };
  return { present: true, status: "RESOLVED" };
}

function validateContractPack(raw, request) {
  request = request || {};
  var out = { packErrors: [], claims: {}, claimOrder: [], units: [], sources: [], misconceptionErrors: [] };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    out.packErrors.push("NOT_OBJECT");
    return finish(out);
  }
  var status = String(raw.status || "").toLowerCase();
  if (!STATUS[status]) out.packErrors.push("STATUS_INVALID");
  if (status && status !== "usable" && !str(raw.statusReason)) out.packErrors.push("STATUS_REASON_MISSING");
  var claims = Array.isArray(raw.claims) ? raw.claims : null;
  var units = Array.isArray(raw.units) ? raw.units : null;
  if (!claims || (!claims.length && status !== "blocked")) out.packErrors.push("CLAIMS_MISSING");
  if (!units || (!units.length && status !== "blocked")) out.packErrors.push("UNITS_MISSING");
  var materials = Array.isArray(request.suppliedMaterials) ? request.suppliedMaterials : [];
  var human = request.humanSupport || {};

  // Claims
  var byId = {};
  (claims || []).forEach(function (c, i) {
    var errs = [];
    var id = c && str(c.claimId);
    var key = id || ("#" + i);
    if (!c || typeof c !== "object") { out.claims[key] = { errors: ["TEXT_MISSING"] }; out.claimOrder.push(key); return; }
    if (!id) errs.push("CLAIM_ID_MISSING");
    else if (byId[id]) errs.push("CLAIM_ID_DUPLICATE");
    if (!str(c.text)) errs.push("TEXT_MISSING");
    if (!KIND[String(c.kind || "")]) errs.push("KIND_INVALID");
    if (!DEPTH[String(c.depth || "")]) errs.push("DEPTH_INVALID");
    var af = c.ageFit;
    if (!af || typeof af !== "object" || !(af.from >= 1 && af.from <= 6) || !(af.to >= 1 && af.to <= 6) || af.from > af.to) errs.push("AGEFIT_INVALID");
    if (!CONF[String(c.confidence || "")]) errs.push("CONFIDENCE_INVALID");
    var prov = String(c.provenance || "");
    if (!PROV[prov]) errs.push("PROVENANCE_INVALID");
    if (prov === "teacher_material" && !materials.length) errs.push("PROVENANCE_WITHOUT_MATERIAL");
    if (c.factuallyVerified !== false) errs.push("FACTUALLY_VERIFIED_NOT_FALSE");
    var scope = String(c.localScope || "");
    if (!SCOPE[scope]) errs.push("LOCAL_SCOPE_INVALID");
    if (scope && scope !== "none" && !(Array.isArray(c.places) && c.places.some(str))) errs.push("PLACES_MISSING");
    if (!isBool(c.needsSource)) errs.push("NEEDS_SOURCE_INVALID");
    if (scope === "place_bound" && c.needsSource !== true) errs.push("PLACE_FLAGS_INCONSISTENT");
    if (scope === "none" && Array.isArray(c.places) && c.places.some(str)) errs.push("PLACE_FLAGS_INCONSISTENT");
    if (!isBool(c.contested)) errs.push("CONTESTED_INVALID");
    if (c.contested === true && !str(c.uncertainty)) errs.push("UNCERTAINTY_MISSING");
    if (!isBool(c.teacherRequested)) errs.push("TEACHER_REQUESTED_INVALID");
    // Sources: any populated reference is resolved against THIS request.
    var src = resolveSourceRef(c.sourceRef, materials);
    if (src.present && src.status === "UNRESOLVED_SOURCE") errs.push("UNRESOLVED_SOURCE");
    if (prov === "teacher_material" && !src.present) errs.push("SOURCE_REF_INVALID");
    var support = src.status === "RESOLVED"
      ? (human[key] && (human[key].method === "human" || human[key].method === "verifier") ? human[key] : { status: "unchecked" })
      : (src.present ? { status: "UNRESOLVED_SOURCE" } : { status: "none" });
    // needsSource is set by place binding (model flag or code) and cleared ONLY by
    // resolution + recorded SUPPORTED. A populated reference never clears it.
    var flagged = scope === "place_bound" || c.needsSource === true;
    var cleared = src.status === "RESOLVED" && support.status === "SUPPORTED";
    var rec = { errors: errs, text: str(c.text), kind: c.kind, depth: c.depth, localScope: scope, modelNeedsSource: c.needsSource, source: src, sourceSupport: support, placeFlagged: flagged, effectiveNeedsSource: flagged && !cleared, index: i };
    out.claims[key] = rec;
    out.claimOrder.push(key);
    if (id && !byId[id]) byId[id] = c;
    if (src.present) out.sources.push({ claimId: key, sourceRef: c.sourceRef, resolution: src.status, reason: src.reason || "", sourceSupport: support.status, needsSourceAfter: rec.effectiveNeedsSource });
  });

  // Misconceptions
  var misIds = {};
  (Array.isArray(raw.misconceptions) ? raw.misconceptions : []).forEach(function (m, i) {
    if (!m || !str(m.misconceptionId) || !str(m.text)) { out.misconceptionErrors.push({ index: i, error: "MISCONCEPTION_INVALID" }); return; }
    misIds[m.misconceptionId] = 1;
    if (m.correctedByClaimId != null && !byId[m.correctedByClaimId]) out.misconceptionErrors.push({ index: i, error: "UNRESOLVED_CLAIM_ID" });
  });

  // False premise
  if (raw.falsePremise != null && raw.falsePremise !== false) {
    var fp = raw.falsePremise;
    if (typeof fp !== "object" || !str(fp.assumption) || (fp.correctionClaimId != null && !byId[fp.correctionClaimId])) out.packErrors.push("FALSE_PREMISE_INVALID");
  }

  // Units
  var unitIds = {};
  (units || []).forEach(function (u, i) {
    var errs = [];
    var rec = { index: i, unitId: u && str(u.unitId) || ("#" + i), errors: errs, relationType: u && u.relationType, exampleClaimIds: [] };
    out.units.push(rec);
    if (!u || typeof u !== "object") { errs.push("ELEMENT_MISSING"); return; }
    if (!str(u.unitId)) errs.push("UNIT_ID_MISSING");
    else if (unitIds[u.unitId]) errs.push("UNIT_ID_DUPLICATE");
    unitIds[u.unitId] = 1;
    if (!REL[String(u.relationType || "")]) errs.push("RELATION_TYPE_INVALID");
    var el = u.element && typeof u.element === "object" ? u.element : null;
    var ex = u.explanation && typeof u.explanation === "object" ? u.explanation : null;
    var elId = el && str(el.claimId);
    var exId = ex && str(ex.claimId);
    rec.elementClaimId = elId || "";
    rec.explanationClaimId = exId || "";
    rec.elementPhrase = el ? String(el.phrase || "") : "";
    rec.stepPhrase = ex ? String(ex.stepPhrase || "") : "";
    rec.outcomePhrase = ex ? String(ex.outcomePhrase || "") : "";
    if (!elId) errs.push("ELEMENT_MISSING");
    else if (!byId[elId]) errs.push("UNRESOLVED_CLAIM_ID");
    var elText = elId && byId[elId] ? String(byId[elId].text || "") : "";
    if (!exId) {
      errs.push("MISSING_EXPLANATION");
      // Fused: the how/why sits inside the element claim instead of a separate claim.
      if (elText && ((rec.stepPhrase && verbatim(rec.stepPhrase, elText)) || CONNECTIVE.test(elText))) errs.push("FUSED_ELEMENT_EXPLANATION");
    } else if (!byId[exId]) {
      errs.push("UNRESOLVED_CLAIM_ID");
    }
    if (elId && exId && elId === exId) {
      errs.push("ELEMENT_EQUALS_EXPLANATION");
      if (elText && CONNECTIVE.test(elText)) errs.push("FUSED_ELEMENT_EXPLANATION");
    }
    var exText = exId && byId[exId] ? String(byId[exId].text || "") : "";
    if (el) {
      if (!str(el.phrase)) errs.push("PHRASE_MISSING");
      else { if (elText && !verbatim(el.phrase, elText)) errs.push("PHRASE_NOT_VERBATIM"); if (wordCount(el.phrase) > 8) errs.push("PHRASE_TOO_LONG"); }
    }
    if (ex && exId) {
      if (!str(ex.stepPhrase) || !str(ex.outcomePhrase)) errs.push("PHRASE_MISSING");
      if (str(ex.stepPhrase) && exText && !verbatim(ex.stepPhrase, exText)) errs.push("PHRASE_NOT_VERBATIM");
      if (str(ex.outcomePhrase) && exText && !verbatim(ex.outcomePhrase, exText)) errs.push("PHRASE_NOT_VERBATIM");
      if (wordCount(ex.stepPhrase) > 20 || wordCount(ex.outcomePhrase) > 10) errs.push("PHRASE_TOO_LONG");
    }
    if (!str(u.goalLink)) errs.push("GOAL_LINK_MISSING");
    else if (wordCount(u.goalLink) > 20) errs.push("PHRASE_TOO_LONG");
    (Array.isArray(u.exampleClaimIds) ? u.exampleClaimIds : []).forEach(function (eid) {
      if (!byId[eid]) errs.push("EXAMPLE_ID_UNRESOLVED");
      else if (eid === elId || eid === exId) errs.push("EXAMPLE_IS_UNIT_CLAIM");
      else rec.exampleClaimIds.push(eid);
    });
    (Array.isArray(u.misconceptionIds) ? u.misconceptionIds : []).forEach(function (mid) { if (!misIds[mid]) errs.push("MISCONCEPTION_ID_UNRESOLVED"); });
  });

  // Cycles: a cycle is a format failure for every unit on it.
  var edges = out.units.filter(function (u) { return u.elementClaimId && u.explanationClaimId && byId[u.elementClaimId] && byId[u.explanationClaimId] && u.elementClaimId !== u.explanationClaimId; });
  var adj = {};
  edges.forEach(function (u) { (adj[u.elementClaimId] = adj[u.elementClaimId] || []).push(u); });
  edges.forEach(function (u) {
    // u is on a cycle when its explanation can reach its element.
    var seen = {}, stack = [u.explanationClaimId];
    while (stack.length) {
      var n = stack.pop();
      if (n === u.elementClaimId) { if (u.errors.indexOf("CYCLE") === -1) u.errors.push("CYCLE"); break; }
      if (seen[n]) continue;
      seen[n] = 1;
      (adj[n] || []).forEach(function (next) { stack.push(next.explanationClaimId); });
    }
  });

  var unitsRequired = typeof request.unitsRequired === "number" ? request.unitsRequired : null;
  if (unitsRequired != null && status !== "blocked" && (units || []).length < unitsRequired && !str(raw.fewerUnitsReason)) out.packErrors.push("FEWER_UNITS_NO_REASON");
  return finish(out);
}

function finish(out) {
  out.units.forEach(function (u) { u.ok = u.errors.length === 0; });
  var claimErrorCount = Object.keys(out.claims).reduce(function (s, k) { return s + out.claims[k].errors.length; }, 0);
  out.claimErrorCount = claimErrorCount;
  out.unitsTotal = out.units.length;
  out.unitsValid = out.units.filter(function (u) { return u.ok; }).length;
  out.hasCycle = out.units.some(function (u) { return u.errors.indexOf("CYCLE") !== -1; });
  out.packFormatValid = out.packErrors.length === 0 && claimErrorCount === 0 && out.misconceptionErrors.length === 0 && !out.hasCycle;
  out.formatValidStrict = out.packFormatValid && out.unitsValid === out.unitsTotal;
  out.unresolvedSources = out.sources.filter(function (s) { return s.resolution === "UNRESOLVED_SOURCE"; }).length;
  return out;
}

module.exports = { validateContractPack: validateContractPack, resolveSourceRef: resolveSourceRef, verbatim: verbatim, norm: norm };
