const assert = require("assert");
const Visuals = require("../js/visual-adventure.js");

const adventure = Visuals.volcanoPrototype();
const assets = Visuals.planVisualAssets(adventure);
assert.strictEqual(assets.length, 3);
assert.deepStrictEqual(assets.map((asset) => asset.id), ["opening", "discovery", "resolution"]);
assert.ok(assets.every((asset) => asset.generationRequired === true));
assert.ok(assets[0].usedByScenes.indexOf("The Mystery of the Trembling Ground") >= 0);
assert.ok(assets[1].usedByScenes.indexOf("Understanding Eruptions") >= 0);
assert.ok(assets[2].usedByScenes.indexOf("What Did We Learn?") >= 0);

const characters = Visuals.defineCharacters(adventure.storyPlan, 5);
assert.strictEqual(characters[0].characterId, "CHARACTER_A");
assert.strictEqual(characters[0].roleId, "scientist");
assert.ok(characters[0].appearance.indexOf("dark curly hair") >= 0);
assert.ok(characters[0].clothing.indexOf("yellow field jacket") >= 0);

const prompts = assets.map((asset) => Visuals.buildVisualPrompt(adventure, asset, characters));
prompts.forEach((prompt) => {
  assert.ok(prompt.indexOf(Visuals.ART_DIRECTION) === 0);
  assert.ok(prompt.indexOf("Do not draw any words") >= 0);
  assert.ok(prompt.indexOf("dark curly hair") >= 0);
  assert.ok(prompt.indexOf("yellow field jacket") >= 0);
  assert.ok(prompt.indexOf("coastal town") >= 0);
  assert.ok(prompt.indexOf("Teach Year 5 children") < 0);
  assert.ok(prompt.indexOf("photorealistic children") >= 0);
});
assert.ok(prompts[1].indexOf("pressure") >= 0);
assert.ok(prompts[1].indexOf("towards the surface") >= 0);
assert.ok(prompts[2].indexOf("smiling at the camera") >= 0);
assert.strictEqual(Visuals.hashBrief(prompts[0]), Visuals.hashBrief(prompts[0]));
assert.notStrictEqual(Visuals.hashBrief(prompts[0]), Visuals.hashBrief(prompts[1]));

assert.strictEqual(Visuals.visualsEnabled({}), false);
assert.strictEqual(Visuals.visualsEnabled({ prototype: "something-else" }), false);
assert.strictEqual(Visuals.visualsEnabled({ prototype: Visuals.PROTOTYPE }), true);

const failed = Visuals.attachResult(adventure, assets[0], { status: "failed", failure: "moderation_blocked" });
assert.strictEqual(failed.activities.length, adventure.activities.length);
assert.strictEqual(failed.activities[1].title, "The Pressure Builds");
assert.strictEqual(failed.visualAssets[0].fallback, true);
assert.strictEqual(failed.visualAssets[0].status, "failed");
assert.strictEqual(failed.goals[0], adventure.goals[0]);

const experience = Visuals.volcanoExperience();
const experienceAssets = Visuals.planVisualAssets(experience);
assert.strictEqual(experience.activities.length, 7);
assert.strictEqual(experienceAssets.length, 3);
assert.deepStrictEqual(Visuals.diversityIssues(experienceAssets), []);
assert.notStrictEqual(experienceAssets[0].shot.location, experienceAssets[1].shot.location);
assert.notStrictEqual(experienceAssets[1].shot.shotType, experienceAssets[2].shot.shotType);
assert.deepStrictEqual(experienceAssets.map((asset) => asset.uiSafeArea), ["LOWER_LEFT", "RIGHT", "LOWER_RIGHT"]);
assert.ok(experienceAssets[0].usedByScenes.indexOf("Investigation") >= 0);
assert.ok(experienceAssets[1].usedByScenes.indexOf("Prediction") >= 0);
assert.ok(experienceAssets[2].usedByScenes.indexOf("What we learned") >= 0);

const band = Visuals.journeyGuidance(15);
assert.deepStrictEqual(band.scenes, [5, 7]);
assert.deepStrictEqual(band.interactions, [2, 4]);
assert.strictEqual(band.guidance, true);

