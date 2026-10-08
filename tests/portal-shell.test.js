"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Shell = require("../js/portal-shell.js");
var Lib = require("../js/character-library.js");
var Bible = require("../js/character-bible.js");

var school = { id: "school-1", name: "Ramsden Primary" };

assert.strictEqual(Shell.shellFor({ auth: "unknown", elapsedMs: 8001 }), "loading");
assert.strictEqual(Shell.shellFor({ auth: "signed-in", status: "loading", elapsedMs: 8001 }), "loading");
assert.strictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "loading",
  organisation: school,
  role: "teacher",
  elapsedMs: 8001
}), "loading", "a slow school lookup must not fall through to either dashboard");

assert.strictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "ready",
  organisation: school,
  role: "teacher"
}), "school");
assert.notStrictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "ready",
  organisation: school,
  role: "teacher"
}), "personal");

assert.strictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "ready",
  organisation: null,
  role: null
}), "personal");
assert.strictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "ready",
  organisation: null,
  role: "pupil"
}), "personal");

assert.strictEqual(Shell.shellFor({
  auth: "signed-out",
  status: "ready",
  organisation: school,
  role: "teacher"
}), "personal", "logout must not keep a stale school shell");

assert.deepStrictEqual(Shell.SCHOOL_NAV, ["home", "classes", "create", "library", "characters", "results"]);
assert.strictEqual(Shell.routeFromHash(""), "home");
assert.strictEqual(Shell.routeFromHash("#characters"), "characters");
assert.strictEqual(Shell.routeFromHash("#characters/maya"), "characters");
assert.strictEqual(Shell.routeFromHash("#classes"), "classes");
assert.strictEqual(Shell.routeFromHash("#stories"), "");
assert.strictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "ready",
  organisation: school,
  role: "teacher",
  hash: "#characters/maya"
}), "school");

var entries = Lib.availableCharacters({ bible: Bible });
var saved = {
  id: "clay-1",
  name: "Pip",
  source: "saved",
  eligibleForBooks: false,
  artwork: ""
};
var classroom = {
  id: "pupil-1",
  name: "Amelia",
  source: "classroom",
  eligibleForBooks: false
};
var cast = Shell.homeCast(entries.concat([saved, classroom]));
assert.deepStrictEqual(cast.map(function (entry) { return entry.id; }).slice(0, 4), ["maya", "leo", "ravi", "mina"]);
assert.strictEqual(cast[cast.length - 1], saved);
assert.strictEqual(saved.eligibleForBooks, false);
assert.ok(!cast.some(function (entry) { return entry.source === "classroom"; }));
assert.ok(cast.every(function (entry) {
  return entries.indexOf(entry) >= 0 || entry === saved;
}));

var portal = fs.readFileSync(path.join(__dirname, "../portal.html"), "utf8");
var org = fs.readFileSync(path.join(__dirname, "../js/organisation.js"), "utf8");
var home = fs.readFileSync(path.join(__dirname, "../schools/learn/home.js"), "utf8");
var shellCss = fs.readFileSync(path.join(__dirname, "../schools/learn/teacher-shell.css"), "utf8");

assert.strictEqual(portal.indexOf('remove("org-pending")'), -1);
assert.ok(portal.indexOf("org-pending") >= 0);
assert.ok(portal.indexOf("Still opening your Wondii") >= 0);

function teacherLabels(html, id) {
  var start = html.indexOf('id="' + id + '"');
  var end = html.indexOf("</nav>", start);
  var block = html.slice(start, end);
  var found = [];
  var re = /data-teacher="([^"]+)"/g;
  var match;
  while ((match = re.exec(block))) found.push(match[1]);
  return found;
}

var sideStart = portal.indexOf('<aside class="p-side"');
var sideEnd = portal.indexOf("p-side__nav--low");
var sideLabels = [];
var sideRe = /data-teacher="([^"]+)"/g;
var sideMatch;
var side = portal.slice(sideStart, sideEnd);
while ((sideMatch = sideRe.exec(side))) sideLabels.push(sideMatch[1]);
assert.deepStrictEqual(sideLabels, ["home", "characters", "classes", "create", "library", "results"]);
assert.deepStrictEqual(teacherLabels(portal, "teacherNav"), ["classes", "create", "library", "results"]);
assert.deepStrictEqual(teacherLabels(portal, "teacherTabs"), ["classes", "create", "library", "results"]);
assert.ok(portal.indexOf('aria-label="School"') >= 0);
assert.strictEqual(portal.slice(portal.indexOf('id="teacherTabs"'), portal.indexOf("</nav>", portal.indexOf('id="teacherTabs"'))).indexOf("More"), -1);
assert.ok(side.indexOf(">Characters<") >= 0);
assert.ok(portal.indexOf('id="wondiiHome"') >= 0);
assert.strictEqual(teacherLabels(portal, "teacherTabs").indexOf("characters"), -1);

var reveal = org.slice(org.indexOf("function revealResolved"), org.indexOf("function withClient"));
assert.ok(reveal.indexOf('state.status = "ready"') !== -1);
assert.ok(reveal.indexOf('state.status = "ready"') < reveal.indexOf("paint()"));
assert.ok(reveal.indexOf("paint()") < reveal.indexOf("finishBoot()"));
assert.ok(org.indexOf("generation !== bootGeneration") >= 0);
var signedOut = org.indexOf('event === "SIGNED_OUT"');
var signedOutBody = org.slice(signedOut, signedOut + 280);
assert.ok(signedOutBody.indexOf("bootGeneration += 1") !== -1);
assert.ok(signedOutBody.indexOf("clearOrg()") < signedOutBody.indexOf("revealResolved()"));

assert.ok(home.indexOf('view.status === "loading"') >= 0);
assert.ok(home.indexOf("availableCharacters") >= 0);
assert.ok(home.indexOf("homeCast") >= 0);
assert.ok(home.indexOf("View all characters") >= 0);
assert.ok(home.indexOf("Add a character") >= 0);
assert.ok(home.indexOf("#characters") >= 0);
assert.strictEqual(home.indexOf("characters.html"), -1);
assert.strictEqual(home.indexOf("eligibleForBooks"), -1);
assert.ok(home.indexOf("maya-v1") < 0);
assert.ok(shellCss.indexOf("a[data-teacher]:focus-visible") >= 0);
assert.ok(shellCss.indexOf(".teacher-tabs:not([hidden])") >= 0);
assert.ok(shellCss.indexOf("grid-template-columns: repeat(4, 1fr)") >= 0);
assert.strictEqual(shellCss.indexOf(".p-side__family"), -1);
assert.strictEqual(portal.indexOf('classList.remove("org-pending")'), -1);
assert.ok(portal.indexOf(">My World<") >= 0);
assert.ok(portal.indexOf(">School Management<") >= 0);
assert.strictEqual(portal.indexOf("characters.html"), -1);
assert.strictEqual(portal.indexOf('class="p-hello"'), -1);

console.log("portal-shell tests ok");
