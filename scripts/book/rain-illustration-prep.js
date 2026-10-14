"use strict";

/* Confirms illustration plans for The Rain That Rose.
   Does not call a model, draw a picture, or change the story text. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var ROOT = path.join(__dirname, "..", "..");
var BOOK = path.join(ROOT, "docs/agent/book-v2/the-rain-that-rose-candidate");
var PLANS = path.join(BOOK, "plans");
var CONFIRMED = path.join(BOOK, "plans-confirmed");

var MEASURED_PAGE_USD = 0.037646;
var VISION_USD = 0.001425;
var GBP = 0.754;
var PAGES = 12;
var IMAGE_CAP = 24;
var VISION_CAP = 24;

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function money(usd) {
  return { usd: Math.round(usd * 1000000) / 1000000, gbp: Math.round(usd * GBP * 1000) / 1000 };
}

var corrections = {
  p1: "Maya reaches toward the dry gap. Leo tests the rock with one foot. Do not draw them standing side by side, facing the viewer.",
  p2: "Draw only this instant: inside the blue passage, Maya and Leo look out through a high opening. Beads of water climb the sunlit wall. Below the opening, pale stepping stones lead down toward enormous floating leaves. Do not draw the waterfall curtain or the small copper leaf.",
  p3: "This is an open lake, not a room. Move close on Maya pressing one curled green rim while water settles in that leaf's central pool. Other giant leaves tower beyond it. Leo watches.",
  p4: "Draw only this instant: Maya's wet hand is in a stripe of sunlight and droplets rise from her fingers. Beside that stripe, in shade, droplets fall. Leo leans closer to look. He does not copy her gesture. Water rises only in sunlight and falls only in shade.",
  p5: "Draw the pale stepping stones lifting overhead, out of reach, with open air beneath them. Leo holds Maya's sleeve. Do not draw the stones as a path they can still walk.",
  p6: "A low view. Both children crouch over one fallen green bowl leaf on the grove floor. Its central pool reflects the high opening upside down. Leo keeps its long stem. This is the leaf boat before it reaches the water. It is large enough for both of them.",
  p7: "One giant green bowl leaf tips in sunlight and pours a bright ribbon that rises. The children's leaf boat, the same shape with one central pool and one long stem, dips lower in the shade. Do not draw the small copper leaf. Rising water stays in the sun. Water in shade falls or sits lower.",
  p8: "Look down onto the leaf boat, not onto dry ground. Droplets rise from Maya's open hand and join the bright ribbon. Leo holds the long stem so the boat stays in sunlight. The leaf still has one central pool and one long stem. Do not draw the small copper leaf.",
  p9: "Ignore any instruction to stay near their faces. Use a high view from behind them. The children are small on one giant leaf, high in the air. Far below, the lake is a field of many round shining pools, and one bright line leads to the high opening. The leaf is huge beside the children and small beside the whole lake. Do not draw the small copper leaf. Do not show them still at the shore.",
  p10: "Ignore any low view along the ground. Look up from below. The same leaf boat is level in a tall narrow shaft of sunlight, both children near its central pool, rising toward the high opening. The shaft is much taller than the children. Do not draw the small copper leaf. Water rises only inside the sunlight.",
  p11: "Draw the leaf boat here, resting against the blue stone lip. A thread of water climbs from its central pool up the blue wall. Maya steps onto the stone. Leo is still on the leaf, following her. This is one landscape picture for one page, not a panorama across two pages. Do not leave the boat behind on the lake.",
  p12: "Keep this picture peaceful. Soft silver light and low contrast. Maya and Leo sit on the gray ledge. They are not standing. The falling water holds an upside-down picture of the round green leaves. Do not draw the leaf boat. Do not draw a passage wall. Do not make another dry gap the subject."
};

function main() {
  var proseBefore = sha(path.join(BOOK, "story.txt"));
  var bookBefore = sha(path.join(BOOK, "book.json"));
  fs.mkdirSync(CONFIRMED, { recursive: true });
  var pages = [];
  for (var n = 1; n <= PAGES; n += 1) {
    var id = "p" + n;
    var source = fs.readFileSync(path.join(PLANS, id + ".prompt.txt"), "utf8");
    if (source.indexOf("wondii-picture-book") < 0) throw new Error(id + " lost the illustrator");
    if (source.indexOf("maya-v1.jpg") < 0) throw new Error(id + " lost Maya's reference");
    if (source.indexOf("wondii-leo.jpg") < 0) throw new Error(id + " lost Leo's portrait");
    var confirmed = source + " Final picture directions, which override any conflicting sentence above: " + corrections[id] + " Maya matches games/images/characters/maya-v1.jpg. Leo matches games/images/characters/crew/wondii-leo.jpg. Do not swap their faces, hair, or clothes. Keep the locked wondii-picture-book style. One pose each. Do not default to both children standing at eye level.";
    fs.writeFileSync(path.join(CONFIRMED, id + ".prompt.txt"), confirmed);
    pages.push({ page: n, corrections: corrections[id] });
  }
  if (sha(path.join(BOOK, "story.txt")) !== proseBefore) throw new Error("Story text changed");
  if (sha(path.join(BOOK, "book.json")) !== bookBefore) throw new Error("Book record changed");
  var happy = money(PAGES * MEASURED_PAGE_USD + PAGES * VISION_USD);
  var high = money(IMAGE_CAP * MEASURED_PAGE_USD + VISION_CAP * VISION_USD);
  var prep = {
    ready: true,
    paidCalls: 0,
    pictures: "not-run",
    storyApproved: true,
    storyEdits: "none",
    saveImagesTo: "docs/agent/book-v2/the-rain-that-rose-candidate/images/",
    prompts: "docs/agent/book-v2/the-rain-that-rose-candidate/plans-confirmed/",
    leavesUntouched: [
      "docs/agent/book-v2/the-rain-that-rose-candidate/story.txt",
      "docs/agent/book-v2/the-rain-that-rose-candidate/book.json",
      "docs/agent/book-v2/secret-beyond-the-waterfall-revised/",
      "docs/agent/book-v2/secret-beyond-the-waterfall/",
      "docs/agent/book-v2/castle-lost-lanterns/",
      "games/images/characters/maya-v1.jpg",
      "games/images/characters/crew/wondii-leo.jpg",
      "games/book-prototype/book.js"
    ],
    references: [
      { characterId: "wondii-maya", file: "games/images/characters/maya-v1.jpg", approved: true },
      { characterId: "wondii-leo", file: "games/images/characters/crew/wondii-leo.jpg", approved: false, note: "His own portrait. Not replaced by catalogue clothes." }
    ],
    style: "wondii-picture-book",
    model: "gpt-image-2.5-sunburst",
    endpoint: "https://api.openai.com/v1/images/edits",
    size: "1536x1024",
    quality: "medium",
    limits: {
      textCalls: 0,
      plannedImages: 12,
      repairsPerPage: 1,
      maxImageCalls: IMAGE_CAP,
      maxVisionCalls: VISION_CAP
    },
    estimate: {
      basis: "The measured Maya and Leo castle edit was $0.037646. Castle vision checks averaged about $0.001425. Twelve pages with no repairs are the likely cost. One repair on every page is the cap, not the expectation.",
      likely: happy,
      cap: high
    },
    conflictsFound: [
      "Pages 2 and 4 had broken picture instants, so the lighting test and the first view of the lake were not what the sentences describe.",
      "Page 5 listed the stepping stones as a usable path while the story lifts them out of reach.",
      "Page 9 asked for a close view of the faces and also for the lake far below.",
      "Page 10 asked for a low view along the ground while the leaf is rising through the air.",
      "Page 11 said not to draw the leaf boat on the page where the children step off it.",
      "Pages 7 to 10 could pull the small copper waterfall leaf into the lake because the word leaf matched it.",
      "Page 12's generic daylight and contrast fought the quiet ending, and its water state still described the passage wall.",
      "Page 3 called the open lake a room.",
      "The climax was marked as a double-page spread. The reader still uses one landscape image per page, so the picture will be composed for one page."
    ],
    pages: pages
  };
  fs.writeFileSync(path.join(BOOK, "illustration-prep.json"), JSON.stringify(prep, null, 2));
  console.log(JSON.stringify({
    confirmed: 12,
    paidCalls: 0,
    likelyUsd: happy.usd,
    likelyGbp: happy.gbp,
    capUsd: high.usd,
    capGbp: high.gbp,
    storyUnchanged: true
  }));
}

main();
