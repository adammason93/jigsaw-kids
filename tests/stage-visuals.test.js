"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Visuals = require("../js/visual-adventure.js");
require("../schools/learn/visual-client.js");
require("../schools/learn/lesson-mechanics.js");
var Shell = require("../schools/learn/lesson-shell.js");

var ANSWER = "ZEPHYR_SPARK_TOKEN";
var CONTINUITY = "a classroom looking out at the same storm";

function story(slotId, title, beat, line) {
  return {
    slotId: slotId,
    title: title,
    mechanic: "story",
    purpose: title,
    why: line,
    config: { lines: [line] },
    scene: {
      beat: beat,
      interaction: { type: "hotspot", instruction: "Look more closely", successCondition: "looked" },
      visualBrief: {
        setting: CONTINUITY,
        action: line,
        educationalFocus: line,
        importantObjects: ["storm clouds", "classroom window"],
        mood: "curious"
      }
    }
  };
}

var lightning = {
  year: 1,
  topic: "Lightning",
  subject: "Science",
  requiredEvidence: "describe the process of lightning formation",
  avatarRefs: [{ characterId: "CHARACTER_A", avatarId: "kid-5-blonde-long", roleLabel: "Explorer" }],
  storyPlan: {
    mission: "Discover Lightning's Secrets",
    setting: CONTINUITY,
    ending: "The class can explain the spark and the storm is understood.",
    continuity: {
      setting: CONTINUITY,
      objects: ["storm clouds", "classroom window", "cloud model"]
    }
  },
  activities: [
    story("hook", "Arrival", "beginning", "Look outside at the stormy sky."),
    story("investigate", "What do you notice?", "goal", "What do you notice about the clouds?"),
    story("teach", "The spark", "discovery", "Lightning is a giant spark of electricity."),
    {
      slotId: "apply",
      title: "Show the spark",
      mechanic: "story",
      applyInstruction: "Use the cloud model to show where the spark happens.",
      knowledgeUsed: "Lightning is a giant spark of electricity.",
      successCondition: "The cloud model shows the spark between the clouds.",
      teachingConnection: "The class uses the spark idea on the model.",
      scene: {
        beat: "application",
        interaction: { type: "move", target: "cloud model", instruction: "Move the cloud model.", successCondition: "slip" },
        visualBrief: { setting: CONTINUITY, action: "Use the cloud model.", educationalFocus: "the spark", importantObjects: ["cloud model"], mood: "busy" }
      }
    },
    {
      slotId: "check",
      title: "Check the spark",
      mechanic: "quiz",
      requiredEvidence: "describe the process of lightning formation",
      config: {
        prompt: "What do the clouds make?",
        choices: [ANSWER, "A quiet breeze", "A puddle"],
        correct: ANSWER,
        explain: "The right one is " + ANSWER + ".",
        teachingConnection: "This checks the spark in the storm.",
        questions: [{
          prompt: "What do the clouds make?",
          choices: [ANSWER, "A quiet breeze", "A puddle"],
          correct: ANSWER,
          explain: "The right one is " + ANSWER + ".",
          teachingConnection: "This checks the spark in the storm."
        }]
      },
      scene: { beat: "development", visualBrief: { setting: CONTINUITY, action: "The class looks at the storm.", educationalFocus: "the storm question", mood: "focused" } }
    },
    story("resolution", "The storm makes sense", "resolution", "The class names the spark and the mission is complete."),
    story("recap", "What we discovered", "debrief", "We discovered how the spark happens in the storm.")
  ]
};

