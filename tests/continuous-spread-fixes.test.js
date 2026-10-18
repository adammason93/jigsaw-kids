"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var Spread = require("../js/book-spread.js");
var Composition = require("../js/book-composition.js");
var root = path.join(__dirname, "..");

vm.runInThisContext(fs.readFileSync(path.join(root, "games/book-prototype/book-data.js"), "utf8"));
var Data = globalThis.WondiiBookData;

function page(text, id) {
  return {
    pageId: id,
    id: id,
    text: text,
    prose: text,
    layoutIntent: "DOUBLE_PAGE_SPREAD",
    locationId: "harbour",
    locationZone: "water",
    charactersPresent: ["maya"]
  };
}

function quietOf(book) {
  return (book.leaves || []).filter(function (leaf) {
    return leaf.role === "spread-left" || leaf.role === "spread-right";
  }).map(function (leaf) {
    return leaf.quietRegion || "";
  });
}

function bindFresh(pages) {
  var composition = Composition.plan(pages.map(function (item) {
    return { id: item.pageId, text: item.text };
  }), { ageBand: "7-9" });
  var plan = Spread.review(pages, { limit: 1, composition: composition });
  Spread.bindComposition(composition, pages, plan);
  return { composition: composition, plan: plan };
}

var short = [
  page("Maya holds the lantern.", "p1"),
  page("The star glows beside her.", "p2")
];
var prepared = bindFresh(short);
assert.strictEqual(prepared.plan.selected.length, 1);
assert.deepStrictEqual(quietOf(prepared.composition), ["", ""]);

var url = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP";
var trueReport = { textSafeUsable: true, anatomyOk: true };
var pictures = {
  p1: { accepted: true, dataUrl: url, report: trueReport },
  p2: { accepted: true, dataUrl: url, shared: true, report: trueReport }
};

function laterStep(savedPages, stored) {
  var fresh = bindFresh(savedPages);
  assert.deepStrictEqual(quietOf(fresh.composition), ["", ""]);
  var restored = Spread.restoreQuiet(fresh.composition, savedPages, fresh.plan, stored);
  return { composition: fresh.composition, plan: fresh.plan, restored: restored };
}

var step1 = laterStep(short, pictures);
assert.deepStrictEqual(step1.restored, ["lower"]);
assert.deepStrictEqual(quietOf(step1.composition), ["lower", "lower"]);
var step2 = laterStep(short, pictures);
var step3 = laterStep(short, pictures);
assert.deepStrictEqual(quietOf(step2.composition), ["lower", "lower"]);
assert.deepStrictEqual(quietOf(step3.composition), ["lower", "lower"]);
assert.deepStrictEqual(quietOf(step1.composition), quietOf(step3.composition));

[["false", { textSafeUsable: false }], ["null", { textSafeUsable: null }], ["missing", null], ["invalid", { textSafeUsable: "yes" }]].forEach(function (row) {
  var stored = {
    p1: { accepted: true, dataUrl: url, report: row[1] },
    p2: { accepted: true, dataUrl: url, shared: true, report: row[1] }
  };
  if (row[0] === "missing") stored = { p1: { accepted: true, dataUrl: url }, p2: { accepted: true, dataUrl: url, shared: true } };
  var resumed = laterStep(short, stored);
  assert.deepStrictEqual(resumed.restored, [""], row[0]);
  assert.deepStrictEqual(quietOf(resumed.composition), ["", ""], row[0]);
});

var poisoned = JSON.parse(JSON.stringify(prepared.composition));
poisoned.leaves.forEach(function (leaf) {
  if (leaf.role === "spread-left" || leaf.role === "spread-right") leaf.quietRegion = "lower";
});
var ignored = Spread.restoreQuiet(poisoned, short, prepared.plan, {
  p1: { accepted: true, dataUrl: url, report: { textSafeUsable: false } }
});
assert.deepStrictEqual(ignored, [""]);
assert.deepStrictEqual(quietOf(poisoned), ["", ""]);

var longText = "extraordinarily ".repeat(40).trim();
var longPages = [page(longText, "p1"), page(longText, "p2")];
var longBound = bindFresh(short);
var longRegion = Spread.restoreQuiet(longBound.composition, longPages, longBound.plan, pictures);
assert.deepStrictEqual(longRegion, [""]);

var partial = {
  p1: { accepted: true, dataUrl: url, report: trueReport }
};
var interrupted = bindFresh(short);
var copy = Spread.pictureCall(short, interrupted.plan, 1);
assert.strictEqual(copy.copy, true);
assert.strictEqual(copy.draw, false);
assert.strictEqual(copy.size, "1536x1024");
assert.strictEqual(Spread.shareImage(short, copy.pair, partial.p1.dataUrl), true);
partial.p2 = { accepted: true, dataUrl: partial.p1.dataUrl, shared: true, report: partial.p1.report };
interrupted.composition.units.forEach(function (unit) {
  if (unit.unitId === interrupted.composition.beats[0].unitId) unit.imageSrc = partial.p1.dataUrl;
});
assert.deepStrictEqual(Spread.restoreQuiet(interrupted.composition, short, interrupted.plan, partial), ["lower"]);
assert.strictEqual(short[0].imageDataUrl, short[1].imageDataUrl);
assert.strictEqual(short[0].imageDataUrl, url);

