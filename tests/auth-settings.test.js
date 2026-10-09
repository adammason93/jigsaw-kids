"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === "node_modules" || name === ".git") return;
    var full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  });
}

var cloud = read("js/score-cloud.js");
var core = read("js/kids-core.js");
var sw = read("sw.js");

assert.strictEqual(cloud.indexOf("kidsSyncPassword"), -1);
assert.strictEqual(cloud.indexOf("Sign in for cloud sync"), -1);
assert.strictEqual(cloud.indexOf("Pull scores from cloud now"), -1);
assert.strictEqual(cloud.indexOf("Test story library in cloud"), -1);
assert.strictEqual(cloud.indexOf("createClient"), -1);
assert.ok(cloud.indexOf("function pullAndApply") >= 0);
assert.ok(cloud.indexOf("signOut: function") >= 0);
assert.ok(cloud.indexOf("WondiiSession") >= 0);
assert.ok(cloud.indexOf("if (!nested || !Object.keys(nested).length)") >= 0);
assert.ok(cloud.indexOf("merged[key] = remote[key]") >= 0);

assert.strictEqual(core.indexOf("family password"), -1);
assert.ok(core.indexOf("Fun sounds") >= 0);
assert.ok(core.indexOf("High contrast") >= 0);
assert.ok(core.indexOf("Calm screen") >= 0);

var pages = [];
walk(root, pages);
pages.forEach(function (file) {
  var html = fs.readFileSync(file, "utf8");
  if (html.indexOf("score-cloud.js") < 0) return;
  var sessionAt = html.indexOf("wondii-session.js");
  var cloudAt = html.indexOf("score-cloud.js");
  assert.ok(sessionAt >= 0 && sessionAt < cloudAt, path.relative(root, file));
});

["games/noughts-crosses.html", "games/colouring.html", "games/jigsaw.html", "games/memory.html", "games/star-catcher.html"].forEach(function (rel) {
  var html = read(rel);
  assert.ok(html.toLowerCase().indexOf("family password") < 0, rel);
});

assert.ok(sw.indexOf("jigsaw-kids-v456") >= 0);
assert.ok(sw.indexOf('cache: "reload"') >= 0);
assert.ok(sw.indexOf("gamePage") >= 0);

function mergeBundle(remote, local) {
  if (!local || !Object.keys(local).length) return null;
  var merged = {};
  var key;
  if (remote && typeof remote === "object") {
    for (key in remote) {
      if (Object.prototype.hasOwnProperty.call(remote, key)) merged[key] = remote[key];
    }
  }
  for (key in local) {
    if (Object.prototype.hasOwnProperty.call(local, key)) merged[key] = local[key];
  }
  return merged;
}

assert.strictEqual(mergeBundle({ scores: { wins: 4 }, colouring: "pic" }, {}), null);
assert.deepStrictEqual(
  mergeBundle({ scores: { wins: 4 }, colouring: "pic" }, { scores: { wins: 5 } }),
  { scores: { wins: 5 }, colouring: "pic" }
);
assert.deepStrictEqual(mergeBundle(null, { scores: { wins: 1 } }), { scores: { wins: 1 } });

console.log("auth-settings ok");
