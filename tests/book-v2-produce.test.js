"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Produce = require("../scripts/book/produce.js");
var Handle = require("../scripts/book/handle-request.js");
var Shelf = require("../js/book-v2-shelf.js");
var Budget = require("../js/book-v2-budget.js");

require("../games/book-prototype/book-data.js");

var root = path.join(__dirname, "..");
var account = "user-1";
var key = "bookplan000000000012";
var CAST = ["wondii-maya", "char_isaac"];
var PLACES = [
  { locationId: "gate", name: "castle gate", connectedTo: ["hall"], visualIdentity: "a stone arch" },
  { locationId: "hall", name: "great hall", connectedTo: ["gate", "stair"], visualIdentity: "a long hall" },
  { locationId: "stair", name: "winding stair", connectedTo: ["hall", "tower"], visualIdentity: "a narrow stair" },
  { locationId: "tower", name: "high tower", connectedTo: ["stair", "garden"], visualIdentity: "a round room" },
  { locationId: "garden", name: "quiet garden", connectedTo: ["tower"], visualIdentity: "a walled garden" }
];
var ROLES = ["hook", "discovery", "reaction", "relationship", "attempt", "complication", "reveal", "setback", "exploration", "approach", "climax", "resolution"];
var WHERE = ["gate", "gate", "hall", "hall", "stair", "stair", "tower", "tower", "garden", "garden", "tower", "garden"];
var SHOTS = ["establishing", "close", "reaction", "medium", "action", "overhead", "low", "high", "reveal", "vignette", "establishing", "close"];
var FAMILIES = ["", "found", "listen", "trust", "climb", "snag", "window", "gust", "path", "last", "return", ""];
var ACTIONS = [
  "Maya waits while Isaac looks along the castle gate.",
  "A paper lantern is caught under the castle gate.",
  "Isaac follows the paper lantern into the hall.",
  "Maya listens while Isaac holds the paper lantern.",
  "Isaac checks each step before anyone follows.",
  "The paper lantern snags and Isaac stops.",
  "Maya sees the paper lantern by the tower window.",
  "A gust takes the paper lantern off the sill.",
  "Isaac follows the paper lantern along the path.",
  "Maya leads Isaac toward the last turn.",
  "Maya holds the paper lantern steady in the castle.",
  "The paper lantern rests, and the castle is quiet."
];
var LINES = [
  "Maya waits by the closed door.",
  "Isaac points at the paper lantern.",
  "Isaac steps closer to listen.",
  "Maya keeps one ear turned.",
  "Isaac tests the next step.",
  "The light snags on a rail.",
  "Maya sees the light in a high window.",
  "A gust pushes the light away.",
  "Isaac walks the long path.",
  "Maya walks beside the wall.",
  "Maya cups the pale light.",
  "The light sits still on the wall."
];

function draft() {
  return {
    title: "The Paper Lantern",
    premise: "Maya and Isaac follow a paper lantern through the castle.",
    hook: "A paper lantern is caught at the castle gate.",
    goal: "Help the lantern get home.",
    centralProblem: "The paper lantern is stuck and keeps moving away.",
    stakes: "The lantern may be lost in the castle.",
    motif: "a paper lantern",
    locations: PLACES,
    entities: [{ entityId: "lantern", name: "lantern", identity: "a paper lantern" }],
    storyCast: [],
    beats: ROLES.map(function (role, index) {
      var beat = {
        role: role,
        locationId: WHERE[index],
        charactersPresent: CAST.slice(),
        expresses: [],
        problemFamily: FAMILIES[index],
        action: ACTIONS[index],
        emotion: index === 10 ? "brave" : "steady",
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
      if (index === 1) beat.entityState.push({ entityId: "lantern", introduce: true, ownerCharacterId: null, locationId: "gate", state: "caught" });
      if (index === 5) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "char_isaac", locationId: "stair", state: "carried" });
      if (index === 10) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "wondii-maya", locationId: "tower", state: "steady" });
      return beat;
    })
  };
}

function spoken() {
  return {
    pages: LINES.map(function (line, index) {
      return { pageId: "p" + (index + 1), sentences: [line] };
    })
  };
}

