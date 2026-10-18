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

var fallbackSource = reader.slice(reader.indexOf("function storyPiece"), reader.indexOf("function paintCompositionBook"));
var spreadFallbackPages = new Function(fallbackSource + "\nreturn spreadFallbackPages;")();
var spreadFallbackCopy = new Function(fallbackSource + "\nreturn spreadFallbackCopy;")();
assert.ok(reader.indexOf("(left && left.text) || (right && right.text)") < 0);
assert.ok(reader.indexOf("spreadFallbackPages(left, right)") >= 0);

function leaf(role) {
  return { role: role, unitId: "spread-1-2", composition: "spread", age: "7-9", mood: "story", discoveries: [] };
}
function side(text, image, role) {
  return { text: text, image: image, leaf: leaf(role) };
}
var wide = { width: 1536, height: 1024 };
var box = { width: 800, height: 800 };
var firstSentence = "Maya holds the lantern.";
var secondSentence = "The star glows beside her.";

function unchanged(pair, painted) {
  assert.strictEqual(pair.left.text, painted.leftText);
  assert.strictEqual(pair.right.text, painted.rightText);
  assert.strictEqual(pair.left.image, painted.leftImage);
  assert.strictEqual(pair.right.image, painted.rightImage);
}

var mismatchedPages = {
  left: side(firstSentence, wide, "spread-left"),
  right: side(secondSentence, box, "spread-right")
};
var mismatchedPaint = spreadFallbackPages(mismatchedPages.left, mismatchedPages.right);
assert.strictEqual(mismatchedPaint.copy, firstSentence + "\n\n" + secondSentence);
assert.strictEqual(mismatchedPaint.pictureSide, "left");
assert.strictEqual(mismatchedPaint.left.text, "");
assert.strictEqual(mismatchedPaint.left.image, wide);
assert.strictEqual(mismatchedPaint.right.text, mismatchedPaint.copy);
assert.strictEqual(mismatchedPaint.right.image, null);
assert.strictEqual(mismatchedPaint.right.leaf.role, "text");
assert.deepStrictEqual(mismatchedPaint.copy.split("\n\n"), [firstSentence, secondSentence]);
unchanged(mismatchedPages, { leftText: firstSentence, rightText: secondSentence, leftImage: wide, rightImage: box });

var missingRightPages = {
  left: side(firstSentence, wide, "spread-left"),
  right: side(secondSentence, null, "spread-right")
};
var missingRightPaint = spreadFallbackPages(missingRightPages.left, missingRightPages.right);
assert.strictEqual(missingRightPaint.copy, firstSentence + "\n\n" + secondSentence);
assert.strictEqual(missingRightPaint.pictureSide, "left");
assert.strictEqual(missingRightPaint.right.image, null);
assert.strictEqual(missingRightPaint.right.text, missingRightPaint.copy);
assert.strictEqual(missingRightPaint.left.image, wide);
assert.strictEqual(missingRightPaint.left.text, "");
unchanged(missingRightPages, { leftText: firstSentence, rightText: secondSentence, leftImage: wide, rightImage: null });

var missingLeftPages = {
  left: side(firstSentence, null, "spread-left"),
  right: side(secondSentence, wide, "spread-right")
};
var missingLeftPaint = spreadFallbackPages(missingLeftPages.left, missingLeftPages.right);
assert.strictEqual(missingLeftPaint.copy, firstSentence + "\n\n" + secondSentence);
assert.strictEqual(missingLeftPaint.pictureSide, "right");
assert.strictEqual(missingLeftPaint.left.image, null);
assert.strictEqual(missingLeftPaint.left.text, missingLeftPaint.copy);
assert.strictEqual(missingLeftPaint.left.leaf.role, "text");
assert.strictEqual(missingLeftPaint.right.image, wide);
assert.strictEqual(missingLeftPaint.right.text, "");
unchanged(missingLeftPages, { leftText: firstSentence, rightText: secondSentence, leftImage: null, rightImage: wide });

var emptyRight = spreadFallbackPages(side(firstSentence, wide, "spread-left"), side("", box, "spread-right"));
assert.strictEqual(emptyRight.copy, firstSentence);
assert.strictEqual(emptyRight.copy.split("\n\n").length, 1);
assert.strictEqual(emptyRight.right.text, firstSentence);
assert.strictEqual(emptyRight.left.text, "");
var emptyLeft = spreadFallbackPages(side("   ", wide, "spread-left"), side(secondSentence, box, "spread-right"));
assert.strictEqual(emptyLeft.copy, secondSentence);
assert.strictEqual(emptyLeft.right.text, secondSentence);

var markedLeft = "Maya holds the lantern!";
var markedRight = "Look — the star glows beside her.";
var marked = spreadFallbackPages(side(markedLeft, wide, "spread-left"), side(markedRight, null, "spread-right"));
assert.strictEqual(marked.copy, markedLeft + "\n\n" + markedRight);
assert.ok(marked.copy.indexOf("!") >= 0);
assert.ok(marked.copy.indexOf("—") >= 0);
assert.deepStrictEqual(marked.copy.split("\n\n"), [markedLeft, markedRight]);

