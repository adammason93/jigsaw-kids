"use strict";
/* Rebuild a story lesson's Wondii adventure from its saved lesson.json with the current
   js/story-lesson.js buildAdventure (no model call). Use after a player-side change. The story,
   claims, checks and pictures are unchanged. Usage: node story-rebuild.js LESSON_DIR */
var fs = require("fs");
var path = require("path");
var Story = require("../../js/story-lesson.js");
var dir = path.resolve(process.argv[2]);
var file = path.join(dir, "lesson.json");
var L = JSON.parse(fs.readFileSync(file, "utf8"));
var claims = {};
L.claims.forEach(function (c) { claims[c.id] = { id: c.id, ideaId: c.ideaId, text: c.text, sourceQuote: c.quote, passageText: c.passage, url: c.url }; });
var knowledge = { ideas: L.ideas, claims: claims, held: L.heldClaims || [] };
var assets = (L.images || []).map(function (i) { return Object.assign({}, i); });
L.adventure = Story.buildAdventure(L.story, knowledge, L.request, { assets: assets, vocabulary: L.vocabulary });
L.adventureRebuiltAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(L, null, 2));
console.log(JSON.stringify({ scenes: L.adventure.storyScenes.length, activities: L.adventure.activities.length }));
