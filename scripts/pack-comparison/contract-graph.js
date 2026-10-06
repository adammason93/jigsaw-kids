"use strict";

/* Strand roots and chain depth for the v2 contract (PROTOCOL §5.2). HARNESS ONLY.

   Graph: nodes = selectable claims; edges = format-valid units
   (element.claimId -> explanation.claimId) whose two claims are selectable.
   Examples (exampleClaimIds) are never edges.

   - Root: a node that is the element of >= 1 edge and the explanation of none.
   - Strand: a root with at least one PASSING first-hop unit. Only this number is
     compared with the frozen unit count.
   - Depth credits: passing units that are not first hops, each counted once.
   - Longest passing path: in units.
   Roots and depth are reported separately; depth never adds strands.

   unitPasses(unit) decides "passing". Deterministically (before blind scores)
   the harness uses "format-valid and both claims selectable"; with blind
   scores it is the rubric unit pass. The frozen sameTeachingIdea rule is not
   exported by js/, so possible same-idea first hops (shared element words) are
   FLAGGED for the reviewer, never silently merged. */

var STOP = { a: 1, an: 1, the: 1, of: 1, and: 1, or: 1, to: 1, in: 1, on: 1, its: 1, it: 1, is: 1, are: 1, has: 1, have: 1, with: 1, for: 1, at: 1, by: 1, from: 1, that: 1, this: 1, their: 1, they: 1 };
function words(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && !STOP[w]; }).map(function (w) { return w.replace(/(ing|es|s|ed)$/, ""); });
}

function countStrands(units, opts) {
  opts = opts || {};
  var selectable = opts.isSelectable || function () { return true; };
  var passes = opts.unitPasses || function (u) { return !!u.ok; };
  var edges = (units || []).filter(function (u) {
    return u && u.ok && u.elementClaimId && u.explanationClaimId && u.elementClaimId !== u.explanationClaimId && selectable(u.elementClaimId) && selectable(u.explanationClaimId);
  });
  var incoming = {};
  edges.forEach(function (u) { incoming[u.explanationClaimId] = (incoming[u.explanationClaimId] || 0) + 1; });
  var rootIds = [];
  edges.forEach(function (u) { if (!incoming[u.elementClaimId] && rootIds.indexOf(u.elementClaimId) === -1) rootIds.push(u.elementClaimId); });
  var roots = rootIds.map(function (id) {
    var hops = edges.filter(function (u) { return u.elementClaimId === id; });
    var passing = hops.filter(passes);
    return { claimId: id, firstHops: hops.map(function (u) { return u.unitId; }), passingFirstHops: passing.map(function (u) { return u.unitId; }), counts: passing.length > 0, elementPhrase: (passing[0] || hops[0]).elementPhrase || "" };
  });
  var strandRoots = roots.filter(function (r) { return r.counts; });
  var possibleSameIdea = [];
  for (var i = 0; i < strandRoots.length; i++) {
    for (var j = i + 1; j < strandRoots.length; j++) {
      var a = words(strandRoots[i].elementPhrase), b = words(strandRoots[j].elementPhrase);
      var shared = a.filter(function (w) { return b.indexOf(w) !== -1; });
      if (shared.length) possibleSameIdea.push({ roots: [strandRoots[i].claimId, strandRoots[j].claimId], sharedWords: shared });
    }
  }
  var downstream = edges.filter(function (u) { return incoming[u.elementClaimId]; });
  var depthCredits = downstream.filter(passes).length;
  // Longest passing path (units), memoised DFS; validator already fails cycles.
  var passEdges = edges.filter(passes);
  var adj = {};
  passEdges.forEach(function (u) { (adj[u.elementClaimId] = adj[u.elementClaimId] || []).push(u.explanationClaimId); });
  var memo = {}, onStack = {}, cycle = false;
  function longest(n) {
    if (onStack[n]) { cycle = true; return 0; }
    if (memo[n] != null) return memo[n];
    onStack[n] = 1;
    var best = 0;
    (adj[n] || []).forEach(function (m) { best = Math.max(best, 1 + longest(m)); });
    onStack[n] = 0;
    memo[n] = best;
    return best;
  }
  var longestPath = 0;
  Object.keys(adj).forEach(function (n) { longestPath = Math.max(longestPath, longest(n)); });
  var exampleRefs = (units || []).reduce(function (s, u) { return s + ((u && u.exampleClaimIds) || []).length; }, 0);
  return {
    strands: strandRoots.length,
    roots: roots.length,
    rootDetail: roots,
    depthCredits: depthCredits,
    downstreamUnits: downstream.length,
    longestPassingPath: cycle ? null : longestPath,
    edgesConsidered: edges.length,
    exampleReferencesIgnored: exampleRefs,
    possibleSameIdea: possibleSameIdea,
    note: "Strands = distinct roots with a passing first hop. Depth credits and path length are reported separately and never add strands. Examples never add strands."
  };
}

module.exports = { countStrands: countStrands };