const cast = Visuals.defineExperienceCharacters(5);
const experiencePrompts = experienceAssets.map((asset) => Visuals.buildExperiencePrompt(experience, asset, cast));
experiencePrompts.forEach((prompt) => {
  assert.ok(prompt.indexOf("Wondii") >= 0);
  assert.ok(prompt.indexOf("dark curly hair") >= 0);
  assert.ok(prompt.indexOf("Do not draw any words") >= 0);
  assert.ok(prompt.indexOf("Sofia") < 0);
});
assert.ok(experiencePrompts[1].indexOf("Do not reproduce the previous composition") >= 0);
assert.ok(experiencePrompts[1].indexOf("magma") >= 0);
assert.ok(experiencePrompts[2].indexOf("monitoring station") >= 0);

const first = Visuals.assignRoles(Visuals.dummyClass(), Visuals.rolePlaceholders());
const swapped = Visuals.assignRoles(
  [{ id: "a", name: "Maya" }, { id: "b", name: "Oliver" }, { id: "c", name: "Amelia" }],
  Visuals.rolePlaceholders()
);
assert.strictEqual(Visuals.speakRoles("{{LEAD_SCIENTIST}} checks the crack.", first), "Sofia checks the crack.");
assert.strictEqual(Visuals.speakRoles("{{LEAD_SCIENTIST}} checks the crack.", swapped), "Maya checks the crack.");
assert.strictEqual(Visuals.hashBrief(experiencePrompts[0]), Visuals.hashBrief(experiencePrompts[0]));
assert.strictEqual(experiencePrompts[0].indexOf("Sofia") < 0 && experiencePrompts[0].indexOf("Maya") < 0, true);
const dynamic = Visuals.nextDynamicPupil(Visuals.dummyClass(), first);
assert.strictEqual(dynamic.displayName, "Oliver");
assert.strictEqual(dynamic.participation, "dynamic");
assert.strictEqual(Visuals.visualsEnabled({ prototype: Visuals.PROTOTYPE_98A }), true);

