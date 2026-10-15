"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var Art = require(path.join(root, "js/book-art-direction.js"));
var Visual = require(path.join(root, "js/book-visual.js"));

var showcase = JSON.parse(fs.readFileSync(path.join(root, "games/showcase/the-rain-that-rose.json"), "utf8"));
var story = JSON.parse(fs.readFileSync(path.join(root, "docs/agent/book-v2/the-rain-that-rose-candidate/book.json"), "utf8"));
var saved = JSON.parse(fs.readFileSync(path.join(root, "games/showcase/the-rain-that-rose.art.json"), "utf8"));
var record = Art.attachPlan(showcase, story);
var art = Art.directBook(record);

assert.strictEqual(art.schema, "wondii-art-direction/2");
assert.deepStrictEqual(art, saved);
assert.strictEqual(art.identity.personality, "magical-adventure");
assert.strictEqual(art.identity.ageBand, "7-9");
assert.deepStrictEqual(art.pages.map(function (page) { return page.layout; }), [
  "full-bleed", "half", "cinematic", "quiet", "cinematic", "text-led",
  "action", "full-bleed", "cinematic", "half", "action", "ending"
]);
assert.strictEqual(art.pages[9].placement, "below");
assert.strictEqual(art.pages[9].readingOrder[0], "story");
assert.strictEqual(art.pages[1].placement, "top");
assert.notStrictEqual(art.pages[10].layout, "spread");
assert.notStrictEqual(art.pages[11].layout, "spread");
assert.ok(art.artworkRequests.every(function (item) { return item.replaces === false && item.supplements === true; }));
assert.ok(art.artworkRequests.some(function (item) {
  return item.required === true && item.aspect === "2:1" && item.pages[0] === 9 && item.pages[1] === 10;
}));
assert.strictEqual(art.artworkCost.requiredUsd, 0.041129);
assert.ok(art.artworkCost.withSupplementsUsd > art.artworkCost.requiredUsd);
assert.ok(art.spreads.some(function (spread) { return spread.relationship === "asymmetric"; }));
assert.ok(art.spreads.some(function (spread) { return spread.relationship === "quiet"; }));
assert.ok(art.spreads.every(function (spread) { return spread.continuous === false; }));
assert.ok(art.limitations.some(function (line) { return /separate scene/.test(line); }));
assert.ok(art.limitations.some(function (line) { return /transparent artwork/.test(line); }));

var joined = art.pages.map(function (page) {
  return (page.treatments || []).map(function (mark) { return mark.kind + ":" + mark.text; }).join("|");
}).join("\n");
assert.ok(joined.indexOf("whisper:\"It's dry in there,\"") >= 0);
assert.ok(joined.indexOf("spoken:\"Our steps!\"") >= 0);
assert.ok(joined.indexOf("magic:\"The way up is in the water,\"") >= 0);
assert.ok(joined.indexOf("motion:It dipped.") >= 0);
assert.ok(joined.indexOf("dialogue:\"Now you,\"") >= 0);
assert.ok(joined.indexOf("quiet:Drops slipped from Maya's sleeve and fell.") >= 0);
assert.ok(!/\b(SPLASH|BOOM|CRASH|WHOOSH|POP)!/.test(joined));
showcase.pages.forEach(function (page, index) {
  assert.strictEqual(page.text, story.pages[index].prose);
  (art.pages[index].treatments || []).forEach(function (mark) {
    assert.ok(page.text.indexOf(mark.text) >= 0, mark.text);
  });
});

var report = Art.checkBook(record, art);
assert.deepStrictEqual(report.issues, []);

var wide = { layout: "spread", continuous: true, half: "left", crop: { maxSide: 0.08 }, textAlign: "left" };
var left = Art.compose(wide, 1200, 1800, 3072, 1024, "left", 240);
var right = Art.compose(Object.assign({}, wide, { half: "right" }), 1200, 1800, 3072, 1024, "right", 240);
assert.ok(Math.abs((left.image.sx + left.image.sw) - right.image.sx) < 1.5);
assert.strictEqual(left.image.y, right.image.y);
assert.strictEqual(left.image.h, right.image.h);
assert.ok(left.text.x + left.text.w <= 1200 - left.gutter + 2);
assert.ok(right.text.x >= right.gutter - 2);
assert.ok(Math.abs(left.image.w / left.image.h - left.image.sw / left.image.sh) < 0.04);

var portrait = Art.compose({ layout: "two-thirds", crop: { maxSide: 0.16 } }, 1200, 1800, 1024, 1536, "left", 0);
var landscape = Art.compose({ layout: "two-thirds", crop: { maxSide: 0.16 } }, 1200, 1800, 1536, 1024, "right", 0);
assert.ok(portrait.fraction > 0.55, portrait.fraction);
assert.ok(portrait.image.crop < 0.02);
assert.ok(landscape.cropLimited);
assert.ok(landscape.image.crop <= 0.1601);

var small = Art.compose(art.pages[3], 600, 900, 1536, 1024, "right", 0);
var large = Art.compose(art.pages[3], 1200, 1800, 1536, 1024, "right", 0);
assert.ok(Math.abs(small.image.x / 600 - large.image.x / 1200) < 0.03);

