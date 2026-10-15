"use strict";

var assert = require("assert");
var Brain = require("../js/book-brain.js");
var Writer = require("../scripts/book/writer.js");
var Produce = require("../scripts/book/produce.js");
var Handle = require("../scripts/book/handle-request.js");

var account = "3153dc82-96b9-4e90-ac76-ffcda0b8b849";
var isaac = "char_mv8k5jtw_4n1e0ito";
var sofia = "char_mv8k4ex1_x9ld4vmk";

function registry(personality) {
  return [
    { characterId: "wondii-maya", journeyId: "wondii-maya", bibleId: "maya", name: "Maya", locked: true, portrait: "games/images/characters/maya-v1.jpg", personality: ["curious", "brave"] },
    { characterId: isaac, journeyId: isaac, name: "Isaac", locked: true, portrait: account + "/characters/" + isaac + ".png", personality: personality || [], privateArt: true },
    { characterId: sofia, journeyId: sofia, name: "Sofia", locked: true, portrait: account + "/characters/" + sofia + ".png", personality: personality || [], privateArt: true }
  ];
}

function bible(rows) {
  return {
    userIdea: "A lost star needs help to get home before morning.",
    targetLength: "storybook",
    pageCount: 12,
    castIds: ["wondii-maya", isaac, sofia],
    identityRegistry: rows,
    beats: [{ role: "hook", charactersPresent: ["wondii-maya"], expresses: [{ characterId: "wondii-maya", trait: "curious", shows: "She kneels and listens." }] }],
    goal: "help the star",
    centralProblem: "the star is lost"
  };
}

var empty = Brain.validateBible(bible(registry([]))).problems;
assert.ok(empty.indexOf("personality-unused:" + isaac) < 0);
assert.ok(empty.indexOf("personality-unused:" + sofia) < 0);
assert.ok(empty.indexOf("personality-unused:wondii-maya") < 0);

var stored = Brain.validateBible(bible(registry(["kind"]))).problems;
assert.ok(stored.indexOf("personality-unused:" + isaac) >= 0);
assert.ok(stored.indexOf("personality-unused:" + sofia) >= 0);

var invented = bible(registry([]));
invented.beats[0].expresses.push({ characterId: isaac, trait: "kind", shows: "He shares the blanket." });
var inventedProblems = Brain.validateBible(invented).problems;
assert.ok(inventedProblems.indexOf("personality-mismatch:" + isaac) >= 0);
assert.ok(inventedProblems.indexOf("personality-unused:" + isaac) < 0);

var ask = {
  castIds: ["wondii-maya", isaac, sofia],
  idea: "A lost star needs help to get home before morning.",
  ageBand: "4-6",
  length: "storybook",
  pageCount: 12,
  tone: "adventure",
  context: "family",
  identityRegistry: registry([])
};
var personalityRepair = Writer.repairBibleBrief(ask, { beats: [] }, ["personality-unused:" + isaac]);
var pageRepair = Writer.repairBibleBrief(ask, { beats: [] }, ["page-count"]);
assert.ok(personalityRepair.system.indexOf("Change only the expresses notes") >= 0);
assert.ok(pageRepair.system.indexOf("full replacement") >= 0);
assert.ok(Writer.bibleBrief(ask).system.indexOf("Do not invent a trait word") >= 0);
assert.ok(Writer.bibleBrief(ask).user.indexOf(isaac + " (none stored)") >= 0);
assert.ok(Writer.bibleBrief(ask).user.indexOf("example-child is not in this cast") >= 0);
assert.ok(Writer.bibleBrief(Object.assign({}, ask, { identityRegistry: registry(["kind"]) })).user.indexOf(isaac + " kind") >= 0);

