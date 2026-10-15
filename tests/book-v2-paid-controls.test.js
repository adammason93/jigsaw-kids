"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Produce = require("../scripts/book/produce.js");
var Handle = require("../scripts/book/handle-request.js");
var Shelf = require("../js/book-v2-shelf.js");
var Cost = require("../js/book-v2-cost.js");

var root = path.join(__dirname, "..");
var account = "user-1";
var key = "bookplan000000000012";
var otherKey = "bookplan000000000013";
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
  "Sofia steps closer to listen.",
  "Maya keeps one ear turned.",
  "Isaac tests the next step.",
  "The light snags on a rail.",
  "Sofia sees the light in a high window.",
  "A gust pushes the light away.",
  "Isaac walks the long path.",
  "Maya walks beside the wall.",
  "Sofia cups the pale light.",
  "The light sits still on the wall."
];

function castIds() {
  return ["wondii-maya", "char_isaac", "wondii-sofia"];
}

function draft() {
  return {
    title: "The Paper Lantern",
    premise: "Maya, Isaac and Sofia follow a paper lantern through the castle.",
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
        charactersPresent: castIds(),
        expresses: [],
        problemFamily: FAMILIES[index],
        action: ACTIONS[index],
        emotion: index === 10 ? "brave" : "steady",
        shotType: SHOTS[index],
        compositionIntent: "View " + (index + 1) + " of this place.",
        textPurpose: role,
        pageTurnHook: index === 0 ? "What happens next?" : "",
        visualFocus: "The next change in the castle.",
        goalNow: "step-" + (index + 1),
        obstacleNow: "block-" + (index + 1),
        worldState: "state-" + (index + 1),
        entityState: []
      };
      if (index === 0) beat.expresses.push({ characterId: "wondii-maya", trait: "curious", shows: "She kneels and listens at the gate." });
      if (index === 1) beat.entityState.push({ entityId: "lantern", introduce: true, ownerCharacterId: null, locationId: "gate", state: "caught" });
      if (index === 5) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "char_isaac", locationId: "stair", state: "carried" });
      if (index === 10) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "wondii-sofia", locationId: "tower", state: "steady" });
      return beat;
    })
  };
}

function spoken() {
  return { pages: LINES.map(function (line, index) { return { pageId: "p" + (index + 1), sentences: [line] }; }) };
}