function bodyFor(extra) {
  return Object.assign({
    accountId: account,
    accountKind: "child",
    childId: "child-1",
    childPermitted: true,
    allowanceReserved: true,
    familyAgeBand: "7-9",
    creationKey: key,
    members: [
      { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
      { id: "char_isaac", name: "Isaac", source: "saved" }
    ],
    savedReferences: [{
      id: "char_isaac",
      name: "Isaac",
      ownerType: "family",
      ownerId: account,
      reference: account + "/characters/char_isaac.png"
    }],
    idea: "Isaac follows a paper lantern through the castle with Maya.",
    place: "castle",
    length: "medium",
    theme: "Magic"
  }, extra || {});
}

function jobsFor() {
  var rows = {};
  return {
    read: function (userId, creationKey) { return rows[userId + ":" + creationKey] || null; },
    write: function (userId, creationKey, job) { rows[userId + ":" + creationKey] = JSON.parse(JSON.stringify(job)); },
    claim: function (userId, creationKey) {
      var id = userId + ":" + creationKey;
      var current = rows[id];
      if (current && current.status === "complete") return { ok: false, reason: "already-generated", job: current };
      if (current && current.status === "running") {
        var age = Date.now() - Number(current.startedAt || 0);
        if (age < 15000) return { ok: false, reason: "already-running", job: current };
      }
      rows[id] = Object.assign({}, current || {}, { status: "running", startedAt: Date.now(), accountId: userId, creationKey: creationKey });
      return { ok: true, prior: current || null };
    }
  };
}

function pictureStore() {
  var objects = {};
  return {
    put: function (input) {
      if (!input || input.accountId !== account) return "";
      var url = String(input.dataUrl || "");
      if (url.indexOf("data:image/") !== 0) return "";
      objects[input.accountId + "/" + input.creationKey + "/" + input.pageId] = url;
      return url;
    },
    get: function (id) { return objects[id] || ""; },
    keys: function () { return Object.keys(objects); }
  };
}

function visionFor(spread, bad) {
  return {
    characters: (spread.charactersPresent || []).map(function (id) {
      return { characterId: id, identityMatch: !(bad && id === "wondii-maya"), outfitMatch: true, count: 1 };
    }),
    entities: (spread.entitySpecs || []).map(function (spec) {
      return { entityId: spec.entityId, status: "confirmed", seen: "the paper lantern" };
    }),
    momentMatch: true,
    locationMatch: true,
    textDetected: false,
    anatomyOk: true,
    textSafeUsable: true,
    duplicateCharacter: false,
    montageShown: false,
    style: { rendering: "painted", proportions: "picture-book", finish: "picture-book" }
  };
}

function portsFor(options) {
  var settings = options || {};
  var draws = [];
  var fetches = [];
  var inspections = {};
  var nested = [];
  var textCalls = 0;
  var store = settings.store || Shelf.memoryStore();
  var jobs = settings.jobs || jobsFor();
  var pictures = settings.pictures || pictureStore();
  var allowance = settings.allowance || Shelf.memoryAllowance();
  var ports = {
    approved: settings.approved !== false,
    store: store,
    jobs: jobs,
    allowance: allowance,
    draws: draws,
    fetches: fetches,
    pictures: pictures,
    callModel: function (brief, opts) {
      textCalls += 1;
      if (String(opts && opts.purpose || "").indexOf("prose") >= 0) return Promise.resolve(spoken());
      return Promise.resolve(draft());
    },
    fetchReference: function (row) {
      fetches.push({ characterId: row.characterId, file: row.file, privateArt: row.privateArt === true });
      if (settings.sameBytes) return Promise.resolve({ ok: true, bytes: "same-bytes" });
      var file = String(row.file || "");
      if (row.characterId === "wondii-maya" && file.indexOf("maya-v1") < 0) return Promise.resolve({ ok: false });
      if (row.characterId === "char_isaac" && file !== account + "/characters/char_isaac.png") return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, bytes: "bytes:" + row.characterId });
    },
    drawImage: function (input) {
      if (!nested.length && settings.nest) {
        nested.push(Produce.run(null, bodyFor(), ports));
      }
      if (settings.failPage && input.pageId === settings.failPage && !settings.failed) {
        settings.failed = true;
        return Promise.reject(Object.assign(new Error("stopped"), { code: "story" }));
      }
      draws.push({ pageId: input.pageId, repair: input.repair === true, prompt: input.prompt, references: (input.references || []).map(function (row) { return row.characterId; }) });
      return Promise.resolve("data:image/gif;base64," + Buffer.from(String(input.pageId) + (input.repair ? "-repair" : "")).toString("base64"));
    },
    inspectImage: function (input) {
      inspections[input.pageId] = (inspections[input.pageId] || 0) + 1;
      var bad = input.pageId === "p2" && inspections[input.pageId] === 1;
      return Promise.resolve(visionFor(input.spread, bad));
    },
    storePicture: function (input) { return pictures.put(input); },
    textCalls: function () { return textCalls; },
    nested: function () { return nested; }
  };
  return ports;
}