var saved = {
  id: "synthetic",
  title: "Synthetic",
  author: "Wondii",
  pages: JSON.parse(JSON.stringify(short)),
  composition: JSON.parse(JSON.stringify(interrupted.composition))
};
var opened = Data.plan(JSON.parse(JSON.stringify(saved)));
var reopened = Data.plan(JSON.parse(JSON.stringify(saved)));
assert.strictEqual(opened.pages[0].leaf.quietRegion, "lower");
assert.strictEqual(opened.pages[1].leaf.quietRegion, "lower");
assert.strictEqual(opened.pages[0].imageSrc, opened.pages[1].imageSrc);
assert.deepStrictEqual(
  opened.pages.map(function (item) { return [item.leaf.quietRegion, item.imageSrc, item.text]; }),
  reopened.pages.map(function (item) { return [item.leaf.quietRegion, item.imageSrc, item.text]; })
);

function view(role, image, quiet) {
  return {
    role: role,
    unitId: "spread-1-2",
    imageWidth: image ? image.width : 0,
    imageHeight: image ? image.height : 0,
    quietRegion: quiet || ""
  };
}
var reader = fs.readFileSync(path.join(root, "games/book-prototype/book.js"), "utf8");
var landscape = { width: 1536, height: 1024 };
var square = { width: 800, height: 800 };
var matched = Composition.spreadOpening(view("spread-left", landscape, "lower"), view("spread-right", landscape, "lower"));
assert.strictEqual(matched.continuous, true);
assert.strictEqual(matched.paperSplit, false);
assert.strictEqual(matched.placement.left, "half");
assert.strictEqual(matched.placement.right, "half");

var mismatched = Composition.spreadOpening(view("spread-left", landscape, "lower"), view("spread-right", square, "lower"));
assert.strictEqual(mismatched.continuous, false);
assert.strictEqual(mismatched.paperSplit, true);

var missingRight = Composition.spreadOpening(view("spread-left", landscape, "lower"), view("spread-right", null, "lower"));
assert.strictEqual(missingRight.continuous, false);
assert.strictEqual(missingRight.paperSplit, true);

var inconsistent = Composition.spreadOpening(view("spread-left", landscape, "lower"), view("spread-right", landscape, ""));
assert.strictEqual(inconsistent.continuous, true);
var quietSource = reader.slice(reader.indexOf("function spreadQuietWhere"), reader.indexOf("function measureSpreadQuiet"));
var spreadQuietWhere = new Function(quietSource + "\nreturn spreadQuietWhere;")();
assert.strictEqual(spreadQuietWhere({ quietRegion: "lower" }), "lower");
assert.strictEqual(spreadQuietWhere({ quietRegion: "" }), "");
assert.notStrictEqual(spreadQuietWhere({ quietRegion: "lower" }), spreadQuietWhere({ quietRegion: "" }));
assert.ok(reader.indexOf("spreadQuietWhere(left.leaf) === spreadQuietWhere(right.leaf)") >= 0);

assert.strictEqual(Composition.spreadLeafPresentation("spread-left", "soft-fallback"), "paper");
assert.strictEqual(Composition.spreadLeafPresentation("spread-right", "missing"), "paper");
assert.strictEqual(Composition.spreadLeafPresentation("spread-left", "planned"), "planned");
assert.strictEqual(Composition.spreadLeafPresentation("integrated", "soft-fallback"), "");
assert.strictEqual(Composition.spreadLeafPresentation("bleed", "planned"), "");

var ordinary = Composition.picturePlacement(
  { role: "bleed", unitId: "u1", imageWidth: 1024, imageHeight: 1536 },
  { role: "text", unitId: "u2", imageWidth: 0, imageHeight: 0 }
);
assert.strictEqual(ordinary.continuous, false);
assert.strictEqual(ordinary.left, "once");
assert.strictEqual(ordinary.right, "text");

assert.strictEqual(reader.indexOf("const OPEN_MS = 1200;"), reader.indexOf("const OPEN_MS"));
assert.ok(reader.indexOf("const OPEN_MS = 1200;") >= 0);
assert.ok(reader.indexOf("const TURN_MS = 880;") >= 0);
assert.ok(reader.indexOf("opening.continuous") >= 0);
assert.ok(reader.indexOf("opening.paperSplit") >= 0);
assert.ok(reader.indexOf('spreadLeafPresentation(role, fit) === "paper"') >= 0);
var spreadBranch = reader.slice(reader.indexOf('if (role === "spread-left" || role === "spread-right")'), reader.indexOf('if (!useSoft && image && (role === "bleed" || role === "integrated")'));
assert.ok(spreadBranch.indexOf("paintOverArt") < 0);
assert.ok(spreadBranch.indexOf("featherPlate") >= 0);
assert.ok(reader.indexOf("paintOverArt") >= 0);

var producer = fs.readFileSync(path.join(root, "scripts/book/produce.candidate.js"), "utf8");
var handler = fs.readFileSync(path.join(root, "supabase/functions/book-v2/handle.mjs"), "utf8");
assert.strictEqual(producer.split("Spread.restoreQuiet").length, 4);
assert.strictEqual(handler.split("Spread.restoreQuiet").length, 4);
assert.ok(handler.indexOf("function restoreQuiet") >= 0);

var reloadedViews = Composition.spreadOpening(
  { role: opened.pages[0].leaf.role, unitId: opened.pages[0].leaf.unitId, imageWidth: 1536, imageHeight: 1024 },
  { role: opened.pages[1].leaf.role, unitId: opened.pages[1].leaf.unitId, imageWidth: 1536, imageHeight: 1024 }
);
assert.strictEqual(reloadedViews.continuous, true);
assert.strictEqual(opened.pages[0].leaf.quietRegion, opened.pages[1].leaf.quietRegion);

console.log("continuous spread fix tests ok");