var calls = 0;
var firstWriter = null;
Writer.generateBook(ask, {
  oneCall: true,
  callModel: function () {
    calls += 1;
    return Promise.resolve({ beats: [] });
  }
}).then(function (first) {
  assert.strictEqual(calls, 1);
  assert.strictEqual(first.status, "CONTINUE");
  assert.strictEqual(first.writer.stage, "bible-repair");
  firstWriter = first.writer;
  return Writer.generateBook(ask, {
    oneCall: true,
    writerState: first.writer,
    callModel: function () {
      calls += 1;
      return Promise.resolve({ beats: [] });
    }
  });
}).then(function (second) {
  assert.strictEqual(calls, 2);
  assert.strictEqual(second.status, "CONTINUE");
  assert.ok(second.writer.tries >= 1);
  var seen = 0;
  return Writer.generateBook(ask, {
    oneCall: true,
    writerState: {
      stage: "bible-repair",
      tries: 2,
      draft: firstWriter.draft,
      problems: ["personality-mismatch:" + isaac, "personality-mismatch:" + sofia]
    },
    callModel: function () {
      seen += 1;
      return Promise.resolve({ beats: [] });
    }
  }).then(function (stopped) {
    assert.strictEqual(seen, 0);
    assert.strictEqual(stopped.status, "NOT_REVIEWABLE");
    assert.ok(stopped.storyProblems.indexOf("personality-mismatch:" + isaac) >= 0);
    assert.ok(stopped.storyProblems.indexOf("personality-mismatch:" + sofia) >= 0);
  });
}).then(function () {
  var disk = {};
  var text = 0;
  var draws = 0;
  var ports = {
    approved: true,
    chunked: true,
    budgetUsd: 2,
    jobs: {
      read: function () { return null; },
      write: function (_user, _key, job) { disk.job = job; },
      claim: function () { return { ok: true, prior: null }; }
    },
    fetchReference: function (row) { return Promise.resolve({ ok: true, bytes: "bytes-" + row.characterId }); },
    callModel: function () {
      text += 1;
      return Promise.reject(Object.assign(new Error("slow"), { code: "model-timeout" }));
    },
    drawImage: function () { draws += 1; return Promise.resolve("data:image/gif;base64,YQ=="); },
    inspectImage: function () { return Promise.resolve({ ok: true }); }
  };
  var body = {
    accountId: account,
    accountKind: "adult",
    familyAgeBand: "4-6",
    creationKey: "book6yy4yi42npe4i45v",
    members: [
      { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
      { id: isaac, name: "Isaac", source: "saved" },
      { id: sofia, name: "Sofia", source: "saved" }
    ],
    savedReferences: [
      { id: isaac, name: "Isaac", ownerType: "family", ownerId: account, reference: account + "/characters/" + isaac + ".png" },
      { id: sofia, name: "Sofia", ownerType: "family", ownerId: account, reference: account + "/characters/" + sofia + ".png" }
    ],
    idea: "Maybe a lost star needs help to get home before morning.",
    place: "library",
    length: "medium",
    theme: "Adventure",
    pageCount: 12
  };
  return Produce.run(null, body, ports).then(function (run) {
    assert.strictEqual(run.job.reason, "model-timeout");
    assert.strictEqual(draws, 0);
    assert.strictEqual(text, 1);
    assert.ok(disk.job.checkpoint.spend.entries.some(function (entry) { return entry.status === "uncertain"; }));
    var running = Object.assign({}, disk.job, { status: "running", startedAt: Date.now() });
    ports.jobs.read = function () { return running; };
    ports.jobs.claim = function () { return { ok: false, reason: "already-running", job: running }; };
    var before = text;
    return Produce.run(null, body, ports).then(function (again) {
      assert.strictEqual(again.reason, "already-running");
      assert.strictEqual(text, before);
      return Handle.handleBookV2(Object.assign({ watch: true }, body), ports);
    });
  }).then(function (watched) {
    assert.strictEqual(watched.body.watch, true);
    assert.strictEqual(watched.body.job.checkpoint, undefined);
    assert.strictEqual(text, 1);
    var keptSpend = { listedUsd: 0.69, entries: [{ id: "paid-text", kind: "text", status: "settled", listedUsd: 0.39 }] };
    var prior = {
      status: "interrupted",
      reason: "story",
      attempts: 7,
      calls: { text: 9, image: 0, vision: 0 },
      spend: keptSpend,
      checkpoint: {
        writer: {
          stage: "bible-repair",
          tries: 2,
          draft: { beats: [] },
          problems: ["personality-mismatch:" + isaac, "personality-mismatch:" + sofia]
        },
        spend: keptSpend,
        failures: [{ reason: "story", problems: ["personality-unused:" + isaac, "personality-unused:" + sofia] }],
        references: {},
        pictures: {},
        repairs: {}
      }
    };
    var stoppedPorts = {
      approved: true,
      chunked: true,
      budgetUsd: 2,
      jobs: {
        read: function () { return prior; },
        write: function (_user, _key, job) { disk.stopped = job; },
        claim: function () { return { ok: true, prior: prior }; }
      },
      fetchReference: ports.fetchReference,
      callModel: function () { text += 1; return Promise.resolve({ beats: [] }); },
      drawImage: ports.drawImage,
      inspectImage: ports.inspectImage
    };
    return Produce.run(null, body, stoppedPorts);
  }).then(function (stopped) {
    assert.strictEqual(stopped.job.reason, "story");
    assert.ok(stopped.job.message.indexOf("personality-mismatch:" + isaac) >= 0);
    assert.strictEqual(text, 1);
    assert.strictEqual(draws, 0);
    assert.strictEqual(disk.stopped.checkpoint.failures[0].problems[0], "personality-unused:" + isaac);
    assert.strictEqual(disk.stopped.checkpoint.failures[1].reason, "story");
    assert.strictEqual(disk.stopped.checkpoint.spend.entries[0].id, "paid-text");
    var resumePrior = {
      status: "interrupted",
      reason: "continue",
      attempts: 7,
      calls: { text: 9, image: 0, vision: 0 },
      checkpoint: {
        writer: { stage: "bible", tries: 0 },
        spend: { listedUsd: 0.69, entries: [{ id: "paid-text", kind: "text", status: "settled", listedUsd: 0.69 }] },
        references: { "wondii-maya": { bytes: "a" }, [isaac]: { bytes: "b" }, [sofia]: { bytes: "c" } },
        pictures: {},
        repairs: {}
      }
    };
    var resumeCalls = 0;
    var resumePorts = {
      approved: true,
      chunked: true,
      budgetUsd: 2,
      jobs: {
        read: function () { return resumePrior; },
        write: function () {},
        claim: function () { return { ok: true, prior: resumePrior }; }
      },
      fetchReference: ports.fetchReference,
      callModel: function () { resumeCalls += 1; return Promise.resolve({ pages: [] }); },
      drawImage: ports.drawImage,
      inspectImage: ports.inspectImage
    };
    return Produce.run(null, body, resumePorts).then(function (resumed) {
      assert.strictEqual(resumeCalls, 1, resumed.job && resumed.job.message);
      assert.strictEqual(resumed.reason, "continue");
      assert.strictEqual(draws, 0);
      resumePrior.calls.text = 12;
      resumeCalls = 0;
      return Produce.run(null, body, resumePorts).then(function (capped) {
        assert.strictEqual(capped.reason, "call-cap");
        assert.strictEqual(resumeCalls, 0);
        console.log("book-v2 generation resume tests ok");
      });
    });
  });
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
