"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Model = require("../js/portal-home-model.js");
var Account = require("../js/account-context.js");

var root = path.join(__dirname, "..");
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

var portal = read("portal.html");
var homeJs = read("js/portal-home.js");
var css = read("css/portal-home.css");
var teacher = read("schools/learn/home.js");
var book = read("games/book-create.js");
var game = read("games/prompt-game.js");
var create = read("schools/learn/create.js");
var brain = read("js/book-brain.js");
var bible = read("js/character-bible.js");

var family = Account.capabilities({ userId: "user-1", role: "" });
var teacherCaps = Account.capabilities({
  userId: "user-2",
  organisation: { id: "org-1" },
  organisationId: "org-1",
  role: "teacher",
  organisationName: "North School"
});
var staff = Account.capabilities({
  userId: "user-3",
  organisation: { id: "org-1" },
  organisationId: "org-1",
  role: "staff",
  organisationName: "North School"
});

/* 1–3. One home. Family does not receive school controls. */
assert.strictEqual(family.canCreateLearningAdventure, false);
assert.strictEqual(family.canManageClasses, false);
assert.strictEqual(family.canViewResults, false);
assert.ok(portal.indexOf('id="wondiiHome"') >= 0);
assert.ok(homeJs.indexOf("School features unavailable") < 0);
assert.ok(homeJs.indexOf("Ramsdens") < 0);
assert.ok(read("js/portal-home-model.js").indexOf("Ramsdens") < 0);

/* 4–5. A school account, including staff, receives the adventure mode. A family account does not. */
var teacherModes = Model.creationModes(teacherCaps).map(function (item) { return item.id; });
var familyModes = Model.creationModes(family).map(function (item) { return item.id; });
assert.ok(teacherModes.indexOf("adventure") >= 0);
assert.strictEqual(familyModes.indexOf("adventure"), -1);
assert.strictEqual(Model.creationModes(staff).some(function (item) { return item.id === "adventure"; }), true);
assert.ok(Model.worldDestinations(teacherCaps).some(function (place) { return place.id === "classes"; }));
assert.ok(!Model.worldDestinations(family).some(function (place) { return place.id === "classes"; }));
assert.ok(teacher.indexOf("WondiiPortalHome") >= 0);

/* 6. Creation modes route into the existing flows. */
assert.strictEqual(Model.launchUrl("story", "A dinosaur"), "games/storybook.html?create=1&idea=A%20dinosaur");
assert.strictEqual(Model.launchUrl("game", "A game about planets"), "games/prompt-game.html?idea=A%20game%20about%20planets");
assert.strictEqual(Model.launchUrl("puzzle", "Under the sea"), "#puzzles");
assert.strictEqual(Model.launchUrl("adventure", "Teach Year 3 why volcanoes erupt"), "schools/learn/create.html?idea=Teach%20Year%203%20why%20volcanoes%20erupt");
assert.ok(book.indexOf('params().get("idea")') >= 0);
assert.ok(game.indexOf('get("idea")') >= 0);
assert.ok(create.indexOf('params.get("idea")') >= 0);
assert.ok(brain.indexOf("function acceptCreation") >= 0);
assert.ok(bible.indexOf("function lockCast") >= 0);

/* 7. Continue uses the resources it is given and does not invent a page position. */
var going = Model.continueItems({
  books: [{ id: "b1", title: "The Lost Dragon Egg", pages: [{}, {}, {}, {}] }],
  adventures: [],
  sessions: []
});
assert.strictEqual(going[0].title, "The Lost Dragon Egg");
assert.strictEqual(going[0].meta, "4 pages");
assert.ok(going[0].meta.indexOf(" of ") < 0);
assert.strictEqual(Model.continueItems({ books: [], adventures: [], sessions: [{ title: "Demo", demo: true }] }).length, 0);

