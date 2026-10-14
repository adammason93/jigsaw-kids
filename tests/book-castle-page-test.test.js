"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Page = require("../scripts/book/castle-page-test.js");

var plan = Page.prepare();
assert.strictEqual(plan.ok, true, plan.problems.join(","));
assert.strictEqual(plan.request.model, "gpt-image-2.5-sunburst");
assert.strictEqual(plan.request.endpoint, "https://api.openai.com/v1/images/edits");
assert.strictEqual(plan.request.size, "1536x1024");
assert.strictEqual(plan.request.quality, "medium");
assert.strictEqual(plan.calls, 1);
assert.strictEqual(plan.references.length, 2);
assert.ok(plan.references[0].file.indexOf("maya-v1.jpg") >= 0);
assert.strictEqual(plan.references[0].approvedSheet, true);
assert.ok(plan.references[1].file.indexOf("crew/wondii-leo.jpg") >= 0);
assert.strictEqual(plan.references[1].approvedSheet, false);
assert.notStrictEqual(plan.references[0].file, plan.references[1].file);
assert.ok(plan.references[0].bytes > 0);
assert.ok(plan.references[1].bytes > 0);
assert.ok(plan.prompt.indexOf("wondii-picture-book") >= 0);
assert.ok(plan.prompt.toLowerCase().indexOf("castle") >= 0);
assert.ok(!/\bforest\b/i.test(plan.prompt));
assert.ok(plan.ceiling.listed.usd > 0);
assert.ok(plan.ceiling.listed.usd < 0.5);
assert.ok(plan.controlCeiling.listed.usd < plan.ceiling.listed.usd);
assert.strictEqual(plan.batch.included, false);
assert.strictEqual(plan.batch.discount, 0.5);
assert.strictEqual(plan.usage.perReference, false);

var missing = Page.readUsage({});
assert.strictEqual(missing.present, false);
var aggregate = Page.readUsage({
  usage: {
    input_tokens: 900,
    input_tokens_details: { image_tokens: 700, text_tokens: 200 },
    output_tokens: 400,
    output_tokens_details: { image_tokens: 400, text_tokens: 0 }
  }
});
assert.strictEqual(aggregate.perReference, false);
assert.strictEqual(aggregate.imageInputTokens, 700);
assert.strictEqual(aggregate.textInputTokens, 200);
assert.strictEqual(aggregate.imageOutputTokens, 400);
var charged = Page.chargeUsd(aggregate);
assert.ok(Math.abs(charged - ((200 * 5 + 700 * 8 + 400 * 30) / 1e6)) < 1e-9);
assert.strictEqual(Page.leoIncrement(null, aggregate).measurable, false);
var paired = Page.leoIncrement(
  { imageInputTokens: 400 },
  { imageInputTokens: 700 }
);
assert.strictEqual(paired.measurable, true);
assert.strictEqual(paired.imageInputTokens, 300);

var held = Page.run();
assert.strictEqual(held.status, "awaiting-approval");
assert.strictEqual(held.called, false);
var refused = Page.run({ approved: true, edit: function () { return { ok: true }; } });
assert.strictEqual(refused.called, false);

var source = fs.readFileSync(path.join(__dirname, "..", "scripts", "book", "castle-page-test.js"), "utf8");
assert.ok(source.indexOf("OPENAI_API_KEY") < 0);
assert.ok(source.indexOf("fetch(") < 0);
assert.ok(source.indexOf("https.request") < 0);

console.log("castle page test checks ok");