const room = { pupils: [
  { id: "p1", firstName: "Rowan" },
  { id: "p2", firstName: "Noah" },
  { id: "p3", firstName: "Priya" },
  { id: "p4", firstName: "Ellis" }
]};
const here = Visuals.participantsFromRoom(room, ["p4"]);
const session = Visuals.sessionRoleAssignments(here, Visuals.rolePlaceholders());
assert.strictEqual(session.map.LEAD_SCIENTIST, "p1");
assert.strictEqual(session.roles[0].displayName, "Rowan");
const awayLead = Visuals.reassignAbsent(session, Visuals.participantsFromRoom(room, ["p1"]), Visuals.rolePlaceholders());
assert.notStrictEqual(awayLead.map.LEAD_SCIENTIST, "p1");
assert.ok(awayLead.roles.every((role) => role.pupilId !== "p1"));
const promptA = Visuals.buildExperiencePrompt(experience, experienceAssets[0], cast);
const promptB = Visuals.buildExperiencePrompt(experience, experienceAssets[0], cast);
assert.strictEqual(Visuals.hashBrief(promptA), Visuals.hashBrief(promptB));
assert.ok(promptA.indexOf("Rowan") < 0);
assert.ok(promptA.indexOf("Noah") < 0);
const present = Visuals.participantsFromRoom(room, []);
const presentSession = Visuals.sessionRoleAssignments(present, Visuals.rolePlaceholders());
const picked = Visuals.nextDynamicPupil(present, presentSession, Visuals.participationState(presentSession));
assert.strictEqual(picked.displayName, "Ellis");
assert.strictEqual(picked.participation, "dynamic");
const check = Visuals.pressureInteraction();
assert.strictEqual(check.branchType, "LEARNING_CHECK");
assert.strictEqual(check.correctChoice, "rise");
assert.ok(check.choices.some((choice) => choice.id === "sink"));
const route = Visuals.routeChoice();
assert.notStrictEqual(route.choices[0].nextScene, route.choices[1].nextScene);
assert.strictEqual(route.rejoinScene, "debrief");
const sheet = Visuals.buildCharacterSheetPrompt(cast);
assert.ok(sheet.indexOf("plain warm cream background") >= 0);
assert.ok(sheet.indexOf("Rowan") < 0);
assert.strictEqual(cast[0].canonicalReference, "characters");
assert.ok(cast[0].faceTraits.indexOf("brown eyes") >= 0);
assert.ok(cast[0].footwear.indexOf("brown rounded boots") >= 0);
assert.ok(sheet.indexOf("short dark curly hair") >= 0);
assert.ok(sheet.indexOf("CHARACTER_A, CHARACTER_B, CHARACTER_C") >= 0);
assert.ok(check.choices.filter((choice) => choice.id !== "rise").every((choice) => choice.feedback));
assert.strictEqual(Visuals.visualsEnabled({ prototype: Visuals.PROTOTYPE_98B }), true);
assert.strictEqual(Visuals.visualsEnabled({}), false);
assert.strictEqual(Visuals.visualsAllowed({}), false);
assert.strictEqual(Visuals.visualsAllowed({ organisationId: "c90e0da5-3ba7-4c25-9e78-9519ffbc6f39" }), true);
assert.strictEqual(Visuals.visualsAllowed({ organisationId: "00000000-0000-0000-0000-000000000000" }), false);
const real = {
  topic: "causes of earthquakes",
  subject: "Geography",
  yearGroup: "Year 5",
  storyPlan: {
    setting: "A hillside village",
    continuity: { setting: "A hillside village beside a cracked road", objects: ["cracked road", "stone school"] },
    characters: [{ id: "LEAD_SCIENTIST", label: "Lead Scientist" }]
  },
  activities: [
    { title: "The shaking", mechanic: "story", scene: { beat: "beginning", visualBrief: { setting: "A hillside village at dawn", action: "The class arrives as the ground trembles", educationalFocus: "A village that has started to shake" } } },
    { title: "Under the ground", mechanic: "story", scene: { beat: "discovery", visualBrief: { setting: "A cutaway of the crust", educationalFocus: "Plates meeting at a fault", action: "The team looks at two plates that are stuck" } } },
    { title: "The village understands", mechanic: "story", scene: { beat: "resolution", visualBrief: { setting: "The same village, calmer", action: "The team explains the shaking", educationalFocus: "The mystery of the shaking is settled" } } }
  ]
};
const realCast = Visuals.charactersForAdventure(real);
const realPrompt = Visuals.buildAdventurePrompt(real, Visuals.planVisualAssets(real)[0], realCast);
assert.ok(realPrompt.indexOf("Sofia") < 0);
const featured = Visuals.featuredCast({
  characters: [
    { id: "explorer", label: "Earth Explorer", characterId: "CHARACTER_A" },
    { id: "predictor", label: "Prediction Explorer", characterId: "CHARACTER_B" }
  ]
});
assert.strictEqual(featured[0].characterId, "CHARACTER_A");
assert.strictEqual(featured[0].clothing, "a yellow field jacket");
assert.strictEqual(featured[1].characterId, "CHARACTER_B");
assert.ok(JSON.stringify(featured).indexOf("Jack") < 0);
assert.ok(!featured[0].firstName);
const pupils = [
  { id: "p1", firstName: "Jack" },
  { id: "p2", firstName: "Sofia" },
  { id: "p3", firstName: "Emma", here: false },
  { id: "p4", firstName: "Sam" }
];
const bound = Visuals.sessionCast(pupils, featured, "C7G8-CFY3", {});
const again = Visuals.sessionCast(pupils, featured, "C7G8-CFY3", {});
assert.deepStrictEqual(bound, again);
assert.notStrictEqual(bound.CHARACTER_A.pupilId, bound.CHARACTER_B.pupilId);
assert.notStrictEqual(bound.CHARACTER_A.firstName, "Emma");
assert.notStrictEqual(bound.CHARACTER_B.firstName, "Emma");
assert.ok(bound.CHARACTER_A.storyRole);
const moved = Visuals.sessionCast(pupils, featured, "C7G8-CFY3", { CHARACTER_A: "p4" });
assert.strictEqual(moved.CHARACTER_A.firstName, "Sam");
assert.strictEqual(moved.CHARACTER_A.clothing, bound.CHARACTER_A.clothing);
assert.strictEqual(moved.CHARACTER_A.characterId, "CHARACTER_A");
if (bound.CHARACTER_A.pupilId === "p1") assert.notStrictEqual(moved.CHARACTER_B.pupilId, "p1");
assert.deepStrictEqual(Visuals.reliableRegions([{ x: 2, y: 0, width: 0.2, height: 0.2 }]), []);
assert.strictEqual(Visuals.reliableRegions([{ characterId: "CHARACTER_A", x: 0.1, y: 0.2, width: 0.3, height: 0.4 }]).length, 1);
assert.strictEqual(Visuals.characterForRole({ characters: featured.map((role) => ({ id: role.roleId, label: role.storyRole, characterId: role.characterId })) }, "Earth Explorer"), "CHARACTER_A");
assert.ok(realPrompt.indexOf("Jack") < 0);
assert.ok(realPrompt.indexOf("Do not write a pupil") >= 0);
assert.ok(realPrompt.indexOf("Do not add a volcano") >= 0);
assert.ok(realPrompt.indexOf("hillside village") >= 0);
const before = Visuals.hashBrief(realPrompt);
const named = Visuals.buildAdventurePrompt(real, Visuals.planVisualAssets(real)[0], realCast);
assert.strictEqual(Visuals.hashBrief(named), before);
Visuals.stampActivities(real.activities, []);
assert.strictEqual(real.activities[1].scene.visualAssetId, "discovery");
assert.strictEqual(Visuals.SIZE, "2560x1440");
var quakeAdventure = { year: 1, topic: "causes of earthquakes", subject: "Science", storyPlan: { setting: "a rocky world under our feet", continuity: { setting: "a rocky world under our feet" } } };
var quakeCast = Visuals.defineExperienceCharacters(1).slice(0, 2);
var quakeOpening = Visuals.buildAdventurePrompt(quakeAdventure, { id: "opening", brief: { setting: "a wide rocky world", action: "arriving", educationalFocus: "the ground above" }, uiSafeArea: "LOWER_LEFT" }, quakeCast);
var quakeDiscovery = Visuals.buildAdventurePrompt(quakeAdventure, { id: "discovery", brief: { setting: "the same rocky world", action: "looking at the join", educationalFocus: "two huge pieces" }, uiSafeArea: "RIGHT" }, quakeCast);
var quakeResolution = Visuals.buildAdventurePrompt(quakeAdventure, { id: "resolution", brief: { setting: "the exploration base", action: "explaining", educationalFocus: "the idea" }, uiSafeArea: "LOWER_RIGHT" }, quakeCast);
assert.ok(quakeOpening.indexOf("wide view") >= 0);
assert.ok(quakeDiscovery.indexOf("cutaway") >= 0);
assert.ok(quakeResolution.indexOf("exploration base") >= 0);
assert.ok(quakeOpening.indexOf("notched") < 0);
assert.notStrictEqual(quakeOpening, quakeDiscovery);
var ramsdens = [
  { id: "emma", firstName: "Emma", presentation: "girl", hair: "blonde", length: "long" },
  { id: "jack", firstName: "Jack", presentation: "boy", hair: "brown", length: "short" },
  { id: "sofia", firstName: "Sofia", presentation: "girl", hair: "brown", length: "long" }
];
var avatarBound = Visuals.bindFeatured(ramsdens, "Year 1", { characters: [{ id: "earth", label: "Earth Explorer" }, { id: "predict", label: "Prediction Explorer" }] });
assert.strictEqual(avatarBound.length, 2);
assert.strictEqual(avatarBound[0].avatarId, "kid-5-blonde-long");
assert.strictEqual(avatarBound[0].pupilId, "emma");
assert.strictEqual(avatarBound[1].avatarId, "kid-5-brown-short");
var refs = Visuals.avatarRefs(avatarBound);
assert.strictEqual(JSON.stringify(refs).indexOf("Emma"), -1);
assert.strictEqual(JSON.stringify(refs).indexOf("emma"), -1);
var withAvatars = Object.assign({}, quakeAdventure, { avatarRefs: refs });
var avatarPrompt = Visuals.buildAdventurePrompt(withAvatars, { id: "opening", brief: { setting: "under the ground", action: "arriving", educationalFocus: "the ground" }, uiSafeArea: "LOWER_LEFT" }, []);
assert.ok(avatarPrompt.indexOf("kid-5-blonde-long.webp") >= 0);
assert.ok(avatarPrompt.indexOf("Emma") < 0);
assert.ok(avatarPrompt.indexOf("Jack") < 0);
var pinned = Visuals.sessionCast(
  [{ id: "emma", firstName: "Emma" }, { id: "jack", firstName: "Jack" }, { id: "sofia", firstName: "Sofia" }],
  { characters: [{ id: "earth", label: "Earth Explorer", characterId: "CHARACTER_A" }, { id: "predict", label: "Prediction Explorer", characterId: "CHARACTER_B" }] },
  "seed",
  {},
  avatarBound
);
assert.strictEqual(pinned.CHARACTER_A.firstName, "Emma");
assert.strictEqual(pinned.CHARACTER_A.avatarId, "kid-5-blonde-long");
assert.strictEqual(pinned.CHARACTER_B.firstName, "Jack");

console.log("visual-adventure tests passed");
