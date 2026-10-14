"use strict";

/* One castle illustration for Maya and Leo.
   This file does not read an API key, call a provider, or write a picture.
   A paid run has to pass an edit function in, and only after approval. */

var fs = require("fs");
var path = require("path");
var Identity = require("../../js/book-v2-identity.js");
var Visual = require("../../js/book-visual.js");
var BookCast = require("../../js/book-cast.js");

var ROOT = path.join(__dirname, "..", "..");

var REQUEST = {
  provider: "OpenAI",
  model: "gpt-image-2.5-sunburst",
  endpoint: "https://api.openai.com/v1/images/edits",
  method: "POST",
  body: "multipart",
  imageField: "image[]",
  size: "1536x1024",
  quality: "medium",
  outputFormat: "jpeg",
  outputCompression: 80,
  n: 1,
  partialImages: 0,
  retries: 0
};

var PRICES = {
  textInputPerMillion: 5,
  imageInputPerMillion: 8,
  imageOutputPerMillion: 30,
  gbpPerUsd: 0.754,
  imageInputTokensPerReference: 8000,
  imageOutputTokensGuard: 600,
  imageOutputTokensOlderMediumLandscape: 1568
};

var SCENE = {
  pageId: "castle-maya-leo-01",
  locationId: "castle-courtyard",
  charactersPresent: ["wondii-maya", "wondii-leo"],
  characterStateBefore: [],
  entityStateBefore: [],
  compositionIntent: "Both children together, full figures, one pose each.",
  visualFocus: "Maya and Leo looking up at a paper lantern on the castle arch.",
  storyEvent: "Maya and Leo find a paper lantern caught on the castle arch.",
  illustrationMoment: "Maya and Leo stand side by side in the castle courtyard, looking up at one paper lantern caught on the stone arch.",
  emotion: "curious",
  shotType: "medium-wide",
  lighting: "warm daylight",
  textSafeRegion: "upper",
  montage: false,
  pageRole: "right-page"
};

function readable(file) {
  var abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(abs)) return { ok: false, file: file, bytes: 0 };
  var size = fs.statSync(abs).size;
  return { ok: size > 0, file: file, bytes: size };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function money(usd) {
  return { usd: round(usd), gbp: round(usd * PRICES.gbpPerUsd) };
}

function readUsage(payload) {
  var usage = payload && payload.usage;
  if (!usage) {
    return { present: false, perReference: false, reason: "usage-missing" };
  }
  var input = usage.input_tokens_details || {};
  var output = usage.output_tokens_details || {};
  return {
    present: true,
    perReference: false,
    reason: input.image_tokens == null ? "image-input-not-reported" : "aggregate-only",
    model: payload.model || REQUEST.model,
    inputTokens: usage.input_tokens == null ? null : usage.input_tokens,
    imageInputTokens: input.image_tokens == null ? null : input.image_tokens,
    textInputTokens: input.text_tokens == null ? null : input.text_tokens,
    outputTokens: usage.output_tokens == null ? null : usage.output_tokens,
    imageOutputTokens: output.image_tokens == null ? null : output.image_tokens
  };
}

function chargeUsd(usage) {
  if (!usage || usage.imageInputTokens == null || usage.textInputTokens == null) return null;
  var outputTokens = usage.imageOutputTokens != null ? usage.imageOutputTokens : usage.outputTokens;
  if (outputTokens == null) return null;
  return (usage.textInputTokens * PRICES.textInputPerMillion
    + usage.imageInputTokens * PRICES.imageInputPerMillion
    + outputTokens * PRICES.imageOutputPerMillion) / 1e6;
}

function leoIncrement(mayaOnly, both) {
  if (!mayaOnly || !both || mayaOnly.imageInputTokens == null || both.imageInputTokens == null) {
    return {
      measurable: false,
      reason: "needs-a-maya-only-control-with-image-input-tokens"
    };
  }
  var tokens = both.imageInputTokens - mayaOnly.imageInputTokens;
  return {
    measurable: true,
    imageInputTokens: tokens,
    usd: round(tokens * PRICES.imageInputPerMillion / 1e6),
    outputTokensExcluded: true
  };
}

function ceilingFor(prompt, references) {
  var textTokens = Math.ceil(String(prompt || "").length / 3);
  var outputTokens = Math.max(PRICES.imageOutputTokensGuard, PRICES.imageOutputTokensOlderMediumLandscape);
  var imageTokens = references * PRICES.imageInputTokensPerReference;
  var usd = (textTokens * PRICES.textInputPerMillion
    + imageTokens * PRICES.imageInputPerMillion
    + outputTokens * PRICES.imageOutputPerMillion) / 1e6;
  return {
    textTokensEstimate: textTokens,
    imageInputTokenCeiling: imageTokens,
    imageOutputTokenCeiling: outputTokens,
    references: references,
    listed: money(usd),
    basis: "8,000 image-input tokens per reference from the local spend guard, plus 1,568 output tokens from the published pre-2.5 medium landscape table. gpt-image-2.5 does not publish its own token count, so this is a planning ceiling, not a provider maximum."
  };
}

