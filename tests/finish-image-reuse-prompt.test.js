"use strict";

// Patch 9: a reused image records the prompt it was made with, not today's builder output.
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var Finish = require("../scripts/source-grounded/finish.js");
var dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-reuse-"));
var calls = 0;
function stubFetch() { calls++; return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ data: [{ b64_json: Buffer.from("jpg").toString("base64") }] }); } }); }
function plan(text) { return { assets: [{ id: "teach-u1", type: "teaching_visual" }], promptFor: function () { return text; } }; }
Finish.generateImages(stubFetch, "k", {}, dir, 1, true, plan("first prompt")).then(function (rows) {
  assert.strictEqual(calls, 1);
  assert.strictEqual(fs.readFileSync(path.join(dir, "lesson/images/teach-u1.prompt.txt"), "utf8"), "first prompt");
  assert.ok(!rows[0].reused);
  return Finish.generateImages(stubFetch, "k", {}, dir, 1, true, plan("first prompt"));
}).then(function (rows) {
  assert.strictEqual(calls, 1, "reused, not paid again");
  assert.ok(rows[0].reused && !rows[0].promptChanged && rows[0].prompt === "first prompt");
  return Finish.generateImages(stubFetch, "k", {}, dir, 1, true, plan("new builder prompt"));
}).then(function (rows) {
  assert.strictEqual(calls, 1);
  assert.strictEqual(rows[0].prompt, "first prompt", "the prompt the image was made with");
  assert.strictEqual(rows[0].promptChanged, true);
  assert.strictEqual(rows[0].promptNow, "new builder prompt");
  console.log("finish image reuse prompt tests passed");
}).catch(function (e) { console.error(e); process.exit(1); });
