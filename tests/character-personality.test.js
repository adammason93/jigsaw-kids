"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Personality = require("../js/character-personality.js");
var Account = require("../js/account-context.js");
var Identity = require("../js/book-v2-identity.js");
var Writer = require("../scripts/book/writer.js");
var Brain = require("../js/book-brain.js");
var Crew = require("../js/wondii-crew.js");

var account = "3153dc82-96b9-4e90-ac76-ffcda0b8b849";
var isaac = "char_mv8k5jtw_4n1e0ito";
var sofia = "char_mv8k4ex1_x9ld4vmk";
var family = Account.workspaceFrom({ userId: account });

assert.deepStrictEqual(Personality.pack({
  traits: ["Curious", "playful", "kind", "brave"],
  description: "  Loves exploring and helping others.  "
}), {
  traits: ["curious", "playful", "kind"],
  description: "Loves exploring and helping others."
});
assert.strictEqual(Personality.pack(null), null);
assert.strictEqual(Personality.pack({ traits: ["wizard"], description: "" }), null);
assert.deepStrictEqual(Personality.toggle(["curious", "kind", "brave"], "shy"), ["curious", "kind", "brave"]);
assert.deepStrictEqual(Personality.toggle(["curious"], "curious"), []);
assert.deepStrictEqual(Personality.traitsOf(["cheerful", "positive"]), ["cheerful", "positive"]);

var created = Account.applySave([], {
  id: isaac,
  name: "Isaac",
  type: "hero",
  createdAt: "2026-10-15T09:00:00.000Z",
  personality: { traits: ["curious", "playful"], description: "Loves exploring and helping others." }
}, family);
assert.strictEqual(created.ok, true);
assert.strictEqual(created.index.length, 1);
assert.strictEqual(created.record.id, isaac);
assert.strictEqual(created.record.reference, "characters/" + isaac + ".png");
assert.deepStrictEqual(created.record.personality, {
  traits: ["curious", "playful"],
  description: "Loves exploring and helping others."
});

var plain = Account.applySave([], {
  id: sofia,
  name: "Sofia",
  type: "hero",
  createdAt: "2026-10-15T09:00:00.000Z"
}, family);
assert.strictEqual(plain.record.personality, undefined);
assert.strictEqual(plain.record.id, sofia);

var edited = Account.applySave(created.index, Object.assign({}, created.record, {
  personality: { traits: ["kind", "gentle"], description: "Helps quietly." }
}), family);
assert.strictEqual(edited.index.length, 1);
assert.strictEqual(edited.record.id, isaac);
assert.strictEqual(edited.record.name, "Isaac");
assert.strictEqual(edited.record.reference, created.record.reference);
assert.strictEqual(edited.record.ownerId, account);
assert.deepStrictEqual(Account.visibleRecords(edited.index, family)[0].personality, {
  traits: ["kind", "gentle"],
  description: "Helps quietly."
});
assert.deepStrictEqual(Account.visibleRecords(edited.index, Account.workspaceFrom({ userId: "someone-else" })), []);

var stored = {
  id: sofia,
  name: "Sofia",
  type: "hero",
  createdAt: "2026-10-15T09:00:00.000Z",
  updatedAt: "2026-10-15T09:00:00.000Z",
  ownerType: "family",
  ownerId: account,
  createdBy: account,
  reference: "characters/" + sofia + ".png"
};
var reopened = Account.visibleRecords([stored], family)[0];
assert.strictEqual(reopened.personality, undefined);
assert.strictEqual(reopened.id, sofia);
assert.strictEqual(reopened.reference, stored.reference);

assert.deepStrictEqual(Crew.get("wondii-sofia").personality, ["cheerful", "positive", "friendly"]);
var maya = Identity.buildRegistry({
  accountId: account,
  members: [{ id: "wondii-maya", name: "Maya", source: "wondii-crew" }],
  savedReferences: [{
    id: "wondii-maya",
    personality: { traits: ["shy"], description: "overwrite" },
    ownerType: "family",
    ownerId: account,
    reference: "games/images/characters/maya-v1.jpg"
  }]
});
assert.strictEqual(maya.ok, true);
assert.ok(maya.registry[0].personality.indexOf("shy") < 0);
assert.ok(maya.registry[0].personality.indexOf("observant") >= 0);

