"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Resume = require("../scripts/book/castle-book-run.js");

var root = path.join(__dirname, "..");
var bookPath = path.join(root, "docs/agent/book-v2/castle-lost-lanterns/book.json");
var failurePath = path.join(root, "docs/agent/book-v2/castle-lost-lanterns/validation-failed.json");
var saved = JSON.parse(fs.readFileSync(bookPath, "utf8"));
var prose = saved.pages.map(function (page) { return page.prose; }).join("\n");
var before = crypto.createHash("sha256").update(prose, "utf8").digest("hex");

assert.strictEqual(saved.status, "NOT_REVIEWABLE");
assert.ok(saved.textProblems.indexOf("unplanned-visual:brass-socket:p2") >= 0);
assert.strictEqual(saved.pages.length, 12);

var resumed = Resume.resumeCheckpoint(saved);
assert.strictEqual(resumed.paidCalls, 0);
assert.strictEqual(resumed.textCalls, 0);
assert.strictEqual(resumed.ok, true, JSON.stringify(resumed.validation.problems.concat(resumed.plan.problems)));
assert.strictEqual(resumed.validation.storedStatus, "NOT_REVIEWABLE");
assert.ok(resumed.validation.storedTextProblems.indexOf("unplanned-visual:brass-socket:p2") >= 0);
assert.strictEqual(resumed.validation.storyOk, true);
assert.strictEqual(resumed.validation.textOk, true);
assert.strictEqual(resumed.proseSha256, before);
assert.strictEqual(saved.pages.map(function (page) { return page.prose; }).join("\n"), prose);

assert.strictEqual(resumed.plan.requests, 12);
assert.strictEqual(resumed.plan.repairsPerPage, 1);
assert.strictEqual(resumed.plan.maxImageCalls, 24);
assert.strictEqual(resumed.plan.textCalls, 0);
assert.strictEqual(resumed.plan.model, "gpt-image-2.5-sunburst");
assert.strictEqual(resumed.plan.size, "1536x1024");
assert.strictEqual(resumed.plan.quality, "medium");
assert.strictEqual(resumed.plan.style, "wondii-picture-book");
assert.strictEqual(resumed.plan.providerEnforcesCap, false);
assert.strictEqual(resumed.plan.measuredPageUsd, 0.037646);
assert.ok(resumed.plan.happyImageUsd > 0.45 && resumed.plan.happyImageUsd < 0.46);
assert.ok(resumed.plan.worstImageUsd > resumed.plan.happyImageUsd);

resumed.plan.pages.forEach(function (page, index) {
  assert.strictEqual(page.page, index + 1);
  assert.strictEqual(page.prose, saved.pages[index].prose);
  assert.strictEqual(page.storyEvent, saved.pages[index].action);
  assert.deepStrictEqual(page.charactersPresent, ["wondii-maya", "wondii-leo"]);
  assert.ok(page.references.some(function (row) { return row.characterId === "wondii-maya" && row.file.indexOf("maya-v1.jpg") >= 0; }));
  assert.ok(page.references.some(function (row) {
    return row.characterId === "wondii-leo" && row.file.indexOf("wondii-leo.jpg") >= 0 && row.file.indexOf("maya-v1") < 0;
  }));
  assert.ok(page.prompt.indexOf("wondii-picture-book") >= 0 || page.prompt.length > 40);
});

assert.strictEqual(resumed.reader.ok, true, JSON.stringify(resumed.reader));
assert.strictEqual(resumed.reader.pages, 12);
assert.strictEqual(resumed.reader.spreadCount, 7);
assert.strictEqual(resumed.reader.saved, true);
assert.strictEqual(resumed.reader.duplicate, true);
assert.strictEqual(resumed.reader.textsMatch, true);
assert.strictEqual(resumed.reader.claimed, false);

var failure = JSON.parse(fs.readFileSync(failurePath, "utf8"));
assert.strictEqual(failure.stage, "story-stopped");
assert.ok(failure.problems.indexOf("unplanned-visual:brass-socket:p2") >= 0);
assert.strictEqual(failure.calls.image, 0);

var source = fs.readFileSync(path.join(root, "scripts/book/castle-book-run.js"), "utf8");
assert.ok(source.indexOf('process.argv.indexOf("--illustrate")') >= 0);
assert.ok(source.indexOf("require.main === module") >= 0);
var reader = crypto.createHash("sha1").update(fs.readFileSync(path.join(root, "games/book-prototype/book.js"))).digest("hex");
assert.strictEqual(reader, "3992bf4449a45851754911ccb912829951620d3c");

console.log("castle resume checks ok");
