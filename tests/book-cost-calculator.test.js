"use strict";

var assert = require("assert");
var Cost = require("../scripts/book/cost-calculator.js");

var imageCall = Cost.MEASURED.imageRunUsd / Cost.MEASURED.imageRunCalls;
assert.ok(Math.abs(imageCall - 0.0378805) < 0.000001);

var noRepair = Cost.quote({ extraReferenceUsd: 0, pages: 12, textRepairCalls: 0, pageRepairRate: 0 });
var expected = Cost.MEASURED.textNoRepairUsd + 12 * imageCall;
assert.ok(Math.abs(noRepair.attempt.usd - Math.round(expected * 1000) / 1000) < 0.002);
assert.ok(Math.abs(noRepair.attempt.gbp - Math.round(expected * 0.754 * 1000) / 1000) < 0.002);

var ceiling = Cost.quote({ extraReferenceUsd: Cost.PRICES.extraReferenceCeilingUsd });
assert.ok(ceiling.attempt.gbp > 0.4);
assert.ok(ceiling.imageUsd > noRepair.imageUsd);

var batch = Cost.quote({ extraReferenceUsd: 0, batch: true });
assert.ok(batch.attempt.usd < noRepair.attempt.usd);
assert.ok(Math.abs(batch.attempt.usd * 2 - noRepair.attempt.usd) < 0.01);

var failed = Cost.quote({ extraReferenceUsd: 0, failureRate: 0.2 });
assert.ok(failed.perCompletedBook.usd > failed.attempt.usd);

var volumes = Cost.volumes(0.4);
assert.strictEqual(volumes[0].gbp, 40);
assert.strictEqual(volumes[1].gbp, 400);
assert.strictEqual(volumes[2].gbp, 4000);

assert.strictEqual(Cost.quote({}).visionUsd, 0);
console.log("book cost calculator tests ok");