var edge = fs.readFileSync(path.join(root, "supabase/functions/book-v2/index.ts"), "utf8");
var provider = fs.readFileSync(path.join(root, "supabase/functions/book-v2/provider.mjs"), "utf8");
var produceSource = fs.readFileSync(path.join(root, "scripts/book/produce.js"), "utf8");
assert.ok(edge.indexOf("OPENAI") < 0);
assert.ok(edge.indexOf("api.openai.com") < 0);
assert.ok(edge.indexOf('BOOK_V2_PAID_TEST") === "approved"') >= 0);
assert.ok(edge.indexOf('import("./provider.mjs")') >= 0);
assert.ok(provider.indexOf("OPENAI_API_KEY") >= 0);
assert.ok(provider.indexOf("https://api.openai.com/v1/chat/completions") >= 0);
assert.ok(provider.indexOf("https://api.openai.com/v1/images/edits") >= 0);
assert.ok(produceSource.indexOf("api.openai.com") < 0);
assert.ok(produceSource.indexOf("book.js") < 0);
assert.ok(fs.readFileSync(path.join(root, "games/book-prototype/book.js"), "utf8").indexOf("var TURN_MS = 880") >= 0 || fs.readFileSync(path.join(root, "games/book-prototype/book.js"), "utf8").indexOf("TURN_MS = 880") >= 0);

var allowance = Shelf.memoryAllowance();
allowance.reserve("child-1", key);
var ports = portsFor({ allowance: allowance, failPage: "p6", nest: true });
var blocked = Handle.handleBookV2(bodyFor());
assert.strictEqual(blocked.status, 200);
assert.strictEqual(blocked.body.generated, false);
assert.strictEqual(blocked.body.job.paid, false);
assert.strictEqual(blocked.body.generation.authorised, false);
assert.strictEqual(ports.draws.length, 0);

