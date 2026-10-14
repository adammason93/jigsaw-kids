"use strict";

// Patch 7: "let <Name> <verb>" is a how-or-why link. Live run 14 (6 Oct 2026) kept
// "Nostrils further up on its snout let Spinosaurus breathe ..." and "Straight back legs let
// dinosaurs use less energy ..." with an empty linkQuote because the claim pattern only knew
// "let it/them/the/a". Research entailment only (sourceMode "retrieved").
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var nose = "Nostrils further up on its snout let Spinosaurus breathe even with most of its snout submerged.";
var legs = "Straight back legs let dinosaurs use less energy to move than reptiles with sprawling legs.";
var quote = "Its nostrils were further up on its snout than the nostrils of other dinosaurs. This would've allowed the animal to breathe even with most of its snout submerged.";
[nose, legs, "Its long neck lets Brachiosaurus reach high leaves.", "Letting it breathe while its snout was under water."].forEach(function (t) { assert.strictEqual(Brain.claimStatesLink(t), true, t); });
["Spinosaurus had nostrils further up on its snout.", "Brachiosaurus lived in the Jurassic period."].forEach(function (t) { assert.strictEqual(Brain.claimStatesLink(t), false, t); });

function pack(text) {
  return { sourceMode: "retrieved", status: "usable", claims: [{ claimId: "c1", text: text, provenance: "retrieved", quoteVerified: true, sourceQuote: quote, sourceRef: ["S9-P02"] }] };
}
// Negative: supported with no linkQuote is held as partial (it was kept in run 14).
var held = Brain.applySourceEntailment(pack(nose), { ok: true, results: { c1: { verdict: "supported", missing: "", linkQuote: "", wording: [], addedFacts: [] } } });
assert.strictEqual(held.claims[0].entailment, "partial");
assert.ok(/LINK_NOT_QUOTED/.test(held.claims[0].entailmentNote));
// Positive: a link quote from the quote keeps it.
var kept = Brain.applySourceEntailment(pack(nose), { ok: true, results: { c1: { verdict: "supported", missing: "", linkQuote: "This would've allowed the animal to breathe even with most of its snout submerged.", wording: [], addedFacts: [] } } });
assert.strictEqual(kept.claims[0].entailment, "supported");
assert.ok(/allowed the animal to breathe/.test(kept.claims[0].linkQuote));
// The entailment brief flags the items that need a link quote.
var brief = Brain.sourceEntailmentBrief(pack(nose), { researchEvidence: { passages: [{ id: "S9-P02", text: quote }] } });
assert.strictEqual(JSON.parse(brief.user).items[0].needsLinkQuote, true);
assert.ok(/needsLinkQuote true and verdict supported must have a linkQuote/.test(brief.system));
assert.ok(/helped, allowed, let, or to/.test(brief.system));
var plainBrief = Brain.sourceEntailmentBrief(pack("Spinosaurus had nostrils further up on its snout."), { researchEvidence: { passages: [{ id: "S9-P02", text: quote }] } });
assert.strictEqual(JSON.parse(plainBrief.user).items[0].needsLinkQuote, undefined);
// A non-retrieved (default) pack is untouched.
var defaultPack = { sourceMode: "model", claims: [{ claimId: "c1", text: nose }] };
assert.strictEqual(Brain.applySourceEntailment(defaultPack, { ok: true, results: {} }).claims[0].entailment, undefined);
// resultClause drops a named object.
assert.strictEqual(Brain.resultClause(nose), "breathe even with most of its snout submerged");
assert.strictEqual(Brain.resultClause("This allowed them to use less energy to move than other reptiles."), "use less energy to move");
console.log("research let-link tests passed");
