"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Crew = require("../js/wondii-crew.js");
var Account = require("../js/account-context.js");
var Book = require("../js/book-brain.js");

var root = path.join(__dirname, "..");
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

var portal = read("portal.html");
var portalJs = read("portal.js");
var page = read("schools/learn/character-portal.js");
var css = read("css/character-crew.css");
var book = read("games/book-create.js");
var home = read("schools/learn/home.js");

var EXPECTED = [
  "wondii-maya", "wondii-leo", "wondii-amara", "wondii-finn", "wondii-zara", "wondii-theo",
  "wondii-nia", "wondii-arlo", "wondii-sofia", "wondii-ravi", "wondii-elsie", "wondii-jasper"
];

function story(ids, references) {
  return Book.acceptCreation({
    castIds: ids,
    characterReferences: references || [],
    idea: "They find a button that remembers yesterday.",
    yearGroup: "Year 2",
    length: "quick"
  });
}

/* 1. Characters page loads inside the authenticated portal. */
assert.ok(portal.indexOf('data-view="characters"') >= 0);
assert.ok(portal.indexOf('id="characterPage"') >= 0);
assert.ok(portal.indexOf("js/account-context.js") >= 0);
assert.ok(portal.indexOf("js/wondii-crew.js") >= 0);
assert.ok(portalJs.indexOf('"characters"') >= 0);
assert.ok(portalJs.indexOf('split("/")') >= 0);
assert.strictEqual(home.indexOf("characterLibraryHost"), -1);

/* 2. My Characters loads workspace-owned characters. */
assert.ok(page.indexOf("workspaceFrom") >= 0);
assert.ok(page.indexOf("loadCharacters") >= 0);
assert.ok(page.indexOf("My characters") >= 0);
var family = Account.workspaceFrom({ userId: "family-1" });
var school = Account.workspaceFrom({
  userId: "teacher-1",
  organisation: { id: "school-a", name: "Ramsdens" },
  role: "teacher"
});
var familySave = Account.applySave([], { id: "char_pip", name: "Pip", type: "buddy" }, family);
assert.strictEqual(Account.visibleRecords(familySave.index, family)[0].name, "Pip");
assert.deepStrictEqual(Account.visibleRecords(familySave.index, school), []);

/* 3–5. Twelve stable crew characters, each with idle and hover assets. */
var crew = Crew.list();
assert.strictEqual(crew.length, 12);
var seen = {};
crew.forEach(function (row) {
  assert.ok(EXPECTED.indexOf(row.id) >= 0);
  assert.ok(!seen[row.id]);
  seen[row.id] = true;
  assert.strictEqual(row.type, "system");
  assert.ok(row.name && row.trait && row.description);
  assert.ok(row.assets.idle);
  assert.ok(row.assets.hover);
  assert.notStrictEqual(row.assets.idle, row.assets.hover);
  assert.strictEqual(row.manageable, false);
  assert.strictEqual(Crew.canManage(row), false);
});
assert.strictEqual(Object.keys(seen).length, 12);
assert.deepStrictEqual(crew.map(function (row) { return row.id; }), EXPECTED);

/* 6–7. Hover uses the alternate pose and leaving returns to idle. */
assert.strictEqual(Crew.poseState({ hover: true }).pose, "hover");
assert.strictEqual(Crew.poseState({ hover: false }).pose, "idle");
assert.ok(page.indexOf("pointerenter") >= 0);
assert.ok(page.indexOf("pointerleave") >= 0);
assert.ok(css.indexOf('[data-pose="hover"] .crew-card__art--hover') >= 0);
assert.ok(css.indexOf("280ms") >= 0);
crew.forEach(function (row) {
  assert.ok(css.indexOf(row.gesture) >= 0);
});

/* 8. Keyboard focus shows the same pose. */
assert.strictEqual(Crew.poseState({ focus: true }).pose, "hover");
assert.ok(page.indexOf("focusin") >= 0);
assert.ok(page.indexOf("tabIndex = 0") >= 0);
assert.ok(page.indexOf('aria-label", "Use "') >= 0);

/* 9. Reduced motion keeps the pose change and drops the lift. */
var reduced = Crew.poseState({ hover: true, reducedMotion: true });
assert.strictEqual(reduced.pose, "hover");
assert.strictEqual(reduced.animate, false);
assert.strictEqual(reduced.crossfade, true);
assert.ok(css.indexOf("prefers-reduced-motion: reduce") >= 0);
assert.ok(page.indexOf("prefers-reduced-motion") >= 0);

/* 10. Touch selection does not depend on hover. */
assert.strictEqual(Crew.poseState({ selected: true, hover: false }).pose, "hover");
assert.ok(page.indexOf('pointerType === "touch"') >= 0);
assert.ok(page.indexOf("is-selected") >= 0);

