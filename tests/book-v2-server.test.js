"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var handle = require("../scripts/book/handle-request.js");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "scripts/book/handle-request.js"), "utf8");
var server = fs.readFileSync(path.join(root, "scripts/book/serve.js"), "utf8");
assert.ok(source.indexOf("api.openai.com") < 0);
assert.ok(source.indexOf("fetch(") < 0);
assert.ok(server.indexOf("api.openai.com") < 0);
assert.ok(server.indexOf("OPENAI_API_KEY") < 0);
assert.ok(server.indexOf("fetch(") < 0);
assert.ok(source.indexOf("generate.js") < 0 || source.indexOf("is not invoked") >= 0);

var older = handle.handleBookV2({
  familyAgeBand: "10-12",
  members: [
    { id: "wondii-maya", name: "Maya" },
    { id: "wondii-leo", name: "Leo" },
    { id: "wondii-jasper", name: "Jasper" },
    { id: "char_hugo", name: "Hugo" }
  ],
  savedReferences: [{
    id: "char_hugo",
    ownerType: "family",
    ownerId: "family-1",
    reference: "games/images/characters/crew/wondii-maya.jpg"
  }],
  idea: "They follow a light along the castle wall.",
  place: "castle",
  length: "medium",
  theme: "Mystery"
});
assert.strictEqual(older.status, 400);
assert.strictEqual(older.body.generated, false);
assert.ok(older.body.problems.indexOf("wrong-artwork:char_hugo") >= 0);
assert.ok(older.body.identities.every(function (row) {
  return row.journeyId !== "wondii-jasper" || (row.portrait.indexOf("wondii-jasper.jpg") >= 0 && row.reference.indexOf("maya-v1") < 0);
}));

var planned = handle.handleBookV2({
  familyAgeBand: "10-12",
  members: [
    { id: "wondii-maya", name: "Maya" },
    { id: "wondii-leo", name: "Leo" }
  ],
  idea: "",
  place: "castle",
  length: "medium",
  theme: "Adventure"
});
assert.strictEqual(planned.status, 200);
assert.strictEqual(planned.body.generated, false);
assert.strictEqual(planned.body.simulated, true);
assert.strictEqual(planned.body.reason, "paid-generation-not-approved");
assert.strictEqual(planned.body.generation.authorised, false);
assert.strictEqual(planned.body.generation.reason, "paid-generation-not-approved");
assert.ok(planned.body.generation.quote.expectedUsd > 0);
assert.ok(planned.body.generation.quote.expectedUsd < planned.body.generation.quote.budgetUsd);
assert.strictEqual(planned.body.illustrations, "not-run");
assert.strictEqual(planned.body.pictureConsistency, "not-solved");
assert.strictEqual(planned.body.illustrationStyle, "wondii-picture-book");
assert.strictEqual(planned.body.writing.constraintYear, "Year 6");
assert.deepStrictEqual(planned.body.castIds, ["wondii-maya", "wondii-leo"]);
assert.deepStrictEqual(planned.body.bibleIds, ["maya", "leo"]);
assert.ok(planned.body.preview.title.indexOf("not a finished book") >= 0);
assert.ok(planned.body.preview.pages[0].text.indexOf("not called") >= 0);
assert.ok(planned.body.preview.pages[0].text.indexOf("castle") >= 0);
assert.ok(planned.body.preview.pages[0].text.toLowerCase().indexOf("forest") < 0);
assert.strictEqual(planned.body.identity[0].lockedSheet, true);
assert.strictEqual(planned.body.identity[0].sheet, "maya-v1");
assert.strictEqual(planned.body.identity[1].lockedSheet, false);
assert.strictEqual(planned.body.identity[1].sheet, "portrait-only");
assert.ok(planned.body.identity[1].reference.indexOf("wondii-leo.jpg") >= 0);
assert.ok(planned.body.identity[1].reference.indexOf("maya-v1") < 0);