var built = Identity.buildRegistry({
  accountId: account,
  members: [
    { id: isaac, name: "Isaac", source: "saved" },
    { id: sofia, name: "Sofia", source: "saved" }
  ],
  savedReferences: [
    {
      id: isaac,
      name: "Isaac",
      ownerType: "family",
      ownerId: account,
      reference: account + "/characters/" + isaac + ".png",
      personality: { traits: ["curious", "playful"], description: "Loves exploring and helping others." }
    },
    {
      id: sofia,
      name: "Sofia",
      ownerType: "family",
      ownerId: account,
      reference: account + "/characters/" + sofia + ".png"
    }
  ]
});
assert.strictEqual(built.ok, true, built.problems.join(", "));
var isaacRow = built.registry.filter(function (row) { return row.characterId === isaac; })[0];
var sofiaRow = built.registry.filter(function (row) { return row.characterId === sofia; })[0];
assert.deepStrictEqual(isaacRow.personality, ["curious", "playful"]);
assert.strictEqual(isaacRow.personalityNote, "Loves exploring and helping others.");
assert.deepStrictEqual(sofiaRow.personality, []);
assert.strictEqual(sofiaRow.personalityNote, "");

var ask = {
  castIds: [isaac, sofia],
  idea: "A lost star needs help to get home before morning.",
  ageBand: "4-6",
  length: "storybook",
  pageCount: 12,
  tone: "adventure",
  context: "family",
  identityRegistry: built.registry
};
var brief = Writer.bibleBrief(ask);
assert.ok(brief.user.indexOf("curious, playful") >= 0);
assert.ok(brief.user.indexOf("investigate something unusual") >= 0);
assert.ok(brief.user.indexOf("make a game out of an obstacle") >= 0);
assert.ok(brief.user.indexOf("Loves exploring and helping others.") >= 0);
assert.ok(brief.user.indexOf(sofia + " (none stored)") >= 0);
assert.ok(brief.system.indexOf("Do not invent a trait word") >= 0);

var bible = {
  userIdea: "A lost star needs help.",
  targetLength: "storybook",
  pageCount: 12,
  castIds: [isaac, sofia],
  identityRegistry: built.registry,
  beats: [{
    role: "hook",
    charactersPresent: [isaac, sofia],
    expresses: [{ characterId: isaac, trait: "curious", shows: "He looks under the bench." }]
  }],
  goal: "help the star",
  centralProblem: "the star is lost"
};
var shown = Brain.validateBible(bible).problems;
assert.ok(shown.indexOf("personality-unused:" + sofia) < 0);
assert.ok(shown.indexOf("personality-unused:" + isaac) < 0);
var hidden = Brain.validateBible(Object.assign({}, bible, {
  beats: [{ role: "hook", charactersPresent: [isaac, sofia], expresses: [] }]
})).problems;
assert.ok(hidden.indexOf("personality-unused:" + isaac) >= 0);
assert.ok(hidden.indexOf("personality-unused:" + sofia) < 0);

var root = path.join(__dirname, "..");
var portal = fs.readFileSync(path.join(root, "schools/learn/character-portal.js"), "utf8");
assert.ok(portal.indexOf("What makes your character special?") >= 0);
assert.ok(portal.indexOf("Edit personality") >= 0);
assert.ok(portal.indexOf("Skip for now") >= 0);
var editFn = portal.slice(portal.indexOf("function savePersonality"), portal.indexOf("function personalityDialog"));
assert.ok(editFn.indexOf("generate(") < 0);
assert.ok(editFn.indexOf("uploadCharacterPng") < 0);
assert.ok(editFn.indexOf("item.id !== row.id") >= 0);
var crewFn = portal.slice(portal.indexOf("function crewCard"), portal.indexOf("function personalityApi"));
assert.ok(crewFn.indexOf("Edit personality") < 0);
var reader = fs.readFileSync(path.join(root, "games/book-prototype/book.js"), "utf8");
assert.ok(reader.indexOf("const TURN_MS = 880") >= 0);
assert.ok(reader.indexOf("const OPEN_MS = 1200") >= 0);

console.log("character personality tests ok");
