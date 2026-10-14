"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Budget = require("../js/book-v2-budget.js");

var source = fs.readFileSync(path.join(__dirname, "../js/book-v2-budget.js"), "utf8");
assert.ok(source.indexOf("api.openai.com") < 0);
assert.ok(source.indexOf("OPENAI") < 0);
assert.ok(source.indexOf("fetch(") < 0);

var forced = Budget.authorise({
  approved: true,
  accountId: "parent-1",
  accountKind: "adult",
  calls: { text: 1, image: 1, vision: 1 }
});
assert.strictEqual(forced.authorised, false);
assert.strictEqual(forced.reason, "paid-generation-not-approved");
assert.strictEqual(forced.calls.text, 0);
assert.ok(forced.quote.expectedGbp > 0);
assert.ok(forced.quote.expectedUsd < forced.quote.budgetUsd);
assert.ok(forced.quote.ceilingUsd > forced.quote.budgetUsd);

var child = Budget.decide({
  approved: true,
  accountId: "child-user",
  accountKind: "child",
  childPermitted: false,
  allowanceReserved: true
});
assert.strictEqual(child.reason, "child-not-permitted");
assert.strictEqual(child.authorised, false);

var noAllowance = Budget.decide({
  approved: true,
  accountId: "child-user",
  accountKind: "child",
  childPermitted: true,
  allowanceReserved: false
});
assert.strictEqual(noAllowance.reason, "allowance");

var again = Budget.decide({
  approved: true,
  accountId: "parent-1",
  accountKind: "adult",
  alreadyGenerated: true
});
assert.strictEqual(again.duplicate, true);
assert.strictEqual(again.calls.image, 0);

var tooMany = Budget.decide({
  approved: true,
  accountId: "parent-1",
  accountKind: "adult",
  calls: { text: 9, image: 12, vision: 12 }
});
assert.strictEqual(tooMany.reason, "call-cap");

var tooDear = Budget.decide({
  approved: true,
  accountId: "parent-1",
  accountKind: "adult",
  budgetUsd: 0.2,
  calls: { text: 3, image: 13, vision: 13 }
});
assert.strictEqual(tooDear.reason, "budget");

var raised = Budget.decide({
  approved: true,
  accountId: "parent-1",
  accountKind: "adult",
  budgetUsd: 50,
  calls: { text: 8, image: 24, vision: 24 }
});
assert.strictEqual(raised.reason, "budget");

var ready = Budget.decide({
  approved: true,
  accountId: "parent-1",
  accountKind: "adult"
});
assert.strictEqual(ready.authorised, true);
assert.strictEqual(ready.calls.text, 3);
assert.strictEqual(ready.calls.image, 13);
assert.ok(ready.cost.usd < Budget.BUDGET_USD);

console.log("book-v2 budget tests ok");
