"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Journey = require("../js/book-v2-journey.js");

var source = fs.readFileSync(path.join(__dirname, "..", "js/book-v2-journey.js"), "utf8");
assert.ok(source.indexOf("api.openai.com") < 0);
assert.ok(source.indexOf("fetch(") < 0);
assert.ok(source.indexOf("generate.js") >= 0);
assert.ok(source.indexOf("book-art-direction.js") >= 0);

var held = Journey.resume({
  id: "plan-1",
  recordKind: "plan",
  ownerId: "user-1",
  generated: false,
  request: { idea: "A lost star" }
});
assert.strictEqual(held.ok, false);
assert.strictEqual(held.started, false);
assert.strictEqual(held.paid, false);
assert.strictEqual(held.reason, "paid-generation-not-approved");
assert.strictEqual(held.stage, "plan");
assert.strictEqual(held.stages[0].state, "saved");
assert.ok(held.stages.slice(1).every(function (stage) { return stage.state === "waiting"; }));
assert.ok(held.message.indexOf("illustrated book has not been made yet") >= 0);

var again = Journey.resume({
  id: "book-1",
  recordKind: "book",
  generated: true,
  ownerId: "user-1"
});
assert.strictEqual(again.started, false);
assert.strictEqual(again.paid, false);

console.log("book-v2 journey tests ok");