var young = handle.handleBookV2({
  familyAgeBand: "7-9",
  members: [{ id: "wondii-maya", name: "Maya" }],
  idea: "Maya waits for the star.",
  place: "library",
  length: "short"
});
assert.strictEqual(young.body.writing.ageBand, "7-9");
assert.strictEqual(young.body.writing.constraintYear, "Ages 7–9");
assert.notStrictEqual(young.body.writing.constraintYear, "Year 5");

var journey = fs.readFileSync(path.join(root, "games/story-journey.js"), "utf8");
assert.ok(journey.indexOf("magical forest") < 0);
assert.ok(journey.indexOf("WondiiStoryDraft.create") < 0);
assert.ok(journey.indexOf("style: \"soft_3d\"") < 0);
assert.ok(journey.indexOf("/v1/book") >= 0);
assert.ok(journey.indexOf("book-v2-local-preview") >= 0);
assert.ok(journey.indexOf("body.saved && body.book && body.book.id") >= 0);
assert.ok(journey.indexOf("saveShelf") < 0);
assert.ok(journey.indexOf("Book V2 is not available on this site yet. Nothing was saved.") >= 0);
assert.ok(journey.indexOf("Book V2 could not be reached. Nothing was saved.") >= 0);
assert.ok(journey.indexOf("This story plan was not tied to your account. Nothing was saved.") >= 0);
assert.ok(journey.indexOf("Your library could not be read, so this story was not saved. Nothing was changed.") >= 0);
assert.ok(journey.indexOf("body.generation && body.generation.authorised") >= 0);
assert.ok(journey.indexOf("body.accountId") >= 0);
assert.ok(journey.indexOf("stablePortrait") >= 0);
assert.ok(journey.indexOf('ownerId: "session"') < 0);
assert.ok(journey.indexOf("placePlan") >= 0);
assert.ok(journey.indexOf("mergeOwned") >= 0);
assert.ok(journey.indexOf("downloadStorybookLibrary") >= 0);
assert.ok(journey.indexOf("isChildSession") >= 0);
assert.ok(journey.indexOf("scheduleStorybookUpload") > journey.indexOf("isChildSession"));
var edge = fs.readFileSync(path.join(root, "supabase/functions/book-v2/index.ts"), "utf8");
var bundled = fs.readFileSync(path.join(root, "supabase/functions/book-v2/handle.mjs"), "utf8");
assert.ok(edge.indexOf("api.openai.com") < 0);
assert.ok(edge.indexOf("OPENAI") < 0);
assert.ok(edge.indexOf("createRequire") < 0);
assert.ok(edge.indexOf("accountId: userId") >= 0);
assert.ok(edge.indexOf("token === anon") >= 0);
assert.ok(edge.indexOf("new Response(null, { status: 204, headers })") >= 0);
assert.ok(bundled.indexOf("api.openai.com") < 0);
assert.ok(bundled.indexOf("OPENAI") < 0);
assert.ok(fs.readFileSync(path.join(root, "supabase/config.toml"), "utf8").indexOf("[functions.book-v2]") >= 0);

var account = "11111111-1111-4111-8111-111111111111";
var other = "22222222-2222-4222-8222-222222222222";
function portrait(owner, id) {
  return owner + "/characters/" + id + ".png";
}
var lost = handle.handleBookV2({
  accountId: account,
  familyAgeBand: "7-9",
  members: [{ id: "isaac", name: "Isaac", source: "saved" }],
  savedReferences: [{ id: "isaac", name: "Isaac", ownerType: "family", ownerId: account }],
  idea: "Isaac looks for a lantern.",
  place: "library",
  length: "short"
});
assert.strictEqual(lost.status, 400);
assert.ok(lost.body.problems.indexOf("missing-artwork:isaac") >= 0);
assert.ok(lost.body.message.indexOf("Isaac needs a portrait") >= 0);

