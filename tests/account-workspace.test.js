"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Account = require("../js/account-context.js");
var Lib = require("../js/character-library.js");
var Bible = require("../js/character-bible.js");
var Book = require("../js/book-brain.js");

var schoolA = { id: "11111111-1111-4111-8111-111111111111", name: "North School" };
var schoolB = { id: "22222222-2222-4222-8222-222222222222", name: "South School" };
var teacher = "teacher-user";
var familyUser = "family-user";

function schoolWorkspace(org, userId) {
  return Account.workspaceFrom({
    userId: userId || teacher,
    organisation: org,
    role: "teacher",
    organisationName: org.name
  });
}

/* 1. Authenticated school user resolves to the school workspace. */
var ramsdens = schoolWorkspace(schoolA);
assert.strictEqual(ramsdens.kind, "school");
assert.strictEqual(ramsdens.ownerType, "school");
assert.strictEqual(ramsdens.ownerId, schoolA.id);
assert.strictEqual(ramsdens.userId, teacher);
assert.notStrictEqual(ramsdens.kind, "family");

/* 2. Characters is a school route and does not change the workspace. */
var Shell = require("../js/portal-shell.js");
assert.strictEqual(Shell.routeFromHash("#characters"), "characters");
assert.strictEqual(Shell.shellFor({
  auth: "signed-in",
  status: "ready",
  organisation: schoolA,
  role: "teacher",
  hash: "#characters"
}), "school");
var afterNav = schoolWorkspace(schoolA);
assert.ok(Account.sameWorkspace(ramsdens, afterNav));

/* 3. A school user is never told to use a family password. */
var schoolNotice = Account.authNotice(ramsdens);
assert.ok(schoolNotice.text.indexOf("family password") < 0);
assert.strictEqual(schoolNotice.code, "school-signed-out");
var signedOut = Account.authNotice(Account.workspaceFrom({}));
assert.ok(signedOut.text.indexOf("family password") < 0);
var charactersPage = fs.readFileSync(path.join(__dirname, "../characters.html"), "utf8");
var charactersJs = fs.readFileSync(path.join(__dirname, "../characters.js"), "utf8");
assert.ok(charactersPage.indexOf("family password") < 0);
assert.ok(charactersJs.indexOf("family password") < 0);

/* 4. Save writes one stable record owned by the school. */
var draft = { id: "char_pip", name: "Pip", type: "buddy", createdAt: "2026-10-07T12:00:00.000Z" };
var saved = Account.applySave([], draft, ramsdens);
assert.strictEqual(saved.ok, true);
assert.strictEqual(saved.record.id, "char_pip");
assert.strictEqual(saved.record.ownerType, "school");
assert.strictEqual(saved.record.ownerId, schoolA.id);
assert.strictEqual(saved.record.createdBy, teacher);
assert.strictEqual(saved.record.reference, "characters/char_pip.png");
assert.strictEqual(Account.storagePrefix(ramsdens), "school/" + schoolA.id);

/* 5. The same record is still there when the library is read again. */
var reloaded = Account.visibleRecords(saved.index, ramsdens);
assert.strictEqual(reloaded.length, 1);
assert.strictEqual(reloaded[0].id, "char_pip");

/* 6. Home, Characters and Create keep the same school workspace. */
["#home", "#characters", "#create", "#characters"].forEach(function (hash) {
  assert.ok(Shell.SCHOOL_NAV.indexOf(Shell.routeFromHash(hash)) >= 0);
  assert.ok(Account.sameWorkspace(ramsdens, schoolWorkspace(schoolA)));
});

/* 7 and 8. A saved school character is selectable by its own id and reference. */
var catalogue = Lib.availableCharacters({
  bible: Bible,
  ownerId: schoolA.id,
  ownerType: "school",
  saved: reloaded
});
var choice = Lib.bookSelection(catalogue, ["char_pip", "pupil-1"]);
assert.deepStrictEqual(choice, [{ characterId: "char_pip" }]);
var accepted = Book.acceptCreation({
  castIds: ["char_pip"],
  idea: "Pip finds a door that was not there yesterday.",
  yearGroup: "Year 2",
  length: "storybook",
  context: "school",
  characterReferences: [{
    characterId: choice[0].characterId,
    ownerType: reloaded[0].ownerType,
    ownerId: reloaded[0].ownerId,
    reference: reloaded[0].reference
  }]
});
assert.strictEqual(accepted.ok, true, accepted.problems.join(", "));
assert.strictEqual(accepted.cast[0].characterId, "char_pip");
assert.strictEqual(accepted.cast[0].origin, "saved");
assert.strictEqual(accepted.cast[0].reference, "characters/char_pip.png");
assert.ok(JSON.stringify(accepted.cast[0]).indexOf("Pip") < 0);

/* 9. A family workspace cannot see the school record. */
var family = Account.workspaceFrom({ userId: familyUser });
assert.strictEqual(family.kind, "family");
assert.deepStrictEqual(Account.visibleRecords(saved.index, family), []);
assert.notStrictEqual(Account.storagePrefix(family), Account.storagePrefix(ramsdens));
var familyCatalogue = Lib.availableCharacters({
  bible: Bible,
  ownerId: family.ownerId,
  ownerType: "family",
  saved: reloaded
});
assert.ok(!familyCatalogue.some(function (entry) { return entry.id === "char_pip"; }));

/* 10. School B cannot see School A's character. */
var other = schoolWorkspace(schoolB, "other-teacher");
assert.deepStrictEqual(Account.visibleRecords(saved.index, other), []);
assert.ok(!Account.sameWorkspace(ramsdens, other));

/* 11. A failed save stays failed and does not invent a record. */
var refused = Account.applySave(saved.index, { id: "", name: "" }, ramsdens);
assert.strictEqual(refused.ok, false);
assert.strictEqual(refused.code, "invalid");
assert.strictEqual(refused.index.length, 1);
var portalMaker = fs.readFileSync(path.join(__dirname, "../schools/learn/character-portal.js"), "utf8");
assert.ok(portalMaker.indexOf("The character was not saved.") >= 0);
assert.ok(portalMaker.indexOf("console.error") >= 0);
assert.ok(charactersJs.indexOf("Generate the character before saving.") >= 0);

/* 12. /characters sends a school session back into the portal, and a signed-out visit to the login. */
assert.strictEqual(Account.legacyRoute({
  userId: teacher,
  organisation: schoolA,
  role: "teacher"
}).href, "portal.html#characters");
assert.strictEqual(Account.legacyRoute({ userId: familyUser }).href, "portal.html#characters");
assert.strictEqual(Account.legacyRoute({}).href, "portal.html");

/* Legacy family rows without owner fields stay on that family's account. */
var legacy = Account.visibleRecords([{ id: "char_old", name: "Old", type: "hero" }], family);
assert.strictEqual(legacy.length, 1);
assert.strictEqual(legacy[0].ownerType, "family");
assert.strictEqual(legacy[0].ownerId, familyUser);
assert.deepStrictEqual(Account.visibleRecords([{ id: "char_old", name: "Old" }], ramsdens), []);

var home = fs.readFileSync(path.join(__dirname, "../schools/learn/home.js"), "utf8");
var room = fs.readFileSync(path.join(__dirname, "../schools/learn/class-room.js"), "utf8");
assert.strictEqual(home.indexOf("characters.html"), -1);
assert.ok(room.indexOf("characters") >= 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../js/character-store.js"), "utf8").indexOf("school/") >= 0);

console.log("account workspace tests ok");