var assets = Visuals.planVisualAssets(lightning);
assert.strictEqual(assets.length, 7);
assert.deepStrictEqual(assets.map(function (asset) { return asset.id; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
var ids = {};
assets.forEach(function (asset) {
  assert.ok(!ids[asset.id]);
  ids[asset.id] = true;
  assert.strictEqual(asset.slotId, asset.id);
});
assert.notStrictEqual(assets[3].id, assets[2].id);
assert.notStrictEqual(assets[4].id, assets[2].id);
assert.notStrictEqual(assets[4].id, assets[3].id);
assert.strictEqual(assets[5].id, "resolution");
assert.strictEqual(assets[6].id, "recap");
assert.deepStrictEqual(Visuals.diversityIssues(assets), []);

var prompts = {};
assets.forEach(function (asset) {
  prompts[asset.id] = Visuals.buildAdventurePrompt(lightning, asset, []);
  assert.ok(prompts[asset.id].indexOf(CONTINUITY) >= 0);
  assert.ok(prompts[asset.id].indexOf("CHARACTER_A") >= 0);
  assert.ok(prompts[asset.id].indexOf("kid-5-blonde-long.webp") >= 0);
  assert.strictEqual(JSON.stringify(asset).indexOf(ANSWER), -1);
});
assert.ok(prompts.hook.indexOf("unresolved mission") >= 0);
assert.ok(prompts.investigate.indexOf("Do not teach the answer") >= 0);
assert.ok(prompts.teach.indexOf("Teach photograph") >= 0);
assert.ok(prompts.apply.indexOf("Do not reuse the teaching composition") >= 0);
assert.ok(prompts.apply.indexOf("cloud model") >= 0);
assert.ok(prompts.apply.indexOf("Use the cloud model") >= 0);
assert.ok(prompts.check.indexOf("Do not mark") >= 0);
assert.ok(prompts.check.indexOf("What do the clouds make?") >= 0);
assert.ok(prompts.check.indexOf("describe the process of lightning formation") >= 0);
assert.ok(prompts.check.indexOf("This checks the spark in the storm.") >= 0);
assert.strictEqual(prompts.check.indexOf(ANSWER), -1);
assert.ok(prompts.resolution.indexOf("payoff") >= 0);
assert.ok(prompts.recap.indexOf("Do not reuse the resolution") >= 0);
assert.notStrictEqual(prompts.hook, prompts.investigate);
assert.notStrictEqual(prompts.teach, prompts.apply);
assert.notStrictEqual(prompts.check, prompts.teach);
assert.notStrictEqual(prompts.resolution, prompts.recap);

Visuals.stampActivities(lightning.activities, assets);
lightning.activities.forEach(function (activity) {
  assert.strictEqual(activity.scene.visualAssetId, activity.slotId);
});

var prototype = Visuals.volcanoPrototype();
assert.strictEqual(Visuals.planVisualAssets(prototype).length, 3);
var experience = Visuals.volcanoExperience();
assert.strictEqual(experience.activities.length, 7);
assert.strictEqual(Visuals.planVisualAssets(experience).length, 3);

var kept = Visuals.attachResult(lightning, assets[2], { status: "failed", failure: "provider" });
assert.strictEqual(kept.activities.length, 7);
assert.strictEqual(kept.visualAssets[2].fallback, true);
assert.strictEqual(kept.visualAssets[2].status, "failed");
assert.strictEqual(kept.visualAssets[0].id, "hook");
assert.notStrictEqual(kept.visualAssets[0].status, "failed");

var pictures = assets.map(function (asset) {
  return {
    id: asset.id,
    status: asset.id === "teach" ? "failed" : "ready",
    fallback: asset.id === "teach",
    publicUrl: asset.id === "teach" ? "" : ("https://example/" + asset.id + ".jpg"),
    uiSafeArea: asset.uiSafeArea,
    usedByScenes: asset.usedByScenes
  };
});
globalThis.WondiiVisuals.bind(pictures);
assets.forEach(function (asset) {
  var shown = globalThis.WondiiVisuals.forSlide({ visualAssetId: asset.id, kicker: "Arrival" });
  if (asset.id === "teach") assert.strictEqual(shown.fallback, true);
  else {
    assert.strictEqual(shown.fallback, false);
    assert.strictEqual(shown.url, "https://example/" + asset.id + ".jpg");
  }
});
assert.notStrictEqual(globalThis.WondiiVisuals.forSlide({ visualAssetId: "hook" }).url, globalThis.WondiiVisuals.forSlide({ visualAssetId: "investigate" }).url);

var inflight = [];
var characterDone = false;
var early = false;
var finished = null;
Visuals.scheduleVisualAssets(["characters", "hook", "investigate", "teach", "apply", "check", "resolution", "recap"], function (id, done) {
  if (id !== "characters" && !characterDone) early = true;
  inflight.push({ id: id, done: done });
}, function (result) { finished = result; }, 3);
assert.strictEqual(inflight.length, 1);
assert.strictEqual(inflight[0].id, "characters");
assert.strictEqual(early, false);
characterDone = true;
inflight[0].done();
assert.strictEqual(inflight.length, 4);
var seen = {};
function drain() {
  var pending = inflight.filter(function (item) { return !seen[item.id]; });
  pending.forEach(function (item) {
    seen[item.id] = true;
    item.done();
  });
  if (Object.keys(seen).length < 8) drain();
}
drain();
assert.ok(finished);
assert.ok(finished.peak <= 3);
assert.ok(finished.peak >= 2);
assert.strictEqual(Object.keys(seen).length, 8);

var play = { index: 0, step: 0, stuck: false, slipped: false, revealed: false, boomed: false };
var hookSlide = { type: "story", beat: "beginning", interaction: { type: "hotspot", instruction: "Look more closely" } };
assert.strictEqual(Shell.waitingOn(hookSlide.interaction, play), true);
assert.strictEqual(Shell.primaryLabel(hookSlide, play, 0, 7, { answered: false, index: 0, count: 1 }), "");
var afterSpot = Shell.completeSpot(play, [hookSlide.interaction]);
assert.strictEqual(afterSpot.revealed, true);
assert.strictEqual(afterSpot.index, 0);
assert.strictEqual(Shell.primaryLabel(hookSlide, afterSpot, 0, 7, { answered: false, index: 0, count: 1 }), "Next");

var applySlide = { type: "story", beat: "application", interaction: { type: "move", instruction: "Move the cloud model." } };
var applyPlay = { index: 3, step: 0, slipped: false, revealed: false };
assert.strictEqual(Shell.primaryLabel(applySlide, applyPlay, 3, 7, { answered: false, index: 0, count: 1 }), "");
applyPlay.slipped = true;
assert.strictEqual(Shell.primaryLabel(applySlide, applyPlay, 3, 7, { answered: false, index: 0, count: 1 }), "Next");
var checkSlide = { type: "question", question: { prompt: "What do the clouds make?", correct: ANSWER } };
var checkPlay = { index: 4, step: 0, revealed: true, slipped: true };
assert.strictEqual(Shell.primaryLabel(checkSlide, checkPlay, 4, 7, { answered: false, index: 0, count: 1 }), "");
assert.strictEqual(Shell.primaryLabel(checkSlide, checkPlay, 4, 7, { answered: true, index: 0, count: 1 }), "Next");

function button(attrs) {
  var node = { attrs: attrs || {}, listeners: {} };
  node.getAttribute = function (name) { return node.attrs[name] || null; };
  node.addEventListener = function (type, fn) { node.listeners[type] = fn; };
  node.click = function () { if (node.listeners.click) node.listeners.click(); };
  return node;
}
function host() {
  var root = { innerHTML: "" };
  var primary = button();
  var spot = button({ "data-world": "spot" });
  var push = button({ "data-world": "push" });
  root.querySelector = function (sel) {
    if (!sel || sel.charAt(0) !== "#") return null;
    var id = sel.slice(1);
    if (root.innerHTML.indexOf('id="' + id + '"') < 0) return null;
    if (id === "lessonMechanic") return null;
    if (id === "lessonPrimary") return primary;
    return button();
  };
  root.querySelectorAll = function (sel) {
    if (sel !== "[data-world]") return [];
    var found = [];
    if (root.innerHTML.indexOf('data-world="spot"') >= 0) found.push(spot);
    if (root.innerHTML.indexOf('data-world="push"') >= 0) found.push(push);
    return found;
  };
  root.primary = primary;
  root.spot = spot;
  root.push = push;
  return root;
}

var slides = lightning.activities.map(function (activity) {
  var slide = {
    type: activity.mechanic === "quiz" ? "question" : activity.mechanic,
    kicker: activity.title,
    beat: activity.scene.beat,
    visualAssetId: activity.scene.visualAssetId,
    lines: (activity.config && activity.config.lines) || [activity.title],
    question: activity.mechanic === "quiz" ? { prompt: activity.config.prompt, choices: activity.config.choices, correct: activity.config.correct } : null
  };
  if (activity.scene.interaction) slide.interaction = activity.scene.interaction;
  return slide;
});
slides[6].type = "mystery";
var root = host();
var visited = [];
var revealedCheck = false;
var completed = false;
var view = {
  mode: "board",
  engineStatus: "active",
  status: "playing",
  startedAt: "2026-10-02",
  board: { phase: "play" },
  slide: 0,
  reveal: false,
  slides: slides,
  engine: {
    teamMode: "none",
    teams: [],
    participants: [],
    rounds: slides.map(function (_slide, index) { return { id: "r" + index }; }),
    mechanicStore: {}
  }
};
var model = {
  title: "Discover Lightning's Secrets",
  year: "Year 1",
  visualAssets: pictures,
  storyPlan: lightning.storyPlan,
  actions: {
    goTo: function (index) {
      view.slide = index;
      view.reveal = false;
      Shell.render(root, model);
    },
    reveal: function () {
      revealedCheck = true;
      view.reveal = true;
      Shell.render(root, model);
    },
    complete: function () { completed = true; }
  },
  view: view
};
Shell.enter();
Shell.render(root, model);
assert.ok(root.innerHTML.indexOf("Look more closely") >= 0);
assert.ok(root.innerHTML.indexOf('id="lessonPrimary"') < 0);
var layerAt = root.innerHTML.indexOf("lesson-layer");
var worldAt = root.innerHTML.indexOf("lesson-world");
assert.ok(layerAt > worldAt);
assert.ok(root.innerHTML.slice(worldAt, layerAt).indexOf("lesson-spot") < 0);
assert.ok(root.innerHTML.indexOf("https://example/hook.jpg") >= 0);
var css = fs.readFileSync(path.join(__dirname, "../schools/learn/lesson-shell.css"), "utf8");
assert.ok(css.indexOf(".lesson.has-world > .lesson-layer") >= 0);
assert.ok(css.indexOf("z-index: 4") >= 0);
assert.ok(css.indexOf("100dvh") >= 0);
assert.ok(css.indexOf("min-height: 68vh") < 0);

function advance() {
  var guard = 0;
  while (view.slide < slides.length && guard < 40) {
    guard += 1;
    var id = slides[view.slide].visualAssetId;
    if (visited.indexOf(id) < 0) visited.push(id);
    if (root.innerHTML.indexOf('data-world="spot"') >= 0) {
      root.spot.click();
      continue;
    }
    if (root.innerHTML.indexOf('data-world="push"') >= 0) {
      root.push.click();
      continue;
    }
    if (slides[view.slide].type === "question" && root.innerHTML.indexOf('id="lessonPrimary"') < 0) {
      assert.ok(root.innerHTML.indexOf(">Teacher<") < 0);
      view.engine.mechanicStore["r" + view.slide] = { index: 0, answers: { "0": "picked" } };
      Shell.render(root, model);
      assert.ok(root.innerHTML.indexOf('id="lessonPrimary"') >= 0);
      assert.ok(root.innerHTML.indexOf(">Next<") >= 0);
      assert.ok(root.innerHTML.indexOf(">Teacher<") >= 0);
      continue;
    }
    if (root.innerHTML.indexOf('id="lessonPrimary"') >= 0) {
      root.primary.click();
      continue;
    }
    break;
  }
}
advance();
assert.deepStrictEqual(visited, ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
assert.strictEqual(revealedCheck, true);
assert.strictEqual(completed, true);
assert.ok(root.innerHTML.indexOf("https://example/hook.jpg") < 0 || view.slide === 0);

var report = assets.map(function (asset) {
  return {
    slotId: asset.slotId,
    visualAssetId: asset.id,
    purpose: asset.slotId,
    continuity: prompts[asset.id].indexOf(CONTINUITY) >= 0,
    character: prompts[asset.id].indexOf("CHARACTER_A") >= 0,
    interaction: asset.slotId === "apply" ? prompts[asset.id].indexOf("cloud model") >= 0 : (asset.slotId === "check" ? prompts[asset.id].indexOf("What do the clouds make?") >= 0 : true),
    progression: visited.indexOf(asset.id) >= 0,
    leakage: asset.slotId === "check" ? prompts.check.indexOf(ANSWER) >= 0 : false
  };
});
assert.ok(report.every(function (row) { return row.continuity && row.character && row.progression && row.leakage === false; }));

console.log("stage-visuals tests passed");
console.log(JSON.stringify(report));