var stolen = handle.handleBookV2({
  accountId: account,
  familyAgeBand: "7-9",
  members: [
    { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
    { id: "isaac", name: "Isaac", source: "saved" }
  ],
  savedReferences: [{
    id: "isaac",
    name: "Isaac",
    ownerType: "family",
    ownerId: other,
    reference: "https://enuzrcjnrxwglacivlnu.supabase.co/storage/v1/object/sign/characters_room/" + portrait(other, "isaac") + "?token=not-for-this-account"
  }],
  idea: "Maya and Isaac cross the library.",
  place: "library",
  length: "short"
});
assert.strictEqual(stolen.status, 400);
assert.ok(JSON.stringify(stolen.body).indexOf(portrait(other, "isaac")) < 0);
assert.ok(JSON.stringify(stolen.body).indexOf("not-for-this-account") < 0);
assert.ok(stolen.body.message.indexOf("Isaac") >= 0);

var together = handle.handleBookV2({
  accountId: account,
  familyAgeBand: "7-9",
  members: [
    { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
    { id: "isaac", name: "Isaac", source: "saved" },
    { id: "wondii-sofia", name: "Sofia", source: "wondii-crew" }
  ],
  savedReferences: [{
    id: "isaac",
    name: "Isaac",
    ownerType: "family",
    ownerId: account,
    reference: "https://enuzrcjnrxwglacivlnu.supabase.co/storage/v1/object/sign/characters_room/" + portrait(account, "isaac") + "?token=expires-soon"
  }],
  idea: "Maya, Isaac and Sofia share one quiet adventure.",
  place: "library",
  length: "medium"
});
assert.strictEqual(together.status, 200, JSON.stringify(together.body.problems));
assert.strictEqual(together.body.generated, false);
var cast = {};
together.body.identity.forEach(function (row) { cast[row.characterId] = row; });
assert.ok(cast["wondii-maya"].reference.indexOf("maya-v1") >= 0);
assert.ok(cast["wondii-sofia"].reference.indexOf("wondii-sofia.jpg") >= 0);
assert.strictEqual(cast.isaac.reference, portrait(account, "isaac"));
assert.ok(JSON.stringify(together.body).indexOf("expires-soon") < 0);
assert.ok(cast.isaac.reference.indexOf("maya-v1") < 0);

var trio = handle.handleBookV2({
  accountId: account,
  familyAgeBand: "7-9",
  members: [
    { id: "isaac", name: "Isaac", source: "saved" },
    { id: "ned", name: "Ned", source: "saved" },
    { id: "hugo", name: "Hugo", source: "saved" }
  ],
  savedReferences: ["isaac", "ned", "hugo"].map(function (id) {
    return {
      id: id,
      name: id === "isaac" ? "Isaac" : id === "ned" ? "Ned" : "Hugo",
      ownerType: "family",
      ownerId: account,
      reference: portrait(account, id)
    };
  }),
  idea: "Isaac, Ned and Hugo follow a paper boat.",
  place: "library",
  length: "short"
});
assert.strictEqual(trio.status, 200, JSON.stringify(trio.body.problems));
assert.strictEqual(trio.body.generated, false);
var savedCast = {};
trio.body.identity.forEach(function (row) { savedCast[row.characterId] = row; });
assert.strictEqual(savedCast.isaac.reference, portrait(account, "isaac"));
assert.strictEqual(savedCast.ned.reference, portrait(account, "ned"));
assert.strictEqual(savedCast.hugo.reference, portrait(account, "hugo"));

process.env.BOOK_V2_PAID = "1";
var blocked = handle.handleBookV2({
  familyAgeBand: "4-6",
  members: [{ id: "wondii-maya", name: "Maya" }],
  idea: "Maya follows a light.",
  place: "woods",
  length: "short"
});
assert.strictEqual(blocked.body.generated, false);
assert.strictEqual(blocked.body.simulated, true);
assert.strictEqual(blocked.body.illustrations, "not-run");
delete process.env.BOOK_V2_PAID;

console.log("book-v2 server tests ok");