function bodyFor(extra) {
  return Object.assign({
    accountId: account,
    accountKind: "adult",
    familyAgeBand: "4-6",
    creationKey: key,
    members: [
      { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
      { id: "char_isaac", name: "Isaac", source: "saved" },
      { id: "wondii-sofia", name: "Sofia", source: "wondii-crew" }
    ],
    savedReferences: [{
      id: "char_isaac",
      name: "Isaac",
      ownerType: "family",
      ownerId: account,
      reference: account + "/characters/char_isaac.png"
    }],
    idea: "Maya, Isaac and Sofia follow a paper lantern through the castle.",
    place: "castle",
    length: "medium",
    theme: "Magic"
  }, extra || {});
}

function diskJobs(disk) {
  return {
    read: function (userId, creationKey) {
      var raw = disk[userId + ":" + creationKey];
      return raw ? JSON.parse(raw) : null;
    },
    write: function (userId, creationKey, job) {
      disk[userId + ":" + creationKey] = JSON.stringify(job);
    },
    claim: function (userId, creationKey) {
      var id = userId + ":" + creationKey;
      var current = disk[id] ? JSON.parse(disk[id]) : null;
      if (current && current.status === "complete") return { ok: false, reason: "already-generated", job: current };
      if (current && current.status === "running") {
        var age = Date.now() - Number(current.startedAt || 0);
        if (age < 180000) return { ok: false, reason: "already-running", job: current };
      }
      var next = Object.assign({}, current || {}, { status: "running", startedAt: Date.now(), accountId: userId, creationKey: creationKey });
      disk[id] = JSON.stringify(next);
      return { ok: true, prior: current };
    }
  };
}

function portsFor(disk, settings) {
  var options = settings || {};
  var draws = [];
  var fetches = [];
  var textCalls = 0;
  var inspections = {};
  var nested = [];
  var ports = {
    approved: true,
    budgetUsd: options.budgetUsd == null ? 8 : options.budgetUsd,
    model: "gpt-6.1-sol",
    store: options.store || Shelf.memoryStore(),
    jobs: options.jobs || diskJobs(disk),
    allowance: options.allowance || Shelf.memoryAllowance(),
    draws: draws,
    fetches: fetches,
    callModel: function (brief, opts) {
      textCalls += 1;
      var value = String(opts && opts.purpose || "").indexOf("prose") >= 0 ? spoken() : draft();
      if (options.reportUsage) {
        return Promise.resolve({ value: value, usage: { prompt_tokens: 1200, completion_tokens: 400 } });
      }
      return Promise.resolve(value);
    },
    fetchReference: function (row) {
      fetches.push({ characterId: row.characterId, file: row.file, privateArt: row.privateArt === true });
      var file = String(row.file || "");
      if (row.characterId === "wondii-maya" && file.indexOf("maya-v1") < 0) return Promise.resolve({ ok: false });
      if (row.characterId === "wondii-sofia" && (file.indexOf("wondii-sofia") < 0 || file.indexOf("maya-v1") >= 0)) return Promise.resolve({ ok: false });
      if (row.characterId === "char_isaac" && file !== account + "/characters/char_isaac.png") return Promise.resolve({ ok: false });
      if (options.missing === row.characterId) return Promise.resolve({ ok: false, reason: "missing" });
      return Promise.resolve({ ok: true, bytes: "bytes:" + row.characterId });
    },
    drawImage: function (input) {
      if (options.nest && !nested.length) nested.push(Produce.run(null, bodyFor(), ports));
      if (options.failPage && input.pageId === options.failPage && !options.failed) {
        options.failed = true;
        return Promise.reject(Object.assign(new Error("timeout"), { code: "story" }));
      }
      draws.push({
        pageId: input.pageId,
        repair: input.repair === true,
        references: (input.references || []).map(function (row) { return row.characterId; })
      });
      var image = "data:image/gif;base64," + Buffer.from(String(input.pageId) + (input.repair ? "-repair" : "")).toString("base64");
      if (options.reportUsage) {
        var refs = (input.references || []).length;
        return Promise.resolve({
          image: image,
          usage: { output_tokens: 343, input_tokens_details: { text_tokens: 400, image_tokens: 1536 * refs } }
        });
      }
      return Promise.resolve(image);
    },
    inspectImage: function (input) {
      inspections[input.pageId] = (inspections[input.pageId] || 0) + 1;
      var bad = options.alwaysBad || (input.pageId === "p2" && inspections[input.pageId] === 1);
      var report = {
        characters: (input.spread.charactersPresent || []).map(function (id) {
          return { characterId: id, identityMatch: !bad, outfitMatch: true, count: 1 };
        }),
        entities: (input.spread.entitySpecs || []).map(function (spec) {
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
      return Promise.resolve(options.reportUsage ? { report: report, usage: { prompt_tokens: 3200, completion_tokens: 180 } } : report);
    },
    storePicture: function (input) {
      var url = String(input && input.dataUrl || "");
      if (!input || input.accountId !== account || url.indexOf("data:image/") !== 0) return "";
      return url;
    },
    textCalls: function () { return textCalls; },
    nested: function () { return nested; }
  };
  return ports;
}

var edge = fs.readFileSync(path.join(root, "supabase/functions/book-v2/index.ts"), "utf8");
var provider = fs.readFileSync(path.join(root, "supabase/functions/book-v2/provider.mjs"), "utf8");
var produceSource = fs.readFileSync(path.join(root, "scripts/book/produce.js"), "utf8");
assert.ok(edge.indexOf("OPENAI") < 0);
assert.ok(edge.indexOf("BOOK_V2_PAID_TEST") < 0);
assert.ok(provider.indexOf("await writeJson") >= 0);
assert.ok(provider.indexOf("confirmLease") >= 0);
assert.ok(provider.indexOf("wondii-sofia") >= 0);
assert.ok(produceSource.indexOf("api.openai.com") < 0);
assert.ok(produceSource.indexOf("OPENAI") < 0);

var blocked = Handle.handleBookV2(Object.assign(bodyFor(), { approved: true, budgetUsd: 50 }));
assert.strictEqual(blocked.body.generation.authorised, false);
assert.strictEqual(blocked.body.generated, false);

[1, 2, 3].forEach(function (count) {
  var quote = Cost.quoteBook(count, 12);
  assert.ok(quote.expectedUsd > 0);
  assert.ok(quote.upperUsd > quote.expectedUsd);
  assert.ok(quote.repairUsd > 0);
  assert.strictEqual(quote.providerInvoiceCap, false);
  assert.ok(quote.pictureUpperUsd > quote.pictureExpectedUsd);
  console.log(JSON.stringify({
    characters: count,
    expectedUsd: quote.expectedUsd,
    upperUsd: quote.upperUsd,
    repairUsd: quote.repairUsd,
    withOneRepairUsd: Cost.money(quote.expectedUsd + quote.repairUsd)
  }));
});
assert.ok(Cost.imageBound("hello", 3) > Cost.imageExpected(3));
assert.ok(Cost.settle("image", null, 0.07) === 0.07);
assert.ok(Cost.settle("text", { prompt_tokens: 1000, completion_tokens: 100 }, 1) < 1);

Promise.resolve().then(function () {
  return Promise.all([
    import("../supabase/functions/book-v2/allow.mjs"),
    import("../supabase/functions/book-v2/lease.mjs")
  ]);
}).then(function (loaded) {
  var allow = loaded[0];
  var lease = loaded[1];
  var secrets = { accountId: account, creationKey: key, budgetUsd: "2" };
  var yes = allow.paidJobAllowed({ accountId: account, accountKind: "adult", creationKey: key, secrets: secrets });
  assert.strictEqual(yes.ok, true);
  assert.strictEqual(yes.budgetUsd, 2);
  assert.strictEqual(allow.paidJobAllowed({ accountId: "user-2", accountKind: "adult", creationKey: key, secrets: secrets }).ok, false);
  assert.strictEqual(allow.paidJobAllowed({ accountId: account, accountKind: "adult", creationKey: otherKey, secrets: secrets }).ok, false);
  assert.strictEqual(allow.paidJobAllowed({ accountId: account, accountKind: "child", creationKey: key, secrets: secrets }).ok, false);
  assert.strictEqual(allow.paidJobAllowed({ accountId: account, accountKind: "adult", creationKey: key, secrets: {} }).ok, false);
  assert.strictEqual(allow.paidJobAllowed({
    accountId: account,
    accountKind: "adult",
    creationKey: key,
    secrets: { accountId: account, creationKey: key, budgetUsd: "9" }
  }).ok, false);
  var first = "lease-a";
  var stored = { lease: "lease-b" };
  assert.strictEqual(lease.confirmLease(stored, first), false);
  assert.strictEqual(lease.confirmLease({ lease: first }, first), true);
  assert.strictEqual(lease.claimGate({ status: "running", startedAt: Date.now() }, Date.now(), 180000).reason, "already-running");
  assert.strictEqual(lease.claimGate({ status: "running", startedAt: Date.now() - 200000 }, Date.now(), 180000).ok, true);
  assert.strictEqual(lease.claimGate({ status: "complete" }, Date.now(), 180000).reason, "already-generated");

  var disk = {};
  var ports = portsFor(disk, { reportUsage: true, nest: true });
  return Produce.run(null, bodyFor(), ports).then(function (made) {
    assert.strictEqual(made.ok, true, made.job && made.job.message);
    assert.strictEqual(made.book.pages.length, 12);
    assert.strictEqual(made.book.ownerUserId, account);
    assert.ok(made.spend.listedUsd > 0);
    assert.ok(made.spend.listedUsd <= 2 || made.spend.listedUsd <= ports.budgetUsd);
    assert.ok(made.spend.entries.every(function (entry) { return entry.status === "settled" && entry.listedUsd > 0; }));
    var files = {};
    ports.fetches.forEach(function (row) { files[row.characterId] = row.file; });
    assert.ok(files["wondii-maya"].indexOf("maya-v1") >= 0);
    assert.ok(files["wondii-sofia"].indexOf("wondii-sofia") >= 0);
    assert.ok(files["wondii-sofia"].indexOf("maya-v1") < 0);
    assert.strictEqual(files["char_isaac"], account + "/characters/char_isaac.png");
    assert.ok(ports.draws.every(function (row) {
      return row.references.indexOf("wondii-maya") >= 0 && row.references.indexOf("char_isaac") >= 0 && row.references.indexOf("wondii-sofia") >= 0;
    }));
    assert.strictEqual(ports.nested().length, 1);
    return ports.nested()[0].then(function (second) {
      assert.strictEqual(second.reason, "already-running");
      assert.strictEqual(second.ran, false);
      var again = ports.draws.length;
      return Produce.run(null, bodyFor(), ports).then(function (duplicate) {
        assert.strictEqual(duplicate.duplicate, true);
        assert.strictEqual(ports.draws.length, again);
        var kept = ports.store.readShelf(account)[0];
        assert.strictEqual(kept.pages.length, 12);
      });
    });
  });
}).then(function () {
  var disk = {};
  var failing = { failPage: "p3", budgetUsd: 8 };
  var first = portsFor(disk, failing);
  return Produce.run(null, bodyFor({ creationKey: otherKey }), first).then(function (stopped) {
    assert.strictEqual(stopped.book, null);
    assert.strictEqual(stopped.job.recoverable, true);
    assert.ok(stopped.spend.entries.some(function (entry) { return entry.status === "uncertain"; }));
    var stored = JSON.parse(disk[account + ":" + otherKey]);
    assert.ok(stored.checkpoint.pictures.p1.accepted);
    assert.ok(stored.checkpoint.pictures.p2.accepted);
    Object.keys(stored.checkpoint.references).forEach(function (id) {
      assert.ok(!stored.checkpoint.references[id].bytes);
    });
    var resumed = portsFor(disk, { budgetUsd: 8 });
    var before = resumed.textCalls();
    return Produce.run(null, bodyFor({ creationKey: otherKey }), resumed).then(function (made) {
      assert.strictEqual(made.ok, true, made.job && made.job.message);
      assert.strictEqual(resumed.textCalls(), before);
      assert.ok(!resumed.draws.some(function (row) { return row.pageId === "p1" || row.pageId === "p2"; }));
      assert.ok(resumed.draws.some(function (row) { return row.pageId === "p3"; }));
      assert.strictEqual(made.book.pages.length, 12);
    });
  });
}).then(function () {
  var disk = {};
  var seedPorts = portsFor(disk, { failPage: "p1", budgetUsd: 8 });
  return Produce.run(null, bodyFor({ creationKey: "bookbudget000000001" }), seedPorts).then(function (seed) {
    assert.strictEqual(seed.book, null);
    var stored = JSON.parse(disk[account + ":bookbudget000000001"]);
    stored.spend = { listedUsd: 1.19, entries: [{ id: 1, kind: "text", status: "settled", listedUsd: 1.19 }] };
    stored.checkpoint.spend = stored.spend;
    stored.status = "interrupted";
    disk[account + ":bookbudget000000001"] = JSON.stringify(stored);
    var tight = portsFor(disk, { budgetUsd: 1.2 });
    return Produce.run(null, bodyFor({ creationKey: "bookbudget000000001" }), tight).then(function (capped) {
      assert.strictEqual(capped.book, null);
      assert.strictEqual(capped.reason, "budget");
      assert.strictEqual(tight.draws.length, 0);
      assert.strictEqual(tight.textCalls(), 0);
    });
  });
}).then(function () {
  var missing = portsFor({}, { missing: "char_isaac", budgetUsd: 8 });
  return Produce.run(null, bodyFor({ creationKey: "bookplan000000000014" }), missing).then(function (stopped) {
    assert.strictEqual(stopped.book, null);
    assert.strictEqual(missing.textCalls(), 0);
    assert.strictEqual(missing.draws.length, 0);
    assert.ok(stopped.job.message.indexOf("Isaac") >= 0);
    var swapped = portsFor({}, { budgetUsd: 8 });
    return Produce.run(null, bodyFor({
      creationKey: "bookplan000000000015",
      savedReferences: [{
        id: "char_isaac",
        name: "Isaac",
        ownerType: "family",
        ownerId: account,
        reference: "games/images/characters/maya-v1.jpg"
      }]
    }), swapped).then(function (denied) {
      assert.strictEqual(denied.book, null);
      assert.strictEqual(swapped.textCalls(), 0);
      assert.strictEqual(swapped.draws.length, 0);
      assert.ok(denied.job.message.indexOf("Isaac") >= 0);
    });
  });
}).then(function () {
  var bad = portsFor({}, { alwaysBad: true, budgetUsd: 8 });
  return Produce.run(null, bodyFor({ creationKey: "bookplan000000000016" }), bad).then(function (failed) {
    assert.strictEqual(failed.book, null);
    assert.strictEqual(failed.reason, "picture");
    assert.ok(bad.draws.some(function (row) { return row.repair === true; }));
    assert.strictEqual(bad.allowance.claimedCount(), 0);
    var broken = {
      readShelf: function () { return []; },
      writeShelf: null
    };
    var save = portsFor({}, { budgetUsd: 8, store: broken, allowance: Shelf.memoryAllowance() });
    return Produce.run(null, bodyFor({ creationKey: "bookplan000000000017" }), save).then(function (unsaved) {
      assert.strictEqual(unsaved.book, null);
      assert.strictEqual(unsaved.reason, "unauthorised");
      assert.ok(save.draws.length >= 12);
      assert.strictEqual(save.allowance.claimedCount(), 0);
      var shelf = Shelf.memoryStore();
      shelf.writeShelf(account, [{
        id: "kept-book",
        creationKey: "bookplan000000000018",
        recordKind: "book",
        generated: true,
        title: "Already saved",
        pages: [{ text: "old page", imageDataUrl: "data:image/gif;base64,QQ==" }]
      }]);
      var owned = portsFor({}, { budgetUsd: 8, store: shelf });
      return Produce.run(null, bodyFor({ creationKey: "bookplan000000000018" }), owned).then(function (duplicate) {
        assert.strictEqual(duplicate.duplicate, true);
        assert.strictEqual(owned.draws.length, 0);
        assert.strictEqual(owned.textCalls(), 0);
        assert.strictEqual(shelf.readShelf(account)[0].title, "Already saved");
        assert.strictEqual(shelf.readShelf(account)[0].pages[0].text, "old page");
      });
    });
  });
}).then(function () {
  console.log("book-v2 paid control tests ok");
}).catch(function (error) {
  console.error(error && error.stack || error);
  process.exit(1);
});
