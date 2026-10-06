"use strict";

/* Blind scoring packets for the teachable pack runs (no model calls).
   node scripts/pack-comparison/blind-export.js --out DIR [--blind-seed N]

   - One packet per teachable run (T1-T7 x repeats x arms).
   - Packets contain only: year, request, the shared learning goal, the frozen
     unit count, admitted claims (re-keyed K1..Kn, with a selected flag), the
     derived units (element -> explanation, re-keyed) and vocabulary.
   - Removed: model names, arm, run ids, latency, tokens, cost, original claim
     ids, gate verdicts and gap text, pack status text.
   - Selection flags use the same boundary-safe gate input assembly as
     analyse.js (gate-context.js).
   - v2-contract runs: claims re-keyed K1..Kn from the contract claims, units
     with their element / explanation claims, verbatim phrases, relationType,
     goalLink, example ids, the code's format errors per unit, and the
     contract's hold reason per claim (needsSource / contested / ageFit).
   - Order is shuffled with a seed drawn at export time (or --blind-seed). The
     seed and the full mapping are written ONLY to UNBLIND_KEY.json, outside
     the blind folder. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var lib = require("./lib");
var gateContext = require("./gate-context");
var contractEval = require("./contract-evaluate");

var IDENTIFYING = /gpt|openai|4o-mini|gpt-4\.1|latency|tokens?\b|arm [ab]\b/i;

function packetFor(run, frozenTest, brain) {
  var ctx = frozenTest.contextAfterIntent;
  var intent = frozenTest.normalisedTeacherIntent || {};
  var base = {
    year: ctx.yearGroup,
    subject: ctx.subject,
    request: frozenTest.contextInput.lessonText,
    learningGoal: intent.ok ? intent.learningGoal : "",
    requiredUnits: frozenTest.frozenCount
  };
  var idMap = {};
  if (!run.parsedPack) {
    return { packet: Object.assign(base, { packProduced: false, note: "No parsable knowledge pack was returned for this run. Score it as a pack fail.", claims: [], units: [], vocabulary: [] }), idMap: idMap };
  }
  var c = gateContext.boundarySafeGateContext(ctx).ctx;
  if (frozenTest.packContract === "v2-harness") return contractPacket(run, frozenTest, brain, base, c);
  var pack = brain.normaliseKnowledgePack(lib.clone(run.parsedPack), c);
  var selection = brain.selectPackForLesson(pack, c);
  var selected = {};
  (selection.claimIds || []).forEach(function (id) { selected[id] = 1; });
  // When the frozen code's selection is blocked there is no selected set. The
  // flag is then null ("n/a") and the scorer treats every admitted claim as in
  // scope, so the rubric is not silently narrowed by a gate outcome.
  var selectionAvailable = selection.status !== "blocked";
  var claims = pack.claims.map(function (claim, i) {
    var k = "K" + (i + 1);
    idMap[k] = claim.claimId;
    return { id: k, text: claim.text, selectedForLesson: selectionAvailable ? !!selected[claim.claimId] : null };
  });
  var rev = {};
  Object.keys(idMap).forEach(function (k) { rev[idMap[k]] = k; });
  var units = pack.mechanisms.map(function (m, i) {
    var el = m.featureClaimId && rev[m.featureClaimId] && m.featureClaimId !== m.claimId ? { id: rev[m.featureClaimId], text: (pack.claims.filter(function (x) { return x.claimId === m.featureClaimId; })[0] || {}).text } : null;
    return {
      unit: "U" + (i + 1),
      element: el,
      elementNote: el ? "" : "no element linked",
      featurePhrase: m.feature || "",
      explanation: { id: rev[m.claimId], text: m.text }
    };
  });
  return {
    packet: Object.assign(base, {
      packProduced: true,
      selectionNote: selectionAvailable ? "" : "Code selection is not available for this packet. Treat every admitted claim as selected (in scope for units and for the S3 = 0 check).",
      claims: claims,
      units: units,
      vocabulary: (pack.vocabulary || []).map(function (v) { return { term: v.term, gloss: v.gloss }; })
    }),
    idMap: idMap
  };
}

function contractPacket(run, frozenTest, brain, base, gateCtx) {
  var ev = contractEval.evaluateContractPack(run.parsedPack, { brain: brain, gateCtx: gateCtx, frozenCount: frozenTest.frozenCount, suppliedMaterials: frozenTest.suppliedMaterials || [], group: run.group });
  var raw = run.parsedPack;
  var idMap = {}, rev = {};
  var claims = (Array.isArray(raw.claims) ? raw.claims : []).filter(function (cl) { return cl && typeof cl.text === "string" && cl.text.trim(); }).map(function (cl, i) {
    var k = "K" + (i + 1);
    idMap[k] = String(cl.claimId || "");
    if (cl.claimId != null && rev[cl.claimId] === undefined) rev[cl.claimId] = k;
    return { id: k, text: cl.text, localScope: cl.localScope || "", needsSource: cl.needsSource, held: ev.result.holds[cl.claimId] || "" };
  });
  function ref(id) { return id && rev[id] ? rev[id] : (id ? "(unresolved id)" : "(none)"); }
  function textOf(id) { var k = rev[id]; var hit = claims.filter(function (x) { return x.id === k; })[0]; return hit ? hit.text : ""; }
  var units = ev.validation.units.map(function (u, i) {
    return {
      unit: "U" + (i + 1),
      relationType: u.relationType || "",
      element: { id: ref(u.elementClaimId), text: textOf(u.elementClaimId), phrase: u.elementPhrase },
      explanation: { id: ref(u.explanationClaimId), text: textOf(u.explanationClaimId), stepPhrase: u.stepPhrase, outcomePhrase: u.outcomePhrase },
      goalLink: ((raw.units || [])[i] || {}).goalLink || "",
      examples: u.exampleClaimIds.map(ref),
      codeFormatErrors: u.errors.slice()
    };
  });
  return {
    packet: Object.assign(base, {
      packProduced: true,
      contract: "v2",
      selectionNote: "Claims marked held are not selectable under the contract (needsSource not cleared, contested, or outside the year's ageFit). All other claims are in scope for units and for the S3 = 0 check.",
      fewerUnitsReason: raw.fewerUnitsReason || "",
      claims: claims,
      units: units,
      vocabulary: (Array.isArray(raw.vocabulary) ? raw.vocabulary : []).map(function (v) { return { term: v && v.term, gloss: v && v.gloss }; })
    }),
    idMap: idMap
  };
}

function packetMarkdown(id, p) {
  var lines = ["# Blind packet " + id, "", "- **Year:** " + p.year, "- **Subject:** " + p.subject, "- **Teacher request:** \"" + p.request + "\"", "- **Learning goal (shared):** " + (p.learningGoal || "(none)"), "- **Distinct strands required (frozen):** " + p.requiredUnits, ""];
  if (!p.packProduced) { lines.push(p.note, ""); return lines.join("\n"); }
  if (p.contract === "v2") return contractMarkdown(lines, p);
  lines.push("## Units (element -> explanation)", "");
  if (!p.units.length) lines.push("(no units)", "");
  p.units.forEach(function (u) {
    lines.push("### " + u.unit, "- **Element:** " + (u.element ? u.element.id + ": \"" + u.element.text + "\"" : "(" + u.elementNote + ")"), "- **Feature phrase:** \"" + u.featurePhrase + "\"", "- **Explanation:** " + u.explanation.id + ": \"" + u.explanation.text + "\"", "");
  });
  lines.push("## All admitted claims", "");
  if (p.selectionNote) lines.push(p.selectionNote, "");
  lines.push("| Id | Selected for lesson | Text |", "|---|---|---|");
  p.claims.forEach(function (c) { lines.push("| " + c.id + " | " + (c.selectedForLesson === null ? "n/a" : (c.selectedForLesson ? "yes" : "no")) + " | " + c.text.replace(/\|/g, "/") + " |"); });
  if (p.vocabulary.length) {
    lines.push("", "## Vocabulary", "");
    p.vocabulary.forEach(function (v) { lines.push("- **" + v.term + "**: " + (v.gloss || "")); });
  }
  lines.push("");
  return lines.join("\n");
}

function contractMarkdown(lines, p) {
  lines.push("## Units (element -> explanation)", "");
  if (p.fewerUnitsReason) lines.push("Reason given for fewer units: \"" + p.fewerUnitsReason + "\"", "");
  if (!p.units.length) lines.push("(no units)", "");
  p.units.forEach(function (u) {
    lines.push("### " + u.unit + " (" + u.relationType + ")",
      "- **Element:** " + u.element.id + ": \"" + u.element.text + "\" (phrase: \"" + u.element.phrase + "\")",
      "- **Explanation:** " + u.explanation.id + ": \"" + u.explanation.text + "\" (step: \"" + u.explanation.stepPhrase + "\"; outcome: \"" + u.explanation.outcomePhrase + "\")",
      "- **Goal link:** " + u.goalLink,
      "- **Examples:** " + (u.examples.length ? u.examples.join(", ") : "(none)"),
      "- **Code format check:** " + (u.codeFormatErrors.length ? u.codeFormatErrors.join(", ") : "no errors"), "");
  });
  lines.push("## All claims", "", p.selectionNote, "", "| Id | Held | Local scope | Text |", "|---|---|---|---|");
  p.claims.forEach(function (c) { lines.push("| " + c.id + " | " + (c.held || "no") + " | " + c.localScope + " | " + c.text.replace(/\|/g, "/") + " |"); });
  if (p.vocabulary.length) {
    lines.push("", "## Vocabulary", "");
    p.vocabulary.forEach(function (v) { lines.push("- **" + v.term + "**: " + (v.gloss || "")); });
  }
  lines.push("");
  return lines.join("\n");
}

function exportBlind(outDir, opts) {
  opts = opts || {};
  var brain = opts.brain || lib.loadBrain();
  var frozen = lib.loadJson(path.join(outDir, "frozen-inputs.json"));
  var runs = fs.readdirSync(path.join(outDir, "runs")).filter(function (f) { return /\.json$/.test(f); }).map(function (f) { return lib.loadJson(path.join(outDir, "runs", f)); });
  var teach = runs.filter(function (r) { return r.group === "teachable"; }).sort(function (a, b) { return a.runId < b.runId ? -1 : 1; });
  var seed = typeof opts.blindSeed === "number" ? opts.blindSeed : crypto.randomBytes(4).readUInt32BE(0);
  var order = lib.shuffle(teach, seed);
  var blindDir = path.join(outDir, opts.blindDirName || "blind");
  fs.mkdirSync(blindDir, { recursive: true });
  var key = { warning: "UNBLINDING KEY. Do not give to the blind scorer.", blindSeed: seed, createdAt: new Date().toISOString(), packets: {} };
  var leaks = [];
  var index = ["# Blind scoring packets", "", "Score each packet with the frozen rubric (CALIBRATION_PACKET.md section 3) after calibration has passed. Score every unit, then the pack (distinct roots with a passing first hop >= required, zero selected claims at S3 = 0).", "", "| Packet | Year | Request |", "|---|---|---|"];
  var sheet = ["packetId,unit,S1,S2,S3,S4,S5,F1,F2,unitPass,notes"];
  order.forEach(function (run, i) {
    var id = "BP-" + String(i + 1).padStart(2, "0");
    var built = packetFor(run, frozen.tests[run.test], brain);
    var p = Object.assign({ packetId: id }, built.packet);
    var text = JSON.stringify(p);
    if (IDENTIFYING.test(text)) leaks.push(id);
    lib.writeJson(path.join(blindDir, id + ".json"), p);
    fs.writeFileSync(path.join(blindDir, id + ".md"), packetMarkdown(id, p));
    index.push("| " + id + " | " + p.year + " | " + p.request + " |");
    (p.units.length ? p.units : [{ unit: "(none)" }]).forEach(function (u) { sheet.push([id, u.unit, "", "", "", "", "", "", "", "", ""].join(",")); });
    sheet.push([id, "PACK", "", "", "", "", "", "", "", "", "pack pass? distinct passing roots / required"].join(","));
    key.packets[id] = { runId: run.runId, arm: run.arm, model: run.model, test: run.test, rep: run.rep, claimIdMap: built.idMap };
  });
  fs.writeFileSync(path.join(blindDir, "INDEX.md"), index.join("\n") + "\n");
  fs.writeFileSync(path.join(blindDir, "SCORING_SHEET.csv"), sheet.join("\n") + "\n");
  key.identifyingTextFound = leaks;
  var keyFile = opts.keyFile || path.join(outDir, "UNBLIND_KEY.json");
  lib.writeJson(keyFile, key);
  return { packets: order.length, blindDir: blindDir, keyFile: keyFile, leaks: leaks, seed: seed };
}

module.exports = { exportBlind: exportBlind, packetFor: packetFor, IDENTIFYING: IDENTIFYING };

if (require.main === module) {
  var args = process.argv.slice(2);
  var i = args.indexOf("--out");
  if (i === -1) { console.error("--out DIR is required"); process.exit(2); }
  var s = args.indexOf("--blind-seed");
  var res = exportBlind(path.resolve(args[i + 1]), { blindSeed: s !== -1 ? Number(args[s + 1]) : undefined });
  console.log(JSON.stringify({ packets: res.packets, blindDir: res.blindDir, keyFile: res.keyFile, identifyingTextFound: res.leaks }, null, 2));
}
