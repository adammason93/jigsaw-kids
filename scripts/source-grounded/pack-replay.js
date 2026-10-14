"use strict";
/* Pack replay for the source-grounded harness (research mode only).

   --reuse-pack DIR continues from an earlier run's saved pack stage instead of regenerating it.
   The pack stage is non-deterministic, so a lesson can be carried on from a pack that the pipeline
   already produced and that passed the gate. Nothing is trusted:
   - validateSavedPack() re-runs the code checks before any call: the saved raw model pack goes back
     through normaliseKnowledgePack (quote found verbatim in the cited passage), the saved entailment
     verdicts go back through applySourceEntailment (link quotes and holds), then selection and the
     readiness gate run. It must reproduce the saved pack id and be ready, or the replay is refused.
   - During the boot, the saved model outputs for the pack stage (teacher intent, raw knowledge
     packs, entailment verdicts) are served in order, so the boot's own code runs every check
     again. A pack-stage call with no saved output is refused (never sent live). No later call is
     sent live until the boot has logged KNOWLEDGE_PACK with the saved pack id and status ready.
   Every output is labelled "pack replayed from <run>". No content is written or edited by hand:
   every replayed item is a saved pipeline output. */
var fs = require("fs");
var path = require("path");

var INTENT = "You interpret one primary teacher's request";
var KNOWLEDGE = "You select and adapt subject knowledge";
var ENTAIL = "You check whether a source extract supports";

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }

function loadPackReplay(dir) {
  dir = path.resolve(dir);
  var run = path.basename(dir);
  var pack = readJson(path.join(dir, "sources/knowledge-pack.json"));
  var research = readJson(path.join(dir, "sources/research-record.json"));
  var trace = readJson(path.join(dir, "lesson/generate-trace.json"));
  var logs = trace.logs || [];
  var intentLog = logs.filter(function (row) { return row.stage === "TEACHER_INTENT"; })[0];
  var packLog = logs.filter(function (row) { return row.stage === "KNOWLEDGE_PACK"; })[0];
  if (!intentLog || !intentLog.teacherIntent || !intentLog.teacherIntent.ok) throw new Error("pack replay: " + run + " has no saved teacher intent");
  if (!packLog || !packLog.packId) throw new Error("pack replay: " + run + " never reached KNOWLEDGE_PACK");
  var rawPacks = pack.rawModelPacks || [];
  var allPacks = pack.allPacks || [];
  if (!rawPacks.length || rawPacks.length !== allPacks.length) throw new Error("pack replay: " + run + " raw packs and normalised packs do not line up");
  // Saved entailment replies: the raw replies when the trace kept them (patch 8 harness), otherwise
  // the per-claim model rows of the SOURCE_ENTAILMENT logs (patch 7 trace). Those rows did not keep
  // the model's "wording" list (claim words it called simpler wording for the quote). It is
  // recovered only where the saved code result proves it: the code accepted a claim's
  // wordsNotInSource with no ADDED_DETAIL note, which it does only when every such word was in
  // the model's wording list. Every other word stays unexplained, so the code holds it again.
  var recovered = [];
  var entailments = trace.rawEntailments && trace.rawEntailments.length ? trace.rawEntailments : logs.filter(function (row) { return row.stage === "SOURCE_ENTAILMENT" && row.ran; }).map(function (row, pass) {
    var savedPack = allPacks[pass] && allPacks[pass].pack || { claims: [] };
    return { results: (row.modelRows || []).map(function (r) {
      var saved = (savedPack.claims || []).filter(function (c) { return c && c.claimId === r.claimId; })[0];
      var wording = [];
      if (saved && saved.entailment === r.verdict && !/ADDED_DETAIL/.test(saved.entailmentNote || "") && (saved.wordsNotInSource || []).length) {
        wording = saved.wordsNotInSource.slice();
        recovered.push({ pass: pass, claimId: r.claimId, wording: wording });
      }
      return { claimId: r.claimId, verdict: r.verdict, linkQuote: r.linkQuote || "", missing: r.missing || "", wording: wording, addedFacts: [] };
    }) };
  });
  var usedIndex = allPacks.map(function (row) { return row.packId; }).indexOf(packLog.packId);
  if (usedIndex === -1) throw new Error("pack replay: " + run + " saved pack " + packLog.packId + " is not among its packs");
  return {
    run: run,
    dir: dir,
    label: "pack replayed from " + run,
    intent: intentLog.teacherIntent,
    research: research,
    rawPacks: rawPacks,
    entailments: entailments,
    savedPackId: packLog.packId,
    usedIndex: usedIndex,
    savedReadiness: packLog.packReadiness || null,
    wordingRecovered: recovered
  };
}

function contextFor(Brain, replay, request) {
  var ctx = Object.assign({}, request, { lessonText: request.lessonText });
  Brain.applyTeacherIntent(ctx, Brain.normaliseTeacherIntent(JSON.parse(JSON.stringify(replay.intent)), ctx));
  ctx.researchEvidence = JSON.parse(JSON.stringify(replay.research));
  return ctx;
}