/* 8–9. Character shelf uses the canonical crew ids and stays inside the lists it is given. */
var shelf = Model.characterShelf(
  [{ id: "char_pip", name: "Pip" }],
  [{ id: "wondii-maya", name: "Maya", trait: "curious" }, { id: "wondii-leo", name: "Leo", trait: "kind" }]
);
assert.strictEqual(shelf[0].id, "char_pip");
assert.ok(shelf.some(function (row) { return row.id === "wondii-maya"; }));
assert.ok(shelf.length <= 5);
assert.ok(homeJs.indexOf('setAttribute("data-pose", "hover")') >= 0);
assert.ok(css.indexOf('.home-person[data-pose="hover"]') >= 0);

/* 10. A second workspace's character is not added unless the caller passes it. */
assert.ok(!Model.characterShelf([{ id: "char_a", name: "Ada" }], []).some(function (row) { return row.id === "char_b"; }));

/* 11–12. World destinations, with Class HQ only for class managers. */
var world = Model.worldDestinations(family).map(function (place) { return place.href; });
assert.deepStrictEqual(world, ["#stories", "#characters", "#games", "#puzzles"]);
assert.strictEqual(Model.worldDestinations(teacherCaps).filter(function (place) { return place.place === "Class HQ"; }).length, 1);
assert.strictEqual(Model.worldDestinations(staff).filter(function (place) { return place.place === "Class HQ"; }).length, 1);

/* 13. Empty inputs stay empty. */
assert.strictEqual(Model.continueItems({}).length, 0);
assert.strictEqual(Model.characterShelf([], []).length, 0);
assert.strictEqual(Model.classSummary([]).empty, true);
assert.strictEqual(Model.contextStats({ books: [], adventures: [], classes: [] }).length, 0);
assert.ok(homeJs.indexOf("Create someone special.") >= 0);
assert.ok(homeJs.indexOf("Your next adventure starts here.") >= 0);

/* 14–16. Mobile world, keyboard pose, reduced motion. */
assert.ok(css.indexOf("overflow-x: auto") >= 0);
assert.ok(css.indexOf("prefers-reduced-motion") >= 0);
assert.ok(homeJs.indexOf("focusin") >= 0);

/* 17. Below-fold cards lazy-load. */
assert.ok(homeJs.indexOf('img.loading = "lazy"') >= 0);

/* 18–19. Existing engines are still the destination, not a new generator. */
assert.ok(homeJs.indexOf("generateBook") < 0);
assert.ok(homeJs.indexOf("runGenerate") < 0);

/* 20. Completion counts appear only when both numbers exist. */
var week = Model.weekActivity([
  { title: "Volcano Explorers", createdAt: new Date().toISOString(), status: "open" },
  { title: "Shark Discovery", createdAt: new Date().toISOString(), completed: 3, total: 4 }
], new Date());
assert.strictEqual(week[0].completed, undefined);
assert.strictEqual(week[1].completed, 3);
assert.strictEqual(week[1].total, 4);

/* Greeting uses a real name and does not invent one. */
assert.strictEqual(Model.greeting(new Date("2026-10-07T20:00:00"), "Adam"), "Good evening, Adam");
assert.strictEqual(Model.greeting(new Date("2026-10-07T20:00:00"), ""), "Good evening");
assert.strictEqual(Model.supportLine(family, {}), "Ready to create something amazing?");
assert.ok(Model.supportLine(teacherCaps, { className: "Oak", year: "Year 1", pupils: 4 }).indexOf("4 pupils") >= 0);

/* Discovery is a curated list, including a school idea only for teachers. */
assert.ok(Model.discovery(family, [{ id: "wondii-maya", name: "Maya" }]).some(function (item) { return item.characterName === "Maya"; }));
assert.ok(!Model.discovery(family, []).some(function (item) { return item.title === "Why volcanoes erupt"; }));
assert.ok(Model.discovery(teacherCaps, [{ id: "wondii-theo", name: "Theo" }]).some(function (item) { return item.title === "Why volcanoes erupt"; }));

/* Surprise me stays inside the curated bank. */
assert.strictEqual(Model.surpriseAt(family, 1).title, "Mission to Mars");
assert.ok(Model.examples(teacherCaps).indexOf("Teach Year 3 why volcanoes erupt...") >= 0);
assert.strictEqual(Model.examples(family).indexOf("Teach Year 3 why volcanoes erupt..."), -1);

console.log("portal-home tests ok");
