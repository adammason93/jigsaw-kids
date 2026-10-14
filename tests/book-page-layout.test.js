"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "../games/book-prototype/page-layout.js"), "utf8");
var api = new Function(source.replace(/^export /gm, "") + "\nreturn { coverCanvasSize: coverCanvasSize, spineCanvasSize: spineCanvasSize, coverLayout: coverLayout, imageCrop: imageCrop, pageImageBand: pageImageBand, choosePageLayouts: choosePageLayouts, pageComposition: pageComposition };")();

var planeW = 1.32 - 0.045;
var planeH = 1.96 - 0.045;
var canvas = api.coverCanvasSize(planeW, planeH, 1600);
assert.ok(Math.abs(canvas.width / canvas.height - planeW / planeH) < 0.002);

var cover = api.coverLayout(canvas.width, canvas.height, 1536, 1024);
var drawnAspect = cover.art.w / cover.art.h;
var sourceAspect = cover.source.sw / cover.source.sh;
assert.ok(Math.abs(drawnAspect - sourceAspect) < 0.01, drawnAspect + " vs " + sourceAspect);
assert.ok(cover.source.sx >= 0 && cover.source.sy >= 0);
assert.ok(cover.source.sx + cover.source.sw <= 1536 + 0.5);
assert.ok(cover.source.sy + cover.source.sh <= 1024 + 0.5);
assert.ok((1536 - cover.source.sw) / 1536 <= 0.17);
assert.ok(cover.title.h > canvas.height * 0.2);
assert.ok(cover.art.h > canvas.height * 0.45);

var spinePlaneW = 0.352 - 0.1;
var spinePlaneH = 1.96 - 0.42;
var spine = api.spineCanvasSize(spinePlaneW, spinePlaneH, 1800);
assert.ok(Math.abs(spine.width / spine.height - spinePlaneW / spinePlaneH) < 0.002);

var shortText = api.pageImageBand(1200, 1800, 1536, 1024, 280);
var longText = api.pageImageBand(1200, 1800, 1536, 1024, 820);
assert.ok(shortText.band > shortText.natural, shortText.band + " should grow past " + shortText.natural);
assert.ok(longText.band < shortText.band);
assert.ok(shortText.band + 280 + shortText.gap + shortText.folio <= 1800);
assert.ok(longText.band + 820 + longText.gap + longText.folio <= 1800 + 1);
var crop = api.imageCrop(1200, shortText.band, 1536, 1024, 0.5, 0.4);
assert.ok(Math.abs((1200 / shortText.band) - (crop.sw / crop.sh)) < 0.02);

var reader = fs.readFileSync(path.join(__dirname, "../games/book-prototype/book.js"), "utf8");
assert.ok(reader.indexOf("const TURN_MS = 880;") !== -1);
assert.ok(reader.indexOf("lead: { value: 0.62 }") !== -1);
assert.ok(reader.indexOf("bow: { value: 0.012 }") !== -1);
assert.ok(reader.indexOf("const OPEN_COVER = -Math.PI;") !== -1);
assert.ok(reader.indexOf("const OPEN_MS = 1200;") !== -1);
assert.ok(reader.indexOf("const PAGE_W = 1.22;") !== -1);
assert.ok(reader.indexOf("const PAGE_H = 1.83;") !== -1);
assert.ok(reader.indexOf("spinY += 0.22 * dt;") !== -1);
assert.ok(reader.indexOf("function bendMaterial") !== -1);
assert.ok(reader.indexOf("choosePageLayouts(pages)") !== -1);

var rain = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/agent/book-v2/the-rain-that-rose-candidate/book.json"), "utf8"));
var rainPages = rain.pages.map(function (page) {
  return { text: page.prose, shot: page.shotType, phase: page.narrativePhase, layoutIntent: page.layoutIntent };
});
var layouts = api.choosePageLayouts(rainPages);
assert.deepStrictEqual(layouts, ["full", "above", "beside", "text", "large", "above", "large", "above", "spread", "spread", "large", "ending"]);
var run = 1;
layouts.forEach(function (layout, index) {
  if (index && layout === layouts[index - 1] && layout !== "spread") run += 1;
  else run = 1;
  assert.ok(run < 3, layout + " repeats at page " + (index + 1));
});
var plain = api.choosePageLayouts([{}, {}, {}, {}]);
assert.deepStrictEqual(plain, ["full", "above", "above", "ending"]);

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
var spreadLeft = null;
var spreadRight = null;
layouts.forEach(function (layout, index) {
  var side = index % 2 ? "right" : "left";
  var frame = api.pageComposition(layout, 1200, 1800, 1536, 1024, side, 420);
  var picture = frame.image;
  var copy = frame.text;
  assert.ok(picture.x >= 0 && picture.y >= 0, layout);
  assert.ok(picture.x + picture.w <= 1200 + 1, layout);
  assert.ok(picture.y + picture.h <= 1800, layout);
  assert.ok(Math.abs(picture.w / picture.h - 1536 / 1024) < 0.03, layout + " aspect " + (picture.w / picture.h));
  assert.ok(copy.h > 80, layout + " text room");
  if (layout === "beside") {
    assert.ok(!overlaps(picture, copy), "beside overlap");
    if (side === "left") assert.ok(picture.x < copy.x, "picture stays on the outer side");
    if (side === "right") assert.ok(copy.x < picture.x, "words stay toward the gutter");
  } else {
    assert.ok(copy.y >= picture.y + picture.h - 1, layout + " text covers the picture");
  }
  if (layout === "spread" && side === "left") spreadLeft = frame;
  if (layout === "spread" && side === "right") spreadRight = frame;
});
assert.strictEqual(spreadLeft.image.y, spreadRight.image.y);
assert.strictEqual(spreadLeft.image.h, spreadRight.image.h);
assert.ok(spreadLeft.image.x + spreadLeft.image.w <= 1200 - 100);
assert.ok(spreadRight.image.x >= 100);
var full = api.pageComposition("full", 1200, 1800, 1536, 1024, "left", 420);
var ending = api.pageComposition("ending", 1200, 1800, 1536, 1024, "right", 420);
assert.ok(ending.image.w < full.image.w);
assert.strictEqual(ending.align, "center");
assert.ok(reader.indexOf("coverCanvasSize(COVER_W - 0.045, COVER_H - 0.045, 1600)") !== -1);
assert.ok(reader.indexOf("anchor: \"start\"") !== -1);
assert.ok(reader.indexOf("The End") !== -1);
assert.ok(reader.indexOf("We hope you loved this little adventure.") !== -1);
assert.ok(reader.indexOf("Until the next story...") !== -1);
assert.ok(reader.indexOf("[\"The end.\"]") === -1);

console.log("page layout checks ok");