function prepare() {
  var built = Identity.buildRegistry({
    members: [
      { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
      { id: "wondii-leo", name: "Leo", source: "wondii-crew" }
    ]
  });
  var page = { pageId: SCENE.pageId, charactersPresent: SCENE.charactersPresent };
  var plan = Identity.illustrationPlan(built.registry, [page]);
  var refs = plan.spreads[0].references;
  var files = refs.map(function (row) {
    return Object.assign({ readable: readable(row.file) }, row);
  });
  var bible = {
    tone: "adventure",
    identityRegistry: built.registry,
    castIds: SCENE.charactersPresent.slice(),
    locations: [{
      locationId: "castle-courtyard",
      name: "the castle courtyard",
      visualIdentity: "pale stone walls, a high arch, warm daylight"
    }],
    entities: [],
    pages: [SCENE]
  };
  var cast = BookCast.compileBookCast(bible, [SCENE]);
  var prompt = Visual.spreadPrompt(bible, SCENE, cast.members);
  var problems = [];
  if (!built.ok) problems.push("registry");
  if (plan.blocksGeneration) problems.push("blocked");
  if (files.length !== 2) problems.push("reference-count");
  files.forEach(function (row) {
    if (!row.readable.ok) problems.push("unreadable:" + row.characterId);
  });
  var maya = files.filter(function (row) { return row.characterId === "wondii-maya"; })[0];
  var leo = files.filter(function (row) { return row.characterId === "wondii-leo"; })[0];
  if (!maya || maya.file.indexOf("maya-v1") < 0 || maya.approved !== true) problems.push("maya-sheet");
  if (!leo || leo.file.indexOf("wondii-leo") < 0 || leo.approved === true) problems.push("leo-portrait");
  if (maya && leo && maya.file === leo.file) problems.push("shared-file");
  if (prompt.indexOf("wondii-picture-book") < 0) problems.push("style");
  if (prompt.toLowerCase().indexOf("castle") < 0) problems.push("castle");
  if (/\bforest\b/i.test(prompt)) problems.push("forest");
  if (prompt.indexOf("Maya") < 0 || prompt.indexOf("Leo") < 0) problems.push("names");
  return {
    ok: problems.length === 0,
    problems: problems,
    request: REQUEST,
    scene: SCENE.illustrationMoment,
    style: "wondii-picture-book",
    references: files.map(function (row) {
      return {
        characterId: row.characterId,
        name: row.name,
        file: row.file,
        bytes: row.readable.bytes,
        approvedSheet: row.approved === true,
        role: row.approved ? "approved-sheet" : "approved-crew-portrait"
      };
    }),
    prompt: prompt,
    calls: 1,
    ceiling: ceilingFor(prompt, 2),
    controlCeiling: ceilingFor(prompt, 1),
    usage: {
      fields: ["input_tokens", "input_tokens_details.image_tokens", "input_tokens_details.text_tokens", "output_tokens", "output_tokens_details.image_tokens"],
      perReference: false,
      documentationConflict: "The image generation guide says to read response.usage for gpt-image-2.5. The image-edit reference still describes that usage object on gpt-image-1. This test treats a missing usage object as an unmeasured bill, not as a free picture."
    },
    batch: {
      included: false,
      endpointSupported: true,
      modelSupported: true,
      discount: 0.5,
      completionWindow: "24h",
      sameRequestAsThisTest: false,
      reason: "Batch accepts /v1/images/edits as JSONL, at half the token rates, and finishes within 24 hours. This test sends multipart image[] bytes. That is a different request body, so this one page does not prove the Batch discount or the turnaround."
    },
    identityReview: "A person compares the saved picture with maya-v1 and Leo's portrait. This script does not score identity, and it does not call the vision model.",
    leoIncrement: "Not measurable from this one call. Image-input tokens are one total for every reference."
  };
}

function run(ports) {
  var plan = prepare();
  if (!plan.ok) return { status: "not-ready", plan: plan, called: false };
  if (!ports || ports.approved !== true || typeof ports.edit !== "function") {
    return { status: "awaiting-approval", plan: plan, called: false };
  }
  return { status: "refusing-unattended-call", plan: plan, called: false };
}

if (require.main === module) {
  var plan = prepare();
  console.log(JSON.stringify({
    status: plan.ok ? "awaiting-approval" : "not-ready",
    called: false,
    model: plan.request.model,
    endpoint: plan.request.endpoint,
    size: plan.request.size,
    quality: plan.request.quality,
    references: plan.references,
    calls: plan.calls,
    ceiling: plan.ceiling,
    problems: plan.problems
  }, null, 2));
}

module.exports = {
  REQUEST: REQUEST,
  PRICES: PRICES,
  prepare: prepare,
  run: run,
  readUsage: readUsage,
  chargeUsd: chargeUsd,
  leoIncrement: leoIncrement,
  ceilingFor: ceilingFor
};
