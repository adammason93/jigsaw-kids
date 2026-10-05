var assert = require("assert");
var fs = require("fs");
var Platform = require("../games/game-platform.js");

var pilots = ["noughts-crosses", "memory", "word-search", "colouring", "snake"];
pilots.forEach(function (id) {
  var game = Platform.byId(id);
  assert.ok(game, id);
  assert.strictEqual(game.status, "current");
  assert.strictEqual(game.shell, "v2");
  assert.strictEqual(game.category, "standalone");
});

Platform.games().forEach(function (game) {
  if (pilots.indexOf(game.id) === -1 && game.category === "standalone") {
    assert.strictEqual(game.status, "legacy", game.id);
  }
});

assert.strictEqual(Platform.byId("quiz"), null);
assert.strictEqual(Platform.byId("spin"), null);
assert.strictEqual(Platform.byId("word_search"), null);

var cards = Platform.portalCards();
assert.ok(cards.some(function (card) { return card.id === "memory" && card.href === "games/memory.html"; }));
assert.ok(!cards.some(function (card) { return card.id === "quiz" || card.id === "runner"; }));
assert.strictEqual(Platform.byId("runner").status, "legacy");
assert.strictEqual(Platform.byId("colouring").score, "none");

var made = Platform.createContract({ id: "memory", title: "Memory Match" });
assert.strictEqual(made.ok, true);
assert.strictEqual(made.game.help.length > 0, true);
assert.strictEqual(Platform.createContract({ title: "Nope" }).ok, false);

var state = Platform.STATES.SETUP;
state = Platform.transition(state, "ready");
assert.strictEqual(state, "ready");
state = Platform.transition(state, "play");
assert.strictEqual(state, "playing");
state = Platform.transition(state, "pause");
assert.strictEqual(state, "paused");
state = Platform.transition(state, "resume");
assert.strictEqual(state, "playing");
var packed = Platform.result({ outcome: "win", winner: "Player 1", score: 1, moves: "", difficulty: "easy" });
assert.strictEqual(packed.outcome, "win");
assert.strictEqual(packed.winner, "Player 1");
assert.strictEqual(Object.prototype.hasOwnProperty.call(packed, "moves"), false);
assert.ok(packed.completedAt);
state = Platform.transition(state, "complete");
assert.strictEqual(state, "complete");
state = Platform.transition(state, "restart");
assert.strictEqual(state, "setup");
state = Platform.transition(state, "error");
assert.strictEqual(state, "error");
state = Platform.transition(state, "destroy");
assert.strictEqual(state, "setup");

var storage = {
  data: {},
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
  setItem: function (key, value) { this.data[key] = String(value); }
};
Platform.writeAccount(storage, "account-a", "jigsawKidsColouringV1", "picture-a");
Platform.writeAccount(storage, "account-b", "jigsawKidsColouringV1", "picture-b");
assert.strictEqual(Platform.readAccount(storage, "account-a", "jigsawKidsColouringV1"), "picture-a");
assert.strictEqual(Platform.readAccount(storage, "account-b", "jigsawKidsColouringV1"), "picture-b");
assert.notStrictEqual(
  Platform.scopedKey("account-a", "linkGridCompletedLevels"),
  Platform.scopedKey("account-b", "linkGridCompletedLevels")
);
assert.strictEqual(Platform.scopedKey("", "linkGridCompletedLevels"), null);
assert.strictEqual(Platform.prefersReduced(true), true);
assert.strictEqual(Platform.prefersReduced(false), false);

["noughts-crosses.html", "memory.html", "word-search.html", "colouring.html", "snake-arcade.html"].forEach(function (file) {
  var html = fs.readFileSync("games/" + file, "utf8");
  assert.ok(html.indexOf('data-game-shell="v2"') >= 0, file);
  assert.strictEqual(html.indexOf("wondii-shell.js"), -1, file);
});
assert.ok(fs.readFileSync("games/connect-four.html", "utf8").indexOf("wondii-shell.js") >= 0);
assert.ok(fs.readFileSync("js/score-cloud.js", "utf8").indexOf("jigsawKidsColouringAutoSaveV1") >= 0);
assert.ok(fs.readFileSync("games/word-search.js", "utf8").indexOf("function linePath") >= 0);
assert.ok(fs.readFileSync("schools/learn/mechanic-core.js", "utf8").indexOf("function generateWordSearch") >= 0);

console.log("game-platform tests passed");
