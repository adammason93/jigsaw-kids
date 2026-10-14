"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var First = require("../scripts/book/first-test.js");
var Shelf = require("../js/book-v2-shelf.js");
var Handle = require("../scripts/book/handle-request.js");

var CAST = ["wondii-maya", "wondii-leo"];
var ROLES = ["hook", "discovery", "reaction", "relationship", "attempt", "complication", "reveal", "setback", "exploration", "approach", "climax", "resolution"];
var WHERE = ["gate", "gate", "hall", "hall", "stair", "stair", "tower", "tower", "garden", "garden", "tower", "garden"];
var SHOTS = ["establishing", "close", "reaction", "medium", "action", "overhead", "low", "high", "reveal", "vignette", "establishing", "close"];
var FAMILIES = ["", "found", "listen", "trust", "climb", "snag", "window", "gust", "path", "last", "return", ""];
var ACTIONS = [
  "Maya waits with Leo at the castle gate.",
  "A paper lantern is caught under the castle gate.",
  "Leo follows the paper lantern into the hall.",
  "Maya listens while the paper lantern glows.",
  "Leo checks each step before Maya follows.",
  "The paper lantern snags and Leo stops.",
  "Maya sees the paper lantern by the tower window.",
  "A gust takes the paper lantern off the sill.",
  "Leo follows the paper lantern along the path.",
  "Maya leads the way toward the last turn.",
  "Maya holds the paper lantern steady in the castle.",
  "The paper lantern rests, and the castle is quiet."
];
var LINES = [
  "Maya waits by the closed door.",
  "Leo points at the paper lantern.",
  "Leo steps closer to listen.",
  "Maya keeps one ear turned.",
  "Leo tests the next step.",
  "The light snags on a rail.",
  "Maya sees the light in a high window.",
  "A gust pushes the light away.",
  "Leo walks the long path.",
  "Maya pads beside the wall.",
  "Maya cups the light.",
  "The light sits still on the wall."
];

function draft() {
  return {
    title: "The Paper Lantern",
    premise: "Maya and Leo follow a paper lantern through the castle.",
    hook: "A paper lantern is caught at the castle gate.",
    goal: "Help the lantern get home.",
    centralProblem: "The paper lantern is stuck and keeps moving away.",
    stakes: "The lantern may be lost in the castle.",
    motif: "a paper lantern",
    locations: [
      { locationId: "gate", name: "castle gate", connectedTo: ["hall"], visualIdentity: "a stone arch" },
      { locationId: "hall", name: "great hall", connectedTo: ["gate", "stair"], visualIdentity: "a long hall" },
      { locationId: "stair", name: "winding stair", connectedTo: ["hall", "tower"], visualIdentity: "a narrow stair" },
      { locationId: "tower", name: "high tower", connectedTo: ["stair", "garden"], visualIdentity: "a round room" },
      { locationId: "garden", name: "quiet garden", connectedTo: ["tower"], visualIdentity: "a walled garden" }
    ],
    entities: [{ entityId: "lantern", name: "lantern", identity: "a paper lantern" }],
    beats: ROLES.map(function (role, index) {
      var beat = {
        role: role,
        locationId: WHERE[index],
        charactersPresent: CAST.slice(),
        expresses: [],
        problemFamily: FAMILIES[index],
        action: ACTIONS[index],
        emotion: "steady",
        shotType: SHOTS[index],
        compositionIntent: "View " + (index + 1) + " of this place.",
        textPurpose: role,
        pageTurnHook: index === 0 || index === 3 || index === 7 ? "What happens next?" : "",
        visualFocus: "The next change in the castle.",
        goalNow: "step-" + (index + 1),
        obstacleNow: "block-" + (index + 1),
        worldState: "state-" + (index + 1),
        entityState: []
      };
      if (index === 0) beat.expresses.push({ characterId: "wondii-maya", trait: "curious", shows: "She kneels and listens at the gate." });
      if (index === 4) beat.expresses.push({ characterId: "wondii-leo", trait: "careful", shows: "He checks the step before he climbs." });
      if (index === 1) beat.entityState.push({ entityId: "lantern", introduce: true, ownerCharacterId: null, locationId: "gate", state: "caught" });
      if (index === 5) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "wondii-leo", locationId: "stair", state: "carried" });
      if (index === 10) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "wondii-maya", locationId: "tower", state: "steady" });
      return beat;
    })
  };
}

function model(brief, opts) {
  if (String(opts.purpose).indexOf("prose") >= 0) {
    return Promise.resolve({
      pages: LINES.map(function (line, index) {
        return { pageId: "p" + (index + 1), sentences: [line] };
      })
    });
  }
  return Promise.resolve(draft());
}

function childPorts(key) {
  var allowance = Shelf.memoryAllowance();
  allowance.reserve("child-1", key);
  return {
    callModel: model,
    owner: { userId: "user-1", accountKind: "child", childId: "child-1" },
    store: Shelf.memoryStore(),
    allowance: allowance,
    attempts: {}
  };
}

