"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Creator = require("../schools/learn/creator-core.js");
var Shell = require("../schools/learn/lesson-shell.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");

var boot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var brainSource = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
var skeletonCall = boot.indexOf("const skeleton = brain.planBeats(");
var lessonCall = boot.indexOf("brain.lessonSkeleton(planned.plan, withStory)");
var contentCall = boot.indexOf("brain.contentBrief(framed, planned.plan, storyPlan)");
assert.ok(skeletonCall > 0, "the generator must call planBeats");
assert.ok(lessonCall > skeletonCall, "lessonSkeleton must be the input to planBeats");
assert.ok(contentCall > lessonCall, "contentBrief must follow the beat-planned skeleton");
assert.strictEqual(boot.includes("brain.planBeats("), true);
assert.ok(boot.includes("lesson-brain.js?v=53"));

function jsonResponse(body, status) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () { return Promise.resolve(body); },
    text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); }
  };
}

function speak(beat, items) {
  var item = items[0];
  items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var token = known.toLowerCase().split(/[^a-z0-9]+/).filter(function (word) { return word.length > 4; })[0] || "idea";
  var text = {
    notice: "Look at the scene and say what you can see.",
    predict: "Say what you think is happening before the explanation.",
    name: item.kind === "relationship" || item.kind === "procedure" ? "The class gives this idea its own name." : item.text,
    explain: item.text,
    exemplify: "For example, you can see it when " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    model: "First follow this step: " + known.charAt(0).toLowerCase() + known.slice(1) + ", then check what changed.",
    compare: "Look at both sides and say what is different.",
    connect: "These two ideas belong together in this lesson.",
    practise: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    apply: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    retrieve: "Which sentence matches the idea you just learned?",
    reveal: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    consolidate: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + "."
  }[beat.move];
  return { id: beat.id, cue: "", text: text };
}

var knowledge = [
  "The pointed shape lets water slide past, so the shark can swim more easily.",
  "The tail pushes water backwards so that the shark swims forward."
];
var plan = {
  learningObjective: "Understand how a shark body helps it swim.",
  subject: "Science",
  topic: "Sharks",
  yearGroup: "Year 1",
  learningMap: [
    { id: "p1", knowledge: "A shark's body is made for moving through water.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: "A shark has a smooth, pointed body.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: knowledge[0], role: "mechanism", importance: "core", dependsOn: ["p2"] },
    { id: "p4", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p5", knowledge: knowledge[1], role: "mechanism", importance: "core", dependsOn: ["p4"] }
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
};
var story = {
  enabled: true,
  structure: "investigation",
  title: "The shark swim",
  premise: "The class finds out how a shark body helps it swim.",
  setting: "the ocean",
  tone: "clear",
  mission: "Find out how a shark body helps it swim.",
  characters: [{ id: "guide", label: "Guide", visualRole: "young fictional explorer" }],
  narrativeArc: [
    { beat: "beginning", learning: knowledge[0] },
    { beat: "development", learning: knowledge[1] },
    { beat: "application", learning: knowledge[0] },
    { beat: "resolution", learning: knowledge[1] },
    { beat: "debrief", learning: knowledge[0] }
  ],
  learningIntegration: "The swim shows how the body helps.",
  ending: "The class can say how fins help a shark turn.",
  continuity: { setting: "the ocean", mission: "Find out how a shark body helps it swim.", discovered: [], objects: ["shark"], roles: ["guide"] }
};

var contentUsers = [];
var modelPayloads = [];
global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return "test-key";
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "test-anon";
  if (name === "LESSON_MODEL") return "gpt-4o-mini";
  return "";
} } };