Produce.run(null, bodyFor(), ports).then(function (stopped) {
  assert.strictEqual(stopped.ok, false);
  assert.strictEqual(stopped.book, null);
  assert.strictEqual(allowance.claimedCount(), 0);
  assert.ok(ports.draws.some(function (row) { return row.pageId === "p5"; }));
  assert.ok(!ports.draws.some(function (row) { return row.pageId === "p6"; }));
  assert.ok(stopped.job.calls.text > 0);
  assert.ok(stopped.job.calls.image > 0);
  assert.strictEqual(stopped.job.status, "interrupted");
  assert.strictEqual(stopped.job.recoverable, true);
  assert.ok(stopped.job.checkpoint == null);
  var textBefore = ports.textCalls();
  var drawsBefore = ports.draws.length;
  ports.failPage = "";
  return Produce.run(null, bodyFor(), ports).then(function (made) {
    assert.strictEqual(made.ok, true, made.job && made.job.message);
    assert.strictEqual(made.book.ownerUserId, account);
    assert.strictEqual(made.book.recordKind, "book");
    assert.strictEqual(made.book.generated, true);
    assert.strictEqual(made.book.pages.length, 12);
    assert.ok(made.book.pages.every(function (page) {
      return page.text && String(page.imageDataUrl || "").indexOf("data:image/") === 0;
    }));
    assert.strictEqual(new Set(made.book.pages.map(function (page) { return page.imageDataUrl; })).size, 12);
    assert.strictEqual(ports.textCalls(), textBefore);
    assert.ok(ports.draws.length > drawsBefore);
    assert.ok(!ports.draws.slice(drawsBefore).some(function (row) { return row.pageId === "p5" && row.repair !== true; }));
    assert.strictEqual(allowance.claimedCount(), 1);
    assert.strictEqual(made.claimed, true);
    assert.ok(made.art.schema === "wondii-art-direction/2");
    var layouts = made.art.pages.map(function (page) { return page.layout; });
    assert.strictEqual(layouts.length, 12);
    assert.ok(new Set(layouts).size > 1);
    assert.ok(made.job.stages.every(function (stage) { return stage.state === "done"; }));
    assert.ok(Budget.price(made.calls).usd <= 1.2);
    assert.ok(made.calls.image <= Budget.MAX_IMAGE);
    var maya = made.references.filter(function (row) { return row.characterId === "wondii-maya"; })[0];
    var isaac = made.references.filter(function (row) { return row.characterId === "char_isaac"; })[0];
    assert.ok(maya.file.indexOf("maya-v1") >= 0);
    assert.strictEqual(isaac.file, account + "/characters/char_isaac.png");
    assert.ok(maya.file.indexOf("char_isaac") < 0);
    assert.ok(isaac.file.indexOf("maya") < 0);
    assert.ok(ports.pictures.keys().every(function (id) { return id.indexOf(account + "/") === 0; }));
    assert.strictEqual(ports.pictures.get("user-2/" + key + "/p1"), "");
    var reading = global.WondiiBookData.plan(made.book);
    assert.strictEqual(reading.pages.length, 12);
    assert.ok(reading.pages.every(function (page) { return page.missingArt === false && page.imageSrc.indexOf("data:image/") === 0; }));
    var drawsAfter = ports.draws.length;
    return Produce.run(null, bodyFor(), ports).then(function (again) {
      assert.strictEqual(again.duplicate, true);
      assert.strictEqual(again.ran, false);
      assert.strictEqual(ports.draws.length, drawsAfter);
      assert.strictEqual(allowance.claimedCount(), 1);
      assert.strictEqual(again.book.id, made.book.id);
      var other = portsFor({ sameBytes: true, store: Shelf.memoryStore(), jobs: jobsFor(), allowance: Shelf.memoryAllowance() });
      other.allowance.reserve("child-1", "bookplan000000000099");
      return Produce.run(null, bodyFor({ creationKey: "bookplan000000000099" }), other);
    });
  });
}).then(function (copied) {
  assert.strictEqual(copied.ok, false);
  assert.strictEqual(copied.book, null);
  assert.ok(copied.job.message.indexOf("portrait") >= 0);
  var foreign = portsFor({ store: Shelf.memoryStore(), jobs: jobsFor(), allowance: Shelf.memoryAllowance() });
  return Produce.run(null, bodyFor({
    accountId: "user-2",
    savedReferences: [{
      id: "char_isaac",
      name: "Isaac",
      ownerType: "family",
      ownerId: "user-2",
      reference: account + "/characters/char_isaac.png"
    }]
  }), foreign).then(function (denied) {
    assert.strictEqual(denied.book, null);
    assert.strictEqual(foreign.draws.length, 0);
    assert.ok(denied.job.message.indexOf("Isaac") >= 0 || (denied.job.message || "").indexOf("portrait") >= 0);
    var child = portsFor({ approved: true, store: Shelf.memoryStore(), jobs: jobsFor(), allowance: Shelf.memoryAllowance() });
    return Produce.run(null, bodyFor({ childPermitted: false }), child).then(function (refused) {
      assert.strictEqual(refused.ran, false);
      assert.strictEqual(refused.reason, "child-not-permitted");
      assert.strictEqual(child.draws.length, 0);
      assert.strictEqual(child.allowance.claimedCount(), 0);
      var story = ports.jobs.read(account, key).checkpoint.story;
      var budgetJobs = jobsFor();
      budgetJobs.write(account, "bookbudget000000001", {
        status: "interrupted",
        calls: { text: 3, image: 24, vision: 0 },
        checkpoint: { story: story },
        accountId: account,
        creationKey: "bookbudget000000001"
      });
      var budgetPorts = portsFor({ jobs: budgetJobs, store: Shelf.memoryStore(), allowance: Shelf.memoryAllowance() });
      budgetPorts.allowance.reserve("child-1", "bookbudget000000001");
      return Produce.run(null, bodyFor({ creationKey: "bookbudget000000001" }), budgetPorts).then(function (capped) {
        assert.strictEqual(capped.book, null);
        assert.strictEqual(budgetPorts.draws.length, 0);
        assert.strictEqual(budgetPorts.allowance.claimedCount(), 0);
        assert.strictEqual(capped.reason, "call-cap");
        var nested = ports.nested();
        assert.strictEqual(nested.length, 1);
        return nested[0];
      });
    });
  });
}).then(function (second) {
  assert.strictEqual(second.reason, "already-running");
  assert.strictEqual(second.ran, false);
  console.log("book-v2 produce tests ok");
}).catch(function (error) {
  console.error(error && error.stack || error);
  process.exit(1);
});
