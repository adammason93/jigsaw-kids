var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Lib = require("../js/character-library.js");
var Cast = require("../js/character-bible.js");

var list = Lib.availableCharacters({
  bible: Cast,
  ownerId: "teacher-a",
  saved: [
    { id: "char_1", name: "Pip", type: "hero", ownerId: "teacher-a", createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "char_2", name: "Secret", type: "buddy", ownerId: "teacher-b" },
    { id: "maya", name: "Not Maya", type: "hero", ownerId: "teacher-a" }
  ]
});

assert.strictEqual(list.filter(function (entry) { return entry.source === "canonical"; }).length, 4);
assert.strictEqual(list.filter(function (entry) { return entry.id === "maya"; }).length, 1);
assert.strictEqual(list.filter(function (entry) { return entry.id === "maya"; })[0].name, "Maya");
assert.strictEqual(list.filter(function (entry) { return entry.id === "maya"; })[0].artwork, "games/images/characters/maya-v1.jpg");
assert.strictEqual(list.filter(function (entry) { return entry.id === "maya"; })[0].eligibleForBooks, true);
assert.ok(list.some(function (entry) { return entry.id === "char_1" && entry.eligibleForBooks === true && entry.reference === "characters/char_1.png"; }));
assert.ok(!list.some(function (entry) { return entry.id === "char_2" || entry.name === "Secret"; }));
assert.ok(["leo", "ravi", "mina"].every(function (id) {
  return list.some(function (entry) { return entry.id === id && entry.artwork === "" && entry.source === "canonical"; });
}));

var open = Lib.availableCharacters({
  bible: Cast,
  saved: [{ id: "char_9", name: "Nim", type: "buddy" }]
});
assert.ok(open.some(function (entry) { return entry.id === "char_9"; }));

var withClass = Lib.availableCharacters({
  bible: Cast,
  ownerId: "teacher-a",
  classroom: [
    { id: "pupil-1", name: "Amina", classId: "c1", className: "Owls", artwork: "games/images/schools/room/kid-6-brown-long.webp" },
    { id: "pupil-x", name: "Other", ownerId: "teacher-b", className: "Year 3" }
  ]
});
assert.ok(withClass.some(function (entry) {
  return entry.id === "pupil-1" && entry.source === "classroom" && entry.className === "Owls" && entry.eligibleForBooks === false;
}));
assert.ok(!withClass.some(function (entry) { return entry.id === "pupil-x"; }));

var picked = Lib.bookSelection(withClass.concat(list), ["maya", "char_1", "pupil-1", "maya"]);
assert.deepStrictEqual(picked, [{ characterId: "maya" }, { characterId: "char_1" }]);
assert.ok(JSON.stringify(picked).indexOf("Pip") < 0);
assert.ok(JSON.stringify(picked).indexOf("artwork") < 0);

assert.strictEqual(Lib.artworkSrc("games/images/characters/maya-v1.jpg", true), "images/characters/maya-v1.jpg");
assert.strictEqual(Lib.artworkSrc("games/images/characters/maya-v1.jpg", false), "games/images/characters/maya-v1.jpg");
assert.strictEqual(Lib.artworkSrc("https://example.test/a.png", true), "https://example.test/a.png");

var book = fs.readFileSync(path.join(__dirname, "../games/book-create.js"), "utf8");
var portal = fs.readFileSync(path.join(__dirname, "../portal.html"), "utf8");
var home = fs.readFileSync(path.join(__dirname, "../schools/learn/home.js"), "utf8");
var page = fs.readFileSync(path.join(__dirname, "../schools/learn/character-portal.js"), "utf8");
assert.ok(book.indexOf("WondiiCharacterLibrary") >= 0);
assert.ok(book.indexOf("availableCharacters") >= 0);
assert.ok(book.indexOf("bookSelection") >= 0);
assert.ok(portal.indexOf('data-teacher="characters"') >= 0);
assert.ok(home.indexOf('"characters"') >= 0);
assert.ok(page.indexOf("Bring your stories to life") >= 0);
assert.ok(page.indexOf("Meet the Wondii Crew") >= 0);
assert.ok(page.indexOf("family password") < 0);
assert.ok(page.indexOf("characters.html") < 0);
assert.ok(page.indexOf("Save character") >= 0);
assert.ok(page.indexOf("console.error") >= 0);
assert.ok(page.indexOf("workspaceFrom") >= 0);
assert.ok(page.indexOf("function deleteCharacter") < 0);
assert.ok(page.indexOf("deleteCharacterImage") >= 0);

console.log("character-library tests ok");
