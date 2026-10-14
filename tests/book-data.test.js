/* Saved-book adapter. No image generation and no network. */
var assert = require("assert");
var fs = require("fs");
var vm = require("vm");

var sandbox = { console: console, URLSearchParams: URLSearchParams };
sandbox.window = sandbox;
sandbox.location = { search: "", hostname: "127.0.0.1" };
sandbox.sessionStorage = {
  bag: {},
  getItem: function (key) { return this.bag[key] || null; },
  setItem: function (key, value) { this.bag[key] = String(value); }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("games/book-prototype/book-data.js", "utf8"), sandbox);
var Data = sandbox.WondiiBookData;

function book(id, title, count, missingAt) {
  var pages = [];
  for (var i = 0; i < count; i++) {
    pages.push({
      text: title + " page " + (i + 1),
      imageDataUrl: missingAt === i ? "" : "data:image/gif;base64,page-" + id + "-" + i,
      imageUrlFallback: null,
      textSafeZones: i === 0 ? [{ x: 0.1 }] : null
    });
  }
  return {
    id: id,
    title: title,
    author: "Wondii",
    pages: pages,
    sceneDataUrl: "data:image/gif;base64,cover-" + id,
    atmosphere: { preset: "meadow" },
    readerArtLayout: "duplex",
    storyTextMode: "prose",
    storyLength: "medium"
  };
}

var shelf = [book("oak", "The Oak Door", 4), book("river", "River Lights", 12)];

var sampleDecision = Data.classify(null, "", []);
assert.strictEqual(sampleDecision.ok, true);
assert.strictEqual(sampleDecision.kind, "sample");
assert.strictEqual(Data.classify("", "user-1", shelf).reason, "missing");
assert.strictEqual(Data.classify("oak", "", shelf).reason, "unauthorised");
assert.strictEqual(Data.classify("missing-id", "user-1", shelf).reason, "unavailable");
assert.strictEqual(Data.classify("oak", "user-1", [{ id: "oak", pages: [] }]).reason, "empty");

var oak = Data.plan(Data.classify("oak", "user-1", shelf).book);
var river = Data.plan(Data.classify("river", "user-1", shelf).book);
assert.notStrictEqual(oak.title, river.title);
assert.notStrictEqual(oak.coverSrc, river.coverSrc);
assert.notStrictEqual(oak.pages[0].text, river.pages[0].text);
assert.strictEqual(oak.pages[0].textSafeZones[0].x, 0.1);
assert.strictEqual(oak.atmosphere.preset, "meadow");
assert.strictEqual(river.pages.length, 12);
assert.strictEqual(river.spreadCount, 7);
assert.strictEqual(Data.plan(Data.classify("river", "user-1", shelf).book).id, river.id);

var bare = Data.plan({
  id: "bare",
  title: "No Pictures",
  pages: [{ text: "Words only", imageDataUrl: null, imageUrlFallback: "" }]
});
assert.strictEqual(bare.pages[0].missingArt, true);
assert.strictEqual(bare.pages[0].shot, "");
var noted = Data.plan({
  id: "noted",
  title: "Noted",
  pages: [{ text: "Hello", shotType: "close", narrativePhase: "ATTEMPT", layoutIntent: "PAGE_PAIR", imageUrlFallback: "x" }]
});
assert.strictEqual(noted.pages[0].shot, "close");
assert.strictEqual(noted.pages[0].phase, "ATTEMPT");
assert.strictEqual(noted.pages[0].layoutIntent, "PAGE_PAIR");
assert.strictEqual(bare.coverSrc, "");
assert.ok(!/golden key/i.test(JSON.stringify(bare)));

var reader = fs.readFileSync("games/book-prototype/book.js", "utf8");
assert.ok(reader.indexOf("const TURN_MS = 880;") !== -1);
assert.ok(reader.indexOf("lead: { value: 0.62 }") !== -1);
assert.ok(reader.indexOf("bow: { value: 0.012 }") !== -1);
assert.ok(reader.indexOf("const OPEN_COVER = -Math.PI;") !== -1);
assert.ok(reader.indexOf("spinY += 0.22 * dt;") !== -1);
assert.ok(reader.indexOf("function bendMaterial") !== -1);
assert.ok(reader.indexOf("function frameCamera") !== -1);
assert.ok(reader.indexOf("StoryAtmosphere") === -1);
assert.ok(reader.indexOf("makeSpreads(art)") !== -1);

var storybook = fs.readFileSync("games/storybook.js", "utf8");
assert.ok(storybook.indexOf("book-prototype/?book=") !== -1);

console.log("ok");