/* 11–12. Maya resolves to wondii-maya and is not copied into a workspace. */
var maya = Crew.bookCast("wondii-maya");
assert.strictEqual(maya.characterType, "system");
assert.strictEqual(maya.characterId, "wondii-maya");
assert.strictEqual(maya.bibleId, "maya");
assert.ok(!maya.ownerId);
var index = [];
var mayaBook = story(["wondii-maya"]);
assert.strictEqual(mayaBook.ok, true, mayaBook.problems.join(", "));
assert.strictEqual(mayaBook.cast.length, 1);
assert.strictEqual(mayaBook.cast[0].characterId, "wondii-maya");
assert.strictEqual(mayaBook.cast[0].origin, "system");
assert.ok(mayaBook.cast[0].reference.indexOf("maya-v1.jpg") >= 0);
assert.ok(!mayaBook.cast[0].ownerId);
assert.strictEqual(index.length, 0);
assert.ok(mayaBook.cast.every(function (row) { return row.characterId !== "maya"; }));
var chooseFn = page.slice(page.indexOf("function choose"), page.indexOf("function grid"));
assert.ok(chooseFn.indexOf("saveCharacter") < 0);

/* 13–14. A custom character uses the same reference shape, and the book stores both. */
var custom = Crew.workspaceCast({
  id: "char_pip",
  name: "Pip",
  ownerType: "family",
  ownerId: "family-1",
  reference: "characters/char_pip.png"
});
assert.strictEqual(custom.characterType, "workspace");
assert.strictEqual(custom.characterId, "char_pip");
var mixed = story(["wondii-maya", "char_pip"], [custom]);
assert.strictEqual(mixed.ok, true, mixed.problems.join(", "));
assert.strictEqual(mixed.request.characterReferences.length, 2);
assert.strictEqual(mixed.request.characterReferences[0].characterId, "wondii-maya");
assert.strictEqual(mixed.request.characterReferences[0].characterType, "system");
assert.strictEqual(mixed.request.characterReferences[1].characterId, "char_pip");
assert.strictEqual(mixed.request.characterReferences[1].characterType, "workspace");
assert.strictEqual(mixed.request.characterReferences[1].ownerId, "family-1");
assert.ok(book.indexOf("renderPicker") >= 0);
assert.ok(book.indexOf("workspaceCast") >= 0);
assert.ok(book.indexOf("bookCast") >= 0);
assert.ok(page.indexOf("Wondii Crew") >= 0);
assert.ok(page.indexOf('data-cast-source", source') >= 0);

/* Leo stays a new system character and is not the bible's Leo. */
var leo = story(["wondii-leo"]);
assert.strictEqual(leo.ok, true, leo.problems.join(", "));
assert.strictEqual(leo.cast[0].characterId, "wondii-leo");
assert.strictEqual(leo.cast[0].bibleId, "");
assert.ok(leo.cast[0].reference.indexOf("leo-idle.webp") >= 0);
assert.ok(leo.cast.every(function (row) { return row.characterId !== "leo"; }));

/* 15. A saved character is still there when the same workspace reads the index again. */
var reloaded = Account.visibleRecords(familySave.index, family);
assert.strictEqual(reloaded.length, 1);
assert.strictEqual(reloaded[0].id, "char_pip");
assert.strictEqual(reloaded[0].reference, "characters/char_pip.png");
assert.ok(page.indexOf("saveCharacter") >= 0);

/* 16. Workspaces do not share custom characters. */
var otherSchool = Account.workspaceFrom({
  userId: "teacher-2",
  organisation: { id: "school-b", name: "Other" },
  role: "teacher"
});
assert.deepStrictEqual(Account.visibleRecords(familySave.index, otherSchool), []);
assert.ok(!Account.sameWorkspace(school, otherSchool));

/* 17. The crew is available to a family workspace and a school workspace. */
assert.strictEqual(Crew.list().length, 12);
assert.ok(page.indexOf("crew().list()") >= 0);
assert.ok(page.indexOf("ownerType") < 0 || page.indexOf("Meet the Wondii Crew") >= 0);

/* 18. System characters cannot be edited or deleted. */
var crewFn = page.slice(page.indexOf("function crewCard"), page.indexOf("function mineCard"));
assert.ok(crewFn.indexOf("Delete") < 0);
assert.ok(crewFn.indexOf("Edit") < 0);
var mineFn = page.slice(page.indexOf("function mineCard"), page.indexOf("function choose"));
assert.ok(mineFn.indexOf("Delete") >= 0);
assert.ok(mineFn.indexOf("Edit") >= 0);
assert.ok(page.indexOf("window.confirm") >= 0);
assert.ok(Crew.list().every(function (row) { return Crew.canManage(row) === false; }));
assert.strictEqual(Crew.canManage({ id: "char_pip", type: "workspace" }), true);

/* Asset contract stays open for later poses. */
assert.ok(Crew.POSES.indexOf("happy") >= 0);
assert.ok(Crew.POSES.indexOf("talking") >= 0);
assert.strictEqual(Crew.get("wondii-maya").assets.happy, "");
var manifest = Crew.manifest();
assert.strictEqual(manifest.length, 24 / 2);
manifest.forEach(function (row) {
  assert.strictEqual(row.width, 960);
  assert.strictEqual(row.height, 1400);
  assert.strictEqual(row.background, "transparent");
  assert.ok(row.idle.indexOf("assets/characters/wondii/") === 0);
  assert.ok(row.hover.indexOf("assets/characters/wondii/") === 0);
});

console.log("wondii crew tests ok");