var layoutSource = reader.slice(reader.indexOf("function compositionFace"), reader.indexOf("function paintCompositionText"));
var compositionLayout = new Function(layoutSource + "\nreturn compositionLayout;")();
var pageW = 1200;
var pageH = Math.round(1200 * (1.83 / 1.22));
var measure = {
  canvas: { width: pageW, height: pageH },
  font: "",
  measureText: function (text) {
    var size = 48;
    var found = String(this.font).match(/(\d+(?:\.\d+)?)px/);
    if (found) size = Number(found[1]);
    return { width: String(text).length * size * 0.52 };
  }
};
function paperFit(text) {
  var age = "7-9";
  var size = Composition.typeSize(age, pageW);
  var floor = Math.round(pageW * 0.024);
  var column = Composition.textColumn("right", pageW);
  var safe = Composition.safeRead(pageW, pageH);
  var room = safe.bottom - safe.top;
  var lead = Composition.leading(age);
  var marks = Composition.chooseMarks(text, { age: age, mood: "story", discoveries: [] });
  var layout = compositionLayout(measure, text, column.w, size, lead, marks);
  var guard = 0;
  while (layout.height > room && size > floor && guard < 14) {
    size = Math.max(floor, Math.round(size * 0.9));
    layout = compositionLayout(measure, text, column.w, size, lead, marks);
    guard += 1;
  }
  return { fitted: layout.height <= room + 1, size: size, floor: floor };
}
var nearWords = [];
var near = "";
var nearFit = null;
while (nearWords.length < 400) {
  nearWords.push("lantern");
  var candidate = "Maya holds the lantern, " + nearWords.join(" ") + ".\n\nThe star glows beside her.";
  var candidateFit = paperFit(candidate);
  if (!candidateFit.fitted) break;
  near = candidate;
  nearFit = candidateFit;
}
assert.ok(nearFit && nearFit.fitted);
assert.ok(nearFit.size >= nearFit.floor);
assert.ok(nearFit.size < Composition.typeSize("7-9", pageW));
var nearPaint = spreadFallbackCopy(
  { text: near.split("\n\n")[0] },
  { text: near.split("\n\n")[1] }
);
assert.strictEqual(nearPaint, near);
var over = near + " " + "lantern ".repeat(80).trim();
var overFit = paperFit(over);
assert.strictEqual(overFit.fitted, false);
assert.strictEqual(overFit.size, overFit.floor);
assert.ok(overFit.size >= Math.round(pageW * 0.024));
var copyFn = reader.slice(reader.indexOf("function compositionCopy"), reader.indexOf("function layoutWidth"));
assert.ok(copyFn.indexOf("paintUnfitted") >= 0);
assert.ok(copyFn.indexOf("paintUnfitted") < copyFn.indexOf("paintCompositionText"));
assert.ok(copyFn.indexOf("g.canvas.width * 0.024") >= 0);

function storyBook(sentences) {
  var pages = sentences.map(function (text, index) {
    return { pageId: "p" + (index + 1), text: text, prose: text };
  });
  return {
    id: "synthetic-story",
    title: "Synthetic",
    author: "Wondii",
    generated: true,
    pages: pages,
    composition: Composition.plan(pages.map(function (item) {
      return { id: item.pageId, text: item.text };
    }), { ageBand: "7-9" })
  };
}
var savedSentences = [markedLeft, markedRight];
var savedBook = storyBook(savedSentences);
savedBook.composition.units.forEach(function (unit) { unit.imageSrc = ""; });
savedBook.pages[0].imageUrlFallback = "/fixtures/spread.png";
savedBook.pages[1].imageUrlFallback = "/fixtures/square.png";
var openedBook = Data.plan(JSON.parse(JSON.stringify(savedBook)));
var reopenedBook = Data.plan(JSON.parse(JSON.stringify(savedBook)));
assert.deepStrictEqual(openedBook.pages.map(function (item) { return item.text; }), savedSentences);
assert.deepStrictEqual(reopenedBook.pages.map(function (item) { return item.text; }), savedSentences);
var reopenedPaint = spreadFallbackPages(
  Object.assign({}, openedBook.pages[0], { image: wide }),
  Object.assign({}, openedBook.pages[1], { image: box })
);
assert.strictEqual(reopenedPaint.copy, markedLeft + "\n\n" + markedRight);
assert.deepStrictEqual(openedBook.pages.map(function (item) { return item.text; }), savedSentences);

var twelveSentences = [];
for (var sentenceIndex = 1; sentenceIndex <= 12; sentenceIndex += 1) {
  twelveSentences.push("Sentence " + sentenceIndex + " stays whole.");
}
var twelveBook = storyBook(twelveSentences);
var twelveOpened = Data.plan(JSON.parse(JSON.stringify(twelveBook)));
var twelveReopened = Data.plan(JSON.parse(JSON.stringify(twelveBook)));
assert.deepStrictEqual(twelveOpened.pages.map(function (item) { return item.text; }), twelveSentences);
assert.deepStrictEqual(twelveReopened.pages.map(function (item) { return item.text; }), twelveSentences);
assert.strictEqual(twelveOpened.pages.length, 12);

console.log("continuous spread fix tests ok");