// Re-run the code checks on the saved pack before any call. Returns { ok, ... }; ok false = refuse.
function validateSavedPack(Brain, replay, request) {
  var ctx = contextFor(Brain, replay, request);
  var raw = JSON.parse(JSON.stringify(replay.rawPacks[replay.usedIndex]));
  var pack = Brain.normaliseKnowledgePack(raw, ctx);
  var entail = replay.entailments[replay.usedIndex];
  if (!entail) return { ok: false, reason: "no saved entailment verdicts for the saved pack" };
  Brain.applySourceEntailment(pack, Brain.parseSourceEntailment(JSON.parse(JSON.stringify(entail))));
  var selection = Brain.selectPackForLesson(pack, ctx);
  var readiness = Brain.assessPackReadiness(pack, selection, ctx);
  var unverified = (pack.claims || []).filter(function (c) { return c && c.provenance === "retrieved" && selection.claimIds && selection.claimIds.indexOf(c.claimId) !== -1 && !c.quoteVerified; }).map(function (c) { return c.claimId; });
  var out = {
    packId: pack.id,
    savedPackId: replay.savedPackId,
    status: readiness.status,
    distinctReady: readiness.distinctReady,
    requiredPairs: readiness.requiredPairs,
    readyPairs: (readiness.readyPairs || []).map(function (p) { return { featureClaimId: p.featureClaimId, explanationClaimId: p.explanationClaimId || p.mechanismClaimId, feature: p.feature, explanation: p.explanation }; }),
    selectedUnverifiedQuotes: unverified,
    issues: (readiness.issues || []).slice(0, 4)
  };
  if (pack.id !== replay.savedPackId) { out.ok = false; out.reason = "the saved raw pack no longer reproduces the saved pack (" + pack.id + " vs " + replay.savedPackId + ")"; return out; }
  if (pack.status === "blocked" || selection.status === "blocked") { out.ok = false; out.reason = "the saved pack is blocked"; return out; }
  if (readiness.status !== "ready") { out.ok = false; out.reason = "the saved pack fails the readiness gate (" + readiness.distinctReady + " of " + readiness.requiredPairs + " pairs)"; return out; }
  if (unverified.length) { out.ok = false; out.reason = "selected claims whose quotes are not in their cited passages: " + unverified.join(", "); return out; }
  out.ok = true;
  return out;
}

// The transport side: serve saved pack-stage outputs; gate every later live call.
function createReplayTransport(replay) {
  var queues = { intent: [replay.intent], pack: replay.rawPacks.slice(), entail: replay.entailments.slice() };
  var served = { intent: 0, pack: 0, entail: 0 };
  var packSeen = null;
  function kindOf(body) {
    var first = body && body.messages && body.messages[0];
    var system = first ? String(typeof first.content === "string" ? first.content : JSON.stringify(first.content)) : "";
    if (system.indexOf(INTENT) === 0) return "intent";
    if (system.indexOf(KNOWLEDGE) === 0) return "pack";
    if (system.indexOf(ENTAIL) === 0) return "entail";
    return "";
  }
  return {
    // { replay: object } for a served pack-stage reply; { refuse: reason } to refuse; { live: true } to send it.
    route: function (body) {
      var kind = kindOf(body);
      if (kind) {
        if (!queues[kind].length) return { refuse: "pack replay: no saved " + kind + " output left for this pack-stage call (not sent live)" };
        served[kind] += 1;
        return { replay: JSON.parse(JSON.stringify(queues[kind].shift())) };
      }
      if (!packSeen) return { refuse: "pack replay: the boot has not logged the replayed pack yet (no live call before the gate)" };
      if (packSeen.packId !== replay.savedPackId) return { refuse: "pack replay: the boot used pack " + packSeen.packId + ", not the saved " + replay.savedPackId };
      if (!packSeen.packReadiness || packSeen.packReadiness.status !== "ready") return { refuse: "pack replay: the replayed pack did not pass the readiness gate in the boot" };
      return { live: true };
    },
    observe: function (log) { if (log && log.stage === "KNOWLEDGE_PACK") packSeen = log; },
    summary: function () {
      return { label: replay.label, from: replay.run, savedPackId: replay.savedPackId, bootPackId: packSeen ? packSeen.packId : null, bootReadiness: packSeen && packSeen.packReadiness ? { status: packSeen.packReadiness.status, distinctReady: packSeen.packReadiness.distinctReady, requiredPairs: packSeen.packReadiness.requiredPairs } : null, served: served, wordingRecovered: replay.wordingRecovered, replayed: "teacher intent, research record, raw knowledge packs and entailment verdicts (saved pipeline outputs)" };
    }
  };
}

// The research step returns the saved record (no search, no page fetch).
function researchOverride(replay) {
  return "\n;(function () { var R = globalThis.WondiiSourceResearch; var saved = " + JSON.stringify(replay.research) + "; R.researchTopic = function () { return Promise.resolve(JSON.parse(JSON.stringify(saved))); }; })();\n";
}

module.exports = { loadPackReplay: loadPackReplay, validateSavedPack: validateSavedPack, createReplayTransport: createReplayTransport, researchOverride: researchOverride, contextFor: contextFor };