var planned = First.prepare(First.TEST_BODY);
assert.strictEqual(planned.ok, true, planned.problems.join(","));
assert.strictEqual(planned.stage, "awaiting-approval");
assert.strictEqual(planned.calledModel, false);
assert.strictEqual(planned.imageCalls, 0);
assert.strictEqual(planned.place, "the castle");
assert.ok(planned.idea.indexOf("the castle") >= 0);
assert.ok(planned.idea.indexOf("forest") < 0);
assert.ok(planned.idea.indexOf("woods") < 0);
assert.strictEqual(planned.style, "wondii-picture-book");
assert.strictEqual(planned.length, "storybook");
assert.strictEqual(planned.pageCount, 12);
assert.strictEqual(planned.writing.constraintYear, "Ages 7–9");
assert.notStrictEqual(planned.writing.constraintYear, "Year 5");
assert.strictEqual(planned.references.maya.reason, "readable");
assert.ok(planned.references.maya.file.indexOf("maya-v1.jpg") >= 0);
assert.strictEqual(planned.references.leo.reason, "readable");
assert.ok(planned.references.leo.file.indexOf("wondii-leo.jpg") >= 0);
assert.ok(planned.references.leo.file.indexOf("maya-v1") < 0);
assert.strictEqual(planned.cost.textCallsHappy, 2);
assert.strictEqual(planned.cost.imageCallsHappy, 12);
assert.strictEqual(planned.cost.allowanceClaimsOnFailure, 0);
assert.ok(planned.cost.listedUsdHappy < planned.cost.listedUsdWorst);

var untouched = Handle.handleBookV2(First.TEST_BODY);
assert.strictEqual(untouched.body.simulated, true);
assert.strictEqual(untouched.body.generated, false);
assert.strictEqual(untouched.body.reason, "paid-generation-not-approved");

var source = fs.readFileSync(path.join(__dirname, "../scripts/book/first-test.js"), "utf8");
assert.ok(source.indexOf("api.openai.com") < 0);
assert.ok(source.indexOf("OPENAI_API_KEY") < 0);
assert.ok(source.indexOf("fetch(") < 0);

First.run(First.TEST_BODY, {}).then(function (waiting) {
  assert.strictEqual(waiting.calledModel, false);
  assert.strictEqual(waiting.saved, false);
  var failedKey = "maya-leo-castle-fail";
  var failedPorts = childPorts(failedKey);
  var calls = 0;
  failedPorts.callModel = function (brief, opts) {
    calls += 1;
    return model(brief, opts);
  };
  failedPorts.drawPage = function (page) {
    if (page.pageId === "p2") return { ok: false };
    return { ok: true, imageUrl: "wondii-private:test/" + page.pageId };
  };
  return First.run(Object.assign({}, First.TEST_BODY, { creationKey: failedKey }), failedPorts).then(function (failed) {
    assert.strictEqual(failed.ok, false);
    assert.strictEqual(failed.stage, "pictures");
    assert.strictEqual(failed.saved, false);
    assert.strictEqual(failed.claimed, false);
    assert.strictEqual(failedPorts.allowance.claimedCount(), 0);
    assert.strictEqual(failedPorts.store.readShelf("user-1").length, 0);
    return First.run(Object.assign({}, First.TEST_BODY, { creationKey: failedKey }), failedPorts);
  }).then(function (retry) {
    assert.strictEqual(retry.calledModel, false);
    assert.strictEqual(retry.reason, "already-started");
    assert.strictEqual(retry.claimed, false);
    assert.strictEqual(calls, 2);
    var goodPorts = childPorts(First.TEST_BODY.creationKey);
    var goodCalls = 0;
    goodPorts.callModel = function (brief, opts) {
      goodCalls += 1;
      return model(brief, opts);
    };
    goodPorts.drawPage = function (page) {
      return { ok: true, imageUrl: "wondii-private:test/" + page.pageId };
    };
    return First.run(First.TEST_BODY, goodPorts).then(function (saved) {
      assert.strictEqual(saved.ok, true, JSON.stringify(saved.problems || saved.message));
      assert.strictEqual(saved.pageCount, 12);
      assert.strictEqual(saved.imageCalls, 12);
      assert.strictEqual(saved.claimed, true);
      assert.strictEqual(saved.reader.title, "The Paper Lantern");
      assert.strictEqual(saved.reader.pages.length, 12);
      assert.ok(saved.readerUrl.indexOf("book-prototype/?book=") === 0);
      saved.reader.pages.forEach(function (page, index) {
        assert.strictEqual(page.number, index + 1);
        assert.ok(page.text);
        assert.ok(page.imageSrc.indexOf("wondii-private:test/p" + (index + 1)) === 0);
        assert.strictEqual(page.missingArt, false);
      });
      return First.run(First.TEST_BODY, goodPorts).then(function (again) {
        assert.strictEqual(again.duplicate, true);
        assert.strictEqual(again.calledModel, false);
        assert.strictEqual(again.claimed, false);
        assert.strictEqual(goodCalls, 2);
        assert.strictEqual(goodPorts.allowance.claimedCount(), 1);
        console.log("book-v2 first-test checks ok");
      });
    });
  });
}).catch(function (error) {
  console.error(error && error.stack || error);
  process.exit(1);
});
