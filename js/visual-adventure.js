/*
 * Wondii visual adventure engine.
 * Plans a few major scenes, writes a controlled image instruction, and keeps
 * the lesson playable when a picture fails. Image generation stays off unless
 * a caller passes the prototype flag. This file does not call an image API.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.WondiiVisualAdventure = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var PROTOTYPE = "year5-volcano-9.8";
  var ART_DIRECTION = "Premium children's adventure illustration. Cinematic composition, polished illustrated environments, strong depth, and expressive fictional characters with natural proportions. Children's publishing and animated-adventure quality: rich, colourful, and clear, suitable for an interactive whiteboard. The same world and the same characters must stay recognisable from scene to scene. Age-appropriate. Educational objects are clearly visible. No clipart, no cheap vector characters, no stock-illustration look, no photorealistic children, no giant smiling cartoon heads, and no decorative filler.";

  var LOOKS = [
    {
      characterId: "CHARACTER_A",
      appearance: "a young fictional science explorer with dark curly hair",
      clothing: "a yellow field jacket",
      signatureItem: "a small science backpack and a notebook",
      visualTraits: "curious and capable, natural proportions, not a giant head"
    },
    {
      characterId: "CHARACTER_B",
      appearance: "a young fictional explorer with short black hair",
      clothing: "a rust-red scarf over an olive shirt",
      signatureItem: "a canvas satchel and binoculars",
      visualTraits: "steady and observant, natural proportions, not a giant head"
    },
    {
      characterId: "CHARACTER_C",
      appearance: "a young fictional explorer with auburn hair tied back",
      clothing: "a teal utility vest",
      signatureItem: "a rolled map",
      visualTraits: "calm and practical, natural proportions, not a giant head"
    },
    {
      characterId: "CHARACTER_D",
      appearance: "a young fictional explorer with straight brown hair",
      clothing: "a navy knitted jumper",
      signatureItem: "a yellow pencil case",
      visualTraits: "thoughtful and ready, natural proportions, not a giant head"
    }
  ];

  var SAFETY = "Primary-school classroom. No graphic injury, gore, horror, sexual content, real-child likenesses, or unsafe behaviour shown as a demonstration. Exciting and mysterious, not frightening.";
  var NO_TEXT = "Do not draw any words, letters, numbers, labels, captions, signs, titles, buttons, or diagrams with writing. The picture is the place. Interface text is added later.";
  var COMPOSITION = "Widescreen 16:9 classroom composition. Leave the lower third and the left side quieter so panels can sit there. Place the important subjects in the centre and right, with depth from foreground to a distant landmark. Do not hide the main subject behind the quiet areas.";

  function yearOf(adventure) {
    var year = Number(adventure && (adventure.year || adventure.yearGroup));
    return year >= 1 && year <= 6 ? year : 0;
  }

  function ageBand(year) {
    if (year <= 2) return "about 5 to 7 years old";
    if (year <= 4) return "about 7 to 9 years old";
    return "about 9 to 11 years old";
  }

  function ageDirection(year) {
    if (year <= 2) return "For younger children: simpler shapes, fewer objects, gentle colour, still a polished illustration rather than preschool clipart.";
    if (year <= 4) return "For this age: a clear adventure scene, readable objects, and characters who look like older children in a story, not toddlers.";
    return "For older primary pupils: more sophisticated lighting, architecture, and scientific detail. Avoid a nursery or preschool style.";
  }

  function beatOf(activity) {
    var scene = activity && activity.scene;
    return (scene && scene.beat) || (activity && activity.beat) || "";
  }

  function briefOf(activity) {
    var scene = (activity && activity.scene) || {};
    var brief = scene.visualBrief || {};
    return {
      sceneType: brief.sceneType || scene.kind || activity.mechanic || "story",
      setting: brief.setting || scene.setting || "",
      subjects: brief.subjects || [],
      action: brief.action || "",
      importantObjects: brief.importantObjects || [],
      educationalFocus: brief.educationalFocus || "",
      mood: brief.mood || ""
    };
  }

  function assetType(beat, mechanic) {
    if (beat === "resolution") return "resolution";
    if (beat === "debrief" || mechanic === "mystery") return "debrief";
    if (mechanic === "quiz" || mechanic === "question") return "question";
    if (mechanic === "doors") return "decision";
    if (mechanic === "spin") return "role";
    if (beat === "discovery" || beat === "development") return "teaching_visual";
    return "story_scene";
  }

  function findBeat(activities, beat) {
    for (var i = 0; i < activities.length; i++) {
      if (beatOf(activities[i]) === beat) return activities[i];
    }
    return null;
  }

  function defineCharacters(story, year) {
    var people = (story && story.characters) || [];
    return people.slice(0, LOOKS.length).map(function (person, index) {
      var look = LOOKS[index];
      return {
        characterId: look.characterId,
        roleId: person.id || look.characterId,
        roleLabel: person.label || "Explorer",
        ageBand: ageBand(year),
        appearance: look.appearance,
        clothing: look.clothing,
        signatureItem: look.signatureItem,
        visualTraits: look.visualTraits
      };
    });
  }

  function describeCharacters(characters) {
    return characters.map(function (person) {
      var identity = person.faceTraits
        ? person.characterId + " is the same fictional person every time. Face: " + person.faceTraits + ". Hair: " + person.hair + ". Skin: " + person.skinTone + ". Body: " + person.bodyProportions + ". Clothes: " + person.clothing + ". Footwear: " + person.footwear + ". Signature item: " + person.signatureItem + ". Colours: " + person.colourPalette + ". " + (person.wondiiStyleTraits || "")
        : person.characterId + " is " + person.appearance + ", wearing " + person.clothing + ", carrying " + person.signatureItem + ". " + person.visualTraits + ".";
      return identity + " This character is fictional and is not a portrait of a real pupil. Whenever " + person.characterId + " appears, keep this exact face, hair, clothes, shoes, and colours. Change the pose, expression, camera, and place.";
    }).join(" ");
  }

  var STAGE_ORDER = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];
  var STAGE_SHOTS = {
    hook: { shotType: "wide establishing", cameraDistance: "far", cameraAngle: "looking across the place", location: "the adventure setting", uiSafeArea: "LOWER_LEFT" },
    investigate: { shotType: "closer inspection", cameraDistance: "medium", cameraAngle: "toward one detail", location: "the same place, a detail to notice", uiSafeArea: "RIGHT" },
    teach: { shotType: "teaching view", cameraDistance: "medium-close", cameraAngle: "a clear model in the world", location: "inside the same adventure", uiSafeArea: "LOWER_RIGHT" },
    apply: { shotType: "task scene", cameraDistance: "medium", cameraAngle: "the objects the task needs", location: "the same world, ready for the task", uiSafeArea: "LEFT" },
    check: { shotType: "question scene", cameraDistance: "medium", cameraAngle: "the question in the world", location: "the same world, nothing marked as the answer", uiSafeArea: "LOWER_LEFT" },
    resolution: { shotType: "mission payoff", cameraDistance: "medium-wide", cameraAngle: "eye level, back where it began", location: "the place the adventure began", uiSafeArea: "RIGHT" },
    recap: { shotType: "closing gathering", cameraDistance: "near", cameraAngle: "after the payoff", location: "the same adventure, after the mission", uiSafeArea: "LOWER_RIGHT" }
  };
  var STAGE_LINES = {
    hook: "Hook photograph. Establish this world and the unresolved mission. Do not reveal the teaching answer.",
    investigate: "Investigate photograph. Stay in this same world. Show something the class can inspect, notice, compare, or question. Do not teach the answer yet.",
    teach: "Teach photograph. Make the taught idea understandable while staying inside this adventure. Do not copy the investigate camera.",
    apply: "Apply photograph. A new composition for the task. The objects the class must use are visible in the scene. Do not reuse the teaching composition.",
    check: "Check photograph. A distinct scene for the question. Do not mark, circle, glow, or point at a correct choice. Do not arrange the picture so one answer is obvious. Do not show which choice is correct.",
    resolution: "Resolution photograph. Show the payoff of completing the original mission. The place from the hook is recognisable. This is not the arrival camera and not the teaching model.",
    recap: "Recap photograph. Close this same adventure and reinforce what was discovered. Do not reuse the resolution composition."
  };

  function stagedActivities(activities) {
    var found = {};
    (activities || []).forEach(function (activity) {
      var id = String(activity && activity.slotId || "").toLowerCase();
      if (STAGE_SHOTS[id] && !found[id]) found[id] = activity;
    });
    var complete = STAGE_ORDER.every(function (id) { return found[id]; });
    return complete ? found : null;
  }

  function checkAnswerText(activity) {
    var quiz = (activity && activity.config) || {};
    var question = (quiz.questions && quiz.questions[0]) || {};
    var value = quiz.correct != null ? quiz.correct : question.correct;
    return String(value == null ? "" : value).trim();
  }

  function stripAnswer(text, answer) {
    var value = String(text || "");
    var token = String(answer || "").trim();
    if (token.length < 3) return value;
    var escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return value.replace(new RegExp(escaped, "ig"), "").replace(/\s{2,}/g, " ").trim();
  }

  function stageBrief(slotId, activity, adventure) {
    var story = (adventure && adventure.storyPlan) || {};
    var continuity = story.continuity || {};
    var scene = (activity && activity.scene) || {};
    var visual = briefOf(activity);
    var context = (activity && activity.visualContext) || {};
    var interaction = (scene.interaction) || ((scene.interactions || [])[0]) || {};
    var quiz = (activity && activity.config) || {};
    var question = (quiz.questions && quiz.questions[0]) || {};
    var setting = continuity.setting || story.setting || visual.setting || "";
    var objects = (visual.importantObjects || []).slice();
    (continuity.objects || []).forEach(function (item) {
      if (objects.indexOf(item) < 0) objects.push(item);
    });
    (context.importantObjects || []).forEach(function (item) {
      if (objects.indexOf(item) < 0) objects.push(item);
    });
    var evidence = "";
    var answer = slotId === "check" ? checkAnswerText(activity) : "";
    var action = visual.action || "";
    var focus = visual.educationalFocus || "";
    var task = null;
    if (slotId === "hook") {
      action = action || (activity && activity.config && activity.config.lines && activity.config.lines[0]) || story.mission || "";
      focus = focus || "The mission is still unresolved.";
    } else if (slotId === "investigate") {
      action = action || (interaction.instruction || "") || (activity && activity.config && activity.config.lines && activity.config.lines[0]) || "";
      focus = focus || "Something here can be noticed. The answer is not taught yet.";
    } else if (slotId === "teach") {
      action = action || (activity && activity.config && activity.config.lines && activity.config.lines[0]) || "";
      focus = focus || (activity && activity.why) || context.concept || "";
    } else if (slotId === "apply") {
      action = (activity && activity.applyInstruction) || interaction.instruction || action;
      focus = (activity && activity.knowledgeUsed) || (activity && activity.teachingConnection) || focus;
      if (interaction.target && objects.indexOf(interaction.target) < 0) objects.push(interaction.target);
      task = {
        instruction: (activity && activity.applyInstruction) || interaction.instruction || "",
        target: interaction.target || "",
        knowledgeUsed: (activity && activity.knowledgeUsed) || "",
        successCondition: (activity && activity.successCondition) || interaction.successCondition || "",
        teachingConnection: (activity && activity.teachingConnection) || ""
      };
    } else if (slotId === "check") {
      evidence = (activity && activity.requiredEvidence) || (adventure && adventure.requiredEvidence) || (adventure && adventure.lessonPlan && adventure.lessonPlan.requiredEvidence) || "";
      evidence = stripAnswer(evidence, answer);
      action = stripAnswer(question.prompt || quiz.prompt || "", answer);
      focus = stripAnswer((question.teachingConnection || quiz.teachingConnection || ""), answer);
      objects = objects.map(function (item) { return stripAnswer(item, answer); }).filter(Boolean);
    } else if (slotId === "resolution") {
      action = action || story.ending || "The original mission reaches its payoff.";
      focus = focus || story.mission || "";
    } else if (slotId === "recap") {
      action = action || (activity && activity.config && activity.config.lines && activity.config.lines[0]) || "The class closes the same adventure.";
      focus = focus || "What the class discovered.";
    }
    return {
      setting: setting,
      action: action,
      educationalFocus: focus,
      mood: visual.mood || (story && story.tone) || "",
      importantObjects: objects.slice(0, 8),
      task: task,
      evidence: evidence
    };
  }

  function stageAsset(slotId, activity, adventure) {
    var brief = stageBrief(slotId, activity, adventure);
    var shot = STAGE_SHOTS[slotId];
    return {
      id: slotId,
      slotId: slotId,
      type: slotId === "teach" ? "teaching_visual" : (slotId === "check" ? "question" : (slotId === "resolution" || slotId === "recap" ? slotId : "story_scene")),
      usedByScenes: [activity.title || slotId],
      generationRequired: true,
      brief: {
        setting: brief.setting,
        action: brief.action,
        educationalFocus: brief.educationalFocus,
        mood: brief.mood,
        importantObjects: brief.importantObjects
      },
      importantObjects: brief.importantObjects,
      interaction: brief.task,
      evidence: slotId === "check" ? brief.evidence || "" : "",
      shot: shot,
      uiSafeArea: shot.uiSafeArea,
      status: "planned"
    };
  }

  function planVisualAssets(adventure) {
    var activities = (adventure && adventure.activities) || [];
    var staged = stagedActivities(activities);
    if (staged) {
      return STAGE_ORDER.map(function (id) { return stageAsset(id, staged[id], adventure); });
    }
    var opening = findBeat(activities, "beginning") || activities[0] || null;
    var discovery = findBeat(activities, "discovery") || findBeat(activities, "development");
    var resolution = findBeat(activities, "resolution");
    var majors = [];
    function pushMajor(id, type, activity) {
      if (!activity || majors.some(function (item) { return item.activity === activity; })) return;
      majors.push({ id: id, type: type, activity: activity });
    }
    pushMajor("opening", "story_scene", opening);
    pushMajor("discovery", "teaching_visual", discovery);
    pushMajor("resolution", "resolution", resolution);
    var byActivity = {};
    majors.forEach(function (major) { byActivity[major.activity.title || major.id] = major.id; });
    activities.forEach(function (activity) {
      var title = activity.title || "";
      if (byActivity[title]) return;
      var beat = beatOf(activity);
      if (beat === "debrief" || activity.mechanic === "mystery") byActivity[title] = "resolution";
      else if (beat === "investigation") byActivity[title] = "opening";
      else if (beat === "prediction" || beat === "application" || activity.mechanic === "quiz" || activity.mechanic === "question") byActivity[title] = discovery ? "discovery" : "opening";
      else byActivity[title] = "opening";
    });
    return majors.map(function (major) {
      var used = [];
      Object.keys(byActivity).forEach(function (title) {
        if (byActivity[title] === major.id && used.indexOf(title) < 0) used.push(title);
      });
      var brief = briefOf(major.activity);
      return {
        id: major.id,
        type: major.type,
        usedByScenes: used,
        generationRequired: true,
        brief: brief,
        importantObjects: brief.importantObjects,
        shot: SHOTS[major.id] || null,
        uiSafeArea: SHOTS[major.id] ? SHOTS[major.id].uiSafeArea : "",
        status: "planned"
      };
    });
  }

  function continuityLine(story) {
    var continuity = (story && story.continuity) || {};
    var parts = [];
    if (continuity.setting) parts.push("Keep this world: " + continuity.setting + ".");
    if (continuity.objects && continuity.objects.length) parts.push("Keep these landmarks visible when they belong in the scene: " + continuity.objects.join(", ") + ".");
    if (story && story.setting) parts.push("Setting: " + story.setting);
    return parts.join(" ");
  }

  function sceneInstruction(asset) {
    var brief = asset.brief || {};
    if (asset.id === "discovery") {
      return "Show what is happening inside and beneath the same volcano, in a way a Year 5 class can understand: molten magma, pressure building, and magma moving upwards towards the surface. A cutaway of the ground and the volcano can make that visible. No written labels. The outside of this volcano, the coastal town, and the field station should still be recognisable.";
    }
    if (asset.id === "resolution") {
      return "The investigation has reached its conclusion. The same fictional explorers are presenting what they found, in the same coastal town, with the same volcano and field station still recognisable. The scene should feel earned and calm. Do not show the characters smiling at the camera.";
    }
    var bits = [];
    if (brief.setting) bits.push(brief.setting);
    if (brief.action) bits.push(brief.action);
    if (brief.educationalFocus) bits.push("The scene should make this visible: " + brief.educationalFocus + ".");
    if (brief.mood) bits.push("Mood: " + brief.mood + ".");
    return bits.join(" ");
  }

  function buildVisualPrompt(adventure, asset, characters) {
    var year = yearOf(adventure);
    var story = (adventure && adventure.storyPlan) || {};
    return [
      ART_DIRECTION,
      ageDirection(year),
      "Age band: " + ageBand(year) + ".",
      COMPOSITION,
      NO_TEXT,
      SAFETY,
      continuityLine(story),
      describeCharacters(characters || []),
      sceneInstruction(asset),
      asset.importantObjects && asset.importantObjects.length ? "Important objects that must be visually distinct so a later interaction can point at them: " + asset.importantObjects.join(", ") + "." : ""
    ].filter(Boolean).join("\n");
  }

  function hashBrief(text) {
    var h = 5381;
    var value = String(text || "");
    for (var i = 0; i < value.length; i++) h = ((h << 5) + h) + value.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  var PROTOTYPE_98A = "year5-volcano-9.8a";
  var PROTOTYPE_98B = "year5-volcano-9.8b";
  var WONDII_STYLE = "Wondii adventure art. Soft rounded 3D, the same family as Wondii's existing children: large bright eyes with catchlights, soft brows, small nose, rosy cheeks, simplified hands, rounded shoes, and form made by warm light rather than ink outlines. School-age proportions, like children walking on a path, with a slightly larger head than real life. Rich storybook environments, clear depth, bright but not garish colour, navy shadows, warm sunlight. Year 5 scenes carry more scientific and architectural detail. They stay in this Wondii family rather than becoming nursery clipart or a different animated-film style. No photorealistic children. No giant toddler heads. No text.";
  var WORLD_ANCHOR = {
    setting: "A coastal town on a blue harbour beneath one distinctive cone volcano with a notch in the rim.",
    landmarks: ["notched cone volcano", "white harbour lighthouse", "pale monitoring station with a round dome", "yellow rounded research vehicle"],
    architecture: "Warm stone houses, terracotta roofs, a curved harbour wall.",
    environmentPalette: "Sea blue, warm stone, green hills, gold sunlight, navy shade.",
    importantObjects: ["monitoring tripod", "field case", "notebook", "binoculars", "rolled map"],
    storyObjects: ["cracked ground", "magma chamber", "gas pockets", "conduit toward the surface"]
  };
  var SHOTS = {
    opening: {
      shotType: "wide establishing",
      cameraAngle: "high, looking along the coast toward the volcano",
      cameraDistance: "far",
      characterFocus: "three small Wondii explorers in the mid-ground, part of the landscape",
      environmentFocus: "the whole town, harbour, lighthouse, and volcano",
      actionFocus: "arriving to investigate a faint crack and a tremor",
      educationalFocus: "a volcano above a living coastal town",
      uiSafeArea: "LOWER_LEFT",
      location: "exterior coast",
      continuityRequirements: "Establish the notched volcano, lighthouse, dome station, and yellow vehicle."
    },
    discovery: {
      shotType: "educational cutaway",
      cameraAngle: "side section through the volcano",
      cameraDistance: "medium, science fills the frame",
      characterFocus: "the same explorers small at the crater rim, looking in",
      environmentFocus: "the inside of the volcano",
      actionFocus: "observing what is underground",
      educationalFocus: "magma chamber, gas pockets, pressure, and magma moving upward",
      uiSafeArea: "RIGHT",
      location: "volcano cross-section",
      continuityRequirements: "The outside silhouette of this same notched volcano stays recognisable. No labels."
    },
    resolution: {
      shotType: "medium-wide mission completion",
      cameraAngle: "inside the monitoring station, eye level",
      cameraDistance: "medium",
      characterFocus: "the same three explorers using their notes to explain the findings",
      environmentFocus: "the station interior, with the same volcano visible through a wide window",
      actionFocus: "completing the mission for the town",
      educationalFocus: "the investigation has reached its conclusion",
      uiSafeArea: "LOWER_RIGHT",
      location: "monitoring station interior",
      continuityRequirements: "Same faces, clothes, and signature items. The volcano, lighthouse, and yellow vehicle are visible outside. Do not return to the hillside camera."
    }
  };

  function journeyGuidance(minutes) {
    var length = Number(minutes) || 0;
    if (length <= 8) return { minutes: length, scenes: [3, 4], interactions: [1, 2], guidance: true };
    if (length <= 15) return { minutes: length, scenes: [5, 7], interactions: [2, 4], guidance: true };
    if (length <= 30) return { minutes: length, scenes: [7, 10], interactions: [4, 6], guidance: true };
    return { minutes: length, scenes: [9, 14], interactions: [5, 8], guidance: true };
  }

  function shotFor(asset) {
    return (asset && asset.shot) || SHOTS[asset && asset.id] || null;
  }

  function diversityIssues(assets) {
    var issues = [];
    var seen = {};
    (assets || []).forEach(function (asset) {
      if (!asset.generationRequired) return;
      var shot = shotFor(asset);
      if (!shot) {
        issues.push(asset.id + " has no shot plan");
        return;
      }
      var key = [shot.shotType, shot.cameraDistance, shot.location].join("|");
      if (seen[key]) issues.push(asset.id + " repeats the composition of " + seen[key]);
      else seen[key] = asset.id;
    });
    return issues;
  }

  function safeAreaLine(area) {
    var lines = {
      LOWER_LEFT: "Leave the lower-left third as open sea, sky, or empty path. Keep faces, hands, and important objects out of that corner.",
      RIGHT: "Leave the right third visually quiet, as plain rock or sky, so labels can sit there. Keep faces and the magma chamber away from that edge.",
      LOWER_RIGHT: "Leave the lower-right as clear floor or a quiet wall. Keep faces, hands, and the volcano view out of that corner."
    };
    return lines[area] || "Leave one quiet region for interface panels.";
  }

  function buildExperiencePrompt(adventure, asset, characters) {
    var shot = shotFor(asset);
    var year = yearOf(adventure);
    var different = asset.id === "opening"
      ? "This is the first picture of the adventure."
      : "Do not reproduce the previous composition. Change the camera, the distance, the location, the poses, and what sits in the foreground.";
    return [
      WONDII_STYLE,
      ageDirection(year),
      "Age band: " + ageBand(year) + ".",
      "World anchor: " + WORLD_ANCHOR.setting + " Landmarks: " + WORLD_ANCHOR.landmarks.join(", ") + ". Architecture: " + WORLD_ANCHOR.architecture + " Palette: " + WORLD_ANCHOR.environmentPalette,
      describeCharacters(characters || []),
      shot ? ["Shot: " + shot.shotType + ".", "Camera: " + shot.cameraAngle + ", " + shot.cameraDistance + ".", "Characters: " + shot.characterFocus + ".", "Environment: " + shot.environmentFocus + ".", "Action: " + shot.actionFocus + ".", "Learning to make visible: " + shot.educationalFocus + ".", "Continuity: " + shot.continuityRequirements].join(" ") : "",
      shot ? safeAreaLine(shot.uiSafeArea) : "",
      different,
      NO_TEXT,
      SAFETY,
      "Style reference images show Wondii's existing characters. Match their eye language, softness, and warmth. Do not copy their cottage, fox, uniforms, tablet, or poses. Do not draw a real pupil."
    ].filter(Boolean).join("\n");
  }

  function defineExperienceCharacters(year) {
    var style = "Wondii style: large bright eyes with catchlights, soft rounded 3D face, rosy cheeks, simplified hands, school-age proportions. Fictional. Not a portrait of a real pupil. Not a toddler and not a photorealistic child.";
    var body = "school-age child, slightly larger head than real life, simplified hands, standing about the same height as the other two";
    return [
      {
        characterId: "CHARACTER_A",
        roleId: "LEAD_SCIENTIST",
        roleLabel: "Lead Scientist",
        canonicalReference: "characters",
        ageBand: ageBand(year),
        faceTraits: "round soft face, large brown eyes with catchlights, soft brows, small nose, rosy cheeks",
        hair: "short dark curly hair",
        skinTone: "warm brown",
        bodyProportions: body,
        appearance: "a fictional Wondii child with warm brown skin, short dark curly hair, and large brown eyes",
        clothing: "a yellow field jacket over a cream shirt",
        footwear: "brown rounded boots",
        signatureItem: "a small rounded science backpack and a notebook",
        colourPalette: "yellow jacket, cream shirt, brown boots, warm brown skin",
        visualTraits: style,
        wondiiStyleTraits: "soft 3D, bright eyes, rounded forms, warm light, no ink outlines"
      },
      {
        characterId: "CHARACTER_B",
        roleId: "NAVIGATOR",
        roleLabel: "Navigator",
        canonicalReference: "characters",
        ageBand: ageBand(year),
        faceTraits: "soft oval face, large dark eyes with catchlights, soft brows, small nose, rosy cheeks",
        hair: "short straight black hair with a side part",
        skinTone: "light brown",
        bodyProportions: body,
        appearance: "a fictional Wondii child with light brown skin, short black hair, and large dark eyes",
        clothing: "a rust-red scarf over an olive shirt",
        footwear: "brown rounded boots",
        signatureItem: "binoculars on a strap",
        colourPalette: "rust-red scarf, olive shirt, brown boots, light brown skin",
        visualTraits: style,
        wondiiStyleTraits: "soft 3D, bright eyes, rounded forms, warm light, no ink outlines"
      },
      {
        characterId: "CHARACTER_C",
        roleId: "RESEARCHER",
        roleLabel: "Researcher",
        canonicalReference: "characters",
        ageBand: ageBand(year),
        faceTraits: "soft heart-shaped face, large hazel eyes with catchlights, soft brows, small nose, rosy cheeks",
        hair: "auburn hair in a low soft ponytail",
        skinTone: "fair",
        bodyProportions: body,
        appearance: "a fictional Wondii child with fair skin, auburn hair in a soft ponytail, and large hazel eyes",
        clothing: "a teal vest over a warm white shirt",
        footwear: "brown rounded boots",
        signatureItem: "a rolled map",
        colourPalette: "teal vest, warm white shirt, brown boots, fair skin, auburn hair",
        visualTraits: style,
        wondiiStyleTraits: "soft 3D, bright eyes, rounded forms, warm light, no ink outlines"
      }
    ];
  }

  function dummyClass() {
    return [
      { id: "sofia", name: "Sofia" },
      { id: "jack", name: "Jack" },
      { id: "amelia", name: "Amelia" },
      { id: "oliver", name: "Oliver" },
      { id: "maya", name: "Maya" }
    ];
  }

  function rolePlaceholders() {
    return [
      { id: "LEAD_SCIENTIST", label: "Lead Scientist", characterId: "CHARACTER_A" },
      { id: "NAVIGATOR", label: "Navigator", characterId: "CHARACTER_B" },
      { id: "RESEARCHER", label: "Researcher", characterId: "CHARACTER_C" }
    ];
  }

  function avatarKey(pupil, yearLabel) {
    pupil = pupil || {};
    var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
    var presentation = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : "";
    var length = presentation === "boy" ? "short" : (presentation === "girl" ? "long" : (pupil.length === "long" ? "long" : "short"));
    var year = String(yearLabel || pupil.year || "");
    var prefix = /(?:^|\b)(?:year\s*1|reception)\b/i.test(year) ? "5-" : (/(?:^|\b)year\s*[23]\b/i.test(year) ? "6-" : (/(?:^|\b)year\s*[56]\b/i.test(year) ? "10-" : ""));
    return prefix + hair + "-" + length;
  }

  function avatarUrl(avatarId) {
    var id = String(avatarId || "");
    if (!/^kid-(?:5-|6-|10-)?(?:brown|black|blonde|auburn)-(?:long|short)$/.test(id)) return "";
    return "../../games/images/schools/room/" + id + ".webp";
  }

  function bindFeatured(pupils, yearLabel, story) {
    var roles = ((story && story.characters) || []).filter(function (role) {
      return role && (role.label || role.id);
    }).slice(0, 4);
    var used = {};
    var cast = [];
    (pupils || []).forEach(function (pupil) {
      if (!pupil || cast.length >= 4) return;
      if (roles.length && cast.length >= roles.length) return;
      var key = avatarKey(pupil, yearLabel);
      if (used[key]) return;
      used[key] = true;
      var role = roles[cast.length] || { id: "explorer", label: "Explorer" };
      var givenId = role.characterId && /^CHARACTER_[ABCD]$/.test(role.characterId) ? role.characterId : ["CHARACTER_A", "CHARACTER_B", "CHARACTER_C", "CHARACTER_D"][cast.length];
      cast.push({
        characterId: givenId,
        avatarId: "kid-" + key,
        pupilId: pupil.id || pupil.pupilId || "",
        roleId: role.id || "",
        roleLabel: role.label || "Explorer"
      });
    });
    return cast;
  }

  function avatarRefs(cast) {
    return (cast || []).map(function (item) {
      return { characterId: item.characterId, avatarId: item.avatarId, roleLabel: item.roleLabel || "Explorer" };
    }).filter(function (item) { return item.characterId && item.avatarId; });
  }

  function avatarDirection(adventure) {
    var refs = (adventure && adventure.avatarRefs) || [];
    if (!refs.length) return "";
    return refs.map(function (item) {
      return item.characterId + " is the established Wondii character in the reference named " + item.avatarId + ".webp. Keep that face, hair, clothes, colours, and proportions. Change only the pose, expression, and place. The character may walk, point, look, hold an object, investigate, or celebrate. Do not replace them with a different child.";
    }).join(" ") + " The kid- images are identity references, not the scene. Do not copy their empty background or their standing cutout pose. Do not write a name.";
  }

  function lookAt(id, index) {
    var found = null;
    LOOKS.forEach(function (look) { if (look.characterId === id) found = look; });
    return found || LOOKS[index] || LOOKS[0];
  }

  function featuredCast(story) {
    var roles = ((story && story.characters) || []).filter(function (role) {
      return role && (role.label || role.id) && !/\b(villain|fool|idiot|stupid|culprit|failure)\b/i.test(role.label || "");
    }).slice(0, LOOKS.length);
    if (!roles.length) return [];
    return roles.map(function (role, index) {
      var look = lookAt(role.characterId, index);
      return {
        characterId: look.characterId,
        roleId: role.id || look.characterId,
        storyRole: role.label || "Explorer",
        appearance: look.appearance,
        clothing: look.clothing,
        signatureItem: look.signatureItem,
        visualTraits: look.visualTraits,
        characterRegions: Array.isArray(role.characterRegions) ? role.characterRegions : []
      };
    });
  }

  function characterForRole(story, roleLabel) {
    var found = "";
    featuredCast(story).forEach(function (role) {
      if (!found && roleLabel && String(role.storyRole).toLowerCase() === String(roleLabel).toLowerCase()) found = role.characterId;
    });
    return found;
  }

  function presentPeople(participants) {
    return (participants || []).filter(function (person) {
      if (!person || person.here === false || person.absent) return false;
      var name = person.firstName || person.displayName || person.name || "";
      return name && name !== "Pupil";
    });
  }

  function samePerson(item, id) {
    return !!(item && id && (item.id === id || item.pupilId === id));
  }

  function sessionCast(participants, storyOrCast, seed, overrides, featuredPins) {
    var featured = Array.isArray(storyOrCast) ? storyOrCast : featuredCast(storyOrCast);
    var people = presentPeople(participants);
    var limit = Math.min(featured.length, people.length, 4);
    featured = featured.slice(0, limit);
    var n = 0;
    String(seed || "wondii").split("").forEach(function (ch, index) { n = (n + ch.charCodeAt(0) * (index + 1)) % 997; });
    var start = people.length ? n % people.length : 0;
    var pinned = {};
    (featuredPins || []).forEach(function (item) {
      if (item && item.characterId && item.pupilId) pinned[item.characterId] = item;
    });
    var seats = featured.map(function (role, index) {
      var pin = pinned[role.characterId];
      var person = null;
      if (pin) people.forEach(function (item) { if (!person && samePerson(item, pin.pupilId)) person = item; });
      if (!person && people.length) person = people[(start + index) % people.length];
      return { role: role, person: person, avatarId: pin && pin.avatarId || "" };
    });
    var seen = {};
    seats.forEach(function (seat) {
      var id = seat.person && (seat.person.id || seat.person.pupilId);
      if (!id) return;
      if (seen[id]) seat.person = null;
      else seen[id] = true;
    });
    Object.keys(overrides || {}).forEach(function (characterId) {
      var next = null;
      people.forEach(function (item) { if (samePerson(item, overrides[characterId])) next = item; });
      if (!next) return;
      var target = null;
      seats.forEach(function (seat) { if (seat.role.characterId === characterId) target = seat; });
      if (!target || (target.person && samePerson(target.person, next.id))) return;
      var displaced = target.person;
      seats.forEach(function (seat) {
        if (seat !== target && seat.person && samePerson(seat.person, next.id)) seat.person = null;
      });
      target.person = next;
      seats.forEach(function (seat) {
        if (seat.person) return;
        var used = {};
        seats.forEach(function (other) { if (other.person) used[other.person.id || other.person.pupilId] = true; });
        var spare = null;
        people.forEach(function (item) {
          if (spare || used[item.id || item.pupilId]) return;
          if (displaced && samePerson(item, displaced.id || displaced.pupilId)) return;
          spare = item;
        });
        seat.person = spare;
      });
    });
    var map = {};
    seats.forEach(function (seat) {
      var person = seat.person;
      var role = seat.role;
      var name = person ? (person.firstName || person.displayName || person.name || "") : "";
      map[role.characterId] = {
        characterId: role.characterId,
        pupilId: person ? (person.pupilId || person.id || "") : "",
        firstName: name,
        storyRole: role.storyRole,
        roleId: role.roleId,
        clothing: role.clothing,
        signatureItem: role.signatureItem,
        avatarId: seat.avatarId || "",
        characterRegions: role.characterRegions || []
      };
    });
    return map;
  }

  function reliableRegions(regions) {
    return (regions || []).filter(function (box) {
      return box && ["x", "y", "width", "height"].every(function (key) {
        var value = Number(box[key]);
        return value >= 0 && value <= 1;
      });
    });
  }

  function assignRoles(pupils, roles) {
    var people = pupils || [];
    return (roles || rolePlaceholders()).slice(0, people.length).map(function (role, index) {
      return {
        id: role.id,
        label: role.label,
        characterId: role.characterId,
        pupilId: people[index].id,
        displayName: people[index].name,
        participation: "persistent"
      };
    });
  }

  function speakRoles(text, assignment) {
    var names = {};
    (assignment || []).forEach(function (role) { names[role.id] = role.displayName; });
    return String(text || "").replace(/\{\{([A-Z0-9_]+)\}\}/g, function (_match, id) {
      return names[id] || id;
    }); 
  }

  function participantsFromRoom(room, awayIds) {
    var away = {};
    (awayIds || []).forEach(function (id) { away[id] = true; });
    return ((room && room.pupils) || []).filter(function (pupil) {
      return pupil && pupil.id && !away[pupil.id];
    }).map(function (pupil) {
      return { id: pupil.id, name: pupil.firstName || pupil.name || "" };
    }).filter(function (pupil) { return pupil.name; });
  }

  function sessionRoleAssignments(participants, roles) {
    var assigned = assignRoles(participants, roles);
    var map = {};
    assigned.forEach(function (role) { map[role.id] = role.pupilId; });
    return { map: map, roles: assigned };
  }
 
  function reassignAbsent(session, participants, roles) {
    var here = {};
    (participants || []).forEach(function (pupil) { here[pupil.id] = pupil; });
    var specs = roles || rolePlaceholders();
    var used = {};
    var spare = (participants || []).slice();
    var rolesOut = [];
    specs.forEach(function (spec) {
      var current = (session && session.roles || []).filter(function (role) { return role.id === spec.id; })[0];
      var person = current && here[current.pupilId] ? here[current.pupilId] : null;
      if (!person) {
        person = spare.filter(function (pupil) { return !used[pupil.id]; })[0] || null; 
      }
      if (!person) return;
      used[person.id] = true;
      rolesOut.push({
        id: spec.id,
        label: spec.label,
        characterId: spec.characterId,
        pupilId: person.id,
        displayName: person.name,
        participation: "persistent"
      });
    });
    var map = {};
    rolesOut.forEach(function (role) { map[role.id] = role.pupilId; });
    return { map: map, roles: rolesOut };
  }

  function participationState(session) {
    var counts = {};
    var persistent = [];
    ((session && session.roles) || []).forEach(function (role) {
      persistent.push(role.pupilId);
      counts[role.pupilId] = (counts[role.pupilId] || 0) + 1;
    });
    return { persistentRolePupils: persistent, dynamicSelections: [], participationCount: counts };
  }

  function nextDynamicPupil(pupils, assignment, state) {
    var roles = assignment && assignment.roles ? assignment.roles : (assignment || []);
    var taken = {};
    roles.forEach(function (role) { if (role && role.pupilId) taken[role.pupilId] = true; });
    var counts = (state && state.participationCount) || {};
    var pool = (pupils || []).filter(function (pupil) { return !taken[pupil.id]; });
    pool.sort(function (a, b) { return (counts[a.id] || 0) - (counts[b.id] || 0); });
    var person = pool[0];
    if (!person) return null;
    return {
      pupilId: person.id,
      displayName: person.name,
      participation: "dynamic",
      prompt: "Mission Control needs another researcher.",
      task: "Look at the magma chamber. What do you predict happens next?"
    };
  }

  function buildCharacterSheetPrompt(characters) {
    var people = (characters || []).map(function (person) {
      if (!person.faceTraits) {
        return person.characterId + ": " + person.appearance + ", wearing " + person.clothing + ", " + person.signatureItem + ". Brown boots. " + person.visualTraits;
      }
      return [
        person.characterId + ".",
        "Face: " + person.faceTraits + ".",
        "Hair: " + person.hair + ".",
        "Skin: " + person.skinTone + ".",
        "Body: " + person.bodyProportions + ".",
        "Clothes: " + person.clothing + ".",
        "Footwear: " + person.footwear + ".",
        "Signature item: " + person.signatureItem + ".",
        "Colours: " + person.colourPalette + ".",
        person.wondiiStyleTraits + "."
      ].join(" ");
    }).join(" ");
    return [
      WONDII_STYLE,
      "A character identity sheet for one adventure. Three fictional Wondii children stand in a calm row on a plain warm cream background, full body, facing forward, arms relaxed, even spacing, nothing else in the picture.",
      "Order from left to right: CHARACTER_A, CHARACTER_B, CHARACTER_C.",
      people,
      "These are the same three people who must be recognisable later. No scenery, no volcano, no text, no labels, no logos. Do not base any face on a real child."
    ].join("\n");
  }

  function pressureInteraction() {
    return {
      interactionId: "pressure-next",
      interactionType: "prediction",
      participantMode: "WHOLE_CLASS",
      branchType: "LEARNING_CHECK",
      choices: [
        {
          id: "rise",
          text: "The magma moves toward the surface.",
          visualResponse: "upward-magma",
          consequence: "The monitoring station detects movement."
        },
        {
          id: "sink",
          text: "The magma sinks deeper because it becomes heavier.",
          visualResponse: "downward-marker",
          feedback: "The readings still show magma moving upwards. Gas and pressure are building below the volcano. What could that pressure do to the magma?"
        },
        {
          id: "cool",
          text: "The gas escapes and the magma cools in the chamber.",
          visualResponse: "pressure-held",
          feedback: "The chamber still shows the gas trapped, and the pressure is still rising. If the gas has not escaped, what can that pressure do to the magma?"
        }
      ],
      correctChoice: "rise",
      misconceptionId: "sink",
      rejoinScene: "application",
      explain: "As gas and pressure build, magma can be forced upwards through cracks towards Earth's surface."
    };
  }

  function routeChoice() {
    return {
      interactionId: "where-next",
      interactionType: "route",
      participantMode: "WHOLE_CLASS",
      branchType: "ADVENTURE_CHOICE",
      choices: [
        { id: "station", text: "Monitoring station", nextScene: "resolution" },
        { id: "rocks", text: "Rock sample site", nextScene: "sample" }
      ],
      rejoinScene: "debrief",
      requiredLearning: "Magma, gas, pressure, and movement towards the surface."
    };
  }

  function volcanoExperience() {
    var adventure = volcanoPrototype();
    adventure.storyPlan.characters = [
      { id: "LEAD_SCIENTIST", label: "Lead Scientist" },
      { id: "NAVIGATOR", label: "Navigator" },
      { id: "RESEARCHER", label: "Researcher" }
    ];
    adventure.activities = [
      { title: "Arrival", mechanic: "story", scene: { beat: "beginning", visualAssetId: "opening" } },
      { title: "Investigation", mechanic: "story", scene: { beat: "investigation", visualAssetId: "opening" } },
      { title: "The Pressure Builds", mechanic: "story", scene: { beat: "discovery", visualAssetId: "discovery" } },
      { title: "Prediction", mechanic: "story", scene: { beat: "prediction", visualAssetId: "discovery" } },
      { title: "Application", mechanic: "quiz", scene: { beat: "application", visualAssetId: "discovery", presentation: "prediction" } },
      { title: "The Final Presentation", mechanic: "story", scene: { beat: "resolution", visualAssetId: "resolution" } },
      { title: "What we learned", mechanic: "mystery", scene: { beat: "debrief", visualAssetId: "resolution" } }
    ];
    adventure.world = WORLD_ANCHOR;
    return adventure;
  }

  function visualsEnabled(request) {
    var flag = request && request.prototype;
    return flag === PROTOTYPE || flag === PROTOTYPE_98A || flag === PROTOTYPE_98B;
  }

  var VISUAL_ORGS = { "c90e0da5-3ba7-4c25-9e78-9519ffbc6f39": true };

  function visualsAllowed(request) {
    var org = request && (request.organisationId || request.orgId);
    return !!(org && VISUAL_ORGS[String(org)]);
  }

  function charactersForAdventure(adventure) {
    var year = yearOf(adventure);
    var looks = defineExperienceCharacters(year);
    var roles = ((adventure && adventure.storyPlan && adventure.storyPlan.characters) || []).slice(0, looks.length);
    if (!roles.length) roles = rolePlaceholders().slice(0, looks.length);
    return looks.slice(0, roles.length).map(function (look, index) {
      var role = roles[index] || {};
      var copy = {};
      Object.keys(look).forEach(function (key) { copy[key] = look[key]; });
      copy.roleId = role.id || look.characterId;
      copy.roleLabel = role.label || "Explorer";
      return copy;
    });
  }

  function subjectPicture(adventure, asset) {
    var text = String((adventure && adventure.subject) || "") + " " + String((adventure && adventure.topic) || "");
    text = text.toLowerCase();
    var focus = (asset && asset.brief && asset.brief.educationalFocus) || "";
    if (/math|fraction|number|times|shape/.test(text)) {
      return "Show the mathematics with objects a class can compare or share. Keep it a clear worked scene. No castle, no quest, and no written numbers.";
    }
    if (/english|grammar|adjective|sentence|writing/.test(text)) {
      return "Show the meaning of the language through what the characters do and what is in the scene. No written sentences.";
    }
    if (asset && asset.id === "discovery") {
      return "Make the lesson idea visible in this same world. A cutaway, a model, or a closer view is right when it teaches: " + (focus || "the idea") + ".";
    }
    return "";
  }

  // Deep-time topics: the explorer characters are present-day people, and no person ever saw a
  // living dinosaur. A scene with people shows the past only as fossils, skeletons or models.
  var DEEP_TIME = /\b(?:dinosaurs?|prehistoric|fossils?|jurassic|cretaceous|triassic|mesozoic|pterosaurs?|ichthyosaurs?|plesiosaurs?|sauropods?|palaeontolog\w*|paleontolog\w*)\b/i;

  function periodGuard(adventure) {
    var text = [adventure && adventure.topic, adventure && adventure.subject, adventure && adventure.title].join(" ");
    if (!DEEP_TIME.test(text)) return "";
    return "The explorers are present-day people. Dinosaurs died out millions of years before any people lived, so never show a person beside a living dinosaur. When people are in the scene, show dinosaurs only as fossils, skeletons, or museum models. A scene of living dinosaurs has no people in it. Give every animal the body features the lesson teaches, in correct proportions.";
  }

  // A deep-time place that is the living past (not a fossil dig, museum or model) cannot hold the
  // present-day explorers. Live run 9 sent "Place: a prehistoric landscape filled with dinosaurs"
  // together with three character sheets, and all four pictures put children beside living
  // dinosaurs despite the guard sentence. For such a place the characters are left out entirely.
  var PAST_AS_EVIDENCE = /\b(?:fossil\w*|skeletons?|museum\w*|models?|replicas?|casts?|dig|digs|excavat\w*|bones?|footprints?|trackways?|exhibits?|gallery|galleries)\b/i;
  function livingPastScene(adventure, place) {
    if (!periodGuard(adventure)) return false;
    var text = String(place || "");
    return DEEP_TIME.test(text) && !PAST_AS_EVIDENCE.test(text);
  }
  var NO_PEOPLE_LINE = "This picture shows living dinosaurs in their own time, millions of years before people, so there are no people in it: no children, no explorers, no characters, no human figures. Show the animals and the body features the lesson teaches clearly.";

  function buildAdventurePrompt(adventure, asset, characters) {
    var shot = shotFor(asset) || {};
    var brief = (asset && asset.brief) || {};
    var story = (adventure && adventure.storyPlan) || {};
    var year = yearOf(adventure);
    var place = brief.setting || (story.continuity && story.continuity.setting) || story.setting || (adventure && adventure.topic) || "the adventure";
    var noPeople = livingPastScene(adventure, place);
    var topic = String((adventure && (adventure.topic || adventure.subject)) || "").toLowerCase();
    var guard = /volcano|magma|erupt/.test(topic) ? "" : "Draw this lesson's own place. Do not add a volcano, a harbour science station, or another lesson's landmark.";
    return [
      WONDII_STYLE,
      ageDirection(year),
      "Age band: " + ageBand(year) + ".",
      NO_TEXT,
      SAFETY,
      guard,
      periodGuard(adventure),
      "Place: " + place + ".",
      continuityLine(story),
      noPeople ? NO_PEOPLE_LINE : avatarDirection(adventure),
      noPeople || (adventure && adventure.avatarRefs && adventure.avatarRefs.length) ? "" : describeCharacters(characters || []),
      "Camera for this moment only: " + (shot.shotType || "a clear scene") + ", " + (shot.cameraDistance || "medium") + " distance. Change pose, expression, and staging.",
      asset && asset.id === "opening" ? "Arrival photograph. A wide view of the whole place. The characters are small in the landscape. This is not a close-up." : "",
      asset && asset.id === "discovery" ? "Teaching photograph. Move much closer than the arrival. A cutaway or a clear model of the idea fills the frame. Use a different angle. The characters stay small at the edge, looking at the idea." : "",
      asset && asset.id === "resolution" && !(asset.slotId && STAGE_LINES[asset.slotId]) ? "A new photograph, eye level, back at the exploration base. The place is recognisable through an opening, but this is not the arrival camera and not the cutaway." : "",
      asset && asset.slotId && STAGE_LINES[asset.slotId] ? STAGE_LINES[asset.slotId] : "",
      asset && asset.interaction && asset.slotId === "apply" ? "Task instruction: " + (asset.interaction.instruction || "") + "." : "",
      asset && asset.interaction && asset.slotId === "apply" && asset.interaction.target ? "The task objects must be visible: " + asset.interaction.target + "." : "",
      asset && asset.interaction && asset.slotId === "apply" && asset.interaction.knowledgeUsed ? "The class uses this idea: " + asset.interaction.knowledgeUsed + "." : "",
      asset && asset.interaction && asset.slotId === "apply" && asset.interaction.successCondition ? "The task is complete when: " + asset.interaction.successCondition + "." : "",
      asset && asset.interaction && asset.slotId === "apply" && asset.interaction.teachingConnection ? "Teaching connection: " + asset.interaction.teachingConnection + "." : "",
      asset && asset.slotId === "check" && asset.evidence ? "What the class is being asked to show: " + asset.evidence + "." : "",
      "Do not paint arrows, labels, or writing. A later layer adds those.",
      subjectPicture(adventure, asset),
      brief.action ? "What is happening: " + brief.action + "." : "",
      brief.educationalFocus ? "The class must be able to see this idea: " + brief.educationalFocus + "." : "",
      brief.mood ? "Mood: " + brief.mood + "." : "",
      asset && asset.id === "opening" ? "This is the arrival. Show the place widely." : (asset && asset.slotId && STAGE_LINES[asset.slotId] ? "" : "Do not copy the arrival composition."),
      "Leave " + (asset && asset.uiSafeArea || shot.uiSafeArea || "LOWER_LEFT") + " visually quiet for a panel. Keep faces, hands, and the teaching objects out of that area.",
      "Do not write a pupil's name. Do not base a face on a real child."
    ].filter(Boolean).join("\n");
  }

  // ---- Teaching visuals for source-grounded lessons (patch 6) ---------------------------
  // Opt-in planner (production planVisualAssets is unchanged). One teaching picture per
  // gate-ready unit, chosen by a reusable rule from the unit's own source wording:
  //   comparison: the explanation compares (than, compared with, unlike) -> side by side;
  //   cutaway: the feature is inside the body (skull, hole, bone, muscle, joint, ...) -> a
  //            cutaway or skull view where that part is visible;
  //   close-up: otherwise -> a close view of the feature.
  // Each picture shows one animal type (plus the compared animal for a comparison), no people,
  // no text. The hook is an adventure picture framed as fiction; the apply picture shows the
  // new example. Every asset carries a frame label that the player shows on screen.
  var INTERNAL_PART = /\b(skull|skulls|hole|holes|opening|openings|bone|bones|muscle|muscles|joint|joints|jaw|jaws|socket|sockets|brain|heart|lung|lungs|stomach|gizzard|inside|internal|hip|hips|spine|vertebra|vertebrae|ribs?)\b/i;
  var COMPARES = /\b(than|compared (?:with|to)|unlike|whereas|instead of)\b/i;
  var FRAME_LABELS = {
    story: "Story picture: an imagined adventure scene",
    teaching: "Teaching picture: an artist's reconstruction",
    example: "Example picture: an imagined example to think about"
  };

  // Patch 7: a comparison with another part of the same animal ("forelegs longer than its hind
  // legs") is one animal, not two side by side; and every teaching picture shows one whole,
  // identifiable animal (a close-up of a snout or an arm is not identifiable).
  function teachingView(unit) {
    var explanation = [unit && unit.explanationQuote, unit && unit.explanation].join(" ");
    var compared = comparedWith(unit && (unit.explanationQuote || unit.explanation)) || comparedWith(unit && unit.featureQuote);
    if (COMPARES.test(explanation) && compared && !SAME_BODY.test(compared)) return "comparison";
    if (INTERNAL_PART.test(String(unit && unit.feature || ""))) return "cutaway";
    return "whole-animal";
  }
  var SAME_BODY = /^(?:its|their|his|her|the animal's|the dinosaur's|the other)\b/i;

  function comparedWith(text) {
    var m = /\b(?:than|compared (?:with|to)|unlike)\s+([^.;]+)/i.exec(String(text || ""));
    return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 160) : "";
  }

  // ---- Patch 7 image rules (teaching visuals only; reusable, no animal list) ----
  // Geological periods come from the source passages and pack text, never from a list of animals.
  var PERIODS = ["Cambrian", "Ordovician", "Silurian", "Devonian", "Carboniferous", "Permian", "Triassic", "Jurassic", "Cretaceous", "Palaeogene", "Paleogene", "Neogene", "Quaternary", "Pleistocene", "Ice Age"];
  var PERIOD_RE = new RegExp("\\b(" + PERIODS.join("|") + ")\\b", "gi");
  function periodsIn(text) {
    var found = [];
    String(text || "").replace(PERIOD_RE, function (m) {
      var name = m.toLowerCase() === "paleogene" ? "Palaeogene" : PERIODS.filter(function (p) { return p.toLowerCase() === m.toLowerCase(); })[0];
      if (found.indexOf(name) === -1) found.push(name);
      return m;
    });
    return found;
  }
  function sentencesOf(text) { return String(text || "").split(/(?<=[.!?])\s+(?=[A-Z"'(\u201c])/).map(function (s) { return s.trim(); }).filter(Boolean); }
  // The animal a unit is about: a capitalised name its own claims use mid-sentence, else "".
  function unitSubject(unit) {
    var name = "";
    [unit && unit.explanation, unit && unit.feature, unit && unit.featureQuote, unit && unit.explanationQuote].forEach(function (text) {
      if (name) return;
      String(text || "").split(/\s+/).forEach(function (raw, index) {
        var word = raw.replace(/[^A-Za-z'-]/g, "").replace(/'s$/i, "");
        if (!name && index > 0 && /^[A-Z][a-z]{3,}$/.test(word) && PERIODS.indexOf(word) === -1) name = word;
      });
    });
    return name;
  }
  // The period a unit's animal lived in, read from its passage sentences that name it (or from the
  // whole passage when the animal has no name), plus any extra pack text. Unknown when the source
  // gives none or more than one.
  function unitPeriod(unit) {
    var name = unitSubject(unit);
    var text = [unit && unit.passageText, unit && unit.periodText].join(" ");
    var scope = name ? sentencesOf(text).filter(function (s) { return s.indexOf(name) !== -1 || /^(?:It|Its|The animal|This dinosaur)\b/.test(s); }).join(" ") : text;
    var periods = periodsIn(scope);
    if (!periods.length && name) periods = periodsIn(text);
    return { subject: name, period: periods.length === 1 ? periods[0] : "", periods: periods };
  }
  // A story picture may show several animals only when the sources place them all in one
  // period. Otherwise it shows one animal and the limitation is recorded.
  function storyScenePlan(units) {
    var rows = (units || []).map(function (u) { return Object.assign({ unitId: u.unitId }, unitPeriod(u)); });
    var named = rows.filter(function (r) { return r.subject; });
    var periods = [];
    rows.forEach(function (r) { if (r.period && periods.indexOf(r.period) === -1) periods.push(r.period); });
    var allKnown = rows.length && rows.every(function (r) { return r.subject && r.period; });
    if (allKnown && periods.length === 1) {
      return { mode: "group", period: periods[0], animals: rows.map(function (r) { return r.subject; }), rows: rows, limitation: "" };
    }
    var pick = named.filter(function (r) { return r.period; })[0] || named[0] || rows[0] || null;
    var why = periods.length > 1
      ? "the taught animals lived in different periods (" + rows.filter(function (r) { return r.period; }).map(function (r) { return r.subject + ": " + r.period; }).join("; ") + ")"
      : "the sources do not say when every taught animal lived" + (rows.filter(function (r) { return !r.period; }).length ? " (" + rows.filter(function (r) { return !r.period; }).map(function (r) { return r.subject || ("the " + r.unitId + " animal"); }).join(", ") + ")" : "");
    return { mode: "single", animal: pick ? pick.subject : "", period: pick ? pick.period : "", unitId: pick ? pick.unitId : "", rows: rows,
      limitation: "The story picture shows one animal" + (pick && pick.subject ? " (" + pick.subject + ")" : "") + " because " + why + "." };
  }
  function aName(name) { return (/^[AEIOU]/i.test(String(name || "")) ? "an " : "a ") + name; }
  function storySceneLine(scene) {
    if (!scene) return "";
    if (scene.mode === "group") return "Show only these animals, which the sources place in the " + scene.period + " period: " + scene.animals.join(", ") + ". No other animals.";
    return "Show exactly one animal" + (scene.animal ? ": " + aName(scene.animal) + (scene.period ? " (" + scene.period + " period)" : "") : "") + ". No other animals of any kind, not even in the background. This overrides any mention of several animals above.";
  }
  // The player's text panel covers the lower left of the screen (about x 5-56%, y 55-80%).
  var PANEL_RECT = { left: 0, top: 50, right: 58, bottom: 88 };
  var COMPOSITION_LINE = "Composition: a text panel will cover the lower left of the picture (the left 58%, from halfway down to near the bottom). Put the whole animal, its taught feature and every compared body part either in the top half of the picture or in the right 42%; keep the lower-left area plain, empty background.";
  // A feature box (percent of the image) is clear when it does not overlap the panel rectangle.
  function featureBoxClear(box, rect) {
    rect = rect || PANEL_RECT;
    if (!box || typeof box !== "object") return false;
    var l = Number(box.left), t = Number(box.top), w = Number(box.width), h = Number(box.height);
    if (![l, t, w, h].every(function (n) { return isFinite(n); }) || w <= 0 || h <= 0) return false;
    var r = l + w, b = t + h;
    return r <= rect.left || l >= rect.right || b <= rect.top || t >= rect.bottom;
  }
  // Source sentences that help identify the animal (they name it), excluding the taught quotes.
  function identifyingSentences(unit, max) {
    var name = unitSubject(unit);
    if (!name) return [];
    var skip = [unit.featureQuote, unit.explanationQuote].map(function (q) { return String(q || "").slice(0, 40); });
    return sentencesOf(unit.passageText).filter(function (s) {
      return s.indexOf(name) !== -1 && s.length <= 260 && !skip.some(function (q) { return q && s.indexOf(q) !== -1; });
    }).slice(0, max || 2);
  }

  function planTeachingVisuals(adventure, units, options) {
    options = options || {};
    var activities = (adventure && adventure.activities) || [];
    var staged = stagedActivities(activities);
    if (!staged || !(units || []).length) return [];
    var hook = stageAsset("hook", staged.hook, adventure);
    hook.framing = "story";
    hook.frameLabel = FRAME_LABELS.story;
    // Patch 7: the story picture's animals follow the sources' periods (one animal if mixed or unknown).
    if (periodGuard(adventure)) {
      hook.storyScene = storyScenePlan(units);
      if (hook.storyScene.limitation) hook.limitation = hook.storyScene.limitation;
    }
    var list = [hook];
    units.forEach(function (unit) {
      var view = teachingView(unit);
      var who = unitPeriod(unit);
      list.push({
        id: "teach-" + unit.unitId,
        slotId: "teach",
        unitId: unit.unitId,
        type: "teaching_visual",
        view: view,
        framing: "teaching",
        frameLabel: FRAME_LABELS.teaching,
        usedByScenes: [],
        beatIds: (unit.beatIds || []).slice(),
        generationRequired: true,
        brief: {
          setting: "a plain, softly lit background with nothing else in it",
          action: unit.feature,
          educationalFocus: unit.explanation || "",
          mood: "clear and calm",
          importantObjects: [unit.feature]
        },
        feature: unit.feature,
        featureQuote: unit.featureQuote || "",
        explanation: unit.explanation || "",
        explanationQuote: unit.explanationQuote || "",
        compared: view === "comparison" ? (comparedWith(unit.explanationQuote || unit.explanation) || comparedWith(unit.featureQuote)) : "",
        subject: who.subject,
        period: who.period,
        identify: identifyingSentences(unit, 2),
        shot: { shotType: view, cameraDistance: view === "cutaway" ? "close" : "medium", cameraAngle: "side view, the feature fully visible", location: "plain background", uiSafeArea: "LOWER_LEFT" },
        uiSafeArea: "LOWER_LEFT",
        status: "planned"
      });
    });
    var applyStep = staged.apply && staged.apply.scene && staged.apply.scene.interaction;
    if (applyStep && applyStep.type === "choose" && applyStep.newCase && applyStep.newCase.text) {
      var sourced = applyStep.newCase.kind === "sourced";
      list.push({
        id: "apply",
        slotId: "apply",
        unitId: applyStep.unitId || "",
        type: "story_scene",
        view: "example",
        framing: sourced ? "teaching" : "example",
        frameLabel: sourced ? FRAME_LABELS.teaching : FRAME_LABELS.example,
        usedByScenes: [staged.apply.title || "apply"],
        generationRequired: true,
        brief: { setting: "a plain, softly lit background", action: applyStep.newCase.text, educationalFocus: "", mood: "clear and calm", importantObjects: [] },
        newCase: applyStep.newCase.text,
        choices: (applyStep.choices || []).map(function (c) { return c.text; }),
        shot: { shotType: "example", cameraDistance: "medium", cameraAngle: "side view, every option equally visible", location: "plain background", uiSafeArea: "LEFT" },
        uiSafeArea: "LEFT",
        status: "planned"
      });
    }
    return list.slice(0, options.max || 6);
  }

  function deepTimeGroupLine(adventure) {
    if (!periodGuard(adventure)) return "";
    var topic = String((adventure && adventure.topic) || "the lesson's animals").toLowerCase();
    return "Show only " + topic + " as the lesson animal. Do not show flying reptiles (pterosaurs), sea reptiles (plesiosaurs, ichthyosaurs, mosasaurs), mammals, or birds presented as " + topic + ". Every animal shown lived in the same time period; do not mix animals from different periods.";
  }

  function buildTeachingVisualPrompt(adventure, asset) {
    var year = yearOf(adventure);
    if (!asset || asset.framing === "story") {
      return [buildAdventurePrompt(adventure, asset, charactersForAdventure(adventure)), "STORY PICTURE: this is an imagined adventure scene for the story, not a scientific reconstruction. " + deepTimeGroupLine(adventure), storySceneLine(asset && asset.storyScene)].filter(Boolean).join("\n");
    }
    var common = [
      "Clear, accurate natural-history illustration for a " + (year || "primary") + " science lesson. Soft, even light, gentle colours, a plain background. Not a photograph of a real place.",
      NO_TEXT,
      SAFETY,
      "No people, no children, no explorers, no characters, no hands, no human figures.",
      deepTimeGroupLine(adventure),
      "Do not paint arrows, labels, or writing. A later layer adds those."
    ];
    if (asset.slotId === "apply") {
      return common.concat([
        "This picture shows an example for the class to reason about: " + asset.newCase,
        "Show every option in the example equally clearly, side by side, at the same size and in the same pose, so the picture does not give away which option is the answer.",
        "Leave " + (asset.uiSafeArea || "LEFT") + " visually quiet for a panel."
      ]).filter(Boolean).join("\n");
    }
    var view = asset.view;
    var who = asset.subject ? "one " + asset.subject : "one animal of a single type";
    var line = view === "comparison"
      ? "Side-by-side comparison on one plain background. Left: " + who + " that has this feature: " + asset.feature + ". Right: " + (asset.compared || "the animal the source compares it with") + ". Same scale, same side-on pose, whole bodies visible and small enough to fit the composition below, so the difference in the feature is obvious."
      : view === "cutaway"
        ? "Cutaway or skull view of " + who + " so this internal feature is clearly visible: " + asset.feature + ". Show the part in its real position and proportion, with the surrounding body faded or cut away."
        : "The whole of " + who + ", side-on, with this feature clearly visible: " + asset.feature + ". Only this one animal is in the picture.";
    return common.concat([
      "Teaching picture (artist's reconstruction). " + line,
      asset.subject ? "The animal must be recognisable as " + aName(asset.subject) + (asset.period ? " (" + asset.period + " period)" : "") + "." : "",
      (asset.identify || []).length ? "The source describes it: \"" + asset.identify.join(" ") + "\" Use only what these sentences say to make it recognisable." : "",
      "The source says: \"" + (asset.featureQuote || asset.feature) + "\" and \"" + (asset.explanationQuote || asset.explanation) + "\". Draw only what these sentences say about the feature; do not add features the source does not describe.",
      COMPOSITION_LINE
    ]).filter(Boolean).join("\n");
  }

  function stampActivities(activities, assets) {
    if (stagedActivities(activities)) {
      (activities || []).forEach(function (activity) {
        var id = String(activity && activity.slotId || "").toLowerCase();
        activity.scene = activity.scene || {};
        if (STAGE_SHOTS[id]) activity.scene.visualAssetId = id;
      });
      return activities;
    }
    var planned = planVisualAssets({ activities: activities || [] });
    var byTitle = {};
    planned.forEach(function (asset) {
      (asset.usedByScenes || []).forEach(function (title) { byTitle[title] = asset.id; });
    });
    (assets || []).forEach(function (asset) {
      (asset.usedByScenes || []).forEach(function (title) { byTitle[title] = asset.id; });
    });
    (activities || []).forEach(function (activity) {
      var title = activity.title || "";
      activity.scene = activity.scene || {};
      if (byTitle[title]) activity.scene.visualAssetId = byTitle[title];
    });
    return activities;
  }

  function scheduleVisualAssets(queue, request, done, limit) {
    var cap = Math.max(1, Math.min(3, Number(limit) || 3));
    var list = (queue || []).slice();
    var character = list[0] === "characters";
    var scenes = list.filter(function (id) { return id !== "characters"; });
    var active = 0;
    var peak = 0;
    function run(ids, next) {
      if (!ids.length) { next(); return; }
      var index = 0;
      var remaining = ids.length;
      function launch() {
        while (active < cap && index < ids.length) {
          var id = ids[index];
          index += 1;
          active += 1;
          if (active > peak) peak = active;
          request(id, function () {
            active -= 1;
            remaining -= 1;
            if (!remaining) next();
            else launch();
          });
        }
      }
      launch();
    }
    function finish() { if (done) done({ peak: peak }); }
    if (character) run(["characters"], function () { run(scenes, finish); });
    else run(scenes, finish);
  }

  function attachResult(adventure, asset, result) {
    var copy = JSON.parse(JSON.stringify(adventure || {}));
    var assets = copy.visualAssets || planVisualAssets(copy);
    copy.visualAssets = assets.map(function (item) {
      if (item.id !== asset.id) return item;
      var next = JSON.parse(JSON.stringify(item));
      next.status = result && result.status ? result.status : "failed";
      next.fallback = !(result && result.status === "ready" && result.storagePath);
      if (result) {
        next.storagePath = result.storagePath || "";
        next.publicUrl = result.publicUrl || "";
        next.provider = result.provider || "";
        next.model = result.model || "";
        next.dimensions = result.dimensions || "";
        next.visualBriefHash = result.visualBriefHash || "";
        next.createdAt = result.createdAt || "";
        next.failure = result.failure || "";
      }
      return next;
    });
    return copy;
  }

  function volcanoPrototype() {
    return {
      year: 5,
      topic: "Volcanoes Erupt",
      goals: ["Students will understand the basic reasons why volcanoes erupt."],
      lessonPlan: {
        learningObjective: "Students will understand the basic reasons why volcanoes erupt.",
        keyKnowledge: [
          "Magma is molten rock beneath the Earth's surface.",
          "Pressure can build beneath a volcano.",
          "Magma can move towards the surface."
        ]
      },
      storyPlan: {
        enabled: true,
        title: "Volcanoes Erupt Adventure",
        premise: "Young scientists investigate after a rumble shakes their coastal town.",
        mission: "Investigate why the volcano is stirring and present the findings to the town council.",
        setting: "A small coastal town beneath a large volcano, with a science field station above the harbour.",
        ending: "The explorers present their findings and the town knows what the trembling means.",
        continuity: {
          setting: "coastal town, large distinctive volcano, science field station, yellow research vehicle",
          objects: ["large volcano", "coastal town", "science field station", "yellow research vehicle", "monitoring equipment"],
          discovered: ["magma", "pressure", "movement towards the surface"]
        },
        characters: [
          { id: "scientist", label: "Lead Scientist" },
          { id: "geologist", label: "Geologist" },
          { id: "navigator", label: "Navigator" }
        ]
      },
      activities: [
        {
          title: "The Mystery of the Trembling Ground",
          mechanic: "story",
          scene: {
            beat: "beginning",
            visualBrief: {
              sceneType: "story",
              setting: "A coastal town beneath a large volcano, seen from a hillside science field station.",
              subjects: ["three fictional young science explorers", "the volcano", "the town"],
              action: "The explorers investigate subtle signs that the ground has begun to tremble, beside scientific field equipment.",
              importantObjects: ["volcano", "cracked ground", "monitoring equipment", "yellow research vehicle", "field station"],
              educationalFocus: "A volcano above a coastal town, with the first signs of movement in the ground.",
              mood: "mystery and adventure, exciting rather than frightening"
            }
          }
        },
        {
          title: "The Pressure Builds",
          mechanic: "story",
          scene: {
            beat: "development",
            visualBrief: {
              sceneType: "teaching",
              setting: "Inside and beneath the same volcano, above the same coastal town.",
              subjects: ["magma", "the volcano conduit", "the same three explorers at the field station"],
              action: "Magma is under pressure and moving upwards towards the surface.",
              importantObjects: ["magma", "pressure in the conduit", "path towards the surface", "the same volcano"],
              educationalFocus: "Magma, pressure, and movement towards the surface.",
              mood: "clear, serious, and wondrous"
            }
          }
        },
        { title: "Understanding Eruptions", mechanic: "quiz", scene: { beat: "application" } },
        {
          title: "The Final Presentation",
          mechanic: "story",
          scene: {
            beat: "resolution",
            visualBrief: {
              sceneType: "resolution",
              setting: "The town hall opening towards the same volcano and field station.",
              subjects: ["the same three fictional explorers", "townspeople", "the volcano"],
              action: "The explorers finish the mission by sharing what they discovered. The investigation is complete.",
              importantObjects: ["notebook", "monitoring equipment", "the volcano", "the town"],
              educationalFocus: "The mission reaches its conclusion.",
              mood: "earned, calm, and hopeful"
            }
          }
        },
        { title: "What Did We Learn?", mechanic: "mystery", scene: { beat: "debrief" } }
      ]
    };
  }

  return {
    PROTOTYPE: PROTOTYPE,
    PROTOTYPE_98A: PROTOTYPE_98A,
    PROTOTYPE_98B: PROTOTYPE_98B,
    ART_DIRECTION: ART_DIRECTION,
    WONDII_STYLE: WONDII_STYLE,
    WORLD_ANCHOR: WORLD_ANCHOR,
    SHOTS: SHOTS,
    SIZE: "2560x1440",
    MODEL: "gpt-image-2.5-sunburst",
    yearOf: yearOf,
    ageBand: ageBand,
    defineCharacters: defineCharacters,
    defineExperienceCharacters: defineExperienceCharacters,
    planVisualAssets: planVisualAssets,
    buildVisualPrompt: buildVisualPrompt,
    buildExperiencePrompt: buildExperiencePrompt,
    journeyGuidance: journeyGuidance,
    diversityIssues: diversityIssues,
    volcanoExperience: volcanoExperience,
    dummyClass: dummyClass,
    rolePlaceholders: rolePlaceholders,
    featuredCast: featuredCast,
    avatarKey: avatarKey,
    avatarUrl: avatarUrl,
    bindFeatured: bindFeatured,
    avatarRefs: avatarRefs,
    sessionCast: sessionCast,
    characterForRole: characterForRole,
    reliableRegions: reliableRegions,
    assignRoles: assignRoles,
    speakRoles: speakRoles,
    participantsFromRoom: participantsFromRoom,
    sessionRoleAssignments: sessionRoleAssignments,
    reassignAbsent: reassignAbsent,
    participationState: participationState,
    nextDynamicPupil: nextDynamicPupil,
    buildCharacterSheetPrompt: buildCharacterSheetPrompt,
    pressureInteraction: pressureInteraction,
    routeChoice: routeChoice,
    hashBrief: hashBrief,
    visualsEnabled: visualsEnabled,
    visualsAllowed: visualsAllowed,
    charactersForAdventure: charactersForAdventure,
    buildAdventurePrompt: buildAdventurePrompt,
    periodGuard: periodGuard,
    livingPastScene: livingPastScene,
    planTeachingVisuals: planTeachingVisuals,
    buildTeachingVisualPrompt: buildTeachingVisualPrompt,
    teachingView: teachingView,
    periodsIn: periodsIn,
    unitSubject: unitSubject,
    unitPeriod: unitPeriod,
    storyScenePlan: storyScenePlan,
    storySceneLine: storySceneLine,
    featureBoxClear: featureBoxClear,
    identifyingSentences: identifyingSentences,
    PANEL_RECT: PANEL_RECT,
    COMPOSITION_LINE: COMPOSITION_LINE,
    FRAME_LABELS: FRAME_LABELS,
    stampActivities: stampActivities,
    scheduleVisualAssets: scheduleVisualAssets,
    attachResult: attachResult,
    volcanoPrototype: volcanoPrototype,
    assetType: assetType
  };
});