global.fetch = function (url, init) {
  var href = String(url);
  if (href.indexOf("lesson-brain.js?v=53") !== -1) return Promise.resolve(jsonResponse(brainSource, 200));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-1" }, 200));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
  if (href.indexOf("api.openai.com") === -1) return Promise.reject(new Error("unexpected fetch " + href));
  var body = JSON.parse(init.body);
  var system = body.messages[0].content;
  var user = body.messages[1].content;
  var payload;
  if (system.indexOf("You ground subject knowledge") === 0) {
    payload = {
      status: "usable",
      claims: [
        { text: knowledge[0], depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
        { text: knowledge[1], depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
        { text: "A shark has fins and a tail.", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
        { text: "Fins, tail and gills work together as one system for living in the sea.", depth: "system", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 5, to: 6 } }
      ],
      concepts: ["shark body"],
      vocabulary: [{ term: "fin", gloss: "a flat part a shark uses to steer" }]
    };
  } else if (system.indexOf("You interpret one primary teacher's request.") === 0) {
    payload = {
      learningGoal: "Understand how a shark body helps it swim.",
      requiredEvidence: "say how fins help a shark turn",
      focusConcepts: ["shark fins"],
      priorKnowledge: [],
      exclusions: [],
      preferences: [],
      subject: "Science",
      subjectConfidence: "explicit",
      yearGroup: "Year 1"
    };
  } else if (system.indexOf("Do not write pupil activities") !== -1) {
    payload = plan;
  } else if (system.indexOf("internal story plan") !== -1) {
    payload = story;
  } else if (system.indexOf("You judge only the task explicitly required") === 0) {
    payload = { relationship: "apply", reason: "The task uses the taught idea in a new action." };
  } else if (system.indexOf("You state only what a correct answer") === 0) {
    payload = { demonstratedEvidence: "The pupil can say how fins help a shark turn.", reason: "The correct choice states that." };
  } else if (system.indexOf("You compare two statements of learning evidence.") === 0) {
    payload = { coverage: "sufficient", reason: "The answer shows the required idea." };
  } else {
    var safe = JSON.parse(user);
    var skeleton = safe.lessonSkeleton || [];
    contentUsers.push(safe);
    var brain = global.WondiiLessonBrain;
    var items = brain.beatKnowledge(safe.lessonPlan, "Year 1");
    var slots = {};
    skeleton.forEach(function (slot) {
      var beats = (slot.beats || []).map(function (beat) { return speak(beat, items); });
      beats.forEach(function (beat) {
        assert.deepStrictEqual(Object.keys(beat).sort(), ["cue", "id", "text"]);
      });
      if (slot.id === "apply") {
        slots.apply = {
          beats: beats,
          instruction: beats[0].text,
          target: "scene",
          successCondition: "The pupil has used the taught idea in the task.",
          teachingConnection: "The task follows the idea the class just learned."
        };
        assert.ok(!Object.prototype.hasOwnProperty.call(slots.apply, "knowledgeUsed"));
      } else if (slot.id === "check") {
        var retrieves = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; });
        if (retrieves.length > 1) {
          slots.check = {
            beats: beats,
            questions: retrieves.map(function (beat, index) {
              var item = items[0];
              items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
              return {
                id: beat.id,
                prompt: "Which sentence matches taught idea number " + (index + 1) + "?",
                choices: [item.text, "A different idea that was not part of this lesson."],
                correct: item.text,
                explain: "That sentence matches the idea the class has just learned.",
                successEvidence: "The pupil chose the taught idea.",
                teachingConnection: "The question follows the taught idea."
              };
            })
          };
        } else {
          slots.check = {
            beats: beats,
            prompt: beats[0].text,
            choices: [items[items.length - 1].text, "A different idea that was not part of this lesson."],
            correct: items[items.length - 1].text,
            explain: "That sentence matches the idea the class has just learned.",
            successEvidence: "The pupil chose the taught idea.",
            teachingConnection: "The question follows the taught idea."
          };
        }
        assert.ok(!Object.prototype.hasOwnProperty.call(slots.check, "knowledgeChecked"));
      } else slots[slot.id] = { beats: beats };
    });
    payload = { title: "Shark swim", objectives: [plan.learningObjective], slots: slots };
    modelPayloads.push(payload);
  }
  return Promise.resolve(jsonResponse({ choices: [{ message: { content: JSON.stringify(payload) } }] }, 200));
};

