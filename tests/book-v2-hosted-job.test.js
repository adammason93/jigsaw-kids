"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Hosted = require("../scripts/book/hosted-job.js");
var Handle = require("../scripts/book/handle-request.js");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "scripts/book/hosted-job.js"), "utf8");
var edge = fs.readFileSync(path.join(root, "supabase/functions/book-v2/index.ts"), "utf8");
var handler = fs.readFileSync(path.join(root, "scripts/book/handle-request.js"), "utf8");
assert.ok(source.indexOf("api.openai.com") < 0);
assert.ok(source.indexOf("fetch(") < 0);
assert.ok(source.indexOf("writer.js") >= 0);
assert.ok(source.indexOf("readiness.js") >= 0);
assert.ok(handler.indexOf("ports.approved") >= 0);
assert.ok(handler.indexOf("Hosted.run(") >= 0);
assert.ok(edge.indexOf("OPENAI") < 0);
assert.ok(edge.indexOf("Hosted.run") < 0);

var opened = Hosted.openJob({
  creationKey: "bookplan000000000009",
  accountId: "user-1"
});
assert.strictEqual(opened.ran, false);
assert.strictEqual(opened.job.paid, false);
assert.strictEqual(opened.job.started, false);
assert.strictEqual(opened.job.stage, "plan");
assert.strictEqual(opened.job.budgetUsd, 1.2);
assert.strictEqual(opened.job.calls.text, 0);
assert.strictEqual(opened.generation.authorised, false);
assert.strictEqual(opened.job.stages[0].state, "saved");
assert.ok(opened.job.stages.slice(1).every(function (stage) { return stage.state === "waiting"; }));

var calls = 0;
Hosted.run(opened.job, { creationKey: "bookplan000000000009", accountId: "user-1" }, {
  runWriter: function () { calls += 1; return { status: "REVIEWABLE" }; }
}).then(function (blocked) {
  assert.strictEqual(blocked.ran, false);
  assert.strictEqual(calls, 0);
  assert.strictEqual(blocked.job.paid, false);
  return Hosted.run(null, {
    creationKey: "bookplan000000000009",
    accountId: "user-1",
    accountKind: "adult"
  }, {
    approved: true,
    runWriter: function () { calls += 1; return { status: "REVIEWABLE" }; }
  });
}).then(function (started) {
  assert.strictEqual(started.ran, true);
  assert.strictEqual(calls, 1);
  assert.strictEqual(started.job.stage, "check");
  assert.ok(started.generation.cost.usd <= 1.2);
  return Hosted.run({ creationKey: "bookplan000000000009", accountId: "user-1", paid: true, status: "complete" }, {
    creationKey: "bookplan000000000009",
    accountId: "user-1",
    accountKind: "adult",
    alreadyGenerated: true
  }, {
    approved: true,
    runWriter: function () { calls += 1; return { status: "REVIEWABLE" }; }
  });
}).then(function (again) {
  assert.strictEqual(again.ran, false);
  assert.strictEqual(calls, 1);
  assert.strictEqual(again.duplicate, true);
  var other = Hosted.resume({ creationKey: "bookplan000000000009", accountId: "user-1" }, {
    creationKey: "bookplan000000000009",
    accountId: "user-2"
  });
  assert.strictEqual(other.ok, false);
  assert.strictEqual(other.reason, "wrong-account");
  var planned = Handle.handleBookV2({
    accountId: "user-1",
    creationKey: "bookplan000000000009",
    familyAgeBand: "7-9",
    members: [{ id: "wondii-maya", name: "Maya", source: "wondii-crew" }],
    idea: "Maya finds a paper boat.",
    place: "library",
    length: "short"
  });
  assert.strictEqual(planned.status, 200);
  assert.strictEqual(planned.body.job.paid, false);
  assert.strictEqual(planned.body.job.started, false);
  assert.strictEqual(planned.body.job.calls.image, 0);
  assert.strictEqual(planned.body.generated, false);
  console.log("book-v2 hosted job tests ok");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
