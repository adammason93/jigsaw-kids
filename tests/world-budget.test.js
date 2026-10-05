"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ORG = "c90e0da5-3ba7-4c25-9e78-9519ffbc6f39";
var SLOTS = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];

var store = {};
global.localStorage = {
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem: function (key, value) { store[key] = String(value); },
  removeItem: function (key) { delete store[key]; }
};

function element() {
  return {
    innerHTML: "",
    value: "",
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    focus: function () {},
    setAttribute: function () {},
    getAttribute: function () { return null; }
  };
}

var root = element();
global.document = {
  getElementById: function (id) { return id === "learnMain" ? root : null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  createElement: function () { return {}; },
  head: { appendChild: function () {} }
};
global.location = { search: "", href: "" };
global.addEventListener = function () {};
global.window = global;
global.__wondiiAccountReady = true;
global.WondiiOrg = {
  get: function () { return { organisationId: ORG, status: "ready" }; }
};

require("../schools/learn/creator-core.js");
require("../schools/learn/mechanic-core.js");
require("../schools/learn/model.js");
require("../js/visual-adventure.js");
require("../schools/learn/visual-client.js");

var authOpen = true;
var releaseAuth = null;
var failRecap = false;
var hangTeach = false;
var releaseTeach = null;
global.KidsScoreCloud = {
  getSession: function (cb) {
    if (!authOpen) {
      releaseAuth = cb;
      return;
    }
    cb({ access_token: "token" });
  }
};
function picture(id, status) {
  if (status === "failed") return { id: id, status: "failed", fallback: true, publicUrl: "", failure: "provider" };
  return {
    id: id,
    status: "ready",
    fallback: false,
    publicUrl: "https://cdn.example/" + id + ".jpg",
    storagePath: "org/" + id + ".jpg",
    usedByScenes: [id]
  };
}
global.fetch = function (_url, options) {
  var id = JSON.parse(options.body).assetId;
  if (hangTeach && id === "teach") {
    return new Promise(function (resolve) { releaseTeach = resolve; });
  }
  var asset = failRecap && id === "recap" ? picture(id, "failed") : picture(id, "ready");
  return Promise.resolve({
    json: function () { return Promise.resolve({ ok: true, asset: asset }); }
  });
};
AbortSignal.timeout = function () { return { aborted: false }; };

var timers = [];
var timerSeq = 0;
var clock = 0;
global.setTimeout = function (fn, ms) {
  var id = ++timerSeq;
  timers.push({ id: id, fn: fn, at: clock + Number(ms || 0) });
  return id;
};
global.clearTimeout = function (id) {
  timers = timers.filter(function (item) { return item.id !== id; });
};
function tick(ms) {
  clock += ms;
  var due = timers.filter(function (item) { return item.at <= clock; });
  due.sort(function (a, b) { return a.at - b.at; });
  var dueIds = {};
  due.forEach(function (item) { dueIds[item.id] = true; });
  timers = timers.filter(function (item) { return !dueIds[item.id]; });
  due.forEach(function (item) { item.fn(); });
}

function flush() {
  var steps = 40;
  function once() {
    if (steps-- <= 0) return Promise.resolve();
    return new Promise(function (resolve) { setImmediate(resolve); }).then(once);
  }
  return once();
}

function lessonDraft() {
  var draft = global.WondiiCreatorCore.blankDraft();
  draft.title = "Storm lesson";
  draft.topic = "lightning";
  draft.subject = "Science";
  draft.year = "Year 4";
  draft.activities = SLOTS.map(function (id) {
    return {
      id: id,
      slotId: id,
      mechanic: "story",
      title: id + " scene",
      minutes: 3,
      config: { lines: ["The class looks at " + id + "."] }
    };
  });
  return draft;
}

function assetById(draft, id) {
  return (draft.visualAssets || []).filter(function (item) { return item.id === id; })[0];
}

global.__WONDII_CREATOR_TEST = {};
var source = fs.readFileSync(path.join(__dirname, "../schools/learn/creator.js"), "utf8");
var hooked = source.replace(
  "  openBuilder();\n})();",
  "  if (globalThis.__WONDII_CREATOR_TEST) {\n" +
  "    globalThis.__WONDII_CREATOR_TEST.createWorld = createWorld;\n" +
  "    globalThis.__WONDII_CREATOR_TEST.readDraft = function () { return draft; };\n" +
  "    globalThis.__WONDII_CREATOR_TEST.setDraft = function (value) { draft = value; };\n" +
  "  }\n" +
  "  openBuilder();\n})();"
);
assert.notStrictEqual(hooked, source);
vm.runInThisContext(hooked, { filename: "creator.js" });
var hooks = global.__WONDII_CREATOR_TEST;
assert.strictEqual(typeof hooks.createWorld, "function");

hooks.setDraft(lessonDraft());
hooks.createWorld(0);

flush().then(function () {
  var draft = hooks.readDraft();
  assert.ok(root.innerHTML.indexOf("Your adventure") !== -1, "ready pictures leave the creating screen immediately");
  assert.strictEqual(root.innerHTML.indexOf("Wondii is preparing the adventure"), -1);
  assert.strictEqual(draft.visualTiming.budgetHit, false);
  assert.strictEqual(draft.visualAssets.length, 7);
  SLOTS.forEach(function (id) {
    var asset = assetById(draft, id);
    assert.ok(asset, id);
    assert.strictEqual(asset.status, "ready");
    assert.strictEqual(asset.failure, undefined);
    assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: id }).fallback, false);
  });
  var before = draft.visualAssets.length;
  tick(90000);
  assert.strictEqual(hooks.readDraft().visualAssets.length, before);
  assert.strictEqual(hooks.readDraft().visualTiming.budgetHit, false);

  authOpen = false;
  releaseAuth = null;
  failRecap = true;
  hooks.setDraft(lessonDraft());
  hooks.createWorld(0);
  assert.ok(root.innerHTML.indexOf("Wondii is preparing the adventure") !== -1, "a hung auth check keeps the creating screen");
  tick(89999);
  assert.ok(root.innerHTML.indexOf("Wondii is preparing the adventure") !== -1, "89.999s is still inside the budget");
  tick(1);
  draft = hooks.readDraft();
  assert.ok(root.innerHTML.indexOf("Your adventure") !== -1, "90s moves the teacher on to activities");
  assert.strictEqual(root.innerHTML.indexOf("Wondii is preparing the adventure"), -1);
  assert.strictEqual(draft.visualTiming.budgetHit, true);
  assert.strictEqual(draft.visualAssets.length, 7);
  SLOTS.forEach(function (id) {
    var asset = assetById(draft, id);
    assert.strictEqual(asset.status, "failed");
    assert.strictEqual(asset.fallback, true);
    assert.strictEqual(asset.failure, "world_budget");
    assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: id }).fallback, true);
    assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: id }).url, "");
  });
  assert.strictEqual(assetById(draft, "characters"), undefined);

  root.innerHTML += "<!--teacher-editing-->";
  authOpen = true;
  assert.strictEqual(typeof releaseAuth, "function");
  releaseAuth({ access_token: "token" });
  return flush();
}).then(function () {
  var draft = hooks.readDraft();
  assert.ok(root.innerHTML.indexOf("<!--teacher-editing-->") !== -1, "late picture requests leave the activities screen alone");
  assert.ok(root.innerHTML.indexOf("Your adventure") !== -1);
  SLOTS.forEach(function (id) {
    var asset = assetById(draft, id);
    if (id === "recap") {
      assert.strictEqual(asset.failure, "world_budget");
      assert.strictEqual(asset.status, "failed");
      assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: id }).fallback, true);
      return;
    }
    assert.strictEqual(asset.status, "ready");
    assert.strictEqual(asset.publicUrl, "https://cdn.example/" + id + ".jpg");
    var shown = global.WondiiVisuals.forSlide({ visualAssetId: id });
    assert.strictEqual(shown.fallback, false);
    assert.strictEqual(shown.url, asset.publicUrl);
  });
  var saved = JSON.parse(localStorage.getItem("wondii-creator-draft-v2"));
  assert.strictEqual(saved.id, draft.id);
  var savedTeach = saved.visualAssets.filter(function (item) { return item.id === "teach"; })[0];
  assert.strictEqual(savedTeach.publicUrl, "https://cdn.example/teach.jpg");
  var savedRecap = saved.visualAssets.filter(function (item) { return item.id === "recap"; })[0];
  assert.strictEqual(savedRecap.failure, "world_budget");

  authOpen = true;
  failRecap = false;
  hangTeach = true;
  releaseTeach = null;
  hooks.setDraft(lessonDraft());
  hooks.createWorld(0);
  return flush();
}).then(function () {
  assert.ok(root.innerHTML.indexOf("Wondii is preparing the adventure") !== -1, "one hung picture keeps the creating screen");
  tick(89999);
  assert.ok(root.innerHTML.indexOf("Wondii is preparing the adventure") !== -1);
  tick(1);
  var draft = hooks.readDraft();
  assert.ok(root.innerHTML.indexOf("Your adventure") !== -1, "a single hung picture does not hold the teacher past 90s");
  assert.strictEqual(draft.visualTiming.budgetHit, true);
  assert.strictEqual(assetById(draft, "hook").publicUrl, "https://cdn.example/hook.jpg");
  assert.strictEqual(assetById(draft, "teach").failure, "world_budget");
  assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: "teach" }).fallback, true);
  assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: "hook" }).fallback, false);
  releaseTeach({
    json: function () { return Promise.resolve({ ok: true, asset: picture("teach", "ready") }); }
  });
  return flush();
}).then(function () {
  var draft = hooks.readDraft();
  assert.strictEqual(assetById(draft, "teach").publicUrl, "https://cdn.example/teach.jpg");
  assert.strictEqual(assetById(draft, "hook").publicUrl, "https://cdn.example/hook.jpg");
  assert.strictEqual(global.WondiiVisuals.forSlide({ visualAssetId: "teach" }).fallback, false);
  var saved = JSON.parse(localStorage.getItem("wondii-creator-draft-v2"));
  assert.strictEqual(saved.visualAssets.filter(function (item) { return item.id === "teach"; })[0].publicUrl, "https://cdn.example/teach.jpg");
  console.log("world-budget.test.js ok");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