(0, eval)("(async function(){\n" + boot + "\n})()").then(function () {
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST",
    headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: "beat-path",
      context: {
        organisationId: "org-1",
        lessonText: "Year 1 Science. Teach children how a shark body helps it swim.",
        yearGroup: "Year 1",
        subject: "Science",
        topic: "Sharks",
        requestedMinutes: 15
      }
    })
  }));
}).then(function (response) {
  return response.json().then(function (body) {
    assert.strictEqual(body.ok, true, (body.issues || []).join(" | ") + " stage=" + body.stage);
    assert.ok(contentUsers.length >= 1);
    var sent = contentUsers[0];
    var planned = sent.lessonSkeleton;
    assert.strictEqual(planned.length, 7);
    var moves = [];
    planned.forEach(function (slot) {
      assert.ok(slot.beats && slot.beats.length, slot.id + " has no beats");
      slot.beats.forEach(function (beat) {
        assert.ok(beat.id && beat.move && beat.knowledgeRefs && beat.knowledgeRefs.length);
        moves.push(beat.move);
      });
    });
    assert.ok(moves.indexOf("notice") !== -1);
    assert.ok(moves.indexOf("name") !== -1);
    assert.ok(moves.indexOf("explain") !== -1);
    assert.ok(moves.indexOf("practise") !== -1);
    var loaded = global.WondiiLessonBrain;
    var brief = loaded.contentBrief({ lessonSkeleton: planned, lessonPlan: sent.lessonPlan, yearGroup: "Year 1" }, sent.lessonPlan, sent.storyPlan);
    assert.deepStrictEqual(Object.keys(brief.schema.properties.slots.properties.hook.properties), ["beats"]);
    assert.deepStrictEqual(Object.keys(brief.schema.properties.slots.properties.hook.properties.beats.items.properties).sort(), ["cue", "id", "text"]);
    assert.ok(!brief.schema.properties.slots.properties.apply.properties.knowledgeUsed);
    assert.ok(!brief.schema.properties.slots.properties.check.properties.knowledgeChecked);
    var adventure = body.adventure;
    assert.strictEqual(adventure.activities.length, 7);
    adventure.activities.forEach(function (activity, index) {
      var slot = planned[index];
      assert.strictEqual(activity.slotId, slot.id);
      assert.strictEqual(activity.beats.length, slot.beats.length);
      activity.beats.forEach(function (beat, beatIndex) {
        assert.strictEqual(beat.id, slot.beats[beatIndex].id);
        assert.strictEqual(beat.move, slot.beats[beatIndex].move);
        assert.deepStrictEqual(beat.knowledgeRefs, slot.beats[beatIndex].knowledgeRefs);
        assert.ok(beat.pupil && beat.pupil.text);
        assert.ok(beat.pupil.text.indexOf("Do not explain yet") === -1);
        assert.ok(beat.pupil.text.indexOf("Use the new knowledge") === -1);
      });
      assert.notStrictEqual(activity.title, activity.purpose);
      assert.ok((activity.config.lines || []).join(" ").indexOf("Do not explain yet") === -1);
    });
    var scened = Creator.slidesFor(adventure);
    assert.ok(scened.length >= 4 && scened.length < 7, "a beat adventure plays as scenes");
    assert.ok(scened.every(function (slide) { return slide.sceneId && slide.sceneLabel; }));
    assert.strictEqual(scened[scened.length - 1].purpose, "finish");
    assert.deepStrictEqual(scened.map(function (slide) { return slide.beatIds; }).reduce(function (all, ids) { return all.concat(ids); }, []),
      adventure.activities.reduce(function (all, activity) { return all.concat(activity.beats.map(function (beat) { return beat.id; })); }, []));
    var slides = Creator.stageSlides(adventure);
    assert.strictEqual(slides.length, 7);
    slides.forEach(function (slide, index) {
      assert.strictEqual(slide.beats.length, adventure.activities[index].beats.length);
      assert.strictEqual(typeof slide.visualAssetId, "string");
      var play = { beat: 0, index: index, step: 0, revealed: false, slipped: false };
      var guard = 0;
      while (play.beat < slide.beats.length - 1 && guard < 8) {
        var step = Shell.advancePlay(slide, play);
        assert.strictEqual(step.stage, false);
        play = step.play;
        guard += 1;
      }
      assert.strictEqual(Shell.advancePlay(slide, play).stage, true);
    });
    var apply = slides.filter(function (slide) { return slide.mechanic === "move" || (slide.interaction && slide.interaction.type); })[0];
    var applySlide = slides[3];
    assert.ok(applySlide.interaction && applySlide.interaction.type);
    assert.strictEqual(Shell.primaryLabel(applySlide, { beat: 0, step: 0, revealed: false, slipped: false }, 3, slides.length, null), "");
    var checkSlide = slides[4];
    assert.strictEqual(Shell.primaryLabel(checkSlide, { beat: 0 }, 4, slides.length, { answered: false, index: 0, count: 1 }), "");
    assert.strictEqual(slides[5].kicker === "Home" || slides[5].type === "story" || adventure.activities[5].slotId === "resolution", true);
    assert.strictEqual(adventure.activities[5].slotId, "resolution");
    assert.strictEqual(adventure.activities[6].slotId, "recap");
    assert.ok(apply || applySlide);
    var legacy = Creator.slidesFor({
      activities: [{ mechanic: "story", title: "Arrival", config: { lines: ["The old opening stays.", "The old second line stays."] }, scene: { beat: "beginning" } }]
    });
    assert.ok(!legacy[0].beats);
    var shown = Mechanics.render(legacy[0], { immersed: true, interact: { beat: 0 } }).html;
    assert.ok(shown.indexOf("The old opening stays.") !== -1);
    assert.ok(shown.indexOf("The old second line stays.") !== -1);
    assert.strictEqual(Shell.advancePlay(legacy[0], { beat: 0 }).stage, true);
    console.log("generation path tests passed");
  });
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