var shared = Art.directBook({
  id: "wide-lake",
  tone: "adventure",
  pages: [
    { text: "The lake opened.", image: "/lake.jpg", layoutIntent: "DOUBLE_PAGE_SPREAD", phase: "CLIMAX", shot: "action" },
    { text: "They crossed it.", image: "/lake.jpg", layoutIntent: "DOUBLE_PAGE_SPREAD", phase: "CLIMAX", shot: "action" }
  ]
});
assert.deepStrictEqual(shared.pages.map(function (page) { return page.layout; }), ["spread", "spread"]);
assert.strictEqual(shared.pages[0].half, "left");
assert.strictEqual(shared.pages[1].half, "right");
assert.strictEqual(shared.spreads[0].continuous, true);
var separate = Art.directBook({
  pages: [
    { text: "One shore.", image: "/a.jpg", layoutIntent: "DOUBLE_PAGE_SPREAD", phase: "CLIMAX", shot: "action" },
    { text: "Another shore.", image: "/b.jpg", layoutIntent: "DOUBLE_PAGE_SPREAD", phase: "CLIMAX", shot: "action" }
  ]
});
assert.ok(separate.pages.every(function (page) { return page.layout !== "spread"; }));

var sound = Art.directBook({
  tone: "funny",
  pages: [
    { text: "The pot went POP! Maya laughed and laughed and laughed.", phase: "SETUP", shot: "action" },
    { text: "Then it was quiet.", phase: "RESOLUTION", shot: "vignette" }
  ]
});
assert.ok(sound.pages[0].treatments.some(function (mark) { return mark.kind === "impact" && mark.text === "POP!"; }));
assert.strictEqual(sound.identity.personality, "funny");
var plain = Art.directBook({ tone: "adventure", pages: [{ text: "The rain fell softly.", phase: "SETUP", shot: "establishing" }] });
assert.ok(plain.pages[0].treatments.every(function (mark) { return mark.kind !== "impact"; }));
var lesson = Art.directBook({
  tone: "educational",
  pages: [{ text: "The pot went POP! because the air expanded.", phase: "SETUP", shot: "medium" }]
});
assert.ok(lesson.pages[0].treatments.every(function (mark) { return mark.kind !== "impact"; }));
var night = Art.directBook({
  tone: "bedtime",
  pages: [{ text: "\"Look!\" she whispered, and the room stayed still.", phase: "RESOLUTION", shot: "vignette" }]
});
assert.strictEqual(night.identity.personality, "bedtime");
assert.ok(night.pages[0].treatments.every(function (mark) { return mark.kind !== "spoken" && mark.kind !== "impact" && mark.kind !== "motion"; }));
var nap = Art.directBook({
  tone: "bedtime",
  pages: [
    { text: "It dipped. Then she slept.", phase: "ATTEMPT", shot: "action" },
    { text: "Goodnight.", phase: "RESOLUTION", shot: "vignette" }
  ]
});
assert.ok(nap.pages[0].treatments.every(function (mark) { return mark.kind !== "motion" && mark.text !== "It dipped."; }));

var noted = Visual.spreadPrompt({ locations: [], entities: [] }, { storyEvent: "A leaf boat.", compositionNote: art.pages[0].promptNote }, []);
var bare = Visual.spreadPrompt({ locations: [], entities: [] }, { storyEvent: "A leaf boat." }, []);
assert.ok(noted.indexOf("outer edge") >= 0);
assert.ok(bare.indexOf("Layout for this picture") < 0);

var candidatePath = path.join(root, "docs/agent/book-v2/the-rain-that-rose-candidate/book.json");
var showcasePath = path.join(root, "games/showcase/the-rain-that-rose.json");
assert.ok(fs.readFileSync(candidatePath, "utf8").indexOf("\"prose\"") >= 0);
assert.ok(fs.readFileSync(showcasePath, "utf8").indexOf("the-rain-that-rose.art.json") < 0);

var reader = fs.readFileSync(path.join(root, "games/book-prototype/book.js"), "utf8");
assert.ok(reader.indexOf("const TURN_MS = 880;") !== -1);
assert.ok(reader.indexOf("const OPEN_MS = 1200;") !== -1);
assert.ok(reader.indexOf("const PAGE_W = 1.22;") !== -1);
assert.ok(reader.indexOf("const PAGE_H = 1.83;") !== -1);
assert.ok(reader.indexOf("const SHEETS = 16;") !== -1);
assert.ok(reader.indexOf("lead: { value: 0.62 }") !== -1);
assert.ok(reader.indexOf("bow: { value: 0.012 }") !== -1);
assert.ok(reader.indexOf("spinY += 0.22 * dt;") !== -1);
assert.ok(reader.indexOf("const OPEN_COVER = -Math.PI;") !== -1);
assert.ok(reader.indexOf("function bendMaterial") !== -1);
assert.ok(reader.indexOf("choosePageLayouts(pages)") !== -1);
assert.ok(reader.indexOf("drawDirectedPage") !== -1);
assert.ok(reader.indexOf("page.direction && page.direction.layout") !== -1);
assert.ok(reader.indexOf("kind === \"motion\"") !== -1);
assert.ok(reader.indexOf("chip") < 0);
var loader = fs.readFileSync(path.join(root, "games/book-prototype/book-data.js"), "utf8");
assert.ok(loader.indexOf("wondii-art-direction/1") !== -1);
assert.ok(loader.indexOf("wondii-art-direction/2") !== -1);

console.log("art direction checks ok");
